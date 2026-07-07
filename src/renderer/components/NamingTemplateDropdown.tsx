import React, { useState, useEffect, useRef } from 'react';
import { Theme, SPACING, RADIUS, TYPO, TRANSITION } from '../styles/theme';

interface Props {
  theme: Theme;
  value: string;
  onChange: (v: string) => void;
  tr: (key: string) => string;
}

export const NamingTemplateDropdown: React.FC<Props> = ({ theme: t, value, onChange, tr }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const [menuPos, setMenuPos] = useState<React.CSSProperties>({});

  const templates = [
    { value: '{filename}', labelKey: 'export.namingPresetFilename' },
    { value: '{date}_{filename}', labelKey: 'export.namingPresetDateFilename' },
    { value: '{camera}_{filename}', labelKey: 'export.namingPresetCameraFilename' },
    { value: '{filename}_{preset}', labelKey: 'export.namingPresetFilenamePreset' },
    { value: '{year}-{month}-{day}_{filename}', labelKey: 'export.namingPresetFullDateFilename' },
  ];

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const toggle = () => {
    if (!open && ref.current) {
      const rect = ref.current.getBoundingClientRect();
      setMenuPos({
        position: 'fixed',
        top: rect.bottom + 4,
        left: rect.left,
        right: 'auto',
        width: Math.max(rect.width, 300),
        zIndex: 9999,
      });
    }
    setOpen(prev => !prev);
  };

  const selected = templates.find(o => o.value === value);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button type="button"
        style={{
          width: '100%', minHeight: 44, padding: '10px 14px',
          border: `1.5px solid ${t.border}`, borderRadius: 12,
          background: t.bgInput, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: SPACING.sm, transition: TRANSITION.all, textAlign: 'left',
        }}
        onClick={toggle}
        onMouseEnter={e => { e.currentTarget.style.borderColor = t.borderFocus; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = t.border; }}
      >
        <div style={{ fontSize: TYPO.body.size, color: t.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {selected ? tr(selected.labelKey) : value}
        </div>
        <svg width="10" height="6" viewBox="0 0 10 6" fill="none" style={{ flexShrink: 0, transition: 'transform 150ms ease-out', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}>
          <path d="M1 1L5 5L9 1" stroke={t.textSecondary} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div style={{
          ...menuPos,
          background: t.dropdownBg,
          border: `1px solid ${t.borderLight}`,
          borderRadius: RADIUS.md,
          padding: SPACING.xs,
          boxShadow: '0 8px 28px rgba(0,0,0,0.28)',
          animation: 'fadeInUp 150ms ease-out',
          maxHeight: 320,
          overflowY: 'auto',
        }}>
          {templates.map(opt => {
            const isActive = value === opt.value;
            return (
              <button key={opt.value} type="button"
                style={{
                  display: 'block', width: '100%',
                  padding: `${SPACING.sm}px ${SPACING.lg}px`,
                  border: 'none', borderRadius: RADIUS.sm,
                  background: isActive ? t.accentLight : 'transparent',
                  cursor: 'pointer', textAlign: 'left',
                  transition: TRANSITION.all,
                }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = t.bgHover; }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                onClick={() => { onChange(opt.value); setOpen(false); }}
              >
                <div style={{ fontSize: TYPO.body.size, color: isActive ? t.accent : t.textPrimary }}>
                  {tr(opt.labelKey)}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
