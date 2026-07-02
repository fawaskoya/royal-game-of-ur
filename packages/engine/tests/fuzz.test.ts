import { describe, expect, it } from "vitest";
import { createRng, GameSession, getLayout, PLAYERS, type GameState } from "../src";

/**
 * Property-based smoke: play many seeded random games and check the
 * structural invariants of every intermediate state.
 */
function checkInvariants(state: GameState): void {
  const layout = getLayout(state.ruleset);
  const seen = new Set<string>();
  for (const player of PLAYERS) {
    expect(state.positions[player]).toHaveLength(state.ruleset.piecesPerPlayer);
    for (const index of state.positions[player]) {
      if (!Number.isInteger(index) || index < 0 || index > layout.finishIndex) {
        throw new Error(`piece index out of range: ${index}`);
      }
      const key = layout.keyAt(player, index);
      if (key !== null) {
        if (seen.has(key)) throw new Error(`two pieces on square ${key}`);
        seen.add(key);
      }
    }
  }
  // Opponent pieces must never appear on my private squares (disjoint by construction).
  for (const player of PLAYERS) {
    for (const index of state.positions[player]) {
      const cell = layout.cellAt(player, index);
      if (cell !== null && cell.row !== 1) {
        expect(cell.row).toBe(player === 0 ? 2 : 0);
      }
    }
  }
}

describe("randomized self-play fuzz", () => {
  it("120 seeded games finish legally with all invariants intact", () => {
    const gameLengths: number[] = [];
    for (let seed = 1; seed <= 120; seed++) {
      const session = new GameSession({ seed });
      const policy = createRng(seed * 7919);
      const finished: [number, number] = [0, 0];
      let guard = 0;
      while (session.state.winner === null) {
        if (++guard > 4000) throw new Error(`seed ${seed}: game did not terminate`);
        if (session.phase === "awaiting-roll") {
          session.roll();
        } else {
          const moves = session.legalMoves();
          expect(moves.length).toBeGreaterThan(0);
          session.move(moves[Math.floor(policy.next() * moves.length)]!);
        }
        checkInvariants(session.state);
        // Finished pieces never come back.
        const layout = getLayout(session.state.ruleset);
        for (const player of PLAYERS) {
          const nowFinished = session.state.positions[player].filter((i) => i === layout.finishIndex).length;
          expect(nowFinished).toBeGreaterThanOrEqual(finished[player]);
          finished[player] = nowFinished;
        }
      }
      const layout = getLayout(session.state.ruleset);
      const winner = session.state.winner!;
      expect(session.state.positions[winner].every((i) => i === layout.finishIndex)).toBe(true);
      expect(session.state.positions[winner === 0 ? 1 : 0].some((i) => i !== layout.finishIndex)).toBe(true);
      gameLengths.push(session.state.rollCount);
    }
    const avg = gameLengths.reduce((a, b) => a + b, 0) / gameLengths.length;
    // Sanity: random-vs-random Ur games land in a plausible length band.
    expect(avg).toBeGreaterThan(40);
    expect(avg).toBeLessThan(400);
  });
});
