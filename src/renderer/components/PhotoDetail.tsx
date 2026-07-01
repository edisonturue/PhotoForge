import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { PhotoFile, Preset, PresetAdjustment, ExportFormat, CropRegion } from '../../shared/types';
import { Theme, SPACING, RADIUS, TYPO, DURATION, EASING, TRANSITION, SHADOW } from '../styles/theme';
import { AdjustmentPanel, buildEffectiveFilter } from './AdjustmentPanel';
import { Histogram } from './Histogram';
import { CanvasRenderer, useEffectiveAdjustments } from './CanvasRenderer';
import { useI18n } from '../i18n';
import { AppIcon } from './AppIcon';
import { Select } from './Select';

// ========== Image Blob / File URL Cache (LRU bounded) ==========
/**
 * Browser-compatible image formats that can be loaded via file:// URL directly.
 * For these formats we skip the IPC + base64 + blob pipeline entirely,
 * dramatically reducing memory usage.
 */
const BROWSER_FORMATS = new Set([
  '.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp',
  '.tiff', '.tif', '.avif', '.svg',
]);

/** Check if a file path points to a thumbnail rather than the original */
function isThumbnailPath(filePath: string): boolean {
  const normalized = filePath.replace(/\\/g, '/');
  return normalized.includes('/thumbnails/') || filePath.endsWith('_thumb.jpg');
}

/** Helper: extract file extension from a photo */
function getPhotoExt(photo: PhotoFile): string {
  const ext = (photo.fileFormat || photo.fileName.split('.').pop() || '').toLowerCase();
  return '.' + ext;
}

function base64ToBlob(base64: string, mime: string): Blob {
  const byteChars = atob(base64);
  const byteNums = new Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) {
    byteNums[i] = byteChars.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNums);
  return new Blob([byteArray], { type: mime });
}

/**
 * LRU-limited blob/image URL cache keyed by photo ID.
 * - Max 12 entries to keep memory bounded (was unbounded before)
 * - Automatically evicts least-recently-used entries when full
 * - Revokes blob: URLs on eviction to free browser memory
 */
const MAX_CACHE_ENTRIES = 24;
const cacheKeys: string[] = [];
const blobCache = new Map<string, string>();
const pendingPreloads = new Map<string, Promise<string | null>>();

function touchCache(id: string): void {
  const idx = cacheKeys.indexOf(id);
  if (idx >= 0) {
    cacheKeys.splice(idx, 1);
    cacheKeys.push(id);
  }
}

function setCache(id: string, url: string): void {
  if (blobCache.has(id)) {
    touchCache(id);
    return;
  }
  // Evict oldest entries if at capacity
  while (cacheKeys.length >= MAX_CACHE_ENTRIES) {
    const oldestId = cacheKeys.shift();
    if (oldestId) {
      const oldUrl = blobCache.get(oldestId);
      if (oldUrl && oldUrl.startsWith('blob:')) {
        URL.revokeObjectURL(oldUrl);
      }
      blobCache.delete(oldestId);
      pendingPreloads.delete(oldestId);
    }
  }
  blobCache.set(id, url);
  cacheKeys.push(id);
}

function getFromCache(id: string): string | undefined {
  const val = blobCache.get(id);
  if (val !== undefined) {
    touchCache(id);
  }
  return val;
}

/** Convert a local file path to a blob URL using an Image element + canvas.
 *  More reliable than fetch('file://') in Electron (no CORS issues).
 */
function imageToBlobUrl(filePath: string, maxWidth?: number): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = 'file://' + filePath;
    img.onload = () => {
      let w = img.naturalWidth;
      let h = img.naturalHeight;
      if (maxWidth && maxWidth > 0 && w > maxWidth) {
        h = Math.round(h * (maxWidth / w));
        w = maxWidth;
      }
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) { resolve(null); return; }
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(URL.createObjectURL(blob));
        } else {
          resolve(null);
        }
      }, 'image/jpeg', 0.92);
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}


/**
 * Ensure a photo's image data is cached as a blob/file URL.
 * Returns the cached URL (instantly if already cached).
 *
 * For browser-compatible formats (JPEG, PNG, etc.), we use file:// URL directly
 * to avoid the IPC + base64 + Blob pipeline, saving significant memory.
 * For RAW formats, we fall through to IPC-based image data fetching.
 */
async function ensureBlobUrl(photo: PhotoFile, maxWidth?: number): Promise<string | null> {
  // If cached as blob://, use it immediately. If file://, ignore it —
  // file:// URLs are placed by getCachedOrRawUrl for instant first load,
  // but don't re-encode from memory on re-navigation. We need a real blob: URL.
  const cached = getFromCache(photo.id);
  if (cached && cached.startsWith('blob:')) return cached;

  const pending = pendingPreloads.get(photo.id);
  if (pending) return pending;

  const promise = (async (): Promise<string | null> => {
    // Strategy 1: For browser-compatible formats (JPEG, PNG, etc.),
    // use an Image element + canvas to produce a blob: URL.
    // This is guaranteed to work in Electron and avoids IPC + base64.
    const ext = getPhotoExt(photo);
    const hasBrowserFormat = BROWSER_FORMATS.has(ext);
    const hasValidPath = !!photo.filePath && !isThumbnailPath(photo.filePath);

    if (hasBrowserFormat && hasValidPath) {
      try {
        const blobUrl = await imageToBlobUrl(photo.filePath, maxWidth);
        if (blobUrl) {
          setCache(photo.id, blobUrl);
          return blobUrl;
        }
      } catch {
        // Image approach failed, fall through
      }
    }

    // Strategy 2: Use IPC-based image data fetching (base64 → blob).
    // Works for all formats including RAW.
    try {
      if (window.photoForge.getImageData) {
        const result = await window.photoForge.getImageData(photo.id, maxWidth);
        if (result) {
          const blob = base64ToBlob(result.data, result.mime);
          const blobUrl = URL.createObjectURL(blob);
          setCache(photo.id, blobUrl);
          return blobUrl;
        }
      }
    } catch {
      // Fall through to URL-based loading
    }

    // Strategy 3: Final fallback — use the raw URL (photoforge:// or file:// thumbnail)
    const url = getRawPhotoUrl(photo);
    if (!url) return null;
    setCache(photo.id, url);
    return url;
  })();

  pendingPreloads.set(photo.id, promise);
  const result = await promise;
  pendingPreloads.delete(photo.id);
  return result;
}

/** Resolve a fallback display URL for a photo */
function getRawPhotoUrl(p: PhotoFile): string | null {
  return p.displayUrl ||
    (p.thumbnailPath ? 'file://' + p.thumbnailPath : null) ||
    'photoforge://raw/' + encodeURIComponent(p.filePath) || null;
}

/** Get a cached URL synchronously, or compute the best URL on the fly.
 *  For browser-compatible formats, prefers the full-resolution file:// URL
 *  over the thumbnail, avoiding the thumbnail-to-full flicker on first load.
 */
function getCachedOrRawUrl(p: PhotoFile, preferFull: boolean = false): string {
  // 1. Check cache first (instant re-navigation)
  const cached = getFromCache(p.id);
  if (cached) return cached;

  // 2. For browser-compatible formats with a valid file path, use full-res file:// URL
  //    (only for main image; filmstrip uses preferFull=false to get smaller thumbnails)
  //    NOTE: we do NOT cache file:// URLs here — caching is handled by ensureBlobUrl
  //    which creates blob: URLs for instant re-navigation.
  if (preferFull) {
    const ext = getPhotoExt(p);
    if (BROWSER_FORMATS.has(ext) && p.filePath && !isThumbnailPath(p.filePath)) {
      return 'file://' + p.filePath;
    }
  }

  // 3. Fallback: display URL, thumbnail, or photoforge:// protocol
  return getRawPhotoUrl(p) || '';
}

/**
 * Preloads adjacent photos into the blob cache.
 * Fetches image data via direct IPC (much faster than photoforge:// protocol)
 * and stores as blob URLs in renderer memory.
 */
function usePhotoBlobCache(
  currentPhoto: PhotoFile,
  allPhotos: PhotoFile[],
  onCacheReady?: () => void
): void {
  // Note: onCacheReady triggers re-render when blob URL arrives (for non-browser formats).
  // The cache provides instant re-navigation via photo.id changes.
  // Removing the callback would break the interface; kept for future use.
  const preloadRef = useRef<number[]>([]);

  // Stable dependency: only re-run when the list STRUCTURE changes
  // (length or first/last IDs), NOT when photo metadata changes.
  // This prevents parameter edits from cancelling & restarting preloads.
  const listId = useMemo(
    () => allPhotos.length > 0
      ? allPhotos.length + '-' + allPhotos[0].id + '-' + allPhotos[allPhotos.length - 1].id
      : '0',
    [allPhotos]
  );

  useEffect(() => {
    const idx = allPhotos.findIndex(p => p.id === currentPhoto.id);
    if (idx < 0) return;

    const toLoad: { photo: PhotoFile; delay: number }[] = [];

    // Preload neighbors: offset 1 (immediate) at delay 0, farther ones staggered
    for (let offset = 1; offset <= 5; offset++) {
      const neighborDelay = offset <= 1 ? 0 : 50 * offset;
      if (idx - offset >= 0) {
        toLoad.push({ photo: allPhotos[idx - offset], delay: neighborDelay });
      }
      if (idx + offset < allPhotos.length) {
        toLoad.push({ photo: allPhotos[idx + offset], delay: neighborDelay });
      }
    }

    // Current photo: cache immediately (no delay, highest priority)
    if (!blobCache.has(currentPhoto.id)) {
      toLoad.unshift({ photo: currentPhoto, delay: 0 });
    }

    for (const { photo, delay } of toLoad) {
      // Check both blob and file cache — if already cached in any form, skip
      if (getFromCache(photo.id)) continue;
      const t = window.setTimeout(() => {
        ensureBlobUrl(photo, 800).then(url => {
          if (url && photo.id === currentPhoto.id) {
            onCacheReady?.();
          }
        });
      }, delay);
      preloadRef.current.push(t);
    }

    return () => {
      // NOTE: Do NOT cancel old preloads! Previously-queued preloads continue
      // so rapid navigation still populates the cache for previously viewed photos.
    };
  }, [currentPhoto.id, listId]);
}


interface PhotoDetailProps {
  photo: PhotoFile;
  allPhotos: PhotoFile[];
  onNavigate: (id: string) => void;
  presets: Preset[];
  onApplyPreset: (photoId: string, presetId: string) => void;
  onRemovePreset: (photoId: string) => void;
  onUpdatePhoto: (id: string, updates: Partial<PhotoFile>) => void;
  onBack: () => void;
  onToast?: (type: 'success' | 'error' | 'info', message: string) => void;
  theme: Theme;
  defaultExportFormat: ExportFormat;
  defaultExportQuality: number;
  preserveExif: boolean;
  colorSpace: 'srgb' | 'adobe-rgb' | 'prophoto';
}

const labelOptionDefs: Array<{ key: PhotoFile['colorLabel']; labelKey: string }> = [
  { key: 'none', labelKey: 'detail.none' },
  { key: 'red', labelKey: 'sidebar.labelRed' },
  { key: 'yellow', labelKey: 'sidebar.labelYellow' },
  { key: 'green', labelKey: 'sidebar.labelGreen' },
  { key: 'blue', labelKey: 'sidebar.labelBlue' },
  { key: 'purple', labelKey: 'sidebar.labelPurple' },
];

const EXPORT_FORMATS: { value: ExportFormat; label: string }[] = [
  { value: 'jpg', label: 'JPEG' }, { value: 'png', label: 'PNG' }, { value: 'webp', label: 'WebP' },
  { value: 'tiff', label: 'TIFF' }, { value: 'bmp', label: 'BMP' }, { value: 'avif', label: 'AVIF' },
];

// ========== Inline Edit Component ==========
const InlineEdit: React.FC<{
  value: string;
  onSave: (val: string) => void;
  placeholder?: string;
  theme: Theme;
  multiline?: boolean;
}> = ({ value, onSave, placeholder, theme: t, multiline }) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  useEffect(() => { setDraft(value); }, [value]);

  const commit = () => {
    if (draft !== value) onSave(draft);
    setEditing(false);
  };

  if (editing) {
    const inputStyle: React.CSSProperties = {
      width: '100%',
      padding: `${SPACING.sm}px ${SPACING.md}px`,
      border: `1px solid ${t.borderFocus}`,
      borderRadius: 12,
      background: `linear-gradient(180deg, ${t.bgInput}, ${t.bgSecondary})`,
      color: t.textPrimary,
      fontSize: TYPO.small.size,
      outline: 'none',
      boxShadow: t.isDark ? SHADOW.focusDark : SHADOW.focus,
      resize: multiline ? 'vertical' : 'none',
      minHeight: multiline ? 60 : undefined,
      fontFamily: 'inherit',
    };
    if (multiline) {
      return (
        <textarea
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={e => { if (e.key === 'Escape') { setDraft(value); setEditing(false); } }}
          placeholder={placeholder}
          style={inputStyle}
          autoFocus
        />
      );
    }
    return (
      <input
        type="text"
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') { setDraft(value); setEditing(false); } }}
        placeholder={placeholder}
        style={inputStyle}
        autoFocus
      />
    );
  }

  return (
      <div
      onClick={() => setEditing(true)}
      style={{
        padding: `${SPACING.sm}px ${SPACING.md}px`,
        borderRadius: 12,
        background: `linear-gradient(180deg, ${t.bgSecondary}, ${t.bgPrimary})`,
        color: value ? t.textPrimary : t.textTertiary,
        fontSize: TYPO.small.size,
        cursor: 'text',
        minHeight: multiline ? 60 : undefined,
        whiteSpace: multiline ? 'pre-wrap' : undefined,
        transition: TRANSITION.all,
        boxShadow: 'inset 0 1px 0 rgba(0,0,0,0.24)',
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = t.border; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = t.borderLight; }}
    >
      {value || placeholder || '—'}
    </div>
  );
};

export const PhotoDetail: React.FC<PhotoDetailProps> = ({ photo, allPhotos, onNavigate, presets, onApplyPreset, onRemovePreset, onUpdatePhoto, onBack, onToast, theme: t, defaultExportFormat, defaultExportQuality, preserveExif, colorSpace }) => {
  // Inject CSS keyframe for cross-fade animation (once)
  useEffect(() => {
    const id = 'photoforge-detail-anim';
    if (!document.getElementById(id)) {
      const s = document.createElement('style');
      s.id = id;
      s.textContent = '@keyframes detailFadeIn { from { opacity: 0; } to { opacity: 1; } }';
      document.head.appendChild(s);
    }
  }, []);

  const { t: tr, lang } = useI18n();
  const labelOptions: Array<{ key: PhotoFile['colorLabel']; labelKey: string; color: string }> = [
    { key: 'none', labelKey: 'detail.none', color: t.textTertiary },
    { key: 'red', labelKey: 'sidebar.labelRed', color: t.colorLabelRed },
    { key: 'yellow', labelKey: 'sidebar.labelYellow', color: t.colorLabelYellow },
    { key: 'green', labelKey: 'sidebar.labelGreen', color: t.colorLabelGreen },
    { key: 'blue', labelKey: 'sidebar.labelBlue', color: t.colorLabelBlue },
    { key: 'purple', labelKey: 'sidebar.labelPurple', color: t.colorLabelPurple },
  ];
  const [activeTab, setActiveTab] = useState<'info' | 'adjust' | 'presets' | 'export'>('info');
  const [tagInput, setTagInput] = useState('');
  const appliedPreset = photo.presetApplied ? presets.find(p => p.id === photo.presetApplied) : null;


  // Preload adjacent photos for instant navigation
  usePhotoBlobCache(photo, allPhotos);

  // Image viewer state
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const isPanning = useRef(false);
  const lastPoint = useRef({ x: 0, y: 0 });
  const handleWheel = useCallback((e: React.WheelEvent) => { e.preventDefault(); setScale(prev => Math.min(Math.max(prev + (e.deltaY > 0 ? -0.1 : 0.1), 0.1), 10)); }, []);
  const handleMouseDown = useCallback((e: React.MouseEvent) => { if (scale > 1) { isPanning.current = true; lastPoint.current = { x: e.clientX, y: e.clientY }; } }, [scale]);
  const handleMouseMove = useCallback((e: React.MouseEvent) => { if (isPanning.current) { const dx = e.clientX - lastPoint.current.x; const dy = e.clientY - lastPoint.current.y; lastPoint.current = { x: e.clientX, y: e.clientY }; setTranslate(prev => ({ x: prev.x + dx, y: prev.y + dy })); } }, []);
  const handleMouseUp = useCallback(() => { isPanning.current = false; }, []);
  const resetView = useCallback(() => { setScale(1); setTranslate({ x: 0, y: 0 }); }, []);
  useEffect(() => { resetView(); }, [photo.id, resetView]);

  // Crop state
  const [cropMode, setCropMode] = useState(false);
  const [cropRegion, setCropRegion] = useState<CropRegion>({ x: 0, y: 0, width: 1, height: 1 });
  const [cropPreset, setCropPreset] = useState<string>('free');
  // Crop image bounds tracking — used to position overlay precisely over the photo
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const [photoBounds, setPhotoBounds] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  // Draggable crop state
  const cropDragRef = useRef<{ handle: string; startX: number; startY: number; initRegion: CropRegion; initBounds: { w: number; h: number } } | null>(null);
  const cropWorkingRef = useRef<CropRegion>({ x: 0, y: 0, width: 1, height: 1 });
  const cropRafRef = useRef<number | null>(null);
  const [dragHandle, setDragHandle] = useState<string | null>(null);

  const startCropDrag = useCallback((e: React.MouseEvent, handle: string) => {
    e.preventDefault();
    e.stopPropagation();
    const bounds = imageContainerRef.current;
    if (!bounds || !photoBounds) return;
    cropDragRef.current = {
      handle,
      startX: e.clientX,
      startY: e.clientY,
      initRegion: { ...cropRegion },
      initBounds: { w: photoBounds.w, h: photoBounds.h },
    };
    setDragHandle(handle);
  }, [cropRegion, photoBounds]);

  const onCropMouseMove = useCallback((e: React.MouseEvent) => {
    const drag = cropDragRef.current;
    if (!drag) return;
    const dx = (e.clientX - drag.startX) / drag.initBounds.w;
    const dy = (e.clientY - drag.startY) / drag.initBounds.h;
    const r = drag.initRegion;
    let nx = r.x, ny = r.y, nw = r.width, nh = r.height;

    const h = drag.handle;
    if (h === 'move') { nx = r.x + dx; ny = r.y + dy; }
    else if (h === 'e') { nw = Math.max(0.05, r.width + dx); }
    else if (h === 'w') { nw = Math.max(0.05, r.width - dx); nx = r.x + (r.width - nw); }
    else if (h === 's') { nh = Math.max(0.05, r.height + dy); }
    else if (h === 'n') { nh = Math.max(0.05, r.height - dy); ny = r.y + (r.height - nh); }
    else if (h === 'se') { nw = Math.max(0.05, r.width + dx); nh = Math.max(0.05, r.height + dy); }
    else if (h === 'sw') { nw = Math.max(0.05, r.width - dx); nx = r.x + (r.width - nw); nh = Math.max(0.05, r.height + dy); }
    else if (h === 'ne') { nw = Math.max(0.05, r.width + dx); nh = Math.max(0.05, r.height - dy); ny = r.y + (r.height - nh); }
    else if (h === 'nw') { nw = Math.max(0.05, r.width - dx); nx = r.x + (r.width - nw); nh = Math.max(0.05, r.height - dy); ny = r.y + (r.height - nh); }
    if (cropPreset !== 'free' && h !== 'move') {
      const [wp, hp] = cropPreset.split(':').map(Number);
      const ratio = wp / hp;
      if (Math.abs(dx) > Math.abs(dy)) { nh = nw / ratio; }
      else { nw = nh * ratio; }
      if (h.includes('e')) { nx = r.x; }
      else if (h.includes('w')) { nx = r.x + (r.width - nw); }
      else { nx = r.x + (r.width - nw) / 2; }
      if (h.includes('s')) { ny = r.y; }
      else if (h.includes('n')) { ny = r.y + (r.height - nh); }
      else { ny = r.y + (r.height - nh) / 2; }
    }
    if (nx < 0) nx = 0;
    if (ny < 0) ny = 0;
    if (nx + nw > 1) { nw = 1 - nx; }
    if (ny + nh > 1) { nh = 1 - ny; }
    // Write to working ref synchronously (no re-render)
    cropWorkingRef.current = { x: nx, y: ny, width: Math.max(0.05, nw), height: Math.max(0.05, nh) };
    // Throttle state updates to ~30fps via requestAnimationFrame
    if (cropRafRef.current === null) {
      cropRafRef.current = requestAnimationFrame(() => {
        cropRafRef.current = null;
        setCropRegion({ ...cropWorkingRef.current });
      });
    }
  }, [cropPreset]);

  const stopCropDrag = useCallback(() => {
    // Flush any pending rAF update
    if (cropRafRef.current !== null) {
      cancelAnimationFrame(cropRafRef.current);
      cropRafRef.current = null;
    }
    // Commit the final working position to state
    setCropRegion({ ...cropWorkingRef.current });
    cropDragRef.current = null;
    setDragHandle(null);
  }, []);
  const cropPresets = [{ label: tr('detail.cropFree'), value: 'free' }, { label: '1:1', value: '1:1' }, { label: '4:3', value: '4:3' }, { label: '3:2', value: '3:2' }, { label: '16:9', value: '16:9' }];

  const applyCropPreset = (preset: string) => {
    setCropPreset(preset);
    if (preset === 'free') return;
    const [w, h] = preset.split(':').map(Number);
    const ratio = w / h;
    const imgRatio = photo.width / photo.height;
    let nr: CropRegion;
    if (ratio > imgRatio) { const cH = imgRatio / ratio; nr = { x: 0, y: (1 - cH) / 2, width: 1, height: cH }; }
    else { const cW = ratio / imgRatio; nr = { x: (1 - cW) / 2, y: 0, width: cW, height: 1 }; }
    setCropRegion(nr);
  };
  // When entering crop mode: reset zoom, disable pan, measure photo bounds
  const enterCropMode = useCallback(() => {
    resetView();
    // Initialize crop region from the existing photo crop (if any)
    const existingCrop = photo.cropRegion;
    if (existingCrop) {
      setCropRegion({ ...existingCrop });
    } else {
      setCropRegion({ x: 0, y: 0, width: 1, height: 1 });
    }
    setCropMode(true);
    // Measure after render
    requestAnimationFrame(() => {
      const container = imageContainerRef.current;
      if (!container) return;
      const img = container.querySelector('img');
      if (!img || !img.naturalWidth || !img.naturalHeight) return;
      const cw = container.clientWidth;
      const ch = container.clientHeight;
      const scale = Math.min(cw / img.naturalWidth, ch / img.naturalHeight);
      const w = img.naturalWidth * scale;
      const h = img.naturalHeight * scale;
      const x = (cw - w) / 2;
      const y = (ch - h) / 2;
      setPhotoBounds({ x, y, w, h });
    });
  }, [resetView, photo]);

  const confirmCrop = () => {
    const isFullFrame = cropRegion.x <= 0 && cropRegion.y <= 0 && cropRegion.width >= 1 && cropRegion.height >= 1;
    onUpdatePhoto(photo.id, { cropRegion: isFullFrame ? null : cropRegion });
    setCropMode(false);
  };
  const resetCrop = () => {
    // Reset the saved crop region entirely
    onUpdatePhoto(photo.id, { cropRegion: null });
    // Close crop mode
    setCropMode(false);
  };
  const handleFlipH = () => onUpdatePhoto(photo.id, { flipH: !photo.flipH });
  const handleFlipV = () => onUpdatePhoto(photo.id, { flipV: !photo.flipV });
  const handleRotate = () => onUpdatePhoto(photo.id, { rotation: (photo.rotation + 90) % 360 });

  // Export state
  const [exportFormat, setExportFormat] = useState<ExportFormat>(defaultExportFormat);
  const [exportQuality, setExportQuality] = useState(defaultExportQuality);
  const [exportPreserveExif, setExportPreserveExif] = useState(preserveExif);
  const [exportApplyPreset, setExportApplyPreset] = useState(true);
  const [exportApplyCrop, setExportApplyCrop] = useState(true);
  const [exportApplyRotationFlip, setExportApplyRotationFlip] = useState(true);
  const [exportNamingTemplate, setExportNamingTemplate] = useState('{filename}');
  const [exportResultPath, setExportResultPath] = useState<string | null>(null);

  const NAMING_PRESETS = [
    { value: '{filename}', labelKey: 'export.namingPresetFilename' },
    { value: '{date}_{filename}', labelKey: 'export.namingPresetDateFilename' },
    { value: '{camera}_{filename}', labelKey: 'export.namingPresetCameraFilename' },
    { value: '{filename}_{preset}', labelKey: 'export.namingPresetFilenamePreset' },
    { value: '{year}-{month}-{day}_{filename}', labelKey: 'export.namingPresetFullDateFilename' },
  ];

  const previewNamingTemplate = (template: string): string => {
    const appliedPreset = photo.presetApplied ? presets.find(p => p.id === photo.presetApplied) : null;

    return template
      .replace('{filename}', photo.fileName.replace(/\.[^.]+$/, ''))
      .replace('{date}', photo.dateTaken ? photo.dateTaken.slice(0, 10) : 'unknown')
      .replace('{camera}', photo.cameraModel || 'unknown')
      .replace('{preset}', appliedPreset?.name || 'none')
      .replace('{index}', '1')
      .replace('{rating}', String(photo.rating));
  };

  // Initialize thumbnail URLs for filmstrip display


  const handleExport = async () => {
    try {
      const result = await window.photoForge.saveFileDialog({
        title: tr('detail.exportPhoto'),
        defaultPath: previewNamingTemplate(exportNamingTemplate) + '.' + exportFormat,
        filters: [{ name: exportFormat.toUpperCase(), extensions: [exportFormat] }],
      });
      if (result.canceled || !result.filePath) return;
      const success = await window.photoForge.exportPhotoAdvanced(photo.id, {
        photoId: photo.id,
        outputPath: result.filePath,
        format: exportFormat,
        quality: exportQuality,
        applyCrop: exportApplyCrop,
        applyRotationFlip: exportApplyRotationFlip,
        applyPreset: exportApplyPreset,
        preserveExif: exportPreserveExif,
        colorSpace,
      });
      if (success) {
        setExportResultPath(result.filePath);
        onToast?.('success', tr('detail.exportComplete'));
        // Open containing folder in Finder
        try { await window.photoForge.openFolder(result.filePath); } catch { /* */ }
      } else {
        onToast?.('error', tr('detail.exportFailed'));
      }
    } catch { onToast?.('error', tr('detail.exportFailed')); }
  };


  // Build effective filter from preset + custom adjustments
  const effectiveFilter = buildEffectiveFilter(appliedPreset?.adjustments, photo.customAdjustments);
  const effectiveAdj = useEffectiveAdjustments(appliedPreset?.adjustments, photo.customAdjustments);
  // For display we can use thumbnail (fast), but for export the main process
  // resolves the original via getSourcePath — never pass filePath from renderer
  // because it may have been overwritten with a display URL (file://… or photoforge://…)
  // Use full-resolution image for the detail view (not the tiny 400px thumbnail)
  // Use displayUrl directly — it's already the correct resolved URL from IPC (no extra fetch needed)
  // photo.displayUrl is computed by getDisplayUrl() which handles RAW conversion paths and file:// URLs
  // Use cached blob URL if available, fall back to thumbnail path, then raw URL.
  // Prioritizes instant display from disk thumbnail, upgrades to cached blob URL.
  // Priority: blob cache (instant re-navigation) > thumbnail (instant first load) > raw URL (fallback)
  // Cross-fade mechanism: keep the old image visible until the new one loads.
  const rawUrl = useMemo(() => {
    return getCachedOrRawUrl(photo, true) || (photo.displayUrl || 'photoforge://raw/800/' + encodeURIComponent(photo.filePath));
  }, [photo.id, photo.filePath, photo.fileFormat, photo.thumbnailPath, photo.displayUrl]);

  // Initialize displayedUrl to rawUrl on first mount (no flash),
  // then use cross-fade for subsequent changes.
  const [displayedUrl, setDisplayedUrl] = useState<string>(rawUrl);
  const pendingUrlRef = useRef<string>('');
  const imageUnmountRef = useRef(false);

  // Preload the new image before swapping
  useEffect(() => {
    if (!rawUrl) return;
    if (rawUrl === displayedUrl) return;
    // If already pending, skip
    if (rawUrl === pendingUrlRef.current) return;
    pendingUrlRef.current = rawUrl;

    // Preload using Image element
    const preloader = new Image();
    imageUnmountRef.current = false;

    preloader.onload = () => {
      if (imageUnmountRef.current) return;
      if (pendingUrlRef.current === rawUrl) {
        setDisplayedUrl(rawUrl);
      }
    };
    preloader.onerror = () => {
      // On error, still show the URL (browser will show broken image)
      if (imageUnmountRef.current) return;
      if (pendingUrlRef.current === rawUrl) {
        setDisplayedUrl(rawUrl);
      }
    };
    preloader.src = rawUrl;

    return () => {
      imageUnmountRef.current = true;
      // Abort the preload
      preloader.src = '';
    };
  }, [rawUrl, displayedUrl]);

  const imageSrc = displayedUrl;
  const tabs = [
    { key: 'info' as const, label: tr('detail.info'), icon: <AppIcon name="info" size={14} /> },
    { key: 'adjust' as const, label: tr('detail.adjustTab'), icon: <AppIcon name="adjustments" size={14} /> },
    { key: 'presets' as const, label: tr('detail.presets'), icon: <AppIcon name="sparkles" size={14} /> },
    { key: 'export' as const, label: tr('detail.export'), icon: <AppIcon name="export" size={14} /> },
  ];

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Top bar */}
      <div style={s(t).topBar}>
        <button style={s(t).backBtn} onClick={onBack}
          onMouseEnter={e => { e.currentTarget.style.background = t.bgHover; }}
          onMouseLeave={e => { e.currentTarget.style.background = t.bgSecondary; }}
        >{tr('detail.back')}</button>
        <span style={s(t).photoName}>{photo.fileName}</span>
        <div style={s(t).topActions}>
          <div style={{ display: 'flex', gap: 2 }}>
          <button style={{ ...s(t).actionLabelBtn, background: photo.flipH ? t.accentLight : t.bgSecondary }} onClick={handleFlipH} title={tr('detail.flipH')}
            onMouseEnter={e => { if (!photo.flipH) e.currentTarget.style.background = t.bgHover; }}
            onMouseLeave={e => { if (!photo.flipH) e.currentTarget.style.background = t.bgSecondary; }}
          ><AppIcon name="flipH" size={16} color={photo.flipH ? t.accent : t.textPrimary} /><span style={{ fontSize: TYPO.tiny.size, marginLeft: 4 }}>{tr('detail.flipH')}</span></button>
          <button style={{ ...s(t).actionLabelBtn, background: photo.flipV ? t.accentLight : t.bgSecondary }} onClick={handleFlipV} title={tr('detail.flipV')}
            onMouseEnter={e => { if (!photo.flipV) e.currentTarget.style.background = t.bgHover; }}
            onMouseLeave={e => { if (!photo.flipV) e.currentTarget.style.background = t.bgSecondary; }}
          ><AppIcon name="flipV" size={16} color={photo.flipV ? t.accent : t.textPrimary} /><span style={{ fontSize: TYPO.tiny.size, marginLeft: 4 }}>{tr('detail.flipV')}</span></button>
          <button style={s(t).actionLabelBtn} onClick={handleRotate} title={tr('detail.rotate')}
            onMouseEnter={e => { e.currentTarget.style.background = t.bgHover; }}
            onMouseLeave={e => { e.currentTarget.style.background = t.bgSecondary; }}
          ><AppIcon name="rotate" size={16} color={t.textPrimary} /><span style={{ fontSize: TYPO.tiny.size, marginLeft: 4 }}>{tr('detail.rotate')}</span></button>
          <button style={s(t).actionLabelBtn} onClick={resetView} title={tr('detail.resetView')}
            onMouseEnter={e => { e.currentTarget.style.background = t.bgHover; }}
            onMouseLeave={e => { e.currentTarget.style.background = t.bgSecondary; }}
          ><AppIcon name="maximize" size={16} color={t.textPrimary} /><span style={{ fontSize: TYPO.tiny.size, marginLeft: 4 }}>1:1</span></button>
          </div>
          {cropMode ? (
            <>
              <button style={{ ...s(t).actionLabelBtn, background: t.accent, color: t.textInverse, fontWeight: 600 }} onClick={confirmCrop}
                onMouseEnter={e => { e.currentTarget.style.background = t.accentHover; }}
                onMouseLeave={e => { e.currentTarget.style.background = t.accent; }}
              ><AppIcon name="check" size={14} color={t.textInverse} /><span style={{ fontSize: TYPO.small.size, marginLeft: 4 }}>{tr('detail.confirmCrop')}</span></button>
              <button style={s(t).actionLabelBtn} onClick={() => setCropMode(false)}
                onMouseEnter={e => { e.currentTarget.style.background = t.bgHover; }}
                onMouseLeave={e => { e.currentTarget.style.background = t.bgSecondary; }}
              ><AppIcon name="x" size={14} color={t.textPrimary} /><span style={{ fontSize: TYPO.small.size, marginLeft: 4 }}>{tr('detail.cancelCrop')}</span></button>
              {photo.cropRegion && (
                <button style={{ ...s(t).actionLabelBtn, border: `1px solid ${t.danger}`, color: t.danger }} onClick={resetCrop}
                  onMouseEnter={e => { e.currentTarget.style.background = t.dangerLight; }}
                  onMouseLeave={e => { e.currentTarget.style.background = t.bgSecondary; }}
                ><AppIcon name="rotate" size={14} color={t.danger} /><span style={{ fontSize: TYPO.small.size, marginLeft: 4 }}>复原</span></button>
              )}
            </>
          ) : (
            <button style={s(t).iconBtn} onClick={enterCropMode}><AppIcon name="crop" size={14} color={t.textPrimary} /></button>
          )}
        </div>
      </div>

      {/* Body */}
      <div style={s(t).body}>
        {/* Image area */}
        <div style={s(t).imageArea}
          onWheel={cropMode ? undefined : handleWheel}
          onMouseDown={cropMode ? undefined : handleMouseDown}
          onMouseMove={cropMode ? onCropMouseMove : handleMouseMove}
          onMouseUp={cropMode ? stopCropDrag : handleMouseUp}
          onMouseLeave={cropMode ? stopCropDrag : handleMouseUp}>
          <div ref={imageContainerRef} style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', maxWidth: '90%', maxHeight: '90%' }}>
          {/* When crop is saved (non-destructive), show only the cropped area via CSS clip + scale */}
          {(() => {
            const hasCrop = !cropMode && photo.cropRegion && photo.cropRegion !== null &&
              (Math.abs(photo.cropRegion.width - 1) > 0.01 || Math.abs(photo.cropRegion.height - 1) > 0.01 ||
               Math.abs(photo.cropRegion.x) > 0.01 || Math.abs(photo.cropRegion.y) > 0.01);
            const cropScale = hasCrop ? Math.max(1 / photo.cropRegion!.width, 1 / photo.cropRegion!.height) : 1;
            const cropOrigin = hasCrop
              ? `${(photo.cropRegion!.x + photo.cropRegion!.width / 2) * 100}% ${(photo.cropRegion!.y + photo.cropRegion!.height / 2) * 100}%`
              : 'center';
            const baseTransform = cropMode ? 'none' : `scale(${scale}) translate(${translate.x / scale}px, ${translate.y / scale}px)`;
            const flipTransform = [photo.flipH ? 'scaleX(-1)' : '', photo.flipV ? 'scaleY(-1)' : '', photo.rotation ? `rotate(${photo.rotation}deg)` : ''].filter(Boolean).join(' ');
            const combinedTransform = hasCrop
              ? `${baseTransform} scale(${cropScale}) ${flipTransform}`
              : cropMode ? 'none' : `${baseTransform} ${flipTransform}`;
            return (
              <div style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: hasCrop ? 'hidden' : 'visible',
                borderRadius: 14,
              }}>
                <div key={imageSrc} style={{ 
                  width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  animation: 'detailFadeIn 0.15s ease-out',
                }}>
                <CanvasRenderer src={imageSrc}
                  adjustments={effectiveAdj}
                  style={{
                    maxWidth: '100%',
                    maxHeight: '100%',
                    objectFit: 'contain',
                    borderRadius: 14,
                    transition: 'transform 0.05s ease-out',
                    userSelect: 'none',
                    transform: combinedTransform,
                    transformOrigin: hasCrop ? cropOrigin : 'center',
                  }}
                  alt={photo.fileName} draggable={false}
                />
                </div>
              </div>
            );
          })()}
          {appliedPreset && <div style={s(t).presetTag}><span style={{ display: 'inline-flex', alignItems: 'center', gap: SPACING.xs }}><AppIcon name="sparkles" size={12} color={t.textInverse} />{appliedPreset.name}</span></div>}
          {photo.customAdjustments && Object.keys(photo.customAdjustments).length > 0 && (
            <div style={{ ...s(t).presetTag, left: 'auto', right: 12, background: t.warning }}><AppIcon name="adjustments" size={12} color={t.textInverse} /></div>
          )}
          {photo.isReferenced && <div style={s(t).refTag}><span style={{ display: 'inline-flex', alignItems: 'center', gap: SPACING.xs }}><AppIcon name="link" size={11} color={t.textInverse} />{tr('detail.referenced')}</span></div>}
          {cropMode && photoBounds && (
            <div style={{ position: 'absolute', left: photoBounds.x, top: photoBounds.y, width: photoBounds.w, height: photoBounds.h, pointerEvents: 'none' }}>
              {/* Dark overlay with hole for crop region */}
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', pointerEvents: 'auto', cursor: dragHandle ? 'grabbing' : 'default' }}>
                {/* Crop selection */}
                <div style={{ position: 'absolute', left: `${cropRegion.x * 100}%`, top: `${cropRegion.y * 100}%`, width: `${cropRegion.width * 100}%`, height: `${cropRegion.height * 100}%`, background: 'rgba(255,255,255,0.06)', pointerEvents: 'auto' }}>
                  {/* Border */}
                  <div style={{ position: 'absolute', inset: -1, border: '2px solid rgba(255,255,255,0.92)', borderRadius: 2, pointerEvents: 'none' }} />
                  {/* Move handle (drag to reposition) */}
                  <div style={{ position: 'absolute', inset: 0, cursor: dragHandle === 'move' ? 'grabbing' : 'grab' }}
                    onMouseDown={e => startCropDrag(e, 'move')} />
                  {/* Preset ratio buttons */}
                  <div style={{ display: 'flex', gap: 4, position: 'absolute', top: -28, left: 0, pointerEvents: 'auto' }}>
                    {cropPresets.map(cp => (
                      <button key={cp.value} style={{ padding: '2px 8px', border: 'none', borderRadius: 6, background: cropPreset === cp.value ? t.accent : t.bgSecondary, color: cropPreset === cp.value ? t.textInverse : t.textSecondary, cursor: 'pointer', fontSize: 10, transition: 'all 0.15s ease' }}
                        onClick={e => { e.stopPropagation(); applyCropPreset(cp.value); }}>{cp.label}</button>
                    ))}
                  </div>
                  {/* Corner handles */}
                  <div style={{ position: 'absolute', width: 12, height: 12, top: -6, left: -6, cursor: 'nw-resize' }} onMouseDown={e => { e.stopPropagation(); startCropDrag(e, 'nw'); }}><div style={{ width: 8, height: 8, borderRadius: '50%', background: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.5)' }} /></div>
                  <div style={{ position: 'absolute', width: 12, height: 12, top: -6, right: -6, cursor: 'ne-resize' }} onMouseDown={e => { e.stopPropagation(); startCropDrag(e, 'ne'); }}><div style={{ width: 8, height: 8, borderRadius: '50%', background: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.5)' }} /></div>
                  <div style={{ position: 'absolute', width: 12, height: 12, bottom: -6, left: -6, cursor: 'sw-resize' }} onMouseDown={e => { e.stopPropagation(); startCropDrag(e, 'sw'); }}><div style={{ width: 8, height: 8, borderRadius: '50%', background: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.5)' }} /></div>
                  <div style={{ position: 'absolute', width: 12, height: 12, bottom: -6, right: -6, cursor: 'se-resize' }} onMouseDown={e => { e.stopPropagation(); startCropDrag(e, 'se'); }}><div style={{ width: 8, height: 8, borderRadius: '50%', background: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.5)' }} /></div>
                  {/* Edge handles */}
                  <div style={{ position: 'absolute', height: 10, top: -5, left: 12, right: 12, cursor: 'n-resize' }} onMouseDown={e => { e.stopPropagation(); startCropDrag(e, 'n'); }} />
                  <div style={{ position: 'absolute', height: 10, bottom: -5, left: 12, right: 12, cursor: 's-resize' }} onMouseDown={e => { e.stopPropagation(); startCropDrag(e, 's'); }} />
                  <div style={{ position: 'absolute', width: 10, left: -5, top: 12, bottom: 12, cursor: 'w-resize' }} onMouseDown={e => { e.stopPropagation(); startCropDrag(e, 'w'); }} />
                  <div style={{ position: 'absolute', width: 10, right: -5, top: 12, bottom: 12, cursor: 'e-resize' }} onMouseDown={e => { e.stopPropagation(); startCropDrag(e, 'e'); }} />
                </div>
              </div>
            </div>
          )}</div>
        </div>

        {/* Right panel */}
        <div style={s(t).panel}>
          {/* Tabs */}
          <div style={s(t).tabs}>
            {tabs.map(tab => (
              <button key={tab.key} style={{
                ...s(t).tab,
                color: activeTab === tab.key ? t.accent : t.textSecondary,
                border: activeTab === tab.key ? `1px solid ${t.accent}` : `1px solid transparent`,
                background: activeTab === tab.key ? t.accentBg : 'transparent',
                      boxShadow: activeTab === tab.key ? `inset 0 1px 0 rgba(0,0,0,0.2), 0 0 0 1px ${t.accent}22` : 'none',
                fontWeight: activeTab === tab.key ? 600 : 500,
              }}
                onClick={() => setActiveTab(tab.key)}
              ><span style={{ display: 'inline-flex', alignItems: 'center', gap: SPACING.xs }}>{tab.icon}{tab.label}</span></button>
            ))}
          </div>

          <div style={s(t).tabContent}>
            {/* Info tab */}
            {activeTab === 'info' && (
              <div>
                {/* Histogram */}
                <div style={s(t).surfaceSection}>
                  <div style={s(t).sectionTitle}>
                    {tr('detail.histogram')}
                  </div>
                  <Histogram imageUrl={imageSrc} theme={t} width={280} height={60} />
                </div>

                {/* Rating */}
                <div style={s(t).surfaceSection}>
                  <label style={s(t).label}>{tr('detail.rating')}</label>
                  <div style={{ display: 'flex', gap: SPACING.sm, padding: `${SPACING.xs}px 0` }}>{[1,2,3,4,5].map(n => (
                    <button key={n} style={{
                      ...s(t).starBtn,
                      color: photo.rating >= n ? t.ratingStar : t.textTertiary,
                      background: photo.rating >= n ? t.accentBg : `linear-gradient(180deg, ${t.bgSecondary}, ${t.bgPrimary})`,
                      borderColor: photo.rating >= n ? t.accent : t.borderLight,
                      boxShadow: photo.rating >= n ? `inset 0 1px 0 rgba(0,0,0,0.2), 0 0 0 1px ${t.accent}33` : 'inset 0 1px 0 rgba(0,0,0,0.18)',
                    }}
                      onClick={() => onUpdatePhoto(photo.id, { rating: photo.rating === n ? 0 : (n as any) })}>
                      <AppIcon name="star" size={15} color={photo.rating >= n ? t.ratingStar : t.textTertiary} filled={photo.rating >= n} />
                    </button>
                  ))}</div>
                </div>

                {/* Color label */}
                <div style={s(t).surfaceSection}>
                  <label style={s(t).label}>{tr('detail.colorLabel')}</label>
                  <div style={{ display: 'flex', gap: SPACING.sm, flexWrap: 'wrap' }}>
                    {labelOptions.map(opt => (
                      <button key={opt.key} style={{
                        width: 24, height: 24, borderRadius: '50%', border: `1px solid ${photo.colorLabel === opt.key ? t.accent : t.border}`, cursor: 'pointer',
                        background: opt.color,
                        outline: photo.colorLabel === opt.key ? `2px solid ${t.accent}` : 'none',
                        outlineOffset: 2,
                        transition: TRANSITION.all,
                        boxShadow: photo.colorLabel === opt.key ? `0 0 0 2px ${t.accentLight}` : 'inset 0 0 0 1px rgba(0,0,0,0.2)',
                      }}
                        onClick={() => onUpdatePhoto(photo.id, { colorLabel: opt.key })}
                        title={tr(opt.labelKey)}
                      />
                    ))}
                  </div>
                </div>

                {/* Title */}
                <div style={s(t).surfaceSection}>
                  <label style={s(t).label}>{tr('detail.title')}</label>
                  <InlineEdit
                    value={photo.title || ''}
                    onSave={(val) => onUpdatePhoto(photo.id, { title: val })}
                    placeholder={tr('detail.titlePlaceholder')}
                    theme={t}
                  />
                </div>

                {/* Description */}
                <div style={s(t).surfaceSection}>
                  <label style={s(t).label}>{tr('detail.description')}</label>
                  <InlineEdit
                    value={photo.description || ''}
                    onSave={(val) => onUpdatePhoto(photo.id, { description: val })}
                    placeholder={tr('detail.descPlaceholder')}
                    theme={t}
                    multiline
                  />
                </div>

                {/* Date Taken - editable */}
                <div style={s(t).surfaceSection}>
                  <label style={s(t).label}>{tr('detail.editDate')}</label>
                  <input
                    type="datetime-local"
                    value={photo.dateTaken ? photo.dateTaken.slice(0, 16) : ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      onUpdatePhoto(photo.id, { dateTaken: val ? new Date(val).toISOString() : null });
                    }}
                    style={{ ...s(t).fieldInput, width: '100%' }}
                  />
                </div>

                {/* Camera Model - editable override */}
                <div style={s(t).surfaceSection}>
                  <label style={s(t).label}>{tr('detail.camera')}</label>
                  <InlineEdit
                    value={photo.cameraModel || ''}
                    onSave={(val) => onUpdatePhoto(photo.id, { cameraModel: val || null })}
                    placeholder={tr('detail.cameraPlaceholder')}
                    theme={t}
                  />
                </div>

                {/* GPS Location */}
                <div style={s(t).surfaceSection}>
                  <label style={s(t).label}>{tr('detail.location')}</label>
                  <div style={{ display: 'flex', gap: SPACING.xs, alignItems: 'center' }}>
                    <input
                      type="number"
                      step="any"
                      placeholder={tr('detail.lat')}
                      value={photo.latitude ?? ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        onUpdatePhoto(photo.id, { latitude: val ? parseFloat(val) : null });
                      }}
                      style={{ ...s(t).fieldInput, flex: 1, fontSize: TYPO.small.size }}
                    />
                    <input
                      type="number"
                      step="any"
                      placeholder={tr('detail.lng')}
                      value={photo.longitude ?? ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        onUpdatePhoto(photo.id, { longitude: val ? parseFloat(val) : null });
                      }}
                      style={{ ...s(t).fieldInput, flex: 1, fontSize: TYPO.small.size }}
                    />
                  </div>
                </div>

                {/* Tags */}
                <div style={s(t).surfaceSection}>
                  <label style={s(t).label}>{tr('detail.tags')}</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: SPACING.xs, marginBottom: SPACING.sm }}>
                    {photo.tags.map(tag => (
                      <span key={tag} style={s(t).tagChip}>
                        {tag}
                        <button style={s(t).tagRemoveBtn} onClick={() => onUpdatePhoto(photo.id, { tags: photo.tags.filter(t2 => t2 !== tag) })}><AppIcon name="close" size={10} color={t.textTertiary} /></button>
                      </span>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: SPACING.xs }}>
                    <input style={s(t).fieldInput} value={tagInput} onChange={e => setTagInput(e.target.value)}
                      placeholder={tr('detail.tagPlaceholder')}
                      onKeyDown={e => { if (e.key === 'Enter' && tagInput.trim()) { onUpdatePhoto(photo.id, { tags: [...photo.tags, tagInput.trim()] }); setTagInput(''); } }}
                    />
                    <button style={s(t).addTagBtn} onClick={() => { if (tagInput.trim()) { onUpdatePhoto(photo.id, { tags: [...photo.tags, tagInput.trim()] }); setTagInput(''); } }}>
                      {tr('detail.addTag')}
                    </button>
                  </div>
                </div>

                {/* Metadata */}
                <div style={s(t).surfaceSection}>
                  <label style={s(t).label}>{tr('detail.meta')}</label>
                  {[
                    [tr('detail.filename'), photo.fileName],
                    [tr('detail.format'), photo.fileFormat],
                    [tr('detail.size'), (photo.fileSize / 1048576).toFixed(1) + ' MB'],
                    [tr('detail.resolution'), `${photo.width} x ${photo.height}`],
                    ['ISO', photo.iso?.toString() || '—'],
                    [tr('detail.aperture'), photo.aperture ? `f/${photo.aperture}` : '—'],
                    [tr('detail.shutter'), photo.shutterSpeed || '—'],
                    [tr('detail.focal'), photo.focalLength ? `${photo.focalLength}mm` : '—'],
                    ['Camera', photo.cameraModel || '—'],
                    ['Lens', photo.lensModel || '—'],
                    [tr('detail.editDate'), photo.dateTaken ? new Date(photo.dateTaken).toLocaleString() : '—'],
                  ].map(([k, v]) => (
                    <div key={k} style={s(t).metaRow}>
                      <span style={s(t).metaLabel}>{k}</span>
                      <span style={s(t).metaValue}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Adjust tab - NEW: full parameter slider editor */}
            {activeTab === 'adjust' && (
              <div>
                <AdjustmentPanel
                  photo={photo}
                  appliedPreset={appliedPreset || null}
                  onUpdatePhoto={onUpdatePhoto}
                  theme={t}
                />
                <div style={s(t).surfaceSection}>
                  <div style={s(t).sectionTitle}>
                    {tr('detail.transform')}
                  </div>
                  <div style={{ display: 'flex', gap: SPACING.sm, flexWrap: 'wrap' }}>
                    <button style={s(t).actionBtn} onClick={handleFlipH}
                      onMouseEnter={e => { e.currentTarget.style.background = t.bgHover; }}
                      onMouseLeave={e => { e.currentTarget.style.background = t.bgCard; }}
                    >{tr('detail.flipH')}</button>
                    <button style={s(t).actionBtn} onClick={handleFlipV}
                      onMouseEnter={e => { e.currentTarget.style.background = t.bgHover; }}
                      onMouseLeave={e => { e.currentTarget.style.background = t.bgCard; }}
                    >{tr('detail.flipV')}</button>
                    <button style={s(t).actionBtn} onClick={handleRotate}
                      onMouseEnter={e => { e.currentTarget.style.background = t.bgHover; }}
                      onMouseLeave={e => { e.currentTarget.style.background = t.bgCard; }}
                    >{tr('detail.rotate')}</button>
                    <button style={s(t).actionBtn} onClick={enterCropMode}
                      onMouseEnter={e => { e.currentTarget.style.background = t.bgHover; }}
                      onMouseLeave={e => { e.currentTarget.style.background = t.bgCard; }}
                    >{tr('detail.crop')}</button>
                  </div>
                </div>
                {appliedPreset ? (
                  <div style={s(t).surfaceSection}>
                    <div style={{ fontSize: TYPO.small.size, color: t.textSecondary, marginBottom: SPACING.sm }}>
                      {tr('detail.presetApplied')}: <strong style={{ color: t.accent }}>{appliedPreset.name}</strong>
                    </div>
                    <button style={{ ...s(t).actionBtn, borderColor: t.danger, color: t.danger }}
                      onClick={() => onRemovePreset(photo.id)}
                      onMouseEnter={e => { e.currentTarget.style.background = t.dangerLight; }}
                      onMouseLeave={e => { e.currentTarget.style.background = t.bgCard; }}
                    >{tr('detail.removePreset')}</button>
                  </div>
                ) : null}
              </div>
            )}

            {/* Presets tab */}
            {activeTab === 'presets' && (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: SPACING.sm }}>
                  {presets.slice(0, 30).map(preset => (
                    <button key={preset.id} style={{
                      padding: `${SPACING.sm}px ${SPACING.xs}px`,
                      borderRadius: RADIUS.sm, cursor: 'pointer', fontSize: TYPO.small.size,
                      textAlign: 'center', display: 'block', width: '100%',
                      border: `1px solid ${photo.presetApplied === preset.id ? t.accent : t.border}`,
                      background: photo.presetApplied === preset.id ? t.accentLight : t.bgCard,
                      color: photo.presetApplied === preset.id ? t.accent : t.textPrimary,
                      fontWeight: photo.presetApplied === preset.id ? 600 : 400,
                      transition: TRANSITION.all,
                    }}
                      onClick={() => onApplyPreset(photo.id, preset.id)}
                      onMouseEnter={e => { if (photo.presetApplied !== preset.id) e.currentTarget.style.background = t.bgHover; }}
                      onMouseLeave={e => { if (photo.presetApplied !== preset.id) e.currentTarget.style.background = t.bgCard; }}
                    >{preset.name}</button>
                  ))}
                </div>
              </div>
            )}

            {/* Export tab */}
            {activeTab === 'export' && (
              <div>
                <div style={s(t).surfaceSection}>
                  <label style={s(t).label}>{tr('detail.format')}</label>
                  <Select theme={t} value={exportFormat} onChange={v => setExportFormat(v as ExportFormat)} options={EXPORT_FORMATS.map(f => ({ value: f.value, label: f.label }))} />
                </div>
                <div style={s(t).surfaceSection}>
                  <label style={s(t).label}>{tr('detail.quality')}: {exportQuality}%</label>
                  <input type="range" min={1} max={100} value={exportQuality} onChange={e => setExportQuality(Number(e.target.value))} style={{ width: '100%' }} />
                </div>
                <div style={s(t).surfaceSection}>
                  <label style={s(t).label}>{tr('export.namingTemplate')}</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: SPACING.sm }}>
                    {NAMING_PRESETS.map(p => {
                      const isActive = exportNamingTemplate === p.value;
                      return (
                        <button key={p.value}
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: SPACING.xs,
                            padding: SPACING.md + "px " + SPACING.sm + "px",
                            borderRadius: RADIUS.md,
                            border: "1.5px solid " + (isActive ? t.accent : t.borderLight),
                            background: isActive ? t.accentBg : t.bgPrimary,
                            cursor: 'pointer',
                            textAlign: 'center',
                            transition: TRANSITION.all,
                            boxSizing: 'border-box',
                            outline: 'none',
                            minHeight: 46,
                          }}
                          onClick={() => setExportNamingTemplate(p.value)}
                          onMouseEnter={e => {
                            if (!isActive) {
                              e.currentTarget.style.borderColor = t.accent;
                              e.currentTarget.style.background = t.bgHover;
                            }
                          }}
                          onMouseLeave={e => {
                            if (!isActive) {
                              e.currentTarget.style.borderColor = t.borderLight;
                              e.currentTarget.style.background = t.bgPrimary;
                            }
                          }}
                        >
                          <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace', fontSize: TYPO.small.size, fontWeight: isActive ? 600 : 400, color: isActive ? t.accent : t.textPrimary, lineHeight: 1.3, textAlign: 'center' }}>{p.value}</span>
                          <span style={{ fontSize: TYPO.tiny.size, fontWeight: 400, color: isActive ? t.accent : t.textTertiary, lineHeight: 1.3, textAlign: 'center' }}>{tr(p.labelKey)}</span>
                        </button>
                      );
                    })}
                  </div>
                  <div style={{ fontSize: TYPO.tiny.size, color: t.textTertiary, marginTop: SPACING.sm }}>
                    {tr('export.namingPreview')}: <span style={{ fontFamily: 'monospace', color: t.textSecondary }}>{previewNamingTemplate(exportNamingTemplate)}.{exportFormat}</span>
                  </div>
                </div>
                <div style={s(t).surfaceSection}>
                  <div style={s(t).sectionTitle}>{tr('detail.exportOptions')}</div>
                  <div style={s(t).checkboxGroup}>
                  <label style={s(t).checkboxLabel}><input type="checkbox" checked={exportPreserveExif} onChange={e => setExportPreserveExif(e.target.checked)} />{tr('detail.preservedExif')}</label>
                  <label style={s(t).checkboxLabel}><input type="checkbox" checked={exportApplyPreset} onChange={e => setExportApplyPreset(e.target.checked)} />{tr('detail.applyPresetSettings')}</label>
                  <label style={s(t).checkboxLabel}><input type="checkbox" checked={exportApplyCrop} onChange={e => setExportApplyCrop(e.target.checked)} />{tr('detail.applyCrop')}</label>
                  <label style={s(t).checkboxLabel}><input type="checkbox" checked={exportApplyRotationFlip} onChange={e => setExportApplyRotationFlip(e.target.checked)} />{tr('detail.applyRotationFlip')}</label>
                </div>
                </div>
                <button style={s(t).exportBtn} onClick={handleExport}
                  onMouseEnter={e => { e.currentTarget.style.background = t.accentHover; }}
                  onMouseLeave={e => { e.currentTarget.style.background = t.accent; }}
                >{tr('detail.exportNow')}</button>
                {exportResultPath && (
                  <button style={{ ...s(t).actionBtn, width: '100%', marginTop: SPACING.sm, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: SPACING.xs }}
                    onClick={async () => { try { await window.photoForge.openFolder(exportResultPath); } catch { /* */ } }}
                    onMouseEnter={e => { e.currentTarget.style.background = t.accentLight; e.currentTarget.style.borderColor = t.accent; }}
                    onMouseLeave={e => { e.currentTarget.style.background = t.bgCard; e.currentTarget.style.borderColor = t.borderLight; }}
                  ><span style={{ display: 'inline-flex', alignItems: 'center', gap: SPACING.xs }}><AppIcon name="folder" size={14} color={t.accent} />{tr('export.openFolder')}</span></button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Filmstrip — Lightroom-style thumbnail navigation */}
      {allPhotos.length > 1 && (
        <div style={s(t).filmstrip}>
          <div style={s(t).filmstripScroll}>
            {allPhotos.map(p => {
              const isActive = p.id === photo.id;
              return (
                <button
                  key={p.id}
                  style={s(t).filmstripThumb(t, isActive)}
                  onClick={() => onNavigate(p.id)}
                  title={p.fileName}
                >
                  <img
                    src={getCachedOrRawUrl(p, false)}
                    loading="lazy"
                    style={s(t).filmstripImg}
                    alt=""
                    draggable={false}
                  />
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

const s = (t: Theme): Record<string, any> => ({
  container: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  topBar: { display: 'flex', alignItems: 'center', gap: SPACING.md, padding: `${SPACING.md}px ${SPACING.xl}px ${SPACING.sm}`, background: t.bgPrimary, boxShadow: 'none' },
  backBtn: { padding: `${SPACING.sm}px ${SPACING.lg}px`, border: 'none', borderRadius: 12, background: t.bgSecondary, color: t.textPrimary, cursor: 'pointer', fontSize: TYPO.body.size, transition: TRANSITION.all, boxShadow: 'none' },
  photoName: { flex: 1, fontSize: TYPO.body.size, color: t.textPrimary, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  topActions: { display: 'flex', alignItems: 'center', gap: SPACING.sm },
  iconBtn: { width: 32, height: 32, border: 'none', borderRadius: 12, background: t.bgSecondary, color: t.textPrimary, cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: TRANSITION.all, boxShadow: 'none' },
  actionLabelBtn: { display: 'inline-flex', alignItems: 'center', padding: `${SPACING.xs}px ${SPACING.md}px`, border: 'none', borderRadius: 10, background: t.bgSecondary, color: t.textPrimary, cursor: 'pointer', fontSize: TYPO.body.size, transition: TRANSITION.all, boxShadow: 'none', whiteSpace: 'nowrap' },
  body: { flex: 1, display: 'flex', overflow: 'hidden', background: t.bgPhotoStage },
  imageArea: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: t.bgPhotoStage, position: 'relative', overflow: 'hidden' },
  presetTag: { position: 'absolute', top: 12, left: 12, padding: `${SPACING.xs}px ${SPACING.md}px`, background: t.accent, borderRadius: RADIUS.sm, color: t.textInverse, fontSize: TYPO.small.size },
  refTag: { position: 'absolute', top: 12, right: 12, padding: `${SPACING.xs}px ${SPACING.md}px`, background: 'rgba(0,0,0,0.5)', borderRadius: RADIUS.sm, color: t.textInverse, fontSize: TYPO.tiny.size, border: `1px solid rgba(0,0,0,0.26)` },

  panel: { width: 372, margin: `${SPACING.lg}px ${SPACING.lg}px ${SPACING.lg}px 0`, background: t.panelBg, borderRadius: 18, display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 18px 40px rgba(0,0,0,0.28)' },
  tabs: { display: 'flex', padding: `0 ${SPACING.sm}px`, background: t.panelBg },
  tab: { flex: 1, padding: `${SPACING.md}px 0`, border: 'none', background: 'transparent', cursor: 'pointer', fontSize: TYPO.caption.size, transition: TRANSITION.all, borderRadius: 12, margin: `${SPACING.xs}px ${SPACING.xs}px ${SPACING.sm}px` },
  tabContent: { flex: 1, overflowY: 'auto', padding: `${SPACING.lg}px ${SPACING.lg}px ${SPACING.xl}px`, minHeight: 0 },
  field: { marginBottom: SPACING.lg },
  label: { display: 'block', fontSize: TYPO.small.size, color: t.textTertiary, marginBottom: SPACING.xs },
  sectionTitle: { fontSize: TYPO.small.size, fontWeight: 700, color: t.textPrimary, marginBottom: SPACING.md, textTransform: 'uppercase', letterSpacing: 0.8 },
  surfaceSection: { marginBottom: SPACING.md, padding: 0, background: 'transparent', borderRadius: 0, boxShadow: 'none' },
  starBtn: { border: 'none', background: t.bgSecondary, cursor: 'pointer', fontSize: 20, transition: TRANSITION.all, width: 32, height: 32, borderRadius: 12, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'none' },
  colorBtn: { width: 24, height: 24, borderRadius: '50%', border: 'none', cursor: 'pointer', transition: TRANSITION.all },
  tagChip: { display: 'inline-flex', alignItems: 'center', gap: SPACING.xs, padding: `4px ${SPACING.sm}px`, background: t.bgSecondary, borderRadius: RADIUS.pill, fontSize: TYPO.small.size, color: t.textPrimary },
  tagRemoveBtn: { border: 'none', background: 'transparent', color: t.textTertiary, cursor: 'pointer', fontSize: TYPO.small.size, padding: 0 },
  tagInput: { flex: 1, padding: `${SPACING.sm}px ${SPACING.md}px`, border: `1px solid ${t.border}`, borderRadius: 12, background: t.bgInput, color: t.textPrimary, fontSize: TYPO.small.size, outline: 'none' },
  fieldInput: { padding: `${SPACING.sm}px ${SPACING.md}px`, border: `1px solid ${t.border}`, borderRadius: 12, background: t.bgInput, color: t.textPrimary, fontSize: TYPO.small.size, outline: 'none', boxShadow: 'none' },
  addTagBtn: { padding: `${SPACING.sm}px ${SPACING.md}px`, border: 'none', borderRadius: 12, background: t.accent, color: t.textInverse, cursor: 'pointer', fontSize: 14, transition: TRANSITION.all, fontWeight: 600 },
  separator: { margin: `${SPACING.lg}px 0` },
  metaRow: { display: 'flex', justifyContent: 'space-between', gap: SPACING.md, padding: `${SPACING.sm}px 0`, borderRadius: 0, background: 'transparent', marginBottom: 0, borderBottom: 'none' },
  metaLabel: { fontSize: TYPO.small.size, color: t.textTertiary },
  metaValue: { fontSize: TYPO.small.size, color: t.textPrimary, textAlign: 'right' },
  presetBtn: { padding: `${SPACING.sm}px ${SPACING.xs}px`, borderRadius: RADIUS.sm, cursor: 'pointer', fontSize: TYPO.small.size, textAlign: 'center', display: 'block', width: '100%', border: 'none', marginBottom: SPACING.xs, background: t.bgCard, transition: TRANSITION.all },
  editSection: { marginBottom: SPACING.lg, padding: `${SPACING.md}px ${SPACING.lg}px`, background: t.bgPhotoSurface, borderRadius: 14 },
  editSectionTitle: { fontSize: TYPO.body.size, fontWeight: 600, color: t.textPrimary, marginBottom: SPACING.sm },
  smallLinkBtn: { border: 'none', background: 'transparent', color: t.accent, cursor: 'pointer', fontSize: TYPO.tiny.size, padding: 0, transition: TRANSITION.all },
  selectInput: { width: '100%', padding: `${SPACING.sm}px ${SPACING.md}px`, border: `1px solid ${t.border}`, borderRadius: 12, background: t.bgInput, color: t.textPrimary, fontSize: TYPO.small.size, outline: 'none', boxShadow: 'none' },
  checkboxGroup: { display: 'flex', flexDirection: 'column', gap: SPACING.sm },
  checkboxLabel: { display: 'flex', alignItems: 'center', gap: SPACING.sm, fontSize: TYPO.small.size, color: t.textSecondary, cursor: 'pointer', padding: `${SPACING.sm}px ${SPACING.md}px`, borderRadius: 12, background: t.bgPrimary, boxShadow: 'none' },
  exportBtn: { width: '100%', padding: `${SPACING.md}px`, border: 'none', borderRadius: 12, background: t.accent, color: t.textInverse, cursor: 'pointer', fontSize: TYPO.body.size, fontWeight: 600, marginTop: SPACING.sm, transition: TRANSITION.all },
  actionBtn: { padding: `${SPACING.sm}px ${SPACING.lg}px`, border: 'none', borderRadius: 12, background: t.bgSecondary, color: t.textPrimary, cursor: 'pointer', fontSize: TYPO.small.size, transition: TRANSITION.all, boxShadow: 'none' },

  // Filmstrip
  filmstrip: {
    display: 'flex',
    alignItems: 'center',
    height: 64,
    background: t.bgPrimary,
    borderTop: `1px solid ${t.borderLight}`,
    padding: `0 ${SPACING.md}px`,
    flexShrink: 0,
    overflow: 'hidden',
  } as React.CSSProperties,
  filmstripScroll: {
    display: 'flex',
    gap: SPACING.sm,
    overflow: 'auto',
    padding: `${SPACING.sm}px 0`,
    alignItems: 'center',
  } as React.CSSProperties,
  filmstripThumb: (t: Theme, active: boolean): React.CSSProperties => ({
    flexShrink: 0,
    width: 64,
    height: 44,
    borderRadius: RADIUS.sm,
    overflow: 'hidden',
    border: active ? `2px solid ${t.accent}` : `2px solid transparent`,
    cursor: 'pointer',
    padding: 0,
    background: t.bgSecondary,
    transition: `opacity ${DURATION.fast}ms ${EASING.out}`,
    opacity: active ? 1 : 0.55,
  }),
  filmstripImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  } as React.CSSProperties,
});
