/**
 * Remembers the online game you are currently in, so a page reload doesn't
 * lose it.
 *
 * Without this the client kept no record of the game id, and the only handle
 * on a private room — its 4-letter code — stopped resolving the moment the
 * second player joined. A refresh, an accidental tab close, or a mobile
 * browser evicting the tab locked you out of a game that was still perfectly
 * alive on the server, and you then lost it on the turn clock. Matchmade
 * games were worse off still: they carry no room code at all, so the id kept
 * here is the only way back.
 *
 * Deliberately small and fail-safe, mirroring `lib/persistence/gameStorage`:
 * versioned key, validated on read, and any storage failure degrades to "no
 * game remembered" rather than throwing.
 */
const KEY = "ur:online-active";
const VERSION = 1;

/** Past this, a remembered game is almost certainly over. */
const MAX_AGE_MS = 12 * 60 * 60 * 1000;

export interface ActiveOnlineGame {
  gameId: string;
  /** Room code for private rooms; null for matchmade games. */
  code: string | null;
  savedAt: string;
}

function storage(): Storage | null {
  try {
    if (typeof window === "undefined") return null;
    return window.localStorage;
  } catch {
    return null; // private mode / blocked storage
  }
}

export function rememberActiveGame(gameId: string, code: string | null): void {
  const store = storage();
  if (!store) return;
  try {
    store.setItem(
      KEY,
      JSON.stringify({ version: VERSION, gameId, code, savedAt: new Date().toISOString() }),
    );
  } catch {
    // Storage full or blocked — losing the breadcrumb is not worth an error.
  }
}

export function forgetActiveGame(): void {
  try {
    storage()?.removeItem(KEY);
  } catch {
    // ignore
  }
}

/** The remembered game, or null if there is none, it's malformed, or stale. */
export function loadActiveGame(): ActiveOnlineGame | null {
  const store = storage();
  if (!store) return null;
  try {
    const raw = store.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ActiveOnlineGame> & { version?: unknown };
    if (parsed.version !== VERSION) return null;
    if (typeof parsed.gameId !== "string" || parsed.gameId.length === 0) return null;
    if (typeof parsed.savedAt !== "string") return null;
    const savedAt = Date.parse(parsed.savedAt);
    if (!Number.isFinite(savedAt) || Date.now() - savedAt > MAX_AGE_MS) {
      forgetActiveGame();
      return null;
    }
    const code = typeof parsed.code === "string" ? parsed.code : null;
    return { gameId: parsed.gameId, code, savedAt: parsed.savedAt };
  } catch {
    return null;
  }
}
