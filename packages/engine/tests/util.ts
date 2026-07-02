import { createGame, FINKEL_RULESET } from "../src";
import type { DiceRoll, GameState, PlayerId, RulesetConfig } from "../src";

/**
 * Build a test position. Piece arrays shorter than piecesPerPlayer are padded
 * with start-pool pieces (index 0).
 */
export function makeState(options: {
  p0?: number[];
  p1?: number[];
  current?: PlayerId;
  dice?: DiceRoll | null;
  ruleset?: RulesetConfig;
}): GameState {
  const ruleset = options.ruleset ?? FINKEL_RULESET;
  const base = createGame(ruleset);
  const fill = (pieces: number[]): number[] => {
    if (pieces.length > ruleset.piecesPerPlayer) throw new Error("too many pieces in test position");
    return [...pieces, ...Array.from({ length: ruleset.piecesPerPlayer - pieces.length }, () => 0)];
  };
  return {
    ...base,
    positions: [fill(options.p0 ?? []), fill(options.p1 ?? [])],
    current: options.current ?? 0,
    dice: options.dice ?? null,
  };
}

/** Recursively freeze — used to prove engine transitions never mutate inputs. */
export function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value as object)) deepFreeze(child);
  }
  return value;
}
