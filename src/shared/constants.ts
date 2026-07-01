// Supported raw formats by camera manufacturer
export const RAW_FORMATS: Record<string, string[]> = {
  Canon: ['.cr2', '.cr3', '.crw'],
  Nikon: ['.nef', '.nrw'],
  Sony: ['.arw', '.srf', '.sr2'],
  Fujifilm: ['.raf'],
  Olympus: ['.orf'],
  Panasonic: ['.rw2', '.raw'],
  Leica: ['.rwl'],
  Pentax: ['.pef', '.ptx'],
  PhaseOne: ['.iiq'],
  Hasselblad: ['.3fr', '.fff'],
  Sigma: ['.x3f'],
  Mamiya: ['.mef'],
  Samsung: ['.srw'],
  Adobe: ['.dng'],
};

export const ALL_RAW_EXTENSIONS = Object.values(RAW_FORMATS).flat();

export const STANDARD_IMAGE_FORMATS = [
  '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.tif',
  '.webp', '.svg', '.heic', '.heif', '.avif', '.ico',
];

export const ALL_SUPPORTED_FORMATS = [...ALL_RAW_EXTENSIONS, ...STANDARD_IMAGE_FORMATS];

export const SUPPORTED_FORMAT_LABELS: Record<string, string> = {
  '.cr2': 'Canon RAW 2',
  '.cr3': 'Canon RAW 3',
  '.nef': 'Nikon RAW',
  '.arw': 'Sony RAW',
  '.raf': 'Fujifilm RAW',
  '.orf': 'Olympus RAW',
  '.rw2': 'Panasonic RAW',
  '.dng': 'Adobe DNG',
  '.srw': 'Samsung RAW',
  '.pef': 'Pentax RAW',
  '.jpg': 'JPEG',
  '.jpeg': 'JPEG',
  '.png': 'PNG',
  '.gif': 'GIF',
  '.tiff': 'TIFF',
  '.tif': 'TIFF',
  '.webp': 'WebP',
  '.heic': 'HEIC',
  '.heif': 'HEIF',
  '.bmp': 'BMP',
  '.avif': 'AVIF',
};

export const COLOR_LABEL_COLORS: Record<string, string> = {
  none: 'transparent',
  red: '#e74c3c',
  yellow: '#f1c40f',
  green: '#2ecc71',
  blue: '#3498db',
  purple: '#9b59b6',
};

export const DEFAULT_THUMBNAIL_SIZE = 400;
export const MAX_IMPORT_CONCURRENCY = 4;
export const LIBRARY_SUBDIR = 'PhotoForge_Library';
/**
 * Strip corporate/legal suffixes from camera model names.
 * EXIF data often includes strings like "NIKON CORPORATION NIKON D850"
 * or "Canon Inc. EOS R5" — users only want "NIKON D850" or "EOS R5".
 */
const CAMERA_CLEAN_PATTERNS: Array<{ from: string; to: string }> = [
  // Corporate suffixes to strip
  { from: ' CORPORATION', to: '' },
  { from: ' CORPORATED', to: '' },
  { from: ' INC.', to: '' },
  { from: ' INC', to: '' },
  { from: ' LTD.', to: '' },
  { from: ' LTD', to: '' },
  { from: ' CO., LTD.', to: '' },
  { from: ' CO LTD', to: '' },
  { from: ' COMPANY', to: '' },
  { from: ' COMPANY, LTD.', to: '' },
  { from: ' COMPANY LIMITED', to: '' },
  { from: ' (PTY) LTD', to: '' },
  { from: ' GMBH', to: '' },
  { from: ' SA', to: '' },
  { from: ' S.A.', to: '' },
  { from: ' AB', to: '' },
  { from: ' OY', to: '' },
  { from: ' OYJ', to: '' },
  { from: ' AS', to: '' },
  { from: ' NV', to: '' },
  { from: ' B.V.', to: '' },
  { from: ' K.K.', to: '' },
  { from: ' KK', to: '' },
  // Common Chinese suffixes
  { from: '股份有限公司', to: '' },
  { from: '有限公司', to: '' },
  { from: '科技', to: '' },
  { from: '集团', to: '' },
  { from: '股份公司', to: '' },
  { from: '公司', to: '' },
];

export function cleanCameraModel(model: string | null | undefined): string | null {
  if (!model) return null;
  let cleaned = model.trim();
  for (const { from, to } of CAMERA_CLEAN_PATTERNS) {
    // Case-insensitive replacement
    const idx = cleaned.toUpperCase().indexOf(from.toUpperCase());
    if (idx >= 0) {
      cleaned = cleaned.slice(0, idx) + to + cleaned.slice(idx + from.length);
    }
  }
  // Trim multiple spaces
  cleaned = cleaned.replace(/\s{2,}/g, ' ').trim();
  // If the brand name appears doubled (e.g. "NIKON NIKON D850"), deduplicate
  const words = cleaned.split(' ');
  const seen = new Set<string>();
  const deduped: string[] = [];
  for (const w of words) {
    const lower = w.toLowerCase();
    if (seen.has(lower)) continue;
    seen.add(lower);
    deduped.push(w);
  }
  cleaned = deduped.join(' ').trim();
  return cleaned || null;
}

export const THUMBNAILS_DIR = 'thumbnails';
export const MODIFIED_DIR = 'modified';
