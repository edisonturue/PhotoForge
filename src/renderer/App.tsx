import React, { useState, useEffect, useLayoutEffect, useCallback, useMemo } from 'react';
import { PhotoFile, FilterCriteria, SortCriteria, Preset, ImportProgress, AppSettings, DEFAULT_SETTINGS, ImportBatch, Collection } from '../shared/types';
import { Sidebar, SIDEBAR_WIDTH } from './components/Sidebar';
import { PhotoGrid } from './components/PhotoGrid';
import { PhotoDetail } from './components/PhotoDetail';
import { ImportModal } from './components/ImportModal';
import { PresetPanel } from './components/PresetPanel';
import { CompareView } from './components/CompareView';
import { StatusBar } from './components/StatusBar';
import { SettingsView } from './components/SettingsView';
import { StatisticsView } from './components/StatisticsView';
import { SmartAlbumView } from './components/SmartAlbumView';
import { DateGroupView } from './components/DateGroupView';
import { SearchBar } from './components/SearchBar';
import { Toast, useToast } from './components/Toast';
import { ConfirmDialog } from './components/ConfirmDialog';
import { AppIcon } from './components/AppIcon';
import { usePhotos } from './hooks/usePhotos';
import { usePresets } from './hooks/usePresets';
import { useHistory, createUpdateEntry, createBatchEntry } from './hooks/useHistory';
import { getTheme, Theme, SPACING, RADIUS, SHADOW, TYPO, DURATION, EASING, TRANSITION } from './styles/theme';
import { KEYFRAMES } from './styles/design-tokens';
import { useI18n } from './i18n';

// ========== Module System ==========
type Module = 'browse' | 'edit' | 'albums' | 'statistics' | 'presets' | 'settings' | 'compare' | 'dategroup';

function injectKeyframes() {
  const style = document.createElement('style');
  style.textContent = Object.values(KEYFRAMES).join('\n');
  document.head.appendChild(style);
}

function injectGlobalChrome(theme: Theme) {
  const id = 'photoforge-global-chrome';
  const css = `
    html, body, #root {
      background: ${theme.bgPhotoStage};
      color: ${theme.textPrimary};
      color-scheme: ${theme.isDark ? 'dark' : 'light'};
    }
    body {
      overflow: hidden;
      overscroll-behavior: none;
    }
    #root {
      overflow: hidden;
      isolation: isolate;
    }
    * {
      scrollbar-width: none;
      -ms-overflow-style: none;
    }
    *::-webkit-scrollbar,
    ::-webkit-scrollbar {
      width: 0;
      height: 0;
      display: none !important;
      background: transparent !important;
    }
    *::-webkit-scrollbar-thumb,
    *::-webkit-scrollbar-track,
    ::-webkit-scrollbar-thumb,
    ::-webkit-scrollbar-track {
      background: transparent !important;
      border: none !important;
      box-shadow: none !important;
    }
    input, textarea, select, button {
      font: inherit;
    }
    select,
    input[type="datetime-local"],
    input[type="date"],
    input[type="time"],
    input[type="text"],
    input[type="search"],
    input[type="number"],
    textarea {
      appearance: none;
      -webkit-appearance: none;
      border: 1px solid ${theme.borderLight};
      background: ${theme.bgInput};
      color: ${theme.textPrimary};
      border-radius: 10px;
      box-shadow: none;
    }
    input[type="number"]::-webkit-inner-spin-button,
    input[type="number"]::-webkit-outer-spin-button {
      -webkit-appearance: none;
      margin: 0;
    }
    select {
      background-image:
        linear-gradient(45deg, transparent 50%, ${theme.textTertiary} 50%),
        linear-gradient(135deg, ${theme.textTertiary} 50%, transparent 50%);
      background-position:
        calc(100% - 16px) calc(50% - 2px),
        calc(100% - 11px) calc(50% - 2px);
      background-size: 5px 5px, 5px 5px;
      background-repeat: no-repeat;
      padding-right: 34px !important;
    }
    input[type="datetime-local"]::-webkit-calendar-picker-indicator,
    input[type="date"]::-webkit-calendar-picker-indicator,
    input[type="time"]::-webkit-calendar-picker-indicator {
      filter: invert(0.8) sepia(0.35) saturate(2.3) hue-rotate(345deg);
      opacity: 0.75;
      cursor: pointer;
    }
    input[type="datetime-local"]::-webkit-datetime-edit,
    input[type="date"]::-webkit-datetime-edit,
    input[type="time"]::-webkit-datetime-edit {
      color: ${theme.textPrimary};
    }
    input[type="checkbox"] {
      appearance: none;
      -webkit-appearance: none;
      width: 16px;
      height: 16px;
      border-radius: 5px;
      border: 1px solid ${theme.border};
      background: ${theme.bgSecondary};
      box-shadow: none;
      display: inline-grid;
      place-items: center;
      margin: 0;
      transition: ${TRANSITION.all};
    }
    input[type="checkbox"]::after {
      content: '';
      width: 8px;
      height: 8px;
      border-radius: 2px;
      background: ${theme.textInverse};
      transform: scale(0);
      transition: transform ${DURATION.fast}ms ${EASING.out};
    }
    input[type="checkbox"]:checked {
      background: ${theme.accent};
      border-color: ${theme.accent};
    }
    input[type="checkbox"]:checked::after {
      transform: scale(1);
    }
    input[type="range"] {
      appearance: none;
      -webkit-appearance: none;
      background: transparent;
      height: 20px;
    }
    input[type="range"]::-webkit-slider-runnable-track {
      height: 6px;
      border-radius: 999px;
      background: ${theme.bgSecondary};
      border: 1px solid ${theme.borderLight};
    }
    input[type="range"]::-webkit-slider-thumb {
      appearance: none;
      -webkit-appearance: none;
      width: 14px;
      height: 14px;
      margin-top: -5px;
      border-radius: 999px;
      background: ${theme.accent};
      border: 2px solid ${theme.bgPhotoStage};
      box-shadow: 0 2px 10px rgba(0,0,0,0.28);
    }
    button:focus-visible,
    input:focus-visible,
    textarea:focus-visible,
    select:focus-visible {
      outline: none;
      box-shadow: ${theme.isDark ? SHADOW.focusDark : SHADOW.focus};
    }
    button {
      border: none;
      background: transparent;
    }
  `;

  let style = document.getElementById(id) as HTMLStyleElement | null;
  if (!style) {
    style = document.createElement('style');
    style.id = id;
    document.head.appendChild(style);
  }
  style.textContent = css;
}

export const App: React.FC = () => {
  const { t, lang, setLang } = useI18n();

  // Module state
  const [activeModule, setActiveModule] = useState<Module>('browse');
  const [activePhotoId, setActivePhotoId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  // Toggle: clicking active nav item returns to browse (except edit)
  const navTo = useCallback((m: Module) => {
    setActiveModule(prev => {
      if (prev === m && m !== 'edit') return 'browse';
      return m;
    });
  }, []);
  const [showImport, setShowImport] = useState(false);
  const [importProgress, setImportProgress] = useState<ImportProgress | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [missingFiles, setMissingFiles] = useState<Array<{ id: string; fileName: string; filePath: string }>>([]);
  const [recentImports, setRecentImports] = useState<ImportBatch[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const { toasts, addToast, dismissToast } = useToast();
  const history = useHistory();
  const theme: Theme = useMemo(() => getTheme(settings.theme), [settings.theme]);
  const dragRegionStyle = { WebkitAppRegion: 'drag' } as React.CSSProperties;
  const noDragRegionStyle = { WebkitAppRegion: 'no-drag' } as React.CSSProperties;

  useEffect(() => { injectKeyframes(); }, []);
  useLayoutEffect(() => { injectGlobalChrome(theme); }, [theme]);

  const [filter, setFilter] = useState<FilterCriteria>({
    search: '', formats: [], dateRange: { start: null, end: null },
    ratingMin: 0, ratingMax: 5, colorLabels: [], tags: [],
    cameraModels: [], onlyFavorites: false, hasPreset: null,
  });
  const [sort, setSort] = useState<SortCriteria>({ field: 'dateTaken', order: 'desc' });

  const { photos, loading, refreshPhotos, updatePhoto, deletePhotos } = usePhotos();
  const { presets, applyPreset, removePreset, createPreset, deletePreset, refreshPresets: loadPresets } = usePresets();

  const activePhoto = photos.find(p => p.id === activePhotoId) || null;

  useEffect(() => {
    (async () => {
      try {
        const s = await window.photoForge.getSettings();
        if (s) { setSettings(s); setLang(s.language); }
      } catch { /* */ }
    })();
    const unsubMissing = window.photoForge.onMissingReferences((m) => { if (m?.length) setMissingFiles(m); });
    return () => { unsubMissing(); };
  }, []);
  const fetchRecentImports = useCallback(async () => {
    try {
      const batches = await window.photoForge.getRecentImports();
      setRecentImports(batches);
    } catch { /* ignore */ }
  }, []);
  useEffect(() => {
    fetchRecentImports();
  }, [fetchRecentImports]);
  // Safety net: ensure edit module always has an active photo
  useEffect(() => {
    window.photoForge.onImportProgress((progress: ImportProgress) => {
      setImportProgress(progress);
      if (progress.stage === 'complete') {
        refreshPhotos();
        fetchRecentImports();
        addToast('success', t('toast.importComplete'), 3000);
        setTimeout(() => setImportProgress(null), 2000);
      }
    });
  }, [refreshPhotos, addToast, fetchRecentImports]);

  // ========== Recent Imports & Album Actions ==========
  const handleSelectBatch = useCallback((photoIds: string[]) => {
    // Set selected IDs to the batch's photos, switch view to show them
    setSelectedIds(new Set(photoIds));
    setFilter({ ...filter, search: '' });
  }, [filter]);

  const handleExportAlbum = useCallback(async (photoIds: string[]) => {
    try {
      const result = await window.photoForge.openFileDialog({ properties: ['openDirectory'], title: t('album.export') });
      if (result?.filePaths?.[0]) {
        const outputDir = result.filePaths[0];
        const namingTemplate = settings.namingTemplate || '{filename}';
        const res = await window.photoForge.exportBatch(photoIds, outputDir, namingTemplate);
        const exported = res?.exported ?? photoIds.length;
        addToast('success', t('toast.batchExportComplete').replace('{exported}', String(exported)).replace('{total}', String(photoIds.length)), 4000);
        if (settings.openFolderAfterExport) {
          try { await window.photoForge.openFolder(outputDir); } catch { /* */ }
        }
      }
    } catch {
      addToast('error', t('toast.exportFailed'), 3000);
    }
  }, [addToast, t, settings]);

  const handleUpdateCollection = useCallback(async (collectionId: string, updates: { name?: string; description?: string }) => {
    await window.photoForge.updateCollection(collectionId, updates);
  }, []);
  // ========== Filtering ==========
  const filteredPhotos = useMemo(() => {
    let result = [...photos];
    const q = (searchQuery || filter.search).toLowerCase();
    if (q) result = result.filter(p => p.fileName.toLowerCase().includes(q) || p.cameraModel?.toLowerCase().includes(q) || p.tags.some(t => t.toLowerCase().includes(q)));
    if (filter.formats.length > 0) result = result.filter(p => filter.formats.includes(p.fileFormat));
    if (filter.onlyFavorites) result = result.filter(p => p.isFavorite);
    if (filter.ratingMin > 0) result = result.filter(p => p.rating >= filter.ratingMin);
    if (filter.colorLabels.length > 0 && !filter.colorLabels.includes('none')) result = result.filter(p => filter.colorLabels.includes(p.colorLabel));
    if (filter.cameraModels.length > 0) result = result.filter(p => p.cameraModel && filter.cameraModels.includes(p.cameraModel));
    if (filter.hasPreset === true) result = result.filter(p => p.presetApplied !== null);
    result.sort((a, b) => {
      let aVal: any, bVal: any;
      switch (sort.field) {
        case 'dateTaken': aVal = a.dateTaken || a.dateModified; bVal = b.dateTaken || b.dateModified; break;
        case 'fileName': aVal = a.fileName.toLowerCase(); bVal = b.fileName.toLowerCase(); break;
        case 'fileFormat': aVal = a.fileFormat; bVal = b.fileFormat; break;
        case 'fileSize': aVal = a.fileSize; bVal = b.fileSize; break;
        case 'rating': aVal = a.rating; bVal = b.rating; break;
        default: aVal = a.dateModified; bVal = b.dateModified;
      }
      // Primary sort direction
      if (aVal < bVal) return sort.order === 'asc' ? -1 : 1;
      if (aVal > bVal) return sort.order === 'asc' ? 1 : -1;
      // Tiebreaker: secondary sort by fileName asc for deterministic order
      const aName = a.fileName.toLowerCase(), bName = b.fileName.toLowerCase();
      return aName < bName ? -1 : aName > bName ? 1 : 0;
    });
    return result;
  }, [photos, filter, sort, searchQuery]);
  // Safety net: ensure edit always gets a photo
  useEffect(() => {
    if (activeModule === 'edit') {
      if (selectedIds.size > 0) {
        setActivePhotoId(Array.from(selectedIds)[0]);
      } else if (!activePhotoId && filteredPhotos.length > 0) {
        setActivePhotoId(filteredPhotos[0].id);
      }
    }
  }, [activeModule, activePhotoId, selectedIds, filteredPhotos]);
  // When switching to edit, auto-select first selected photo if none active
  const handleModuleChange = useCallback((m: Module) => {
    if (m === 'edit') {
      if (selectedIds.size > 0) {
        setActivePhotoId(Array.from(selectedIds)[0]);
      } else if (!activePhotoId && filteredPhotos.length > 0) {
        setActivePhotoId(filteredPhotos[0].id);
      }
    }
    navTo(m);
  }, [navTo, activePhotoId, selectedIds, filteredPhotos]);

  // ========== Handlers ==========
  const handleSettingsChange = useCallback(async (updates: Partial<AppSettings>) => {
    const next = { ...settings, ...updates };
    setSettings(next);
    try { await window.photoForge.updateSettings(updates); } catch { /* */ }
    if (updates.language) setLang(updates.language);
  }, [settings, setLang]);

  const handleImport = useCallback(async (sourcePaths: string[], importMode: 'copy' | 'reference') => {
    try {
      setSettings(prev => ({ ...prev, importMode }));
      await window.photoForge.updateSettings({ importMode });
      await window.photoForge.importFiles({ sourcePaths, copyToLibrary: importMode === 'copy', libraryPath: await window.photoForge.getLibraryPath(), generateThumbnails: true, thumbnailSize: settings.thumbnailSize, extractMetadata: true, detectDuplicates: true, fileExtensions: [] });
      refreshPhotos();
      setShowImport(false);
    } catch (err) {
      addToast('error', t('toast.importFailed'), 5000);
    }
  }, [refreshPhotos, settings, addToast, t]);

  const handleSelect = useCallback((id: string, multi = false) => {
    setSelectedIds(prev => { const next = new Set(multi ? prev : []); if (next.has(id) && multi) next.delete(id); else next.add(id); return next; });
  }, []);
  const enterEditMode = useCallback((id: string) => {
    setActivePhotoId(id);
    setActiveModule('edit');
  }, []);
  const exitEditMode = useCallback(() => {
    setActivePhotoId(null);
    setActiveModule('browse');
  }, []);
  // History-aware photo update — records every edit to the undo stack
  const handleUpdatePhotoWithHistory = useCallback(async (id: string, updates: Partial<PhotoFile>) => {
    const photo = photos.find(p => p.id === id);
    if (!photo) { await updatePhoto(id, updates); return; }

    // Determine which fields changed and build before snapshot
    const changedKeys = Object.keys(updates) as (keyof PhotoFile)[];
    const before: Record<string, any> = {};
    for (const key of changedKeys) { before[key] = photo[key]; }

    // Determine action type for history description
    let action = 'updatePhoto' as any;
    let desc = '';
    if ('rating' in updates) { action = 'setRating'; desc = `${t('history.rating')} ${updates.rating ?? 0} · ${photo.fileName}`; }
    else if ('colorLabel' in updates) { action = 'setColorLabel'; desc = `${t('history.label')} ${updates.colorLabel} · ${photo.fileName}`; }
    else if ('tags' in updates) { action = updates.tags && updates.tags.length > (photo.tags?.length || 0) ? 'addTag' : 'removeTag'; desc = `${t('history.tags')} · ${photo.fileName}`; }
    else if ('customAdjustments' in updates) { action = 'updatePhoto'; desc = `${t('history.adjustments')} · ${photo.fileName}`; }
    else if ('cropRegion' in updates) { action = 'cropPhoto'; desc = `${t('history.crop')} · ${photo.fileName}`; }
    else if ('rotation' in updates || 'flipH' in updates || 'flipV' in updates) { action = 'transformPhoto'; desc = `${t('history.transform')} · ${photo.fileName}`; }
    else if ('title' in updates || 'description' in updates) { action = 'updatePhoto'; desc = `${t('history.metadata')} · ${photo.fileName}`; }
    else if ('dateTaken' in updates) { action = 'updatePhoto'; desc = `${t('history.date')} · ${photo.fileName}`; }
    else if ('latitude' in updates || 'longitude' in updates) { action = 'updatePhoto'; desc = `${t('history.location')} · ${photo.fileName}`; }
    else { action = 'updatePhoto'; desc = `${t('history.edit')} · ${photo.fileName}`; }

    const entry = createUpdateEntry(action, desc, id, before as any, updates as any);
    await updatePhoto(id, updates);
    history.pushEntry(entry.action, entry.description, entry.beforeState, entry.afterState);
  }, [photos, updatePhoto, history]);

  const handleToggleFavorite = useCallback(async (id: string) => {
    const photo = photos.find(p => p.id === id);
    if (!photo) return;
    const newFav = !photo.isFavorite;
    const entry = createUpdateEntry('toggleFavorite', `${newFav ? t('history.favorited') : t('history.unfavorited')} · ${photo.fileName}`, id, { isFavorite: photo.isFavorite }, { isFavorite: newFav });
    await updatePhoto(id, { isFavorite: newFav });
    history.pushEntry(entry.action, entry.description, entry.beforeState, entry.afterState);
    addToast('success', newFav ? t('toast.addedFavorite') : t('toast.removedFavorite'), 2000);
  }, [photos, updatePhoto, history, addToast, t]);

  const handleSetRating = useCallback(async (id: string, rating: 0 | 1 | 2 | 3 | 4 | 5) => {
    const photo = photos.find(p => p.id === id);
    if (!photo) return;
    const entry = createUpdateEntry('setRating', `${t('history.rating')} ${rating} · ${photo.fileName}`, id, { rating: photo.rating }, { rating });
    await updatePhoto(id, { rating });
    history.pushEntry(entry.action, entry.description, entry.beforeState, entry.afterState);
  }, [photos, updatePhoto, history]);

  const handleApplyPreset = useCallback(async (photoId: string, presetId: string) => {
    const photo = photos.find(p => p.id === photoId);
    const preset = presets.find(p => p.id === presetId);
    if (!photo || !preset) return;
    const entry = createUpdateEntry('applyPreset', `${preset.name} -> ${photo.fileName}`, photoId, { presetApplied: photo.presetApplied }, { presetApplied: presetId });
    await applyPreset(photoId, presetId);
    history.pushEntry(entry.action, entry.description, entry.beforeState, entry.afterState);
    refreshPhotos();
    addToast('success', t('toast.presetApplied'), 2000);
  }, [photos, presets, applyPreset, refreshPhotos, history, addToast, t]);

  const handleRemovePreset = useCallback(async (photoId: string) => {
    const photo = photos.find(p => p.id === photoId);
    if (!photo || !photo.presetApplied) return;
    const preset = presets.find(p => p.id === photo.presetApplied);
    const entry = createUpdateEntry('removePreset', `${t('history.removePreset')} · ${preset?.name || 'Preset'} -> ${photo.fileName}`, photoId, { presetApplied: photo.presetApplied, customAdjustments: photo.customAdjustments }, { presetApplied: null, customAdjustments: null });
    await removePreset(photoId);
    history.pushEntry(entry.action, entry.description, entry.beforeState, entry.afterState);
    refreshPhotos();
    addToast('info', t('toast.presetRemoved'), 2000);
  }, [photos, presets, removePreset, refreshPhotos, history, addToast, t]);

  const handleBatchApplyPreset = useCallback(async (presetId: string) => {
    const ids = Array.from(selectedIds);
    const preset = presets.find(p => p.id === presetId);
    if (!preset) return;
    const changes = ids.map(id => { const p = photos.find(ph => ph.id === id); return { id, before: { presetApplied: p?.presetApplied || null }, after: { presetApplied: presetId } }; });
    const entry = createBatchEntry('batchApplyPreset', `${preset.name} -> ${ids.length} ${t('history.photos')}`, changes);
    for (const id of ids) await applyPreset(id, presetId);
    history.pushEntry(entry.action, entry.description, entry.beforeState, entry.afterState);
    refreshPhotos();
    addToast('success', t('toast.batchPresetApplied').replace('{count}', ids.length.toString()), 3000);
  }, [selectedIds, presets, photos, applyPreset, refreshPhotos, history, addToast, t]);

  const handleDeleteSelected = useCallback(() => {
    if (!selectedIds.size) return;
    setShowDeleteConfirm(true);
  }, [selectedIds]);

  const confirmDelete = useCallback(async () => {
    const ids = Array.from(selectedIds);
    const deletedPhotos = photos.filter(p => ids.includes(p.id));
    setShowDeleteConfirm(false);
    try {
      await deletePhotos(ids);
      // Record deletion in history for undo
      const entry = createBatchEntry('deletePhotos', `${t('history.delete')} ${ids.length} ${t('history.photos')}`, deletedPhotos.map(p => ({
        id: p.id,
        before: { ...p } as any,
        after: {} as any,
      })));
      history.pushEntry(entry.action, entry.description, entry.beforeState, entry.afterState, deletedPhotos);
      setSelectedIds(new Set());
      addToast('success', t('toast.deleted').replace('{count}', ids.length.toString()), 3000);
    }
    catch { addToast('error', t('toast.deleteFailed'), 5000); }
  }, [selectedIds, photos, deletePhotos, history, addToast, t]);

  const handleUndo = useCallback(async () => {
    const entry = history.undo();
    if (!entry) return;
    if (entry.action === 'deletePhotos' && entry.deletedPhotos && entry.deletedPhotos.length > 0) {
      // Restore deleted photos by re-adding them to the store
      for (const photo of entry.deletedPhotos) {
        await window.photoForge.updatePhotoMeta(photo.id, photo);
      }
      refreshPhotos();
    } else {
      for (const [id, data] of entry.beforeState) {
        const { id: _, ...updates } = data;
        if (Object.keys(updates).length > 0) await window.photoForge.updatePhotoMeta(id, updates);
      }
      refreshPhotos();
    }
    addToast('info', `${t('history.undo')} · ${entry.description}`, 2000);
  }, [history, refreshPhotos, addToast, lang]);

  const handleRedo = useCallback(async () => {
    const entry = history.redo();
    if (!entry) return;
    if (entry.action === 'deletePhotos') {
      // Re-delete the photos
      const ids = Array.from(entry.beforeState.keys());
      if (ids.length > 0) await deletePhotos(ids);
    } else {
      for (const [id, data] of entry.afterState) {
        const { id: _, ...updates } = data;
        if (Object.keys(updates).length > 0) await window.photoForge.updatePhotoMeta(id, updates);
      }
    }
    refreshPhotos();
    addToast('info', `${t('history.redo')} · ${entry.description}`, 2000);
  }, [history, deletePhotos, refreshPhotos, addToast, lang]);

  // ========== Missing File Repair ==========
  const handleRepairMissing = useCallback(async () => {
    for (const file of missingFiles) {
      const result = await window.photoForge.openFileDialog({
        title: t('missingFiles.locateFile').replace('{name}', file.fileName),
        properties: ['openFile'],
        filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'tiff', 'tif', 'webp', 'heic', 'heif', 'avif', 'cr2', 'cr3', 'nef', 'arw', 'raf', 'dng', 'orf', 'rw2'] }],
      });
      if (!result.canceled && result.filePaths.length > 0) {
        await window.photoForge.updatePhotoMeta(file.id, { filePath: result.filePaths[0], isReferenced: true });
      }
    }
    refreshPhotos();
    setMissingFiles([]);
    addToast('success', t('missingFiles.repairComplete'), 3000);
  }, [missingFiles, refreshPhotos, addToast, t]);

  // ========== Export Shortcut ==========
  const handleExport = useCallback(async () => {
    if (activeModule === 'edit' && activePhotoId) {
      // Export single photo in edit mode
      try {
        const result = await window.photoForge.saveFileDialog({
          title: t('detail.export'),
          defaultPath: activePhoto?.fileName || 'photo.jpg',
          filters: [{ name: 'Images', extensions: ['jpg', 'png', 'webp', 'tiff'] }],
        });
        if (!result.canceled && result.filePath) {
          await window.photoForge.exportPhotoAdvanced(activePhotoId, {
            photoId: activePhotoId, outputPath: result.filePath, format: 'jpg',
            quality: settings.exportQuality, applyCrop: true, applyRotationFlip: true,
            applyPreset: true, preserveExif: settings.preserveExif, colorSpace: settings.colorSpace,
          });
          addToast('success', t('toast.exportComplete'), 3000);
        }
      } catch { addToast('error', t('toast.exportFailed'), 5000); }
    } else if (selectedIds.size > 0) {
      // Batch export selected photos
      try {
        const result = await window.photoForge.saveFileDialog({
          title: t('detail.export'),
          properties: ['createDirectory'],
        });
        if (!result.canceled && result.filePath) {
          const outputDir = result.filePath;
          const namingTemplate = settings.namingTemplate || '{filename}';
          const res = await window.photoForge.exportBatch(Array.from(selectedIds), outputDir, namingTemplate);
          const exported = res?.exported ?? Array.from(selectedIds).length;
          addToast('success', t('toast.batchExportComplete').replace('{exported}', String(exported)).replace('{total}', String(selectedIds.size)), 4000);
          if (settings.openFolderAfterExport) {
            try { await window.photoForge.openFolder(outputDir); } catch { /* */ }
          }
        }
      } catch { addToast('error', t('toast.exportFailed'), 5000); }
    }
  }, [activeModule, activePhotoId, activePhoto, selectedIds, settings, addToast, t]);

  // ========== Toggle Favorite Shortcut ==========
  const handleToggleFavoriteShortcut = useCallback(async () => {
    const ids = activeModule === 'edit' && activePhotoId ? [activePhotoId] : Array.from(selectedIds);
    if (ids.length === 0) return;
    for (const id of ids) {
      const photo = photos.find(p => p.id === id);
      if (!photo) continue;
      const newFav = !photo.isFavorite;
      const entry = createUpdateEntry('toggleFavorite', `${newFav ? t('history.favorited') : t('history.unfavorited')} · ${photo.fileName}`, id, { isFavorite: photo.isFavorite }, { isFavorite: newFav });
      await updatePhoto(id, { isFavorite: newFav });
      history.pushEntry(entry.action, entry.description, entry.beforeState, entry.afterState);
    }
    const firstPhoto = photos.find(p => p.id === ids[0]);
    if (firstPhoto) addToast('success', firstPhoto.isFavorite ? t('toast.removedFavorite') : t('toast.addedFavorite'), 2000);
  }, [activeModule, activePhotoId, selectedIds, photos, updatePhoto, history, addToast, t, lang]);

  // ========== Keyboard Shortcuts ==========
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      // Skip shortcuts when focused on text input
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      const cmd = e.metaKey || e.ctrlKey;
      if (cmd && e.key === 'z' && !e.shiftKey) { e.preventDefault(); handleUndo(); }
      if (cmd && e.key === 'z' && e.shiftKey) { e.preventDefault(); handleRedo(); }
      if (cmd && e.key === 'y') { e.preventDefault(); handleRedo(); }
      if (cmd && e.key === 'i') { e.preventDefault(); setShowImport(true); }
      if (cmd && e.key === 'e') { e.preventDefault(); handleExport(); }
      if (cmd && e.key === '\\') { e.preventDefault(); setSidebarCollapsed(p => !p); }
      if (cmd && e.key === 'p') { e.preventDefault(); navTo('presets'); }
      if (cmd && e.key === 'l') { e.preventDefault(); handleToggleFavoriteShortcut(); }
      // Module shortcuts
      if (cmd && e.key === '1') { e.preventDefault(); setActiveModule('browse'); }
      if (cmd && e.key === '2') { e.preventDefault(); handleModuleChange('edit'); }
      if (cmd && e.key === '3') { e.preventDefault(); navTo('compare'); }
      if (cmd && e.key === '4') { e.preventDefault(); navTo('settings'); }
      if (cmd && e.key === '5') { e.preventDefault(); navTo('dategroup'); }
      // Browse mode actions
      if (activeModule === 'browse') {
        if (e.key === 'Backspace' && selectedIds.size > 0) { e.preventDefault(); handleDeleteSelected(); }
        if (cmd && e.key === 'a') { e.preventDefault(); setSelectedIds(new Set(filteredPhotos.map(p => p.id))); }
        if (e.key === 'Enter' && selectedIds.size === 1) { e.preventDefault(); enterEditMode(Array.from(selectedIds)[0]); }
      }
      // Edit mode actions
      if (activeModule === 'edit' && activePhotoId) {
        const idx = filteredPhotos.findIndex(p => p.id === activePhotoId);
        if (e.key === 'ArrowLeft' && idx > 0) setActivePhotoId(filteredPhotos[idx - 1].id);
        if (e.key === 'ArrowRight' && idx < filteredPhotos.length - 1) setActivePhotoId(filteredPhotos[idx + 1].id);
      }
      if (e.key === 'Escape') {
        if (activeModule === 'edit') exitEditMode();
        if (showImport) setShowImport(false);
        if (activeModule !== 'browse' && activeModule !== 'edit') setActiveModule('browse');
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleModuleChange, handleUndo, handleRedo, activeModule, selectedIds, filteredPhotos, activePhotoId, showImport, handleDeleteSelected, enterEditMode, exitEditMode, handleExport, handleToggleFavoriteShortcut, navTo]);

  // ========== Module Layout Config ==========
  const showSidebar = activeModule === 'browse' && !sidebarCollapsed;
  const showMainPanel = activeModule === 'edit' || activeModule === 'presets';



  // ========== Render ==========
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      background: theme.bgPhotoStage,
      color: theme.textPrimary,
      position: 'relative',
      overflow: 'hidden',
      boxShadow: 'none',
    }}>
      <div style={{
        height: 30,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: `0 ${SPACING.md}px`,
        background: theme.bgPhotoStage,
        ...dragRegionStyle,
        boxShadow: 'none',
        position: 'relative',
        zIndex: 20,
      }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '4px',
          borderRadius: 999,
          background: theme.bgSecondary,
          ...noDragRegionStyle,
        }}>
          {[
            { key: 'close', color: theme.danger, background: theme.dangerLight, action: () => window.photoForge.windowClose(), icon: 'close' as const },
            { key: 'minimize', color: theme.warning, background: theme.warningLight, action: () => window.photoForge.windowMinimize(), icon: 'minimize' as const },
            { key: 'maximize', color: theme.success, background: theme.successLight, action: () => window.photoForge.windowToggleMaximize(), icon: 'maximize' as const },
          ].map((control) => (
            <button
              key={control.key}
              style={{
                width: 26,
                height: 18,
                borderRadius: 999,
                padding: 0,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: control.background,
                color: control.color,
                cursor: 'pointer',
                boxShadow: 'none',
              }}
              onClick={control.action}
              title={control.key}
            >
              <AppIcon name={control.icon} size={9} color={control.color} strokeWidth={2.1} />
            </button>
          ))}
        </div>
        <div style={{
          position: 'absolute',
          left: '50%',
          transform: 'translateX(-50%)',
          fontSize: TYPO.caption.size,
          color: theme.textTertiary,
          letterSpacing: 0.4,
          textTransform: 'uppercase',
          pointerEvents: 'none',
        }}>
          PhotoForge
        </div>
      </div>

      {/* ===== Module-aware Toolbar ===== */}
      <ToolbarModules
        activeModule={activeModule}
        onModuleChange={handleModuleChange}
        theme={theme}
        // Browse actions
        onImport={() => setShowImport(true)}
        onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
                sort={sort}
        onSortChange={setSort}
        selectedCount={selectedIds.size}
        onBatchApplyPreset={handleBatchApplyPreset}
        presets={presets}
        canCompare={selectedIds.size >= 2}
        onCompare={() => navTo('compare')}
        onDeleteSelected={handleDeleteSelected}
        // Edit actions
        activePhotoName={activePhoto?.fileName}
        onBackToBrowse={exitEditMode}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={history.canUndo}
        canRedo={history.canRedo}
        // Global
        onOpenSettings={() => navTo('settings')}
        onOpenDateGroup={() => navTo('dategroup')}
      >
        {activeModule === 'browse' && (
          <SearchBar photos={photos} onSearch={setSearchQuery} onSelectPhoto={enterEditMode} theme={theme} />
        )}
      </ToolbarModules>

      {/* ===== Module Content ===== */}
      <div style={{
        display: 'flex',
        flex: 1,
        overflow: 'hidden',
        position: 'relative',
        background: theme.bgPhotoStage,
        minHeight: 0,
      }}>

        {/* Sidebar — filter sidebar, only in browse */}
        <div style={{
          width: showSidebar ? SIDEBAR_WIDTH : 0,
          minWidth: showSidebar ? SIDEBAR_WIDTH : 0,
          overflow: 'hidden',
          transition: `width ${DURATION.normal}ms ${EASING.inOut}`,
          flexShrink: 0,
          position: 'relative',
          zIndex: 2,
        }}>
          <Sidebar collapsed={false} filter={filter} onFilterChange={setFilter} photos={photos} theme={theme} recentImports={recentImports} onSelectBatch={handleSelectBatch} />
        </div>

        {/* Main content area */}
        <main style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          minWidth: 0,
          minHeight: 0,
          background: theme.bgPhotoStage,
          boxShadow: 'none',
        }}>

          {/* BROWSE MODULE */}
          {activeModule === 'browse' && (
            <PhotoGrid
              photos={filteredPhotos}
              selectedIds={selectedIds}
              onSelect={handleSelect}
              onOpenDetail={enterEditMode}
              onToggleFavorite={handleToggleFavorite}
              onDelete={(ids) => { setSelectedIds(new Set(ids)); handleDeleteSelected(); }}
              onCompare={selectedIds.size >= 2 ? () => navTo('compare') : undefined}
              onSetRating={handleSetRating}
              theme={theme}
              thumbnailSize={settings.thumbnailSize}
              showFileExtensions={settings.showFileExtensions}
              showGridInfo={settings.showGridInfo}
            />
          )}

          {/* EDIT MODULE */}
          {activeModule === 'edit' && activePhoto && (
            <PhotoDetail
              photo={activePhoto}
              presets={presets}
              onApplyPreset={handleApplyPreset}
              onRemovePreset={handleRemovePreset}
              onUpdatePhoto={handleUpdatePhotoWithHistory}
              onBack={exitEditMode}
              onToast={(type, msg) => addToast(type, msg, 3000)}
              theme={theme}
              defaultExportFormat={settings.exportFormat}
              defaultExportQuality={settings.exportQuality}
              preserveExif={settings.preserveExif}
              colorSpace={settings.colorSpace}
            />
          )}

          {/* ALBUMS MODULE */}
          {activeModule === 'albums' && (
            <SmartAlbumView
              photos={photos}
              collections={[]}
              onCreateSmartAlbum={(name) => addToast('success', t('toast.smartAlbumCreated').replace('{name}', name), 3000)}
              onDeleteCollection={() => {}}
              onSelectPhoto={enterEditMode}
              onExportAlbum={handleExportAlbum}
              onUpdateCollection={handleUpdateCollection}
              theme={theme}
            />
          )}

          {/* STATISTICS MODULE */}
          {activeModule === 'statistics' && (
            <StatisticsView photos={photos} onBack={() => setActiveModule('browse')} theme={theme} />
          )}

          {/* Overlays — settings/compare/date-group replace browse grid */}
          {activeModule === 'settings' && (
            <SettingsView onBack={() => setActiveModule('browse')} onSettingsChange={handleSettingsChange} settings={settings} theme={theme} />
          )}
          {activeModule === 'compare' && (
            <CompareView photos={photos.filter(p => selectedIds.has(p.id))} onBack={() => setActiveModule('browse')} theme={theme} />
          )}
          {activeModule === 'dategroup' && (
            <DateGroupView photos={filteredPhotos} onSelectPhoto={enterEditMode} onToggleFavorite={handleToggleFavorite} selectedIds={selectedIds} theme={theme} />
          )}
        </main>

        {/* Right panel — browse module: PresetPanel */}
        {activeModule === 'presets' && (
          <PresetPanel
            presets={presets}
            activePhoto={null}
            selectedCount={selectedIds.size}
            onApplyPreset={handleApplyPreset}
            onBatchApply={handleBatchApplyPreset}
            onClose={() => setActiveModule('browse')}
            onCreatePreset={createPreset}
            onDeletePreset={deletePreset}
            onRefreshPresets={loadPresets}
            theme={theme}
          />
        )}
      </div>

      {/* Status bar */}      {/* Status bar */}
      <StatusBar
        totalPhotos={photos.length}
        displayedPhotos={filteredPhotos.length}
        selectedCount={selectedIds.size}
        importProgress={importProgress}
        theme={theme}
      />

      {/* Import modal */}
      {showImport && (
        <ImportModal onImport={handleImport} onClose={() => setShowImport(false)} progress={importProgress} defaultImportMode={settings.importMode} theme={theme} />
      )}

      {/* Toasts */}
      <Toast toasts={toasts} onDismiss={dismissToast} theme={theme} />

      {/* Delete confirmation dialog */}
      {showDeleteConfirm && (
        <ConfirmDialog
          title={t('dialog.deleteTitle')}
          message={t('dialog.deleteMessage').replace('{count}', selectedIds.size.toString())}
          confirmLabel={t('dialog.deleteConfirm')}
          cancelLabel={t('dialog.cancel')}
          danger
          onConfirm={confirmDelete}
          onCancel={() => setShowDeleteConfirm(false)}
          theme={theme}
        />
      )}

      {/* Missing files notification */}
      {missingFiles.length > 0 && activeModule === 'browse' && (
        <div style={{
          position: 'absolute', bottom: 40, left: '50%', transform: 'translateX(-50%)',
          background: theme.warning, color: theme.textInverse, padding: `${SPACING.md}px ${SPACING.xl}px`,
          borderRadius: RADIUS.md, fontSize: TYPO.body.size, zIndex: 100, boxShadow: SHADOW.md,
          display: 'flex', alignItems: 'center', gap: SPACING.sm,
          animation: `toastIn ${DURATION.normal}ms ${EASING.out}`,
        }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: SPACING.xs }}><AppIcon name="warning" size={14} color={theme.textInverse} />{missingFiles.length} {t('missingFiles.message')}</span>
          <button style={{ padding: `${SPACING.xs}px ${SPACING.lg}px`, border: 'none', borderRadius: RADIUS.sm, background: 'rgba(0,0,0,0.18)', color: theme.textInverse, cursor: 'pointer', fontSize: TYPO.small.size }} onClick={handleRepairMissing}>{t('missingFiles.repair')}</button>
          <button style={{ padding: `${SPACING.xs}px ${SPACING.lg}px`, border: 'none', borderRadius: RADIUS.sm, background: 'rgba(0,0,0,0.12)', color: theme.textInverse, cursor: 'pointer', fontSize: TYPO.small.size }} onClick={() => setMissingFiles([])}>{t('missingFiles.dismiss')}</button>
        </div>
      )}
    </div>
  );
};

// ========== Module-aware Toolbar Component ==========

interface ToolbarModulesProps {
  activeModule: Module;
  onModuleChange: (m: Module) => void;
  theme: Theme;
  // Browse
  onImport: () => void;
  onToggleSidebar: () => void;
  sort: SortCriteria;
  onSortChange: (s: SortCriteria) => void;
  selectedCount: number;
  onBatchApplyPreset: (id: string) => void;
  presets: Preset[];
  canCompare: boolean;
  onCompare: () => void;
  onDeleteSelected: () => void;
  // Edit
  activePhotoName?: string;
  onBackToBrowse: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  // Global
  onOpenSettings: () => void;
  onOpenDateGroup: () => void;
  children?: React.ReactNode;
}

const ToolbarModules: React.FC<ToolbarModulesProps> = ({
  activeModule, onModuleChange, theme: t,
  onImport, onToggleSidebar,
  sort, onSortChange, selectedCount, onBatchApplyPreset, presets,
  canCompare, onCompare, onDeleteSelected,
  activePhotoName, onBackToBrowse, onUndo, onRedo, canUndo, canRedo,
  onOpenSettings, onOpenDateGroup, children,
}) => {
  const { t: tr } = useI18n();
  const [showSort, setShowSort] = useState(false);
  const [showBatch, setShowBatch] = useState(false);



  const modules: { key: Module; icon: React.ReactNode; label: string }[] = [
    { key: 'browse', icon: <AppIcon name="camera" size={14} color={activeModule === 'browse' ? t.accent : t.textSecondary} />, label: tr('module.browse') },
    { key: 'edit', icon: <AppIcon name="adjustments" size={14} color={activeModule === 'edit' ? t.accent : t.textSecondary} />, label: tr('module.edit') },
    { key: 'albums', icon: <AppIcon name="albums" size={14} color={activeModule === 'albums' ? t.accent : t.textSecondary} />, label: tr('module.albums') },
    { key: 'statistics', icon: <AppIcon name="stats" size={14} color={activeModule === 'statistics' ? t.accent : t.textSecondary} />, label: tr('module.statistics') },
  ];

  const btnBase: React.CSSProperties = {
    borderRadius: 12,
    cursor: 'pointer',
    fontSize: TYPO.body.size,
    transition: TRANSITION.all,
    whiteSpace: 'nowrap',
    boxShadow: 'none',
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', height: 58, padding: `0 ${SPACING.md}px`, background: t.bgPhotoStage, boxShadow: 'none', gap: SPACING.sm, flexShrink: 0, userSelect: 'none' }}>

      {/* Module tabs */}
      <div style={{ display: 'flex', gap: 4, background: t.bgSecondary, borderRadius: 14, padding: 4, boxShadow: 'none' }}>
        {modules.map(m => (
          <button key={m.key} style={{
            ...btnBase,
            padding: `${SPACING.sm}px ${SPACING.md}px`,
            background: activeModule === m.key ? t.bgPrimary : 'transparent',
            color: activeModule === m.key ? t.accent : t.textSecondary,
            fontWeight: activeModule === m.key ? 600 : 400,
            boxShadow: 'none',
            fontSize: TYPO.small.size,
          }}
            onClick={() => onModuleChange(m.key)}
            onMouseEnter={e => { if (activeModule !== m.key) e.currentTarget.style.background = t.bgHover; }}
            onMouseLeave={e => { if (activeModule !== m.key) e.currentTarget.style.background = 'transparent'; }}
          ><span style={{ display: 'inline-flex', alignItems: 'center', gap: SPACING.xs }}>{m.icon}{m.label}</span></button>
        ))}
      </div>

      <div style={{ width: 10 }} />

      {/* Context-sensitive content */}
      {activeModule === 'browse' && (
        <>
          <button style={{ ...btnBase, padding: `${SPACING.sm}px ${SPACING.lg}px`, background: t.accent, color: t.textInverse, fontWeight: 700 }}
            onClick={onImport}
            onMouseEnter={e => { e.currentTarget.style.background = t.accentHover; }}
            onMouseLeave={e => { e.currentTarget.style.background = t.accent; }}
          ><span style={{ display: 'inline-flex', alignItems: 'center', gap: SPACING.xs }}><AppIcon name="import" size={14} color={t.textInverse} />{tr('toolbar.import')}</span></button>

          <div style={{ position: 'relative' }}>
          <button style={{ ...btnBase, padding: `${SPACING.sm}px ${SPACING.md}px`, background: t.bgSecondary, color: t.textPrimary }}
            onClick={() => setShowSort(!showSort)}
            onMouseEnter={e => { e.currentTarget.style.background = t.bgHover; }}
            onMouseLeave={e => { e.currentTarget.style.background = t.bgSecondary; }}
          ><span style={{ display: 'inline-flex', alignItems: 'center', gap: SPACING.xs }}>{tr('toolbar.sort')}<AppIcon name={sort.order === 'asc' ? 'sortAsc' : 'sortDesc'} size={13} color={t.textSecondary} /></span></button>
          {showSort && (
            <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: SPACING.xs, background: t.dropdownBg, borderRadius: RADIUS.lg, padding: SPACING.xs, boxShadow: '0 16px 36px rgba(0,0,0,0.34)', zIndex: 100 }}>
              {(['dateTaken','dateModified','fileName','fileFormat','fileSize','rating'] as const).map(f => (
                <button key={f} style={{ ...btnBase, display: 'block', width: '100%', padding: `${SPACING.sm}px ${SPACING.lg}px`, background: sort.field === f ? t.accentLight : 'transparent', color: sort.field === f ? t.accent : t.textPrimary, textAlign: 'left', boxShadow: 'none' }}
                  onClick={() => { onSortChange({ ...sort, field: f }); setShowSort(false); }}
                >{tr(`sort.${f}`)}</button>
              ))}
            </div>
          )}
          </div>

          {selectedCount > 0 && (
            <>
              <div style={{ position: 'relative' }}>
              <button style={{ ...btnBase, padding: `${SPACING.sm}px ${SPACING.md}px`, background: t.accent, color: t.textInverse }}
                onClick={() => setShowBatch(!showBatch)}
              ><span style={{ display: 'inline-flex', alignItems: 'center', gap: SPACING.xs }}><AppIcon name="sparkles" size={14} color={t.textInverse} />{tr('toolbar.batchPreset')} ({selectedCount})</span></button>
              {showBatch && (
                <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: SPACING.xs, background: t.dropdownBg, borderRadius: RADIUS.lg, padding: SPACING.xs, boxShadow: '0 16px 36px rgba(0,0,0,0.34)', zIndex: 100, maxHeight: 300, overflowY: 'auto', minWidth: 180 }}>
                  {presets.slice(0, 20).map(p => (
                    <button key={p.id} style={{ ...btnBase, display: 'block', width: '100%', padding: `${SPACING.sm}px ${SPACING.lg}px`, background: 'transparent', color: t.textPrimary, textAlign: 'left', boxShadow: 'none' }}
                      onClick={() => { onBatchApplyPreset(p.id); setShowBatch(false); }}
                    >{p.name}</button>
                  ))}
                </div>
              )}
              </div>
              <button style={{ ...btnBase, padding: `${SPACING.sm}px ${SPACING.md}px`, background: t.danger, color: t.textInverse }}
                onClick={onDeleteSelected}
              ><span style={{ display: 'inline-flex', alignItems: 'center', gap: SPACING.xs }}><AppIcon name="trash" size={14} color={t.textInverse} />({selectedCount})</span></button>
            </>
          )}

          {canCompare && (
            <button style={{ ...btnBase, padding: `${SPACING.sm}px ${SPACING.md}px`, background: t.bgSecondary, color: t.textPrimary }}
              onClick={onCompare}
            >{tr('toolbar.compare')}</button>
          )}
        </>
      )}

      {activeModule === 'edit' && (
        <>
          <button style={{ ...btnBase, padding: `${SPACING.sm}px ${SPACING.md}px`, background: t.bgSecondary, color: t.textPrimary }}
            onClick={onBackToBrowse}
            onMouseEnter={e => { e.currentTarget.style.background = t.bgHover; }}
            onMouseLeave={e => { e.currentTarget.style.background = t.bgSecondary; }}
          ><span style={{ display: 'inline-flex', alignItems: 'center', gap: SPACING.xs }}><AppIcon name="back" size={14} color={t.textPrimary} />{tr('module.browse')}</span></button>

          <span style={{ flex: 1, textAlign: 'center', fontSize: TYPO.body.size, fontWeight: 500, color: t.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {activePhotoName || ''}
          </span>

          <button style={{ ...btnBase, width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', background: t.bgSecondary, color: t.textSecondary, opacity: canUndo ? 1 : 0.3 }}
            onClick={canUndo ? onUndo : undefined} title={tr('toolbar.undoTooltip')}
          ><AppIcon name="undo" size={14} color={t.textSecondary} /></button>
          <button style={{ ...btnBase, width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', background: t.bgSecondary, color: t.textSecondary, opacity: canRedo ? 1 : 0.3 }}
            onClick={canRedo ? onRedo : undefined} title={tr('toolbar.redoTooltip')}
          ><AppIcon name="redo" size={14} color={t.textSecondary} /></button>
        </>
      )}

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Global actions — always visible */}
      {children}

      <button style={{ ...btnBase, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', background: activeModule === 'dategroup' ? t.accentLight : t.bgSecondary, color: activeModule === 'dategroup' ? t.accent : t.textSecondary }}
        onClick={onOpenDateGroup} title={tr('toolbar.dateGroup')}
        onMouseEnter={e => { if (activeModule !== 'dategroup') e.currentTarget.style.background = t.bgHover; }}
        onMouseLeave={e => { if (activeModule !== 'dategroup') e.currentTarget.style.background = t.bgSecondary; }}
      ><AppIcon name="calendar" size={14} color={activeModule === 'dategroup' ? t.accent : t.textSecondary} /></button>

      <button style={{ ...btnBase, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', background: activeModule === 'settings' ? t.accentLight : t.bgSecondary, color: activeModule === 'settings' ? t.accent : t.textSecondary }}
        onClick={onOpenSettings} title={tr('toolbar.settings')}
        onMouseEnter={e => { if (activeModule !== 'settings') e.currentTarget.style.background = t.bgHover; }}
        onMouseLeave={e => { if (activeModule !== 'settings') e.currentTarget.style.background = t.bgSecondary; }}
      ><AppIcon name="settings" size={14} color={activeModule === 'settings' ? t.accent : t.textSecondary} /></button>
    </div>
  );
};
