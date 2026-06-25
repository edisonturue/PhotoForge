import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { execFile } from 'child_process';

const execFileAsync = promisify(execFile);
const mkdir = promisify(fs.mkdir);

// Extensions that browsers cannot natively render
const RAW_EXTENSIONS = new Set([
  '.nef', '.nrw', '.cr2', '.cr3', '.crw', '.arw', '.srf', '.sr2',
  '.raf', '.orf', '.rw2', '.raw', '.rwl', '.pef', '.ptx', '.iiq',
  '.3fr', '.fff', '.x3f', '.mef', '.srw', '.dng',
]);

export function isRawFile(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  return RAW_EXTENSIONS.has(ext);
}

/**
 * Convert a RAW file to JPEG using available system tools.
 * Priority: sips (macOS native) → dcraw+netpbm → sharp (last resort)
 */
export async function convertRawToJpeg(
  rawPath: string,
  outputPath: string,
  maxWidth: number = 1920,
): Promise<string> {
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }

  // Strategy 1: sips (macOS built-in, supports many RAW formats natively)
  if (process.platform === 'darwin') {
    try {
      // Build sips args with correct order: --setProperty pairs first, then --resampleWidth, then --out
      const sipsArgs: string[] = [
        '--setProperty', 'format', 'jpeg',
        '--setProperty', 'formatOptions', '85',
      ];
      // Only resample if maxWidth is reasonable (not 9999 = full res)
      if (maxWidth < 9000) {
        sipsArgs.push('--resampleWidth', String(maxWidth));
      }
      sipsArgs.push('--out', outputPath, rawPath);
      await execFileAsync('sips', sipsArgs, { timeout: 60000 });
      if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 0) {
        return outputPath;
      }
    } catch (err: any) {
      console.warn(`sips conversion failed for ${rawPath}:`, err.message);
    }
  }

  // Strategy 2: dcraw + netpbm pipeline
  try {
    const ppmPath = outputPath.replace(/\.jpg$/, '.ppm');
    await execFileAsync('dcraw', ['-c', '-w', '-h', String(maxWidth), rawPath], {
      timeout: 30000,
      maxBuffer: 100 * 1024 * 1024,
    }).then(async ({ stdout }) => {
      // dcraw -c writes PPM to stdout
      if (stdout && stdout.length > 0) {
        fs.writeFileSync(ppmPath, stdout);
        // Convert PPM to JPEG via pamscale + pnmtojpeg or sips
        try {
          await execFileAsync('pamscale', [
            '--width_check', String(maxWidth), ppmPath,
          ], { timeout: 15000 }).then(async ({ stdout: scaled }) => {
            fs.writeFileSync(ppmPath, scaled);
          });
        } catch { /* pamscale optional */ }

        try {
          if (process.platform === 'darwin') {
            await execFileAsync('sips', [
              '--setProperty', 'format', 'jpeg',
              '--out', outputPath, ppmPath,
            ], { timeout: 15000 });
          } else {
            await execFileAsync('pnmtojpeg', [ppmPath], {
              timeout: 15000,
              maxBuffer: 50 * 1024 * 1024,
            }).then(({ stdout }) => {
              fs.writeFileSync(outputPath, stdout);
            });
          }
        } catch { /* PPM convert failed */ }

        // Clean up PPM
        try { fs.unlinkSync(ppmPath); } catch { /* */ }
      }
    });

    if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 0) {
      return outputPath;
    }
  } catch (err: any) {
    console.warn(`dcraw conversion failed for ${rawPath}:`, err.message);
  }

  // Strategy 3: sharp (supports some RAW via libimage / TIFF embedded preview)
  try {
    const sharp = require('sharp');
    // Try to extract the embedded JPEG preview first (most RAW files have one)
    // .rotate() auto-rotates based on EXIF Orientation tag
    await sharp(rawPath, { failOn: 'none' })
      .rotate()
      .resize(maxWidth, maxWidth, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toFile(outputPath);

    if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 0) {
      return outputPath;
    }
  } catch (err: any) {
    console.warn(`sharp conversion failed for ${rawPath}:`, err.message);
  }

  // Strategy 4: If all else fails, try to extract embedded preview using exiftool or exifr
  try {
    const exifr = require('exifr');
    const buf = await exifr.parse(rawPath, { tiff: true });
    // Some RAW files have a PreviewImage in EXIF
    // Not straightforward to extract with exifr, skip
  } catch { /* */ }

  throw new Error(`Failed to convert RAW file to JPEG: ${rawPath}`);
}

/**
 * Convert a RAW file and return the JPEG data as a Buffer (for protocol handler).
 * Cached in memory / disk to avoid re-conversion on each render.
 */
// Cache entries keyed by rawPath, storing { path, maxWidth } so we can
// tell whether a cached file was produced at full resolution or a
// preview size, and avoid reusing a small preview for a full-res export.
const conversionCache = new Map<string, { path: string; maxWidth: number }>();

/**
 * Validate that a cached converted JPEG has a reasonable resolution.
 * Corrupted or stale cache files can be tiny (e.g. 120×160) even though
 * the file size is > 0. Returns true if the file looks valid.
 */
function isCacheValid(convertedPath: string, expectedMaxWidth: number): boolean {
  try {
    // On macOS, use sips to quickly read pixel dimensions
    if (process.platform === 'darwin') {
      const result = require('child_process').spawnSync('sips', [
        '-g', 'pixelWidth', convertedPath,
      ], { encoding: 'utf-8', timeout: 5000 });
      if (result.status === 0) {
        const match = result.stdout.match(/pixelWidth:\s*(\d+)/);
        if (match) {
          const actualWidth = parseInt(match[1], 10);
          // Accept if width is at least half the expected maxWidth
          // (aspect ratio may make width smaller than maxWidth for portrait images)
          return actualWidth >= expectedMaxWidth * 0.4;
        }
      }
    }
    // Fallback: check file size as a rough heuristic
    // A valid 4000px JPEG should be at least 100KB, a 1920px at least 30KB
    const minSize = expectedMaxWidth >= 3000 ? 100_000 : expectedMaxWidth >= 1000 ? 30_000 : 5_000;
    return fs.statSync(convertedPath).size >= minSize;
  } catch {
    return false;
  }
}

export async function getConvertedJpegPath(
  rawPath: string,
  cacheDir: string,
  maxWidth: number = 1920,
): Promise<string> {
  // Check in-memory cache — reuse only if cached maxWidth >= requested maxWidth
  const cached = conversionCache.get(rawPath);
  if (cached && fs.existsSync(cached.path)) {
    if (cached.maxWidth >= maxWidth) {
      if (isCacheValid(cached.path, maxWidth)) {
        return cached.path;
      }
      // Cached file is corrupted — invalidate and fall through
      try { fs.unlinkSync(cached.path); } catch { /* ignore */ }
      conversionCache.delete(rawPath);
    }
    // Cached file is too small for the requested resolution; fall through
    // and re-convert at the larger size.
  }

  // Determine output filename based on requested maxWidth so that
  // different resolutions don't overwrite each other on disk.
  const hash = path.basename(rawPath, path.extname(rawPath));
  const suffix = maxWidth >= 9000 ? '_full' : `_${maxWidth}`;
  const convertedPath = path.join(cacheDir, `${hash}${suffix}.jpg`);

  // Check if already converted on disk at the correct size
  if (fs.existsSync(convertedPath) && fs.statSync(convertedPath).size > 0) {
    if (isCacheValid(convertedPath, maxWidth)) {
      conversionCache.set(rawPath, { path: convertedPath, maxWidth });
      return convertedPath;
    }
    // Cache file is corrupted/too small — delete and re-convert
    try { fs.unlinkSync(convertedPath); } catch { /* ignore */ }
  }

  // Convert
  await convertRawToJpeg(rawPath, convertedPath, maxWidth);
  conversionCache.set(rawPath, { path: convertedPath, maxWidth });
  return convertedPath;
}
