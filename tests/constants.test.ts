import {
  RAW_FORMATS, ALL_RAW_EXTENSIONS, STANDARD_IMAGE_FORMATS,
  ALL_SUPPORTED_FORMATS, SUPPORTED_FORMAT_LABELS,
} from '../src/shared/constants';

describe('Constants', () => {
  test('RAW_FORMATS should cover major camera manufacturers', () => {
    const manufacturers = Object.keys(RAW_FORMATS);
    expect(manufacturers).toContain('Canon');
    expect(manufacturers).toContain('Nikon');
    expect(manufacturers).toContain('Sony');
    expect(manufacturers).toContain('Fujifilm');
    expect(manufacturers).toContain('Olympus');
    expect(manufacturers).toContain('Panasonic');
    expect(manufacturers).toContain('Leica');
    expect(manufacturers).toContain('Pentax');
    expect(manufacturers).toContain('Adobe');
  });

  test('Canon should have CR2 and CR3 formats', () => {
    expect(RAW_FORMATS.Canon).toContain('.cr2');
    expect(RAW_FORMATS.Canon).toContain('.cr3');
  });

  test('Nikon should have NEF format', () => {
    expect(RAW_FORMATS.Nikon).toContain('.nef');
  });

  test('Sony should have ARW format', () => {
    expect(RAW_FORMATS.Sony).toContain('.arw');
  });

  test('ALL_RAW_EXTENSIONS should include all manufacturer formats', () => {
    expect(ALL_RAW_EXTENSIONS.length).toBeGreaterThan(15);
    expect(ALL_RAW_EXTENSIONS).toContain('.cr2');
    expect(ALL_RAW_EXTENSIONS).toContain('.cr3');
    expect(ALL_RAW_EXTENSIONS).toContain('.nef');
    expect(ALL_RAW_EXTENSIONS).toContain('.arw');
    expect(ALL_RAW_EXTENSIONS).toContain('.raf');
    expect(ALL_RAW_EXTENSIONS).toContain('.dng');
  });

  test('STANDARD_IMAGE_FORMATS should include common formats', () => {
    expect(STANDARD_IMAGE_FORMATS).toContain('.jpg');
    expect(STANDARD_IMAGE_FORMATS).toContain('.jpeg');
    expect(STANDARD_IMAGE_FORMATS).toContain('.png');
    expect(STANDARD_IMAGE_FORMATS).toContain('.tiff');
    expect(STANDARD_IMAGE_FORMATS).toContain('.webp');
    expect(STANDARD_IMAGE_FORMATS).toContain('.heic');
    expect(STANDARD_IMAGE_FORMATS).toContain('.avif');
  });

  test('ALL_SUPPORTED_FORMATS should combine RAW and standard', () => {
    expect(ALL_SUPPORTED_FORMATS.length).toBe(
      ALL_RAW_EXTENSIONS.length + STANDARD_IMAGE_FORMATS.length
    );
  });

  test('SUPPORTED_FORMAT_LABELS should have labels for key formats', () => {
    expect(SUPPORTED_FORMAT_LABELS['.cr2']).toBe('Canon RAW 2');
    expect(SUPPORTED_FORMAT_LABELS['.nef']).toBe('Nikon RAW');
    expect(SUPPORTED_FORMAT_LABELS['.arw']).toBe('Sony RAW');
    expect(SUPPORTED_FORMAT_LABELS['.dng']).toBe('Adobe DNG');
    expect(SUPPORTED_FORMAT_LABELS['.jpg']).toBe('JPEG');
    expect(SUPPORTED_FORMAT_LABELS['.png']).toBe('PNG');
  });

  test('No duplicate extensions in ALL_SUPPORTED_FORMATS', () => {
    const unique = new Set(ALL_SUPPORTED_FORMATS);
    expect(unique.size).toBe(ALL_SUPPORTED_FORMATS.length);
  });
});
