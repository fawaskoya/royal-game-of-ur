/**
 * Finished-game archive: every completed game is kept as a portable replay
 * (the same `ur-replay@1` payload the export button downloads), browsable
 * from the menu for re-watching and post-game analysis.
 *
 * Same storage rules as every other store: versioned key, validated on read,
 * fail-closed, bounded size, never throws.
 */
import { importReplay, type GameState, type Replay } from "@ur/engine";
import { exportReplay } from "@ur/engine";
import type { GameMode } from "@/lib/useGame";
import type { StorageLike } from "@/lib/persistence/gameStorage";

export const ARCHIVE_VERSION = 1;
const ARCHIVE_KEY = "ur:archive";
/** Replays are ~30 KB each; 20 keeps the store well under localStorage budgets. */
const MAX_ENTRIES = 20;

export interface ArchiveEntry {
  readonly id: string; // gameId
  readonly completedAt: string; // ISO
  readonly mode: GameMode;
  readonly winner: 0 | 1;
  readonly turns: number;
  /** Serialized `ur-replay@1` JSON — parse with `importReplay` on demand. */
  readonly replay: string;
}

function defaultStorage(): StorageLike | null {
  try {
    if (typeof window === "undefined") return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

export function loadArchive(storage: StorageLike | null = defaultStorage()): ArchiveEntry[] {
  if (!storage) return [];
  try {
    const raw = storage.getItem(ARCHIVE_KEY);
    if (raw === null) return [];
    const parsed = JSON.parse(raw) as { version?: unknown; entries?: unknown };
    if (parsed.version !== ARCHIVE_VERSION || !Array.isArray(parsed.entries)) return [];
    return parsed.entries.filter(
      (e: Partial<ArchiveEntry>) =>
        typeof e.id === "string" &&
        typeof e.completedAt === "string" &&
        typeof e.replay === "string" &&
        (e.winner === 0 || e.winner === 1) &&
        typeof e.turns === "number" &&
        typeof e.mode === "object",
    ) as ArchiveEntry[];
  } catch {
    return [];
  }
}

/** Archive a finished game. No-ops (returns false) if the game isn't decided. */
export function archiveGame(
  state: GameState,
  mode: GameMode,
  gameId: string,
  storage: StorageLike | null = defaultStorage(),
): boolean {
  if (!storage || state.winner === null) return false;
  try {
    const entry: ArchiveEntry = {
      id: gameId,
      completedAt: new Date().toISOString(),
      mode,
      winner: state.winner,
      turns: state.rollCount,
      replay: JSON.stringify(exportReplay(state, { mode })),
    };
    const entries = [...loadArchive(storage).filter((e) => e.id !== gameId), entry].slice(-MAX_ENTRIES);
    storage.setItem(ARCHIVE_KEY, JSON.stringify({ version: ARCHIVE_VERSION, entries }));
    return true;
  } catch {
    return false; // quota etc. — archiving is best-effort, never disruptive
  }
}

export function deleteArchiveEntry(id: string, storage: StorageLike | null = defaultStorage()): void {
  if (!storage) return;
  try {
    const entries = loadArchive(storage).filter((e) => e.id !== id);
    storage.setItem(ARCHIVE_KEY, JSON.stringify({ version: ARCHIVE_VERSION, entries }));
  } catch {
    /* ignore */
  }
}

/** Parse an entry's replay, or null if it rotted in storage. */
export function replayOf(entry: ArchiveEntry): Replay | null {
  try {
    return importReplay(entry.replay);
  } catch {
    return null;
  }
}
