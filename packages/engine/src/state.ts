import type { GameEvent, GameState, Phase, PlayerId, RulesetConfig } from "./types";
import { getLayout, type CellKey } from "./board";
import { FINKEL_RULESET, validateRuleset } from "./ruleset";
import { validateDiceRoll } from "./dice";
import { PLAYERS, STATE_FORMAT, ENGINE_VERSION } from "./constants";
import { UrEngineError } from "./errors";

/** A fresh game. Player 0 (Light) rolls first; apps may randomize seats before calling this. */
export function createGame(ruleset: RulesetConfig = FINKEL_RULESET): GameState {
  validateRuleset(ruleset);
  const start = (): number[] => Array.from({ length: ruleset.piecesPerPlayer }, () => 0);
  return {
    ruleset,
    positions: [start(), start()],
    current: 0,
    dice: null,
    winner: null,
    rollCount: 0,
    history: [],
  };
}

export function phaseOf(state: GameState): Phase {
  if (state.winner !== null) return "game-over";
  return state.dice === null ? "awaiting-roll" : "awaiting-move";
}

export interface Occupant {
  readonly player: PlayerId;
  readonly piece: number;
}

/** Map from physical square to the piece standing on it. At most one piece per square. */
export function occupancy(state: GameState): Map<CellKey, Occupant> {
  const layout = getLayout(state.ruleset);
  const map = new Map<CellKey, Occupant>();
  for (const player of PLAYERS) {
    state.positions[player].forEach((index, piece) => {
      const key = layout.keyAt(player, index);
      if (key !== null) map.set(key, { player, piece });
    });
  }
  return map;
}

/** Number of pieces a player has borne off. */
export function finishedCount(state: GameState, player: PlayerId): number {
  const finish = getLayout(state.ruleset).finishIndex;
  return state.positions[player].filter((index) => index === finish).length;
}

/** Number of pieces a player still has in the start pool. */
export function startCount(state: GameState, player: PlayerId): number {
  return state.positions[player].filter((index) => index === 0).length;
}

interface SerializedState {
  readonly format: string;
  readonly engine: string;
  readonly ruleset: RulesetConfig;
  readonly positions: readonly [readonly number[], readonly number[]];
  readonly current: PlayerId;
  readonly dice: GameState["dice"];
  readonly winner: PlayerId | null;
  readonly rollCount: number;
  readonly history: readonly GameEvent[];
}

/** Serialize a state snapshot to JSON. */
export function serializeState(state: GameState): string {
  const payload: SerializedState = {
    format: STATE_FORMAT,
    engine: ENGINE_VERSION,
    ruleset: state.ruleset,
    positions: state.positions,
    current: state.current,
    dice: state.dice,
    winner: state.winner,
    rollCount: state.rollCount,
    history: state.history,
  };
  return JSON.stringify(payload);
}

/** Parse and structurally validate a serialized state. Throws INVALID_STATE on corrupt input. */
export function deserializeState(json: string): GameState {
  const fail = (message: string): never => {
    throw new UrEngineError("INVALID_STATE", message);
  };
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return fail("state payload is not valid JSON");
  }
  const p = raw as Partial<SerializedState>;
  if (p.format !== STATE_FORMAT) return fail(`unknown state format ${String(p.format)}`);
  if (!p.ruleset) return fail("missing ruleset");
  validateRuleset(p.ruleset);
  const layout = getLayout(p.ruleset);

  if (!Array.isArray(p.positions) || p.positions.length !== 2) return fail("positions must have two sides");
  for (const side of p.positions) {
    if (!Array.isArray(side) || side.length !== p.ruleset.piecesPerPlayer) {
      return fail(`each side must have ${p.ruleset.piecesPerPlayer} pieces`);
    }
    for (const index of side) {
      if (!Number.isInteger(index) || index < 0 || index > layout.finishIndex) {
        return fail(`piece index ${String(index)} out of range 0..${layout.finishIndex}`);
      }
    }
  }
  if (p.current !== 0 && p.current !== 1) return fail("current player must be 0 or 1");
  if (p.winner !== null && p.winner !== 0 && p.winner !== 1) return fail("winner must be null, 0, or 1");
  if (!Number.isInteger(p.rollCount) || (p.rollCount as number) < 0) return fail("rollCount must be a non-negative integer");
  if (!Array.isArray(p.history)) return fail("history must be an array");
  if (p.dice !== null && p.dice !== undefined) validateDiceRoll(p.dice, p.ruleset.diceCount);

  const state: GameState = {
    ruleset: p.ruleset,
    positions: [([...p.positions[0]!]), ([...p.positions[1]!])],
    current: p.current,
    dice: p.dice ?? null,
    winner: p.winner ?? null,
    rollCount: p.rollCount as number,
    history: [...p.history] as GameEvent[],
  };

  // No two pieces may share a physical square.
  const seen = new Set<CellKey>();
  for (const player of PLAYERS) {
    for (const index of state.positions[player]) {
      const key = layout.keyAt(player, index);
      if (key === null) continue;
      if (seen.has(key)) return fail(`two pieces occupy square ${key}`);
      seen.add(key);
    }
  }
  return state;
}
