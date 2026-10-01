/**
 * Opening coach: a one-line, plain-English tip for a new player's first three
 * moves, built from the hint engine's tags (engine facts, not opinions).
 * Pure and cheap — it only runs while a tip is still due.
 */
import { hintFor, type HintTag } from "@ur/ai";
import type { GameState, PlayerId } from "@ur/engine";

export const COACH_MOVES = 3;
/** Players with this many finished games or more no longer need the coach. */
export const COACH_MAX_GAMES = 3;

export const TIP: Record<HintTag, string> = {
  capture: "capture! Landing on an opponent in the middle lane sends them back to start",
  rosette: "land on the rosette for a free extra roll",
  finish: "bear this piece off — it's home",
  enter: "bring a new piece onto the board — more pieces, more choices",
  "to-safety": "the central rosette is safe: nobody can capture you there",
  "escapes-danger": "step out of range — the piece behind you could capture it",
  risky: "a risky square, but worth it here",
};

/** How many moves `player` has already made this game. */
export function movesMadeBy(state: GameState, player: PlayerId): number {
  return state.history.filter((e) => e.type === "move" && e.player === player).length;
}

/** A tip for `player`'s next move, or null when no coaching is due. */
export function openingTip(state: GameState, player: PlayerId): string | null {
  if (state.winner !== null || state.dice === null || state.current !== player) return null;
  const made = movesMadeBy(state, player);
  if (made >= COACH_MOVES) return null;
  const best = hintFor(state, { depth: 2 });
  if (!best) return null;
  const tag = best.tags.find((t) => t !== "risky") ?? null;
  const body = tag ? TIP[tag] : "this move keeps your race moving";
  return `Tip ${made + 1}/${COACH_MOVES}: ${body}`;
}
