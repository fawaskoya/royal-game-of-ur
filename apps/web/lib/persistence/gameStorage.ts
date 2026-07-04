/**
 * Storage layer for the active saved game. Every operation is wrapped —
 * quota errors, disabled storage, or corrupt payloads degrade to "no save",
 * never to a crash. The backend is injectable for tests.
 */
import { validateSavedGame, type SavedGame } from "./saveSchema";
import { migrateSavedGame } from "./migrations";

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const SAVE_KEY = "ur:save";

function defaultStorage(): StorageLike | null {
  try {
    if (typeof window === "undefined") return null;
    return window.localStorage;
  } catch {
    return null; // storage disabled (private mode / policy)
  }
}

export function saveGame(save: SavedGame, storage: StorageLike | null = defaultStorage()): boolean {
  if (!storage) return false;
  try {
    storage.setItem(SAVE_KEY, JSON.stringify(save));
    return true;
  } catch {
    return false; // quota exceeded etc. — play continues unsaved
  }
}

/** Load, migrate, and fully validate the stored game. Corrupt saves are discarded. */
export function loadGame(storage: StorageLike | null = defaultStorage()): SavedGame | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(SAVE_KEY);
    if (raw === null) return null;
    const parsed: unknown = JSON.parse(raw);
    const migrated = migrateSavedGame(parsed);
    const valid = migrated === null ? null : validateSavedGame(migrated);
    if (valid === null) {
      // Unreadable save: remove it so the corrupt payload can't wedge future loads.
      storage.removeItem(SAVE_KEY);
      return null;
    }
    return valid;
  } catch {
    try {
      storage.removeItem(SAVE_KEY);
    } catch {
      /* ignore */
    }
    return null;
  }
}

export function clearGame(storage: StorageLike | null = defaultStorage()): void {
  try {
    storage?.removeItem(SAVE_KEY);
  } catch {
    /* ignore */
  }
}

export function hasSavedGame(storage: StorageLike | null = defaultStorage()): boolean {
  return loadGame(storage) !== null;
}
