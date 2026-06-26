import React, { useState, useMemo } from 'react';
import { PhotoFile, FilterCriteria, Collection } from '../../shared/types';
import { Theme, SPACING, RADIUS, TYPO, DURATION, EASING, TRANSITION, SHADOW } from '../styles/theme';
import { useI18n } from '../i18n';
import { AppIcon } from './AppIcon';

interface SmartAlbumViewProps {
  photos: PhotoFile[];
  collections: Collection[];
  onCreateSmartAlbum: (name: string, criteria: FilterCriteria) => void;
  onDeleteCollection: (id: string) => void;
  onSelectPhoto: (id: string) => void;
  onExportAlbum?: (photoIds: string[]) => void;
  onUpdateCollection?: (collectionId: string, updates: { name?: string; description?: string }) => void;
  theme: Theme;
}

const CRITERIA_TEMPLATES: { name: string; nameZh: string; criteria: Partial<FilterCriteria>; icon: React.ReactNode }[] = [
  { name: 'Favorites', nameZh: '收藏', icon: <AppIcon name="star" size={22} filled />, criteria: { onlyFavorites: true } },
  { name: '5 Stars', nameZh: '5星评分', icon: <AppIcon name="star" size={22} filled />, criteria: { ratingMin: 5 } },
  { name: 'Recent (7 days)', nameZh: '最近7天', icon: <AppIcon name="calendar" size={22} />, criteria: { dateRange: { start: new Date(Date.now() - 7 * 86400000).toISOString(), end: null } } },
  { name: 'With Preset', nameZh: '已应用预设', icon: <AppIcon name="sparkles" size={22} />, criteria: { hasPreset: true } },
  { name: 'RAW Files', nameZh: 'RAW 文件', icon: <AppIcon name="camera" size={22} />, criteria: { formats: ['cr2', 'cr3', 'nef', 'arw', 'raf', 'dng', 'orf', 'rw2'] } },
  { name: 'Unrated', nameZh: '未评分', icon: <AppIcon name="info" size={22} />, criteria: { ratingMin: 0, ratingMax: 0 } },
];

const menuItemStyle = (t: Theme): React.CSSProperties => ({
  display: 'block', width: '100%', padding: `${SPACING.sm}px ${SPACING.lg}px`, border: 'none', background: 'transparent', cursor: 'pointer', fontSize: TYPO.body.size, textAlign: 'left', transition: TRANSITION.all, borderRadius: RADIUS.sm,
});

export const SmartAlbumView: React.FC<SmartAlbumViewProps> = ({ photos, collections, onCreateSmartAlbum, onDeleteCollection, onSelectPhoto, onExportAlbum, onUpdateCollection, theme: t }) => {
  const { t: tr, lang } = useI18n();
  const [showCreate, setShowCreate] = useState(false);
  const [gridSize, setGridSize] = useState<"small" | "medium" | "large">("medium");
  const [newName, setNewName] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<number | null>(null);
  const [activeAlbumId, setActiveAlbumId] = useState<string | null>(null);
  const [menuAlbumId, setMenuAlbumId] = useState<string | null>(null);
  const [editingAlbumId, setEditingAlbumId] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<'name' | 'description' | null>(null);
  const [editingValue, setEditingValue] = useState('');

  // Pre-built smart albums based on criteria
  const smartAlbums = useMemo(() => {
    return CRITERIA_TEMPLATES.map((template, idx) => {
      const matching = photos.filter(p => {
        const c = template.criteria;
        if (c.onlyFavorites && !p.isFavorite) return false;
        if (c.ratingMin && p.rating < c.ratingMin) return false;
        if (c.ratingMax === 0 && p.rating > 0) return false;
        if (c.hasPreset === true && !p.presetApplied) return false;
        if (c.formats && c.formats.length > 0 && !c.formats.includes(p.fileFormat.toLowerCase())) return false;
        if (c.dateRange?.start) {
          const date = p.dateTaken || p.dateModified;
          if (new Date(date) < new Date(c.dateRange.start)) return false;
        }
        return true;
      });
      return { ...template, count: matching.length, photos: matching };
    });
  }, [photos]);

  const handleCreate = () => {
    if (!newName.trim() || selectedTemplate === null) return;
    const template = CRITERIA_TEMPLATES[selectedTemplate];
    const fullCriteria: FilterCriteria = {
      search: '', formats: [], dateRange: { start: null, end: null },
      ratingMin: 0, ratingMax: 5, colorLabels: [], tags: [],
      cameraModels: [], onlyFavorites: false, hasPreset: null,
      ...template.criteria,
    };
    onCreateSmartAlbum(newName.trim(), fullCriteria);
    setNewName('');
    setSelectedTemplate(null);
    setShowCreate(false);
  };
  const sizeMap = { small: 140, medium: 200, large: 300 };
  const gridColWidth = sizeMap[gridSize];

  // Show album content
  const activeAlbum = activeAlbumId ? smartAlbums.find((_, idx) => idx.toString() === activeAlbumId) : null;
  if (activeAlbum) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: t.bgPhotoStage }}>
        {/* Sticky header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: SPACING.md, padding: `${SPACING.sm}px ${SPACING.md}px`, background: t.bgPhotoStage, borderBottom: `1px solid ${t.borderLight}`, flexShrink: 0 }}>
          <button style={{
            padding: `${SPACING.sm}px ${SPACING.lg}px`, border: 'none',
            borderRadius: RADIUS.sm, background: t.bgSecondary, color: t.textPrimary,
            cursor: 'pointer', fontSize: TYPO.body.size, transition: TRANSITION.all,
          }}
            onClick={() => setActiveAlbumId(null)}
            onMouseEnter={e => { e.currentTarget.style.background = t.bgHover; }}
            onMouseLeave={e => { e.currentTarget.style.background = t.bgSecondary; }}
          ><span style={{ display: 'inline-flex', alignItems: 'center', gap: SPACING.xs }}><AppIcon name="back" size={14} color={t.textPrimary} />{tr('smartAlbum.back')}</span></button>
          <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: RADIUS.pill, background: t.accentBg, color: t.accent }}>{activeAlbum.icon}</span>
          <h2 style={{ margin: 0, fontSize: TYPO.heading.size, fontWeight: 600, color: t.textPrimary }}>
            {lang === 'zh-CN' ? activeAlbum.nameZh : activeAlbum.name}
          </h2>
          <span style={{ fontSize: TYPO.body.size, color: t.textTertiary }}>
            {activeAlbum.count} {tr('grid.photoCount')}
          </span>
        </div>
        {/* Sticky grid size controls */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: `${SPACING.sm}px ${SPACING.lg}px`, background: t.bgPhotoStage,
          borderBottom: `1px solid ${t.borderLight}`, flexShrink: 0,
        }}>
          <span style={{ fontSize: TYPO.body.size, color: t.textSecondary }}>
            {activeAlbum.count} {tr('grid.photoCount')}
          </span>
          <div style={{ display: 'flex', gap: SPACING.xs }}>
            {(['small', 'medium', 'large'] as const).map(size => (
              <button key={size} style={{
                padding: `${SPACING.xs}px ${SPACING.sm}px`, borderRadius: RADIUS.sm,
                background: gridSize === size ? t.accentLight : 'transparent',
                color: gridSize === size ? t.accent : t.textSecondary,
                cursor: 'pointer', fontSize: TYPO.small.size,
                transition: TRANSITION.all, border: 'none',
              }} onClick={() => setGridSize(size)}>{size}</button>
            ))}
          </div>
        </div>
        {/* Scrollable photos */}
        <div style={{ flex: 1, overflowY: 'auto', padding: `0 ${SPACING.md}px ${SPACING.md}px`, minHeight: 0 }}>
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fill, minmax(${gridColWidth}px, 1fr))`, gap: SPACING.md }}>
          {activeAlbum.photos.map(photo => (
            <div key={photo.id} style={{
              borderRadius: RADIUS.sm, overflow: 'hidden', cursor: 'pointer',
              background: t.bgCard,
              transition: `box-shadow ${DURATION.fast}ms ${EASING.out}`,
            }}
              onClick={() => onSelectPhoto(photo.id)}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = SHADOW.md; }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; }}
            >
              <div style={{ aspectRatio: '4/3', overflow: 'hidden', background: t.bgSecondary }}>
                <img src={photo.displayUrl || photo.thumbnailPath || (photo.fileFormat.includes('RAW') || photo.fileFormat.includes('NEF') || photo.fileFormat.includes('CR') ? `photoforge://raw/800/${encodeURIComponent(photo.filePath)}` : `photoforge://raw/${encodeURIComponent(photo.filePath)}`)}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" alt="" />
              </div>
              <div style={{ padding: `${SPACING.sm}px ${SPACING.md}px` }}>
                <div style={{ fontSize: TYPO.small.size, color: t.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{photo.fileName}</div>
                <div style={{ fontSize: TYPO.caption.size, color: t.textTertiary }}>{photo.fileFormat} · {photo.cameraModel || '—'}</div>
              </div>
            </div>
          ))}
        </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: t.bgPhotoStage }}>
      {/* Sticky header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: `${SPACING.sm}px ${SPACING.md}px`, background: t.bgPhotoStage, borderBottom: `1px solid ${t.borderLight}`, flexShrink: 0 }}>
        <h2 style={{ margin: 0, fontSize: TYPO.heading.size, fontWeight: 600, color: t.textPrimary }}>
          {tr('smartAlbum.title')}
        </h2>
      </div>
      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: `0 ${SPACING.md}px ${SPACING.md}px`, minHeight: 0 }}>

      {/* Built-in smart albums */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: SPACING.lg, marginBottom: SPACING.xxl }}>
        {smartAlbums.map((album, idx) => (
          <div key={idx} style={{
            background: t.bgSecondary, borderRadius: RADIUS.md,
            padding: SPACING.lg, cursor: 'pointer',
            transition: `box-shadow ${DURATION.fast}ms ${EASING.out}, transform ${DURATION.fast}ms ${EASING.out}`,
            boxShadow: '0 12px 28px rgba(0,0,0,0.16)',
          }}
            onClick={() => setActiveAlbumId(idx.toString())}
            onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 18px 34px rgba(0,0,0,0.22)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 12px 28px rgba(0,0,0,0.16)'; e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 48, height: 48, marginBottom: SPACING.sm, borderRadius: RADIUS.pill, background: t.accentBg, color: t.accent }}>{album.icon}</div>
            <div style={{ fontSize: TYPO.subheading.size, fontWeight: 600, color: t.textPrimary, marginBottom: SPACING.xs }}>
              {lang === 'zh-CN' ? album.nameZh : album.name}
            </div>
            <div style={{ fontSize: TYPO.display.size, fontWeight: 700, color: t.accent }}>
              {album.count}
            </div>
            <div style={{ fontSize: TYPO.caption.size, color: t.textTertiary }}>{tr('grid.photoCount')}</div>
          </div>
        ))}
      </div>

      {/* User-created smart albums */}
      {collections.filter(c => c.isSmart).length > 0 && (
        <>
          <h3 style={{ fontSize: TYPO.subheading.size, fontWeight: 600, color: t.textPrimary, marginBottom: SPACING.lg }}>
            {tr('smartAlbum.custom')}
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: SPACING.lg }}>
            {collections.filter(c => c.isSmart).map(col => (
              <div key={col.id} style={{
                background: t.bgSecondary, borderRadius: RADIUS.md,
                padding: SPACING.lg, position: 'relative',
                transition: TRANSITION.all, boxShadow: '0 12px 28px rgba(0,0,0,0.16)', cursor: 'pointer',
              }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 18px 34px rgba(0,0,0,0.22)'; }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 12px 28px rgba(0,0,0,0.16)'; }}
              >
                {/* ... menu button */}
                <button
                  style={{ position: 'absolute', top: SPACING.sm, right: SPACING.sm, background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 16, color: t.textTertiary, padding: 2, lineHeight: 1, borderRadius: RADIUS.sm, transition: TRANSITION.all }}
                  onClick={(e) => { e.stopPropagation(); setMenuAlbumId(menuAlbumId === col.id ? null : col.id); }}
                  onMouseEnter={e => { e.currentTarget.style.background = t.bgHover; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                ><AppIcon name="more" size={14} color={t.textTertiary} /></button>

                {/* Dropdown menu */}
                {menuAlbumId === col.id && (
                  <div style={{
                    position: 'absolute', top: SPACING.xl, right: SPACING.sm, background: t.dropdownBg,
                    borderRadius: RADIUS.md, boxShadow: SHADOW.lg,
                    zIndex: 50, minWidth: 160, padding: `${SPACING.xs}px 0`,
                  }}
                    onClick={e => e.stopPropagation()}
                  >
                    <button style={{ ...menuItemStyle(t), color: t.textPrimary }}
                      onClick={() => { setEditingAlbumId(col.id); setEditingField('name'); setEditingValue(col.name); setMenuAlbumId(null); }}
                      onMouseEnter={e => { e.currentTarget.style.background = t.bgHover; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                    ><span style={{ display: 'inline-flex', alignItems: 'center', gap: SPACING.xs }}><AppIcon name="edit" size={13} color={t.textPrimary} />{tr('album.rename')}</span></button>
                    <button style={{ ...menuItemStyle(t), color: t.textPrimary }}
                      onClick={() => { setEditingAlbumId(col.id); setEditingField('description'); setEditingValue(col.description || ''); setMenuAlbumId(null); }}
                      onMouseEnter={e => { e.currentTarget.style.background = t.bgHover; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                    ><span style={{ display: 'inline-flex', alignItems: 'center', gap: SPACING.xs }}><AppIcon name="info" size={13} color={t.textPrimary} />{tr('album.editDesc')}</span></button>
                    <button style={{ ...menuItemStyle(t), color: t.accent }}
                      onClick={() => { onExportAlbum?.(col.photoIds); setMenuAlbumId(null); }}
                      onMouseEnter={e => { e.currentTarget.style.background = t.bgHover; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                    ><span style={{ display: 'inline-flex', alignItems: 'center', gap: SPACING.xs }}><AppIcon name="export" size={13} color={t.accent} />{tr('album.export')}</span></button>
                    <div style={{ height: SPACING.xs }} />
                    <button style={{ ...menuItemStyle(t), color: t.danger }}
                      onClick={() => { onDeleteCollection(col.id); setMenuAlbumId(null); }}
                      onMouseEnter={e => { e.currentTarget.style.background = t.bgHover; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                    ><span style={{ display: 'inline-flex', alignItems: 'center', gap: SPACING.xs }}><AppIcon name="trash" size={13} color={t.danger} />{tr('album.delete')}</span></button>
                  </div>
                )}

                {/* Inline name editing */}
                {editingAlbumId === col.id && editingField === 'name' ? (
                  <input
                    autoFocus
                    value={editingValue}
                    placeholder={tr('album.namePlaceholder')}
                    onChange={e => setEditingValue(e.target.value)}
                    onBlur={() => { if (editingValue.trim()) onUpdateCollection?.(col.id, { name: editingValue.trim() }); setEditingAlbumId(null); setEditingField(null); }}
                    onKeyDown={e => { if (e.key === 'Enter') { if (editingValue.trim()) onUpdateCollection?.(col.id, { name: editingValue.trim() }); setEditingAlbumId(null); setEditingField(null); } if (e.key === 'Escape') { setEditingAlbumId(null); setEditingField(null); } }}
                    style={{ fontSize: TYPO.subheading.size, fontWeight: 600, color: t.textPrimary, background: t.bgSecondary, border: `1px solid ${t.accent}`, borderRadius: RADIUS.sm, padding: `${SPACING.xs}px ${SPACING.sm}px`, width: '100%', outline: 'none' }}
                    onClick={e => e.stopPropagation()}
                  />
                ) : (
                  <div style={{ fontSize: TYPO.subheading.size, fontWeight: 600, color: t.textPrimary, marginBottom: SPACING.xs }}>{col.name}</div>
                )}
                <div style={{ fontSize: TYPO.body.size, color: t.accent, fontWeight: 600 }}>{col.photoIds.length}</div>
                <div style={{ fontSize: TYPO.caption.size, color: t.textTertiary }}>{tr('grid.photoCount')}</div>
                {/* Inline description editing */}
                {editingAlbumId === col.id && editingField === 'description' ? (
                  <input
                    autoFocus
                    value={editingValue}
                    placeholder={tr('album.descPlaceholder')}
                    onChange={e => setEditingValue(e.target.value)}
                    onBlur={() => { onUpdateCollection?.(col.id, { description: editingValue }); setEditingAlbumId(null); setEditingField(null); }}
                    onKeyDown={e => { if (e.key === 'Enter') { onUpdateCollection?.(col.id, { description: editingValue }); setEditingAlbumId(null); setEditingField(null); } if (e.key === 'Escape') { setEditingAlbumId(null); setEditingField(null); } }}
                    style={{ fontSize: TYPO.caption.size, color: t.textTertiary, background: t.bgSecondary, border: `1px solid ${t.accent}`, borderRadius: RADIUS.sm, padding: `${SPACING.xs}px ${SPACING.sm}px`, width: '100%', outline: 'none', marginTop: SPACING.xs }}
                    onClick={e => e.stopPropagation()}
                  />
                ) : (
                  col.description && <div style={{ fontSize: TYPO.caption.size, color: t.textTertiary, marginTop: SPACING.xs }}>{col.description}</div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
      </div>
    </div>
  );
};
