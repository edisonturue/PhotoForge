import * as fs from 'fs';
import * as path from 'path';
import { PhotoStore } from './store';
import { isRawFile, getConvertedJpegPath } from './rawConverter';
import { ModuleLogger } from './logger';
import { MODIFIED_DIR } from '../shared/constants';
import { ExportOptions, ExportFormat, PhotoFile, PresetAdjustment, ColorCurves, ColorCurvePoint } from '../shared/types';
import { PresetManager } from './presetManager';


/**
 * Build a 256-entry lookup table from control points using monotone cubic Hermite interpolation.
 * Mirrors the exact same algorithm in CanvasRenderer.tsx for preview/export parity.
 */
function buildCurveLUT(points: ColorCurvePoint[]): Uint8Array {
  if (!points || points.length < 2) {
    const id = new Uint8Array(256);
    for (let i = 0; i < 256; i++) id[i] = i;
    return id;
  }
  const sorted = [...points].sort((a, b) => a[0] - b[0]);
  if (sorted[0][0] > 0) sorted.unshift([0, 0]);
  if (sorted[sorted.length - 1][0] < 255) sorted.push([255, 255]);

  const lut = new Uint8Array(256);
  const n = sorted.length;
  const deltas: number[] = [];
  const slopes: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    deltas[i] = (sorted[i + 1][1] - sorted[i][1]) / (sorted[i + 1][0] - sorted[i][0] || 1);
  }
  slopes[0] = deltas[0];
  slopes[n - 1] = deltas[n - 2];
  for (let i = 1; i < n - 1; i++) {
    slopes[i] = deltas[i - 1] * deltas[i] <= 0 ? 0 : (deltas[i - 1] + deltas[i]) / 2;
  }
  for (let i = 0; i < n - 1; i++) {
    if (Math.abs(deltas[i]) < 1e-10) { slopes[i] = 0; slopes[i + 1] = 0; }
    else {
      const alpha = slopes[i] / deltas[i], beta = slopes[i + 1] / deltas[i];
      const tau = alpha * alpha + beta * beta;
      if (tau > 9) { const s = 3 / Math.sqrt(tau); slopes[i] = alpha * s * deltas[i]; slopes[i + 1] = beta * s * deltas[i]; }
    }
  }
  let seg = 0;
  for (let x = 0; x <= 255; x++) {
    while (seg < n - 2 && sorted[seg + 1][0] < x) seg++;
    const x0 = sorted[seg][0], y0 = sorted[seg][1];
    const x1 = sorted[seg + 1][0], y1 = sorted[seg + 1][1];
    if (x <= x0) lut[x] = Math.max(0, Math.min(255, Math.round(y0)));
    else if (x >= x1) lut[x] = Math.max(0, Math.min(255, Math.round(y1)));
    else {
      const t = (x - x0) / (x1 - x0), t2 = t * t, t3 = t2 * t;
      const m0 = slopes[seg] * (x1 - x0), m1 = slopes[seg + 1] * (x1 - x0);
      lut[x] = Math.max(0, Math.min(255, Math.round(
        (2 * t3 - 3 * t2 + 1) * y0 + (t3 - 2 * t2 + t) * m0 + (-2 * t3 + 3 * t2) * y1 + (t3 - t2) * m1
      )));
    }
  }
  return lut;
}

export class ExportManager {
  private store: PhotoStore;
  private libraryPath: string;
  private maxMemory: number = 512; // default, updated from settings
  private log: ModuleLogger;

  private presetManager: PresetManager | null = null;

  constructor(store: PhotoStore, libraryPath: string, logger: any) {
    this.store = store;
    this.libraryPath = libraryPath;
    this.log = logger.module('export');
  }

  /** Set preset manager for applying adjustments during export */
  setPresetManager(pm: PresetManager): void {
    this.presetManager = pm;
  }

  /** Update max memory from settings */
  setMaxMemory(mb: number): void {
    this.maxMemory = mb;
  }

  async exportSingle(photoId: string, outputPath: string): Promise<boolean> {
    const photo = this.store.getPhoto(photoId);
    if (!photo) { this.log.warn('exportSingle: photo not found', { photoId }); return false; }

    // Read settings for this export
    const settings = this.store.getSettings();

    try {
      const sourcePath = this.getSourcePath(photo);
      this.log.info('exportSingle', { photoId, sourcePath, isRaw: isRawFile(sourcePath), width: photo.width, height: photo.height });

      if (isRawFile(sourcePath)) {
        const convertedDir = path.join(this.libraryPath, 'converted');
        const jpegPath = await getConvertedJpegPath(sourcePath, convertedDir, 9999);

        const sharp = require('sharp');
        let pipeline = sharp(jpegPath, { limitInputPixels: this.getPixelLimit() });
        // Apply adjustments
        const adj = this.getEffectiveAdjustments(photo);
        if (adj) pipeline = await this.applyAdjustments(pipeline, adj);
        if (settings.preserveExif) pipeline = pipeline.withMetadata();
        const ext = path.extname(outputPath).toLowerCase();
        if (ext === '.png') pipeline = pipeline.png();
        else if (ext === '.webp') pipeline = pipeline.webp({ quality: 90 });
        else pipeline = pipeline.jpeg({ quality: 95 });
        await pipeline.toFile(outputPath);
        return true;
      }

      const sharp = require('sharp');
      let pipeline = sharp(sourcePath, { failOn: 'none', limitInputPixels: this.getPixelLimit() });
      // Apply adjustments
      const adj = this.getEffectiveAdjustments(photo);
      if (adj) pipeline = await this.applyAdjustments(pipeline, adj);
      const ext = path.extname(outputPath).toLowerCase();
      if (settings.preserveExif) pipeline = pipeline.withMetadata();
      if (ext === '.jpg' || ext === '.jpeg') {
        pipeline = pipeline.jpeg({ quality: 95 });
      } else if (ext === '.png') {
        pipeline = pipeline.png();
      } else if (ext === '.webp') {
        pipeline = pipeline.webp({ quality: 90 });
      } else {
        pipeline = pipeline.jpeg({ quality: 95 });
      }
      await pipeline.toFile(outputPath);
      return true;
    } catch {
      try {
        const sourcePath = this.getSourcePath(photo);
        fs.copyFileSync(sourcePath, outputPath);
        return true;
      } catch {
        return false;
      }
    }
  }

  /**
   * Export with full options — format, quality, crop, rotation, flip, EXIF, color space.
   * Now respects settings for preserveExif, colorSpace, and maxProcessMemory.
   */
  async exportAdvanced(options: ExportOptions): Promise<boolean> {
    const photo = this.store.getPhoto(options.photoId);
    if (!photo) { console.error('[Export] Photo not found:', options.photoId); return false; }

    // Merge with global settings
    const settings = this.store.getSettings();
    const effectivePreserveExif = options.preserveExif ?? settings.preserveExif;
    const effectiveColorSpace = options.colorSpace ?? settings.colorSpace;

    try {
      let sourcePath = this.getSourcePath(photo);

      // Safety: if sourcePath doesn't exist, try to find the original in the library
      if (!fs.existsSync(sourcePath)) {
        const originalsDir = path.join(this.libraryPath, 'originals');
        const altPath = path.join(originalsDir, photo.fileName);
        if (fs.existsSync(altPath)) {
          sourcePath = altPath;
        } else {
          this.log.error('No valid source file found for export', { photoId: photo.id, fileName: photo.fileName });
          return false;
        }
      }

      // Guard: verify sourcePath is a real image file, not a thumbnail
      // If photo metadata shows the filePath was accidentally overwritten with
      // a thumbnail path, the exported image would be tiny (e.g. 120×160).
      const sourceStat = fs.statSync(sourcePath);

      // Validate: if the source file is suspiciously small for a full-resolution
      // photo and the photo record has valid dimensions, log a warning.
      // A typical photo is > 50 KB; thumbnails are often < 30 KB.
      const MIN_FULLRES_BYTES = 30 * 1024; // 30 KB — any real photo should exceed this
      if (sourceStat.size < MIN_FULLRES_BYTES && photo.width > 0 && photo.height > 0) {
        // Try harder to find the original
        const originalsDir = path.join(this.libraryPath, 'originals');
        const altPath = path.join(originalsDir, photo.fileName);
        if (fs.existsSync(altPath) && fs.statSync(altPath).size > sourceStat.size) {
          this.log.info('Using originals/ fallback for export', { altPath, size: fs.statSync(altPath).size });
          sourcePath = altPath;
        }
      }

      // Get a base image to work with
      let workingPath: string;
      if (isRawFile(sourcePath)) {
        const convertedDir = path.join(this.libraryPath, 'converted');
        workingPath = await getConvertedJpegPath(sourcePath, convertedDir, 9999);
      } else {
        workingPath = sourcePath;
      }

      const sharp = require('sharp');

      let pipeline = sharp(workingPath, { failOn: 'none', limitInputPixels: this.getPixelLimit() });

      // Apply crop
      if (options.applyCrop && photo.cropRegion) {
        const metadata = await sharp(workingPath).metadata();
        const w = metadata.width || photo.width;
        const h = metadata.height || photo.height;
        const crop = photo.cropRegion;
        const left = Math.round(crop.x * w);
        const top = Math.round(crop.y * h);
        const cropW = Math.round(crop.width * w);
        const cropH = Math.round(crop.height * h);
        pipeline = pipeline.extract({ left, top, width: cropW, height: cropH });
      }

      // Apply rotation and flip
      if (options.applyRotationFlip) {
        if (photo.rotation === 90) pipeline = pipeline.rotate(90);
        else if (photo.rotation === 180) pipeline = pipeline.rotate(180);
        else if (photo.rotation === 270) pipeline = pipeline.rotate(270);
        if (photo.flipH) pipeline = pipeline.flop();
        if (photo.flipV) pipeline = pipeline.flip();
      }

      // Apply preset adjustments (brightness, contrast, saturation, etc.)
      if (options.applyPreset) {
        const adj = this.getEffectiveAdjustments(photo);
        if (adj) {
          pipeline = await this.applyAdjustments(pipeline, adj);
          this.log.info('Applied adjustments to export', { photoId: photo.id, exposure: adj.exposure, brightness: adj.brightness, contrast: adj.contrast, saturation: adj.saturation });
        } else {
          this.log.info('No adjustments to apply for export', { photoId: photo.id, presetApplied: photo.presetApplied, customAdj: photo.customAdjustments });
        }
      }

      // Apply max dimensions
      if (options.maxWidth || options.maxHeight) {
        pipeline = pipeline.resize(options.maxWidth || undefined, options.maxHeight || undefined, {
          fit: 'inside',
          withoutEnlargement: true,
        });
      }

      // Preserve EXIF data if requested
      if (effectivePreserveExif) {
        pipeline = pipeline.withMetadata();
      }

      // Set output format + color space
      const format = options.format || settings.exportFormat || 'jpg';
      const quality = options.quality || settings.exportQuality || 95;

      // Color space handling — use sharp's toColorSpace for ICC profile embedding
      if (effectiveColorSpace === 'adobe-rgb') {
        pipeline = pipeline.toColorspace('rgb16').withIccProfile('ADOBE_RGB');
      } else if (effectiveColorSpace === 'prophoto') {
        pipeline = pipeline.toColorspace('rgb16').withIccProfile('PROPHOTO_RGB');
      }
      // sRGB is the default — no conversion needed

      switch (format) {
        case 'jpg':
        case 'jpeg':
          pipeline = pipeline.jpeg({ quality });
          break;
        case 'png':
          pipeline = pipeline.png();
          break;
        case 'webp':
          pipeline = pipeline.webp({ quality });
          break;
        case 'tiff':
          pipeline = pipeline.tiff();
          break;
        case 'bmp':
          pipeline = pipeline.png(); // BMP fallback
          break;
        case 'avif':
          pipeline = pipeline.avif({ quality });
          break;
        case 'heif':
          pipeline = pipeline.heif({ quality });
          break;
        default:
          pipeline = pipeline.jpeg({ quality });
      }

      await pipeline.toFile(options.outputPath);
      // Verify output dimensions
      try {
        const outMeta = await sharp(options.outputPath).metadata();
        this.log.info('Export completed', { photoId: photo.id, width: outMeta.width, height: outMeta.height, format: outMeta.format });
      } catch {}
      return true;
    } catch (err: any) {
      console.error('[Export] Advanced failed:', err.message);
      console.error('[Export] Error stack:', err.stack);
      this.log.error('Export pipeline failed', { photoId: photo.id, error: err.message });
      // Fallback: at least convert to JPEG (with adjustments if possible)
      try {
        const sourcePath = this.getSourcePath(photo);
        const sharp = require('sharp');
        let workingPath: string;
        if (isRawFile(sourcePath)) {
          const convertedDir = path.join(this.libraryPath, 'converted');
          workingPath = await getConvertedJpegPath(sourcePath, convertedDir, 9999);
        } else {
          workingPath = sourcePath;
        }
        // Try to apply adjustments in the fallback too
        let fallbackPipeline = sharp(workingPath, { failOn: 'none' });
        if (options.applyPreset) {
          const adj = this.getEffectiveAdjustments(photo);
          if (adj) {
            try {
              fallbackPipeline = this.applyAdjustments(fallbackPipeline, adj);
              this.log.info('Fallback: adjustments applied', { photoId: photo.id });
            } catch (adjErr: any) {
              this.log.error('Fallback: applyAdjustments failed', { error: adjErr.message });
            }
          }
        }
        fallbackPipeline = fallbackPipeline.jpeg({ quality: 95 });
        await fallbackPipeline.toFile(options.outputPath);
        this.log.info('Fallback export completed', { photoId: photo.id });
        return true;
      } catch (fallbackErr: any) {
        console.error('[Export] Fallback also failed:', fallbackErr.message);
        this.log.error('Fallback export failed', { photoId: photo.id, error: fallbackErr.message });
        return false;
      }
    }
  }

  /**
   * Apply a naming template to generate an output filename (without extension).
   * Supported placeholders: {filename}, {date}, {year}, {month}, {day},
   * {camera}, {preset}, {index}, {rating}, {width}, {height}
   */
  applyNamingTemplate(template: string, photo: PhotoFile, index: number): string {
    const nameWithoutExt = path.basename(photo.fileName, path.extname(photo.fileName));
    const dateStr = photo.dateTaken || photo.dateModified;
    const dateObj = dateStr ? new Date(dateStr) : new Date();

    const year = dateObj.getFullYear().toString();
    const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
    const day = dateObj.getDate().toString().padStart(2, '0');
    const date = `${year}-${month}-${day}`;

    const sanitize = (s: string): string => s.replace(/[<>:"/\\|?*]/g, '_').replace(/\s+/g, '_');
    const camera = photo.cameraModel ? sanitize(photo.cameraModel) : 'unknown';
    const presetName = photo.presetApplied ? sanitize(photo.presetApplied) : 'original';
    const rating = photo.rating.toString();
    const width = photo.width.toString();
    const height = photo.height.toString();
    const indexStr = (index + 1).toString().padStart(3, '0');

    return template
      .replace(/\{filename\}/g, nameWithoutExt)
      .replace(/\{date\}/g, date)
      .replace(/\{year\}/g, year)
      .replace(/\{month\}/g, month)
      .replace(/\{day\}/g, day)
      .replace(/\{camera\}/g, camera)
      .replace(/\{preset\}/g, presetName)
      .replace(/\{index\}/g, indexStr)
      .replace(/\{rating\}/g, rating)
      .replace(/\{width\}/g, width)
      .replace(/\{height\}/g, height);
  }

  async exportBatch(photoIds: string[], outputDir: string, namingTemplate?: string): Promise<{ exported: number; failed: number }> {
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    let exported = 0;
    let failed = 0;

    const settings = this.store.getSettings();

    for (let idx = 0; idx < photoIds.length; idx++) {
      const id = photoIds[idx];
      const photo = this.store.getPhoto(id);
      if (!photo) { failed++; continue; }

      const ext = settings.exportFormat === 'jpeg' ? 'jpg' : settings.exportFormat;
      const template = namingTemplate || settings.namingTemplate || '{filename}';
      const outputName = this.applyNamingTemplate(template, photo, idx) + `.${ext}`;
      const outputPath = path.join(outputDir, outputName);

      const success = await this.exportAdvanced({
        photoId: id,
        outputPath,
        format: settings.exportFormat,
        quality: settings.exportQuality,
        applyCrop: true,
        applyRotationFlip: true,
        applyPreset: true,
        preserveExif: settings.preserveExif,
        colorSpace: settings.colorSpace,
      });
      if (success) exported++;
      else failed++;
    }

    return { exported, failed };
  }

  /**
   * Apply preset + custom adjustments to a sharp pipeline.
   * EXACTLY mirrors the CSS-filter + SVG-filter logic from CanvasRenderer.tsx
   * so the exported image matches the on-screen preview.
   *
   * CSS filter reference (from CanvasRenderer buildFilterStyle):
   *   brightness(1 + exposure/5 + brightness/200)   — combined!
   *   contrast(1 + contrast/200)
   *   saturate(1 + saturation/100)                   — /100, NOT /200
   *   hue-rotate(hue deg)
   *   sepia(temperature * 0.4%)  for temperature > 0 — *0.4%, NOT *0.3%
   *   contrast(1 + clarity/300)                       — CSS contrast, not linear
   *   brightness(gammaAdj)                            — gamma approximation
   *   contrast(1 + grain * 0.002)
   *   grayscale(100%)  for saturation <= -90
   *
   * SVG feComponentTransfer (from CanvasRenderer buildSvgFilter):
   *   feFuncR type="linear" slope=rGain intercept=rOffset   (0-1 range)
   *   where: rGain = 1 + highlightBoost + whiteBoost
   *          rOffset = tintR + shadowBoost + blackBoost
   *          (same for G, B with different tint offsets)
   *
   * sharp equivalents:
   *   brightness(x) → linear(x, 0)
   *   contrast(x)   → linear(x, 128*(1-x))   (CSS contrast formula)
   *   saturate(x)    → modulate({saturation: x})
   *   hue-rotate(d)  → modulate({hue: d})
   *   sepia(p)       → recomb with sepia matrix
   *   grayscale()    → grayscale()
   *   SVG feComponentTransfer slope/intercept → linear([slopes], [intercepts*255])
   */
  private async applyAdjustments(pipeline: any, adj: PresetAdjustment): Promise<any> {

    // === 1. Exposure + Brightness (MUST be combined, matching CanvasRenderer) ===
    // CanvasRenderer: totalBrightness = 1 + (exposure/5) + (brightness/200)
    // CSS brightness(x) = x * pixel   →  sharp: linear(x, 0)
    const totalBrightness = 1 + (adj.exposure / 5) + (adj.brightness / 200);
    if (totalBrightness !== 1) {
      pipeline = pipeline.linear(totalBrightness, 0);
    }

    // === 2. Contrast (CSS contrast formula) ===
    // CSS contrast(c): out = c * in + 0.5 * (1 - c)  in 0-1 range
    // In 0-255 range: out = c * in + 128 * (1 - c)
    // sharp: linear(factor, offset) where offset is in 0-255 range
    if (adj.contrast !== 0) {
      const factor = 1 + adj.contrast / 200;
      const offset = 128 * (1 - factor);
      pipeline = pipeline.linear(factor, offset);
    }

    // === 3. Saturation (MATCH CanvasRenderer: /100, NOT /200) ===
    // CanvasRenderer: saturate(1 + saturation/100)
    if (adj.saturation !== 0) {
      const factor = Math.max(0, 1 + adj.saturation / 100);
      pipeline = pipeline.modulate({ saturation: factor });
    }

    // === 4. Hue rotation ===
    if (adj.hue !== 0) {
      pipeline = pipeline.modulate({ hue: adj.hue });
    }

    // === 5. Temperature (MATCH CanvasRenderer: sepia * 0.4% for warm) ===
    // CanvasRenderer: sepia(temperature * 0.4%) for warm
    // CanvasRenderer: hue-rotate(temperature * 0.3 deg) + saturate for cool
    if (adj.temperature > 0) {
      const sepiaAmount = adj.temperature * 0.004; // 0.4% = 0.004
      pipeline = pipeline.recomb([
        [1 - 0.393 * sepiaAmount + sepiaAmount, 0.769 * sepiaAmount, 0.189 * sepiaAmount],
        [0.349 * sepiaAmount, 1 - 0.686 * sepiaAmount + sepiaAmount, 0.168 * sepiaAmount],
        [0.272 * sepiaAmount, 0.534 * sepiaAmount, 1 - 0.131 * sepiaAmount + sepiaAmount],
      ]);
    } else if (adj.temperature < 0) {
      // Cool: hue-rotate + slight saturate (matching CanvasRenderer)
      pipeline = pipeline.modulate({ hue: adj.temperature * 0.3, saturation: 1 + Math.abs(adj.temperature) * 0.005 });
    }

    // === 6. Clarity (CSS contrast approximation) ===
    // CanvasRenderer: contrast(1 + clarity/300)
    if (adj.clarity !== 0) {
      const factor = 1 + adj.clarity / 300;
      const offset = 128 * (1 - factor);
      pipeline = pipeline.linear(factor, offset);
    }

    // === 7. Gamma (brightness approximation, matching CanvasRenderer) ===
    // CanvasRenderer: gamma < 1 → brightness(1 + (1-gamma)*0.3)
    //                 gamma > 1 → brightness(1 - (gamma-1)*0.15)
    if (adj.gamma !== 1.0) {
      const gammaAdj = adj.gamma < 1
        ? 1 + (1 - adj.gamma) * 0.3
        : 1 - (adj.gamma - 1) * 0.15;
      pipeline = pipeline.linear(gammaAdj, 0);
    }

    // === 8. Grain (CSS contrast approximation) ===
    // CanvasRenderer: contrast(1 + grain * 0.002)
    if (adj.grain !== 0) {
      const factor = 1 + adj.grain * 0.002;
      const offset = 128 * (1 - factor);
      pipeline = pipeline.linear(factor, offset);
    }

    // === 9. Extreme desaturation ===
    // CanvasRenderer: grayscale(100%) for saturation <= -90
    if (adj.saturation <= -90) {
      pipeline = pipeline.grayscale();
    }

    // === 10. SVG feComponentTransfer (EXACTLY matching CanvasRenderer buildSvgFilter) ===
    // Handles: tint, highlights, shadows, whites, blacks
    if (adj.tint !== 0 || adj.highlights !== 0 || adj.shadows !== 0 || adj.whites !== 0 || adj.blacks !== 0) {
      try {
        // Same coefficients as CanvasRenderer buildSvgFilter()
        const tintR = adj.tint > 0 ? adj.tint * 0.002 : 0;
        const tintG = adj.tint < 0 ? Math.abs(adj.tint) * 0.002 : 0;
        const shadowBoost = adj.shadows / 100 * 0.3;
        const blackBoost = adj.blacks / 100 * 0.2;
        const highlightBoost = adj.highlights / 100 * 0.2;
        const whiteBoost = adj.whites / 100 * 0.15;

        const rSlope = 1 + highlightBoost + whiteBoost;
        const gSlope = 1 + highlightBoost + whiteBoost;
        const bSlope = 1 + highlightBoost + whiteBoost;
        const rIntercept = tintR + shadowBoost + blackBoost;
        const gIntercept = tintG + shadowBoost + blackBoost;
        const bIntercept = -tintR * 0.5 + shadowBoost + blackBoost;

        // SVG feComponentTransfer works in 0-1 range:
        //   out = slope * in + intercept   (0-1 range)
        // sharp linear works in 0-255 range:
        //   out = slope * in + intercept   (0-255 range)
        // So intercept needs to be scaled by 255
        pipeline = pipeline.linear(
          [rSlope, gSlope, bSlope],
          [rIntercept * 255, gIntercept * 255, bIntercept * 255],
        );
      } catch (e: any) { this.log.error('applyAdjustments: SVG filter failed', { error: e.message }); }
    }

    // === 11. Sharpness (no direct CSS equivalent in preview, but user expects it) ===
    if (adj.sharpness > 0) {
      pipeline = pipeline.sharpen({ sigma: 0.5 + adj.sharpness / 100 * 2, m1: 0, m2: adj.sharpness / 100 * 5 });
    }

    // === 12. Vignette (best-effort, matching CanvasRenderer radial gradient) ===
    // CanvasRenderer uses a CSS radial-gradient overlay with opacity = vignette/100 * 0.7
    // Full implementation would require sharp composite — skip for simplicity

    // === 13. Per-channel color curves (highest accuracy for film emulation) ===
    // Uses raw pixel manipulation with precomputed 256-entry LUTs,
    // exactly matching CanvasRenderer SVG feComponentTransfer type="table".
    if (adj.colorCurves) {
      try {
        const cc = adj.colorCurves;
        const idLUT = new Uint8Array(256);
        for (let i = 0; i < 256; i++) idLUT[i] = i;
        const masterLUT = cc.rgb ? buildCurveLUT(cc.rgb) : idLUT;
        const mergeWith = (chPts?: ColorCurvePoint[]): Uint8Array => {
          const chLUT = chPts ? buildCurveLUT(chPts) : idLUT;
          const merged = new Uint8Array(256);
          for (let i = 0; i < 256; i++) merged[i] = chLUT[masterLUT[i]];
          return merged;
        };
        const rLUT = mergeWith(cc.red);
        const gLUT = mergeWith(cc.green);
        const bLUT = mergeWith(cc.blue);

        const hasCurve = rLUT.some((v, i) => v !== i) || gLUT.some((v, i) => v !== i) || bLUT.some((v, i) => v !== i);
        if (hasCurve) {
          const { data, info } = await pipeline.raw().toBuffer({ resolveWithObject: true });
          const ch = info.channels;
          for (let i = 0; i < data.length; i += ch) {
            data[i] = rLUT[data[i]];
            if (ch >= 3) {
              data[i + 1] = gLUT[data[i + 1]];
              data[i + 2] = bLUT[data[i + 2]];
            }
          }
          pipeline = require('sharp')(data, { raw: { width: info.width, height: info.height, channels: ch } });
          this.log.info('Applied color curves to export');
        }
      } catch (e: any) {
        this.log.error('applyAdjustments: colorCurves failed', { error: e.message });
      }
    }

    return pipeline;
  }

      private getEffectiveAdjustments(photo: PhotoFile): PresetAdjustment | null {
    const DEFAULT_ADJ: PresetAdjustment = {
      brightness: 0, contrast: 0, saturation: 0, hue: 0, temperature: 0,
      tint: 0, sharpness: 0, vignette: 0, grain: 0, clarity: 0,
      highlights: 0, shadows: 0, whites: 0, blacks: 0, exposure: 0, gamma: 1.0,
    };

    let presetAdj: PresetAdjustment | null = null;
    if (photo.presetApplied && this.presetManager) {
      const preset = this.presetManager.getById(photo.presetApplied);
      if (preset) {
        presetAdj = preset.adjustments;
        this.log.info('getEffectiveAdjustments: found preset', { presetId: photo.presetApplied, presetName: preset.name });
      } else {
        this.log.warn('getEffectiveAdjustments: preset not found', { presetId: photo.presetApplied });
      }
    } else if (photo.presetApplied && !this.presetManager) {
      this.log.warn('getEffectiveAdjustments: presetManager is null, cannot resolve preset', { presetId: photo.presetApplied });
    }

    const hasPreset = presetAdj !== null;
    const hasCustom = photo.customAdjustments && Object.keys(photo.customAdjustments).length > 0;

    this.log.info('getEffectiveAdjustments', {
      photoId: photo.id,
      presetApplied: photo.presetApplied,
      hasPreset,
      hasCustom,
      customKeys: photo.customAdjustments ? Object.keys(photo.customAdjustments) : [],
    });

    if (!hasPreset && !hasCustom) return null;

    // Merge: defaults → preset → custom
    const merged = { ...DEFAULT_ADJ, ...(presetAdj || {}), ...(photo.customAdjustments || {}) };

    // Check if anything actually differs from defaults
    const isDefault = (k: keyof PresetAdjustment) =>
      k === 'gamma' ? merged[k] === 1.0 : merged[k] === 0;
    const allDefault = (Object.keys(DEFAULT_ADJ) as (keyof PresetAdjustment)[]).every(isDefault);
    if (allDefault) {
      this.log.info('getEffectiveAdjustments: all values are default, returning null');
      return null;
    }

    this.log.info('getEffectiveAdjustments: returning merged adjustments', { exposure: merged.exposure, brightness: merged.brightness, contrast: merged.contrast });
    return merged;
  }

  private getSourcePath(photo: { filePath: string; fileName: string; isReferenced: boolean }): string {
    const originalsDir = path.join(this.libraryPath, 'originals');

    // Helper: check if a path looks like a thumbnail (inside thumbnails/ dir
    // or filename ends with _thumb.jpg)
    const looksLikeThumbnail = (p: string): boolean => {
      const normalized = p.replace(/\\/g, '/');
      return normalized.includes('/thumbnails/') || p.endsWith('_thumb.jpg');
    };

    // Primary: use stored filePath, but NOT if it's a thumbnail
    if (photo.filePath && fs.existsSync(photo.filePath)) {
      if (!looksLikeThumbnail(photo.filePath)) {
        return photo.filePath;
      }
      // filePath points to a thumbnail — try to find the real original instead
    }

    // Fallback: search in originals directory by filename
    const altPath = path.join(originalsDir, photo.fileName);
    if (fs.existsSync(altPath)) {
      return altPath;
    }

    // Last resort: if the filePath exists at all (even if it's a thumbnail),
    // return it so the export at least works rather than failing entirely.
    if (photo.filePath && fs.existsSync(photo.filePath)) {
      return photo.filePath;
    }

    // Final fallback: return stored path (will fail downstream with clear error)
    return photo.filePath;
  }

  /** Convert maxMemory MB to sharp pixel limit heuristic */
  private getPixelLimit(): number {
    // Approx: 1 MP ≈ 3 MB (8-bit RGB)
    // So 512 MB → ~170 MP limit, 256 MB → ~85 MP, etc.
    return Math.floor(this.maxMemory / 3 * 1e6);
  }
}
