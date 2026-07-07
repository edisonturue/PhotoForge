import { useState, useCallback, useRef } from 'react';
import { PhotoFile } from '../../shared/types';

// ========== History Entry Types ==========

export type HistoryAction =
  | 'updatePhoto'
  | 'deletePhotos'
  | 'applyPreset'
  | 'removePreset'
  | 'batchApplyPreset'
  | 'addTag'
  | 'removeTag'
  | 'setRating'
  | 'setColorLabel'
  | 'toggleFavorite'
  | 'cropPhoto'
  | 'transformPhoto';

export interface HistoryEntry {
  id: string;
  action: HistoryAction;
  description: string;
  timestamp: number;
  /** Snapshot of affected photos BEFORE the action */
  beforeState: Map<string, Partial<PhotoFile> & { id: string }>;
  /** Snapshot of affected photos AFTER the action */
  afterState: Map<string, Partial<PhotoFile> & { id: string }>;
  /** IDs of photos that were deleted (for undo of delete) */
  deletedPhotos?: PhotoFile[];
}

export interface HistoryState {
  entries: HistoryEntry[];
  currentIndex: number; // -1 means no history
  canUndo: boolean;
  canRedo: boolean;
}

const MAX_HISTORY = 50;

// ========== History Hook ==========

export function useHistory() {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const entryIdCounter = useRef(0);

  const canUndo = currentIndex >= 0;
  const canRedo = currentIndex < entries.length - 1;

  /** Record a new action. Truncates any redo history. */
  const pushEntry = useCallback((
    action: HistoryAction,
    description: string,
    beforeState: Map<string, Partial<PhotoFile> & { id: string }>,
    afterState: Map<string, Partial<PhotoFile> & { id: string }>,
    deletedPhotos?: PhotoFile[]
  ) => {
    const entry: HistoryEntry = {
      id: `hist-${++entryIdCounter.current}`,
      action,
      description,
      timestamp: Date.now(),
      beforeState,
      afterState,
      deletedPhotos,
    };

    setEntries(prev => {
      // Truncate redo history
      const truncated = prev.slice(0, currentIndex + 1);
      const next = [...truncated, entry];
      // Enforce max history
      if (next.length > MAX_HISTORY) {
        next.shift();
        setCurrentIndex(prev => Math.max(0, prev));
        return next;
      }
      return next;
    });
    setCurrentIndex(prev => {
      const newIdx = prev + 1;
      return Math.min(newIdx, MAX_HISTORY - 1);
    });
  }, [currentIndex]);

  /** Get the entry to undo (current), returns null if can't undo */
  const getUndoEntry = useCallback((): HistoryEntry | null => {
    if (currentIndex < 0 || currentIndex >= entries.length) return null;
    return entries[currentIndex];
  }, [entries, currentIndex]);

  /** Perform undo: move index back */
  const undo = useCallback((): HistoryEntry | null => {
    if (currentIndex < 0) return null;
    const entry = entries[currentIndex];
    setCurrentIndex(prev => prev - 1);
    return entry;
  }, [entries, currentIndex]);

  /** Perform redo: move index forward */
  const redo = useCallback((): HistoryEntry | null => {
    if (currentIndex >= entries.length - 1) return null;
    const entry = entries[currentIndex + 1];
    setCurrentIndex(prev => prev + 1);
    return entry;
  }, [entries, currentIndex]);

  /** Get human-readable history list for display */
  const getHistoryList = useCallback(() => {
    return entries.map((entry, idx) => ({
      id: entry.id,
      description: entry.description,
      timestamp: entry.timestamp,
      isCurrent: idx === currentIndex,
      isPast: idx <= currentIndex,
    }));
  }, [entries, currentIndex]);

  /** Jump to a specific point in history */
  const jumpTo = useCallback((index: number): HistoryEntry[] => {
    if (index < -1 || index >= entries.length) return [];

    const targetIdx = index;
    const entriesToUndo: HistoryEntry[] = [];

    // Collect entries to undo (from current down to target)
    for (let i = currentIndex; i > targetIdx; i--) {
      entriesToUndo.push(entries[i]);
    }

    setCurrentIndex(targetIdx);
    return entriesToUndo;
  }, [entries, currentIndex]);

  /** Clear all history */
  const clear = useCallback(() => {
    setEntries([]);
    setCurrentIndex(-1);
  }, []);

  return {
    canUndo,
    canRedo,
    pushEntry,
    undo,
    redo,
    getHistoryList,
    jumpTo,
    clear,
    historyLength: entries.length,
  };
}

// ========== Helper: Create history entry for photo update ==========

export function createUpdateEntry(
  action: HistoryAction,
  description: string,
  photoId: string,
  before: Partial<PhotoFile>,
  after: Partial<PhotoFile>
): { action: HistoryAction; description: string; beforeState: Map<string, Partial<PhotoFile> & { id: string }>; afterState: Map<string, Partial<PhotoFile> & { id: string }> } {
  return {
    action,
    description,
    beforeState: new Map([[photoId, { id: photoId, ...before }]]),
    afterState: new Map([[photoId, { id: photoId, ...after }]]),
  };
}

/** Create history entry for batch operations */
export function createBatchEntry(
  action: HistoryAction,
  description: string,
  changes: Array<{ id: string; before: Partial<PhotoFile>; after: Partial<PhotoFile> }>
): { action: HistoryAction; description: string; beforeState: Map<string, Partial<PhotoFile> & { id: string }>; afterState: Map<string, Partial<PhotoFile> & { id: string }> } {
  const beforeState = new Map<string, Partial<PhotoFile> & { id: string }>();
  const afterState = new Map<string, Partial<PhotoFile> & { id: string }>();

  for (const change of changes) {
    beforeState.set(change.id, { id: change.id, ...change.before });
    afterState.set(change.id, { id: change.id, ...change.after });
  }

  return { action, description, beforeState, afterState };
}
