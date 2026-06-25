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
export const THUMBNAILS_DIR = 'thumbnails';
export const MODIFIED_DIR = 'modified';
