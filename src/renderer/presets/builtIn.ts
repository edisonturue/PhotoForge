import { Preset, PresetAdjustment, PresetCategory, ColorCurves } from '../../shared/types';

const base: PresetAdjustment = {
  brightness: 0, contrast: 0, saturation: 0, hue: 0,
  temperature: 0, tint: 0, sharpness: 0, vignette: 0,
  grain: 0, clarity: 0, highlights: 0, shadows: 0,
  whites: 0, blacks: 0, exposure: 0, gamma: 1.0,
};

function makePreset(
  name: string, category: Preset['category'], description: string,
  overrides: Partial<PresetAdjustment>,
  extra?: { cameraManufacturer?: string; colorCurves?: ColorCurves }
): Preset {
  const adjustments = { ...base, ...overrides };
  if (extra?.colorCurves) adjustments.colorCurves = extra.colorCurves;
  return {
    id: `builtin-${category}-${name.toLowerCase().replace(/\s+/g, '-')}`,
    name,
    category,
    description,
    adjustments,
    isBuiltIn: true,
    cameraManufacturer: extra?.cameraManufacturer,
  };
}

export const builtInPresets: Preset[] = [
  // ===== Classic =====
  makePreset('Natural', 'classic', '自然原色，微调对比度', { contrast: 10, clarity: 5, sharpness: 15 }),
  makePreset('Vivid', 'classic', '鲜艳色彩，高饱和度', { saturation: 40, contrast: 20, brightness: 5, clarity: 10 }),
  makePreset('Soft', 'classic', '柔和平淡色调', { contrast: -15, saturation: -20, brightness: 10, gamma: 1.15 }),
  makePreset('Clean', 'classic', '干净通透', { brightness: 8, contrast: 12, highlights: -10, shadows: 15, clarity: 20, saturation: -5 }),

  // ===== Portrait =====
  makePreset('Skin Glow', 'portrait', '肤色温暖柔光', { temperature: 15, saturation: -10, contrast: -5, brightness: 10, gamma: 1.1, vignette: 10 }),
  makePreset('High Key', 'portrait', '高调人像', { brightness: 25, contrast: -10, shadows: 30, whites: 20, saturation: -15 }),
  makePreset('Dramatic Portrait', 'portrait', '戏剧性人像', { contrast: 40, shadows: -30, blacks: -20, clarity: 25, vignette: 25 }),
  makePreset('Dreamy', 'portrait', '梦幻柔焦', { brightness: 15, contrast: -20, saturation: -15, gamma: 1.2, vignette: 15 }),

  // ===== Landscape =====
  makePreset('Golden Hour', 'landscape', '黄金时刻暖色', { temperature: 35, saturation: 20, contrast: 15, highlights: -15, shadows: 20, clarity: 15 }),
  makePreset('Blue Hour', 'landscape', '蓝色时刻冷调', { temperature: -30, tint: -15, saturation: 10, contrast: 15, shadows: -10 }),
  makePreset('Emerald Forest', 'landscape', '翡翠森林绿', { saturation: 25, hue: -8, contrast: 15, clarity: 20, shadows: 15, temperature: -5 }),
  makePreset('Moody Landscape', 'landscape', '阴郁风景', { contrast: 25, saturation: -20, shadows: -25, blacks: -15, clarity: 15, vignette: 20 }),

  // ===== Cinematic =====
  makePreset('Teal & Orange', 'cinematic', '电影青橙色调', { temperature: 10, tint: -20, saturation: 15, contrast: 25, shadows: -15, highlights: -10, clarity: 10 }),
  makePreset('Film Noir', 'cinematic', '黑色电影风格', { contrast: 50, saturation: -60, shadows: -40, blacks: -30, vignette: 35 }),
  makePreset('Wes Anderson', 'cinematic', '韦斯安德森风格', { saturation: 20, contrast: 15, temperature: 5, hue: 5, brightness: 5 }),
  makePreset('70s Film', 'cinematic', '70年代胶片', { saturation: 15, contrast: 20, grain: 30, temperature: 20, blacks: 10, gamma: 0.95 }),

  // ===== Film Emulation (NEW) =====
  // --- Kodak ---
  makePreset('Kodachrome 64', 'film', '柯达克罗姆64 — 经典高饱和暖色调', { saturation: 35, contrast: 25, temperature: 15, highlights: -15, shadows: 20, grain: 12, vignette: 5 }, { cameraManufacturer: 'Kodak' }),
  makePreset('Kodachrome 25', 'film', '柯达克罗姆25 — 精细腻腻高饱和', { saturation: 40, contrast: 22, temperature: 12, highlights: -10, shadows: 18, grain: 8, sharpness: 10 }, { cameraManufacturer: 'Kodak' }),
  makePreset('Kodak Portra 400', 'film', '柯达Portra 400 — 人像胶片，柔和肤色', { saturation: -10, contrast: -8, temperature: 10, shadows: 15, brightness: 5, grain: 18, gamma: 1.05 }, { cameraManufacturer: 'Kodak', colorCurves: {
    rgb: [[0, 8], [32, 38], [64, 66], [128, 130], [192, 190], [255, 248]],
    red: [[0, 12], [64, 72], [128, 135], [192, 194], [255, 250]],
    green: [[0, 6], [64, 62], [128, 128], [192, 190], [255, 246]],
    blue: [[0, 4], [64, 58], [128, 122], [192, 184], [255, 240]],
  } }),
  makePreset('Kodak Portra 800', 'film', '柯达Portra 800 — 高速人像胶片', { saturation: -15, contrast: -10, temperature: 12, shadows: 20, brightness: 8, grain: 28, gamma: 1.08 }, { cameraManufacturer: 'Kodak' }),
  makePreset('Kodak Ektar 100', 'film', '柯达Ektar 100 — 超鲜艳日光胶片', { saturation: 45, contrast: 20, temperature: 5, highlights: -12, shadows: 15, grain: 6, clarity: 10 }, { cameraManufacturer: 'Kodak' }),
  makePreset('Kodak Tri-X 400', 'film', '柯达Tri-X 400 — 经典黑白新闻胶片', { saturation: -100, contrast: 35, shadows: -20, highlights: 10, grain: 35, clarity: 15, vignette: 10 }, { cameraManufacturer: 'Kodak' }),
  makePreset('Kodak T-Max 100', 'film', '柯达T-Max 100 — 细腻黑白胶片', { saturation: -100, contrast: 25, grain: 12, clarity: 20, sharpness: 10 }, { cameraManufacturer: 'Kodak' }),
  makePreset('Kodak Gold 200', 'film', '柯达Gold 200 — 暖黄金色日常胶片', { saturation: 20, contrast: 10, temperature: 22, shadows: 10, grain: 22, brightness: 5, gamma: 0.98 }, { cameraManufacturer: 'Kodak', colorCurves: {
    rgb: [[0, 5], [32, 35], [64, 68], [128, 135], [192, 198], [255, 250]],
    red: [[0, 10], [64, 75], [128, 142], [192, 200], [255, 252]],
    green: [[0, 4], [64, 65], [128, 132], [192, 195], [255, 248]],
    blue: [[0, 2], [64, 55], [128, 118], [192, 180], [255, 235]],
  } }),

  // --- Fujifilm ---
  makePreset('Fuji Pro 400H', 'film', '富士Pro 400H — 柔和自然色人像', { saturation: -12, contrast: -10, temperature: -5, shadows: 18, brightness: 8, grain: 15, gamma: 1.06 }, { cameraManufacturer: 'Fujifilm' }),
  makePreset('Fuji Superia 400', 'film', '富士Superia 400 — 日常胶片微绿偏色', { saturation: 10, contrast: 5, temperature: -8, tint: 8, grain: 20, shadows: 12, gamma: 0.97 }, { cameraManufacturer: 'Fujifilm' }),
  makePreset('Fuji Velvia 50', 'film', '富士Velvia 50 — 超鲜艳风光胶片', { saturation: 50, contrast: 25, temperature: -5, highlights: -20, shadows: 15, grain: 6, clarity: 15 }, { cameraManufacturer: 'Fujifilm' }),
  makePreset('Fuji Provia 100F', 'film', '富士Provia 100F — 自然反转片', { saturation: 10, contrast: 12, temperature: -3, grain: 6, sharpness: 10, clarity: 8 }, { cameraManufacturer: 'Fujifilm' }),
  makePreset('Fuji Acros 100', 'film', '富士Acros 100 — 超细腻黑白胶片', { saturation: -100, contrast: 20, grain: 8, sharpness: 15, clarity: 18 }, { cameraManufacturer: 'Fujifilm' }),
  makePreset('Fuji C200', 'film', '富士C200 — 经济日常负片', { saturation: 8, contrast: 5, temperature: -3, grain: 25, shadows: 8, gamma: 0.96 }, { cameraManufacturer: 'Fujifilm' }),

  // --- Ilford ---
  makePreset('Ilford HP5 Plus', 'film', '伊尔福HP5 Plus — 经典黑白高速胶片', { saturation: -100, contrast: 30, grain: 30, shadows: -15, clarity: 10, vignette: 8 }, { cameraManufacturer: 'Ilford' }),
  makePreset('Ilford Delta 3200', 'film', '伊尔福Delta 3200 — 超高速黑白', { saturation: -100, contrast: 35, grain: 45, shadows: -20, clarity: 5, vignette: 12 }, { cameraManufacturer: 'Ilford' }),
  makePreset('Ilford FP4 Plus', 'film', '伊尔福FP4 Plus — 细腻中速黑白', { saturation: -100, contrast: 18, grain: 10, sharpness: 15, clarity: 20 }, { cameraManufacturer: 'Ilford' }),
  makePreset('Ilford Pan F', 'film', '伊尔福Pan F — 极慢极细腻黑白', { saturation: -100, contrast: 22, grain: 4, sharpness: 20, clarity: 25 }, { cameraManufacturer: 'Ilford' }),

  // --- CineStill ---
  makePreset('CineStill 800T', 'film', 'CineStill 800T — 电影钨丝灯胶片', { saturation: 15, contrast: 15, temperature: -25, tint: 15, grain: 25, highlights: -10, shadows: 10, vignette: 8 }, { cameraManufacturer: 'CineStill', colorCurves: {
    rgb: [[0, 8], [32, 30], [64, 58], [128, 125], [192, 195], [255, 248]],
    red: [[0, 5], [64, 52], [128, 120], [192, 192], [255, 245]],
    green: [[0, 6], [64, 55], [128, 122], [192, 190], [255, 244]],
    blue: [[0, 15], [64, 72], [128, 135], [192, 195], [255, 250]],
  } }),

  // --- Agfa ---
  makePreset('Agfa Vista 200', 'film', '爱克发Vista 200 — 暖调日常负片', { saturation: 18, contrast: 8, temperature: 15, grain: 20, shadows: 8, gamma: 0.97 }, { cameraManufacturer: 'Agfa' }),
  makePreset('Agfa APX 400', 'film', '爱克发APX 400 — 经典黑白高速胶片', { saturation: -100, contrast: 35, grain: 32, shadows: -18, vignette: 10 }, { cameraManufacturer: 'Agfa' }),

  // --- Polaroid ---
  makePreset('Polaroid SX-70', 'film', '宝丽来SX-70 — 即影即有色调', { saturation: 15, contrast: -15, brightness: 15, blacks: 25, grain: 20, temperature: 10, vignette: 20, gamma: 1.12 }, { cameraManufacturer: 'Polaroid' }),
  makePreset('Polaroid 600', 'film', '宝丽来600 — 更浓烈的即影即有', { saturation: 25, contrast: -10, brightness: 12, blacks: 20, grain: 25, temperature: 15, vignette: 22, gamma: 1.08 }, { cameraManufacturer: 'Polaroid', colorCurves: {
    rgb: [[0, 25], [32, 50], [64, 75], [128, 135], [192, 190], [255, 242]],
    red: [[0, 22], [64, 78], [128, 140], [192, 195], [255, 248]],
    green: [[0, 18], [64, 70], [128, 132], [192, 188], [255, 242]],
    blue: [[0, 15], [64, 62], [128, 120], [192, 178], [255, 232]],
  } }),

  // --- Fujifilm Digital Film Simulations (X-Trans / GFX) ---
  makePreset('Classic Chrome', 'film', '富士Classic Chrome — 纪实风格，柔和暖调，抑制高饱和', { saturation: -18, contrast: 12, temperature: 8, tint: -5, highlights: -12, shadows: 15, blacks: 8, grain: 10, vignette: 10, gamma: 0.97 }, { cameraManufacturer: 'Fujifilm', colorCurves: {
    rgb: [[0, 12], [32, 38], [64, 68], [128, 126], [192, 186], [255, 245]],
    red: [[0, 8], [64, 58], [128, 120], [192, 184], [255, 242]],
    green: [[0, 5], [64, 62], [128, 130], [192, 190], [255, 248]],
    blue: [[0, 18], [64, 72], [128, 124], [192, 180], [255, 235]],
  } }),
  makePreset('Classic Negative', 'film', '富士Classic Negative — 交叉冲印感，暖高光冷阴影', { saturation: -10, contrast: 18, temperature: 5, tint: -12, highlights: -8, shadows: 12, blacks: 10, grain: 12, clarity: 5, gamma: 0.95 }, { cameraManufacturer: 'Fujifilm', colorCurves: {
    rgb: [[0, 15], [32, 40], [64, 65], [128, 130], [192, 185], [255, 240]],
    red: [[0, 10], [64, 70], [128, 135], [192, 195], [255, 250]],
    green: [[0, 8], [64, 55], [128, 122], [192, 188], [255, 245]],
    blue: [[0, 25], [64, 68], [128, 118], [192, 178], [255, 230]],
  } }),
  makePreset('Nostalgic Neg', 'film', '富士Nostalgic Neg — 怀旧暖色调，柔和复古', { saturation: -22, contrast: -8, temperature: 18, brightness: 8, shadows: 18, grain: 15, vignette: 15, gamma: 1.08 }, { cameraManufacturer: 'Fujifilm', colorCurves: {
    rgb: [[0, 22], [32, 48], [64, 72], [128, 132], [192, 188], [255, 242]],
    red: [[0, 18], [64, 78], [128, 140], [192, 195], [255, 248]],
    green: [[0, 12], [64, 66], [128, 128], [192, 186], [255, 240]],
    blue: [[0, 8], [64, 55], [128, 118], [192, 175], [255, 228]],
  } }),
  makePreset('Eterna', 'film', '富士Eterna — 电影胶片，低饱和平坦色调', { saturation: -28, contrast: -18, brightness: 5, shadows: 15, highlights: -10, grain: 8, gamma: 1.05 }, { cameraManufacturer: 'Fujifilm', colorCurves: {
    rgb: [[0, 18], [32, 46], [64, 70], [128, 130], [192, 188], [255, 238]],
    red: [[0, 15], [64, 68], [128, 128], [192, 186], [255, 238]],
    green: [[0, 14], [64, 66], [128, 130], [192, 190], [255, 240]],
    blue: [[0, 12], [64, 62], [128, 124], [192, 180], [255, 232]],
  } }),
  makePreset('Eterna Bleach Bypass', 'film', '富士Eterna Bleach Bypass — 高对比去饱和电影风', { saturation: -38, contrast: 35, brightness: -5, shadows: -18, highlights: -12, grain: 10, clarity: 12, gamma: 0.92 }, { cameraManufacturer: 'Fujifilm', colorCurves: {
    rgb: [[0, 5], [32, 22], [64, 50], [128, 125], [192, 195], [255, 248]],
    red: [[0, 8], [64, 48], [128, 122], [192, 192], [255, 245]],
    green: [[0, 4], [64, 45], [128, 120], [192, 190], [255, 246]],
    blue: [[0, 6], [64, 52], [128, 118], [192, 185], [255, 240]],
  } }),
  makePreset('Astia', 'film', '富士Astia/Soft — 柔和肤色，低对比自然色', { saturation: -8, contrast: -10, temperature: 3, brightness: 8, shadows: 18, gamma: 1.08, grain: 5 }, { cameraManufacturer: 'Fujifilm', colorCurves: {
    rgb: [[0, 10], [32, 40], [64, 68], [128, 132], [192, 190], [255, 245]],
    red: [[0, 12], [64, 70], [128, 135], [192, 192], [255, 248]],
    green: [[0, 8], [64, 64], [128, 130], [192, 190], [255, 246]],
    blue: [[0, 6], [64, 60], [128, 125], [192, 185], [255, 240]],
  } }),

  // --- Instant Film (Polaroid Modern + Fujifilm Instax) ---
  makePreset('Polaroid i-Type', 'film', '宝丽来i-Type — 现代即影即有，微冷调', { saturation: 12, contrast: -8, brightness: 10, temperature: 5, blacks: 18, grain: 18, vignette: 18, gamma: 1.1 }, { cameraManufacturer: 'Polaroid' }),
  makePreset('Polaroid Now', 'film', '宝丽来Now — 新一代即影即有，暖调柔和', { saturation: 18, contrast: -5, brightness: 8, temperature: 12, blacks: 15, grain: 20, vignette: 20, gamma: 1.06 }, { cameraManufacturer: 'Polaroid' }),
  makePreset('Instax Mini', 'film', '富士Instax Mini — 小尺寸拍立得，微暖柔焦', { saturation: 20, contrast: 5, brightness: 8, temperature: 12, grain: 22, vignette: 15, gamma: 1.05 }, { cameraManufacturer: 'Fujifilm', colorCurves: {
    rgb: [[0, 12], [32, 42], [64, 70], [128, 135], [192, 195], [255, 248]],
    red: [[0, 15], [64, 72], [128, 138], [192, 196], [255, 250]],
    green: [[0, 10], [64, 68], [128, 134], [192, 192], [255, 248]],
    blue: [[0, 8], [64, 60], [128, 125], [192, 185], [255, 238]],
  } }),
  makePreset('Instax Wide', 'film', '富士Instax Wide — 宽幅拍立得，鲜艳即影即有', { saturation: 25, contrast: 8, brightness: 5, temperature: 10, grain: 20, vignette: 12, gamma: 1.03 }, { cameraManufacturer: 'Fujifilm' }),
  makePreset('Polaroid Spectra', 'film', '宝丽来Spectra — 宽幅即影即有，浓郁色彩', { saturation: 22, contrast: -5, brightness: 12, temperature: 8, blacks: 22, grain: 20, vignette: 25, gamma: 1.08 }, { cameraManufacturer: 'Polaroid' }),

  // ===== Vintage =====
  makePreset('Faded Film', 'vintage', '褪色老胶片', { saturation: -30, contrast: -10, brightness: 10, blacks: 20, grain: 25, gamma: 1.1 }),
  makePreset('Sepia Tone', 'vintage', '棕褐色调', { saturation: -60, hue: 30, temperature: 25, contrast: -10, grain: 15 }),
  makePreset('Polaroid', 'vintage', '宝丽来风格', { saturation: 15, contrast: -15, brightness: 15, blacks: 25, grain: 20, temperature: 10, vignette: 20 }),
  makePreset('Kodachrome', 'vintage', '柯达克罗姆', { saturation: 30, contrast: 25, temperature: 10, highlights: -15, shadows: 20, grain: 10 }),

  // ===== B&W =====
  makePreset('Classic B&W', 'bw', '经典黑白', { saturation: -100, contrast: 20, clarity: 15 }),
  makePreset('High Contrast B&W', 'bw', '高对比黑白', { saturation: -100, contrast: 50, shadows: -30, highlights: 10, clarity: 25 }),
  makePreset('Soft B&W', 'bw', '柔和平淡黑白', { saturation: -100, contrast: -15, brightness: 10, gamma: 1.1 }),
  makePreset('Infrared', 'bw', '红外线效果', { saturation: -100, brightness: 20, contrast: 30, whites: 30, grain: 10 }),

  // ===== Artistic =====
  makePreset('Cross Process', 'artistic', '交叉冲印效果', { saturation: 30, contrast: 25, hue: 15, temperature: -15, tint: 20, blacks: 15 }),
  makePreset('Double Tone', 'artistic', '双色调效果', { saturation: -50, hue: 25, contrast: 20, tint: 15 }),
  makePreset('Pastel', 'artistic', '粉彩柔和', { saturation: -25, brightness: 20, contrast: -15, gamma: 1.15 }),
  makePreset('Cyberpunk', 'artistic', '赛博朋克', { saturation: 30, contrast: 40, temperature: -25, tint: 30, highlights: -20, shadows: -15, vignette: 15 }),

  // ===== Mood =====
  makePreset('Melancholy', 'mood', '忧郁冷调', { temperature: -20, saturation: -25, contrast: 10, shadows: -15, brightness: -5 }),
  makePreset('Warm Glow', 'mood', '温暖光感', { temperature: 25, saturation: 10, brightness: 10, contrast: -5, vignette: 15 }),
  makePreset('Ethereal', 'mood', '空灵飘逸', { brightness: 20, contrast: -25, saturation: -15, gamma: 1.2, vignette: 10 }),
  makePreset('Midnight', 'mood', '午夜深蓝', { temperature: -35, saturation: 10, contrast: 30, shadows: -30, blacks: -20, vignette: 30 }),

  // ===== Color Grading =====
  makePreset('Orange & Teal', 'color-grading', '青橙配色', { temperature: 15, tint: -25, saturation: 20, contrast: 20, shadows: -10, clarity: 10 }),
  makePreset('Sunset Fade', 'color-grading', '日落渐变', { temperature: 30, saturation: 15, hue: -10, contrast: 10, shadows: 20, highlights: -20 }),
  makePreset('Nordic Light', 'color-grading', '北欧冷光', { temperature: -25, saturation: -10, brightness: 15, contrast: -5, highlights: -10 }),
  makePreset('Tropical', 'color-grading', '热带风情', { saturation: 35, temperature: 10, contrast: 15, clarity: 10, hue: 5 }),
];
