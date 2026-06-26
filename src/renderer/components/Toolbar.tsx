import React, { useState, useRef, useEffect } from 'react';
import { SortCriteria, SortField, Preset } from '../../shared/types';
import { Theme, SPACING, RADIUS, TYPO, DURATION, EASING, SHADOW, TRANSITION, Z_INDEX, COMPONENT_HEIGHT } from '../styles/theme';
import { useI18n } from '../i18n';
import { AppIcon } from './AppIcon';

interface ToolbarProps {
  viewMode: string;
  sort: SortCriteria;
  onSortChange: (sort: SortCriteria) => void;
  onImport: () => void;
  onTogglePresets: () => void;
  onToggleSidebar: () => void;
  selectedCount: number;
  onBatchApplyPreset: (presetId: string) => void;
  presets: Preset[];
  onCompare: () => void;
  canCompare: boolean;
  onOpenSettings: () => void;
  onOpenStatistics: () => void;
  onOpenSmartAlbums: () => void;
  onOpenDateGroup: () => void;
  onDeleteSelected: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  theme: Theme;
  children?: React.ReactNode; // SearchBar slot
}

const sortFields: { value: SortField; labelKey: string }[] = [
  { value: 'dateTaken', labelKey: 'sort.dateTaken' },
  { value: 'dateModified', labelKey: 'sort.dateModified' },
  { value: 'fileName', labelKey: 'sort.fileName' },
  { value: 'fileFormat', labelKey: 'sort.fileFormat' },
  { value: 'fileSize', labelKey: 'sort.fileSize' },
  { value: 'rating', labelKey: 'sort.rating' },
];

export const Toolbar: React.FC<ToolbarProps> = ({
  viewMode, sort, onSortChange, onImport, onTogglePresets, onToggleSidebar,
  selectedCount, onBatchApplyPreset, presets, onCompare, canCompare,
  onOpenSettings, onOpenStatistics, onOpenSmartAlbums, onOpenDateGroup, onDeleteSelected, onUndo, onRedo,
  canUndo, canRedo, theme: t, children,
}) => {
  const { t: tr } = useI18n();
  const [showBatchPreset, setShowBatchPreset] = useState(false);
  const [showSort, setShowSort] = useState(false);
  const sortRef = useRef<HTMLDivElement>(null);
  const batchRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) setShowSort(false);
      if (batchRef.current && !batchRef.current.contains(e.target as Node)) setShowBatchPreset(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div style={s(t).toolbar}>
      {/* Left: Navigation + Import */}
      <div style={s(t).left}>
        <button
          style={s(t).iconBtn}
          onClick={onToggleSidebar}
          title={tr('toolbar.toggleSidebar')}
          onMouseEnter={e => { e.currentTarget.style.background = t.bgHover; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
        ><AppIcon name="menu" size={16} color={t.textSecondary} /></button>

        <button
          style={s(t).primaryBtn}
          onClick={onImport}
          onMouseEnter={e => { e.currentTarget.style.background = t.accentHover; e.currentTarget.style.transform = 'translateY(-1px)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = t.accent; e.currentTarget.style.transform = 'translateY(0)'; }}
        >+ {tr('toolbar.import')}</button>

        <div style={s(t).sep} />

        {/* Sort dropdown */}
        <div ref={sortRef} style={{ position: 'relative' }}>
          <button
            style={s(t).btn}
            onClick={() => setShowSort(!showSort)}
            onMouseEnter={e => { e.currentTarget.style.background = t.bgHover; }}
            onMouseLeave={e => { e.currentTarget.style.background = t.bgSecondary; }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: SPACING.xs }}>
              {tr('toolbar.sort')}: {tr(sortFields.find(f => f.value === sort.field)?.labelKey || 'sort.dateTaken')}
              <AppIcon name={sort.order === 'asc' ? 'sortAsc' : 'sortDesc'} size={13} color={t.textSecondary} />
            </span>
          </button>
          {showSort && (
            <div style={s(t).dropdown}>
              {sortFields.map(f => (
                <button key={f.value} style={{
                  ...s(t).dropItem,
                  background: sort.field === f.value ? t.accentLight : 'transparent',
                  color: sort.field === f.value ? t.accent : t.textPrimary,
                }}
                  onClick={() => { onSortChange({ ...sort, field: f.value }); setShowSort(false); }}
                  onMouseEnter={e => { if (sort.field !== f.value) e.currentTarget.style.background = t.bgHover; }}
                  onMouseLeave={e => { if (sort.field !== f.value) e.currentTarget.style.background = 'transparent'; }}
                >{tr(f.labelKey)}</button>
              ))}
              <div style={{ height: SPACING.xs }} />
              <button style={s(t).dropItem}
                onClick={() => { onSortChange({ ...sort, order: sort.order === 'asc' ? 'desc' : 'asc' }); setShowSort(false); }}
                onMouseEnter={e => { e.currentTarget.style.background = t.bgHover; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
              >{sort.order === 'asc' ? tr('toolbar.switchDesc') : tr('toolbar.switchAsc')}</button>
            </div>
          )}
        </div>
      </div>

      {/* Center: Search + Brand */}
      <div style={s(t).center}>
        <span style={s(t).brand}>{tr('app.name')}</span>
        {children}
      </div>

      {/* Right: Actions */}
      <div style={s(t).right}>
        {/* Undo / Redo */}
        <button style={{ ...s(t).iconBtn, opacity: canUndo ? 1 : 0.3, cursor: canUndo ? 'pointer' : 'not-allowed' }}
          onClick={canUndo ? onUndo : undefined}
          title={tr('toolbar.undoTooltip')}
          onMouseEnter={e => { if (canUndo) e.currentTarget.style.background = t.bgHover; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
        ><AppIcon name="undo" size={16} color={t.textSecondary} /></button>
        <button style={{ ...s(t).iconBtn, opacity: canRedo ? 1 : 0.3, cursor: canRedo ? 'pointer' : 'not-allowed' }}
          onClick={canRedo ? onRedo : undefined}
          title={tr('toolbar.redoTooltip')}
          onMouseEnter={e => { if (canRedo) e.currentTarget.style.background = t.bgHover; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
        ><AppIcon name="redo" size={16} color={t.textSecondary} /></button>

        <div style={s(t).sep} />

        {/* Batch preset (when selected) */}
        {selectedCount > 0 && (
          <>
            <div ref={batchRef} style={{ position: 'relative', display: 'inline-block' }}>
              <button style={s(t).accentBtn}
                onClick={() => setShowBatchPreset(!showBatchPreset)}
                onMouseEnter={e => { e.currentTarget.style.background = t.accentHover; }}
                onMouseLeave={e => { e.currentTarget.style.background = t.accent; }}
              ><AppIcon name="sparkles" size={15} color={t.textInverse} style={{ marginRight: 6 }} />{tr('toolbar.batchPreset')} ({selectedCount})</button>
              {showBatchPreset && (
                <div style={{ ...s(t).dropdown, right: 0, minWidth: 200 }}>
                  {presets.slice(0, 20).map(p => (
                    <button key={p.id} style={s(t).dropItem}
                      onClick={() => { onBatchApplyPreset(p.id); setShowBatchPreset(false); }}
                      onMouseEnter={e => { e.currentTarget.style.background = t.bgHover; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                    >{p.name}</button>
                  ))}
                </div>
              )}
            </div>
            <button style={s(t).dangerBtn}
              onClick={onDeleteSelected}
              onMouseEnter={e => { e.currentTarget.style.background = t.dangerHover || t.danger; }}
              onMouseLeave={e => { e.currentTarget.style.background = t.danger; }}
            ><AppIcon name="trash" size={15} color={t.textInverse} style={{ marginRight: 6 }} />({selectedCount})</button>
          </>
        )}

        {canCompare && (
          <button style={s(t).btn}
            onClick={onCompare}
            onMouseEnter={e => { e.currentTarget.style.background = t.bgHover; }}
            onMouseLeave={e => { e.currentTarget.style.background = t.bgSecondary; }}
          >{tr('toolbar.compare')}</button>
        )}

        <button style={s(t).btnOutline}
          onClick={onTogglePresets}
          onMouseEnter={e => { e.currentTarget.style.background = t.accentLight; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
        >{tr('toolbar.presets')}</button>

        <button style={s(t).iconBtn}
          onClick={onOpenSmartAlbums}
          title={tr('toolbar.smartAlbums')}
          onMouseEnter={e => { e.currentTarget.style.background = t.bgHover; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
        ><AppIcon name="albums" size={16} color={t.textSecondary} /></button>

        <button style={s(t).iconBtn}
          onClick={onOpenDateGroup}
          title={tr('toolbar.dateGroup')}
          onMouseEnter={e => { e.currentTarget.style.background = t.bgHover; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
        ><AppIcon name="calendar" size={16} color={t.textSecondary} /></button>

        <button style={s(t).iconBtn}
          onClick={onOpenStatistics}
          title={tr('toolbar.statistics')}
          onMouseEnter={e => { e.currentTarget.style.background = t.bgHover; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
        ><AppIcon name="stats" size={16} color={t.textSecondary} /></button>

        <button style={s(t).iconBtn}
          onClick={onOpenSettings}
          title={tr('toolbar.settings')}
          onMouseEnter={e => { e.currentTarget.style.background = t.bgHover; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
        ><AppIcon name="settings" size={16} color={t.textSecondary} /></button>
      </div>
    </div>
  );
};

const s = (t: Theme): Record<string, React.CSSProperties> => ({
  toolbar: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    height: COMPONENT_HEIGHT.toolbar, padding: `0 ${SPACING.lg}px`,
    background: t.bgPhotoStage,
    userSelect: 'none', flexShrink: 0, gap: SPACING.sm,
  },
  left: { display: 'flex', alignItems: 'center', gap: SPACING.sm },
  center: { display: 'flex', alignItems: 'center', gap: SPACING.lg, flex: 1, justifyContent: 'center' },
  right: { display: 'flex', alignItems: 'center', gap: SPACING.sm },
  brand: { fontSize: TYPO.large.size, fontWeight: TYPO.large.weight, color: t.accent, letterSpacing: '-0.3px', whiteSpace: 'nowrap' },
  btn: {
    padding: `${SPACING.sm}px ${SPACING.lg}px`, border: 'none', borderRadius: RADIUS.sm,
    background: t.bgSecondary, color: t.textPrimary, cursor: 'pointer',
    fontSize: TYPO.body.size, transition: TRANSITION.all, whiteSpace: 'nowrap',
  },
  primaryBtn: {
    padding: `${SPACING.sm}px ${SPACING.lg}px`, border: 'none', borderRadius: RADIUS.sm,
    background: t.accent, color: t.textInverse, cursor: 'pointer',
    fontSize: TYPO.body.size, fontWeight: TYPO.bodyBold.weight, transition: TRANSITION.all,
    whiteSpace: 'nowrap',
  },
  accentBtn: {
    padding: `${SPACING.sm}px ${SPACING.lg}px`, border: 'none', borderRadius: RADIUS.sm,
    background: t.accent, color: t.textInverse, cursor: 'pointer',
    fontSize: TYPO.body.size, transition: TRANSITION.all, whiteSpace: 'nowrap',
  },
  dangerBtn: {
    padding: `${SPACING.sm}px ${SPACING.lg}px`, border: 'none', borderRadius: RADIUS.sm,
    background: t.danger, color: t.textInverse, cursor: 'pointer',
    fontSize: TYPO.body.size, transition: TRANSITION.all, whiteSpace: 'nowrap',
  },
  iconBtn: {
    width: COMPONENT_HEIGHT.buttonMd, height: COMPONENT_HEIGHT.buttonMd,
    border: 'none', borderRadius: RADIUS.sm, background: 'transparent',
    color: t.textSecondary, cursor: 'pointer', fontSize: 16,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: TRANSITION.all,
  },
  sep: { width: SPACING.xs, height: 20, background: 'transparent', margin: 0 },
  btnOutline: {
    padding: `${SPACING.sm}px ${SPACING.lg}px`, border: 'none',
    borderRadius: RADIUS.sm, background: t.accentLight, color: t.accent,
    cursor: 'pointer', fontSize: TYPO.body.size, fontWeight: TYPO.bodyBold.weight,
    transition: TRANSITION.all, whiteSpace: 'nowrap',
  },
  dropdown: {
    position: 'absolute', top: '100%', left: 0, zIndex: Z_INDEX.dropdown,
    background: t.dropdownBg,
    borderRadius: RADIUS.md, padding: SPACING.xs, minWidth: 140,
    maxHeight: 300, overflowY: 'auto', boxShadow: SHADOW.lg,
    animation: `fadeInUp ${DURATION.fast}ms ${EASING.out}`,
  },
  dropItem: {
    display: 'block', width: '100%', padding: `${SPACING.sm}px ${SPACING.lg}px`,
    border: 'none', borderRadius: RADIUS.sm, background: 'transparent',
    color: t.textPrimary, cursor: 'pointer', fontSize: TYPO.body.size,
    textAlign: 'left', transition: TRANSITION.bg,
  },
});
