import React, { useEffect, useState, useCallback } from 'react';
import { Theme, DURATION, EASING, RADIUS, SHADOW, SPACING, TYPO } from '../styles/theme';
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

export const Toast: React.FC<ToastProps> = ({ toasts, onDismiss, theme: t }) => {
  if (toasts.length === 0) return null;

  const bgMap = {
    info: t.accent,
    success: t.success,
    warning: t.warning,
    error: t.danger,
  };

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
      {toasts.map((toast, idx) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} bg={bgMap[toast.type]} theme={t} index={idx} />
      ))}
    </div>
  );
};

const ToastItem: React.FC<{ toast: ToastMessage; onDismiss: (id: string) => void; bg: string; theme: Theme; index: number }> = ({ toast, onDismiss, bg, theme: t, index }) => {
  const [exiting, setExiting] = useState(false);

  const handleDismiss = useCallback(() => {
    setExiting(true);
    setTimeout(() => onDismiss(toast.id), DURATION.normal);
  }, [toast.id, onDismiss]);

  useEffect(() => {
    const timer = setTimeout(handleDismiss, toast.duration || 3000);
    return () => clearTimeout(timer);
  }, [toast.duration, handleDismiss]);

  const iconMap = {
    info: <AppIcon name="info" size={16} color={t.textInverse} />,
    success: <AppIcon name="check" size={16} color={t.textInverse} />,
    warning: <AppIcon name="info" size={16} color={t.textInverse} />,
    error: <AppIcon name="x" size={16} color={t.textInverse} />,
  };

  return (
    <div style={{
      background: `linear-gradient(180deg, ${bg}, ${bg})`,
      color: t.textInverse,
      padding: `${SPACING.md}px ${SPACING.xl}px`,
      borderRadius: 14,
      fontSize: TYPO.body.size,
      boxShadow: '0 18px 44px rgba(0,0,0,0.34), inset 0 1px 0 rgba(0,0,0,0.2)',
      border: '1px solid rgba(0,0,0,0.22)',
      animation: exiting
        ? `toastOut ${DURATION.normal}ms ${EASING.out} forwards`
        : `toastIn ${DURATION.normal}ms ${EASING.out}`,
      display: 'flex',
      alignItems: 'center',
      gap: SPACING.sm,
      pointerEvents: 'auto',
      cursor: 'pointer',
      minWidth: 200,
      maxWidth: 400,
    }}
      onClick={handleDismiss}
    >
      <span style={{ display: 'inline-flex' }}>{iconMap[toast.type]}</span>
      <span style={{ flex: 1 }}>{toast.message}</span>
      <button style={{
        background: 'rgba(0,0,0,0.18)',
        border: 'none',
        borderRadius: 10,
        color: t.textInverse,
        cursor: 'pointer',
        padding: `2px ${SPACING.sm}px`,
        fontSize: TYPO.small.size,
      }} onClick={e => { e.stopPropagation(); handleDismiss(); }}><AppIcon name="close" size={12} color={t.textInverse} /></button>
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
