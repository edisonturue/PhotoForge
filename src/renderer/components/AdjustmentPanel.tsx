import React, { useState, useCallback, useMemo } from 'react';
import { PresetAdjustment, PhotoFile, Preset, NumericAdjustmentKey } from '../../shared/types';
import { Theme, SPACING, RADIUS, TYPO, DURATION, EASING, TRANSITION } from '../styles/theme';
import { useI18n } from '../i18n';
import { AppIcon } from './AppIcon';

interface AdjustmentPanelProps {
  photo: PhotoFile;
  appliedPreset: Preset | null;
  onUpdatePhoto: (id: string, updates: Partial<PhotoFile>) => void;
  theme: Theme;
}

const ADJUSTMENTS: { key: NumericAdjustmentKey; labelKey: string; range: [number, number]; step: number; unit: string }[] = [
  { key: 'exposure', labelKey: 'adj.exposure', range: [-5, 5], step: 0.1, unit: '' },
  { key: 'brightness', labelKey: 'adj.brightness', range: [-100, 100], step: 1, unit: '' },
  { key: 'contrast', labelKey: 'adj.contrast', range: [-100, 100], step: 1, unit: '' },
  { key: 'highlights', labelKey: 'adj.highlights', range: [-100, 100], step: 1, unit: '' },
  { key: 'shadows', labelKey: 'adj.shadows', range: [-100, 100], step: 1, unit: '' },
  { key: 'whites', labelKey: 'adj.whites', range: [-100, 100], step: 1, unit: '' },
  { key: 'blacks', labelKey: 'adj.blacks', range: [-100, 100], step: 1, unit: '' },
  { key: 'saturation', labelKey: 'adj.saturation', range: [-100, 100], step: 1, unit: '' },
  { key: 'temperature', labelKey: 'adj.temperature', range: [-100, 100], step: 1, unit: '' },
  { key: 'tint', labelKey: 'adj.tint', range: [-100, 100], step: 1, unit: '' },
  { key: 'clarity', labelKey: 'adj.clarity', range: [-100, 100], step: 1, unit: '' },
  { key: 'sharpness', labelKey: 'adj.sharpness', range: [0, 100], step: 1, unit: '' },
  { key: 'vignette', labelKey: 'adj.vignette', range: [0, 100], step: 1, unit: '' },
  { key: 'grain', labelKey: 'adj.grain', range: [0, 100], step: 1, unit: '' },
  { key: 'hue', labelKey: 'adj.hue', range: [-180, 180], step: 1, unit: '°' },
  { key: 'gamma', labelKey: 'adj.gamma', range: [0.2, 3.0], step: 0.05, unit: '' },
];

const DEFAULT_ADJUSTMENT: PresetAdjustment = {
  brightness: 0, contrast: 0, saturation: 0, hue: 0, temperature: 0,
  tint: 0, sharpness: 0, vignette: 0, grain: 0, clarity: 0,
  highlights: 0, shadows: 0, whites: 0, blacks: 0, exposure: 0, gamma: 1.0,
};

export const AdjustmentPanel: React.FC<AdjustmentPanelProps> = ({ photo, appliedPreset, onUpdatePhoto, theme: t }) => {
  const { t: tr, lang } = useI18n();
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    light: true, color: true, detail: true, effects: true,
  });

  const customAdj = photo.customAdjustments || {};

  // Get current value: custom override > preset value > default
  const getValue = useCallback((key: NumericAdjustmentKey): number => {
    if (customAdj[key] !== undefined) return customAdj[key]!;
    if (appliedPreset) return appliedPreset.adjustments[key];
    return DEFAULT_ADJUSTMENT[key];
  }, [customAdj, appliedPreset]);

  const handleChange = useCallback((key: NumericAdjustmentKey, value: number) => {
    const newAdj = { ...customAdj, [key]: value };
    // If value matches preset, remove custom override
    if (appliedPreset && appliedPreset.adjustments[key] === value) {
      delete newAdj[key];
    }
    // If all defaults, set to null
    const isAllDefault = ADJUSTMENTS.every(a => {
      const v = newAdj[a.key];
      if (v === undefined) return true;
      return a.key === 'gamma' ? v === 1.0 : v === 0;
    });
    onUpdatePhoto(photo.id, { customAdjustments: isAllDefault ? null : newAdj });
  }, [photo.id, customAdj, appliedPreset, onUpdatePhoto]);

  const handleReset = useCallback((key: NumericAdjustmentKey) => {
    const newAdj = { ...customAdj };
    delete newAdj[key];
    const isAllDefault = ADJUSTMENTS.every(a => {
      const v = newAdj[a.key];
      if (v === undefined) return true;
      return a.key === 'gamma' ? v === 1.0 : v === 0;
    });
    onUpdatePhoto(photo.id, { customAdjustments: isAllDefault ? null : newAdj });
  }, [photo.id, customAdj, onUpdatePhoto]);

  const handleResetAll = useCallback(() => {
    onUpdatePhoto(photo.id, { customAdjustments: null });
  }, [photo.id, onUpdatePhoto]);

  const hasCustom = Object.keys(customAdj).length > 0;

  // Calculate effective CSS filter from combined adjustments
  // MUST match CanvasRenderer buildFilterStyle exactly
  const effectiveFilter = useMemo(() => {
    const parts: string[] = [];
    const ev = getValue('exposure');
    const br = getValue('brightness');
    const ct = getValue('contrast');
    const st = getValue('saturation');
    const hu = getValue('hue');
    // Exposure + Brightness combined (matching CanvasRenderer)
    const totalBrightness = 1 + (ev / 5) + (br / 200);
    if (totalBrightness !== 1) parts.push(`brightness(${totalBrightness})`);
    if (ct) parts.push(`contrast(${1 + ct / 200})`);
    if (st) parts.push(`saturate(${1 + st / 100})`);
    if (hu) parts.push(`hue-rotate(${hu}deg)`);
    return parts.join(' ') || 'none';
  }, [getValue]);

  const groups = [
    { key: 'light', label: tr('adjustment.light'), keys: ['exposure', 'brightness', 'contrast', 'highlights', 'shadows', 'whites', 'blacks', 'gamma'] as NumericAdjustmentKey[] },
    { key: 'color', label: tr('adjustment.color'), keys: ['saturation', 'temperature', 'tint', 'hue'] as NumericAdjustmentKey[] },
    { key: 'detail', label: tr('adjustment.detail'), keys: ['clarity', 'sharpness'] as NumericAdjustmentKey[] },
    { key: 'effects', label: tr('adjustment.effects'), keys: ['vignette', 'grain'] as NumericAdjustmentKey[] },
  ];

  return (
    <div>
      {/* Header with reset */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md }}>
        <span style={{ fontSize: TYPO.small.size, fontWeight: 600, color: t.textPrimary }}>
          {tr('detail.editAdjustments')}
        </span>
        {hasCustom && (
          <button style={{
            fontSize: TYPO.tiny.size, color: t.accent, background: 'none', border: 'none',
            cursor: 'pointer', padding: `2px ${SPACING.sm}px`, borderRadius: RADIUS.sm,
            transition: TRANSITION.all,
          }}
            onClick={handleResetAll}
            onMouseEnter={e => { e.currentTarget.style.background = t.accentLight; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
          >{tr('adjustment.resetAll')}</button>
        )}
      </div>

      {/* Applied preset indicator */}
      {appliedPreset && (
        <div style={{
          padding: `${SPACING.sm}px ${SPACING.md}px`, background: t.accentLight,
          borderRadius: RADIUS.sm, marginBottom: SPACING.md, fontSize: TYPO.caption.size,
          color: t.accent, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: SPACING.xs }}><AppIcon name="sparkles" size={12} color={t.accent} />{appliedPreset.name}</span>
          {hasCustom && <span style={{ fontSize: TYPO.tiny.size }}>{tr('adjustment.tweaked')}</span>}
        </div>
      )}

      {/* Adjustment groups */}
      {groups.map(group => (
        <div key={group.key} style={{ marginBottom: SPACING.sm }}>
          <button style={{
            display: 'flex', alignItems: 'center', gap: SPACING.sm, width: '100%',
            padding: `${SPACING.sm}px 0`, border: 'none', background: 'none',
            color: t.textSecondary, cursor: 'pointer', fontSize: TYPO.small.size, fontWeight: 500,
            transition: TRANSITION.all,
          }}
            onClick={() => setExpandedGroups(prev => ({ ...prev, [group.key]: !prev[group.key] }))}
          >
            <span style={{
              fontSize: 10, transition: `transform ${DURATION.fast}ms ${EASING.out}`,
              display: 'inline-block', transform: expandedGroups[group.key] ? 'rotate(0)' : 'rotate(-90deg)',
            }}><AppIcon name="back" size={10} color={t.textSecondary} style={{ transform: expandedGroups[group.key] ? 'rotate(-90deg)' : 'rotate(0deg)' }} /></span>
            {group.label}
          </button>

          {expandedGroups[group.key] && (
            <div style={{ paddingLeft: SPACING.md }}>
              {group.keys.map(adjKey => {
                const adj = ADJUSTMENTS.find(a => a.key === adjKey)!;
                const value = getValue(adjKey);
                const isDefault = adjKey === 'gamma' ? value === 1.0 : value === 0;
                const hasOverride = customAdj[adjKey] !== undefined;
                const pct = adjKey === 'gamma'
                  ? ((value - 1.0) / 2.0) * 100
                  : (value / (adj.range[1] - adj.range[0])) * 100 * 2;

                return (
                  <div key={adjKey} style={{ marginBottom: SPACING.sm }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                      <span style={{
                        fontSize: TYPO.caption.size,
                        color: hasOverride ? t.accent : t.textSecondary,
                        fontWeight: hasOverride ? 500 : 400,
                      }}>
                        {tr(adj.labelKey)}
                        {hasOverride && <AppIcon name="dot" size={10} color={t.accent} style={{ marginLeft: 4 }} />}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: SPACING.xs }}>
                        <span style={{
                          fontSize: TYPO.caption.size, color: t.textPrimary, fontWeight: 500,
                          minWidth: 36, textAlign: 'right',
                        }}>
                          {adjKey === 'gamma' ? value.toFixed(2) : `${value > 0 ? '+' : ''}${Math.round(value)}`}{adj.unit}
                        </span>
                        {!isDefault && (
                          <button style={{
                            width: 16, height: 16, border: 'none', borderRadius: '50%',
                            background: t.bgSecondary, color: t.textTertiary, cursor: 'pointer',
                            fontSize: 9, display: 'flex', alignItems: 'center', justifyContent: 'center',
                            transition: TRANSITION.all, padding: 0,
                          }}
                            onClick={() => handleReset(adjKey)}
                            title={tr('adjustment.reset')}
                          ><AppIcon name="x" size={10} color={t.textTertiary} /></button>
                        )}
                      </div>
                    </div>
                    <div style={{ position: 'relative', height: 20, display: 'flex', alignItems: 'center' }}>
                      {/* Track background */}
                      <div style={{
                        position: 'absolute', left: 0, right: 0, height: 4,
                        background: t.bgSecondary, borderRadius: 2,
                      }}>
                        {/* Center mark for bipolar sliders */}
                        {adj.range[0] < 0 && (
                          <div style={{
                            position: 'absolute', left: '50%', top: -1, width: 2, height: 6,
                            background: t.border, transform: 'translateX(-50%)',
                          }} />
                        )}
                        {/* Fill */}
                        <div style={{
                          position: 'absolute', height: '100%', borderRadius: 2,
                          background: isDefault ? 'transparent' : t.accent,
                          left: adj.range[0] < 0 ? `${50 + Math.min(pct, 0) / 2}%` : '0',
                          width: adj.range[0] < 0 ? `${Math.abs(pct) / 2}%` : `${(value - adj.range[0]) / (adj.range[1] - adj.range[0]) * 100}%`,
                          transition: `background ${DURATION.fast}ms ${EASING.out}`,
                        }} />
                      </div>
                      <input
                        type="range"
                        min={adj.range[0]}
                        max={adj.range[1]}
                        step={adj.step}
                        value={value}
                        onChange={e => handleChange(adjKey, Number(e.target.value))}
                        style={{
                          position: 'absolute', left: 0, right: 0, width: '100%',
                          height: 20, opacity: 0, cursor: 'pointer', margin: 0,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

// Helper: build CSS filter from combined preset + custom adjustments
// MUST match CanvasRenderer buildFilterStyle exactly
export function buildEffectiveFilter(preset: PresetAdjustment | undefined, custom: Partial<PresetAdjustment> | null): React.CSSProperties {
  if (!preset && !custom) return {};
  const a = { ...DEFAULT_ADJUSTMENT, ...preset, ...custom };
  const parts: string[] = [];

  // Exposure + Brightness combined (matching CanvasRenderer)
  const totalBrightness = 1 + (a.exposure / 5) + (a.brightness / 200);
  if (totalBrightness !== 1) parts.push(`brightness(${totalBrightness})`);

  if (a.contrast !== 0) parts.push(`contrast(${1 + a.contrast / 200})`);
  if (a.saturation !== 0) parts.push(`saturate(${1 + a.saturation / 100})`);
  if (a.hue !== 0) parts.push(`hue-rotate(${a.hue}deg)`);
  if (a.temperature > 0) parts.push(`sepia(${Math.min(a.temperature * 0.4, 80)}%)`);
  if (a.temperature < 0) {
    parts.push(`hue-rotate(${a.temperature * 0.3}deg)`);
    parts.push(`saturate(${1 + Math.abs(a.temperature) * 0.005})`);
  }
  if (a.clarity > 0) parts.push(`contrast(${1 + a.clarity / 300})`);
  if (a.gamma !== 1.0) {
    const gammaAdj = a.gamma < 1 ? 1 + (1 - a.gamma) * 0.3 : 1 - (a.gamma - 1) * 0.15;
    parts.push(`brightness(${gammaAdj})`);
  }
  if (a.grain !== 0) parts.push(`contrast(${1 + a.grain * 0.002})`);
  if (a.saturation <= -90) parts.push('grayscale(100%)');
  return { filter: parts.length > 0 ? parts.join(' ') : 'none' };
}
