import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { PhotoStore } from './store';
import { isRawFile, convertRawToJpeg } from './rawConverter';
import { ModuleLogger } from './logger';
import {
  ImportOptions, ImportResult, ImportProgress,
  PhotoFile,
} from '../shared/types';
import {
  ALL_SUPPORTED_FORMATS, DEFAULT_THUMBNAIL_SIZE, cleanCameraModel,
  THUMBNAILS_DIR, SUPPORTED_FORMAT_LABELS,
} from '../shared/constants';

const copyFile = promisify(fs.copyFile);
const mkdir = promisify(fs.mkdir);
const stat = promisify(fs.stat);

export class PhotoImporter {
  private libraryPath: string;
  private store: PhotoStore;
  private cancelled = false;
  private log: ModuleLogger;

  constructor(libraryPath: string, store: PhotoStore, logger: any) {
    this.libraryPath = libraryPath;
    this.store = store;
    this.log = logger.module('importer');
  }

  cancel(): void {
    this.cancelled = true;
  }

  async importFiles(
    options: ImportOptions,
    onProgress: (progress: ImportProgress) => void,
  ): Promise<ImportResult> {
    this.cancelled = false;
    const result: ImportResult = { totalFiles: 0, imported: 0, skipped: 0, failed: 0, errors: [] };

    const files = await this.scanFiles(
      options.sourcePaths,
      options.fileExtensions.length > 0 ? options.fileExtensions : ALL_SUPPORTED_FORMATS
    );
    result.totalFiles = files.length;

    onProgress({ current: 0, total: files.length, currentFile: '', stage: 'scanning' });

    for (let i = 0; i < files.length; i++) {
      if (this.cancelled) break;

      const filePath = files[i];
      onProgress({ current: i + 1, total: files.length, currentFile: path.basename(filePath), stage: 'copying' });

      try {
        if (options.detectDuplicates && this.isDuplicate(filePath)) {
          this.log.info('Skipped duplicate', { filePath });
          result.skipped++;
          continue;
        }

        let libraryFilePath = filePath;
        let isReferenced = !options.copyToLibrary;

        if (options.copyToLibrary) {
          libraryFilePath = await this.copyToLibrary(filePath);
          isReferenced = false;
          this.log.debug('Copied to library', { src: filePath, dest: libraryFilePath });
        }

        onProgress({ current: i + 1, total: files.length, currentFile: path.basename(filePath), stage: 'metadata' });
        const metadata = await this.extractMetadata(libraryFilePath);
        this.log.info('Extracted metadata', { file: path.basename(filePath), width: metadata.width, height: metadata.height, camera: metadata.cameraModel });

        let thumbnailPath: string | null = null;
        if (options.generateThumbnails) {
          onProgress({ current: i + 1, total: files.length, currentFile: path.basename(filePath), stage: 'thumbnailing' });
          thumbnailPath = await this.generateThumbnail(libraryFilePath, path.basename(filePath));
        }

        const ext = path.extname(filePath).toLowerCase();
        const fileFormat = SUPPORTED_FORMAT_LABELS[ext] || ext.replace('.', '').toUpperCase();

        const photo = this.store.addPhoto({
          fileName: path.basename(filePath),
          filePath: libraryFilePath,
          fileFormat,
          fileSize: (await stat(filePath)).size,
          width: metadata.width || 0,
          height: metadata.height || 0,
          dateTaken: metadata.dateTaken || null,
          dateModified: (await stat(filePath)).mtime.toISOString(),
          cameraModel: cleanCameraModel(metadata.cameraModel || null),
          lensModel: metadata.lensModel || null,
          iso: metadata.iso || null,
          aperture: metadata.aperture || null,
          shutterSpeed: metadata.shutterSpeed || null,
          focalLength: metadata.focalLength || null,
          thumbnailPath,
          rating: 0,
          colorLabel: 'none',
          tags: [],
          presetApplied: null,
          isFavorite: false,
          isReferenced,
          cropRegion: null,
          flipH: false,
          flipV: false,
          rotation: 0,
          customAdjustments: null,
          editHistory: [],
          title: '',
          description: '',
          latitude: null,
          longitude: null,
        });

        result.imported++;
      } catch (err: any) {
        this.log.error('Import failed', { file: filePath, error: err.message });
        result.failed++;
        result.errors.push({ file: filePath, error: err.message || String(err) });
      }
    }

    onProgress({ current: files.length, total: files.length, currentFile: '', stage: 'complete' });
    this.store.save();
    // Record this import batch for "Recent Imports" feature
    const importedPhotos = this.store.getAllPhotos().filter(p => 
      files.some(f => p.filePath === f || p.fileName === path.basename(f))
    );
    if (importedPhotos.length > 0) {
      this.store.recordImportBatch(
        importedPhotos.map(p => p.id),
        options.copyToLibrary ? 'copy' : 'reference'
      );
    }
    return result;
  }

  private async scanFiles(sourcePaths: string[], extensions: string[]): Promise<string[]> {
    const files: string[] = [];
    const extSet = new Set(extensions.map(e => e.toLowerCase()));

    const walk = async (dir: string) => {
      if (!fs.existsSync(dir)) return;
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (this.cancelled) return;
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          await walk(fullPath);
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase();
          if (extSet.has(ext)) {
            files.push(fullPath);
          }
        }
      }
    };

    for (const source of sourcePaths) {
      if (!fs.existsSync(source)) continue;
      const s = fs.statSync(source);
      if (s.isDirectory()) await walk(source);
      else if (s.isFile()) {
        const ext = path.extname(source).toLowerCase();
        if (extSet.has(ext)) files.push(source);
      }
    }

    return files;
  }

  private isDuplicate(filePath: string): boolean {
    const allPhotos = this.store.getAllPhotos();
    const fileName = path.basename(filePath);
    return allPhotos.some(p => p.fileName === fileName && p.fileSize > 0);
  }

  private async copyToLibrary(filePath: string): Promise<string> {
    const originalsDir = path.join(this.libraryPath, 'originals');
    await mkdir(originalsDir, { recursive: true });

    const baseName = path.basename(filePath);
    let destPath = path.join(originalsDir, baseName);

    // Handle name collisions
    let counter = 1;
    while (fs.existsSync(destPath)) {
      const ext = path.extname(baseName);
      const name = path.basename(baseName, ext);
      destPath = path.join(originalsDir, `${name}_${counter}${ext}`);
      counter++;
    }

    await copyFile(filePath, destPath);
    return destPath;
  }

  private async extractMetadata(filePath: string): Promise<Partial<PhotoFile>> {
    const metadata: Partial<PhotoFile> = {};
    const LAYOUT_SIZE_THRESHOLD = 500; // Below this is likely an EXIF embedded preview

    // === Step 1: sips (macOS native) — most reliable for pixel dimensions ===
    if (process.platform === 'darwin') {
      try {
        const { execFile } = require('child_process');
        const { stdout } = await new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
          (execFile as any)('sips', ['--getProperty', 'all', filePath], { timeout: 10000 }, (err: any, out: string, serr: string) => {
            if (err) reject(err); else resolve({ stdout: out, stderr: serr });
          });
        });
        const props: Record<string, string> = {};
        for (const line of stdout.split('\n')) {
          const m = line.match(/\s*([\w/]+)\s*:\s*(.+)/);
          if (m) props[m[1]] = m[2].trim();
        }
        if (props['pixelWidth']) metadata.width = parseInt(props['pixelWidth'], 10);
        if (props['pixelHeight']) metadata.height = parseInt(props['pixelHeight'], 10);
        if (props['model']) metadata.cameraModel = props['model'];
        this.log.debug('sips dimensions', { width: metadata.width, height: metadata.height });
      } catch (e: any) { this.log.warn('sips metadata failed', { error: e.message }); }
    }

    // === Step 2: exifr for EXIF camera/shooting data ===
    // IMPORTANT: Only use ExifImageWidth/ExifImageHeight (actual pixel dimensions),
    // NOT ImageWidth/ImageHeight (often the embedded preview size, e.g. 160×120)
    // Also do NOT overwrite dimensions already obtained from sips (sips is more reliable)
    try {
      const exifr = require('exifr');
      const data = await exifr.parse(filePath, {
        tiff: true, exif: true, gps: false,
        interop: false, iptc: true, xmp: true,
      });

      if (data) {
        if (data.DateTimeOriginal) metadata.dateTaken = new Date(data.DateTimeOriginal).toISOString();
        else if (data.CreateDate) metadata.dateTaken = new Date(data.CreateDate).toISOString();
        if (data.Make || data.Model) metadata.cameraModel = [data.Make, data.Model].filter(Boolean).join(' ');
        if (data.LensModel) metadata.lensModel = data.LensModel;
        if (data.ISO) metadata.iso = data.ISO;
        if (data.FNumber) metadata.aperture = data.FNumber;
        if (data.ExposureTime) metadata.shutterSpeed = `1/${Math.round(1 / data.ExposureTime)}`;
        if (data.FocalLength) metadata.focalLength = data.FocalLength;

        // Only use ExifImageWidth/ExifImageHeight (real pixel size),
        // and only if sips didn't already give us dimensions
        if (!metadata.width || !metadata.height) {
          if (data.ExifImageWidth) metadata.width = data.ExifImageWidth;
          if (data.ExifImageHeight) metadata.height = data.ExifImageHeight;
        }
        // NEVER use ImageWidth/ImageHeight — these are often embedded preview sizes
      }
    } catch (e: any) { this.log.warn('exifr failed', { error: e.message }); }

    // === Step 3: sharp as fallback for dimensions ===
    // Only if we still don't have dimensions, or they look suspiciously small
    if (!metadata.width || !metadata.height ||
        (metadata.width < LAYOUT_SIZE_THRESHOLD && metadata.height < LAYOUT_SIZE_THRESHOLD)) {
      try {
        const sharp = require('sharp');
        const info = await sharp(filePath, { failOn: 'none' }).metadata();
        if (info.width && info.height) {
          // Only use sharp's dimensions if they're larger than what we already have
          // (sharp may also return embedded preview size for some RAW formats)
          if (!metadata.width || !metadata.height || info.width > metadata.width || info.height > metadata.height) {
            metadata.width = info.width;
            metadata.height = info.height;
            this.log.info('sharp provided better dimensions', { width: info.width, height: info.height });
          }
        }
      } catch (e: any) { this.log.warn('sharp metadata failed', { error: e.message }); }
    }

    this.log.info('Final dimensions', { width: metadata.width, height: metadata.height, file: path.basename(filePath) });
    return metadata;
  }

  private async generateThumbnail(filePath: string, fileName: string): Promise<string> {
    const thumbnailsDir = path.join(this.libraryPath, THUMBNAILS_DIR);
    await mkdir(thumbnailsDir, { recursive: true });

    const baseName = path.basename(fileName, path.extname(fileName));
    let thumbPath = path.join(thumbnailsDir, `${baseName}_thumb.jpg`);

    let counter = 1;
    while (fs.existsSync(thumbPath)) {
      thumbPath = path.join(thumbnailsDir, `${baseName}_${counter}_thumb.jpg`);
      counter++;
    }

    // For RAW files: convert to JPEG first, then resize
    if (isRawFile(filePath)) {
      try {
        await convertRawToJpeg(filePath, thumbPath, DEFAULT_THUMBNAIL_SIZE);
        if (fs.existsSync(thumbPath) && fs.statSync(thumbPath).size > 0) {
          this.log.debug('RAW thumbnail via convertRawToJpeg', { thumbPath });
          return thumbPath;
        }
      } catch (err: any) {
        this.log.warn('RAW thumbnail conversion failed', { filePath, error: err.message });
      }
    }

    // For standard formats or RAW fallback: use sharp
    try {
      const sharp = require('sharp');
      await sharp(filePath, { failOn: 'none' })
        .rotate() // Auto-rotate based on EXIF Orientation
        .resize(DEFAULT_THUMBNAIL_SIZE, DEFAULT_THUMBNAIL_SIZE, {
          fit: 'inside', withoutEnlargement: true,
        })
        .jpeg({ quality: 85 })
        .toFile(thumbPath);

      if (fs.existsSync(thumbPath) && fs.statSync(thumbPath).size > 0) {
        return thumbPath;
      }
    } catch (err: any) {
      this.log.warn('sharp thumbnail failed', { filePath, error: err.message });
    }

    // Last resort: placeholder thumbnail
    try {
      const placeholderData = Buffer.from(
        '<svg width="400" height="400" xmlns="http://www.w3.org/2000/svg">' +
        '<rect width="400" height="400" fill="#2c2c54"/>' +
        '<text x="200" y="180" font-size="18" fill="#aaa" text-anchor="middle" dominant-baseline="middle">No Preview</text>' +
        '<text x="200" y="220" font-size="14" fill="#777" text-anchor="middle" dominant-baseline="middle">' +
        path.extname(filePath).replace('.', '').toUpperCase() +
        '</text></svg>'
      );
      const sharp = require('sharp');
      await sharp(placeholderData).resize(DEFAULT_THUMBNAIL_SIZE, DEFAULT_THUMBNAIL_SIZE).jpeg().toFile(thumbPath);
    } catch {
      const placeholderPath = path.join(thumbnailsDir, '_raw_placeholder.jpg');
      if (!fs.existsSync(placeholderPath)) {
        try {
          const sharp = require('sharp');
          const svg = Buffer.from(
            '<svg width="400" height="400" xmlns="http://www.w3.org/2000/svg">' +
            '<rect width="400" height="400" fill="#1a1a30"/>' +
            '<text x="200" y="200" font-size="16" fill="#666" text-anchor="middle" dominant-baseline="middle">RAW</text></svg>'
          );
          await sharp(svg).jpeg().toFile(placeholderPath);
        } catch { /* */ }
      }
      return fs.existsSync(placeholderPath) ? placeholderPath : thumbPath;
    }

    return thumbPath;
  }
}
