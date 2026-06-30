import React, { useState, useMemo } from 'react';
import { Preset, PresetAdjustment, PresetCategory, PhotoFile, NumericAdjustmentKey } from '../../shared/types';
import { Theme, SPACING, RADIUS, TYPO, DURATION, EASING, SHADOW, TRANSITION } from '../styles/theme';
import { useI18n } from '../i18n';
import { AppIcon } from './AppIcon';

interface PresetPanelProps {
  presets: Preset[];
  activePhoto: PhotoFile | null;
  selectedCount?: number;
  onApplyPreset: (photoId: string, presetId: string) => void;
  onBatchApply?: (presetId: string) => void;
  onClose: () => void;
  onCreatePreset: (preset: Preset) => Promise<boolean>;
  onDeletePreset: (presetId: string) => Promise<boolean>;
  onRefreshPresets: () => void;
  theme: Theme;
}

const categoryKeys: PresetCategory[] = ['classic','portrait','landscape','cinematic','vintage','film','bw','artistic','mood','color-grading'];

function adjustmentsToFilterCSS(a: PresetAdjustment): string {
  const parts: string[] = [];
  if (a.brightness) parts.push(`brightness(${1 + a.brightness / 200})`);
  if (a.contrast) parts.push(`contrast(${1 + a.contrast / 200})`);
  if (a.saturation) parts.push(`saturate(${1 + a.saturation / 200})`);
  if (a.hue) parts.push(`hue-rotate(${a.hue}deg)`);
  if (a.exposure) parts.push(`brightness(${1 + a.exposure / 5})`);
  if (a.temperature > 0) parts.push(`sepia(${a.temperature * 0.3}%)`);
  if (a.grain) parts.push(`contrast(${1 + a.grain * 0.002})`);
  if (a.saturation <= -80) parts.push('grayscale(100%)');
  return parts.length > 0 ? parts.join(' ') : 'none';
}

const DEMO_PHOTO = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="200" height="134"><defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="%2389a6ba"/><stop offset="60%" stop-color="%23d5dfd0"/><stop offset="60%" stop-color="%236e8754"/><stop offset="80%" stop-color="%23445238"/><stop offset="100%" stop-color="%23201814"/></linearGradient></defs><rect width="200" height="134" fill="url(%23sky)"/><circle cx="150" cy="35" r="22" fill="%23d0ab68" opacity="0.78"/><polygon points="50,70 70,40 90,70" fill="%23536345" opacity="0.7"/></svg>')}`;

const ADJ_LABELS: { key: NumericAdjustmentKey; zh: string; en: string; unit: string; range: [number, number] }[] = [
  { key: 'exposure', zh: '曝光', en: 'Exposure', unit: '', range: [-5, 5] },
  { key: 'brightness', zh: '亮度', en: 'Brightness', unit: '', range: [-100, 100] },
  { key: 'contrast', zh: '对比度', en: 'Contrast', unit: '', range: [-100, 100] },
  { key: 'saturation', zh: '饱和度', en: 'Saturation', unit: '', range: [-100, 100] },
  { key: 'temperature', zh: '色温', en: 'Temperature', unit: '', range: [-100, 100] },
  { key: 'tint', zh: '色调', en: 'Tint', unit: '', range: [-100, 100] },
  { key: 'highlights', zh: '高光', en: 'Highlights', unit: '', range: [-100, 100] },
  { key: 'shadows', zh: '阴影', en: 'Shadows', unit: '', range: [-100, 100] },
  { key: 'whites', zh: '白色', en: 'Whites', unit: '', range: [-100, 100] },
  { key: 'blacks', zh: '黑色', en: 'Blacks', unit: '', range: [-100, 100] },
  { key: 'clarity', zh: '清晰度', en: 'Clarity', unit: '', range: [-100, 100] },
  { key: 'sharpness', zh: '锐度', en: 'Sharpness', unit: '', range: [0, 100] },
  { key: 'vignette', zh: '暗角', en: 'Vignette', unit: '', range: [0, 100] },
  { key: 'grain', zh: '颗粒', en: 'Grain', unit: '', range: [0, 100] },
  { key: 'hue', zh: '色相', en: 'Hue', unit: '°', range: [-180, 180] },
  { key: 'gamma', zh: '伽马', en: 'Gamma', unit: '', range: [0.2, 3.0] },
];

type PanelView = 'presets' | 'import-menu' | 'import-result' | 'detail';

export const PresetPanel: React.FC<PresetPanelProps> = ({ presets, activePhoto, selectedCount = 0, onApplyPreset, onBatchApply, onClose, onCreatePreset, onDeletePreset, onRefreshPresets, theme: t }) => {
  const { t: tr, lang } = useI18n();
  const [activeCategory, setActiveCategory] = useState<PresetCategory>('classic');
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [currentView, setCurrentView] = useState<PanelView>('presets');
  const [importedPresets, setImportedPresets] = useState<Preset[]>([]);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [importSkipped, setImportSkipped] = useState(0);
  const [detailPreset, setDetailPreset] = useState<Preset | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // NEW: Search and favorites
  const [searchQuery, setSearchQuery] = useState('');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('photoforge_preset_favorites');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch { return new Set(); }
  });
  const [hoveredPresetId, setHoveredPresetId] = useState<string | null>(null);

  const togglePresetFavorite = (id: string) => {
    setFavoriteIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      try { localStorage.setItem('photoforge_preset_favorites', JSON.stringify([...next])); } catch {}
      return next;
    });
  };

  const filteredPresets = useMemo(() => {
    let result = presets.filter(p => p.category === activeCategory);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = presets.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q) ||
        p.cameraManufacturer?.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
      );
    }
    if (showFavoritesOnly) {
      result = result.filter(p => favoriteIds.has(p.id));
    }
    return result;
  }, [presets, activeCategory, searchQuery, showFavoritesOnly, favoriteIds]);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    await onCreatePreset({ id: `user-${Date.now()}`, name: newName.trim(), category: activeCategory, adjustments: { brightness:0,contrast:0,saturation:0,hue:0,temperature:0,tint:0,sharpness:0,vignette:0,grain:0,clarity:0,highlights:0,shadows:0,whites:0,blacks:0,exposure:0,gamma:1.0 }, description: tr('presets.userCustom'), isBuiltIn: false });
    setNewName(''); setShowCreate(false);
  };

  const handleImportPresetFile = async () => {
    const result = await window.photoForge.openFileDialog({
      title: tr('presets.importFile'),
      properties: ['openFile', 'multiSelections'],
      filters: [
        { name: tr('presets.presetFiles'), extensions: ['ncp','xmp','lrtemplate','dcp','icc','c1','fpx'] },
        { name: tr('presets.allFiles'), extensions: ['*'] }
      ]
    });
    if (result.canceled || !result.filePaths.length) return;
    const allImported: Preset[] = [];
    const allErrors: string[] = [];
    let totalSkipped = 0;
    for (const filePath of result.filePaths) {
      const res = await window.photoForge.importPresetFile(filePath);
      if (res.presets && res.presets.length > 0) allImported.push(...res.presets);
      for (const err of res.errors) {
        if (err.includes('已存在') || err.includes('already exists')) totalSkipped += res.skipped || 1;
        else allErrors.push(err);
      }
      totalSkipped += (res.skipped || 0);
    }
    setImportedPresets(allImported);
    setImportErrors(allErrors);
    setImportSkipped(totalSkipped);
    onRefreshPresets();
    setCurrentView('import-result');
  };

  const handleRename = async (presetId: string) => {
    if (!renameValue.trim()) { setRenamingId(null); return; }
    await window.photoForge.renamePreset(presetId, renameValue.trim());
    onRefreshPresets();
    setRenamingId(null);
  };

  const handleDelete = async (presetId: string) => {
    await onDeletePreset(presetId);
    setConfirmDeleteId(null);
    setDetailPreset(null);
    setCurrentView('presets');
    onRefreshPresets();
  };

  const handleExportPreset = async (preset: Preset) => {
    const fileName = preset.name.replace(/[^a-zA-Z0-9一-鿿-_]/g, '_') + '.json';
    const result = await window.photoForge.saveFileDialog({
      title: tr('presets.exportPreset'),
      defaultPath: fileName,
      filters: [{ name: 'JSON', extensions: ['json'] }]
    });
    if (result.canceled || !result.filePath) return;
    await window.photoForge.exportPresetToFile(preset.id, result.filePath);
  };

  // ===== Detail View =====
  if (currentView === 'detail' && detailPreset) {
    const p = detailPreset;
    const nonZeroAdj = ADJ_LABELS.filter(a => { const val = p.adjustments[a.key]; return a.key === 'gamma' ? val !== 1.0 : val !== 0; });
    return (
      <div style={s(t).panel}>
        <div style={s(t).header}>
          <button style={s(t).backArrowBtn} onClick={() => { setCurrentView('presets'); setDetailPreset(null); }}
            onMouseEnter={e => { e.currentTarget.style.background = t.bgHover; }}
            onMouseLeave={e => { e.currentTarget.style.background = t.bgSecondary; }}
          ><AppIcon name="back" size={14} color={t.textSecondary} /></button>
          <span style={s(t).title}>{p.name}</span>
          <button style={s(t).closeBtn} onClick={onClose}
            onMouseEnter={e => { e.currentTarget.style.background = t.bgHover; }}
            onMouseLeave={e => { e.currentTarget.style.background = t.bgSecondary; }}
          ><AppIcon name="close" size={14} color={t.textSecondary} /></button>
        </div>
        <div style={s(t).detailBody}>
          <div style={s(t).detailThumbWrap}>
            <img src={DEMO_PHOTO} style={{ ...s(t).detailThumbImg, filter: adjustmentsToFilterCSS(p.adjustments) }} alt={p.name} draggable={false} />
          </div>
          <div style={{ fontSize: TYPO.subheading.size, color: t.textPrimary, fontWeight: 600, marginBottom: SPACING.xs }}>{p.name}</div>
          <div style={{ fontSize: TYPO.caption.size, color: t.textTertiary, marginBottom: 2 }}>{tr(`presets.categories.${p.category}`)}</div>
          {p.cameraManufacturer && <div style={{ fontSize: TYPO.caption.size, color: t.textTertiary, marginBottom: 2 }}>{tr('presets.presetSource')}: {p.cameraManufacturer}</div>}
          {p.description && <div style={{ fontSize: TYPO.caption.size, color: t.textTertiary, marginBottom: SPACING.sm }}>{p.description}</div>}
          {p.isBuiltIn && <div style={{ fontSize: TYPO.tiny.size, color: t.accent, marginBottom: SPACING.sm, padding: `2px ${SPACING.sm}px`, background: t.accentLight, borderRadius: RADIUS.sm, display: 'inline-block' }}>{tr('presets.builtIn')}</div>}

          <div style={{ fontSize: TYPO.small.size, color: t.textSecondary, fontWeight: 600, marginTop: SPACING.sm, marginBottom: SPACING.sm }}>{tr('presets.adjustments')}</div>
          {nonZeroAdj.length === 0 ? (
            <div style={{ fontSize: TYPO.small.size, color: t.textTertiary }}>{tr('presets.noAdjustments')}</div>
          ) : nonZeroAdj.map(a => {
            const val = p.adjustments[a.key];
            const label = lang === 'zh-CN' ? a.zh : a.en;
            const pct = a.key === 'gamma' ? ((val - 1.0) / 2.0 * 100) : (val / (a.range[1] - a.range[0]) * 2 * 100);
            const barPct = Math.min(100, Math.abs(pct));
            return (
              <div key={a.key} style={{ marginBottom: SPACING.xs }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: TYPO.caption.size }}>
                  <span style={{ color: t.textSecondary }}>{label}</span>
                  <span style={{ color: t.textPrimary, fontWeight: 500 }}>{val > 0 ? '+' : ''}{a.key === 'gamma' ? val.toFixed(2) : val}{a.unit}</span>
                </div>
                <div style={{ height: 3, background: t.bgSecondary, borderRadius: 2, marginTop: 2 }}>
                  <div style={{ height: '100%', width: `${barPct}%`, background: val >= 0 ? t.accent : t.warning, borderRadius: 2, transition: `width ${DURATION.normal}ms ${EASING.out}` }} />
                </div>
              </div>
            );
          })}

          <div style={{ marginTop: SPACING.lg, display: 'flex', flexDirection: 'column', gap: SPACING.sm }}>
            {activePhoto && (
              <button style={s(t).actionFullBtn} onClick={() => onApplyPreset(activePhoto.id, p.id)}
                onMouseEnter={e => { e.currentTarget.style.background = t.accentHover; }}
                onMouseLeave={e => { e.currentTarget.style.background = t.accent; }}
              >{tr('presets.apply')}</button>
            )}
            {!p.isBuiltIn && (
              <button style={{ ...s(t).actionFullBtn, background: t.accentLight, color: t.accent }}
                onClick={() => handleExportPreset(p)}
                onMouseEnter={e => { e.currentTarget.style.background = t.accentLight; }}
                onMouseLeave={e => { e.currentTarget.style.background = t.accentLight; }}
              ><span style={{ display: 'inline-flex', alignItems: 'center', gap: SPACING.xs }}><AppIcon name="export" size={14} color={t.accent} />{tr('presets.export')}</span></button>
            )}
            {!p.isBuiltIn && renamingId !== p.id && (
              <button style={{ ...s(t).actionFullBtn, background: t.bgSecondary, color: t.textSecondary }}
                onClick={() => { setRenamingId(p.id); setRenameValue(p.name); }}
                onMouseEnter={e => { e.currentTarget.style.background = t.bgHover; }}
                onMouseLeave={e => { e.currentTarget.style.background = t.bgSecondary; }}
              ><span style={{ display: 'inline-flex', alignItems: 'center', gap: SPACING.xs }}><AppIcon name="edit" size={14} color={t.textSecondary} />{tr('presets.rename')}</span></button>
            )}
            {!p.isBuiltIn && renamingId === p.id && (
              <div style={{ display: 'flex', gap: SPACING.xs }}>
                <input style={s(t).input} value={renameValue} onChange={e => setRenameValue(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleRename(p.id)} autoFocus />
                <button style={s(t).saveBtn} onClick={() => handleRename(p.id)}><AppIcon name="check" size={14} color={t.textInverse} /></button>
                <button style={s(t).cancelSmBtn} onClick={() => setRenamingId(null)}><AppIcon name="x" size={14} color={t.textSecondary} /></button>
              </div>
            )}
            {!p.isBuiltIn && confirmDeleteId !== p.id && (
              <button style={{ ...s(t).actionFullBtn, background: 'transparent', border: `1px solid ${t.danger}`, color: t.danger }}
                onClick={() => setConfirmDeleteId(p.id)}
                onMouseEnter={e => { e.currentTarget.style.background = t.dangerLight; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
              ><span style={{ display: 'inline-flex', alignItems: 'center', gap: SPACING.xs }}><AppIcon name="trash" size={14} color={t.danger} />{tr('presets.deletePreset')}</span></button>
            )}
            {!p.isBuiltIn && confirmDeleteId === p.id && (
              <div style={{ padding: SPACING.sm, background: t.dangerLight, borderRadius: RADIUS.sm }}>
                <div style={{ fontSize: TYPO.small.size, color: t.danger, marginBottom: SPACING.sm }}>{tr('presets.confirmDelete')}</div>
                <div style={{ display: 'flex', gap: SPACING.sm }}>
                  <button style={{ ...s(t).saveBtn, background: t.danger }} onClick={() => handleDelete(p.id)}>{tr('presets.confirmYes')}</button>
                  <button style={s(t).cancelSmBtn} onClick={() => setConfirmDeleteId(null)}>{tr('presets.confirmNo')}</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ===== Import Menu View =====
  if (currentView === 'import-menu') {
    return (
      <div style={s(t).panel}>
        <div style={s(t).header}>
          <span style={s(t).title}>{tr('presets.importMenuTitle')}</span>
          <button style={s(t).closeBtn} onClick={onClose}><AppIcon name="close" size={14} color={t.textSecondary} /></button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: SPACING.lg }}>
          <div style={{ fontSize: TYPO.body.size, color: t.textSecondary, lineHeight: 1.6, marginBottom: SPACING.lg }}>{tr('presets.importMenuDesc')}</div>
          <div style={{ marginBottom: SPACING.lg }}>
            <div style={{ fontSize: TYPO.small.size, color: t.textTertiary, marginBottom: SPACING.sm }}>{tr('presets.supportedFormats')}</div>
            <div style={{ fontSize: TYPO.small.size, color: t.textSecondary, lineHeight: 1.8, padding: `${SPACING.sm}px ${SPACING.md}px`, background: t.bgSecondary, borderRadius: RADIUS.sm }}>{tr('presets.formatsList')}</div>
          </div>
          <button style={s(t).selectAndImportBtn} onClick={handleImportPresetFile}
            onMouseEnter={e => { e.currentTarget.style.background = t.accentHover; }}
            onMouseLeave={e => { e.currentTarget.style.background = t.accent; }}
          ><span style={{ display: 'inline-flex', alignItems: 'center', gap: SPACING.xs }}><AppIcon name="folder" size={14} color={t.textInverse} />{tr('presets.selectAndImport')}</span></button>
          <button style={s(t).backBtn} onClick={() => setCurrentView('presets')}
            onMouseEnter={e => { e.currentTarget.style.background = t.bgHover; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
          ><span style={{ display: 'inline-flex', alignItems: 'center', gap: SPACING.xs }}><AppIcon name="back" size={14} color={t.textSecondary} />{tr('presets.closeResult')}</span></button>
        </div>
      </div>
    );
  }

  // ===== Import Result View =====
  if (currentView === 'import-result') {
    return (
      <div style={s(t).panel}>
        <div style={s(t).header}>
          <span style={s(t).title}>{tr('presets.importResult')}</span>
          <button style={s(t).closeBtn} onClick={onClose}><AppIcon name="close" size={14} color={t.textSecondary} /></button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: SPACING.lg }}>
          {importedPresets.length > 0 ? (
            <>
              <div style={{ fontSize: TYPO.small.size, color: t.accent, marginBottom: SPACING.sm, display: 'inline-flex', alignItems: 'center', gap: SPACING.xs }}><AppIcon name="check" size={14} color={t.accent} />{tr('presets.importResultDesc')}</div>
              {importSkipped > 0 && (
                <div style={{ fontSize: TYPO.small.size, color: t.warning, marginBottom: SPACING.sm, padding: `${SPACING.sm}px ${SPACING.md}px`, background: t.warningLight, borderRadius: RADIUS.sm, display: 'inline-flex', alignItems: 'center', gap: SPACING.xs }}><AppIcon name="info" size={14} color={t.warning} />{tr('presets.alreadyExists')} ({importSkipped})</div>
              )}
              {importedPresets.map((preset, idx) => (
                <div key={preset.id || idx} style={s(t).importResultCard}>
                  <div style={s(t).importResultInfo}>
                    <div style={{ fontSize: TYPO.body.size, color: t.textPrimary, fontWeight: 600, marginBottom: SPACING.xs }}>{tr('presets.presetNameLabel')}: {preset.name}</div>
                    <div style={{ fontSize: TYPO.caption.size, color: t.textSecondary, marginBottom: 2 }}>{tr('presets.presetCategory')}: {tr(`presets.categories.${preset.category}`)}</div>
                    {preset.cameraManufacturer && <div style={{ fontSize: TYPO.caption.size, color: t.textTertiary, marginBottom: 2 }}>{tr('presets.presetSource')}: {preset.cameraManufacturer}</div>}
                    {preset.description && <div style={{ fontSize: TYPO.tiny.size, color: t.textTertiary, marginTop: 2 }}>{preset.description}</div>}
                  </div>
                  <button style={s(t).goToBtn} onClick={() => { setActiveCategory(preset.category); setCurrentView('presets'); }}
                    onMouseEnter={e => { e.currentTarget.style.background = t.accentLight; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                  >{tr('presets.goToPreset')}</button>
                </div>
              ))}
            </>
          ) : (
            <div style={{ fontSize: TYPO.body.size, color: t.textTertiary, textAlign: 'center', padding: `${SPACING.xl}px 0` }}>{tr('presets.noPresetsFound')}</div>
          )}
          {importErrors.length > 0 && (
            <div style={{ marginTop: SPACING.sm, padding: `${SPACING.sm}px ${SPACING.md}px`, background: t.dangerLight, borderRadius: RADIUS.sm }}>
              {importErrors.map((err, i) => <div key={i} style={{ fontSize: TYPO.small.size, color: t.danger, display: 'inline-flex', alignItems: 'center', gap: SPACING.xs }}><AppIcon name="x" size={14} color={t.danger} />{err}</div>)}
            </div>
          )}
          <div style={{ marginTop: SPACING.lg, display: 'flex', gap: SPACING.sm }}>
            <button style={s(t).selectAndImportBtn} onClick={handleImportPresetFile}><span style={{ display: 'inline-flex', alignItems: 'center', gap: SPACING.xs }}><AppIcon name="folder" size={14} color={t.textInverse} />{tr('presets.selectAndImport')}</span></button>
            <button style={s(t).backBtn} onClick={() => setCurrentView('presets')}><span style={{ display: 'inline-flex', alignItems: 'center', gap: SPACING.xs }}><AppIcon name="back" size={14} color={t.textSecondary} />{tr('presets.closeResult')}</span></button>
          </div>
        </div>
      </div>
    );
  }

  // ===== Default: Presets List View =====
  const favCount = presets.filter(p => favoriteIds.has(p.id)).length;

  return (
    <div style={s(t).panel}>
      <div style={s(t).header}>
        <div style={{ flex: 1, minWidth: 0, paddingLeft: SPACING.sm }}>
          <div style={s(t).eyebrow}>{tr('presets.studio')}</div>
          <span style={s(t).title}>{tr('presets.title')}</span>
        </div>
        <button style={s(t).closeBtn} onClick={onClose}
          onMouseEnter={e => { e.currentTarget.style.background = t.bgHover; }}
          onMouseLeave={e => { e.currentTarget.style.background = t.bgSecondary; }}
        ><AppIcon name="close" size={14} color={t.textSecondary} /></button>
      </div>

      {/* Search bar */}
      <div style={{ padding: `${SPACING.md}px ${SPACING.md}px ${SPACING.sm}px`, background: t.panelBg }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 0, background: t.bgSecondary, borderRadius: 12, padding: `0 ${SPACING.sm}px`, boxShadow: 'none' }}>
          <span style={{ color: t.textTertiary, marginRight: 2, display: 'inline-flex' }}><AppIcon name="search" size={13} color={t.textTertiary} /></span>
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={tr('presets.searchPlaceholder')}
            style={{ flex: 1, border: 'none', background: 'transparent', color: t.textPrimary, fontSize: TYPO.small.size, outline: 'none', padding: `${SPACING.sm}px ${SPACING.xs}px`, lineHeight: '24px' }}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} style={{ background: 'none', border: 'none', color: t.textTertiary, cursor: 'pointer', fontSize: 14, padding: 2 }}><AppIcon name="close" size={12} color={t.textTertiary} /></button>
          )}
        </div>
      </div>

      {/* Category tabs + Favorites toggle */}
      <div style={s(t).catTabs}>
        <button style={{
          ...s(t).catBtn,
          background: showFavoritesOnly ? t.accentLight : 'transparent',
          color: showFavoritesOnly ? t.accent : t.textTertiary,
          fontWeight: showFavoritesOnly ? 600 : 400,
        }}
          onClick={() => { setShowFavoritesOnly(!showFavoritesOnly); setSearchQuery(''); }}
          onMouseEnter={e => { if (!showFavoritesOnly) e.currentTarget.style.background = t.bgHover; }}
          onMouseLeave={e => { e.currentTarget.style.background = showFavoritesOnly ? t.accentLight : 'transparent'; }}
        ><span style={{ display: 'inline-flex', alignItems: 'center', gap: SPACING.xs }}><AppIcon name="star" size={13} color={showFavoritesOnly ? t.accent : t.textTertiary} filled={showFavoritesOnly} />{favCount > 0 ? `(${favCount})` : ''}</span></button>
        {!searchQuery && categoryKeys.map(cat => {
          const count = presets.filter(p => p.category === cat).length;
          if (count === 0) return null;
          return (
            <button key={cat} style={{
              ...s(t).catBtn,
              background: activeCategory === cat && !showFavoritesOnly ? t.accentLight : 'transparent',
              color: activeCategory === cat && !showFavoritesOnly ? t.accent : t.textTertiary,
            }}
              onClick={() => { setActiveCategory(cat); setShowFavoritesOnly(false); }}
              onMouseEnter={e => { if (activeCategory !== cat) e.currentTarget.style.background = t.bgHover; }}
              onMouseLeave={e => { e.currentTarget.style.background = activeCategory === cat && !showFavoritesOnly ? t.accentLight : 'transparent'; }}
            >{tr(`presets.categories.${cat}`)}</button>
          );
        })}
      </div>

      <div style={s(t).presetList}>
        {!activePhoto && selectedCount > 0 && (
          <div style={{ padding: `${SPACING.sm}px ${SPACING.md}px`, background: t.accentLight, borderRadius: 12, marginBottom: SPACING.sm, fontSize: TYPO.caption.size, color: t.accent, textAlign: 'center' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: SPACING.xs }}><AppIcon name="sparkles" size={12} color={t.accent} />{tr('presets.applyHint').replace('{count}', String(selectedCount))}</span>
          </div>
        )}
        {filteredPresets.length === 0 && (
          <div style={{ textAlign: 'center', padding: `${SPACING.xl}px 0`, color: t.textTertiary, fontSize: TYPO.small.size }}>
            {searchQuery ? tr('presets.noSearchResults') : tr('presets.noPresetsInCategory')}
          </div>
        )}
        {filteredPresets.map(preset => {
          const isActive = activePhoto?.presetApplied === preset.id;
          const isHovered = hoveredPresetId === preset.id;
          const isFav = favoriteIds.has(preset.id);
          const filterCSS = adjustmentsToFilterCSS(preset.adjustments);
          return (
            <div key={preset.id} style={{
              ...s(t).presetCard,
              outline: isActive ? `2px solid ${t.accent}` : 'none',
              background: isHovered ? t.bgHover : `linear-gradient(180deg, ${t.bgCard}, ${t.bgSecondary})`,
              boxShadow: isActive ? SHADOW.md : isHovered ? SHADOW.sm : 'none',
            }}
              onClick={() => {
                if (activePhoto) onApplyPreset(activePhoto.id, preset.id);
                else if (selectedCount > 0 && onBatchApply) onBatchApply(preset.id);
              }}
              onMouseEnter={() => setHoveredPresetId(preset.id)}
              onMouseLeave={() => setHoveredPresetId(null)}
            >
              <div style={s(t).presetThumbWrap}>
                <img src={DEMO_PHOTO} style={{ ...s(t).presetThumbImg, filter: filterCSS }} alt={preset.name} draggable={false} />
              </div>
              <div style={s(t).presetInfo}>
                <div style={s(t).presetName}>{preset.name}</div>
                {preset.cameraManufacturer && <div style={s(t).presetMfr}>{preset.cameraManufacturer}</div>}
              </div>
              {/* Favorite toggle */}
              <button
                style={{
                  width: 22, height: 22, border: 'none', borderRadius: '50%',
                  background: isFav ? t.accentBg : 'transparent',
                  color: isFav ? t.favStar : t.textTertiary, cursor: 'pointer',
                  fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0, transition: TRANSITION.all,
                }}
                onClick={e => { e.stopPropagation(); togglePresetFavorite(preset.id); }}
                title={isFav ? tr('presets.removeFavorite') : tr('presets.addFavorite')}
              ><AppIcon name="star" size={12} color={isFav ? t.favStar : t.textTertiary} filled={isFav} /></button>
              <button
                style={{ ...s(t).moreBtn, opacity: isHovered ? 1 : 0.5 }}
                onClick={(e) => { e.stopPropagation(); setDetailPreset(preset); setCurrentView('detail'); }}
                title={tr('presets.details')}
              ><AppIcon name="info" size={12} color={t.textTertiary} /></button>
            </div>
          );
        })}
      </div>

      <div style={s(t).footer}>
        {showCreate ? (
          <div style={{ display: 'flex', gap: SPACING.xs }}>
            <input style={s(t).input} value={newName} onChange={e => setNewName(e.target.value)} placeholder={tr('presets.presetName')} onKeyDown={e => e.key === 'Enter' && handleCreate()} />
            <button style={s(t).saveBtn} onClick={handleCreate}>{tr('presets.save')}</button>
            <button style={s(t).cancelSmBtn} onClick={() => setShowCreate(false)}>{tr('presets.cancel')}</button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: SPACING.sm }}>
            <button style={s(t).createBtn}
              onClick={() => setShowCreate(true)}
              onMouseEnter={e => { e.currentTarget.style.borderColor = t.accent; e.currentTarget.style.color = t.accent; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = t.border; e.currentTarget.style.color = t.textTertiary; }}
            >{tr('presets.create')}</button>
            <button style={s(t).importBtn}
              onClick={() => setCurrentView('import-menu')}
              onMouseEnter={e => { e.currentTarget.style.background = t.accentLight; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
            >{tr('presets.importPreset')}</button>
          </div>
        )}
      </div>
    </div>
  );
};

const s = (t: Theme): Record<string, React.CSSProperties> => ({
  panel: { width: 328, margin: `${SPACING.lg}px ${SPACING.md}px ${SPACING.lg}px 0`, background: t.panelBg, borderRadius: 18, display: 'flex', flexDirection: 'column', flexShrink: 0, overflow: 'hidden', boxShadow: '0 18px 40px rgba(0,0,0,0.28)' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: SPACING.md, padding: `${SPACING.lg}px ${SPACING.md}px ${SPACING.md}px`, boxShadow: 'none', background: t.panelBg },
  eyebrow: { fontSize: TYPO.tiny.size, color: t.accent, letterSpacing: 0.9, textTransform: 'uppercase', marginBottom: 2 },
  title: { fontSize: TYPO.subheading.size, color: t.textPrimary, fontWeight: 700, display: 'block' },
  closeBtn: { width: 30, height: 30, border: 'none', borderRadius: 12, background: t.bgSecondary, color: t.textSecondary, cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: TRANSITION.all, boxShadow: 'none' },
  backArrowBtn: { width: 30, height: 30, border: 'none', borderRadius: 12, background: t.bgSecondary, color: t.textSecondary, cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: TRANSITION.all, boxShadow: 'none' } as React.CSSProperties,
  catTabs: { display: 'flex', flexWrap: 'wrap', gap: SPACING.xs, padding: `${SPACING.sm}px ${SPACING.md}px ${SPACING.md}px`, background: t.bgSecondary },
  catBtn: { padding: `5px ${SPACING.sm}px`, border: 'none', borderRadius: 999, fontSize: TYPO.tiny.size, cursor: 'pointer', whiteSpace: 'nowrap', transition: TRANSITION.all },
  presetList: { flex: 1, overflowY: 'auto', padding: `${SPACING.sm}px ${SPACING.md}px ${SPACING.md}px` },
  presetCard: {
    display: 'flex', alignItems: 'center', gap: SPACING.sm, background: t.bgCard,
    borderRadius: 16, cursor: 'pointer', border: 'none',
    overflow: 'hidden', marginBottom: SPACING.sm, padding: `${SPACING.xs}px ${SPACING.sm}px`,
    transition: `background ${DURATION.fast}ms ${EASING.out}, border-color ${DURATION.fast}ms ${EASING.out}, box-shadow ${DURATION.fast}ms ${EASING.out}, transform ${DURATION.fast}ms ${EASING.out}`,
  },
  presetThumbWrap: { width: 64, height: 44, flexShrink: 0, borderRadius: 10, overflow: 'hidden', background: t.bgPhotoStage },
  presetThumbImg: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
  presetInfo: { flex: 1, minWidth: 0, overflow: 'hidden' },
  presetName: { fontSize: TYPO.small.size, color: t.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600 },
  presetMfr: { fontSize: 9, color: t.textTertiary, marginTop: 2, letterSpacing: 0.2 },
  moreBtn: { width: 24, height: 24, border: 'none', borderRadius: 10, background: t.bgSecondary, color: t.textTertiary, cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: TRANSITION.all } as React.CSSProperties,
  footer: { padding: `${SPACING.md}px ${SPACING.md}px`, background: t.bgSecondary },
  createBtn: { flex: 1, padding: SPACING.sm, border: 'none', borderRadius: 12, background: t.bgSecondary, color: t.textTertiary, cursor: 'pointer', fontSize: TYPO.small.size, transition: TRANSITION.all },
  importBtn: { flex: 1, padding: SPACING.sm, border: 'none', borderRadius: 12, background: t.accentLight, color: t.accent, cursor: 'pointer', fontSize: TYPO.small.size, fontWeight: 600, transition: TRANSITION.all },
  input: { flex: 1, padding: `${SPACING.sm}px ${SPACING.sm}px`, border: `1px solid ${t.border}`, borderRadius: 12, background: t.bgInput, color: t.textPrimary, fontSize: TYPO.small.size, outline: 'none' },
  saveBtn: { padding: `${SPACING.sm}px ${SPACING.lg}px`, border: 'none', borderRadius: 12, background: t.accent, color: t.textInverse, cursor: 'pointer', fontSize: TYPO.small.size, transition: TRANSITION.all, fontWeight: 600 },
  cancelSmBtn: { padding: `${SPACING.sm}px ${SPACING.sm}px`, border: 'none', borderRadius: 12, background: t.bgSecondary, color: t.textSecondary, cursor: 'pointer', fontSize: TYPO.small.size, transition: TRANSITION.all, boxShadow: 'none' },
  detailBody: { flex: 1, overflowY: 'auto', padding: `${SPACING.lg}px ${SPACING.md}px ${SPACING.xl}px` },
  detailThumbWrap: { width: '100%', height: 108, borderRadius: 14, overflow: 'hidden', background: t.bgPhotoStage, marginBottom: SPACING.md },
  detailThumbImg: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
  actionFullBtn: { width: '100%', padding: SPACING.sm, border: 'none', borderRadius: 12, background: t.accent, color: t.textInverse, cursor: 'pointer', fontSize: TYPO.small.size, fontWeight: 500, transition: TRANSITION.all },
  selectAndImportBtn: { width: '100%', padding: `${SPACING.md}px`, border: 'none', borderRadius: 12, background: t.accent, color: t.textInverse, cursor: 'pointer', fontSize: TYPO.body.size, fontWeight: 600, marginBottom: SPACING.sm, transition: TRANSITION.all },
  backBtn: { width: '100%', padding: SPACING.sm, border: 'none', borderRadius: 12, background: t.bgSecondary, color: t.textSecondary, cursor: 'pointer', fontSize: TYPO.small.size, transition: TRANSITION.all },
  importResultCard: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: `${SPACING.md}px ${SPACING.md}px`, marginBottom: SPACING.sm, background: t.bgCard, borderRadius: 12 },
  importResultInfo: { flex: 1, minWidth: 0, overflow: 'hidden' },
  goToBtn: { padding: `${SPACING.xs}px ${SPACING.md}px`, border: 'none', borderRadius: RADIUS.sm, background: t.accentLight, color: t.accent, cursor: 'pointer', fontSize: TYPO.tiny.size, whiteSpace: 'nowrap', flexShrink: 0, transition: TRANSITION.all },
});
