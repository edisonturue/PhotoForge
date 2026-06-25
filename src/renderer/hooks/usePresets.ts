import { useState, useEffect, useCallback } from 'react';
import { Preset } from '../../shared/types';

export function usePresets() {
  const [presets, setPresets] = useState<Preset[]>([]);

  const refreshPresets = useCallback(async () => {
    try {
      const allPresets = await window.photoForge.getPresets();
      setPresets(allPresets);
    } catch (err) {
      console.error('Failed to load presets:', err);
    }
  }, []);

  useEffect(() => { refreshPresets(); }, [refreshPresets]);

  const applyPreset = useCallback(async (photoId: string, presetId: string) => {
    return window.photoForge.applyPreset(photoId, presetId);
  }, []);

  const removePreset = useCallback(async (photoId: string) => {
    return window.photoForge.removePreset(photoId);
  }, []);

  const createPreset = useCallback(async (preset: Preset) => {
    const result = await window.photoForge.createPreset(preset);
    refreshPresets();
    return result;
  }, [refreshPresets]);

  const deletePreset = useCallback(async (presetId: string) => {
    const result = await window.photoForge.deletePreset(presetId);
    refreshPresets();
    return result;
  }, [refreshPresets]);

  return { presets, applyPreset, removePreset, createPreset, deletePreset, refreshPresets };
}
