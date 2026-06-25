// ========== Photo Types ==========
export interface PhotoFile {
  id: string;
  fileName: string;
  filePath: string;
  fileFormat: string;
  fileSize: number;
  width: number;
  height: number;
  dateTaken: string | null;
  dateModified: string;
  cameraModel: string | null;
  lensModel: string | null;
  iso: number | null;
  aperture: number | null;
  shutterSpeed: string | null;
  focalLength: number | null;
  thumbnailPath: string | null;
  /** Display URL for rendering (set by IPC, not stored) — e.g. file://... or photoforge://... */
  displayUrl?: string;
  rating: 0 | 1 | 2 | 3 | 4 | 5;
  colorLabel: 'none' | 'red' | 'yellow' | 'green' | 'blue' | 'purple';
  tags: string[];
  presetApplied: string | null;
  isFavorite: boolean;
  /** Whether the photo is a reference (linked) rather than copied into library */
  isReferenced: boolean;
  /** Crop region: { x, y, width, height } as fractions 0-1 of original image */
  cropRegion: CropRegion | null;
  /** Flip state */
  flipH: boolean;
  flipV: boolean;
  /** Rotation in degrees (0, 90, 180, 270) */
  rotation: number;
  /** Per-photo custom adjustments (applied on top of preset) */
  customAdjustments: Partial<PresetAdjustment> | null;
  /** Edit history entries */
  editHistory: EditHistoryEntry[];
  /** User-assigned title */
  title: string;
  /** User-assigned description */
  description: string;
  /** GPS latitude */
  latitude: number | null;
  /** GPS longitude */
  longitude: number | null;
}

export interface EditHistoryEntry {
  id: string;
  action: string;
  description: string;
  timestamp: number;
}

export interface CropRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ImportOptions {
  sourcePaths: string[];
  copyToLibrary: boolean;  // false = reference/link mode
  libraryPath: string;
  generateThumbnails: boolean;
  thumbnailSize: number;
  extractMetadata: boolean;
  detectDuplicates: boolean;
  fileExtensions: string[];
}

export interface ImportResult {
  totalFiles: number;
  imported: number;
  skipped: number;
  failed: number;
  errors: Array<{ file: string; error: string }>;
}


export interface ImportBatch {
  id: string;
  timestamp: string;
  photoIds: string[];
  count: number;
  importMode: 'copy' | 'reference';
}
// ========== Export Types ==========
export type ExportFormat = 'jpg' | 'jpeg' | 'png' | 'webp' | 'tiff' | 'bmp' | 'avif' | 'heif';

export interface ExportOptions {
  photoId: string;
  outputPath: string;
  format: ExportFormat;
  quality: number;        // 1-100 for lossy formats
  maxWidth?: number;
  maxHeight?: number;
  applyCrop: boolean;
  applyRotationFlip: boolean;
  applyPreset: boolean;
  preserveExif: boolean;
  colorSpace: "srgb" | "adobe-rgb" | "prophoto";
}

export interface BatchExportOptions {
  photoIds: string[];
  outputDir: string;
  /** Naming template for output filenames. Defaults to settings.namingTemplate */
  namingTemplate?: string;
}

// ========== Filter & Sort Types ==========
export type SortField = 'dateTaken' | 'fileName' | 'fileFormat' | 'fileSize' | 'rating' | 'dateModified';
export type SortOrder = 'asc' | 'desc';

export interface FilterCriteria {
  search: string;
  formats: string[];
  dateRange: { start: string | null; end: string | null };
  ratingMin: number;
  ratingMax: number;
  colorLabels: string[];
  tags: string[];
  cameraModels: string[];
  onlyFavorites: boolean;
  hasPreset: boolean | null;
}

export interface SortCriteria {
  field: SortField;
  order: SortOrder;
}

// ========== Preset Types ==========
/** [input, output] control point for tone curves, both in 0-255 range */
export type ColorCurvePoint = [number, number];

export interface ColorCurves {
  /** Master luminance curve (applied first, to all channels equally) */
  rgb?: ColorCurvePoint[];
  /** Red channel curve */
  red?: ColorCurvePoint[];
  /** Green channel curve */
  green?: ColorCurvePoint[];
  /** Blue channel curve */
  blue?: ColorCurvePoint[];
}

export interface PresetAdjustment {
  brightness: number;      // -100 to 100
  contrast: number;        // -100 to 100
  saturation: number;      // -100 to 100
  hue: number;             // -180 to 180
  temperature: number;     // -100 to 100
  tint: number;            // -100 to 100
  sharpness: number;       // 0 to 100
  vignette: number;        // 0 to 100
  grain: number;           // 0 to 100
  clarity: number;         // -100 to 100
  highlights: number;      // -100 to 100
  shadows: number;         // -100 to 100
  whites: number;          // -100 to 100
  blacks: number;          // -100 to 100
  exposure: number;        // -5 to 5
  gamma: number;           // 0.2 to 3.0
  /** Per-channel tone curves for accurate film emulation. When present,
   *  these are applied AFTER all global adjustments. Each curve is defined
   *  as control points [input, output] in 0-255 range, interpolated with
   *  monotone cubic spline. */
  colorCurves?: ColorCurves;
}

/** Keys of PresetAdjustment that are numeric sliders (excludes colorCurves) */
export type NumericAdjustmentKey = Exclude<keyof PresetAdjustment, 'colorCurves'>;

export interface Preset {
  id: string;
  name: string;
  category: PresetCategory;
  adjustments: PresetAdjustment;
  thumbnail?: string;
  description: string;
  isBuiltIn: boolean;
  /** Source file path if this preset was imported from an external file */
  sourceFile?: string;
  /** Camera manufacturer tag for imported camera presets */
  cameraManufacturer?: string;
}

export type PresetCategory =
  | 'classic' | 'portrait' | 'landscape' | 'cinematic'
  | 'vintage' | 'bw' | 'artistic' | 'mood' | 'color-grading'
  | 'film';  // new: film-emulation category

// ========== Settings Types ==========
export interface AppSettings {
  /** How to import photos by default: 'copy' duplicates into library, 'reference' links original */
  importMode: 'copy' | 'reference';
  /** Default export format */
  exportFormat: ExportFormat;
  /** Default export quality (1-100) */
  exportQuality: number;
  /** Thumbnail size for grid view */
  thumbnailSize: number;
  /** Theme preference */
  theme: 'light' | 'dark' | 'system' | 'vintage' | 'graphite-gold' | 'slate-blue' | 'merlot';
  /** Show file extensions in grid */
  showFileExtensions: boolean;
  /** Library path override (null = default ~/Pictures/PhotoForge_Library) */
  libraryPath: string | null;
  /** Automatically check for missing referenced files on startup */
  checkMissingFiles: boolean;
  /** Max memory for image processing (MB) */
  maxProcessMemory: number;
  /** Preserve EXIF data on export */
  preserveExif: boolean;
  /** Default color space for export */
  colorSpace: 'srgb' | 'adobe-rgb' | 'prophoto';
  /** Language */
  language: 'zh-CN' | 'en-US';
  /** Show grid info overlay */
  showGridInfo: boolean;
  /** Default export naming template */
  namingTemplate: string;
  /** Open folder in Finder after export */
  openFolderAfterExport: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  importMode: 'copy',
  exportFormat: 'jpg',
  exportQuality: 95,
  thumbnailSize: 400,
  theme: 'vintage',
  showFileExtensions: false,
  libraryPath: null,
  checkMissingFiles: true,
  maxProcessMemory: 512,
  preserveExif: true,
  colorSpace: 'srgb',
  language: 'zh-CN',
  showGridInfo: true,
  namingTemplate: '{filename}',
  openFolderAfterExport: true,
};

// ========== Collection Types ==========
export interface Collection {
  id: string;
  name: string;
  description: string;
  photoIds: string[];
  coverPhotoId: string | null;
  createdAt: string;
  updatedAt: string;
  isSmart: boolean;
  smartCriteria?: FilterCriteria;
}

export interface ImportBatch {
  id: string;
  timestamp: string;
  photoIds: string[];
  count: number;
  importMode: 'copy' | 'reference';
}

// ========== App State ==========
export interface AppState {
  photos: PhotoFile[];
  presets: Preset[];
  collections: Collection[];
  settings: AppSettings;
  filter: FilterCriteria;
  sort: SortCriteria;
  selectedPhotoIds: string[];
  currentView: 'grid' | 'detail' | 'compare' | 'collections' | 'settings';
  isLoading: boolean;
  importProgress: ImportProgress | null;
}

export interface ImportProgress {
  current: number;
  total: number;
  currentFile: string;
  stage: 'scanning' | 'copying' | 'thumbnailing' | 'metadata' | 'complete';
}

// ========== IPC Channel Types ==========
export const IPC = {
  IMPORT_FILES: 'import:files',
  IMPORT_CANCEL: 'import:cancel',
  IMPORT_PROGRESS: 'import:progress',
  GET_PHOTO: 'photo:get',
  GET_PHOTO_THUMBNAIL: 'photo:thumbnail',
  GET_PHOTO_FULL: 'photo:full',
  GET_PHOTO_PREVIEW: 'photo:preview',
  DELETE_PHOTOS: 'photo:delete',
  UPDATE_PHOTO_META: 'photo:updateMeta',
  GET_ALL_PHOTOS: 'photo:getAll',
  APPLY_PRESET: 'preset:apply',
  REMOVE_PRESET: 'preset:remove',
  GET_PRESETS: 'preset:getAll',
  CREATE_PRESET: 'preset:create',
  DELETE_PRESET: 'preset:delete',
  IMPORT_PRESET_FILE: 'preset:importFile',
  RENAME_PRESET: 'preset:rename',
  EXPORT_PRESET_TO_FILE: 'preset:exportToFile',
  GET_COLLECTIONS: 'collection:getAll',
  CREATE_COLLECTION: 'collection:create',
  DELETE_COLLECTION: 'collection:delete',
  ADD_TO_COLLECTION: 'collection:addPhotos',
  REMOVE_FROM_COLLECTION: 'collection:removePhotos',
  EXPORT_PHOTO: 'export:photo',
  EXPORT_PHOTO_ADVANCED: 'export:photoAdvanced',
  EXPORT_BATCH: 'export:batch',
  OPEN_DIALOG: 'dialog:open',
  SAVE_DIALOG: 'dialog:save',
  GET_LIBRARY_PATH: 'library:getPath',
  GET_STORAGE_STATS: 'storage:stats',
  OPEN_EXTERNAL: 'shell:openExternal',
  // Settings
  GET_SETTINGS: 'settings:get',
  UPDATE_SETTINGS: 'settings:update',
  // Transform (crop/flip/rotate)
  TRANSFORM_PHOTO: 'photo:transform',
  // Recent Imports
  IMPORT_GET_RECENT: 'import:getRecent',
  IMPORT_GET_BATCH_PHOTOS: 'import:getBatchPhotos',
  // Collection update
  COLLECTION_UPDATE: 'collection:update',
  // Batch preset operations
  BATCH_DELETE_PRESETS: 'preset:batchDelete',
  // Logging
  LOG_WRITE: 'log:write',
  LOG_READ: 'log:read',
  LOG_DATES: 'log:dates',
  LOG_CLEAR: 'log:clear',
  LOG_DIR: 'log:dir',
  // Missing references
  MISSING_REFERENCES_CHECK: 'missing-references:check',
  // Shell
  SHELL_OPEN_FOLDER: 'shell:openFolder',
  WINDOW_MINIMIZE: 'window:minimize',
  WINDOW_TOGGLE_MAXIMIZE: 'window:toggleMaximize',
  WINDOW_CLOSE: 'window:close',
} as const;
