import React from 'react';
import { ImportProgress } from '../../shared/types';
import { Theme } from '../styles/theme';
import { useI18n } from '../i18n';
import { AppIcon } from './AppIcon';

interface StatusBarProps { totalPhotos: number; displayedPhotos: number; selectedCount: number; importProgress: ImportProgress | null; theme: Theme; }

export const StatusBar: React.FC<StatusBarProps> = ({ totalPhotos, displayedPhotos, selectedCount, importProgress, theme: t }) => {
  const { t: tr } = useI18n();
  return (
    <div style={s(t).bar}>
      <div style={s(t).left}>
        <span style={s(t).metric}><AppIcon name="stats" size={12} color={t.textTertiary} style={{ marginRight: 4 }} />{totalPhotos} {tr('status.photos')}</span>
        {displayedPhotos !== totalPhotos && <span>· {tr('status.displayed')} {displayedPhotos} {tr('status.photos')}</span>}
        {selectedCount > 0 && <span style={{ color: t.accent, fontWeight: 500 }}>· {tr('status.selected')} {selectedCount} {tr('status.photos')}</span>}
      </div>
      <div style={s(t).right}>
        {importProgress && importProgress.stage !== 'complete' && <span style={{ ...s(t).metric, color: t.accent }}><AppIcon name="loader" size={12} color={t.accent} style={{ marginRight: 4 }} />{importProgress.current}/{importProgress.total}</span>}
      </div>
    </div>
  );
};

const s = (t: Theme): Record<string, React.CSSProperties> => ({
  bar: { display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px ${SPACING.md}px',background:t.panelBg,fontSize:11,color:t.textTertiary,flexShrink:0,borderTop:`1px solid ${t.border}`,boxShadow:'none' },
  left: { display:'flex',gap:4 }, right: {},
  metric: { display: 'inline-flex', alignItems: 'center' },
});
