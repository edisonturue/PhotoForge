import * as fs from 'fs';
import { createHash } from 'crypto';
import * as path from 'path';
import { Preset, PresetAdjustment } from '../shared/types';
import { builtInPresets } from '../renderer/presets/builtIn';

const base: PresetAdjustment = {
  brightness: 0, contrast: 0, saturation: 0, hue: 0,
  temperature: 0, tint: 0, sharpness: 0, vignette: 0,
  grain: 0, clarity: 0, highlights: 0, shadows: 0,
  whites: 0, blacks: 0, exposure: 0, gamma: 1.0,
};

/**
 * Map of known preset file extensions to their manufacturer
 */
const PRESET_FILE_EXTENSIONS: Record<string, string> = {
  '.ncp': 'Nikon',
  '.xmp': 'Adobe',
  '.lrtemplate': 'Adobe Lightroom',
  '.dcp': 'Adobe DNG Camera Profile',
  '.icc': 'ICC Profile',
  '.c1': 'Capture One',
  '.fpx': 'DxO FilmPack',
};

export class PresetManager {
  private presets: Map<string, Preset> = new Map();
  private userPresetsFile: string;
  private importedPresetsDir: string;

  constructor(libraryPath: string) {
    this.userPresetsFile = path.join(libraryPath, 'user_presets.json');
    this.importedPresetsDir = path.join(libraryPath, 'imported_presets');
    if (!fs.existsSync(this.importedPresetsDir)) {
      fs.mkdirSync(this.importedPresetsDir, { recursive: true });
    }
    this.load();
  }

  private load(): void {
    // Load built-in presets
    for (const preset of builtInPresets) {
      this.presets.set(preset.id, preset);
    }

    // Load user presets
    if (fs.existsSync(this.userPresetsFile)) {
      try {
        const data = JSON.parse(fs.readFileSync(this.userPresetsFile, 'utf-8'));
        for (const preset of data.presets || []) {
          if (!preset.isBuiltIn) {
            this.presets.set(preset.id, preset);
          }
        }
      } catch { /* ignore */ }
    }

    // Load imported presets
    if (fs.existsSync(this.importedPresetsDir)) {
      const files = fs.readdirSync(this.importedPresetsDir);
      for (const file of files) {
        if (file.endsWith('.json')) {
          try {
            const data = JSON.parse(
              fs.readFileSync(path.join(this.importedPresetsDir, file), 'utf-8')
            );
            if (data.presets) {
              for (const preset of data.presets) {
                this.presets.set(preset.id, preset);
              }
            }
          } catch { /* ignore corrupt file */ }
        }
      }
    }
  }

  private saveUserPresets(): void {
    const userPresets = Array.from(this.presets.values()).filter(p => !p.isBuiltIn);
    fs.writeFileSync(this.userPresetsFile, JSON.stringify({ presets: userPresets }, null, 2));
  }

  getAll(): Preset[] {
    return Array.from(this.presets.values());
  }

  getById(id: string): Preset | null {
    return this.presets.get(id) || null;
  }

  getByCategory(category: string): Preset[] {
    return Array.from(this.presets.values()).filter(p => p.category === category);
  }

  create(preset: Preset): boolean {
    if (this.presets.has(preset.id)) return false;
    this.presets.set(preset.id, { ...preset, isBuiltIn: false });
    this.saveUserPresets();
    return true;
  }

  delete(presetId: string): boolean {
    const preset = this.presets.get(presetId);
    if (!preset || preset.isBuiltIn) return false;
    this.presets.delete(presetId);
    this.saveUserPresets();
    return true;
  }

  /**
   * Import a preset file (.ncp, .xmp, .lrtemplate, etc.)
   * Returns the number of presets imported.
   */
  /**
   * Generate a deterministic ID from file path + content hash to prevent duplicates.
   */
  private makeStableId(prefix: string, filePath: string, content: string, index: number = 0): string {
    const hash = createHash('md5').update(filePath + content).digest('hex').slice(0, 10);
    return `imported-${prefix}-${hash}-${index}`;
  }

  /**
   * Check if a preset with this sourceFile already exists to avoid duplicates.
   */
  private findExistingBySource(filePath: string): Preset | undefined {
    return Array.from(this.presets.values()).find(p => p.sourceFile === filePath && !p.isBuiltIn);
  }

  async importPresetFile(filePath: string): Promise<{ imported: number; errors: string[]; presets: Preset[]; skipped: number }> {
    const ext = path.extname(filePath).toLowerCase();
    const manufacturer = PRESET_FILE_EXTENSIONS[ext];
    const errors: string[] = [];
    const allParsedPresets: Preset[] = [];
    let imported = 0;
    let skipped = 0;

    if (!manufacturer) {
      errors.push(`不支持的预设文件格式: ${ext}`);
      return { imported: 0, errors, presets: [], skipped: 0 };
    }

    if (!fs.existsSync(filePath)) {
      errors.push(`文件不存在: ${filePath}`);
      return { imported: 0, errors, presets: [], skipped: 0 };
    }

    // Check for existing import of the same file
    const existing = this.findExistingBySource(filePath);
    if (existing) {
      skipped++;
      allParsedPresets.push(existing);
      errors.push('该文件的预设已存在，已跳过重复导入');
      return { imported: 0, errors, presets: allParsedPresets, skipped };
    }

    try {
      const content = fs.readFileSync(filePath, 'utf-8');

      if (ext === '.xmp') {
        const presets = parseXMP(content, manufacturer, filePath);
        for (let i = 0; i < presets.length; i++) {
          const preset = { ...presets[i], id: this.makeStableId('xmp', filePath, content, i) };
          this.presets.set(preset.id, preset);
          allParsedPresets.push(preset);
          imported++;
        }
      } else if (ext === '.lrtemplate') {
        const presets = parseLRTemplate(content, manufacturer, filePath);
        for (let i = 0; i < presets.length; i++) {
          const preset = { ...presets[i], id: this.makeStableId('lr', filePath, content, i) };
          this.presets.set(preset.id, preset);
          allParsedPresets.push(preset);
          imported++;
        }
      } else if (ext === '.ncp') {
        const fileName = path.basename(filePath, ext);
        const preset: Preset = {
          id: this.makeStableId('ncp', filePath, filePath),
          name: fileName,
          category: 'classic',
          adjustments: { ...base },
          description: `${manufacturer} 相机预设 (从 ${fileName}.ncp 导入)`,
          isBuiltIn: false,
          sourceFile: filePath,
          cameraManufacturer: manufacturer,
        };
        this.presets.set(preset.id, preset);
        allParsedPresets.push(preset);
        imported++;
      } else if (ext === '.dcp' || ext === '.icc') {
        const fileName = path.basename(filePath, ext);
        const preset: Preset = {
          id: this.makeStableId(ext.slice(1), filePath, filePath),
          name: fileName,
          category: 'classic',
          adjustments: { ...base },
          description: `${manufacturer} 配置文件 (从 ${fileName}${ext} 导入)`,
          isBuiltIn: false,
          sourceFile: filePath,
          cameraManufacturer: manufacturer,
        };
        this.presets.set(preset.id, preset);
        allParsedPresets.push(preset);
        imported++;
      } else {
        errors.push(`暂不支持 ${ext} 格式的详细解析，已创建占位预设`);
        const fileName = path.basename(filePath, ext);
        const preset: Preset = {
          id: this.makeStableId(ext.slice(1), filePath, filePath),
          name: fileName,
          category: 'classic',
          adjustments: { ...base },
          description: `从 ${fileName}${ext} 导入的预设 (${manufacturer})`,
          isBuiltIn: false,
          sourceFile: filePath,
          cameraManufacturer: manufacturer,
        };
        this.presets.set(preset.id, preset);
        allParsedPresets.push(preset);
        imported++;
      }

      if (imported > 0) {
        this.saveImportedPresets(filePath, ext);
        this.saveUserPresets();
      }
    } catch (err: any) {
      errors.push(`解析失败: ${err.message}`);
    }

    return { imported, errors, presets: allParsedPresets, skipped };
  }

  /**
   * Rename a user preset. Built-in presets cannot be renamed.
   */
  rename(presetId: string, newName: string): boolean {
    const preset = this.presets.get(presetId);
    if (!preset || preset.isBuiltIn) return false;
    this.presets.set(presetId, { ...preset, name: newName });
    this.saveUserPresets();
    return true;
  }

  /**
   * Export a preset to a JSON file on disk.
   */
  exportToFile(presetId: string, outputPath: string): boolean {
    const preset = this.presets.get(presetId);
    if (!preset) return false;
    const exportData = {
      name: preset.name,
      category: preset.category,
      adjustments: preset.adjustments,
      description: preset.description,
      cameraManufacturer: preset.cameraManufacturer || null,
      exportedAt: new Date().toISOString(),
      format: 'PhotoForge-Preset-v1',
    };
    fs.writeFileSync(outputPath, JSON.stringify(exportData, null, 2));
    return true;
  }

  private saveImportedPresets(sourceFilePath: string, ext: string): void {
    const id = `imported-${ext.slice(1)}-${Date.now()}`;
    const importedPresets = Array.from(this.presets.values())
      .filter(p => p.sourceFile === sourceFilePath);
    const destFile = path.join(this.importedPresetsDir, `${id}.json`);
    fs.writeFileSync(destFile, JSON.stringify({ presets: importedPresets }, null, 2));
  }
}

// ===== XMP Parser =====
function parseXMP(content: string, manufacturer: string, filePath: string): Preset[] {
  const presets: Preset[] = [];
  const fileName = path.basename(filePath, path.extname(filePath));

  // Try to extract crs: settings from XMP
  const extractValue = (key: string): number | null => {
    const regex = new RegExp(`crs:${key}="([^"]+)"`, 'i');
    const match = content.match(regex);
    if (match) return parseFloat(match[1]);
    // Also try without namespace
    const regex2 = new RegExp(`${key}="([^"]+)"`, 'i');
    const match2 = content.match(regex2);
    if (match2) return parseFloat(match2[1]);
    return null;
  };

  const adj: PresetAdjustment = { ...base };

  // Map common Lightroom XMP keys to our adjustment model
  const exposure = extractValue('Exposure2012');
  if (exposure !== null) adj.exposure = exposure;

  const contrast = extractValue('Contrast2012');
  if (contrast !== null) adj.contrast = contrast;

  const saturation = extractValue('Saturation');
  if (saturation !== null) adj.saturation = saturation;

  const highlights = extractValue('Highlights2012');
  if (highlights !== null) adj.highlights = highlights;

  const shadows = extractValue('Shadows2012');
  if (shadows !== null) adj.shadows = shadows;

  const whites = extractValue('Whites2012');
  if (whites !== null) adj.whites = whites;

  const blacks = extractValue('Blacks2012');
  if (blacks !== null) adj.blacks = blacks;

  const clarity = extractValue('Clarity2012');
  if (clarity !== null) adj.clarity = clarity;

  const vibrance = extractValue('Vibrance');
  if (vibrance !== null) adj.saturation = (adj.saturation || 0) + vibrance * 0.5;

  const sharpness = extractValue('Sharpness');
  if (sharpness !== null) adj.sharpness = sharpness;

  const temperature = extractValue('Temperature');
  if (temperature !== null) adj.temperature = temperature / 20; // rough scale

  const tint = extractValue('Tint');
  if (tint !== null) adj.tint = tint / 10;

  const vignetting = extractValue('PostCropVignetteAmt');
  if (vignetting !== null) adj.vignette = Math.abs(vignetting);

  const grain = extractValue('GrainAmount');
  if (grain !== null) adj.grain = grain;

  // Try to find preset name
  let presetName = fileName;
  const nameMatch = content.match(/crs:PresetName="([^"]+)"/i)
    || content.match(/dc:title>([^<]+)</i)
    || content.match(/stEvt:softwareAgent="Adobe Photoshop Lightroom[^"]*Preset:\s*([^"]+)"/i);
  if (nameMatch) presetName = nameMatch[1];

  presets.push({
    id: `imported-xmp-${Date.now()}-${presetName.replace(/\s+/g, '-')}`,
    name: presetName,
    category: guessCategory(adj),
    adjustments: adj,
    description: `${manufacturer} 预设 (从 XMP 导入)`,
    isBuiltIn: false,
    sourceFile: filePath,
    cameraManufacturer: manufacturer,
  });

  return presets;
}

// ===== .lrtemplate Parser =====
function parseLRTemplate(content: string, manufacturer: string, filePath: string): Preset[] {
  const presets: Preset[] = [];
  const fileName = path.basename(filePath, path.extname(filePath));

  const adj: PresetAdjustment = { ...base };

  // .lrtemplate is a Lua-like key-value format
  const extractNumber = (key: string): number | null => {
    const regex = new RegExp(`${key}\\s*=\\s*([\\-]?[\\d.]+)`, 'i');
    const match = content.match(regex);
    return match ? parseFloat(match[1]) : null;
  };

  const exposure = extractNumber('Exposure');
  if (exposure !== null) adj.exposure = exposure;

  const contrast = extractNumber('Contrast');
  if (contrast !== null) adj.contrast = contrast;

  const saturation = extractNumber('Saturation');
  if (saturation !== null) adj.saturation = saturation;

  const highlights = extractNumber('HighlightRecovery');
  if (highlights !== null) adj.highlights = -highlights;

  const shadows = extractNumber('Shadows');
  if (shadows !== null) adj.shadows = shadows;

  const clarity = extractNumber('Clarity');
  if (clarity !== null) adj.clarity = clarity;

  const sharpness = extractNumber('Sharpness');
  if (sharpness !== null) adj.sharpness = sharpness;

  const temperature = extractNumber('Temperature');
  if (temperature !== null) adj.temperature = temperature / 20;

  const grain = extractNumber('GrainAmount');
  if (grain !== null) adj.grain = grain;

  const vignetting = extractNumber('PostCropVignetteAmt');
  if (vignetting !== null) adj.vignette = Math.abs(vignetting);

  // Try to find the preset name from the file
  let presetName = fileName;
  const nameMatch = content.match(/value\s*=\s*"([^"]+)"/);
  if (nameMatch) presetName = nameMatch[1];

  presets.push({
    id: `imported-lr-${Date.now()}-${presetName.replace(/\s+/g, '-')}`,
    name: presetName,
    category: guessCategory(adj),
    adjustments: adj,
    description: `${manufacturer} 预设 (从 .lrtemplate 导入)`,
    isBuiltIn: false,
    sourceFile: filePath,
    cameraManufacturer: manufacturer,
  });

  return presets;
}

// ===== Utility =====
function guessCategory(adj: PresetAdjustment): Preset['category'] {
  if (adj.saturation <= -80) return 'bw';
  if (adj.grain >= 20) return 'film';
  if (adj.temperature > 15 && adj.saturation > 10) return 'vintage';
  if (Math.abs(adj.temperature) > 20 || Math.abs(adj.tint) > 15) return 'color-grading';
  if (adj.contrast > 20 && adj.vignette > 10) return 'cinematic';
  if (adj.temperature > 0 && adj.saturation < 10) return 'portrait';
  return 'classic';
}
