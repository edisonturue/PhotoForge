import { app, BrowserWindow, ipcMain, dialog, shell, protocol, net } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { IPC, ImportOptions, ImportResult, PhotoFile, Preset, AppSettings, ExportOptions, Collection, FilterCriteria, ImportBatch } from '../shared/types';
import { PhotoImporter } from './importer';
import { PhotoStore } from './store';
import { PresetManager } from './presetManager';
import { ExportManager } from './exportManager';
import { isRawFile, getConvertedJpegPath } from './rawConverter';
import { Logger } from './logger';

// Fix: Set app name so macOS shows 'PhotoForge' instead of 'Electron' in Spotlight and menu bar
app.setName('PhotoForge');

let mainWindow: BrowserWindow | null = null;
let importer: PhotoImporter;
let store: PhotoStore;
let presetManager: PresetManager;
let exportManager: ExportManager;
let logger: Logger;

function createWindow(): BrowserWindow {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'PhotoForge',
    backgroundColor: '#171614',
    frame: false,
    visualEffectState: 'active',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false,
    },
  });

  if (process.platform === 'darwin') {
    mainWindow.setWindowButtonVisibility(false);
  }

  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  mainWindow.webContents.on('did-finish-load', () => {
    logger.module('renderer').info('Renderer loaded');
  });
  mainWindow.on('closed', () => { mainWindow = null; });
  return mainWindow;
}

app.whenReady().then(async () => {
  // Determine library path: use custom path from settings if configured, otherwise default
  const defaultLibraryPath = path.join(app.getPath('pictures'), 'PhotoForge_Library');
  // Pre-load settings to check for a custom library path override
  const settingsPath = path.join(defaultLibraryPath, 'settings.json');
  let customLibraryPath: string | null = null;
  if (fs.existsSync(settingsPath)) {
    try {
      const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
      if (settings.libraryPath) customLibraryPath = settings.libraryPath;
    } catch { /* ignore parse errors */ }
  }
  const libraryPath = customLibraryPath || defaultLibraryPath;
  const convertedDir = path.join(libraryPath, 'converted');

  // Initialize logger — logs go into <libraryPath>/logs/ alongside the photo library
  logger = new Logger(libraryPath);
  const log = logger.module('main');
  log.info('PhotoForge starting', { libraryPath });

  // Register custom protocol for serving images
  // Supports: photoforge://raw/path (default 4000px)
  //           photoforge://raw/800/path (800px preview for grid)
  protocol.handle('photoforge', async (request) => {
    try {
      const rawUrl = request.url.replace('photoforge://', '');
      // Parse: raw[/size]/path  or  raw/path
      const rawMatch = rawUrl.match(/^raw(?:\/(\d+))?\/(.*)$/);
      if (!rawMatch) {
        return new Response('Invalid URL', { status: 400 });
      }
      const maxWidth = rawMatch[1] ? parseInt(rawMatch[1], 10) : 4000;
      const filePath = decodeURIComponent(rawMatch[2]);

      if (!fs.existsSync(filePath)) {
        log.warn('photoforge:// file not found', { filePath });
        return new Response('Not found', { status: 404 });
      }

      if (isRawFile(filePath)) {
        log.debug('photoforge:// converting RAW', { filePath, maxWidth });
        const jpegPath = await getConvertedJpegPath(filePath, convertedDir, maxWidth);
        const data = fs.readFileSync(jpegPath);
        return new Response(data, {
          headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'public, max-age=86400' },
        });
      }

      const ext = path.extname(filePath).toLowerCase();
      const mimeMap: Record<string, string> = {
        '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
        '.gif': 'image/gif', '.bmp': 'image/bmp', '.webp': 'image/webp',
        '.tiff': 'image/tiff', '.tif': 'image/tiff',
        '.svg': 'image/svg+xml', '.heic': 'image/heic',
        '.avif': 'image/avif',
      };
      const mime = mimeMap[ext] || 'application/octet-stream';
      const data = fs.readFileSync(filePath);
      return new Response(data, {
        headers: { 'Content-Type': mime, 'Cache-Control': 'public, max-age=86400' },
      });
    } catch (err: any) {
      logger.module('protocol').error('photoforge:// handler error', { error: err.message });
      return new Response('Error: ' + err.message, { status: 500 });
    }
  });

  store = new PhotoStore(libraryPath);
  importer = new PhotoImporter(libraryPath, store, logger);
  presetManager = new PresetManager(libraryPath);
  exportManager = new ExportManager(store, libraryPath, logger);
  exportManager.setPresetManager(presetManager);

  // Sync exportManager maxMemory from settings
  const initialSettings = store.getSettings();
  exportManager.setMaxMemory(initialSettings.maxProcessMemory);

  log.info('Store initialized', { photoCount: store.getAllPhotos().length });

  createWindow();
  registerIpcHandlers();

  // Check for missing referenced files on startup
  if (initialSettings.checkMissingFiles) {
    const missing = store.getMissingReferences();
    if (missing.length > 0 && mainWindow) {
      mainWindow.webContents.send('missing-references', missing);
    }
  }

  // Regenerate thumbnails for photos missing them (async, non-blocking)
  const photosNeedingThumbs = store.getAllPhotos().filter(p => !p.thumbnailPath || !fs.existsSync(p.thumbnailPath));
  if (photosNeedingThumbs.length > 0) {
    log.info('Regenerating thumbnails', { count: photosNeedingThumbs.length });
    // Run in background — don't block startup
    setImmediate(async () => {
      const sharp = require('sharp');
      for (const photo of photosNeedingThumbs) {
        try {
          if (!fs.existsSync(photo.filePath)) continue;
          const thumbnailsDir = path.join(libraryPath, 'thumbnails');
          if (!fs.existsSync(thumbnailsDir)) fs.mkdirSync(thumbnailsDir, { recursive: true });
          const baseName = path.basename(photo.fileName, path.extname(photo.fileName));
          const thumbPath = path.join(thumbnailsDir, `${baseName}_thumb.jpg`);
          
          if (isRawFile(photo.filePath)) {
            await getConvertedJpegPath(photo.filePath, convertedDir, 400);
            // The converted file is already generated at 400px, copy it as thumbnail
            const convertedName = `${baseName}_400.jpg`;
            const convertedPath = path.join(convertedDir, convertedName);
            if (fs.existsSync(convertedPath)) {
              fs.copyFileSync(convertedPath, thumbPath);
            } else {
              // Use sips for thumbnail
              const { execFileAsync } = require('child_process');
              const { promisify } = require('util');
              await promisify(execFileAsync)('sips', [
                '--setProperty', 'format', 'jpeg',
                '--resampleWidth', '400',
                '--out', thumbPath, photo.filePath,
              ], { timeout: 30000 });
            }
          } else {
            await sharp(photo.filePath, { failOn: 'none' })
              .rotate()
              .resize(400, 400, { fit: 'inside', withoutEnlargement: true })
              .jpeg({ quality: 85 })
              .toFile(thumbPath);
          }
          
          if (fs.existsSync(thumbPath) && fs.statSync(thumbPath).size > 0) {
            store.updatePhoto(photo.id, { thumbnailPath: thumbPath } as any);
          }
        } catch (err: any) {
          log.warn('Thumbnail regeneration failed', { id: photo.id, error: err.message });
        }
      }
      log.info('Thumbnail regeneration complete');
    });
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

function registerIpcHandlers(): void {
  // Import
  ipcMain.handle(IPC.IMPORT_FILES, async (_, options: ImportOptions): Promise<ImportResult> => {
    const result = await importer.importFiles(options, (progress) => {
      mainWindow?.webContents.send(IPC.IMPORT_PROGRESS, progress);
    });
    return result;
  });

  ipcMain.handle(IPC.IMPORT_CANCEL, () => {
    importer.cancel();
    return true;
  });

  // Photos
  ipcMain.handle(IPC.GET_ALL_PHOTOS, async (): Promise<PhotoFile[]> => {
    const photos = store.getAllPhotos().map(photo => {
      const displayUrl = getDisplayUrl(photo.thumbnailPath, photo.filePath, photo.fileFormat, store.getLibraryPath());
      // Log if filePath looks like a thumbnail (data integrity issue)
      if (photo.filePath && (photo.filePath.includes('/thumbnails/') || photo.filePath.endsWith('_thumb.jpg'))) {
        logger.module('ipc').warn('GET_ALL_PHOTOS: filePath points to thumbnail', { id: photo.id, filePath: photo.filePath, resolved: displayUrl });
      }
      // Log suspiciously small dimensions
      if (photo.width > 0 && photo.height > 0 && (photo.width < 500 || photo.height < 500)) {
        logger.module('ipc').warn('GET_ALL_PHOTOS: suspiciously small dimensions', { id: photo.id, width: photo.width, height: photo.height, fileName: photo.fileName });
      }
      return { ...photo, displayUrl };
    });
    logger.module('ipc').debug('GET_ALL_PHOTOS', { count: photos.length });
    return photos;
  });

  ipcMain.handle(IPC.GET_PHOTO, async (_, id: string): Promise<PhotoFile | null> => {
    const photo = store.getPhoto(id);
    if (!photo) return null;
    return {
      ...photo,
      displayUrl: getDisplayUrl(photo.thumbnailPath, photo.filePath, photo.fileFormat, store.getLibraryPath()),
    };
  });

  ipcMain.handle(IPC.GET_PHOTO_THUMBNAIL, async (_, id: string): Promise<string | null> => {
    const photo = store.getPhoto(id);
    if (!photo) return null;
    return getDisplayUrl(photo.thumbnailPath, photo.filePath, photo.fileFormat, store.getLibraryPath());
  });

  ipcMain.handle(IPC.GET_PHOTO_FULL, async (_, id: string): Promise<string | null> => {
    const photo = store.getPhoto(id);
    if (!photo) return null;

    const log = logger.module('ipc');
    const originalsDir = path.join(store.getLibraryPath(), 'originals');
    const looksLikeThumbnail = (p: string): boolean => {
      const normalized = p.replace(/\\/g, '/');
      return normalized.includes('/thumbnails/') || p.endsWith('_thumb.jpg');
    };

    let sourcePath = photo.filePath;
    if (looksLikeThumbnail(photo.filePath) || !fs.existsSync(photo.filePath)) {
      log.warn('GET_PHOTO_FULL: filePath is thumbnail or missing, resolving', { id, filePath: photo.filePath });
      const altPath = path.join(originalsDir, photo.fileName);
      if (fs.existsSync(altPath)) {
        sourcePath = altPath;
        log.info('GET_PHOTO_FULL: resolved to originals/', { id, sourcePath });
      }
    }

    const result = isRawFile(sourcePath)
      ? `photoforge://raw/${encodeURIComponent(sourcePath)}`
      : `file://${sourcePath}`;
    log.debug('GET_PHOTO_FULL', { id, sourcePath, isRaw: isRawFile(sourcePath), result });
    return result;
  });

  // Preview-size image for grid views (800px for RAW, original for non-RAW)
  ipcMain.handle(IPC.GET_PHOTO_PREVIEW, async (_, id: string): Promise<string | null> => {
    const photo = store.getPhoto(id);
    if (!photo) return null;

    // If thumbnail exists and is valid, use it (fastest)
    if (photo.thumbnailPath && fs.existsSync(photo.thumbnailPath) && fs.statSync(photo.thumbnailPath).size > 0) {
      return `file://${photo.thumbnailPath}`;
    }

    const originalsDir = path.join(store.getLibraryPath(), 'originals');
    const looksLikeThumbnail = (p: string): boolean => {
      const normalized = p.replace(/\\/g, '/');
      return normalized.includes('/thumbnails/') || p.endsWith('_thumb.jpg');
    };

    let sourcePath = photo.filePath;
    if (looksLikeThumbnail(photo.filePath) || !fs.existsSync(photo.filePath)) {
      const altPath = path.join(originalsDir, photo.fileName);
      if (fs.existsSync(altPath)) sourcePath = altPath;
    }

    // RAW files: use photoforge://raw/800/ for 800px preview (much faster than 4000px)
    if (isRawFile(sourcePath)) {
      return `photoforge://raw/800/${encodeURIComponent(sourcePath)}`;
    }

    // Non-RAW: serve original directly (browsers handle it efficiently)
    if (fs.existsSync(sourcePath)) {
      return `file://${sourcePath}`;
    }

    // Fallback
    return photo.displayUrl || photo.thumbnailPath || null;
  });

  ipcMain.handle(IPC.DELETE_PHOTOS, async (_, ids: string[]): Promise<number> => {
    let deleted = 0;
    if (ids.length === 0) return 0;
    for (const id of ids) {
      if (await store.deletePhoto(id)) deleted++;
    }
    return deleted;
  });


  // On-demand thumbnail generation for a single photo
  // Called when user enters edit page — ensures the thumbnail exists on disk
  ipcMain.handle(IPC.GENERATE_THUMBNAIL, async (_, id: string): Promise<string | null> => {
    const log = logger.module('ipc');
    const photo = store.getPhoto(id);
    if (!photo) return null;
    if (!fs.existsSync(photo.filePath)) return null;

    const libraryPath = store.getLibraryPath();
    const thumbnailsDir = path.join(libraryPath, 'thumbnails');
    if (!fs.existsSync(thumbnailsDir)) fs.mkdirSync(thumbnailsDir, { recursive: true });

    const baseName = path.basename(photo.fileName, path.extname(photo.fileName));
    let thumbPath = path.join(thumbnailsDir, `${baseName}_thumb.jpg`);

    // If thumbnail already exists on disk, return it immediately (cache hit)
    if (fs.existsSync(thumbPath) && fs.statSync(thumbPath).size > 0) {
      return `file://${thumbPath}`;
    }

    // Generate thumbnail (cache miss)
    log.info('Generating thumbnail on-demand', { id, fileName: photo.fileName });
    try {
      if (isRawFile(photo.filePath)) {
        const convertedDir = path.join(libraryPath, 'converted');
        if (!fs.existsSync(convertedDir)) fs.mkdirSync(convertedDir, { recursive: true });
        await getConvertedJpegPath(photo.filePath, convertedDir, 400);
        const convertedName = `${baseName}_400.jpg`;
        const convertedPath = path.join(convertedDir, convertedName);
        if (fs.existsSync(convertedPath)) {
          fs.copyFileSync(convertedPath, thumbPath);
        } else {
          const { execFileAsync } = require('child_process');
          const { promisify } = require('util');
          await promisify(execFileAsync)('sips', [
            '--setProperty', 'format', 'jpeg',
            '--resampleWidth', '400',
            '--out', thumbPath, photo.filePath,
          ], { timeout: 30000 });
        }
      } else {
        const sharp = require('sharp');
        await sharp(photo.filePath, { failOn: 'none' })
          .rotate()
          .resize(400, 400, { fit: 'inside', withoutEnlargement: true })
          .jpeg({ quality: 85 })
          .toFile(thumbPath);
      }

      if (fs.existsSync(thumbPath) && fs.statSync(thumbPath).size > 0) {
        // Persist thumbnail path to store so future loads benefit from cache
        store.updatePhoto(id, { thumbnailPath: thumbPath } as any);
        store.save();
        log.info('Thumbnail generated', { id, thumbPath });
        return `file://${thumbPath}`;
      }
    } catch (err: any) {
      log.warn('On-demand thumbnail generation failed', { id, error: err.message });
    }

    // Fallback: return the photoforge:// raw URL as last resort
    return `photoforge://raw/800/${encodeURIComponent(photo.filePath)}`;
  });

  ipcMain.handle(IPC.UPDATE_PHOTO_META, async (_, id: string, updates: Partial<PhotoFile>): Promise<boolean> => {
    const safeUpdates = { ...updates };
    delete (safeUpdates as any).thumbnailPath;
    return store.updatePhoto(id, safeUpdates);
  });

  // Transform (crop/flip/rotate)
  ipcMain.handle(IPC.TRANSFORM_PHOTO, async (_, id: string, transforms: {
    cropRegion?: PhotoFile['cropRegion'];
    flipH?: boolean;
    flipV?: boolean;
    rotation?: number;
  }): Promise<boolean> => {
    return store.updatePhoto(id, transforms);
  });

  // Presets
  ipcMain.handle(IPC.GET_PRESETS, async (): Promise<Preset[]> => {
    return presetManager.getAll();
  });

  ipcMain.handle(IPC.APPLY_PRESET, async (_, photoId: string, presetId: string): Promise<boolean> => {
    const preset = presetManager.getById(presetId);
    if (!preset) return false;
    return store.updatePhoto(photoId, { presetApplied: presetId });
  });

  ipcMain.handle(IPC.REMOVE_PRESET, async (_, photoId: string): Promise<boolean> => {
    return store.updatePhoto(photoId, { presetApplied: null, customAdjustments: null });
  });

  ipcMain.handle(IPC.CREATE_PRESET, async (_, preset: Preset): Promise<boolean> => {
    return presetManager.create(preset);
  });

  ipcMain.handle(IPC.DELETE_PRESET, async (_, presetId: string): Promise<boolean> => {
    return presetManager.delete(presetId);
  });

  // Import preset files
  ipcMain.handle(IPC.IMPORT_PRESET_FILE, async (_, filePath: string): Promise<{ imported: number; errors: string[]; presets: Preset[]; skipped: number }> => {
    return presetManager.importPresetFile(filePath);
  });

  ipcMain.handle(IPC.RENAME_PRESET, async (_, presetId: string, newName: string): Promise<boolean> => {
    return presetManager.rename(presetId, newName);
  });

  ipcMain.handle(IPC.EXPORT_PRESET_TO_FILE, async (_, presetId: string, outputPath: string): Promise<boolean> => {
    return presetManager.exportToFile(presetId, outputPath);
  });

  // Dialogs
  ipcMain.handle(IPC.OPEN_DIALOG, async (_, opts: Electron.OpenDialogOptions) => {
    return dialog.showOpenDialog(mainWindow!, opts);
  });

  ipcMain.handle(IPC.SAVE_DIALOG, async (_, opts: Electron.SaveDialogOptions) => {
    return dialog.showSaveDialog(mainWindow!, opts);
  });

  // Export — now syncs maxProcessMemory before each export
  ipcMain.handle(IPC.EXPORT_PHOTO, async (_, photoId: string, outputPath: string) => {
    exportManager.setMaxMemory(store.getSettings().maxProcessMemory);
    return exportManager.exportSingle(photoId, outputPath);
  });

  ipcMain.handle(IPC.EXPORT_PHOTO_ADVANCED, async (_, photoId: string, options: ExportOptions) => {
    exportManager.setMaxMemory(store.getSettings().maxProcessMemory);
    return exportManager.exportAdvanced(options);
  });

  ipcMain.handle(IPC.EXPORT_BATCH, async (_, photoIds: string[], outputDir: string, namingTemplate?: string) => {
    exportManager.setMaxMemory(store.getSettings().maxProcessMemory);
    return exportManager.exportBatch(photoIds, outputDir, namingTemplate);
  });

  // Library info
  ipcMain.handle(IPC.GET_LIBRARY_PATH, async () => {
    return store.getLibraryPath();
  });

  ipcMain.handle(IPC.GET_STORAGE_STATS, async () => {
    return store.getStorageStats();
  });

  // Shell
  ipcMain.handle(IPC.OPEN_EXTERNAL, async (_, url: string): Promise<boolean> => {
    // Use macOS 'open' command instead of Electron's shell.openExternal
    // because ad-hoc signed apps on macOS 15+ may have URL-opening restricted.
    const { execFileSync } = require('child_process');
    try {
      execFileSync('open', [url], { stdio: 'ignore', timeout: 10000 });
      return true;
    } catch (e: any) {
      logger.module('main').error('openExternal failed', { url, error: e.message });
      return false;
    }
  });

  // Settings — update exportManager when maxProcessMemory changes
  ipcMain.handle(IPC.GET_SETTINGS, async (): Promise<AppSettings> => {
    return store.getSettings();
  });

  ipcMain.handle(IPC.UPDATE_SETTINGS, async (_, updates: Partial<AppSettings>): Promise<AppSettings> => {
    const result = store.updateSettings(updates);
    // Sync critical settings to subsystems
    if (updates.maxProcessMemory) {
      exportManager.setMaxMemory(updates.maxProcessMemory);
    }
    // If libraryPath changed, notify user that restart is needed
    if (updates.libraryPath && mainWindow) {
      mainWindow.webContents.send('restart-required', updates.libraryPath);
    }
    return result;
  });

  // Check missing referenced files — explicit check from renderer
  ipcMain.handle(IPC.MISSING_REFERENCES_CHECK, async () => {
    return store.getMissingReferences();
  });

  ipcMain.handle(IPC.WINDOW_MINIMIZE, (event) => {
    const target = BrowserWindow.fromWebContents(event.sender);
    if (!target) return false;
    target.minimize();
    return true;
  });

  ipcMain.handle(IPC.WINDOW_TOGGLE_MAXIMIZE, (event) => {
    const target = BrowserWindow.fromWebContents(event.sender);
    if (!target) return false;
    if (target.isMaximized()) target.unmaximize();
    else target.maximize();
    return true;
  });

  ipcMain.handle(IPC.WINDOW_CLOSE, (event) => {
    const target = BrowserWindow.fromWebContents(event.sender);
    if (!target) return false;
    target.close();
    return true;
  });

  // ===== Uninstall =====
  ipcMain.handle(IPC.APP_UNINSTALL, async (): Promise<{ success: boolean; cancelled?: boolean }> => {
    const libPath = store.getLibraryPath();
    const supportPath = path.join(app.getPath('appData'), 'PhotoForge');

    const result = await dialog.showMessageBox(mainWindow!, {
      type: 'warning',
      message: '卸载 PhotoForge',
      detail: '仅删除应用：应用本身会被移除，照片库和相关数据保留。\n删除管理文件：照片库中的副本数据和配置会被删除，引用模式的原文件不受影响。',
      buttons: [
        '仅删除应用',
        '删除应用及管理文件',
        '取消',
      ],
      defaultId: 2,
      cancelId: 2,
    });

    if (result.response === 2) return { success: false, cancelled: true };
    const removeData = result.response === 1;

    if (removeData) {
      // Delete library directory — this removes copy-mode originals + metadata
      // Referenced originals live outside library path, so they're safe
      logger.module('main').info('Uninstall: removing library', { libPath });
      try { fs.rmSync(libPath, { recursive: true, force: true }); } catch (e: any) {
        logger.module('main').warn('Uninstall: failed to remove library', { error: e.message });
      }
      // Delete Application Support
      logger.module('main').info('Uninstall: removing support dir', { supportPath });
      try { fs.rmSync(supportPath, { recursive: true, force: true }); } catch (e: any) {
        logger.module('main').warn('Uninstall: failed to remove support dir', { error: e.message });
      }
    }

        // Move .app to Trash via Finder (one-line osascript, no saved script)
    const { execSync } = require('child_process');
    // Resolve .app bundle path from executable path
    let appBundle = process.execPath;
    while (appBundle && path.extname(appBundle) !== '.app') {
      const parent = path.dirname(appBundle);
      if (parent === appBundle) break;
      appBundle = parent;
    }
    if (path.extname(appBundle) === '.app') {
      try {
        const cmd = 'osascript -e ' + JSON.stringify('tell application "Finder" to delete POSIX file "' + appBundle + '"');
        execSync(cmd + ' 2>/dev/null || true', { stdio: 'ignore', timeout: 10000 });
      } catch {}
    }
    // Quit
    setImmediate(() => app.quit());
    return { success: true };
  });

  // ===== Collections =====
  ipcMain.handle(IPC.GET_COLLECTIONS, async () => {
    return store.getAllCollections();
  });

  ipcMain.handle(IPC.CREATE_COLLECTION, async (_, name: string, description: string, isSmart: boolean, smartCriteria?: FilterCriteria) => {
    return store.createCollection(name, description, isSmart, smartCriteria);
  });

  ipcMain.handle(IPC.DELETE_COLLECTION, async (_, id: string) => {
    return store.deleteCollection(id);
  });

  ipcMain.handle(IPC.ADD_TO_COLLECTION, async (_, collectionId: string, photoIds: string[]) => {
    return store.addToCollection(collectionId, photoIds);
  });

  ipcMain.handle(IPC.REMOVE_FROM_COLLECTION, async (_, collectionId: string, photoIds: string[]) => {
    return store.removeFromCollection(collectionId, photoIds);
  });

  // Collection update (rename / edit description)
  ipcMain.handle(IPC.COLLECTION_UPDATE, async (_, collectionId: string, updates: { name?: string; description?: string }) => {
    return store.updateCollection(collectionId, updates);
  });

  // Recent Imports
  ipcMain.handle(IPC.IMPORT_GET_RECENT, async (): Promise<ImportBatch[]> => {
    return store.getRecentImports();
  });

  ipcMain.handle(IPC.IMPORT_GET_BATCH_PHOTOS, async (_, batchId: string): Promise<PhotoFile[]> => {
    const photos = store.getImportBatchPhotos(batchId);
    return photos.map(photo => ({
      ...photo,
      displayUrl: getDisplayUrl(photo.thumbnailPath, photo.filePath, photo.fileFormat, store.getLibraryPath()),
    }));
  });

  // Open folder in Finder after export
  ipcMain.handle(IPC.SHELL_OPEN_FOLDER, async (_, folderPath: string) => {
    shell.showItemInFolder(folderPath);
  });

  // ===== Logging =====
  ipcMain.handle(IPC.LOG_WRITE, async (_, level: string, module: string, msg: string, data?: any) => {
    logger.log(level as any, module, msg, data);
  });

  ipcMain.handle(IPC.LOG_READ, async (_, date?: string, filter?: { level?: string; module?: string; search?: string }, limit?: number) => {
    return logger.readLogs(date, filter as any, limit);
  });

  ipcMain.handle(IPC.LOG_DATES, async () => {
    return logger.getLogDates();
  });

  ipcMain.handle(IPC.LOG_CLEAR, async () => {
    logger.clearLogs();
    return true;
  });

  ipcMain.handle(IPC.LOG_DIR, async () => {
    return logger.getLogDir();
  });
  /**
   * photo:getImageData — Load full-resolution image data for caching.
   * Returns base64-encoded image data so the renderer can create blob URLs.
   */
  // ---------- Main-process LRU cache for GET_IMAGE_DATA ----------
  // Stores recently read base64 image data to avoid re-reading files from disk
  const IMAGE_DATA_CACHE_MAX = 8;
  const imageDataCacheKeys: string[] = [];
  const imageDataCache = new Map<string, { data: string; mime: string }>();

  function getImageDataCached(key: string): { data: string; mime: string } | undefined {
    const val = imageDataCache.get(key);
    if (val) {
      // Touch LRU order
      const idx = imageDataCacheKeys.indexOf(key);
      if (idx >= 0) {
        imageDataCacheKeys.splice(idx, 1);
        imageDataCacheKeys.push(key);
      }
    }
    return val;
  }

  function setImageDataCache(key: string, value: { data: string; mime: string }): void {
    if (imageDataCache.has(key)) {
      const idx = imageDataCacheKeys.indexOf(key);
      if (idx >= 0) {
        imageDataCacheKeys.splice(idx, 1);
        imageDataCacheKeys.push(key);
      }
      return;
    }
    while (imageDataCacheKeys.length >= IMAGE_DATA_CACHE_MAX) {
      const oldest = imageDataCacheKeys.shift();
      if (oldest) {
        imageDataCache.delete(oldest);
      }
    }
    imageDataCache.set(key, value);
    imageDataCacheKeys.push(key);
  }

  ipcMain.handle(IPC.GET_IMAGE_DATA, async (_, photoId: string, maxWidth?: number): Promise<{ data: string; mime: string } | null> => {
    const log = logger.module('ipc');
    const photo = store.getPhoto(photoId);
    if (!photo) {
      log.warn('GET_IMAGE_DATA: photo not found', { photoId });
      return null;
    }

    const libraryPath = store.getLibraryPath();

    // Resolve source file path (same logic as getDisplayUrl but returns file path directly)
    let sourcePath = photo.filePath;
    const originalsDir = path.join(libraryPath, 'originals');
    const looksLikeThumbnailPath = (p: string): boolean => {
      const normalized = p.replace(/\\/g, '/');
      return normalized.includes('/thumbnails/') || p.endsWith('_thumb.jpg');
    };

    if (looksLikeThumbnailPath(sourcePath) || !fs.existsSync(sourcePath)) {
      const altPath = path.join(originalsDir, path.basename(sourcePath));
      if (fs.existsSync(altPath)) sourcePath = altPath;
    }

    let filePath: string | null = null;
    const w = maxWidth || 4000;

    if (isRawFile(sourcePath)) {
      const convertedDir = path.join(libraryPath, 'converted');
      filePath = await getConvertedJpegPath(sourcePath, convertedDir, w);
    } else if (fs.existsSync(sourcePath)) {
      filePath = sourcePath;
    }

    // Fallback: try thumbnail
    if (!filePath && photo.thumbnailPath && fs.existsSync(photo.thumbnailPath)) {
      filePath = photo.thumbnailPath;
    }

    if (!filePath || !fs.existsSync(filePath)) {
      log.warn('GET_IMAGE_DATA: file not found', { photoId, sourcePath, filePath });
      return null;
    }

    // Check main-process cache (avoids re-reading the file from disk)
    const cacheKey = photoId + '|' + (filePath || '') + '|' + (maxWidth || '');
    const cached = getImageDataCached(cacheKey);
    if (cached) return cached;

    const ext = path.extname(filePath).toLowerCase();
    const mimeMap: Record<string, string> = {
      '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
      '.gif': 'image/gif', '.bmp': 'image/bmp', '.webp': 'image/webp',
      '.tiff': 'image/tiff', '.tif': 'image/tiff',
    };
    const mime = mimeMap[ext] || 'image/jpeg';

    const dataBuffer = fs.readFileSync(filePath);
    const result = { data: dataBuffer.toString('base64'), mime };
    setImageDataCache(cacheKey, result);
    return result;
  });

}

function getDisplayUrl(
  thumbnailPath: string | null,
  originalPath: string,
  fileFormat: string,
  libraryPath: string,
): string {
  // Helper: detect if a path points to a thumbnail file rather than the original
  const looksLikeThumbnail = (p: string): boolean => {
    const normalized = p.replace(/\\/g, '/');
    return normalized.includes('/thumbnails/') || p.endsWith('_thumb.jpg');
  };

  // Resolve the real source path — originalPath may actually point to a thumbnail
  // (this happens with old data where filePath was incorrectly stored)
  let resolvedPath = originalPath;
  const originalsDir = path.join(libraryPath, 'originals');

  if (looksLikeThumbnail(originalPath) || !fs.existsSync(originalPath)) {
    // Try to find the original file in the originals/ directory
    const fileName = path.basename(originalPath);
    const altPath = path.join(originalsDir, fileName);
    if (fs.existsSync(altPath)) {
      resolvedPath = altPath;
    }
  }

  // === RAW files: prefer photoforge:// protocol (converts at high resolution) ===
  // This is better than the 400px thumbnail
  if (isRawFile(resolvedPath)) {
    return `photoforge://raw/${encodeURIComponent(resolvedPath)}`;
  }

  // === Non-RAW: serve the original file directly ===
  // Browsers can natively render JPEG/PNG/WebP/HEIC at full resolution
  if (fs.existsSync(resolvedPath)) {
    return `file://${resolvedPath}`;
  }

  // === Fallback: use thumbnail if original is not available ===
  if (thumbnailPath && fs.existsSync(thumbnailPath) && fs.statSync(thumbnailPath).size > 0) {
    return `file://${thumbnailPath}`;
  }

  // === Last resort: try the original path anyway ===
  if (fs.existsSync(originalPath)) {
    return `file://${originalPath}`;
  }

  // === Nothing works: return whatever we have ===
  return thumbnailPath || originalPath;
}
