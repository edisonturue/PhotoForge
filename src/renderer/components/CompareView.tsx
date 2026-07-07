import React, { useState, useRef, useCallback } from 'react';
import { PhotoFile } from '../../shared/types';
import { Theme, SPACING, RADIUS, TYPO, DURATION, EASING, SHADOW, TRANSITION } from '../styles/theme';
import { useI18n } from '../i18n';
import { AppIcon } from './AppIcon';

interface CompareViewProps {
  photos: PhotoFile[];
  onBack: () => void;
  theme: Theme;
}

type CompareMode = 'sideBy-side' | 'overlay' | 'slider';

export const CompareView: React.FC<CompareViewProps> = ({ photos, onBack, theme: t }) => {
  const { t: tr } = useI18n();
  const [mode, setMode] = useState<CompareMode>('sideBy-side');
  const [sliderPos, setSliderPos] = useState(50);
  const [overlayOpacity, setOverlayOpacity] = useState(50);
  const isDragging = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  if (photos.length < 2) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: t.bgPhotoStage }}>
        <div style={{ marginBottom: SPACING.lg, padding: SPACING.md, borderRadius: RADIUS.pill, background: t.bgPhotoSurface }}>
          <AppIcon name="compareSlider" size={32} color={t.accent} />
        </div>
        <div style={{ fontSize: TYPO.heading.size, color: t.textTertiary, marginBottom: SPACING.md }}>{tr('compare.selectHint')}</div>
        <button style={{
          padding: `${SPACING.sm}px ${SPACING.xl}px`, border: 'none',
          borderRadius: RADIUS.sm, background: t.bgSecondary, color: t.textPrimary,
          cursor: 'pointer', fontSize: TYPO.body.size, transition: TRANSITION.all,
        }} onClick={onBack}
          onMouseEnter={e => { e.currentTarget.style.background = t.bgHover; }}
          onMouseLeave={e => { e.currentTarget.style.background = t.bgSecondary; }}
        >{tr('compare.back')}</button>
      </div>
    );
  }

  const cols = Math.min(photos.length, 4);
  const imgA = photos[0].displayUrl || (photos[0].thumbnailPath ? `file://${photos[0].thumbnailPath}` : null) || `photoforge://raw/${encodeURIComponent(photos[0].filePath)}`;
  const imgB = photos[1].displayUrl || (photos[1].thumbnailPath ? `file://${photos[1].thumbnailPath}` : null) || `photoforge://raw/${encodeURIComponent(photos[1].filePath)}`;

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    setSliderPos(Math.max(0, Math.min(100, x)));
  }, []);

  const modes: { key: CompareMode; label: string; icon: React.ReactNode }[] = [
    { key: 'sideBy-side', label: tr('compare.sideBySide'), icon: <AppIcon name="compareSide" size={14} /> },
    { key: 'overlay', label: tr('compare.overlay'), icon: <AppIcon name="compareOverlay" size={14} /> },
    { key: 'slider', label: tr('compare.slider'), icon: <AppIcon name="compareSlider" size={14} /> },
  ];

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: t.bgPhotoStage }}>
      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: SPACING.md, padding: `${SPACING.sm}px ${SPACING.md}px`, background: `linear-gradient(180deg, ${t.bgPrimary}, ${t.bgSecondary})`, boxShadow: 'none' }}>
        <button style={{
          padding: `${SPACING.xs}px ${SPACING.lg}px`, border: 'none',
          borderRadius: RADIUS.sm, background: t.bgSecondary, color: t.textPrimary,
          cursor: 'pointer', fontSize: TYPO.body.size, transition: TRANSITION.all,
        }} onClick={onBack}
          onMouseEnter={e => { e.currentTarget.style.background = t.bgHover; }}
          onMouseLeave={e => { e.currentTarget.style.background = t.bgSecondary; }}
        >{tr('compare.back')}</button>

        <span style={{ color: t.textSecondary, fontSize: TYPO.body.size }}>{tr('compare.title')} · {photos.length} {tr('compare.photos')}</span>

        {/* Mode selector */}
        <div style={{ display: 'flex', gap: 2, background: t.bgSecondary, borderRadius: 14, padding: 2, marginLeft: 'auto' }}>
          {modes.map(m => (
            <button key={m.key} style={{
              padding: `${SPACING.xs}px ${SPACING.md}px`, border: 'none', borderRadius: RADIUS.sm,
              background: mode === m.key ? t.accentBg : 'transparent',
              color: mode === m.key ? t.accent : t.textSecondary,
              fontWeight: mode === m.key ? 600 : 500,
              cursor: 'pointer', fontSize: TYPO.small.size, transition: TRANSITION.all,
              boxShadow: mode === m.key ? `inset 0 1px 0 rgba(0,0,0,0.22), 0 0 0 1px ${t.accent}22` : 'none',
            }}
              onClick={() => setMode(m.key)}
            ><span style={{ display: 'inline-flex', alignItems: 'center', gap: SPACING.xs }}>{m.icon}{m.label}</span></button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div ref={containerRef} style={{ flex: 1, position: 'relative', overflow: 'hidden' }}
        onMouseMove={handleMouseMove}
        onMouseUp={() => { isDragging.current = false; }}
        onMouseLeave={() => { isDragging.current = false; }}
      >
        {/* Side by side */}
        {mode === 'sideBy-side' && (
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 2, height: '100%', padding: SPACING.sm }}>
            {photos.slice(0, 4).map(photo => (
              <div key={photo.id} style={{ display: 'flex', flexDirection: 'column', background: t.bgPhotoSurface, borderRadius: 14, overflow: 'hidden', boxShadow: SHADOW.sm }}>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', background: t.bgPhotoStage }}>
                  <img src={photo.displayUrl || (photo.thumbnailPath ? `file://${photo.thumbnailPath}` : null) || `photoforge://raw/${encodeURIComponent(photo.filePath)}`} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} alt={photo.fileName} />
                </div>
                <div style={{ padding: `${SPACING.sm}px ${SPACING.md}px`, background: t.bgCard }}>
                  <div style={{ fontSize: TYPO.small.size, color: t.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{photo.fileName}</div>
                  <div style={{ fontSize: TYPO.caption.size, color: t.textTertiary }}>{photo.fileFormat} · {photo.cameraModel || '—'}</div>
                  {photo.presetApplied && (
                    <div style={{ fontSize: TYPO.tiny.size, color: t.accent, display: 'inline-flex', alignItems: 'center', gap: SPACING.xs }}>
                      <AppIcon name="sparkles" size={10} color={t.accent} />
                      {tr('presets.hasPreset')}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Overlay */}
        {mode === 'overlay' && (
          <div style={{ position: 'relative', width: '100%', height: '100%' }}>
            <img src={imgA} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain' }} alt="" />
            <img src={imgB} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', opacity: overlayOpacity / 100 }} alt="" />
            <div style={{ position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)', background: t.bgOverlay, borderRadius: 14, padding: `${SPACING.sm}px ${SPACING.lg}px`, display: 'flex', alignItems: 'center', gap: SPACING.md, boxShadow: SHADOW.md }}>
              <span style={{ color: t.textInverse, fontSize: TYPO.small.size, minWidth: 50 }}>{photos[0].fileName}</span>
              <input type="range" min={0} max={100} value={overlayOpacity} onChange={e => setOverlayOpacity(Number(e.target.value))} style={{ width: 200 }} />
              <span style={{ color: t.textInverse, fontSize: TYPO.small.size, minWidth: 50 }}>{photos[1].fileName}</span>
            </div>
          </div>
        )}

        {/* Slider */}
        {mode === 'slider' && (
          <div style={{ position: 'relative', width: '100%', height: '100%', cursor: 'ew-resize' }}
            onMouseDown={() => { isDragging.current = true; }}
          >
            <img src={imgA} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain' }} alt="" />
            <div style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'hidden', clipPath: `inset(0 0 0 ${sliderPos}%)` }}>
              <img src={imgB} style={{ width: '100%', height: '100%', objectFit: 'contain' }} alt="" />
            </div>
            {/* Slider line */}
            <div style={{ position: 'absolute', top: 0, bottom: 0, left: `${sliderPos}%`, width: 2, background: t.textInverse, boxShadow: `0 0 8px ${t.bgOverlay}`, zIndex: 10 }}>
              <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 32, height: 32, borderRadius: '50%', background: t.bgPhotoSurface, boxShadow: SHADOW.md, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <AppIcon name="compareSlider" size={16} color={t.textPrimary} />
              </div>
            </div>
            {/* Labels */}
            <div style={{ position: 'absolute', top: 12, left: 12, background: t.bgOverlay, borderRadius: RADIUS.sm, padding: `${SPACING.xs}px ${SPACING.sm}px`, color: t.textInverse, fontSize: TYPO.caption.size }}>{photos[0].fileName}</div>
            <div style={{ position: 'absolute', top: 12, right: 12, background: t.bgOverlay, borderRadius: RADIUS.sm, padding: `${SPACING.xs}px ${SPACING.sm}px`, color: t.textInverse, fontSize: TYPO.caption.size }}>{photos[1].fileName}</div>
          </div>
        )}
      </div>
    </div>
  );
};
