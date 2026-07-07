import React from 'react';
import { Theme, SPACING, RADIUS, TYPO, TRANSITION } from '../styles/theme';
import { useI18n } from '../i18n';
import { AppIcon } from './AppIcon';

export interface HistoryDisplayEntry {
  id: string;
  description: string;
  timestamp: number;
  isCurrent: boolean;
  isPast: boolean;
}

interface HistoryPanelProps {
  entries: HistoryDisplayEntry[];
  onJumpTo: (index: number) => void;
  onClear: () => void;
  theme: Theme;
}

export const HistoryPanel: React.FC<HistoryPanelProps> = ({ entries, onJumpTo, onClear, theme: t }) => {
  const { t: tr } = useI18n();

  if (entries.length === 0) {
    return (
      <div style={{ padding: SPACING.lg, textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 42, height: 42, marginBottom: SPACING.sm, borderRadius: RADIUS.pill, background: t.bgSecondary, opacity: 0.75 }}><AppIcon name="logs" size={18} color={t.textTertiary} /></div>
        <div style={{ fontSize: TYPO.small.size, color: t.textTertiary }}>{tr('history.empty')}</div>
      </div>
    );
  }

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: `${SPACING.sm}px 0`, marginBottom: SPACING.sm }}>
        <span style={{ fontSize: TYPO.small.size, fontWeight: 600, color: t.textPrimary }}>{tr('history.title')}</span>
        <button style={{
          fontSize: TYPO.tiny.size, color: t.textTertiary, background: 'none', border: 'none',
          cursor: 'pointer', padding: `2px ${SPACING.sm}px`, borderRadius: RADIUS.sm, transition: TRANSITION.all,
        }}
          onClick={onClear}
          onMouseEnter={e => { e.currentTarget.style.background = t.bgHover; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
        >{tr('history.clear')}</button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {entries.map((entry, idx) => (
          <button key={entry.id} style={{
            display: 'flex', alignItems: 'center', gap: SPACING.sm,
            padding: `${SPACING.sm}px ${SPACING.md}px`,
            border: 'none', borderRadius: 0,
            background: entry.isCurrent ? t.accentLight : 'transparent',
            color: entry.isPast ? t.textPrimary : t.textTertiary,
            cursor: 'pointer', textAlign: 'left',
            fontSize: TYPO.small.size,
            opacity: entry.isPast ? 1 : 0.5,
            transition: TRANSITION.all,
            borderLeft: entry.isCurrent ? `3px solid ${t.accent}` : '3px solid transparent',
          }}
            onClick={() => onJumpTo(idx - 1)}
            onMouseEnter={e => { if (!entry.isCurrent) e.currentTarget.style.background = t.bgHover; }}
            onMouseLeave={e => { e.currentTarget.style.background = entry.isCurrent ? t.accentLight : 'transparent'; }}
          >
            <span style={{ fontSize: 14, flexShrink: 0, width: 20, textAlign: 'center' }}>
              {entry.isCurrent ? <AppIcon name="back" size={12} color={t.accent} style={{ transform: 'rotate(180deg)' }} /> : entry.isPast ? <AppIcon name="check" size={12} color={t.success} /> : <AppIcon name="clock" size={12} color={t.textTertiary} />}
            </span>
            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {entry.description}
            </span>
            <span style={{ fontSize: TYPO.tiny.size, color: t.textTertiary, flexShrink: 0 }}>
              {formatTime(entry.timestamp)}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};
