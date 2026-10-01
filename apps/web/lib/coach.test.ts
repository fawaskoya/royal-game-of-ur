import { describe, expect, it } from "vitest";
import { applyMove, applyRoll, createGame, legalMoves, makeRoll } from "@ur/engine";
import { openingTip } from "./coach";

describe("opening coach", () => {
  it("gives a numbered tip on the first move and nothing when no move is pending", () => {
    const fresh = createGame();
    expect(openingTip(fresh, 0)).toBeNull(); // must roll first
    const s = applyRoll(fresh, makeRoll(4));
    expect(openingTip(s, 0)).toMatch(/^Tip 1\/3: /);
    expect(openingTip(s, 1)).toBeNull(); // not their turn
  });

  it("stops after three of the player's own moves", () => {
    let s = createGame();
    let mine = 0;
    let guard = 0;
    while (mine < 3 && guard++ < 200) {
      s = applyRoll(s, makeRoll(1 + (guard % 3)));
      if (s.dice === null) continue;
      if (s.current === 0) mine++;
      s = applyMove(s, legalMoves(s)[0]!);
    }
    for (let i = 0; i < 40 && s.winner === null; i++) {
      s = applyRoll(s, makeRoll(2));
      if (s.dice !== null && s.current === 0) {
        expect(openingTip(s, 0)).toBeNull();
        return;
      }
      if (s.dice !== null) s = applyMove(s, legalMoves(s)[0]!);
    }
  });
});
