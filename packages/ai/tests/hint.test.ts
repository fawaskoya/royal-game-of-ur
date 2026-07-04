import { describe, expect, it } from "vitest";
import { GameSession, createRng, getLayout, legalMoves, phaseOf, type MoveEvent, applyMove } from "@ur/engine";
import { analyzeMoves, hintFor } from "../src";

/** Walk a seeded random game, yielding every awaiting-move state. */
function* moveStates(seed: number, limit: number) {
  const session = new GameSession({ seed });
  const rng = createRng(seed ^ 0x1234);
  let yielded = 0;
  while (session.state.winner === null && yielded < limit) {
    if (session.phase === "awaiting-roll") {
      session.roll();
      continue;
    }
    yield session.state;
    yielded++;
    const moves = session.legalMoves();
    session.move(moves[Math.floor(rng.next() * moves.length)]!);
  }
}

describe("hint engine", () => {
  it("always recommends a legal move, sorted best-first", () => {
    for (const state of moveStates(42, 30)) {
      const analyses = analyzeMoves(state, { depth: 1 });
      const legal = legalMoves(state);
      expect(analyses.length).toBe(legal.length);
      for (let i = 1; i < analyses.length; i++) {
        expect(analyses[i - 1]!.value).toBeGreaterThanOrEqual(analyses[i]!.value);
      }
      const hint = hintFor(state, { depth: 1 });
      expect(hint).not.toBeNull();
      expect(legal).toContainEqual(hint!.move);
      expect(hint!.move).toEqual(analyses[0]!.move);
    }
  });

  it("tags match engine facts for every analyzed move", () => {
    for (const state of moveStates(7, 25)) {
      for (const analysis of analyzeMoves(state, { depth: 0 })) {
        const child = applyMove(state, analysis.move);
        const event = child.history[child.history.length - 1] as MoveEvent;
        const layout = getLayout(state.ruleset);
        expect(analysis.tags.includes("capture")).toBe(Boolean(event.capture));
        expect(analysis.tags.includes("finish")).toBe(Boolean(event.finished));
        if (event.extraTurn && !event.finished) expect(analysis.tags).toContain("rosette");
        expect(analysis.tags.includes("enter")).toBe(analysis.move.from === 0);
        if (analysis.move.to !== layout.finishIndex) {
          const safeCentral =
            state.ruleset.safeRosettes &&
            layout.isShared(analysis.move.to) &&
            layout.isRosette(analysis.move.player, analysis.move.to);
          expect(analysis.tags.includes("to-safety")).toBe(safeCentral);
        }
      }
    }
  });

  it("returns null / empty when no move is pending", () => {
    const session = new GameSession({ seed: 5 });
    expect(phaseOf(session.state)).toBe("awaiting-roll");
    expect(hintFor(session.state)).toBeNull();
    expect(analyzeMoves(session.state)).toEqual([]);
  });
});
