import React, { useMemo, useState } from 'react';
import { PhotoFile } from '../../shared/types';
import { Theme, SPACING, RADIUS, TYPO, DURATION, EASING, TRANSITION, SHADOW } from '../styles/theme';
import { useI18n } from '../i18n';
import { AppIcon } from './AppIcon';

interface DateGroupViewProps {
  photos: PhotoFile[];
  onSelectPhoto: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  selectedIds: Set<string>;
  theme: Theme;
}

type GroupMode = 'day' | 'month' | 'year';

interface DateGroup {
  label: string;
  dateKey: string;
  photos: PhotoFile[];
}

export const DateGroupView: React.FC<DateGroupViewProps> = ({ photos, onSelectPhoto, onToggleFavorite, selectedIds, theme: t }) => {
  const { t: tr, lang } = useI18n();
  const [groupMode, setGroupMode] = useState<GroupMode>('month');

  const groups = useMemo((): DateGroup[] => {
    const map = new Map<string, PhotoFile[]>();

    for (const photo of photos) {
      const date = photo.dateTaken ? new Date(photo.dateTaken) : new Date(photo.dateModified);
      let key: string;
      let label: string;

      switch (groupMode) {
        case 'day':
          key = date.toISOString().slice(0, 10);
          label = lang === 'zh-CN'
            ? `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`
            : date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
          break;
        case 'year':
          key = date.getFullYear().toString();
          label = `${date.getFullYear()}`;
          break;
        case 'month':
        default:
          key = date.toISOString().slice(0, 7);
          label = lang === 'zh-CN'
            ? `${date.getFullYear()}年${date.getMonth() + 1}月`
            : date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
          break;
      }

      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(photo);
    }

    return Array.from(map.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([key, photos]) => ({ dateKey: key, label: key, photos }))
      .map((group, _, arr) => {
        // Recalculate label properly
        const date = group.photos[0]?.dateTaken ? new Date(group.photos[0].dateTaken) : new Date(group.photos[0].dateModified);
        let label: string;
        switch (groupMode) {
          case 'day':
            label = lang === 'zh-CN'
              ? `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`
              : date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
            break;
          case 'year':
            label = `${date.getFullYear()}`;
            break;
          default:
            label = lang === 'zh-CN'
              ? `${date.getFullYear()}年${date.getMonth() + 1}月`
              : date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
        }
        return { ...group, label };
      });
  }, [photos, groupMode, lang]);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1048576) return (bytes / 1024).toFixed(0) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: t.bgPhotoStage }}>
      {/* Sticky group mode toggle */}
      <div style={{ display: 'flex', gap: SPACING.sm, padding: `${SPACING.sm}px ${SPACING.md}px`, background: t.bgPhotoStage, borderBottom: `1px solid ${t.borderLight}`, flexShrink: 0 }}>
        {(['day', 'month', 'year'] as const).map(mode => (
          <button key={mode} style={{
            padding: `${SPACING.sm}px ${SPACING.lg}px`,
            border: 'none',
            borderRadius: RADIUS.sm,
            background: groupMode === mode ? t.accentLight : 'transparent',
            color: groupMode === mode ? t.accent : t.textSecondary,
            cursor: 'pointer',
            fontSize: TYPO.small.size,
            fontWeight: groupMode === mode ? 600 : 400,
            transition: TRANSITION.all,
          }}
            onClick={() => setGroupMode(mode)}
            onMouseEnter={e => { if (groupMode !== mode) e.currentTarget.style.background = t.bgHover; }}
            onMouseLeave={e => { if (groupMode !== mode) e.currentTarget.style.background = 'transparent'; }}
          >{tr(`dateGroup.${mode}`)}</button>
        ))}
      </div>

      {/* Scrollable groups */}
      <div style={{ flex: 1, overflowY: 'auto', padding: `0 ${SPACING.md}px ${SPACING.md}px`, minHeight: 0 }}>
      {/* Groups */}
      {groups.map(group => (
        <div key={group.dateKey} style={{ marginBottom: SPACING.xl }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: SPACING.md, marginBottom: SPACING.md }}>
            <h3 style={{ margin: 0, fontSize: TYPO.subheading.size, fontWeight: 600, color: t.textPrimary }}>
              {group.label}
            </h3>
            <span style={{ fontSize: TYPO.caption.size, color: t.textTertiary }}>
              {group.photos.length} {tr('grid.photoCount')}
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: SPACING.sm }}>
            {group.photos.map(photo => (
              <div key={photo.id} style={{
                borderRadius: RADIUS.sm, overflow: 'hidden', cursor: 'pointer',
                outline: selectedIds.has(photo.id) ? `2px solid ${t.accent}` : 'none',
                outlineOffset: -2,
                background: t.bgCard, transition: `box-shadow ${DURATION.fast}ms ${EASING.out}, transform ${DURATION.fast}ms ${EASING.out}`,
                position: 'relative',
              }}
                onClick={() => onSelectPhoto(photo.id)}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = SHADOW.md; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'translateY(0)'; }}
              >
                <div style={{ aspectRatio: '1', overflow: 'hidden', background: t.bgSecondary }}>
                  <img
                    src={photo.displayUrl || photo.thumbnailPath || (photo.fileFormat.includes('RAW') || photo.fileFormat.includes('NEF') || photo.fileFormat.includes('CR') ? `photoforge://raw/800/${encodeURIComponent(photo.filePath)}` : `photoforge://raw/${encodeURIComponent(photo.filePath)}`)}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    loading="lazy" alt={photo.fileName}
                  />
                </div>
                <div style={{ padding: `${SPACING.xs}px ${SPACING.sm}px` }}>
                  <div style={{ fontSize: TYPO.caption.size, color: t.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {photo.fileName}
                  </div>
                  <div style={{ fontSize: 9, color: t.textTertiary }}>
                    {photo.dateTaken ? new Date(photo.dateTaken).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                    {' '}{photo.cameraModel || ''}
                  </div>
                </div>
                {photo.isFavorite && (
                  <span style={{ position: 'absolute', top: 6, right: 6, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 22, height: 22, borderRadius: RADIUS.pill, background: t.bgOverlay }}><AppIcon name="star" size={12} color={t.favStar} filled /></span>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
      </div>
    </div>
  );
};
