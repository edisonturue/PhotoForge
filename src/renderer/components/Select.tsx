import React, { useState, useRef, useEffect } from 'react';
import { Theme, SPACING, RADIUS, TYPO, DURATION, EASING, SHADOW, TRANSITION } from '../styles/theme';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  theme: Theme;
  style?: React.CSSProperties;
}

export const Select: React.FC<SelectProps> = ({ value, onChange, options, theme: t, style }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = options.find(o => o.value === value);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div ref={ref} style={{ position: 'relative', ...style }}>
      <button
        type="button"
        style={{
          width: '100%',
          minHeight: 40,
          padding: '10px 14px',
          border: `1px solid ${t.border}`,
          borderRadius: 12,
          background: t.bgInput,
          color: t.textPrimary,
          fontSize: TYPO.body.size,
          outline: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: SPACING.sm,
          transition: TRANSITION.all,
          textAlign: 'left',
        }}
        onClick={() => setOpen(!open)}
        onMouseEnter={e => { if (!open) e.currentTarget.style.borderColor = t.borderFocus; }}
        onMouseLeave={e => { if (!open) e.currentTarget.style.borderColor = t.border; }}
      >
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {selected?.label || value}
        </span>
        <svg width="10" height="6" viewBox="0 0 10 6" fill="none" style={{
          flexShrink: 0,
          transition: `transform ${DURATION.fast}ms ${EASING.out}`,
          transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
        }}>
          <path d="M1 1L5 5L9 1" stroke={t.textSecondary} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 4px)',
          left: 0,
          right: 0,
          zIndex: 100,
          background: t.dropdownBg,
          border: `1px solid ${t.borderLight}`,
          borderRadius: RADIUS.md,
          padding: SPACING.xs,
          boxShadow: SHADOW.md,
          animation: `fadeInUp ${DURATION.fast}ms ${EASING.out}`,
          maxHeight: 240,
          overflowY: 'auto',
        }}>
          {options.map(option => {
            const isSelected = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                style={{
                  display: 'block',
                  width: '100%',
                  padding: `${SPACING.sm}px ${SPACING.lg}px`,
                  border: 'none',
                  borderRadius: RADIUS.sm,
                  background: isSelected ? t.accentLight : 'transparent',
                  color: isSelected ? t.accent : t.textPrimary,
                  cursor: 'pointer',
                  fontSize: TYPO.body.size,
                  textAlign: 'left',
                  transition: TRANSITION.all,
                }}
                onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = t.bgHover; }}
                onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
                onClick={() => { onChange(option.value); setOpen(false); }}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
