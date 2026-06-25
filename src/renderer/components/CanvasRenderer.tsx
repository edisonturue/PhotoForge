import React, { useMemo } from 'react';
import { PresetAdjustment, ColorCurves, ColorCurvePoint } from '../../shared/types';

interface CanvasRendererProps {
  src: string;
  adjustments: PresetAdjustment;
  style?: React.CSSProperties;
  className?: string;
  alt?: string;
  draggable?: boolean;
}

const DEFAULT_ADJ: PresetAdjustment = {
  brightness: 0, contrast: 0, saturation: 0, hue: 0, temperature: 0,
  tint: 0, sharpness: 0, vignette: 0, grain: 0, clarity: 0,
  highlights: 0, shadows: 0, whites: 0, blacks: 0, exposure: 0, gamma: 1.0,
};

function isDefaultAdj(a: PresetAdjustment): boolean {
  return a.brightness === 0 && a.contrast === 0 && a.saturation === 0 &&
    a.hue === 0 && a.temperature === 0 && a.tint === 0 &&
    a.sharpness === 0 && a.vignette === 0 && a.grain === 0 &&
    a.clarity === 0 && a.highlights === 0 && a.shadows === 0 &&
    a.whites === 0 && a.blacks === 0 && a.exposure === 0 && a.gamma === 1.0 &&
    !a.colorCurves;
}


/**
 * Monotone cubic Hermite interpolation.
 * Given control points [input, output] in 0-255 range,
 * produces a smooth 256-entry lookup table that passes through every point
 * without overshooting (monotone = no oscillation between control points).
 *
 * This is the standard method used by Lightroom / Capture One for tone curves.
 */
function buildCurveLUT(points: ColorCurvePoint[]): Uint8Array {
  if (!points || points.length < 2) return IDENTITY_LUT;
  // Sort by input
  const sorted = [...points].sort((a, b) => a[0] - b[0]);
  // Ensure boundary points
  if (sorted[0][0] > 0) sorted.unshift([0, 0]);
  if (sorted[sorted.length - 1][0] < 255) sorted.push([255, 255]);

  const lut = new Uint8Array(256);
  const n = sorted.length;

  // Compute slopes (tangents) at each control point using Fritsch-Carlson method
  const deltas: number[] = [];
  const slopes: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    deltas[i] = (sorted[i + 1][1] - sorted[i][1]) / (sorted[i + 1][0] - sorted[i][0] || 1);
  }
  slopes[0] = deltas[0];
  slopes[n - 1] = deltas[n - 2];
  for (let i = 1; i < n - 1; i++) {
    if (deltas[i - 1] * deltas[i] <= 0) {
      slopes[i] = 0;
    } else {
      slopes[i] = (deltas[i - 1] + deltas[i]) / 2;
    }
  }
  // Fritsch-Carlson monotonicity constraint
  for (let i = 0; i < n - 1; i++) {
    if (Math.abs(deltas[i]) < 1e-10) {
      slopes[i] = 0;
      slopes[i + 1] = 0;
    } else {
      const alpha = slopes[i] / deltas[i];
      const beta = slopes[i + 1] / deltas[i];
      const tau = alpha * alpha + beta * beta;
      if (tau > 9) {
        const scale = 3 / Math.sqrt(tau);
        slopes[i] = alpha * scale * deltas[i];
        slopes[i + 1] = beta * scale * deltas[i];
      }
    }
  }

  // Interpolate between each pair of control points
  let seg = 0;
  for (let x = 0; x <= 255; x++) {
    // Advance to the correct segment
    while (seg < n - 2 && sorted[seg + 1][0] < x) seg++;
    const x0 = sorted[seg][0], y0 = sorted[seg][1];
    const x1 = sorted[seg + 1][0], y1 = sorted[seg + 1][1];
    if (x <= x0) {
      lut[x] = Math.max(0, Math.min(255, Math.round(y0)));
    } else if (x >= x1) {
      lut[x] = Math.max(0, Math.min(255, Math.round(y1)));
    } else {
      // Hermite basis functions
      const t = (x - x0) / (x1 - x0);
      const t2 = t * t;
      const t3 = t2 * t;
      const h00 = 2 * t3 - 3 * t2 + 1;
      const h10 = t3 - 2 * t2 + t;
      const h01 = -2 * t3 + 3 * t2;
      const h11 = t3 - t2;
      const m0 = slopes[seg] * (x1 - x0);
      const m1 = slopes[seg + 1] * (x1 - x0);
      const y = h00 * y0 + h10 * m0 + h01 * y1 + h11 * m1;
      lut[x] = Math.max(0, Math.min(255, Math.round(y)));
    }
  }
  return lut;
}

const IDENTITY_LUT = new Uint8Array(256);
for (let i = 0; i < 256; i++) IDENTITY_LUT[i] = i;

function lutToTableValues(lut: Uint8Array): string {
  // SVG feComponentTransfer type="table" expects space-separated values in 0-1 range
  const parts: string[] = new Array(256);
  for (let i = 0; i < 256; i++) {
    parts[i] = (lut[i] / 255).toFixed(4);
  }
  return parts.join(' ');
}

/** Merge a per-channel LUT on top of the master (rgb) LUT */
function mergeLUTs(master: Uint8Array, channel: Uint8Array): Uint8Array {
  const merged = new Uint8Array(256);
  for (let i = 0; i < 256; i++) {
    merged[i] = channel[master[i]];
  }
  return merged;
}

function isIdentityLUT(lut: Uint8Array): boolean {
  for (let i = 0; i < 256; i++) {
    if (lut[i] !== i) return false;
  }
  return true;
}

/**
 * Build CSS filter string + SVG filter for advanced adjustments.
 * CSS handles: brightness, contrast, saturate, hue-rotate, sepia, grayscale, invert
 * SVG feColorMatrix handles: temperature, tint, highlights, shadows, whites, blacks, gamma
 * CSS backdrop/overlay handles: vignette, grain, clarity/sharpness (via contrast)
 */
function buildFilterStyle(a: PresetAdjustment): { filter: string; svgFilterId: string | null } {
  const parts: string[] = [];

  // Exposure + Brightness (combined into brightness)
  const totalBrightness = 1 + (a.exposure / 5) + (a.brightness / 200);
  if (totalBrightness !== 1) parts.push(`brightness(${totalBrightness})`);

  // Contrast
  if (a.contrast !== 0) parts.push(`contrast(${1 + a.contrast / 200})`);

  // Saturation
  if (a.saturation !== 0) parts.push(`saturate(${1 + a.saturation / 100})`);

  // Hue rotation
  if (a.hue !== 0) parts.push(`hue-rotate(${a.hue}deg)`);

  // Temperature: sepia for warm, hue-rotate+saturate for cool
  if (a.temperature > 0) parts.push(`sepia(${Math.min(a.temperature * 0.4, 80)}%)`);
  if (a.temperature < 0) {
    parts.push(`hue-rotate(${a.temperature * 0.3}deg)`);
    parts.push(`saturate(${1 + Math.abs(a.temperature) * 0.005})`);
  }

  // Clarity (approximate with local contrast = contrast + unsharp mask feel)
  if (a.clarity > 0) parts.push(`contrast(${1 + a.clarity / 300})`);

  // Gamma: approximate with brightness curve
  if (a.gamma !== 1.0) {
    const gammaAdj = a.gamma < 1 ? 1 + (1 - a.gamma) * 0.3 : 1 - (a.gamma - 1) * 0.15;
    parts.push(`brightness(${gammaAdj})`);
  }

  // Grayscale for extreme negative saturation
  if (a.saturation <= -90) parts.push('grayscale(100%)');

  const filterStr = parts.length > 0 ? parts.join(' ') : 'none';

  // SVG filter for temperature tint overlay
  const needsSvg = a.tint !== 0 || a.highlights !== 0 || a.shadows !== 0 || a.whites !== 0 || a.blacks !== 0 || !!a.colorCurves;
  const svgId = needsSvg ? 'pf-adj-svg' : null;

  return { filter: filterStr, svgFilterId: svgId };
}

/** Build an SVG filter for tint/highlights/shadows adjustments and color curves */
function buildSvgFilter(a: PresetAdjustment): string | null {
  const hasTonal = a.tint !== 0 || a.highlights !== 0 || a.shadows !== 0 || a.whites !== 0 || a.blacks !== 0;
  const hasCurves = !!a.colorCurves;
  if (!hasTonal && !hasCurves) return null;

  // If color curves are present, use type="table" for precise per-channel curves
  if (hasCurves) {
    const cc = a.colorCurves!;
    const masterLUT = cc.rgb ? buildCurveLUT(cc.rgb) : IDENTITY_LUT;
    const rLUT = cc.red ? mergeLUTs(masterLUT, buildCurveLUT(cc.red)) : masterLUT;
    const gLUT = cc.green ? mergeLUTs(masterLUT, buildCurveLUT(cc.green)) : masterLUT;
    const bLUT = cc.blue ? mergeLUTs(masterLUT, buildCurveLUT(cc.blue)) : masterLUT;

    // Apply tonal adjustments on top (as linear transform after curves)
    let rSlope = 1, gSlope = 1, bSlope = 1;
    let rIntercept = 0, gIntercept = 0, bIntercept = 0;
    if (hasTonal) {
      const tintR = a.tint > 0 ? a.tint * 0.002 : 0;
      const tintG = a.tint < 0 ? Math.abs(a.tint) * 0.002 : 0;
      const shadowBoost = a.shadows / 100 * 0.3;
      const blackBoost = a.blacks / 100 * 0.2;
      const highlightBoost = a.highlights / 100 * 0.2;
      const whiteBoost = a.whites / 100 * 0.15;
      rSlope = 1 + highlightBoost + whiteBoost;
      gSlope = rSlope;
      bSlope = rSlope;
      rIntercept = tintR + shadowBoost + blackBoost;
      gIntercept = tintG + shadowBoost + blackBoost;
      bIntercept = -tintR * 0.5 + shadowBoost + blackBoost;
    }

    const rTable = lutToTableValues(rLUT);
    const gTable = lutToTableValues(gLUT);
    const bTable = lutToTableValues(bLUT);

    // Use chained feComponentTransfer: first table (curves), then linear (tonal)
    return `<svg xmlns="http://www.w3.org/2000/svg" style="position:absolute;width:0;height:0">
  <filter id="pf-adj-svg" color-interpolation-filters="sRGB">
    <feComponentTransfer>
      <feFuncR type="table" tableValues="${rTable}"/>
      <feFuncG type="table" tableValues="${gTable}"/>
      <feFuncB type="table" tableValues="${bTable}"/>
    </feComponentTransfer>${hasTonal ? `
    <feComponentTransfer>
      <feFuncR type="linear" slope="${rSlope.toFixed(3)}" intercept="${rIntercept.toFixed(3)}"/>
      <feFuncG type="linear" slope="${gSlope.toFixed(3)}" intercept="${gIntercept.toFixed(3)}"/>
      <feFuncB type="linear" slope="${bSlope.toFixed(3)}" intercept="${bIntercept.toFixed(3)}"/>
    </feComponentTransfer>` : ''}
  </filter>
</svg>`;
  }

  // Fallback: tonal-only (no curves)
  const tintR = a.tint > 0 ? a.tint * 0.002 : 0;
  const tintG = a.tint < 0 ? Math.abs(a.tint) * 0.002 : 0;
  const shadowBoost = a.shadows / 100 * 0.3;
  const blackBoost = a.blacks / 100 * 0.2;
  const highlightBoost = a.highlights / 100 * 0.2;
  const whiteBoost = a.whites / 100 * 0.15;

  const rOffset = tintR + shadowBoost + blackBoost;
  const gOffset = tintG + shadowBoost + blackBoost;
  const bOffset = -tintR * 0.5 + shadowBoost + blackBoost;
  const rGain = 1 + highlightBoost + whiteBoost;
  const gGain = 1 + highlightBoost + whiteBoost;
  const bGain = 1 + highlightBoost + whiteBoost;

  return `<svg xmlns="http://www.w3.org/2000/svg" style="position:absolute;width:0;height:0">
  <filter id="pf-adj-svg" color-interpolation-filters="sRGB">
    <feComponentTransfer>
      <feFuncR type="linear" slope="${rGain.toFixed(3)}" intercept="${rOffset.toFixed(3)}"/>
      <feFuncG type="linear" slope="${gGain.toFixed(3)}" intercept="${gOffset.toFixed(3)}"/>
      <feFuncB type="linear" slope="${bGain.toFixed(3)}" intercept="${bOffset.toFixed(3)}"/>
    </feComponentTransfer>
  </filter>
</svg>`;
}

export const CanvasRenderer: React.FC<CanvasRendererProps> = ({ src, adjustments, style, className, alt, draggable }) => {
  const { filter: filterStr, svgFilterId } = useMemo(() => buildFilterStyle(adjustments), [adjustments]);
  const svgMarkup = useMemo(() => buildSvgFilter(adjustments), [adjustments]);
  const needsVignette = adjustments.vignette > 0;
  const needsGrain = adjustments.grain > 0;
  const fullFilter = svgFilterId ? `url(#${svgFilterId}) ${filterStr}` : filterStr;

  if (isDefaultAdj(adjustments)) {
    return <img src={src} style={style} className={className} alt={alt} draggable={draggable} />;
  }

  return (
    <>
      {/* SVG filter definition (hidden) */}
      {svgMarkup && <div dangerouslySetInnerHTML={{ __html: svgMarkup }} style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }} />}

      {/* Image with CSS filter */}
      <img
        src={src}
        style={{
          ...style,
          filter: fullFilter,
        }}
        className={className}
        alt={alt}
        draggable={draggable}
      />

      {/* Vignette overlay */}
      {needsVignette && (
        <div style={{
          position: 'absolute', inset: 0,
          background: `radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,${adjustments.vignette / 100 * 0.7}) 100%)`,
          pointerEvents: 'none',
          borderRadius: style?.borderRadius,
        }} />
      )}

      {/* Grain overlay */}
      {needsGrain && (
        <div style={{
          position: 'absolute', inset: 0,
          opacity: adjustments.grain / 100 * 0.3,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
          backgroundSize: '128px 128px',
          mixBlendMode: 'overlay',
          pointerEvents: 'none',
          borderRadius: style?.borderRadius,
        }} />
      )}
    </>
  );
};

export function useEffectiveAdjustments(presetAdj: PresetAdjustment | undefined, customAdj: Partial<PresetAdjustment> | null): PresetAdjustment {
  return useMemo(() => {
    const base = presetAdj || DEFAULT_ADJ;
    if (!customAdj || Object.keys(customAdj).length === 0) return base;
    return { ...base, ...customAdj };
  }, [presetAdj, customAdj]);
}
