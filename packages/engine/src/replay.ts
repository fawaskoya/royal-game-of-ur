/**
 * Replay: rebuild any game, at any point, from its event log — and verify
 * while doing so that the log obeys the rules. This is the foundation for
 * undo, saved games, spectating, analysis, and server-side anti-cheat.
 */
import type { GameEvent, GameState, RulesetConfig } from "./types";
import { createGame } from "./state";
import { legalMoves, validateMove, withMove, withPass, withRoll } from "./rules";
import { REPLAY_FORMAT, ENGINE_VERSION } from "./constants";
import { validateRuleset } from "./ruleset";
import { UrEngineError } from "./errors";

export interface Replay {
  readonly format: string;
  readonly engine: string;
  readonly ruleset: RulesetConfig;
  readonly events: readonly GameEvent[];
  readonly meta: Readonly<Record<string, unknown>>;
}

/**
 * Re-execute an event log through the rules engine.
 *
 * Every event is validated as it is applied; any event that the rules would
 * not have produced (an illegal move, a pass that was not forced, a recorded
 * outcome that differs from the recomputed one) throws REPLAY_MISMATCH.
 */
export function buildStateFromEvents(ruleset: RulesetConfig, events: readonly GameEvent[]): GameState {
  const mismatch = (index: number, message: string): never => {
    throw new UrEngineError("REPLAY_MISMATCH", `event ${index}: ${message}`);
  };
  let state = createGame(ruleset);
  events.forEach((event, index) => {
    switch (event.type) {
      case "roll": {
        if (event.player !== state.current) {
          mismatch(index, `roll recorded for player ${event.player} but it is player ${state.current}'s turn`);
        }
        state = withRoll(state, { values: event.values, total: event.total });
        break;
      }
      case "pass": {
        if (event.player !== state.current) {
          mismatch(index, `pass recorded for player ${event.player} but it is player ${state.current}'s turn`);
        }
        if (state.dice === null) mismatch(index, "pass recorded with no pending roll");
        if (legalMoves(state).length > 0) mismatch(index, "pass recorded but legal moves existed");
        const expectedReason = state.dice!.total === 0 ? "rolled-zero" : "no-legal-moves";
        if (event.reason !== expectedReason) {
          mismatch(index, `pass reason "${event.reason}" but expected "${expectedReason}"`);
        }
        state = withPass(state, event.reason);
        break;
      }
      case "move": {
        const validation = validateMove(state, {
          player: event.player,
          piece: event.piece,
          from: event.from,
          to: event.to,
        });
        if (!validation.ok) {
          throw new UrEngineError(
            "REPLAY_MISMATCH",
            `event ${index}: illegal move: ${validation.message} [${validation.code}]`,
          );
        }
        state = withMove(state, validation.move);
        const applied = state.history[state.history.length - 1]!;
        if (applied.type !== "move") mismatch(index, "internal: applied event is not a move");
        const recorded = event;
        const actual = applied as typeof recorded;
        if (
          actual.rosette !== recorded.rosette ||
          actual.extraTurn !== recorded.extraTurn ||
          actual.finished !== recorded.finished ||
          JSON.stringify(actual.capture) !== JSON.stringify(recorded.capture)
        ) {
          mismatch(index, "recorded move outcome differs from the rules engine's outcome");
        }
        break;
      }
      default:
        mismatch(index, `unknown event type ${String((event as { type?: string }).type)}`);
    }
  });
  return state;
}

/**
 * Rewind to the position immediately before the most recent roll.
 * Applying this repeatedly steps back one roll at a time; at the beginning
 * of the game it returns the initial position.
 */
export function undoLastRoll(state: GameState): GameState {
  const lastRoll = state.history.map((e) => e.type).lastIndexOf("roll");
  if (lastRoll === -1) return createGame(state.ruleset);
  return buildStateFromEvents(state.ruleset, state.history.slice(0, lastRoll));
}

/** Package a finished (or in-progress) game as a portable replay object. */
export function exportReplay(state: GameState, meta: Record<string, unknown> = {}): Replay {
  return {
    format: REPLAY_FORMAT,
    engine: ENGINE_VERSION,
    ruleset: state.ruleset,
    events: state.history,
    meta: { createdAt: new Date().toISOString(), ...meta },
  };
}

export function serializeReplay(state: GameState, meta: Record<string, unknown> = {}): string {
  return JSON.stringify(exportReplay(state, meta));
}

/** Parse and structurally validate a replay. Does not re-execute it — `replayStateAt` does. */
export function importReplay(payload: string | Replay): Replay {
  const fail = (message: string): never => {
    throw new UrEngineError("INVALID_REPLAY", message);
  };
  let raw: unknown = payload;
  if (typeof payload === "string") {
    try {
      raw = JSON.parse(payload);
    } catch {
      return fail("replay payload is not valid JSON");
    }
  }
  const replay = raw as Partial<Replay>;
  if (replay.format !== REPLAY_FORMAT) return fail(`unknown replay format ${String(replay.format)}`);
  if (!replay.ruleset) return fail("missing ruleset");
  validateRuleset(replay.ruleset);
  if (!Array.isArray(replay.events)) return fail("events must be an array");
  return {
    format: REPLAY_FORMAT,
    engine: typeof replay.engine === "string" ? replay.engine : "unknown",
    ruleset: replay.ruleset,
    events: replay.events as GameEvent[],
    meta: (replay.meta ?? {}) as Record<string, unknown>,
  };
}

/**
 * The verified game state after the first `eventCount` events (default: all).
 * Drives replay scrubbing: call with increasing counts to step through a game.
 */
export function replayStateAt(replay: Replay, eventCount?: number): GameState {
  const events = eventCount === undefined ? replay.events : replay.events.slice(0, eventCount);
  return buildStateFromEvents(replay.ruleset, events);
}
