import { useState, useEffect, useCallback } from 'react';
import { PhotoFile } from '../../shared/types';

export function usePhotos() {
  const [photos, setPhotos] = useState<PhotoFile[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshPhotos = useCallback(async () => {
    try {
      const allPhotos = await window.photoForge.getAllPhotos();
      setPhotos(allPhotos);
    } catch (err) {
      console.error('Failed to load photos:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refreshPhotos(); }, [refreshPhotos]);

  const updatePhoto = useCallback(async (id: string, updates: Partial<PhotoFile>) => {
    await window.photoForge.updatePhotoMeta(id, updates);
    setPhotos(prev => {
      const idx = prev.findIndex(p => p.id === id);
      if (idx === -1) return prev;
      const next = [...prev];
      next[idx] = { ...prev[idx], ...updates };
      return next;
    });
  }, []);

  const deletePhotosByIds = useCallback(async (ids: string[]) => {
    await window.photoForge.deletePhotos(ids);
    setPhotos(prev => prev.filter(p => !ids.includes(p.id)));
  }, []);

  return { photos, loading, refreshPhotos, updatePhoto, deletePhotos: deletePhotosByIds };
}
