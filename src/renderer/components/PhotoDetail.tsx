import React, { useState, useRef, useCallback, useEffect } from 'react';
import { PhotoFile, Preset, PresetAdjustment, ExportFormat, CropRegion } from '../../shared/types';
import { Theme, SPACING, RADIUS, TYPO, DURATION, EASING, TRANSITION, SHADOW } from '../styles/theme';
import { AdjustmentPanel, buildEffectiveFilter } from './AdjustmentPanel';
import { Histogram } from './Histogram';
import { CanvasRenderer, useEffectiveAdjustments } from './CanvasRenderer';
import { useI18n } from '../i18n';
import { AppIcon } from './AppIcon';

interface PhotoDetailProps {
  photo: PhotoFile;
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

export const PhotoDetail: React.FC<PhotoDetailProps> = ({ photo, presets, onApplyPreset, onRemovePreset, onUpdatePhoto, onBack, onToast, theme: t, defaultExportFormat, defaultExportQuality, preserveExif, colorSpace }) => {
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
  const confirmCrop = () => { onUpdatePhoto(photo.id, { cropRegion }); setCropMode(false); };
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
  const [showPlaceholderMenu, setShowPlaceholderMenu] = useState(false);
  const [exportResultPath, setExportResultPath] = useState<string | null>(null);

  const PLACEHOLDERS = [
    { key: '{filename}', labelKey: 'export.placeholders.filename' },
    { key: '{date}', labelKey: 'export.placeholders.date' },
    { key: '{camera}', labelKey: 'export.placeholders.camera' },
    { key: '{preset}', labelKey: 'export.placeholders.preset' },
    { key: '{index}', labelKey: 'export.placeholders.index' },
    { key: '{rating}', labelKey: 'export.placeholders.rating' },
  ];

  const insertPlaceholder = (key: string) => {
    setExportNamingTemplate(prev => prev + key);
    setShowPlaceholderMenu(false);
  };

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
  const [fullResSrc, setFullResSrc] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    window.photoForge.getPhotoFull(photo.id).then(url => {
      if (!cancelled && url) setFullResSrc(url);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [photo.id]);
  // Full-res if loaded, otherwise use protocol (4000px) as intermediate, then thumbnail as last resort
  const imageSrc = fullResSrc || photo.displayUrl || photo.thumbnailPath || `photoforge://raw/${encodeURIComponent(photo.filePath)}`;

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
          <button style={s(t).iconBtn} onClick={handleFlipH} title={tr('detail.flipH')}
            onMouseEnter={e => { e.currentTarget.style.background = t.bgHover; }}
            onMouseLeave={e => { e.currentTarget.style.background = t.bgSecondary; }}
          ><AppIcon name="flipH" size={14} color={t.textPrimary} /></button>
          <button style={s(t).iconBtn} onClick={handleFlipV} title={tr('detail.flipV')}
            onMouseEnter={e => { e.currentTarget.style.background = t.bgHover; }}
            onMouseLeave={e => { e.currentTarget.style.background = t.bgSecondary; }}
          ><AppIcon name="flipV" size={14} color={t.textPrimary} /></button>
          <button style={s(t).iconBtn} onClick={handleRotate} title={tr('detail.rotate')}
            onMouseEnter={e => { e.currentTarget.style.background = t.bgHover; }}
            onMouseLeave={e => { e.currentTarget.style.background = t.bgSecondary; }}
          ><AppIcon name="rotate" size={14} color={t.textPrimary} /></button>
          <button style={s(t).iconBtn} onClick={resetView} title={tr('detail.resetView')}
            onMouseEnter={e => { e.currentTarget.style.background = t.bgHover; }}
            onMouseLeave={e => { e.currentTarget.style.background = t.bgSecondary; }}
          ><AppIcon name="search" size={14} color={t.textPrimary} /></button>
          {cropMode ? (
            <>
              <button style={{ ...s(t).iconBtn, background: t.accent, color: t.textInverse }} onClick={confirmCrop}>{tr('detail.confirmCrop')}</button>
              <button style={s(t).iconBtn} onClick={() => setCropMode(false)}>{tr('detail.cancelCrop')}</button>
            </>
          ) : (
            <button style={s(t).iconBtn} onClick={() => setCropMode(true)}><AppIcon name="crop" size={14} color={t.textPrimary} /></button>
          )}
        </div>
      </div>

      {/* Body */}
      <div style={s(t).body}>
        {/* Image area */}
        <div style={s(t).imageArea} onWheel={handleWheel} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
          <CanvasRenderer src={imageSrc}
            adjustments={effectiveAdj}
            style={{
              ...s(t).image,
              transform: `scale(${scale}) translate(${translate.x / scale}px, ${translate.y / scale}px) ${[photo.flipH ? 'scaleX(-1)' : '', photo.flipV ? 'scaleY(-1)' : '', photo.rotation ? `rotate(${photo.rotation}deg)` : ''].filter(Boolean).join(' ')}`,
            }}
            alt={photo.fileName} draggable={false}
          />
          {appliedPreset && <div style={s(t).presetTag}><span style={{ display: 'inline-flex', alignItems: 'center', gap: SPACING.xs }}><AppIcon name="sparkles" size={12} color={t.textInverse} />{appliedPreset.name}</span></div>}
          {photo.customAdjustments && Object.keys(photo.customAdjustments).length > 0 && (
            <div style={{ ...s(t).presetTag, left: 'auto', right: 12, background: t.warning }}><AppIcon name="adjustments" size={12} color={t.textInverse} /></div>
          )}
          {photo.isReferenced && <div style={s(t).refTag}><span style={{ display: 'inline-flex', alignItems: 'center', gap: SPACING.xs }}><AppIcon name="link" size={11} color={t.textInverse} />{tr('detail.referenced')}</span></div>}
          {cropMode && (
            <div style={s(t).cropOverlay}>
              <div style={{ ...s(t).cropBox, left: `${cropRegion.x * 100}%`, top: `${cropRegion.y * 100}%`, width: `${cropRegion.width * 100}%`, height: `${cropRegion.height * 100}%` }}>
                <div style={{ display: 'flex', gap: 4, position: 'absolute', top: -28, left: 0 }}>
                  {cropPresets.map(cp => (
                    <button key={cp.value} style={{ ...s(t).cropPresetBtn, background: cropPreset === cp.value ? t.accent : t.bgSecondary, color: cropPreset === cp.value ? t.textInverse : t.textSecondary }}
                      onClick={() => applyCropPreset(cp.value)}>{cp.label}</button>
                  ))}
                </div>
              </div>
            </div>
          )}
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
                  <label style={s(t).label}>Camera</label>
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
                    <button style={s(t).actionBtn} onClick={() => setCropMode(true)}
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
                  <select style={s(t).selectInput} value={exportFormat} onChange={e => setExportFormat(e.target.value as ExportFormat)}>
                    {EXPORT_FORMATS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                  </select>
                </div>
                <div style={s(t).surfaceSection}>
                  <label style={s(t).label}>{tr('detail.quality')}: {exportQuality}%</label>
                  <input type="range" min={1} max={100} value={exportQuality} onChange={e => setExportQuality(Number(e.target.value))} style={{ width: '100%' }} />
                </div>
                <div style={s(t).surfaceSection}>
                  <label style={s(t).label}>{tr('export.namingTemplate')}</label>
                  <div style={{ display: 'flex', gap: SPACING.xs }}>
                    <input style={{ ...s(t).selectInput, flex: 1 }} value={exportNamingTemplate} onChange={e => setExportNamingTemplate(e.target.value)}
                      placeholder="{{filename}}"
                    />
                    <div style={{ position: 'relative' }}>
                      <button style={{ ...s(t).actionBtn, fontSize: TYPO.small.size, padding: `${SPACING.xs}px ${SPACING.sm}px`, whiteSpace: 'nowrap' }}
                        onClick={() => setShowPlaceholderMenu(!showPlaceholderMenu)}
                        onMouseEnter={e => { e.currentTarget.style.background = t.accentLight; }}
                        onMouseLeave={e => { e.currentTarget.style.background = t.bgCard; }}
                      ><span style={{ display: 'inline-flex', alignItems: 'center', gap: SPACING.xs }}>{tr('detail.insert')}<AppIcon name="chevronDown" size={12} color={t.textSecondary} /></span></button>
                      {showPlaceholderMenu && (
                        <div style={{ position: 'absolute', right: 0, top: '100%', marginTop: 2, background: t.dropdownBg, borderRadius: RADIUS.md, padding: SPACING.xs, boxShadow: SHADOW.lg, zIndex: 200, minWidth: 180 }}>
                          {PLACEHOLDERS.map(p => (
                            <button key={p.key} style={{ display: 'block', width: '100%', padding: `${SPACING.xs}px ${SPACING.sm}px`, border: 'none', borderRadius: RADIUS.sm, background: 'transparent', color: t.textPrimary, cursor: 'pointer', fontSize: TYPO.small.size, textAlign: 'left', transition: TRANSITION.bg }}
                              onClick={() => insertPlaceholder(p.key)}
                              onMouseEnter={e => { e.currentTarget.style.background = t.accentLight; }}
                              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                            ><span style={{ color: t.accent, fontFamily: 'monospace', marginRight: SPACING.sm }}>{p.key}</span>{tr(p.labelKey)}</button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div style={{ fontSize: TYPO.tiny.size, color: t.textTertiary, marginTop: SPACING.xs }}>
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
    </div>
  );
};

const s = (t: Theme): Record<string, React.CSSProperties> => ({
  container: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  topBar: { display: 'flex', alignItems: 'center', gap: SPACING.md, padding: `${SPACING.md}px ${SPACING.xl}px ${SPACING.sm}`, background: t.bgPrimary, boxShadow: 'none' },
  backBtn: { padding: `${SPACING.sm}px ${SPACING.lg}px`, border: 'none', borderRadius: 12, background: t.bgSecondary, color: t.textPrimary, cursor: 'pointer', fontSize: TYPO.body.size, transition: TRANSITION.all, boxShadow: 'none' },
  photoName: { flex: 1, fontSize: TYPO.body.size, color: t.textPrimary, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  topActions: { display: 'flex', alignItems: 'center', gap: SPACING.sm },
  iconBtn: { width: 32, height: 32, border: 'none', borderRadius: 12, background: t.bgSecondary, color: t.textPrimary, cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: TRANSITION.all, boxShadow: 'none' },
  body: { flex: 1, display: 'flex', overflow: 'hidden', background: t.bgPhotoStage },
  imageArea: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: t.bgPhotoStage, position: 'relative', overflow: 'hidden' },
  image: { maxWidth: '90%', maxHeight: '90%', objectFit: 'contain', borderRadius: 14, boxShadow: SHADOW.lg, transition: 'transform 0.05s ease-out', userSelect: 'none' },
  presetTag: { position: 'absolute', top: 12, left: 12, padding: `${SPACING.xs}px ${SPACING.md}px`, background: t.accent, borderRadius: RADIUS.sm, color: t.textInverse, fontSize: TYPO.small.size },
  refTag: { position: 'absolute', top: 12, right: 12, padding: `${SPACING.xs}px ${SPACING.md}px`, background: 'rgba(0,0,0,0.5)', borderRadius: RADIUS.sm, color: t.textInverse, fontSize: TYPO.tiny.size, border: `1px solid rgba(0,0,0,0.26)` },
  cropOverlay: { position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  cropBox: { position: 'absolute', border: '2px dashed rgba(255,255,255,0.92)', background: 'rgba(255,255,255,0.08)' },
  cropPresetBtn: { padding: `${SPACING.xs}px ${SPACING.md}px`, border: 'none', borderRadius: RADIUS.sm, background: t.bgSecondary, cursor: 'pointer', fontSize: TYPO.tiny.size, transition: TRANSITION.all },
  panel: { width: 372, margin: `${SPACING.lg}px ${SPACING.lg}px ${SPACING.lg}px 0`, background: t.panelBg, borderRadius: 18, display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 18px 40px rgba(0,0,0,0.28)' },
  tabs: { display: 'flex', padding: `0 ${SPACING.sm}px`, background: t.panelBg },
  tab: { flex: 1, padding: `${SPACING.md}px 0`, border: 'none', background: 'transparent', cursor: 'pointer', fontSize: TYPO.caption.size, transition: TRANSITION.all, borderRadius: 12, margin: `${SPACING.xs}px ${SPACING.xs}px ${SPACING.sm}px` },
  tabContent: { flex: 1, overflowY: 'auto', padding: `${SPACING.lg}px ${SPACING.lg}px ${SPACING.xl}px`, minHeight: 0 },
  field: { marginBottom: SPACING.lg },
  label: { display: 'block', fontSize: TYPO.small.size, color: t.textTertiary, marginBottom: SPACING.xs },
  sectionTitle: { fontSize: TYPO.small.size, fontWeight: 700, color: t.textPrimary, marginBottom: SPACING.md, textTransform: 'uppercase', letterSpacing: 0.8 },
  surfaceSection: { marginBottom: SPACING.lg, padding: `${SPACING.md}px ${SPACING.md}px`, background: t.bgSecondary, borderRadius: 14, boxShadow: 'none' },
  starBtn: { border: 'none', background: t.bgSecondary, cursor: 'pointer', fontSize: 20, transition: TRANSITION.all, width: 32, height: 32, borderRadius: 12, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'none' },
  colorBtn: { width: 24, height: 24, borderRadius: '50%', border: 'none', cursor: 'pointer', transition: TRANSITION.all },
  tagChip: { display: 'inline-flex', alignItems: 'center', gap: SPACING.xs, padding: `4px ${SPACING.sm}px`, background: t.bgSecondary, borderRadius: RADIUS.pill, fontSize: TYPO.small.size, color: t.textPrimary },
  tagRemoveBtn: { border: 'none', background: 'transparent', color: t.textTertiary, cursor: 'pointer', fontSize: TYPO.small.size, padding: 0 },
  tagInput: { flex: 1, padding: `${SPACING.sm}px ${SPACING.md}px`, border: `1px solid ${t.border}`, borderRadius: 12, background: t.bgInput, color: t.textPrimary, fontSize: TYPO.small.size, outline: 'none' },
  fieldInput: { padding: `${SPACING.sm}px ${SPACING.md}px`, border: `1px solid ${t.border}`, borderRadius: 12, background: t.bgInput, color: t.textPrimary, fontSize: TYPO.small.size, outline: 'none', boxShadow: 'none' },
  addTagBtn: { padding: `${SPACING.sm}px ${SPACING.md}px`, border: 'none', borderRadius: 12, background: t.accent, color: t.textInverse, cursor: 'pointer', fontSize: 14, transition: TRANSITION.all, fontWeight: 600 },
  separator: { margin: `${SPACING.lg}px 0` },
  metaRow: { display: 'flex', justifyContent: 'space-between', gap: SPACING.md, padding: `${SPACING.sm}px ${SPACING.md}px`, borderRadius: 12, background: t.bgPrimary, marginBottom: SPACING.xs },
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
});
