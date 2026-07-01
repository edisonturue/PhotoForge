import { contextBridge, ipcRenderer } from 'electron';
import { IPC, AppSettings, ExportOptions, ImportBatch } from '../shared/types';

contextBridge.exposeInMainWorld('photoForge', {
  // Import
  importFiles: (options: any) => ipcRenderer.invoke(IPC.IMPORT_FILES, options),
  cancelImport: () => ipcRenderer.invoke(IPC.IMPORT_CANCEL),
  onImportProgress: (callback: (progress: any) => void) => {
    const handler = (_: any, progress: any) => callback(progress);
    ipcRenderer.on(IPC.IMPORT_PROGRESS, handler);
    return () => ipcRenderer.removeListener(IPC.IMPORT_PROGRESS, handler);
  },

  // Photos
  getAllPhotos: () => ipcRenderer.invoke(IPC.GET_ALL_PHOTOS),
  getPhoto: (id: string) => ipcRenderer.invoke(IPC.GET_PHOTO, id),
  getPhotoThumbnail: (id: string) => ipcRenderer.invoke(IPC.GET_PHOTO_THUMBNAIL, id),
  getPhotoFull: (id: string) => ipcRenderer.invoke(IPC.GET_PHOTO_FULL, id),
  getPhotoPreview: (id: string) => ipcRenderer.invoke(IPC.GET_PHOTO_PREVIEW, id),
  generateThumbnail: (id: string) => ipcRenderer.invoke(IPC.GENERATE_THUMBNAIL, id),
  getImageData: (id: string, maxWidth?: number) => ipcRenderer.invoke(IPC.GET_IMAGE_DATA, id, maxWidth),
  deletePhotos: (ids: string[]) => ipcRenderer.invoke(IPC.DELETE_PHOTOS, ids),
  updatePhotoMeta: (id: string, updates: any) => ipcRenderer.invoke(IPC.UPDATE_PHOTO_META, id, updates),
  transformPhoto: (id: string, transforms: any) => ipcRenderer.invoke(IPC.TRANSFORM_PHOTO, id, transforms),

  // Presets
  getPresets: () => ipcRenderer.invoke(IPC.GET_PRESETS),
  applyPreset: (photoId: string, presetId: string) => ipcRenderer.invoke(IPC.APPLY_PRESET, photoId, presetId),
  removePreset: (photoId: string) => ipcRenderer.invoke(IPC.REMOVE_PRESET, photoId),
  createPreset: (preset: any) => ipcRenderer.invoke(IPC.CREATE_PRESET, preset),
  deletePreset: (presetId: string) => ipcRenderer.invoke(IPC.DELETE_PRESET, presetId),
  importPresetFile: (filePath: string) => ipcRenderer.invoke(IPC.IMPORT_PRESET_FILE, filePath),
  renamePreset: (presetId: string, newName: string) => ipcRenderer.invoke(IPC.RENAME_PRESET, presetId, newName),
  exportPresetToFile: (presetId: string, outputPath: string) => ipcRenderer.invoke(IPC.EXPORT_PRESET_TO_FILE, presetId, outputPath),

  // Dialogs
  openFileDialog: (opts: any) => ipcRenderer.invoke(IPC.OPEN_DIALOG, opts),
  saveFileDialog: (opts: any) => ipcRenderer.invoke(IPC.SAVE_DIALOG, opts),

  // Export
  exportPhoto: (photoId: string, outputPath: string) => ipcRenderer.invoke(IPC.EXPORT_PHOTO, photoId, outputPath),
  exportPhotoAdvanced: (photoId: string, options: ExportOptions) => ipcRenderer.invoke(IPC.EXPORT_PHOTO_ADVANCED, photoId, options),
  exportBatch: (photoIds: string[], outputDir: string, namingTemplate?: string) => ipcRenderer.invoke(IPC.EXPORT_BATCH, photoIds, outputDir, namingTemplate),

  // Library
  getLibraryPath: () => ipcRenderer.invoke(IPC.GET_LIBRARY_PATH),
  getStorageStats: () => ipcRenderer.invoke(IPC.GET_STORAGE_STATS),

  // Shell
  openExternal: (url: string) => ipcRenderer.invoke(IPC.OPEN_EXTERNAL, url),

  // Settings
  getSettings: () => ipcRenderer.invoke(IPC.GET_SETTINGS),
  updateSettings: (updates: Partial<AppSettings>) => ipcRenderer.invoke(IPC.UPDATE_SETTINGS, updates),

  // Collections
  getCollections: () => ipcRenderer.invoke(IPC.GET_COLLECTIONS),
  createCollection: (name: string, description: string, isSmart: boolean, smartCriteria?: any) => ipcRenderer.invoke(IPC.CREATE_COLLECTION, name, description, isSmart, smartCriteria),
  deleteCollection: (id: string) => ipcRenderer.invoke(IPC.DELETE_COLLECTION, id),
  addToCollection: (collectionId: string, photoIds: string[]) => ipcRenderer.invoke(IPC.ADD_TO_COLLECTION, collectionId, photoIds),
  removeFromCollection: (collectionId: string, photoIds: string[]) => ipcRenderer.invoke(IPC.REMOVE_FROM_COLLECTION, collectionId, photoIds),
  updateCollection: (collectionId: string, updates: { name?: string; description?: string }) => ipcRenderer.invoke(IPC.COLLECTION_UPDATE, collectionId, updates),

  // Batch preset operations
  batchDeletePresets: (presetIds: string[]) => ipcRenderer.invoke(IPC.BATCH_DELETE_PRESETS, presetIds),

  // Recent imports
  getRecentImports: () => ipcRenderer.invoke(IPC.IMPORT_GET_RECENT),
  getImportBatchPhotos: (batchId: string) => ipcRenderer.invoke(IPC.IMPORT_GET_BATCH_PHOTOS, batchId),

  // Shell - open folder in Finder
  openFolder: (folderPath: string) => ipcRenderer.invoke(IPC.SHELL_OPEN_FOLDER, folderPath),
  windowMinimize: () => ipcRenderer.invoke(IPC.WINDOW_MINIMIZE),
  windowToggleMaximize: () => ipcRenderer.invoke(IPC.WINDOW_TOGGLE_MAXIMIZE),
  windowClose: () => ipcRenderer.invoke(IPC.WINDOW_CLOSE),

  // Missing references check
  checkMissingReferences: () => ipcRenderer.invoke(IPC.MISSING_REFERENCES_CHECK),

  // Logging
  logWrite: (level: string, module: string, msg: string, data?: any) => ipcRenderer.invoke(IPC.LOG_WRITE, level, module, msg, data),
  logRead: (date?: string, filter?: { level?: string; module?: string; search?: string }, limit?: number) => ipcRenderer.invoke(IPC.LOG_READ, date, filter, limit),
  logDates: () => ipcRenderer.invoke(IPC.LOG_DATES),
  logClear: () => ipcRenderer.invoke(IPC.LOG_CLEAR),
  logDir: () => ipcRenderer.invoke(IPC.LOG_DIR),

  // Listen for missing references notification from main
  onMissingReferences: (callback: (missing: Array<{ id: string; fileName: string; filePath: string }>) => void) => {
    const handler = (_: any, data: any) => callback(data);
    ipcRenderer.on('missing-references', handler);
    return () => ipcRenderer.removeListener('missing-references', handler);
  },

  // Listen for restart-required notification
  onRestartRequired: (callback: (newPath: string) => void) => {
    const handler = (_: any, data: any) => callback(data);
    ipcRenderer.on('restart-required', handler);
    return () => ipcRenderer.removeListener('restart-required', handler);
  },
});

declare global {
  interface Window {
    photoForge: {
      importFiles: (options: any) => Promise<any>;
      cancelImport: () => Promise<boolean>;
      onImportProgress: (callback: (progress: any) => void) => () => void;
      getAllPhotos: () => Promise<any[]>;
      getPhoto: (id: string) => Promise<any>;
      getPhotoThumbnail: (id: string) => Promise<string | null>;
      getPhotoFull: (id: string) => Promise<string | null>;
      getPhotoPreview: (id: string) => Promise<string | null>;
      generateThumbnail: (id: string) => Promise<string | null>;
      getImageData: (id: string, maxWidth?: number) => Promise<{ data: string; mime: string } | null>;
      deletePhotos: (ids: string[]) => Promise<number>;
      updatePhotoMeta: (id: string, updates: any) => Promise<boolean>;
      transformPhoto: (id: string, transforms: any) => Promise<boolean>;
      getPresets: () => Promise<any[]>;
      applyPreset: (photoId: string, presetId: string) => Promise<boolean>;
      removePreset: (photoId: string) => Promise<boolean>;
      createPreset: (preset: any) => Promise<boolean>;
      deletePreset: (presetId: string) => Promise<boolean>;
      importPresetFile: (filePath: string) => Promise<{ imported: number; errors: string[]; presets: any[]; skipped: number }>;
      renamePreset: (presetId: string, newName: string) => Promise<boolean>;
      exportPresetToFile: (presetId: string, outputPath: string) => Promise<boolean>;
      openFileDialog: (opts: any) => Promise<any>;
      saveFileDialog: (opts: any) => Promise<any>;
      exportPhoto: (photoId: string, outputPath: string) => Promise<boolean>;
      exportPhotoAdvanced: (photoId: string, options: ExportOptions) => Promise<boolean>;
      exportBatch: (photoIds: string[], outputDir: string, namingTemplate?: string) => Promise<any>;
      getLibraryPath: () => Promise<string>;
      getStorageStats: () => Promise<any>;
      openExternal: (url: string) => Promise<void>;
      getSettings: () => Promise<AppSettings>;
      updateSettings: (updates: Partial<AppSettings>) => Promise<AppSettings>;
      checkMissingReferences: () => Promise<Array<{ id: string; fileName: string; filePath: string }>>;
      getCollections: () => Promise<any[]>;
      createCollection: (name: string, description: string, isSmart: boolean, smartCriteria?: any) => Promise<any>;
      deleteCollection: (id: string) => Promise<boolean>;
      addToCollection: (collectionId: string, photoIds: string[]) => Promise<boolean>;
      removeFromCollection: (collectionId: string, photoIds: string[]) => Promise<boolean>;
      openFolder: (folderPath: string) => Promise<void>;
      windowMinimize: () => Promise<boolean>;
      windowToggleMaximize: () => Promise<boolean>;
      windowClose: () => Promise<boolean>;
      onMissingReferences: (callback: (missing: Array<{ id: string; fileName: string; filePath: string }>) => void) => () => void;
      onRestartRequired: (callback: (newPath: string) => void) => () => void;
      logWrite: (level: string, module: string, msg: string, data?: any) => Promise<void>;
      logRead: (date?: string, filter?: { level?: string; module?: string; search?: string }, limit?: number) => Promise<any[]>;
      logDates: () => Promise<string[]>;
      logClear: () => Promise<boolean>;
      logDir: () => Promise<string>;
      // Collection update
      updateCollection: (collectionId: string, updates: { name?: string; description?: string }) => Promise<boolean>;
      // Batch preset operations
      batchDeletePresets: (presetIds: string[]) => Promise<{ deleted: number; total: number }>;
      // Recent imports
      getRecentImports: () => Promise<any[]>;
      getImportBatchPhotos: (batchId: string) => Promise<any[]>;
    };
  }
}
