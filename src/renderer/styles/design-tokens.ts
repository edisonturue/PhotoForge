// PhotoForge Design Tokens — Unified design system
// Based on AGENTS.md §11.1 and PROJECT_LIFECYCLE.md Chapter 11

// ========== Spacing Scale (4px base) ==========
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

// ========== Border Radius Scale ==========
export const RADIUS = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  pill: 999,
} as const;

// ========== Shadow Levels ==========
export const SHADOW = {
  none: 'none',
  sm: '0 1px 3px rgba(0,0,0,0.08)',
  md: '0 4px 12px rgba(0,0,0,0.1)',
  lg: '0 8px 24px rgba(0,0,0,0.15)',
  xl: '0 16px 48px rgba(0,0,0,0.2)',
  focus: '0 0 0 3px rgba(124,58,237,0.25)',
  focusDark: '0 0 0 3px rgba(167,139,250,0.35)',
} as const;

// ========== Typography Scale ==========
export const TYPO = {
  caption: { size: 11, weight: 400, lineHeight: 1.4 },
  body: { size: 14, weight: 500, lineHeight: 1.6 },
  bodyBold: { size: 14, weight: 600, lineHeight: 1.6 },
  subheading: { size: 16, weight: 600, lineHeight: 1.4 },
  heading: { size: 18, weight: 600, lineHeight: 1.3 },
  display: { size: 24, weight: 700, lineHeight: 1.2 },
  // Additional sizes used in the app
  tiny: { size: 10, weight: 400, lineHeight: 1.3 },
  small: { size: 13, weight: 500, lineHeight: 1.4 },
  large: { size: 17, weight: 600, lineHeight: 1.3 },
} as const;

// ========== Animation Durations ==========
export const DURATION = {
  instant: 100,
  fast: 150,
  normal: 250,
  slow: 400,
} as const;

// ========== Animation Easings ==========
export const EASING = {
  out: 'cubic-bezier(0.0, 0, 0.2, 1)',
  inOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
  spring: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
} as const;

// ========== Component Heights ==========
export const COMPONENT_HEIGHT = {
  buttonSm: 28,
  buttonMd: 32,
  buttonLg: 40,
  input: 32,
  toolbar: 48,
  sidebarHeader: 40,
  tab: 40,
} as const;

// ========== Z-Index Scale ==========
export const Z_INDEX = {
  dropdown: 100,
  sidebar: 200,
  modal: 500,
  toast: 600,
  tooltip: 700,
} as const;

// ========== Transition Helpers ==========
export const TRANSITION = {
  /** Standard transition for background, shadow, border, transform */
  all: `all ${DURATION.fast}ms ${EASING.out}`,
  /** Background color only */
  bg: `background-color ${DURATION.fast}ms ${EASING.out}`,
  /** Shadow only */
  shadow: `box-shadow ${DURATION.fast}ms ${EASING.out}`,
  /** Transform only */
  transform: `transform ${DURATION.fast}ms ${EASING.out}`,
  /** Opacity only */
  opacity: `opacity ${DURATION.normal}ms ${EASING.out}`,
  /** Panel expand/collapse */
  expand: `all ${DURATION.normal}ms ${EASING.inOut}`,
  /** Modal appear */
  modal: `all ${DURATION.normal}ms ${EASING.out}`,
  /** Spring bounce for micro-interactions */
  spring: `all ${DURATION.normal}ms ${EASING.spring}`,
} as const;

// ========== Common Style Presets ==========
/** Standard focus ring for interactive elements */
export const focusRing = (isDark = false): React.CSSProperties => ({
  outline: 'none',
  boxShadow: isDark ? SHADOW.focusDark : SHADOW.focus,
});

/** Standard hover transition mixin */
export const hoverTransition: React.CSSProperties = {
  transition: TRANSITION.all,
};

/** Standard button base styles */
export const buttonBase = (isDark = false): React.CSSProperties => ({
  border: 'none',
  borderRadius: RADIUS.sm,
  cursor: 'pointer',
  fontSize: TYPO.body.size,
  fontWeight: TYPO.body.weight,
  lineHeight: String(TYPO.body.lineHeight),
  transition: TRANSITION.all,
  userSelect: 'none',
  // Focus visible
  outline: 'none',
});

/** Standard card base styles */
export const cardBase: React.CSSProperties = {
  borderRadius: RADIUS.md,
  transition: TRANSITION.all,
  overflow: 'hidden',
};

/** Standard input base styles */
export const inputBase = (isDark = false): React.CSSProperties => ({
  borderRadius: RADIUS.sm,
  fontSize: TYPO.body.size,
  lineHeight: String(TYPO.body.lineHeight),
  outline: 'none',
  transition: `border-color ${DURATION.fast}ms ${EASING.out}, box-shadow ${DURATION.fast}ms ${EASING.out}`,
});

// ========== Animation Keyframes (as CSS strings) ==========
export const KEYFRAMES = {
  /** Fade in from below */
  fadeInUp: `
    @keyframes fadeInUp {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `,
  /** Fade out */
  fadeOut: `
    @keyframes fadeOut {
      from { opacity: 1; }
      to { opacity: 0; }
    }
  `,
  /** Scale pop for favorites */
  scalePop: `
    @keyframes scalePop {
      0% { transform: scale(1); }
      50% { transform: scale(1.3); }
      100% { transform: scale(1); }
    }
  `,
  /** Pulse glow for applied preset */
  pulseGlow: `
    @keyframes pulseGlow {
      0% { box-shadow: 0 0 0 0 rgba(124,58,237,0.3); }
      70% { box-shadow: 0 0 0 8px rgba(124,58,237,0); }
      100% { box-shadow: 0 0 0 0 rgba(124,58,237,0); }
    }
  `,
  /** Slide in from right */
  slideInRight: `
    @keyframes slideInRight {
      from { transform: translateX(20px); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
  `,
  /** Toast slide in */
  toastIn: `
    @keyframes toastIn {
      from { transform: translateY(-20px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
  `,
  /** Toast slide out */
  toastOut: `
    @keyframes toastOut {
      from { transform: translateY(0); opacity: 1; }
      to { transform: translateY(-20px); opacity: 0; }
    }
  `,
  /** Shimmer loading skeleton */
  shimmer: `
    @keyframes shimmer {
      0% { background-position: -200px 0; }
      100% { background-position: calc(200px + 100%) 0; }
    }
  `,
  /** Float animation for empty states */
  float: `
    @keyframes float {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-6px); }
    }
  `,
  /** Scale out for modal/panel close */
  scaleOut: `
    @keyframes scaleOut {
      from { opacity: 1; transform: scale(1); }
      to { opacity: 0; transform: scale(0.95); }
    }
  `,
  /** Checkmark draw animation for success states */
  checkmark: `
    @keyframes checkmark {
      0% { stroke-dashoffset: 100; }
      100% { stroke-dashoffset: 0; }
    }
  `,
  /** Success pulse glow */
  successPulse: `
    @keyframes successPulse {
      0% { box-shadow: 0 0 0 0 rgba(74,155,110,0.5); }
      70% { box-shadow: 0 0 0 20px rgba(74,155,110,0); }
      100% { box-shadow: 0 0 0 0 rgba(74,155,110,0); }
    }
  `,
} as const;
