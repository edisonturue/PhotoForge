import React, { useEffect, useState, useCallback } from 'react';
import { Theme, DURATION, EASING, SPACING, TYPO } from '../styles/theme';

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

  const handleDismiss = useCallback(() => {
    setExiting(true);
    setTimeout(() => onDismiss(toast.id), DURATION.normal);
  }, [toast.id, onDismiss]);

  useEffect(() => {
    const timer = setTimeout(handleDismiss, toast.duration || 3000);
    return () => clearTimeout(timer);
  }, [toast.duration, handleDismiss]);

  return (
    <div style={{
      background: t.bgSecondary,
      color: t.textPrimary,
      padding: `${SPACING.sm}px ${SPACING.lg}px`,
      borderRadius: 10,
      fontSize: TYPO.body.size,
      boxShadow: '0 4px 16px rgba(0,0,0,0.10)',
      animation: exiting
        ? `toastOut ${DURATION.normal}ms ${EASING.out} forwards`
        : `toastIn ${DURATION.normal}ms ${EASING.out}`,
      pointerEvents: 'auto',
      cursor: 'pointer',
      minWidth: 180,
      maxWidth: 320,
      textAlign: 'center',
    }}
      onClick={handleDismiss}
    >
      {toast.message}
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
