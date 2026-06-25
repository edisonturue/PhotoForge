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
  // Backgrounds — achromatic, layered by lightness only
  bgPrimary: '#f7f7f7',
  bgSecondary: '#f0f0f0',
  bgTertiary: '#e6e6e6',
  bgCard: '#fcfcfc',
  bgHover: '#ebebeb',
  bgOverlay: 'rgba(0,0,0,0.40)',
  bgInput: '#fefefe',
  bgPhotoStage: '#e9e9e9',
  bgPhotoSurface: '#fbfbfb',

  // Borders — barely visible, receding
  border: '#dfdfdf',
  borderLight: '#ebebeb',
  borderFocus: '#6f6f88',

  // Text — crisp, high-contrast where it matters
  textPrimary: '#1a1a1c',
  textSecondary: '#636366',
  textTertiary: '#8e8e93',
  textInverse: '#ffffff',

  // Brand / Accent — ultra-muted steel (HSL 235 10% 48%)
  // Used sparingly: selected states, links, primary actions
  accent: '#6f6f88',
  accentHover: '#5e5e7a',
  accentLight: '#f4f4f9',
  accentBg: '#f8f8fb',

  // Status — restrained, never vivid
  danger: '#d15555',
  dangerHover: '#c54848',
  dangerLight: '#faf3f3',
  warning: '#d49b1f',
  warningLight: '#faf6ed',
  success: '#4a9b6e',
  successLight: '#eff7f2',

  // Specific surfaces
  sidebarBg: '#f0f0f0',
  panelBg: '#fcfcfc',
  gridItemBg: '#fdfdfd',
  dropdownBg: '#ffffff',
  modalBg: '#fcfcfc',
  scrollbarTrack: '#e8e8e8',
  emptyState: '#8e8e93',
  ratingStar: '#d49b1f',
  favStar: '#d49b1f',
  colorLabelRed: '#d15555',
  colorLabelYellow: '#d49b1f',
  colorLabelGreen: '#4a9b6e',
  colorLabelBlue: '#5b8cc7',
  colorLabelPurple: '#6f6f88',

  // Interaction states
  activeBg: '#e0e0e0',
  selectedBg: '#f4f4f9',
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
  // Backgrounds — deep, layered by subtle brightness steps
  bgPrimary: '#0e0d0c',
  bgSecondary: '#141312',
  bgTertiary: '#1c1b19',
  bgCard: '#171614',
  bgHover: '#232220',
  bgOverlay: 'rgba(0,0,0,0.70)',
  bgInput: '#181715',
  bgPhotoStage: '#080807',
  bgPhotoSurface: '#11100f',

  // Borders — subtle, receding
  border: '#282724',
  borderLight: '#1e1d1b',
  borderFocus: '#938a78',

  // Text — warm but neutral
  textPrimary: '#ecebe8',
  textSecondary: '#b4b3ae',
  textTertiary: '#7a7974',
  textInverse: '#0e0d0c',

  // Brand / Accent — warm stone (HSL 37 10% 52%)
  // Muted warm accent against cool-neutral backgrounds
  accent: '#938a78',
  accentHover: '#a59b87',
  accentLight: '#24231e',
  accentBg: '#1c1b18',

  // Status — muted warm tones
  danger: '#bd6e68',
  dangerHover: '#cc827c',
  dangerLight: '#27201f',
  warning: '#b5974c',
  warningLight: '#27241c',
  success: '#5b9977',
  successLight: '#18241e',

  // Specific surfaces
  sidebarBg: '#11100f',
  panelBg: '#171614',
  gridItemBg: '#191816',
  dropdownBg: '#1a1917',
  modalBg: '#171614',
  scrollbarTrack: '#1c1b19',
  emptyState: '#7a7974',
  ratingStar: '#b5974c',
  favStar: '#b5974c',
  colorLabelRed: '#bd6e68',
  colorLabelYellow: '#b5974c',
  colorLabelGreen: '#5b9977',
  colorLabelBlue: '#7996b4',
  colorLabelPurple: '#9290a8',

  // Interaction states
  activeBg: '#2a2926',
  selectedBg: '#24231e',
  disabledOpacity: 0.38,

  isDark: true,
};

// ============================================================
//  Specialty Themes — proportionally muted
//  Each keeps a distinct identity but obeys the same restraint.
// ============================================================

// Vintage "Darkroom Green" — muted forest, ~18% accent saturation
const vintageTheme = {
  bgPrimary: '#131614',
  bgSecondary: '#1a1e1b',
  bgTertiary: '#242925',
  bgCard: '#1d221f',
  bgHover: '#2c322e',
  bgOverlay: 'rgba(8,10,9,0.76)',
  bgInput: '#1b1f1c',
  bgPhotoStage: '#0b0d0c',
  bgPhotoSurface: '#141815',

  border: '#2c322e',
  borderLight: '#222824',
  borderFocus: '#5a816e',

  textPrimary: '#edeeec',
  textSecondary: '#b9beb7',
  textTertiary: '#798078',
  textInverse: '#0f1210',

  accent: '#56816a',
  accentHover: '#66937b',
  accentLight: '#1c2620',
  accentBg: '#151d18',

  danger: '#af655a',
  dangerHover: '#b87e75',
  dangerLight: '#2a1f1e',
  warning: '#a68c59',
  warningLight: '#2b261c',
  success: '#5a8c6f',
  successLight: '#19241e',

  sidebarBg: '#151816',
  panelBg: '#1c201d',
  gridItemBg: '#1e2420',
  dropdownBg: '#1e2420',
  modalBg: '#1c201d',
  scrollbarTrack: '#1e2420',
  emptyState: '#798078',
  ratingStar: '#b69854',
  favStar: '#b69854',
  colorLabelRed: '#b36256',
  colorLabelYellow: '#b2944d',
  colorLabelGreen: '#568f6e',
  colorLabelBlue: '#7994af',
  colorLabelPurple: '#907ea9',

  activeBg: '#2a312d',
  selectedBg: '#1c2620',
  disabledOpacity: 0.42,
  isDark: true,
};

// "Graphite Gold" — deep graphite with barely-gold accent (15%)
const graphiteGoldTheme = {
  bgPrimary: '#0f1011',
  bgSecondary: '#16181a',
  bgTertiary: '#1e2125',
  bgCard: '#181b1e',
  bgHover: '#262a2f',
  bgOverlay: 'rgba(6,7,8,0.76)',
  bgInput: '#15171a',
  bgPhotoStage: '#090a0b',
  bgPhotoSurface: '#121417',

  border: '#2e3238',
  borderLight: '#202428',
  borderFocus: '#9a8c64',

  textPrimary: '#edf0f2',
  textSecondary: '#c1c7ce',
  textTertiary: '#7a848e',
  textInverse: '#0c0e10',

  accent: '#9a8c64',
  accentHover: '#ad9e78',
  accentLight: '#232018',
  accentBg: '#191710',

  danger: '#c8746c',
  dangerHover: '#d48780',
  dangerLight: '#2a1c1c',
  warning: '#b8995a',
  warningLight: '#2b2418',
  success: '#6fa87c',
  successLight: '#17241c',

  sidebarBg: '#121417',
  panelBg: '#16191c',
  gridItemBg: '#171b1f',
  dropdownBg: '#181b1f',
  modalBg: '#16191c',
  scrollbarTrack: '#181b1f',
  emptyState: '#7a848e',
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
  bgPrimary: '#0e1116',
  bgSecondary: '#151921',
  bgTertiary: '#1c222d',
  bgCard: '#171c25',
  bgHover: '#242c39',
  bgOverlay: 'rgba(5,7,10,0.76)',
  bgInput: '#141820',
  bgPhotoStage: '#090b10',
  bgPhotoSurface: '#11151d',

  border: '#2e3542',
  borderLight: '#1e2630',
  borderFocus: '#6b95b8',

  textPrimary: '#ecf0f5',
  textSecondary: '#c1cbd6',
  textTertiary: '#778696',
  textInverse: '#0d1116',

  accent: '#6b95b8',
  accentHover: '#80a6c4',
  accentLight: '#18222f',
  accentBg: '#121a24',

  danger: '#c07074',
  dangerHover: '#d08488',
  dangerLight: '#2a1c1e',
  warning: '#b8935a',
  warningLight: '#2b2418',
  success: '#6d9e8c',
  successLight: '#16241f',

  sidebarBg: '#11161d',
  panelBg: '#151a22',
  gridItemBg: '#161c25',
  dropdownBg: '#161b24',
  modalBg: '#151a22',
  scrollbarTrack: '#161c25',
  emptyState: '#778696',
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
  bgPrimary: '#110f10',
  bgSecondary: '#181517',
  bgTertiary: '#201c1e',
  bgCard: '#1c181a',
  bgHover: '#292326',
  bgOverlay: 'rgba(7,6,6,0.76)',
  bgInput: '#171415',
  bgPhotoStage: '#0b090a',
  bgPhotoSurface: '#131112',

  border: '#352e31',
  borderLight: '#241e20',
  borderFocus: '#9a606a',

  textPrimary: '#f1ebed',
  textSecondary: '#d0c2c6',
  textTertiary: '#8c7e82',
  textInverse: '#0e0c0d',

  accent: '#9a606a',
  accentHover: '#ad737d',
  accentLight: '#241a1d',
  accentBg: '#1a1215',

  danger: '#c46e6c',
  dangerHover: '#d18280',
  dangerLight: '#2b1a1a',
  warning: '#b8925a',
  warningLight: '#2b2418',
  success: '#7e9d80',
  successLight: '#18241b',

  sidebarBg: '#131011',
  panelBg: '#181416',
  gridItemBg: '#1b1619',
  dropdownBg: '#1a1517',
  modalBg: '#181416',
  scrollbarTrack: '#1a1517',
  emptyState: '#8c7e82',
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
      return { ...base, background: theme.bgTertiary, color: theme.textPrimary };
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
