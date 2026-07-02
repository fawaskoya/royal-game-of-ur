import { describe, expect, it } from "vitest";
import {
  applyMove,
  applyRoll,
  createGame,
  createRuleset,
  legalMoves,
  makeRoll,
  phaseOf,
  validateMove,
  UrEngineError,
} from "../src";
import { deepFreeze, makeState } from "./util";

const FINISH = 15;

describe("entering pieces", () => {
  it("a fresh game with a roll of 3 has exactly one legal move: enter to square 3", () => {
    const state = applyRoll(createGame(), makeRoll(3));
    expect(legalMoves(state)).toEqual([{ player: 0, piece: 0, from: 0, to: 3 }]);
  });

  it("de-duplicates entry moves across identical start-pool pieces", () => {
    const state = applyRoll(createGame(), makeRoll(2));
    expect(legalMoves(state)).toHaveLength(1);
  });

  it("entering on a 4 lands on the private rosette and grants an extra turn", () => {
    let state = applyRoll(createGame(), makeRoll(4));
    state = applyMove(state, { player: 0, piece: 0, from: 0, to: 4 });
    expect(state.current).toBe(0);
    expect(phaseOf(state)).toBe("awaiting-roll");
    const event = state.history[state.history.length - 1]!;
    expect(event).toMatchObject({ type: "move", rosette: true, extraTurn: true });
  });
});

describe("rolls that forfeit the turn", () => {
  it("a zero roll auto-passes with both events recorded", () => {
    const state = applyRoll(createGame(), makeRoll(0));
    expect(phaseOf(state)).toBe("awaiting-roll");
    expect(state.current).toBe(1);
    expect(state.history.map((e) => e.type)).toEqual(["roll", "pass"]);
    expect(state.history[1]).toMatchObject({ type: "pass", reason: "rolled-zero" });
  });

  it("a playable total with every target blocked auto-passes as no-legal-moves", () => {
    // Lone piece one square from home; a 2 overshoots (exact bear-off), start entry lands on own square? No —
    // give the player only finished pieces plus one at 14, so a roll of 2 has no move anywhere.
    const base = makeState({ p0: [14, FINISH, FINISH, FINISH, FINISH, FINISH, FINISH] });
    const state = applyRoll(base, makeRoll(2));
    expect(state.current).toBe(1);
    expect(state.history[state.history.length - 1]).toMatchObject({ type: "pass", reason: "no-legal-moves" });
  });
});

describe("movement and blocking", () => {
  it("cannot land on your own piece; other pieces remain movable", () => {
    const state = makeState({ p0: [4, 8], dice: makeRoll(4) });
    const moves = legalMoves(state);
    // piece 0 (4→8) blocked by own piece; entry (0→4) blocked by own piece; piece 1 (8→12) legal.
    expect(moves).toEqual([{ player: 0, piece: 1, from: 8, to: 12 }]);
  });

  it("private lanes never interact: both players can stand on their own square 2", () => {
    const state = makeState({ p0: [2], p1: [2], dice: makeRoll(1) });
    expect(legalMoves(state)).toContainEqual({ player: 0, piece: 0, from: 2, to: 3 });
  });
});

describe("captures", () => {
  it("landing on an opponent piece in the shared lane sends it back to start", () => {
    const state = makeState({ p0: [4], p1: [6], dice: makeRoll(2) });
    const next = applyMove(state, { player: 0, piece: 0, from: 4, to: 6 });
    expect(next.positions[0][0]).toBe(6);
    expect(next.positions[1][0]).toBe(0);
    expect(next.current).toBe(1);
    expect(next.history[next.history.length - 1]).toMatchObject({
      type: "move",
      capture: { player: 1, piece: 0 },
      rosette: false,
    });
  });

  it("the central rosette is safe: landing there on an opponent is illegal", () => {
    const state = makeState({ p0: [4], p1: [8], dice: makeRoll(4) });
    expect(legalMoves(state).find((m) => m.to === 8)).toBeUndefined();
    const validation = validateMove(state, { player: 0, piece: 0, from: 4, to: 8 });
    expect(validation.ok).toBe(false);
    if (!validation.ok) expect(validation.code).toBe("SQUARE_PROTECTED");
  });

  it("capturing on the central rosette is allowed when safeRosettes is off", () => {
    const house = createRuleset({ id: "house", name: "House", safeRosettes: false });
    const state = makeState({ p0: [4], p1: [8], dice: makeRoll(4), ruleset: house });
    const next = applyMove(state, { player: 0, piece: 0, from: 4, to: 8 });
    expect(next.positions[1][0]).toBe(0);
    // Still a rosette, so the capturer also rolls again.
    expect(next.current).toBe(0);
  });
});

describe("rosettes", () => {
  it("landing on the central rosette keeps the turn", () => {
    const state = makeState({ p0: [5], dice: makeRoll(3) });
    const next = applyMove(state, { player: 0, piece: 0, from: 5, to: 8 });
    expect(next.current).toBe(0);
    expect(phaseOf(next)).toBe("awaiting-roll");
  });

  it("rosettes grant nothing when the variant disables them", () => {
    const house = createRuleset({ id: "house", name: "House", rosettesGrantExtraTurn: false });
    const state = makeState({ p0: [5], dice: makeRoll(3), ruleset: house });
    const next = applyMove(state, { player: 0, piece: 0, from: 5, to: 8 });
    expect(next.current).toBe(1);
  });
});

describe("bearing off and winning", () => {
  it("requires the exact throw under classic rules", () => {
    const state = makeState({ p0: [14, FINISH, FINISH, FINISH, FINISH, FINISH, FINISH], dice: makeRoll(1) });
    const moves = legalMoves(state);
    expect(moves).toEqual([{ player: 0, piece: 0, from: 14, to: FINISH }]);
    const next = applyMove(state, moves[0]!);
    expect(next.winner).toBe(0);
    expect(phaseOf(next)).toBe("game-over");
    expect(next.history[next.history.length - 1]).toMatchObject({ type: "move", finished: true });
  });

  it("rejects an overshooting bear-off with EXACT_ROLL_REQUIRED", () => {
    const state = makeState({ p0: [14], dice: makeRoll(3) });
    const validation = validateMove(state, { player: 0, piece: 0, from: 14, to: FINISH });
    expect(validation.ok).toBe(false);
    if (!validation.ok) expect(validation.code).toBe("EXACT_ROLL_REQUIRED");
  });

  it("allows overshoot bear-off when exactBearOff is off", () => {
    const house = createRuleset({ id: "house", name: "House", exactBearOff: false });
    const state = makeState({ p0: [13], dice: makeRoll(4), ruleset: house });
    expect(legalMoves(state)).toContainEqual({ player: 0, piece: 0, from: 13, to: FINISH });
  });

  it("refuses any play after the game is over", () => {
    const won = { ...makeState({ p0: [FINISH] }), winner: 0 as const };
    expect(legalMoves(won)).toEqual([]);
    expect(() => applyRoll(won, makeRoll(2))).toThrow(UrEngineError);
    const validation = validateMove(won, { player: 0, piece: 0, from: FINISH, to: FINISH });
    expect(validation.ok).toBe(false);
  });
});

describe("validation reasons", () => {
  const state = makeState({ p0: [4], p1: [6], dice: makeRoll(2) });

  it.each([
    ["NOT_YOUR_TURN", { player: 1 as const, piece: 0, from: 6, to: 8 }],
    ["STALE_MOVE", { player: 0 as const, piece: 0, from: 5, to: 7 }],
    ["INVALID_PIECE", { player: 0 as const, piece: 9, from: 0, to: 2 }],
    ["BAD_TARGET", { player: 0 as const, piece: 0, from: 4, to: 7 }],
  ])("%s", (code, move) => {
    const validation = validateMove(state, move);
    expect(validation.ok).toBe(false);
    if (!validation.ok) expect(validation.code).toBe(code);
  });

  it("DICE_NOT_ROLLED before a roll and BLOCKED_BY_OWN_PIECE on self-collision", () => {
    const unrolled = makeState({ p0: [4] });
    const v1 = validateMove(unrolled, { player: 0, piece: 0, from: 4, to: 6 });
    expect(!v1.ok && v1.code).toBe("DICE_NOT_ROLLED");

    const blocked = makeState({ p0: [4, 8], dice: makeRoll(4) });
    const v2 = validateMove(blocked, { player: 0, piece: 0, from: 4, to: 8 });
    expect(!v2.ok && v2.code).toBe("BLOCKED_BY_OWN_PIECE");
  });
});

describe("immutability", () => {
  it("transitions never mutate their input state", () => {
    const state = deepFreeze(makeState({ p0: [4], p1: [6] }));
    const rolled = deepFreeze(applyRoll(state, makeRoll(2)));
    const moved = applyMove(rolled, { player: 0, piece: 0, from: 4, to: 6 });
    expect(state.positions[0][0]).toBe(4);
    expect(rolled.dice?.total).toBe(2);
    expect(moved.positions[0][0]).toBe(6);
    expect(state.history).toHaveLength(0);
  });

  it("rolling twice without moving throws", () => {
    const rolled = applyRoll(createGame(), makeRoll(2));
    expect(() => applyRoll(rolled, makeRoll(1))).toThrow(UrEngineError);
  });
});
