import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('PhotoStore — New Features', () => {
  let store: any;
  let tempDir: string;

  beforeAll(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'photoforge-newfeat-test-'));
    const { PhotoStore } = require('../src/main/store');
    store = new PhotoStore(tempDir);
  });

  afterAll(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  // ===== Recent Imports =====
  describe('Recent Imports', () => {
    let photoIds: string[] = [];

    beforeAll(() => {
      // Create real photos so their IDs exist in the store
      for (let i = 0; i < 15; i++) {
        const p = store.addPhoto({
          fileName: `import-test-${i}.jpg`,
          filePath: `/tmp/import-test-${i}.jpg`,
          fileFormat: 'JPEG',
          fileSize: 1024,
          width: 800,
          height: 600,
          dateTaken: null,
          dateModified: '2025-01-01T00:00:00.000Z',
          cameraModel: null,
          lensModel: null,
          iso: null,
          aperture: null,
          shutterSpeed: null,
          focalLength: null,
          thumbnailPath: null,
          rating: 0,
          colorLabel: 'none',
          tags: [],
          presetApplied: null,
          isFavorite: false,
        });
        photoIds.push(p.id);
      }
    });

    test('should record an import batch', () => {
      const batch = store.recordImportBatch(photoIds.slice(0, 2), 'copy');
      expect(batch.id).toBeTruthy();
      expect(batch.count).toBe(2);
      expect(batch.importMode).toBe('copy');
    });

    test('should retrieve recent imports (only batches with existing photos)', () => {
      const imports = store.getRecentImports();
      expect(imports.length).toBe(1);
      expect(imports[0].importMode).toBe('copy');
    });

    test('should keep at most 10 recent imports', () => {
      for (let i = 0; i < 12; i++) {
        store.recordImportBatch([photoIds[i]], 'reference');
      }
      const imports = store.getRecentImports();
      expect(imports.length).toBeLessThanOrEqual(10);
    });

    test('should persist recent imports to disk', () => {
      const dataFile = path.join(tempDir, 'recent-imports.json');
      expect(fs.existsSync(dataFile)).toBe(true);
      const data = JSON.parse(fs.readFileSync(dataFile, 'utf-8'));
      expect(data.batches.length).toBeGreaterThan(0);
    });
  });

  // ===== Collection Update =====
  describe('Collection Update', () => {
    let collectionId: string;

    beforeAll(() => {
      const col = store.createCollection('Test Album', 'A test album');
      collectionId = col.id;
    });

    test('should update collection name', () => {
      const result = store.updateCollection(collectionId, { name: 'Renamed Album' });
      expect(result).toBe(true);
      const col = store.getAllCollections().find((c: any) => c.id === collectionId);
      expect(col.name).toBe('Renamed Album');
    });

    test('should update collection description', () => {
      const result = store.updateCollection(collectionId, { description: 'Updated desc' });
      expect(result).toBe(true);
      const col = store.getAllCollections().find((c: any) => c.id === collectionId);
      expect(col.description).toBe('Updated desc');
    });

    test('should return false for non-existent collection', () => {
      const result = store.updateCollection('non-existent', { name: 'X' });
      expect(result).toBe(false);
    });
  });

  // ===== Photo Migration (new fields) =====
  describe('Photo Migration', () => {
    test('new photo should have title, description, latitude, longitude defaults', () => {
      const photo = store.addPhoto({
        fileName: 'migration-test.jpg',
        filePath: '/tmp/migration-test.jpg',
        fileFormat: 'JPEG',
        fileSize: 1024,
        width: 1920,
        height: 1080,
        dateTaken: null,
        dateModified: '2025-01-01T00:00:00.000Z',
        cameraModel: null,
        lensModel: null,
        iso: null,
        aperture: null,
        shutterSpeed: null,
        focalLength: null,
        thumbnailPath: null,
        rating: 0,
        colorLabel: 'none',
        tags: [],
        presetApplied: null,
        isFavorite: false,
        title: '',
        description: '',
        latitude: null,
        longitude: null,
      });

      expect(photo.title).toBe('');
      expect(photo.description).toBe('');
      expect(photo.latitude).toBeNull();
      expect(photo.longitude).toBeNull();
    });

    test('addPhoto should fill defaults when title/description omitted', () => {
      const photo = store.addPhoto({
        fileName: 'defaults-test.jpg',
        filePath: '/tmp/defaults-test.jpg',
        fileFormat: 'JPEG',
        fileSize: 512,
        width: 800,
        height: 600,
        dateTaken: null,
        dateModified: '2025-06-01T00:00:00.000Z',
        cameraModel: null,
        lensModel: null,
        iso: null,
        aperture: null,
        shutterSpeed: null,
        focalLength: null,
        thumbnailPath: null,
        rating: 0,
        colorLabel: 'none',
        tags: [],
        presetApplied: null,
        isFavorite: false,
      } as any);

      expect(photo.title).toBe('');
      expect(photo.description).toBe('');
      expect(photo.latitude).toBeNull();
      expect(photo.longitude).toBeNull();
    });
  });

  // ===== Missing References =====
  describe('Missing References', () => {
    test('should detect missing referenced files', () => {
      const photo = store.addPhoto({
        fileName: 'missing-ref.jpg',
        filePath: '/nonexistent/path/missing-ref.jpg',
        fileFormat: 'JPEG',
        fileSize: 512,
        width: 800,
        height: 600,
        dateTaken: null,
        dateModified: '2025-06-01T00:00:00.000Z',
        cameraModel: null,
        lensModel: null,
        iso: null,
        aperture: null,
        shutterSpeed: null,
        focalLength: null,
        thumbnailPath: null,
        rating: 0,
        colorLabel: 'none',
        tags: [],
        presetApplied: null,
        isFavorite: false,
        isReferenced: true,
      });

      const missing = store.getMissingReferences();
      expect(missing.length).toBeGreaterThan(0);
      const found = missing.find((m: any) => m.id === photo.id);
      expect(found).toBeTruthy();
      expect(found.fileName).toBe('missing-ref.jpg');
    });
  });
});
