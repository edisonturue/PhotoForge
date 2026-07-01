import * as fs from 'fs';
import * as path from 'path';
import { PhotoFile, Collection, AppSettings, DEFAULT_SETTINGS, FilterCriteria, ImportBatch } from '../shared/types';
import { THUMBNAILS_DIR, MODIFIED_DIR, LIBRARY_SUBDIR, cleanCameraModel } from '../shared/constants';

interface StorageStats {
  totalPhotos: number;
  librarySizeBytes: number;
  thumbnailsSizeBytes: number;
  modifiedSizeBytes: number;
}

export class PhotoStore {
  private photos: Map<string, PhotoFile> = new Map();
  private collections: Map<string, Collection> = new Map();
  private dataFile: string;
  private collectionsFile: string;
  private settingsFile: string;
  private recentImportsFile: string;
  private recentImports: ImportBatch[] = [];
  private libraryPath: string;
  private settings: AppSettings;

  constructor(libraryPath: string) {
    this.libraryPath = libraryPath;
    this.dataFile = path.join(libraryPath, 'library.json');
    this.collectionsFile = path.join(libraryPath, 'collections.json');
    this.settingsFile = path.join(libraryPath, 'settings.json');
    this.recentImportsFile = path.join(libraryPath, 'recent-imports.json');
    this.settings = { ...DEFAULT_SETTINGS };
    this.ensureDirs();
    this.load();
    this.loadSettings();
    this.loadCollections();
    this.loadRecentImports();
    this.cleanupRecentImports();
  }

  private ensureDirs(): void {
    const dirs = [
      this.libraryPath,
      path.join(this.libraryPath, THUMBNAILS_DIR),
      path.join(this.libraryPath, MODIFIED_DIR),
      path.join(this.libraryPath, 'originals'),
    ];
    for (const dir of dirs) {
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    }
  }

  private load(): void {
    if (fs.existsSync(this.dataFile)) {
      try {
        const data = JSON.parse(fs.readFileSync(this.dataFile, 'utf-8'));
        const photos = data.photos || [];
        let needsSave = false;
        const originalsDir = path.join(this.libraryPath, 'originals');

        const looksLikeThumbnail = (p: string): boolean => {
          const normalized = p.replace(/\\/g, '/');
          return normalized.includes('/thumbnails/') || p.endsWith('_thumb.jpg');
        };

        for (const p of photos) {
          // Ensure new fields have defaults for older data
          if (p.isReferenced === undefined) p.isReferenced = false;
          if (p.cropRegion === undefined) p.cropRegion = null;
          if (p.flipH === undefined) p.flipH = false;
          if (p.flipV === undefined) p.flipV = false;
          if (p.rotation === undefined) p.rotation = 0;
          if (p.customAdjustments === undefined) p.customAdjustments = null;
          if (p.editHistory === undefined) p.editHistory = [];
          if (p.title === undefined) p.title = '';
          if (p.description === undefined) p.description = '';
          if (p.latitude === undefined) p.latitude = null;
          if (p.longitude === undefined) p.longitude = null;

          // Migration: fix filePath that points to a thumbnail file
          // Old code could store the thumbnail path as filePath — correct it to point to the original
          if (p.filePath && looksLikeThumbnail(p.filePath)) {
            const altPath = path.join(originalsDir, p.fileName);
            if (fs.existsSync(altPath)) {
              p.filePath = altPath;
              needsSave = true;
            }
          }

          // Migration: fix width/height that look like EXIF embedded preview sizes
          // These are typically 160×120 or similar small values, not real pixel dimensions
          if (p.width > 0 && p.height > 0 && (p.width < 500 || p.height < 500)) {
            // Try to get real dimensions from the actual image file
            const resolvePath = p.filePath && fs.existsSync(p.filePath) ? p.filePath : null;
            if (resolvePath) {
              try {
                const sharp = require('sharp');
                const info = sharp(resolvePath, { failOn: 'none' }).metadata();
                // sharp metadata is sync in newer versions, but let's handle both
                if (info && info.width && info.height &&
                    (info.width > p.width || info.height > p.height)) {
                  p.width = info.width;
                  p.height = info.height;
                  needsSave = true;
                }
              } catch { /* sharp not available or failed */ }
              // Fallback: try sips on macOS
              if ((p.width < 500 || p.height < 500) && process.platform === 'darwin') {
                try {
                  const { execFileSync } = require('child_process');
                  const stdout = execFileSync('sips', ['--getProperty', 'pixelWidth', '--getProperty', 'pixelHeight', resolvePath], { timeout: 5000, encoding: 'utf-8' });
                  const wMatch = stdout.match(/pixelWidth\s*:\s*(\d+)/);
                  const hMatch = stdout.match(/pixelHeight\s*:\s*(\d+)/);
                  if (wMatch && hMatch) {
                    const w = parseInt(wMatch[1], 10);
                    const h = parseInt(hMatch[1], 10);
                    if (w > p.width || h > p.height) {
                      p.width = w;
                      p.height = h;
                      needsSave = true;
                    }
                  }
                } catch { /* sips failed */ }
              }
            }
          }

          // Migration: clean existing camera model names (remove CORPORATION/INC. etc.)
          if (p.cameraModel) {
            const cleaned = cleanCameraModel(p.cameraModel);
            if (cleaned !== p.cameraModel) {
              p.cameraModel = cleaned;
              needsSave = true;
            }
          }

          this.photos.set(p.id, p);
        }

        // Persist any migration fixes
        if (needsSave) {
          this.save();
        }
      } catch {
        this.photos = new Map();
      }
    }
  }

  save(): void {
    const data = { photos: Array.from(this.photos.values()), version: 2 };
    fs.writeFileSync(this.dataFile, JSON.stringify(data, null, 2));
  }

  // ===== Settings =====

  private loadSettings(): void {
    if (fs.existsSync(this.settingsFile)) {
      try {
        const data = JSON.parse(fs.readFileSync(this.settingsFile, 'utf-8'));
        this.settings = { ...DEFAULT_SETTINGS, ...data };
      } catch { /* use defaults */ }
    }
  }

  private saveSettings(): void {
    fs.writeFileSync(this.settingsFile, JSON.stringify(this.settings, null, 2));
  }

  getSettings(): AppSettings {
    return { ...this.settings };
  }

  updateSettings(updates: Partial<AppSettings>): AppSettings {
    this.settings = { ...this.settings, ...updates };
    this.saveSettings();
    return { ...this.settings };
  }

  // ===== Photos =====

  addPhoto(photo: Omit<PhotoFile, 'id'>): PhotoFile {
    const id = `photo-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const newPhoto: PhotoFile = {
      ...photo,
      id,
      title: photo.title ?? '',
      description: photo.description ?? '',
      latitude: photo.latitude ?? null,
      longitude: photo.longitude ?? null,
    };
    this.photos.set(id, newPhoto);
    this.save();
    return newPhoto;
  }

  getPhoto(id: string): PhotoFile | null {
    return this.photos.get(id) || null;
  }

  getAllPhotos(): PhotoFile[] {
    return Array.from(this.photos.values());
  }

  updatePhoto(id: string, updates: Partial<PhotoFile>): boolean {
    const photo = this.photos.get(id);
    if (!photo) return false;
    Object.assign(photo, updates);
    this.photos.set(id, photo);
    this.save();
    return true;
  }

  deletePhoto(id: string): boolean {
    const photo = this.photos.get(id);
    if (!photo) return false;
    // Only remove files if photo was copied (not referenced)
    if (!photo.isReferenced) {
      try {
        if (photo.thumbnailPath && fs.existsSync(photo.thumbnailPath)) {
          fs.unlinkSync(photo.thumbnailPath);
        }
      } catch { /* ignore */ }
    } else {
      // For referenced files, still clean up the thumbnail
      try {
        if (photo.thumbnailPath && fs.existsSync(photo.thumbnailPath)) {
          fs.unlinkSync(photo.thumbnailPath);
        }
      } catch { /* ignore */ }
    }
    this.photos.delete(id);
    this.save();
    try { this.removePhotoFromRecentImports(id); } catch {}
    return true;
  }

  getThumbnailPath(id: string): string | null {
    const photo = this.photos.get(id);
    return photo?.thumbnailPath || null;
  }

  getFullPath(id: string): string | null {
    const photo = this.photos.get(id);
    return photo?.filePath || null;
  }

  getLibraryPath(): string {
    return this.libraryPath;
  }

  getStorageStats(): StorageStats {
    let librarySize = 0;
    let thumbnailsSize = 0;
    let modifiedSize = 0;

    const calcDirSize = (dir: string): number => {
      if (!fs.existsSync(dir)) return 0;
      let size = 0;
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const fp = path.join(dir, file);
        const stat = fs.statSync(fp);
        if (stat.isDirectory()) size += calcDirSize(fp);
        else size += stat.size;
      }
      return size;
    };

    librarySize = calcDirSize(this.libraryPath);
    thumbnailsSize = calcDirSize(path.join(this.libraryPath, THUMBNAILS_DIR));
    modifiedSize = calcDirSize(path.join(this.libraryPath, MODIFIED_DIR));

    return {
      totalPhotos: this.photos.size,
      librarySizeBytes: librarySize,
      thumbnailsSizeBytes: thumbnailsSize,
      modifiedSizeBytes: modifiedSize,
    };
  }

  // ===== Collections =====

  private loadCollections(): void {
    if (fs.existsSync(this.collectionsFile)) {
      try {
        const data = JSON.parse(fs.readFileSync(this.collectionsFile, 'utf-8'));
        for (const c of data.collections || []) {
          this.collections.set(c.id, c);
        }
      } catch { this.collections = new Map(); }
    }
  }

  private saveCollections(): void {
    fs.writeFileSync(this.collectionsFile, JSON.stringify({ collections: Array.from(this.collections.values()) }, null, 2));
  }

  getAllCollections(): Collection[] {
    return Array.from(this.collections.values());
  }

  createCollection(name: string, description: string = '', isSmart: boolean = false, smartCriteria?: FilterCriteria): Collection {
    const id = `col-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const now = new Date().toISOString();
    const col: Collection = { id, name, description, photoIds: [], coverPhotoId: null, createdAt: now, updatedAt: now, isSmart, smartCriteria };
    this.collections.set(id, col);
    this.saveCollections();
    return col;
  }

  deleteCollection(id: string): boolean {
    if (!this.collections.has(id)) return false;
    this.collections.delete(id);
    this.saveCollections();
    return true;
  }

  addToCollection(collectionId: string, photoIds: string[]): boolean {
    const col = this.collections.get(collectionId);
    if (!col) return false;
    for (const pid of photoIds) {
      if (!col.photoIds.includes(pid)) col.photoIds.push(pid);
    }
    col.updatedAt = new Date().toISOString();
    if (!col.coverPhotoId && col.photoIds.length > 0) col.coverPhotoId = col.photoIds[0];
    this.saveCollections();
    return true;
  }

  removeFromCollection(collectionId: string, photoIds: string[]): boolean {
    const col = this.collections.get(collectionId);
    if (!col) return false;
    col.photoIds = col.photoIds.filter(id => !photoIds.includes(id));
    col.updatedAt = new Date().toISOString();
    if (col.coverPhotoId && photoIds.includes(col.coverPhotoId)) {
      col.coverPhotoId = col.photoIds.length > 0 ? col.photoIds[0] : null;
    }
    this.saveCollections();
    return true;
  }

  updateCollection(id: string, updates: Partial<Pick<Collection, 'name' | 'description'>>): boolean {
    const col = this.collections.get(id);
    if (!col) return false;
    if (updates.name !== undefined) col.name = updates.name;
    if (updates.description !== undefined) col.description = updates.description;
    col.updatedAt = new Date().toISOString();
    this.saveCollections();
    return true;
  }

  /** Resolve smart collection criteria to get matching photo IDs */
  resolveSmartCollection(col: Collection): string[] {
    if (!col.isSmart || !col.smartCriteria) return col.photoIds;
    const c = col.smartCriteria;
    return this.getAllPhotos().filter(p => {
      if (c.onlyFavorites && !p.isFavorite) return false;
      if (c.ratingMin > 0 && p.rating < c.ratingMin) return false;
      if (c.formats.length > 0 && !c.formats.includes(p.fileFormat)) return false;
      if (c.colorLabels.length > 0 && !c.colorLabels.includes('none') && !c.colorLabels.includes(p.colorLabel)) return false;
      if (c.cameraModels.length > 0 && (!p.cameraModel || !c.cameraModels.includes(p.cameraModel))) return false;
      if (c.hasPreset === true && !p.presetApplied) return false;
      if (c.tags.length > 0 && !c.tags.some(t => p.tags.includes(t))) return false;
      return true;
    }).map(p => p.id);
  }


  // ===== Recent Imports =====

  private loadRecentImports(): void {
    if (fs.existsSync(this.recentImportsFile)) {
      try {
        const data = JSON.parse(fs.readFileSync(this.recentImportsFile, 'utf-8'));
        this.recentImports = data.batches || [];
      } catch { this.recentImports = []; }
    }
  }

  private saveRecentImports(): void {
    fs.writeFileSync(this.recentImportsFile, JSON.stringify({ batches: this.recentImports }, null, 2));
  }

  recordImportBatch(photoIds: string[], mode: 'copy' | 'reference'): ImportBatch {
    const batch: ImportBatch = {
      id: `batch-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      timestamp: new Date().toISOString(),
      photoIds,
      count: photoIds.length,
      importMode: mode,
    };
    this.recentImports.unshift(batch);
    // Keep only last 10
    if (this.recentImports.length > 10) {
      this.recentImports = this.recentImports.slice(0, 10);
    }
    this.saveRecentImports();
    return batch;
  }

  getRecentImports(): ImportBatch[] {
    // Filter out batches whose photo IDs no longer exist
    return this.recentImports.map(batch => {
      const existingIds = batch.photoIds.filter(id => this.photos.has(id));
      return { ...batch, photoIds: existingIds, count: existingIds.length };
    }).filter(batch => batch.count > 0).slice(0, 10);
  }

  getImportBatchPhotos(batchId: string): PhotoFile[] {
    const batch = this.recentImports.find(b => b.id === batchId);
    if (!batch) return [];
    return batch.photoIds
      .map(id => this.photos.get(id))
      .filter((p): p is PhotoFile => p !== undefined);
  }


  private cleanupRecentImports(): void {
    for (let i = this.recentImports.length - 1; i >= 0; i--) {
      const batch = this.recentImports[i];
      const validIds = batch.photoIds.filter(id => this.photos.has(id));
      if (validIds.length !== batch.photoIds.length || validIds.length === 0) {
        batch.photoIds = validIds;
        batch.count = validIds.length;
      }
      if (batch.count === 0) {
        this.recentImports.splice(i, 1);
      }
    }
    this.saveRecentImports();
  }

  private removePhotoFromRecentImports(photoId: string): void {
    let changed = false;
    for (let i = this.recentImports.length - 1; i >= 0; i--) {
      const batch = this.recentImports[i];
      const idx = batch.photoIds.indexOf(photoId);
      if (idx !== -1) {
        batch.photoIds.splice(idx, 1);
        batch.count = batch.photoIds.length;
        changed = true;
      }
      if (batch.count === 0) {
        this.recentImports.splice(i, 1);
      }
    }
    if (changed) {
      this.saveRecentImports();
    }
  }

  getMissingReferences(): Array<{ id: string; fileName: string; filePath: string }> {
    const missing: Array<{ id: string; fileName: string; filePath: string }> = [];
    for (const photo of this.photos.values()) {
      if (photo.isReferenced && !fs.existsSync(photo.filePath)) {
        missing.push({ id: photo.id, fileName: photo.fileName, filePath: photo.filePath });
      }
    }
    return missing;
  }
}

