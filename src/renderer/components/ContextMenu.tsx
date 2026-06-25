import React, { useEffect, useRef } from 'react';
import { Theme, SPACING, RADIUS, TYPO, DURATION, EASING, SHADOW, TRANSITION, Z_INDEX } from '../styles/theme';
import { AppIcon } from './AppIcon';

export interface ContextMenuItem {
  label: string;
  icon?: string;
  action: () => void;
  danger?: boolean;
  disabled?: boolean;
  separator?: boolean;
}

interface ContextMenuProps {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
  theme: Theme;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, items, onClose, theme: t }) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => { document.removeEventListener('mousedown', handleClick); document.removeEventListener('keydown', handleKey); };
  }, [onClose]);

  // Adjust position to stay within viewport
  useEffect(() => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      if (rect.right > window.innerWidth) ref.current.style.left = `${window.innerWidth - rect.width - 8}px`;
      if (rect.bottom > window.innerHeight) ref.current.style.top = `${window.innerHeight - rect.height - 8}px`;
    }
  }, [x, y]);

  return (
    <div ref={ref} style={{
      position: 'fixed', left: x, top: y, zIndex: Z_INDEX.tooltip,
      background: t.dropdownBg,
      borderRadius: RADIUS.md, padding: SPACING.xs, minWidth: 180,
      boxShadow: SHADOW.lg,
      animation: `fadeInUp ${DURATION.fast}ms ${EASING.out}`,
    }}>
      {items.map((item, idx) => {
        if (item.separator) {
          return <div key={idx} style={{ height: SPACING.xs }} />;
        }
        return (
          <button key={idx} style={{
            display: 'flex', alignItems: 'center', gap: SPACING.sm,
            width: '100%', padding: `${SPACING.sm}px ${SPACING.md}px`,
            border: 'none', borderRadius: RADIUS.sm,
            background: 'transparent',
            color: item.danger ? t.danger : item.disabled ? t.textTertiary : t.textPrimary,
            cursor: item.disabled ? 'not-allowed' : 'pointer',
            fontSize: TYPO.small.size, textAlign: 'left',
            transition: TRANSITION.all, opacity: item.disabled ? 0.5 : 1,
          }}
            onClick={() => { if (!item.disabled) { item.action(); onClose(); } }}
            onMouseEnter={e => { if (!item.disabled) e.currentTarget.style.background = t.bgHover; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
          >
            {item.icon && (
              <span style={{ width: 20, textAlign: 'center', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                <AppIcon
                  name={item.icon as any}
                  size={13}
                  color={item.danger ? t.danger : item.disabled ? t.textTertiary : t.textPrimary}
                  filled={item.icon === 'star'}
                />
              </span>
            )}
            <span>{item.label}</span>
          </button>
        );
      })}
    </div>
  );
};
