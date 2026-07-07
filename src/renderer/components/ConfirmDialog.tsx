import React, { useEffect, useRef } from 'react';
import { Theme, SPACING, RADIUS, TYPO, DURATION, EASING, SHADOW, TRANSITION } from '../styles/theme';

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  theme: Theme;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({ title, message, confirmLabel, cancelLabel, danger, onConfirm, onCancel, theme: t }) => {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    cancelRef.current?.focus();
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
      if (e.key === 'Enter') onConfirm();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onCancel, onConfirm]);

  return (
    <div style={{
      position: 'fixed', inset: 0, background: t.bgOverlay, display: 'flex',
      alignItems: 'center', justifyContent: 'center', zIndex: 500,
      animation: `fadeInUp ${DURATION.fast}ms ${EASING.out}`,
    }} onClick={onCancel}>
      <div style={{
        background: `linear-gradient(180deg, ${t.modalBg}, ${t.bgSecondary})`, borderRadius: 18, padding: SPACING.xl,
        maxWidth: 400, width: '90%', boxShadow: '0 24px 72px rgba(0,0,0,0.34)',
        animation: `fadeInUp ${DURATION.normal}ms ${EASING.out}`,
      }} onClick={e => e.stopPropagation()}>
        <h3 style={{ margin: `0 0 ${SPACING.md}px`, fontSize: TYPO.subheading.size, fontWeight: 600, color: t.textPrimary }}>{title}</h3>
        <p style={{ margin: `0 0 ${SPACING.xl}px`, fontSize: TYPO.body.size, color: t.textSecondary, lineHeight: 1.5 }}>{message}</p>
        <div style={{ display: 'flex', gap: SPACING.md, justifyContent: 'flex-end' }}>
          <button ref={cancelRef} style={{
            padding: `${SPACING.sm}px ${SPACING.xl}px`, border: 'none',
            borderRadius: 12, background: t.bgSecondary, color: t.textPrimary,
            cursor: 'pointer', fontSize: TYPO.body.size, transition: TRANSITION.all,
          }}
            onClick={onCancel}
            onMouseEnter={e => { e.currentTarget.style.background = t.bgHover; }}
            onMouseLeave={e => { e.currentTarget.style.background = t.bgSecondary; }}
          >{cancelLabel}</button>
          <button style={{
            padding: `${SPACING.sm}px ${SPACING.xl}px`, border: 'none',
            borderRadius: 12, background: danger ? t.danger : t.accent, color: t.textInverse,
            cursor: 'pointer', fontSize: TYPO.body.size, fontWeight: 600, transition: TRANSITION.all,
          }}
            onClick={onConfirm}
            onMouseEnter={e => { e.currentTarget.style.background = danger ? (t.dangerHover || t.danger) : t.accentHover; }}
            onMouseLeave={e => { e.currentTarget.style.background = danger ? t.danger : t.accent; }}
          >{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
};
