/**
 * Versioned save schema for the active local game.
 *
 * A save wraps the engine's exact session snapshot (`ur-session@1`: state +
 * RNG position, so resumed games roll the same future dice) plus the web
 * session metadata the engine doesn't know about (mode, timestamps).
 *
 * Saves are untrusted input: `validateSavedGame` structurally checks the
 * wrapper, lets the engine validate the session payload, then rebuilds the
 * position from the event history (`buildStateFromEvents`) and cross-checks
 * it — the same mechanism replay verification uses. Corrupt or tampered
 * saves yield `null`, never a crash. See docs/PERSISTENCE.md.
 */
import { GameSession, buildStateFromEvents } from "@ur/engine";
import { DIFFICULTIES } from "@ur/ai";
import type { GameMode } from "@/lib/useGame";

export const CURRENT_SAVE_VERSION = 1;

export interface SavedGame {
  readonly version: typeof CURRENT_SAVE_VERSION;
  /** ISO timestamp of the last write. */
  readonly savedAt: string;
  /** ISO timestamp of when this game began (drives duration stats). */
  readonly startedAt: string;
  readonly gameId: string;
  readonly mode: GameMode;
  /** Engine `ur-session@1` payload (state + RNG position). */
  readonly session: string;
}

const DIFFICULTY_IDS = new Set(DIFFICULTIES.map((d) => d.id));

function isDifficulty(value: unknown): boolean {
  return typeof value === "string" && DIFFICULTY_IDS.has(value as never);
}

function isMode(value: unknown): value is GameMode {
  if (typeof value !== "object" || value === null) return false;
  const mode = value as Record<string, unknown>;
  switch (mode.kind) {
    case "pvp":
      return true;
    case "ai":
      return (mode.human === 0 || mode.human === 1) && isDifficulty(mode.difficulty);
    case "watch":
      return isDifficulty(mode.light) && isDifficulty(mode.dark);
    default:
      return false;
  }
}

/**
 * Full validation: wrapper shape, engine session parse, and replay
 * cross-check. Returns the typed save or null — never throws.
 */
export function validateSavedGame(value: unknown): SavedGame | null {
  try {
    if (typeof value !== "object" || value === null) return null;
    const save = value as Record<string, unknown>;
    if (save.version !== CURRENT_SAVE_VERSION) return null;
    if (typeof save.savedAt !== "string" || typeof save.startedAt !== "string") return null;
    if (typeof save.gameId !== "string" || save.gameId.length === 0) return null;
    if (!isMode(save.mode)) return null;
    if (typeof save.session !== "string") return null;

    // Engine-side validation (throws on anything malformed)…
    const session = GameSession.deserialize(save.session);
    // …then integrity: the event history must reproduce the stored position.
    const state = session.state;
    const rebuilt = buildStateFromEvents(state.ruleset, state.history);
    const consistent =
      JSON.stringify(rebuilt.positions) === JSON.stringify(state.positions) &&
      rebuilt.current === state.current &&
      rebuilt.winner === state.winner &&
      rebuilt.rollCount === state.rollCount &&
      JSON.stringify(rebuilt.dice) === JSON.stringify(state.dice);
    if (!consistent) return null;

    return {
      version: CURRENT_SAVE_VERSION,
      savedAt: save.savedAt,
      startedAt: save.startedAt,
      gameId: save.gameId,
      mode: save.mode,
      session: save.session,
    };
  } catch {
    return null;
  }
}
