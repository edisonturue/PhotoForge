import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('PresetManager', () => {
  let presetManager: any;
  let tempDir: string;

  beforeAll(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'photoforge-preset-test-'));
    const { PresetManager } = require('../src/main/presetManager');
    presetManager = new PresetManager(tempDir);
  });

  afterAll(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  test('should load built-in presets', () => {
    const presets = presetManager.getAll();
    expect(presets.length).toBeGreaterThan(0);
    
    const builtIn = presets.filter((p: any) => p.isBuiltIn);
    expect(builtIn.length).toBeGreaterThan(20);
  });

  test('should have presets in multiple categories', () => {
    const presets = presetManager.getAll();
    const categories = new Set(presets.map((p: any) => p.category));
    expect(categories.size).toBeGreaterThanOrEqual(8);
  });

  test('should get preset by id', () => {
    const all = presetManager.getAll();
    const first = all[0];
    const found = presetManager.getById(first.id);
    expect(found).toBeTruthy();
    expect(found.name).toBe(first.name);
  });

  test('should return null for non-existent preset', () => {
    const found = presetManager.getById('non-existent');
    expect(found).toBeNull();
  });

  test('should get presets by category', () => {
    const classicPresets = presetManager.getByCategory('classic');
    expect(classicPresets.length).toBeGreaterThan(0);
    expect(classicPresets.every((p: any) => p.category === 'classic')).toBe(true);
  });

  test('should create user preset', () => {
    const result = presetManager.create({
      id: 'user-test-1',
      name: 'My Custom Preset',
      category: 'classic',
      adjustments: {
        brightness: 20, contrast: 15, saturation: 10, hue: 0,
        temperature: 5, tint: 0, sharpness: 10, vignette: 0,
        grain: 0, clarity: 0, highlights: -10, shadows: 10,
        whites: 0, blacks: 0, exposure: 0, gamma: 1.0,
      },
      description: 'A test custom preset',
      isBuiltIn: false,
    });
    expect(result).toBe(true);

    const found = presetManager.getById('user-test-1');
    expect(found).toBeTruthy();
    expect(found.name).toBe('My Custom Preset');
  });

  test('should not create duplicate preset', () => {
    const result = presetManager.create({
      id: 'user-test-1',
      name: 'Duplicate',
      category: 'classic',
      adjustments: {} as any,
      description: '',
      isBuiltIn: false,
    });
    expect(result).toBe(false);
  });

  test('should not delete built-in preset', () => {
    const all = presetManager.getAll();
    const builtIn = all.find((p: any) => p.isBuiltIn);
    const result = presetManager.delete(builtIn.id);
    expect(result).toBe(false);
  });

  test('should delete user preset', () => {
    const result = presetManager.delete('user-test-1');
    expect(result).toBe(true);
    expect(presetManager.getById('user-test-1')).toBeNull();
  });

  test('should persist user presets to disk', () => {
    presetManager.create({
      id: 'user-persist-1',
      name: 'Persisted Preset',
      category: 'portrait',
      adjustments: {
        brightness: 10, contrast: 0, saturation: 0, hue: 0,
        temperature: 0, tint: 0, sharpness: 0, vignette: 10,
        grain: 0, clarity: 0, highlights: 0, shadows: 0,
        whites: 0, blacks: 0, exposure: 0, gamma: 1.0,
      },
      description: 'Testing persistence',
      isBuiltIn: false,
    });

    const userPresetsFile = path.join(tempDir, 'user_presets.json');
    expect(fs.existsSync(userPresetsFile)).toBe(true);
    const data = JSON.parse(fs.readFileSync(userPresetsFile, 'utf-8'));
    expect(data.presets.length).toBeGreaterThan(0);
    expect(data.presets[0].isBuiltIn).toBe(false);
  });

  test('should have valid adjustment ranges for all presets', () => {
    const presets = presetManager.getAll();
    for (const preset of presets) {
      const a = preset.adjustments;
      expect(a.brightness).toBeGreaterThanOrEqual(-100);
      expect(a.brightness).toBeLessThanOrEqual(100);
      expect(a.contrast).toBeGreaterThanOrEqual(-100);
      expect(a.contrast).toBeLessThanOrEqual(100);
      expect(a.saturation).toBeGreaterThanOrEqual(-100);
      expect(a.saturation).toBeLessThanOrEqual(100);
      expect(a.gamma).toBeGreaterThan(0);
      expect(a.gamma).toBeLessThanOrEqual(3);
    }
  });
});
