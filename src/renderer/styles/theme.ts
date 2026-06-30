// PhotoForge Theme System — supports light, dark, and system preference
// Refined palette v2 (2026-06-20): achromatic neutral grays, ultra-muted
// accents. The UI exists to frame photos, not compete with them.
// Principle: every color token that isn't a photo is a shade of gray.

import { SPACING, RADIUS, SHADOW, TYPO, DURATION, EASING, TRANSITION, Z_INDEX, COMPONENT_HEIGHT } from './design-tokens';

// ============================================================
//  Light Theme — "Museum White"
//  Pure neutral grays with a barely-there cool undertone.
//  Like a gallery wall: nothing distracts from the artwork.
//  Accent: HSL 235 10% 48% — a gray that whispers blue.
// ============================================================
const lightTheme = {
  // Backgrounds — layered for depth
  bgPrimary: '#ffffff',
  bgSecondary: '#f0f0f0',
  bgTertiary: '#e8e8e8',
  bgCard: '#ffffff',
  bgHover: '#eaeaea',
  bgOverlay: 'rgba(0,0,0,0.30)',
  bgInput: '#ffffff',
  bgPhotoStage: '#f5f5f5',
  bgPhotoSurface: '#ffffff',

  // Borders — visible but not dominant
  border: '#c8c8c8',
  borderLight: '#dadada',
  borderFocus: '#7c3aed',

  // Text — strong hierarchy
  textPrimary: '#1c1c1e',
  textSecondary: '#6b6b70',
  textTertiary: '#9a9a9f',
  textInverse: '#ffffff',

  // Brand / Accent — purple from project spec
  accent: '#7c3aed',
  accentHover: '#6d28d9',
  accentLight: '#f3eeff',
  accentBg: '#faf7ff',

  // Status
  danger: '#d15555',
  dangerHover: '#c54848',
  dangerLight: '#fef2f2',
  warning: '#d49b1f',
  warningLight: '#fefce8',
  success: '#3b8c62',
  successLight: '#f0fdf4',

  // Specific surfaces
  sidebarBg: '#f5f5f5',
  panelBg: '#ffffff',
  gridItemBg: '#ffffff',
  dropdownBg: '#ffffff',
  modalBg: '#ffffff',
  scrollbarTrack: '#e8e8e8',
  emptyState: '#9a9a9f',
  ratingStar: '#d49b1f',
  favStar: '#d49b1f',
  colorLabelRed: '#d15555',
  colorLabelYellow: '#d49b1f',
  colorLabelGreen: '#3b8c62',
  colorLabelBlue: '#5b8cc7',
  colorLabelPurple: '#7c3aed',

  // Interaction states
  activeBg: '#e0e0e0',
  selectedBg: '#f0eaff',
  disabledOpacity: 0.45,

  isDark: false,
};

// ============================================================
//  Dark Theme — "True Darkroom"
//  Deep, near-black backgrounds with imperceptible warmth.
//  Photos glow against the darkness.
//  Accent: HSL 37 10% 52% — warm stone, almost gray.
// ============================================================
const darkTheme = {
  // Backgrounds — "warm charcoal", not true black
  bgPrimary: '#1c1b1a',
  bgSecondary: '#282725',
  bgTertiary: '#2e2d2a',
  bgCard: '#242320',
  bgHover: '#343331',
  bgOverlay: 'rgba(0,0,0,0.60)',
  bgInput: '#2a2926',
  bgPhotoStage: '#181716',
  bgPhotoSurface: '#201f1c',

  // Borders — visible
  border: '#4a4946',
  borderLight: '#3d3c39',
  borderFocus: '#a78bfa',

  // Text — high contrast
  textPrimary: '#f0efed',
  textSecondary: '#c8c6c2',
  textTertiary: '#a3a19c',
  textInverse: '#1c1b1a',

  // Brand / Accent — lighter purple for dark bg
  accent: '#a78bfa',
  accentHover: '#b8a0fb',
  accentLight: '#362f4a',
  accentBg: '#231f30',

  // Status — brighter for dark bg
  danger: '#e06c6c',
  dangerHover: '#d98080',
  dangerLight: '#3a2020',
  warning: '#d4a847',
  warningLight: '#3a2e15',
  success: '#6abf8a',
  successLight: '#173322',

  // Specific surfaces
  sidebarBg: '#201e1d',
  panelBg: '#242320',
  gridItemBg: '#282725',
  dropdownBg: '#2a2926',
  modalBg: '#242320',
  scrollbarTrack: '#282725',
  emptyState: '#a3a19c',
  ratingStar: '#d4a847',
  favStar: '#d4a847',
  colorLabelRed: '#e06c6c',
  colorLabelYellow: '#d4a847',
  colorLabelGreen: '#6abf8a',
  colorLabelBlue: '#80b5dc',
  colorLabelPurple: '#a78bfa',

  // Interaction states
  activeBg: '#3a3936',
  selectedBg: '#2f2940',
  disabledOpacity: 0.38,

  isDark: true,
};

// ============================================================
//  Specialty Themes — proportionally muted
//  Each keeps a distinct identity but obeys the same restraint.
// ============================================================

// Vintage "Darkroom Green" — muted forest, ~18% accent saturation
const vintageTheme = {
  // Muted forest — green undertone, not overwhelming
  bgPrimary: '#242d28',
  bgSecondary: '#2c3430',
  bgTertiary: '#262d29',
  bgCard: '#222a25',
  bgHover: '#363e39',
  bgOverlay: 'rgba(8,12,10,0.76)',
  bgInput: '#232b26',
  bgPhotoStage: '#1c2620',
  bgPhotoSurface: '#1e2622',

  // Subtle borders
  border: '#3d4c42',
  borderLight: '#354639',
  borderFocus: '#5a9a6a',

  // High-contrast text
  textPrimary: '#f5f5f0',
  textSecondary: '#c9cfca',
  textTertiary: '#b8c0b6',
  textInverse: '#171d1a',

  // Muted sage accent — visible but not glaring
  accent: '#5a9a6a',
  accentHover: '#6aaa7a',
  accentLight: '#25382b',
  accentBg: '#1d2e22',

  // Status colors
  danger: '#bc7a70',
  dangerHover: '#c88c82',
  dangerLight: '#2e2321',
  warning: '#b99c5a',
  warningLight: '#2d2a1e',
  success: '#65a277',
  successLight: '#1c2e22',

  // Specific surfaces
  sidebarBg: '#1f2824',
  panelBg: '#222a25',
  gridItemBg: '#252d28',
  dropdownBg: '#242c27',
  modalBg: '#222a25',
  scrollbarTrack: '#252d28',
  emptyState: '#b0baaf',
  ratingStar: '#cfb262',
  favStar: '#cfb262',
  colorLabelRed: '#bc7a70',
  colorLabelYellow: '#b99c5a',
  colorLabelGreen: '#65a277',
  colorLabelBlue: '#7c9fb3',
  colorLabelPurple: '#9990b3',

  // Interaction states
  activeBg: '#333b36',
  selectedBg: '#25382b',
  disabledOpacity: 0.38,
  isDark: true,
}
// "Graphite Gold" — deep graphite with barely-gold accent (15%)
const graphiteGoldTheme = {
  bgPrimary: '#1b1c1e',
  bgSecondary: '#232528',
  bgTertiary: '#16181a',
  bgCard: '#181b1e',
  bgHover: '#262a2f',
  bgOverlay: 'rgba(6,7,8,0.76)',
  bgInput: '#15171a',
  bgPhotoStage: '#141517',
  bgPhotoSurface: '#121417',

  border: '#4a4e54',
  borderLight: '#353a40',
  borderFocus: '#9a8c64',

  textPrimary: '#edf0f2',
  textSecondary: '#cdd2d7',
  textTertiary: '#a0a9b2',
  textInverse: '#0c0e10',

  accent: '#9a8c64',
  accentHover: '#ad9e78',
  accentLight: '#302d25',
  accentBg: '#191710',

  danger: '#c8746c',
  dangerHover: '#d48780',
  dangerLight: '#2a1c1c',
  warning: '#b8995a',
  warningLight: '#2b2418',
  success: '#6fa87c',
  successLight: '#17241c',

  sidebarBg: '#18191b',
  panelBg: '#16191c',
  gridItemBg: '#171b1f',
  dropdownBg: '#181b1f',
  modalBg: '#16191c',
  scrollbarTrack: '#181b1f',
  emptyState: '#a0a9b2',
  ratingStar: '#b8995a',
  favStar: '#b8995a',
  colorLabelRed: '#c8746c',
  colorLabelYellow: '#b8995a',
  colorLabelGreen: '#6fa87c',
  colorLabelBlue: '#7b9dbd',
  colorLabelPurple: '#9a88b5',

  activeBg: '#282d33',
  selectedBg: '#1f1c14',
  disabledOpacity: 0.42,
  isDark: true,
};

// "Slate Blue" — deep slate with muted steel accent (15%)
const slateBlueTheme = {
  bgPrimary: '#1a1e24',
  bgSecondary: '#232830',
  bgTertiary: '#151921',
  bgCard: '#171c25',
  bgHover: '#242c39',
  bgOverlay: 'rgba(5,7,10,0.76)',
  bgInput: '#141820',
  bgPhotoStage: '#14171e',
  bgPhotoSurface: '#11151d',

  border: '#48505e',
  borderLight: '#353d4b',
  borderFocus: '#6b95b8',

  textPrimary: '#ecf0f5',
  textSecondary: '#cdd4dc',
  textTertiary: '#a0acba',
  textInverse: '#0d1116',

  accent: '#6b95b8',
  accentHover: '#80a6c4',
  accentLight: '#26303d',
  accentBg: '#121a24',

  danger: '#c07074',
  dangerHover: '#d08488',
  dangerLight: '#2a1c1e',
  warning: '#b8935a',
  warningLight: '#2b2418',
  success: '#6d9e8c',
  successLight: '#16241f',

  sidebarBg: '#171b22',
  panelBg: '#151a22',
  gridItemBg: '#161c25',
  dropdownBg: '#161b24',
  modalBg: '#151a22',
  scrollbarTrack: '#161c25',
  emptyState: '#a0acba',
  ratingStar: '#b8935a',
  favStar: '#b8935a',
  colorLabelRed: '#c07074',
  colorLabelYellow: '#b8935a',
  colorLabelGreen: '#6d9e8c',
  colorLabelBlue: '#6b95b8',
  colorLabelPurple: '#8b83b2',

  activeBg: '#232b36',
  selectedBg: '#16212e',
  disabledOpacity: 0.42,
  isDark: true,
};

// "Merlot" — deep wine with muted burgundy accent (18%)
const merlotTheme = {
  bgPrimary: '#1e1b1c',
  bgSecondary: '#262224',
  bgTertiary: '#181517',
  bgCard: '#1c181a',
  bgHover: '#292326',
  bgOverlay: 'rgba(7,6,6,0.76)',
  bgInput: '#171415',
  bgPhotoStage: '#171314',
  bgPhotoSurface: '#131112',

  border: '#51494c',
  borderLight: '#3d3437',
  borderFocus: '#9a606a',

  textPrimary: '#f1ebed',
  textSecondary: '#daced0',
  textTertiary: '#b3a3a7',
  textInverse: '#0e0c0d',

  accent: '#9a606a',
  accentHover: '#ad737d',
  accentLight: '#31282b',
  accentBg: '#1a1215',

  danger: '#c46e6c',
  dangerHover: '#d18280',
  dangerLight: '#2b1a1a',
  warning: '#b8925a',
  warningLight: '#2b2418',
  success: '#7e9d80',
  successLight: '#18241b',

  sidebarBg: '#1a1718',
  panelBg: '#181416',
  gridItemBg: '#1b1619',
  dropdownBg: '#1a1517',
  modalBg: '#181416',
  scrollbarTrack: '#1a1517',
  emptyState: '#b3a3a7',
  ratingStar: '#b8925a',
  favStar: '#b8925a',
  colorLabelRed: '#c46e6c',
  colorLabelYellow: '#b8925a',
  colorLabelGreen: '#7e9d80',
  colorLabelBlue: '#7f9ab3',
  colorLabelPurple: '#9e85b0',

  activeBg: '#2b2326',
  selectedBg: '#20161a',
  disabledOpacity: 0.42,
  isDark: true,
};

export type Theme = typeof lightTheme;

/** Get the active theme object based on the user's preference */
export function getTheme(preference: 'light' | 'dark' | 'system' | 'vintage' | 'graphite-gold' | 'slate-blue' | 'merlot'): Theme {
  if (preference === 'vintage') return vintageTheme;
  if (preference === 'graphite-gold') return graphiteGoldTheme;
  if (preference === 'slate-blue') return slateBlueTheme;
  if (preference === 'merlot') return merlotTheme;
  if (preference === 'system') {
    const isDark = typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
    return isDark ? darkTheme : lightTheme;
  }
  return preference === 'dark' ? darkTheme : lightTheme;
}

// Default export for backward compatibility (light theme)
export const t = lightTheme as Theme;

// Named exports for explicit use
export { lightTheme, darkTheme, vintageTheme, graphiteGoldTheme, slateBlueTheme, merlotTheme };

// Re-export design tokens for convenience
export { SPACING, RADIUS, SHADOW, TYPO, DURATION, EASING, TRANSITION, Z_INDEX, COMPONENT_HEIGHT };

// ========== Interaction State Helpers ==========

/** Generate complete button styles with all 7 interaction states */
export function buttonStyles(theme: Theme, variant: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline' = 'secondary'): React.CSSProperties {
  const base: React.CSSProperties = {
    border: 'none',
    borderRadius: RADIUS.sm,
    cursor: 'pointer',
    fontSize: TYPO.body.size,
    fontWeight: TYPO.bodyBold.weight,
    lineHeight: String(TYPO.body.lineHeight),
    transition: TRANSITION.all,
    userSelect: 'none',
    outline: 'none',
    padding: `${SPACING.sm}px ${SPACING.lg}px`,
    position: 'relative',
  };

  switch (variant) {
    case 'primary':
      return { ...base, background: theme.accent, color: theme.textInverse };
    case 'secondary':
      return { ...base, background: theme.bgSecondary, color: theme.textPrimary };
    case 'ghost':
      return { ...base, background: 'transparent', color: theme.textSecondary };
    case 'danger':
      return { ...base, background: theme.danger, color: '#fff' };
    case 'outline':
      return { ...base, background: theme.accentLight, color: theme.accent };
    default:
      return base;
  }
}

/** Generate interaction state overrides for use in onMouseEnter/Leave handlers */
export function interactionStates(theme: Theme) {
  return {
    hover: { background: theme.bgHover },
    active: { background: theme.activeBg, transform: 'scale(0.98)' },
    focus: { boxShadow: theme.isDark ? SHADOW.focusDark : SHADOW.focus },
    disabled: { opacity: theme.disabledOpacity, cursor: 'not-allowed' as const, pointerEvents: 'none' as const },
    selected: { background: theme.selectedBg, borderColor: theme.accent },
    loading: { opacity: 0.7, cursor: 'wait' as const, pointerEvents: 'none' as const },
  };
}

/** Generate card styles with hover elevation effect */
export function cardStyles(theme: Theme): React.CSSProperties {
  return {
    background: theme.bgCard,
    borderRadius: RADIUS.md,
    boxShadow: 'none',
    transition: `box-shadow ${DURATION.fast}ms ${EASING.out}, transform ${DURATION.fast}ms ${EASING.out}, background ${DURATION.fast}ms ${EASING.out}`,
    overflow: 'hidden',
    cursor: 'pointer',
  };
}

/** Generate input styles with focus ring */
export function inputStyles(theme: Theme): React.CSSProperties {
  return {
    padding: `${SPACING.sm}px ${SPACING.md}px`,
    border: `1px solid ${theme.border}`,
    borderRadius: RADIUS.sm,
    background: theme.bgInput,
    color: theme.textPrimary,
    fontSize: TYPO.body.size,
    lineHeight: String(TYPO.body.lineHeight),
    outline: 'none',
    transition: `border-color ${DURATION.fast}ms ${EASING.out}, box-shadow ${DURATION.fast}ms ${EASING.out}`,
    width: '100%',
  };
}

/** Generate dropdown styles */
export function dropdownStyles(theme: Theme): React.CSSProperties {
  return {
    position: 'absolute' as const,
    top: '100%',
    left: 0,
    zIndex: Z_INDEX.dropdown,
    background: theme.dropdownBg,
    border: `1px solid ${theme.borderLight}`,
    borderRadius: RADIUS.md,
    padding: SPACING.xs,
    minWidth: 160,
    maxHeight: 300,
    overflowY: 'auto' as const,
    boxShadow: SHADOW.lg,
    animation: `fadeInUp ${DURATION.fast}ms ${EASING.out}`,
  };
}

/** Generate dropdown item styles */
export function dropdownItemStyles(theme: Theme, isActive = false): React.CSSProperties {
  return {
    display: 'block' as const,
    width: '100%',
    padding: `${SPACING.sm}px ${SPACING.lg}px`,
    border: 'none',
    borderRadius: RADIUS.sm,
    background: isActive ? theme.accentLight : 'transparent',
    color: isActive ? theme.accent : theme.textPrimary,
    cursor: 'pointer',
    fontSize: TYPO.body.size,
    textAlign: 'left' as const,
    transition: TRANSITION.bg,
    outline: 'none',
  };
}

/** Generate modal overlay + content styles */
export function modalStyles(theme: Theme) {
  return {
    overlay: {
      position: 'fixed' as const,
      inset: 0,
      background: theme.bgOverlay,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: Z_INDEX.modal,
      animation: `fadeInUp ${DURATION.normal}ms ${EASING.out}`,
    },
    content: {
      background: theme.modalBg,
      borderRadius: RADIUS.lg,
      boxShadow: SHADOW.xl,
      maxWidth: '90vw',
      maxHeight: '85vh',
      overflow: 'auto' as const,
      animation: `fadeInUp ${DURATION.normal}ms ${EASING.out}`,
    },
  };
}

/** Generate toast notification styles */
export function toastStyles(theme: Theme, type: 'info' | 'success' | 'warning' | 'error' = 'info') {
  const bgMap = {
    info: theme.accent,
    success: theme.success,
    warning: theme.warning,
    error: theme.danger,
  };
  return {
    position: 'fixed' as const,
    top: SPACING.xl,
    left: '50%',
    transform: 'translateX(-50%)',
    background: bgMap[type],
    color: '#fff',
    padding: `${SPACING.md}px ${SPACING.xl}px`,
    borderRadius: RADIUS.md,
    fontSize: TYPO.body.size,
    zIndex: Z_INDEX.toast,
    boxShadow: SHADOW.md,
    animation: `toastIn ${DURATION.normal}ms ${EASING.out}`,
    display: 'flex',
    alignItems: 'center',
    gap: SPACING.sm,
  };
}
