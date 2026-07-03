import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('rawConverter', () => {
  const { isRawFile } = require('../src/main/rawConverter');

  test('should identify NEF as RAW', () => {
    expect(isRawFile('photo.nef')).toBe(true);
    expect(isRawFile('photo.NEF')).toBe(true);
    expect(isRawFile('/path/to/DSC_0001.nef')).toBe(true);
  });

  test('should identify CR2 as RAW', () => {
    expect(isRawFile('photo.cr2')).toBe(true);
    expect(isRawFile('photo.cr3')).toBe(true);
  });

  test('should identify ARW as RAW', () => {
    expect(isRawFile('photo.arw')).toBe(true);
  });

  test('should identify RAF as RAW', () => {
    expect(isRawFile('photo.raf')).toBe(true);
  });

  test('should identify DNG as RAW', () => {
    expect(isRawFile('photo.dng')).toBe(true);
  });

  test('should identify all supported RAW formats', () => {
    const rawExts = ['.nef', '.nrw', '.cr2', '.cr3', '.crw', '.arw', '.srf', '.sr2',
      '.raf', '.orf', '.rw2', '.raw', '.rwl', '.pef', '.ptx', '.iiq',
      '.3fr', '.fff', '.x3f', '.mef', '.srw', '.dng'];
    for (const ext of rawExts) {
      expect(isRawFile(`photo${ext}`)).toBe(true);
    }
  });

  test('should NOT identify JPEG as RAW', () => {
    expect(isRawFile('photo.jpg')).toBe(false);
    expect(isRawFile('photo.jpeg')).toBe(false);
  });

  test('should NOT identify PNG as RAW', () => {
    expect(isRawFile('photo.png')).toBe(false);
  });

  test('should NOT identify TIFF as RAW', () => {
    expect(isRawFile('photo.tiff')).toBe(false);
    expect(isRawFile('photo.tif')).toBe(false);
  });

  test('should NOT identify WebP/HEIC as RAW', () => {
    expect(isRawFile('photo.webp')).toBe(false);
    expect(isRawFile('photo.heic')).toBe(false);
    expect(isRawFile('photo.avif')).toBe(false);
  });

  test('should handle filenames without extension', () => {
    expect(isRawFile('photo')).toBe(false);
  });
});
