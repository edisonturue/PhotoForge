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
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});
  const btnRef = useRef<HTMLButtonElement>(null);
  const selected = options.find(o => o.value === value);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (btnRef.current && !btnRef.current.contains(e.target as Node)) {
        const menu = document.getElementById('select-menu-' + value.replace(/[^a-z0-9]/g, ''));
        if (menu && !menu.contains(e.target as Node)) {
          setOpen(false);
        }
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [value]);

  const updateMenuPosition = () => {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setMenuStyle(prev => ({
        ...prev,
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
      }));
    }
  };

  const toggleOpen = () => {
    if (open) {
      setOpen(false);
    } else {
      if (btnRef.current) {
        const rect = btnRef.current.getBoundingClientRect();
        setMenuStyle({
          position: 'fixed',
          top: rect.bottom + 4,
          left: rect.left,
          right: 'auto',
          width: rect.width,
          zIndex: 9999,
        });
      }
      setOpen(true);
    }
  };

  useEffect(() => {
    if (open) {
      updateMenuPosition();
      window.addEventListener('scroll', updateMenuPosition, true);
      window.addEventListener('resize', updateMenuPosition);
    }
    return () => {
      window.removeEventListener('scroll', updateMenuPosition, true);
      window.removeEventListener('resize', updateMenuPosition);
    };
  }, [open]);

  return (
    <div style={{ position: 'relative', ...style }}>
      <button
        ref={btnRef}
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
        onClick={toggleOpen}
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
        <div
          id={'select-menu-' + value.replace(/[^a-z0-9]/g, '')}
          style={{
            ...menuStyle,
            background: t.dropdownBg,
            border: `1px solid ${t.borderLight}`,
            borderRadius: RADIUS.md,
            padding: SPACING.xs,
            boxShadow: SHADOW.lg,
            animation: `fadeInUp ${DURATION.fast}ms ${EASING.out}`,
            maxHeight: 240,
            overflowY: 'auto',
          }}
        >
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
