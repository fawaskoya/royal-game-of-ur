import { describe, expect, it } from "vitest";
import { createGame, type GameState } from "@ur/engine";
import { evaluate } from "../src";

function position(p0: number[], p1: number[]): GameState {
  const base = createGame();
  const fill = (pieces: number[]): number[] => [
    ...pieces,
    ...Array.from({ length: 7 - pieces.length }, () => 0),
  ];
  return { ...base, positions: [fill(p0), fill(p1)] };
}

describe("static evaluation", () => {
  it("is antisymmetric between the players", () => {
    const state = position([4, 8, 15], [6, 2]);
    expect(evaluate(state, 0)).toBeCloseTo(-evaluate(state, 1), 6);
  });

  it("values a borne-off piece above any on-board square", () => {
    expect(evaluate(position([15], []), 0)).toBeGreaterThan(evaluate(position([14], []), 0));
  });

  it("values progress", () => {
    expect(evaluate(position([10], []), 0)).toBeGreaterThan(evaluate(position([3], []), 0));
  });

  it("penalizes a piece under the gun on the shared lane", () => {
    const threatened = position([7], [5]); // opponent hits with a 2
    const safeOpponentFarAway = position([7], []);
    expect(evaluate(threatened, 0)).toBeLessThan(evaluate(safeOpponentFarAway, 0));
  });

  it("does not fear capture while standing on the safe central rosette", () => {
    const onRosette = position([8], [6]); // opponent two behind, but square 8 is safe
    const offRosette = position([9], [7]); // same distance, capturable
    const dangerAt = (state: GameState): number => evaluate(state, 0);
    // The rosette square should not carry a danger penalty; the plain square should.
    expect(dangerAt(onRosette)).toBeGreaterThan(dangerAt(offRosette));
  });

  it("scores decided games at the win margin", () => {
    const won = { ...position([15, 15, 15, 15, 15, 15, 15], [3]), winner: 0 as const };
    expect(evaluate(won, 0)).toBeGreaterThan(500_000);
    expect(evaluate(won, 1)).toBeLessThan(-500_000);
  });
});
