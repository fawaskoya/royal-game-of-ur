import type { DiceRoll, DieValue } from "./types";
import { UrEngineError } from "./errors";

/**
 * Deterministic pseudo-random source. Gameplay-quality only (mulberry32) —
 * server-authoritative play must roll with a cryptographic source and feed
 * results in through `applyRoll`, which accepts any `DiceRoll`.
 */
export interface Rng {
  /** Uniform float in [0, 1). */
  next(): number;
  /** Snapshot of internal state, for exact save/resume. */
  getState(): number;
  setState(state: number): void;
}

/** Seeded mulberry32 generator. Same seed ⇒ same sequence, on every platform. */
export function createRng(seed: number): Rng {
  let a = seed >>> 0;
  return {
    next(): number {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
    getState: () => a >>> 0,
    setState(state: number) {
      a = state >>> 0;
    },
  };
}

/** Throw `diceCount` binary tetrahedral dice. */
export function rollDice(rng: Rng, diceCount = 4): DiceRoll {
  const values: DieValue[] = [];
  for (let i = 0; i < diceCount; i++) values.push(rng.next() < 0.5 ? 0 : 1);
  return { values, total: values.reduce<number>((sum, v) => sum + v, 0) };
}

/** Build a canonical roll with the given total — for tests, replays, and search. */
export function makeRoll(total: number, diceCount = 4): DiceRoll {
  if (!Number.isInteger(total) || total < 0 || total > diceCount) {
    throw new UrEngineError("INVALID_ROLL", `roll total must be an integer in 0..${diceCount}, got ${total}`);
  }
  const values: DieValue[] = [];
  for (let i = 0; i < diceCount; i++) values.push(i < total ? 1 : 0);
  return { values, total };
}

/** Throw an INVALID_ROLL error unless the roll is structurally sound. */
export function validateDiceRoll(roll: DiceRoll, diceCount: number): void {
  if (!roll || !Array.isArray(roll.values) || roll.values.length !== diceCount) {
    throw new UrEngineError("INVALID_ROLL", `expected ${diceCount} die values`);
  }
  let sum = 0;
  for (const v of roll.values) {
    if (v !== 0 && v !== 1) throw new UrEngineError("INVALID_ROLL", `die values must be 0 or 1, got ${String(v)}`);
    sum += v;
  }
  if (roll.total !== sum) {
    throw new UrEngineError("INVALID_ROLL", `roll total ${roll.total} does not match values (sum ${sum})`);
  }
}

/** Probability of each total (index = total) for `diceCount` binary dice: C(n, k) / 2^n. */
export function rollDistribution(diceCount = 4): readonly number[] {
  const dist: number[] = [];
  let c = 1;
  for (let k = 0; k <= diceCount; k++) {
    dist.push(c / 2 ** diceCount);
    c = (c * (diceCount - k)) / (k + 1);
  }
  return dist;
}
