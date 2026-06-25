export {};

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
      exportPhotoAdvanced: (photoId: string, options: any) => Promise<boolean>;
      exportBatch: (photoIds: string[], outputDir: string, namingTemplate?: string) => Promise<any>;
      getLibraryPath: () => Promise<string>;
      getStorageStats: () => Promise<any>;
      openExternal: (url: string) => Promise<void>;
      getSettings: () => Promise<any>;
      updateSettings: (updates: any) => Promise<any>;
      checkMissingReferences: () => Promise<Array<{ id: string; fileName: string; filePath: string }>>;
      onMissingReferences: (callback: (missing: Array<{ id: string; fileName: string; filePath: string }>) => void) => () => void;
      onRestartRequired: (callback: (newPath: string) => void) => () => void;
      getCollections: () => Promise<any[]>;
      createCollection: (name: string, description: string, isSmart: boolean, smartCriteria?: any) => Promise<any>;
      deleteCollection: (id: string) => Promise<boolean>;
      addToCollection: (collectionId: string, photoIds: string[]) => Promise<boolean>;
      removeFromCollection: (collectionId: string, photoIds: string[]) => Promise<boolean>;
      updateCollection: (collectionId: string, updates: { name?: string; description?: string }) => Promise<boolean>;
      getRecentImports: () => Promise<import('../../shared/types').ImportBatch[]>;
      getImportBatchPhotos: (batchId: string) => Promise<any[]>;
      openFolder: (filePath: string) => Promise<void>;
      windowMinimize: () => Promise<boolean>;
      windowToggleMaximize: () => Promise<boolean>;
      windowClose: () => Promise<boolean>;
      logWrite: (level: string, module: string, msg: string, data?: any) => Promise<void>;
      logRead: (date?: string, filter?: { level?: string; module?: string; search?: string }, limit?: number) => Promise<any[]>;
      logDates: () => Promise<string[]>;
      logClear: () => Promise<boolean>;
      logDir: () => Promise<string>;
    };
  }
}
