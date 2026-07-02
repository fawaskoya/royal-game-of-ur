import { describe, expect, it } from "vitest";
import { applyRoll, createGame, createRng, legalMoves, makeRoll } from "@ur/engine";
import { createAgent, DIFFICULTIES, playGame, bestMove } from "../src";

describe("agent contract", () => {
  it("every difficulty returns only legal moves and finishes full games", () => {
    // playGame validates every move through the engine, which throws on any
    // illegal choice — completing games is itself the legality proof.
    for (const difficulty of DIFFICULTIES) {
      const games = difficulty.id === "expert" ? 2 : 6;
      for (let i = 0; i < games; i++) {
        const result = playGame([difficulty.create(), createAgent("beginner")], 1000 + i);
        expect([0, 1]).toContain(result.winner);
        expect(result.rolls).toBeGreaterThan(10);
      }
    }
  });

  it("agents are deterministic under a fixed rng", () => {
    const state = applyRoll(createGame(), makeRoll(2));
    for (const difficulty of DIFFICULTIES) {
      const a = difficulty.create().chooseMove(state, legalMoves(state), { rng: createRng(9) });
      const b = difficulty.create().chooseMove(state, legalMoves(state), { rng: createRng(9) });
      expect(a).toEqual(b);
    }
  });
});

describe("tactical sanity", () => {
  it("search takes an available capture of an advanced piece", () => {
    const base = createGame();
    const state = applyRoll(
      { ...base, positions: [[8, 0, 0, 0, 0, 0, 0], [10, 0, 0, 0, 0, 0, 0]] },
      makeRoll(2),
    );
    // Player 0, roll of 2: entering (0→2) or capturing the opponent's piece on 10.
    const move = bestMove(state, { depth: 2 });
    expect(move).toMatchObject({ from: 8, to: 10 });
  });

  it("search grabs the central rosette when offered", () => {
    const base = createGame();
    const state = applyRoll(
      { ...base, positions: [[5, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0]] },
      makeRoll(3),
    );
    const move = bestMove(state, { depth: 2 });
    expect(move).toMatchObject({ from: 5, to: 8 });
  });
});
