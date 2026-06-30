import React, { useEffect, useState, useCallback } from 'react';
import { Theme, DURATION, EASING, RADIUS, SPACING, TYPO } from '../styles/theme';
import { useI18n } from '../i18n';
import { AppIcon } from './AppIcon';

export interface ToastMessage {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
  duration?: number;
}

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
  theme: Theme;
}

const accentColors = {
  info: { bg: '#6f6f88', light: '#ececf2', icon: '#6f6f88' },
  success: { bg: '#4a9b6e', light: '#eff7f2', icon: '#4a9b6e' },
  warning: { bg: '#d49b1f', light: '#faf6ed', icon: '#d49b1f' },
  error: { bg: '#d15555', light: '#faf3f3', icon: '#d15555' },
};

const accentColorsDark = {
  info: { bg: '#6f6f88', light: '#32312b', icon: '#938a78' },
  success: { bg: '#5b9977', light: '#18241e', icon: '#5b9977' },
  warning: { bg: '#b5974c', light: '#27241c', icon: '#b5974c' },
  error: { bg: '#bd6e68', light: '#27201f', icon: '#bd6e68' },
};

export const Toast: React.FC<ToastProps> = ({ toasts, onDismiss, theme: t }) => {
  if (toasts.length === 0) return null;

  return (
    <div style={{
      position: 'fixed',
      top: SPACING.xl,
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 600,
      display: 'flex',
      flexDirection: 'column',
      gap: SPACING.sm,
      pointerEvents: 'none',
    }}>
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} theme={t} />
      ))}
    </div>
  );
};

const ToastItem: React.FC<{ toast: ToastMessage; onDismiss: (id: string) => void; theme: Theme }> = ({ toast, onDismiss, theme: t }) => {
  const [exiting, setExiting] = useState(false);
  const isDark = t.isDark;
  const colors = isDark ? accentColorsDark : accentColors;

  const handleDismiss = useCallback(() => {
    setExiting(true);
    setTimeout(() => onDismiss(toast.id), DURATION.normal);
  }, [toast.id, onDismiss]);

  useEffect(() => {
    const timer = setTimeout(handleDismiss, toast.duration || 3000);
    return () => clearTimeout(timer);
  }, [toast.duration, handleDismiss]);

  const iconEl = (() => {
    switch (toast.type) {
      case 'success': return <AppIcon name="check" size={16} color={colors.success.icon} />;
      case 'warning': return <AppIcon name="info" size={16} color={colors.warning.icon} />;
      case 'error': return <AppIcon name="x" size={16} color={colors.error.icon} />;
      default: return <AppIcon name="info" size={16} color={colors.info.icon} />;
    }
  })();

  return (
    <div style={{
      background: isDark ? t.bgCard : '#ffffff',
      color: t.textPrimary,
      padding: 0,
      borderRadius: 12,
      fontSize: TYPO.body.size,
      boxShadow: isDark
        ? '0 12px 40px rgba(0,0,0,0.5), 0 1px 2px rgba(0,0,0,0.3)'
        : '0 8px 32px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.04)',
      border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.06)',
      animation: exiting
        ? `toastOut ${DURATION.normal}ms ${EASING.out} forwards`
        : `toastIn ${DURATION.normal}ms ${EASING.out}`,
      display: 'flex',
      alignItems: 'stretch',
      pointerEvents: 'auto',
      cursor: 'pointer',
      minWidth: 240,
      maxWidth: 380,
      overflow: 'hidden',
    }}
      onClick={handleDismiss}
    >
      {/* Left accent bar */}
      <div style={{
        width: 4,
        background: colors[toast.type].bg,
        flexShrink: 0,
      }} />

      {/* Icon area */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: `${SPACING.md}px 0 ${SPACING.md}px ${SPACING.lg}px`,
        flexShrink: 0,
      }}>
        <div style={{
          width: 32,
          height: 32,
          borderRadius: 10,
          background: colors[toast.type].light,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          {iconEl}
        </div>
      </div>

      {/* Message */}
      <div style={{
        flex: 1,
        padding: `${SPACING.md}px ${SPACING.lg}px`,
        display: 'flex',
        alignItems: 'center',
        fontSize: TYPO.small.size,
        color: t.textPrimary,
        lineHeight: 1.4,
      }}>
        {toast.message}
      </div>

      {/* Close button */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        padding: `${SPACING.sm}px ${SPACING.sm}px 0 0`,
        flexShrink: 0,
      }}>
        <button style={{
          background: 'transparent',
          border: 'none',
          borderRadius: 8,
          color: t.textTertiary,
          cursor: 'pointer',
          padding: 4,
          fontSize: TYPO.small.size,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: `background ${DURATION.fast}ms ${EASING.out}`,
        }}
          onMouseEnter={e => { e.currentTarget.style.background = t.bgHover; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
          onClick={e => { e.stopPropagation(); handleDismiss(); }}>
          <AppIcon name="close" size={12} color={t.textTertiary} />
        </button>
      </div>
    </div>
  );
};

/** Hook to manage toast state */
export function useToast() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((type: ToastMessage['type'], message: string, duration?: number) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setToasts(prev => [...prev, { id, type, message, duration }]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return { toasts, addToast, dismissToast };
}
