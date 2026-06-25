import React from 'react';

type IconName =
  | 'menu'
  | 'import'
  | 'export'
  | 'undo'
  | 'redo'
  | 'albums'
  | 'calendar'
  | 'stats'
  | 'settings'
  | 'display'
  | 'keyboard'
  | 'wrench'
  | 'logs'
  | 'info'
  | 'search'
  | 'filter'
  | 'tag'
  | 'camera'
  | 'star'
  | 'clock'
  | 'sparkles'
  | 'trash'
  | 'loader'
  | 'back'
  | 'close'
  | 'refresh'
  | 'folder'
  | 'edit'
  | 'check'
  | 'x'
  | 'link'
  | 'adjustments'
  | 'crop'
  | 'rotate'
  | 'flipH'
  | 'flipV'
  | 'compareSide'
  | 'compareOverlay'
  | 'compareSlider'
  | 'globe'
  | 'open'
  | 'more'
  | 'warning'
  | 'gridSmall'
  | 'gridMedium'
  | 'gridLarge'
  | 'chevronDown'
  | 'sortAsc'
  | 'sortDesc'
  | 'dot'
  | 'radioOn'
  | 'radioOff'
  | 'minimize'
  | 'maximize';

interface AppIconProps {
  name: IconName;
  size?: number;
  strokeWidth?: number;
  color?: string;
  filled?: boolean;
  style?: React.CSSProperties;
}

const svgStyle: React.CSSProperties = {
  display: 'block',
  flexShrink: 0,
};

export const AppIcon: React.FC<AppIconProps> = ({
  name,
  size = 16,
  strokeWidth = 1.8,
  color = 'currentColor',
  filled = false,
  style,
}) => {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: filled ? color : 'none',
    stroke: color,
    strokeWidth,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    style: { ...svgStyle, ...style },
    'aria-hidden': true,
  };

  switch (name) {
    case 'menu':
      return <svg {...common}><path d="M4 7h16M4 12h16M4 17h16" /></svg>;
    case 'import':
      return <svg {...common}><path d="M12 4v11" /><path d="m8 11 4 4 4-4" /><path d="M5 20h14" /></svg>;
    case 'export':
      return <svg {...common}><path d="M12 20V9" /><path d="m8 13 4-4 4 4" /><path d="M5 4h14" /></svg>;
    case 'undo':
      return <svg {...common}><path d="M9 14 4 9l5-5" /><path d="M4 9h10a6 6 0 1 1 0 12h-2" /></svg>;
    case 'redo':
      return <svg {...common}><path d="m15 14 5-5-5-5" /><path d="M20 9H10a6 6 0 1 0 0 12h2" /></svg>;
    case 'albums':
      return <svg {...common}><rect x="4" y="6" width="10" height="11" rx="2.2" /><path d="M10 4h8a2 2 0 0 1 2 2v10" /><path d="M7 10h4M7 13h4" /></svg>;
    case 'calendar':
      return <svg {...common}><rect x="4" y="5" width="16" height="15" rx="3" /><path d="M8 3v4M16 3v4M4 9.5h16" /><path d="M8 13h3M13.5 13H16M8 16.5h8" /></svg>;
    case 'stats':
      return <svg {...common}><path d="M4.5 19h15" /><path d="M7.2 18v-4.8" /><path d="M12 18V8.1" /><path d="M16.8 18v-7.2" /><path d="M6 10.8 9.7 7.4l3.1 2.1 5.2-4.7" /><circle cx="9.7" cy="7.4" r="0.8" fill={color} stroke="none" /><circle cx="12.8" cy="9.5" r="0.8" fill={color} stroke="none" /><circle cx="18" cy="4.8" r="0.8" fill={color} stroke="none" /></svg>;
    case 'settings':
      return <svg {...common}><circle cx="12" cy="12" r="3.3" /><path d="M12 4.2v2.1M12 17.7v2.1M19.8 12h-2.1M6.3 12H4.2M17.5 6.5l-1.5 1.5M8 16l-1.5 1.5M17.5 17.5 16 16M8 8 6.5 6.5" /><path d="m14.4 5.1 1 .5M8.6 18.4l1 .5M18.4 8.6l.5 1M5.1 14.4l.5 1M18.9 14.4l-.5 1M5.6 8.6l-.5 1M14.4 18.9l1-.5M8.6 5.6l1-.5" /></svg>;
    case 'display':
      return <svg {...common}><rect x="3.5" y="5" width="17" height="11.5" rx="2.8" /><path d="M8 19h8M12 16.5V19" /><path d="M6.8 9h10.4M6.8 12.2h4.3M13.5 12.2h3.7" /></svg>;
    case 'keyboard':
      return <svg {...common}><rect x="3.5" y="6" width="17" height="11" rx="2.8" /><path d="M6.5 9.7h1.3M9.8 9.7h1.3M13.1 9.7h1.3M16.4 9.7h1.3M6.5 13.3h5.5M13.2 13.3h4.5" /><path d="M7 16h10" /></svg>;
    case 'wrench':
      return <svg {...common}><path d="M14.8 5.1a4.4 4.4 0 0 0 4.1 4.1l-7.9 7.9a2.4 2.4 0 1 1-3.4-3.4l7.9-7.9a4.4 4.4 0 0 0-.7-.7Z" /><circle cx="8.2" cy="15.8" r="0.9" fill={color} stroke="none" /></svg>;
    case 'logs':
      return <svg {...common}><path d="M7 4.5h8l3 3v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-12a2 2 0 0 1 2-2Z" /><path d="M15 4.5v3h3M8 10h8M8 13.5h8M8 17h5" /><path d="M15.7 16.2h2.1M16.75 15.15v2.1" /></svg>;
    case 'info':
      return <svg {...common}><path d="M12 3.8c4.53 0 8.2 3.67 8.2 8.2s-3.67 8.2-8.2 8.2S3.8 16.53 3.8 12 7.47 3.8 12 3.8Z" /><path d="M12 10.2v5.4" /><path d="M12 7.15h.01" /><path d="M8.2 5.95c1.16-.83 2.42-1.24 3.8-1.24" /></svg>;
    case 'search':
      return <svg {...common}><circle cx="10.5" cy="10.5" r="5.8" /><path d="m15.2 15.2 4.3 4.3" /><path d="M10.5 7.4a3.1 3.1 0 0 1 3.1 3.1" /></svg>;
    case 'filter':
      return <svg {...common}><path d="M4 7h16" /><path d="M7 12h10" /><path d="M10 17h4" /><circle cx="9" cy="7" r="1.2" fill={color} stroke="none" /><circle cx="15" cy="12" r="1.2" fill={color} stroke="none" /><circle cx="12" cy="17" r="1.2" fill={color} stroke="none" /></svg>;
    case 'tag':
      return <svg {...common}><path d="m20 12.5-7.5 7.5-8.5-8.5V4.5H11z" /><circle cx="8.2" cy="8.2" r="1.2" /><path d="M12.5 6.5 17.5 11.5" /></svg>;
    case 'camera':
      return <svg {...common}><path d="M4 8.5h3.8l1.8-2.6h5l1.8 2.6H20v9.8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" /><circle cx="12" cy="13.6" r="3.8" /><circle cx="18" cy="10.5" r="0.9" fill={color} stroke="none" /></svg>;
    case 'star':
      return <svg {...common}><path d="m12 3.8 2.55 5.16 5.7.83-4.13 4.02.98 5.68L12 16.8l-5.1 2.69.98-5.68L3.75 9.8l5.7-.83z" /></svg>;
    case 'clock':
      return <svg {...common}><circle cx="12" cy="12" r="8" /><path d="M12 8v4l3 2" /></svg>;
    case 'sparkles':
      return <svg {...common}><path d="m12 3 1.3 3.7L17 8l-3.7 1.3L12 13l-1.3-3.7L7 8l3.7-1.3z" /><path d="m18.5 14 1 2.5 2.5 1-2.5 1-1 2.5-1-2.5-2.5-1 2.5-1z" /><path d="m5.5 13 1 2 2 1-2 1-1 2-1-2-2-1 2-1z" /></svg>;
    case 'trash':
      return <svg {...common}><path d="M4 7h16" /><path d="M10 11v6M14 11v6" /><path d="M6 7l1 13h10l1-13" /><path d="M9 7V4h6v3" /></svg>;
    case 'loader':
      return <svg {...common}><path d="M18.9 8.3A8.4 8.4 0 1 1 12 3.6" /><path d="M18.9 8.3h-3.7" /><path d="M18.9 8.3V4.7" /></svg>;
    case 'back':
      return <svg {...common}><path d="m15 18-6-6 6-6" /><path d="M9 12h10" /></svg>;
    case 'close':
    case 'x':
      return <svg {...common}><path d="M6 6l12 12M18 6 6 18" /></svg>;
    case 'refresh':
      return <svg {...common}><path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3" /><path d="M19.5 5v6.2h-6.2" /></svg>;
    case 'folder':
      return <svg {...common}><path d="M3 7h6l2 2h10v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><path d="M3 7V6a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v1" /></svg>;
    case 'edit':
      return <svg {...common}><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4z" /></svg>;
    case 'check':
      return <svg {...common}><path d="m5 12 4 4L19 6" /></svg>;
    case 'link':
      return <svg {...common}><path d="M10 13a5 5 0 0 1 0-7l1-1a5 5 0 0 1 7 7l-1 1" /><path d="M14 11a5 5 0 0 1 0 7l-1 1a5 5 0 1 1-7-7l1-1" /></svg>;
    case 'adjustments':
      return <svg {...common}><path d="M6 5v14M12 5v14M18 5v14" /><circle cx="6" cy="9" r="1.9" fill={filled ? color : common.fill} /><circle cx="12" cy="15" r="1.9" fill={filled ? color : common.fill} /><circle cx="18" cy="8" r="1.9" fill={filled ? color : common.fill} /></svg>;
    case 'crop':
      return <svg {...common}><path d="M6 4v11.5a2.5 2.5 0 0 0 2.5 2.5H20" /><path d="M4 8h10.5a2.5 2.5 0 0 1 2.5 2.5V20" /><path d="M10 4v8" /></svg>;
    case 'rotate':
      return <svg {...common}><path d="M19.5 11.5A7.5 7.5 0 1 1 17.3 6.2" /><path d="M19.5 4.5v6h-6" /></svg>;
    case 'flipH':
      return <svg {...common}><path d="M12 4v16" /><path d="m9 8-4 4 4 4" /><path d="m15 8 4 4-4 4" /></svg>;
    case 'flipV':
      return <svg {...common}><path d="M4 12h16" /><path d="m8 9 4-4 4 4" /><path d="m8 15 4 4 4-4" /></svg>;
    case 'compareSide':
      return <svg {...common}><rect x="4.5" y="6" width="6.5" height="12" rx="1.8" /><rect x="13" y="6" width="6.5" height="12" rx="1.8" /><path d="M12 6v12" /></svg>;
    case 'compareOverlay':
      return <svg {...common}><rect x="5.5" y="5.5" width="10.5" height="10.5" rx="1.8" /><rect x="8.5" y="8.5" width="10" height="10" rx="1.8" /><path d="M12 8v8" /></svg>;
    case 'compareSlider':
      return <svg {...common}><path d="M12 4v16" /><rect x="10.2" y="9.3" width="3.6" height="5.4" rx="1.6" fill={color} stroke="none" /><path d="M7.5 8.2 4.2 12l3.3 3.8M16.5 8.2l3.3 3.8-3.3 3.8" /></svg>;
    case 'globe':
      return <svg {...common}><circle cx="12" cy="12" r="8.8" /><path d="M4.2 12h15.6" /><path d="M12 3.2c2.2 2.28 3.35 5.18 3.45 8.8-.1 3.62-1.25 6.52-3.45 8.8" /><path d="M12 3.2c-2.2 2.28-3.35 5.18-3.45 8.8.1 3.62 1.25 6.52 3.45 8.8" /><path d="M6.1 7.25c1.66.86 3.63 1.28 5.9 1.28 2.27 0 4.24-.42 5.9-1.28" /><path d="M6.1 16.75c1.66-.86 3.63-1.28 5.9-1.28 2.27 0 4.24.42 5.9 1.28" /></svg>;
    case 'open':
      return <svg {...common}><path d="M14 4h6v6" /><path d="M10 14 20 4" /><path d="M20 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h5" /></svg>;
    case 'more':
      return <svg {...common}><circle cx="6.2" cy="12" r="1.2" fill={color} stroke="none" /><circle cx="12" cy="12" r="1.2" fill={color} stroke="none" /><circle cx="17.8" cy="12" r="1.2" fill={color} stroke="none" /><path d="M3.8 12h0M20.2 12h0" /></svg>;
    case 'warning':
      return <svg {...common}><path d="M12 4.5 4.2 18.5h15.6Z" /><path d="M12 8.8v4.6" /><path d="M12 16.1h.01" /><path d="M9.4 14.8h5.2" /></svg>;
    case 'gridSmall':
      return <svg {...common}><rect x="4" y="4" width="5" height="5" rx="1" /><rect x="10.5" y="4" width="5" height="5" rx="1" /><rect x="17" y="4" width="3" height="5" rx="1" /><rect x="4" y="10.5" width="5" height="5" rx="1" /><rect x="10.5" y="10.5" width="5" height="5" rx="1" /><rect x="17" y="10.5" width="3" height="5" rx="1" /><rect x="4" y="17" width="5" height="3" rx="1" /><rect x="10.5" y="17" width="5" height="3" rx="1" /><rect x="17" y="17" width="3" height="3" rx="1" /></svg>;
    case 'gridMedium':
      return <svg {...common}><rect x="4" y="4" width="7" height="7" rx="1.2" /><rect x="13" y="4" width="7" height="7" rx="1.2" /><rect x="4" y="13" width="7" height="7" rx="1.2" /><rect x="13" y="13" width="7" height="7" rx="1.2" /></svg>;
    case 'gridLarge':
      return <svg {...common}><rect x="4" y="5" width="16" height="6" rx="1.2" /><rect x="4" y="13" width="16" height="6" rx="1.2" /></svg>;
    case 'chevronDown':
      return <svg {...common}><path d="m6 9 6 6 6-6" /></svg>;
    case 'sortAsc':
      return <svg {...common}><path d="M8 6v12" /><path d="m5 9 3-3 3 3" /><path d="M14 10h5M14 14h4M14 18h3" /></svg>;
    case 'sortDesc':
      return <svg {...common}><path d="M8 6v12" /><path d="m5 15 3 3 3-3" /><path d="M14 10h3M14 14h4M14 18h5" /></svg>;
    case 'dot':
      return <svg {...common} fill={color} stroke="none"><circle cx="12" cy="12" r="3.2" /></svg>;
    case 'radioOn':
      return <svg {...common}><circle cx="12" cy="12" r="7" /><circle cx="12" cy="12" r="3.2" fill={color} stroke="none" /></svg>;
    case 'radioOff':
      return <svg {...common}><circle cx="12" cy="12" r="7" /></svg>;
    case 'minimize':
      return <svg {...common}><path d="M6 12h12" /></svg>;
    case 'maximize':
      return <svg {...common}><rect x="6" y="6" width="12" height="12" rx="2" /></svg>;
    default:
      return null;
  }
};
