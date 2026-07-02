import React, { useState, useEffect, useRef } from 'react';
import { PhotoFile } from '../../shared/types';
import { Theme, SPACING, RADIUS, TYPO, DURATION, EASING, SHADOW, TRANSITION } from '../styles/theme';
import { useI18n } from '../i18n';
import { ContextMenu, ContextMenuItem } from './ContextMenu';
import { AppIcon } from './AppIcon';

// Progressive image loading: shows thumbnail first, then loads preview
function useProgressiveImage(photoId: string, fallbackSrc: string) {
  const [src, setSrc] = useState(fallbackSrc);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setSrc(fallbackSrc);
    setLoaded(false);

    window.photoForge.getPhotoPreview(photoId).then(previewUrl => {
      if (!cancelled && previewUrl) {
        // Preload the image, then swap
        const img = new Image();
        img.onload = () => {
          if (!cancelled) {
            setSrc(previewUrl);
            setLoaded(true);
          }
        };
        img.onerror = () => {
          // Preview failed, keep fallback
        };
        img.src = previewUrl;
      }
    }).catch(() => {});

    return () => { cancelled = true; };
  }, [photoId, fallbackSrc]);

  return { src, loaded };
}

interface PhotoGridProps {
  photos: PhotoFile[];
  refreshKey?: number;
  selectedIds: Set<string>;
  onSelect: (id: string, multi?: boolean, shift?: boolean) => void;
  onOpenDetail: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  onDelete?: (ids: string[]) => void;
  onSetRating?: (photoId: string, rating: number) => void;
  onCompare?: () => void;
  theme: Theme;
  manageMode?: boolean;
  onManageModeChange?: (manage: boolean) => void;
  thumbnailSize: number;
  showFileExtensions: boolean;
  showGridInfo: boolean;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
}

// ProgressiveImage component — renders thumbnail, upgrades to preview
const ProgressiveImage: React.FC<{ photo: PhotoFile; style: React.CSSProperties }> = ({ photo, style }) => {
  const fallbackSrc = photo.displayUrl || (photo.thumbnailPath ? `file://${photo.thumbnailPath}` : null) || `photoforge://raw/${encodeURIComponent(photo.filePath)}`;
  const { src, loaded } = useProgressiveImage(photo.id, fallbackSrc);
  
  return (
    <img
      src={src}
      style={{
        ...style,
        opacity: loaded ? 1 : 0,
        transition: `opacity ${DURATION.normal}ms ${EASING.out}`,
      }}
      loading="lazy"
      alt={photo.fileName}
    />
  );
};

export const PhotoGrid: React.FC<PhotoGridProps> = ({
  photos, refreshKey, selectedIds, onSelect, onOpenDetail, onToggleFavorite, onDelete, onCompare, onSetRating, manageMode, onManageModeChange,
  theme: t, thumbnailSize, showFileExtensions, showGridInfo,
}) => {
  const { t: tr } = useI18n();
  const [gridSize, setGridSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [favAnimating, setFavAnimating] = useState<string | null>(null);
  const [presetAppliedId, setPresetAppliedId] = useState<string | null>(null);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [ratingHoverId, setRatingHoverId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; photoId: string } | null>(null);
  const sizeMap = { small: 180, medium: 240, large: 340 };
  const thumbScale = thumbnailSize <= 200 ? 0.75 : thumbnailSize >= 800 ? 1.3 : 1.0;

  if (photos.length === 0) {
    return (
      <div style={s(t).empty}>
        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 72, height: 72, marginBottom: SPACING.lg, borderRadius: RADIUS.pill, background: t.bgPhotoSurface }}><AppIcon name="camera" size={34} color={t.accent} /></div>
        <div style={{ fontSize: TYPO.heading.size, marginBottom: SPACING.sm, color: t.emptyState }}>{tr('grid.noPhotos')}</div>
        <div style={{ fontSize: TYPO.body.size, color: t.textTertiary }}>{tr('grid.importHint')}</div>
      </div>
    );
  }

  const getDisplayName = (photo: PhotoFile) => {
    if (showFileExtensions) return photo.fileName;
    const lastDot = photo.fileName.lastIndexOf('.');
    return lastDot > 0 ? photo.fileName.substring(0, lastDot) : photo.fileName;
  };

  const colWidth = Math.round(sizeMap[gridSize] * thumbScale);

  const handleFavClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setFavAnimating(id);
    onToggleFavorite(id);
    setTimeout(() => setFavAnimating(null), 300);
  };

  return (
    <div style={s(t).wrapper}>
      {/* Sticky controls bar */}
      <div style={s(t).controls}>
        <span style={{ fontSize: TYPO.body.size, color: t.textSecondary }}>{photos.length} {tr('grid.photoCount')}</span>
        <div style={{ display: 'flex', gap: SPACING.xs }}>
          {(['small', 'medium', 'large'] as const).map(size => (
            <button key={size} style={{
              padding: `${SPACING.xs}px ${SPACING.sm}px`,
              borderRadius: RADIUS.sm,
              background: gridSize === size ? t.accentLight : 'transparent',
              color: gridSize === size ? t.accent : t.textTertiary,
              cursor: 'pointer',
              fontSize: TYPO.small.size,
              transition: TRANSITION.all,
            }}
              onClick={() => setGridSize(size)}
              onMouseEnter={e => { if (gridSize !== size) e.currentTarget.style.background = t.bgHover; }}
              onMouseLeave={e => { if (gridSize !== size) e.currentTarget.style.background = 'transparent'; }}
            >
              <AppIcon
                name={size === 'small' ? 'gridSmall' : size === 'medium' ? 'gridMedium' : 'gridLarge'}
                size={13}
                color={gridSize === size ? t.accent : t.textTertiary}
              />
            </button>
          ))}
        </div>
      </div>

      {/* Scrollable grid */}
      <div key={refreshKey} style={s(t).scrollArea}>
      <div style={{ ...s(t).grid, gridTemplateColumns: `repeat(auto-fill, minmax(${colWidth}px, 1fr))` }}>
        {photos.map((photo, idx) => {
          const isSelected = selectedIds.has(photo.id);
          const isHovered = hoveredId === photo.id;
          const isFavAnimating = favAnimating === photo.id;

          return (
            <div key={photo.id} style={{
              ...s(t).card,
              width: '100%',
              outline: 'none',
              boxShadow: isSelected ? `0 0 0 3px ${t.accent}` : (isHovered ? SHADOW.md : SHADOW.sm),
              transform: isHovered ? 'translateY(-2px)' : 'translateY(0)',
              background: (manageMode && isSelected) ? t.selectedBg : t.bgPhotoSurface,
              animation: `fadeInUp ${DURATION.normal}ms ${EASING.out} ${Math.min(idx * 30, 300)}ms both`,
              position: 'relative',
            }}
              onClick={e => { e.stopPropagation(); if (manageMode) { onSelect(photo.id, e.metaKey || e.ctrlKey, e.shiftKey); } else { onOpenDetail(photo.id); } }}
              onDoubleClick={() => { if (manageMode) { onSelect(photo.id); } else { onOpenDetail(photo.id); } }}
              onContextMenu={e => { e.preventDefault(); e.stopPropagation(); setContextMenu({ x: e.clientX, y: e.clientY, photoId: photo.id }); }}
              onMouseEnter={() => setHoveredId(photo.id)}
              onMouseLeave={() => setHoveredId(null)}
            >
              {/* Selection checkbox overlay — only visible in manageMode */}
              {manageMode && (isHovered || isSelected) && (
                <div style={{
                  position: 'absolute', top: SPACING.sm, right: SPACING.sm, zIndex: 5,
                  width: 24, height: 24, borderRadius: RADIUS.pill,
                  background: isSelected ? t.accent : 'rgba(0,0,0,0.35)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: `background ${DURATION.fast}ms ${EASING.out}, transform ${DURATION.fast}ms ${EASING.spring}`,
                  border: isSelected ? 'none' : '2px solid rgba(255,255,255,0.7)',
                  pointerEvents: 'none',
                }}>
                  {isSelected && (
                    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={t.textInverse} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </div>
              )}
              <div style={{ ...s(t).thumbWrap, aspectRatio: '3/2' }}>
                <ProgressiveImage
                  photo={photo}
                  style={{
                    ...s(t).thumb,
                    transform: [photo.flipH ? 'scaleX(-1)' : '', photo.flipV ? 'scaleY(-1)' : '', photo.rotation ? `rotate(${photo.rotation}deg)` : ''].filter(Boolean).join(' ') || undefined,
                  }}

                />
                {photo.presetApplied && (
                  <div style={{
                    ...s(t).presetBadge,
                    animation: isHovered ? `pulseGlow 1.5s ease-in-out infinite` : 'none',
                  }}><AppIcon name="sparkles" size={11} color={t.textInverse} /></div>
                )}
                <button
                  style={{
                    ...(photo.isFavorite ? s(t).favActive : s(t).favBtn),
                    transform: isFavAnimating ? 'scale(1.3)' : 'scale(1)',
                    transition: `transform ${DURATION.fast}ms ${EASING.spring}, background ${DURATION.fast}ms ${EASING.out}`,
                }}
                  onClick={e => handleFavClick(e, photo.id)}
                >
                  <AppIcon name="star" size={14} color={photo.isFavorite ? t.favStar : t.textTertiary} filled={photo.isFavorite} />
                </button>
                <div style={{
                    position: 'absolute', bottom: SPACING.sm, left: 0, right: 0,
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: `0 ${SPACING.sm}px`,
                    opacity: isHovered ? 1 : 0.7,
                    transition: `opacity ${DURATION.fast}ms ${EASING.out}`,
                    pointerEvents: 'none',
                  }}>
                    {/* Left: Rating stars (5 tiny dots/stars) — clickable area */}
                    <div style={{ display: 'flex', gap: 2, pointerEvents: 'auto' }}
                      onMouseEnter={() => setRatingHoverId(photo.id)}
                      onMouseLeave={() => setRatingHoverId(null)}
                    >
                      {[1,2,3,4,5].map((star) => {
                        const filled = star <= photo.rating;
                        const hoverFill = ratingHoverId === photo.id && star <= (photo.rating || 1);
                        return (
                          <span key={star}
                            onClick={(e) => { e.stopPropagation(); const newRating = (filled && star === photo.rating ? star - 1 : star) as 0|1|2|3|4|5; onSetRating?.(photo.id, newRating); }}
                            style={{
                              fontSize: 10, cursor: 'pointer', color: filled ? t.ratingStar : 'rgba(255,255,255,0.3)',
                              textShadow: filled ? '0 0 4px rgba(0,0,0,0.5)' : '0 1px 2px rgba(0,0,0,0.3)',
                              transition: `color ${DURATION.fast}ms ${EASING.out}, transform ${DURATION.instant}ms ${EASING.out}`,
                              lineHeight: 1, userSelect: 'none', padding: '1px',
                            }}
                          >★</span>
                        );
                      })}
                    </div>
                    {/* Right: reference badge */}
                    {photo.isReferenced && <span style={{ fontSize: TYPO.tiny.size, pointerEvents: 'auto' }}><AppIcon name="link" size={10} color={t.textInverse} /></span>}
                  </div>
              </div>

              {showGridInfo ? (
                <div style={s(t).info}>
                  <div style={s(t).fileName} title={photo.fileName}>{getDisplayName(photo)}</div>
                  <div style={s(t).meta}>
                    <span>{photo.fileFormat}</span>
                    <span style={{ margin: `0 ${SPACING.xs}px` }}>·</span>
                    <span>{formatFileSize(photo.fileSize)}</span>
                  </div>
                  {photo.cameraModel && <div style={s(t).camera}>{photo.cameraModel}</div>}
                </div>
              ) : (
                <div style={{ ...s(t).info, padding: `${SPACING.sm}px ${SPACING.lg}px` }}>
                  <div style={s(t).fileName} title={photo.fileName}>{getDisplayName(photo)}</div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      </div>

      {/* Context menu */}
      {contextMenu && (() => {
        const photo = photos.find(p => p.id === contextMenu.photoId);
        if (!photo) return null;
        const items: ContextMenuItem[] = [
          { label: tr('context.open'), icon: 'open', action: () => onOpenDetail(photo.id) },
          { label: photo.isFavorite ? tr('context.unfavorite') : tr('context.favorite'), icon: 'star', action: () => onToggleFavorite(photo.id) },
          { separator: true, label: '', action: () => {} },
          { label: tr('context.info'), icon: 'info', action: () => onOpenDetail(photo.id) },
          { separator: true, label: '', action: () => {} },
          { label: tr('context.delete'), icon: 'trash', action: () => onDelete?.([photo.id]), danger: true },
        ];
        return <ContextMenu x={contextMenu.x} y={contextMenu.y} items={items} onClose={() => setContextMenu(null)} theme={t} />;
      })()}
    </div>
  );
};

const s = (t: Theme): Record<string, React.CSSProperties> => ({
  wrapper: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: t.bgPhotoStage, minHeight: 0 },
  controls: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: `${SPACING.sm}px ${SPACING.md}px ${SPACING.sm}px 0`, background: t.bgPhotoStage, flexShrink: 0, borderBottom: `1px solid ${t.borderLight}` },
  scrollArea: { flex: 1, overflowY: 'auto', padding: `3px ${SPACING.md}px ${SPACING.md}px 3px`, minHeight: 0 },
  grid: { display: 'grid', gap: SPACING.lg },
  card: {
    background: t.bgPhotoSurface, borderRadius: RADIUS.md, overflow: 'hidden',
    cursor: 'pointer', boxShadow: '0 12px 28px rgba(0,0,0,0.12)',
    transition: `box-shadow ${DURATION.fast}ms ${EASING.out}, transform ${DURATION.fast}ms ${EASING.out}, background ${DURATION.fast}ms ${EASING.out}`,
  },
  thumbWrap: { position: 'relative', width: '100%', overflow: 'hidden', background: t.bgPhotoStage },
  thumb: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
  presetBadge: {
    position: 'absolute', top: SPACING.sm, right: SPACING.sm,
    background: t.accent, borderRadius: '50%', width: 22, height: 22,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 11, color: t.textInverse,
  },
  favBtn: {
    position: 'absolute', top: SPACING.sm, left: SPACING.sm,
    background: t.bgOverlay, borderRadius: '50%', width: 28, height: 28,
    color: t.textTertiary, cursor: 'pointer', fontSize: 14,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: TRANSITION.all, backdropFilter: 'blur(4px)',
  },
  favActive: {
    position: 'absolute', top: SPACING.sm, left: SPACING.sm,
    background: t.bgOverlay, borderRadius: '50%', width: 28, height: 28,
    color: t.favStar, cursor: 'pointer', fontSize: 14,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: TRANSITION.all, backdropFilter: 'blur(4px)',
  },
  gridInfoOverlay: {
    position: 'absolute', bottom: SPACING.sm, left: SPACING.sm, right: SPACING.sm,
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    transition: `opacity ${DURATION.fast}ms ${EASING.out}`,
  },
  ratingBadgeInline: { color: t.ratingStar, fontSize: TYPO.tiny.size, textShadow: '0 1px 3px rgba(0,0,0,0.2)' },
  refBadgeInline: { fontSize: TYPO.tiny.size },
  info: { padding: `${SPACING.md}px ${SPACING.lg}px` },
  fileName: {
    fontSize: TYPO.small.size, color: t.textPrimary, fontWeight: TYPO.bodyBold.weight,
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: SPACING.xs,
  },
  meta: { display: 'flex', alignItems: 'center', fontSize: TYPO.caption.size, color: t.textTertiary },
  camera: { fontSize: TYPO.caption.size, color: t.textTertiary, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  empty: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: t.bgPhotoStage },
});
