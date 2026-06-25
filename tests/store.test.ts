import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// We test the store in isolation by importing it directly
// Since the store uses fs, we need to test with real temp directories

describe('PhotoStore', () => {
  let store: any;
  let tempDir: string;

  beforeAll(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'photoforge-test-'));
    // Dynamic import
    const { PhotoStore } = require('../src/main/store');
    store = new PhotoStore(tempDir);
  });

  afterAll(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  test('should initialize with empty photos', () => {
    const photos = store.getAllPhotos();
    expect(Array.isArray(photos)).toBe(true);
    expect(photos.length).toBe(0);
  });

  test('should add a photo', () => {
    const photo = store.addPhoto({
      fileName: 'test.jpg',
      filePath: '/tmp/test.jpg',
      fileFormat: 'JPEG',
      fileSize: 1024,
      width: 1920,
      height: 1080,
      dateTaken: '2025-01-01T00:00:00.000Z',
      dateModified: '2025-01-01T00:00:00.000Z',
      cameraModel: 'Canon EOS R5',
      lensModel: null,
      iso: 100,
      aperture: 2.8,
      shutterSpeed: '1/200',
      focalLength: 50,
      thumbnailPath: null,
      rating: 0,
      colorLabel: 'none',
      tags: [],
      presetApplied: null,
      isFavorite: false,
    });

    expect(photo.id).toBeTruthy();
    expect(photo.fileName).toBe('test.jpg');
    expect(photo.fileFormat).toBe('JPEG');

    const all = store.getAllPhotos();
    expect(all.length).toBe(1);
  });

  test('should get a photo by id', () => {
    const all = store.getAllPhotos();
    const id = all[0].id;
    const photo = store.getPhoto(id);
    expect(photo).toBeTruthy();
    expect(photo.fileName).toBe('test.jpg');
  });

  test('should return null for non-existent photo', () => {
    const photo = store.getPhoto('non-existent');
    expect(photo).toBeNull();
  });

  test('should update a photo', () => {
    const all = store.getAllPhotos();
    const id = all[0].id;
    const result = store.updatePhoto(id, { rating: 5, isFavorite: true });
    expect(result).toBe(true);

    const updated = store.getPhoto(id);
    expect(updated.rating).toBe(5);
    expect(updated.isFavorite).toBe(true);
  });

  test('should delete a photo', () => {
    const all = store.getAllPhotos();
    const id = all[0].id;
    const result = store.deletePhoto(id);
    expect(result).toBe(true);
    expect(store.getAllPhotos().length).toBe(0);
  });

  test('should persist data to disk', () => {
    store.addPhoto({
      fileName: 'persist-test.nef',
      filePath: '/tmp/test.nef',
      fileFormat: 'Nikon RAW',
      fileSize: 2048000,
      width: 5568,
      height: 3712,
      dateTaken: null,
      dateModified: '2025-06-01T00:00:00.000Z',
      cameraModel: 'Nikon Z9',
      lensModel: null,
      iso: null,
      aperture: null,
      shutterSpeed: null,
      focalLength: null,
      thumbnailPath: null,
      rating: 3,
      colorLabel: 'blue',
      tags: ['landscape'],
      presetApplied: null,
      isFavorite: false,
    });

    const dataFile = path.join(tempDir, 'library.json');
    expect(fs.existsSync(dataFile)).toBe(true);
    const data = JSON.parse(fs.readFileSync(dataFile, 'utf-8'));
    expect(data.photos.length).toBe(1);
    expect(data.photos[0].fileFormat).toBe('Nikon RAW');
  });

  test('should get storage stats', () => {
    const stats = store.getStorageStats();
    expect(stats.totalPhotos).toBe(1);
    expect(typeof stats.librarySizeBytes).toBe('number');
  });
});
