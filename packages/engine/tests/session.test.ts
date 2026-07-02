import { describe, expect, it } from "vitest";
import { createRng, GameSession } from "../src";

function step(session: GameSession, policySeed: number, plies: number): void {
  const policy = createRng(policySeed);
  for (let i = 0; i < plies && session.state.winner === null; i++) {
    if (session.phase === "awaiting-roll") session.roll();
    else {
      const moves = session.legalMoves();
      session.move(moves[Math.floor(policy.next() * moves.length)]!);
    }
  }
}

describe("GameSession", () => {
  it("two sessions with the same seed and policy play identical games", () => {
    const a = new GameSession({ seed: 2026 });
    const b = new GameSession({ seed: 2026 });
    step(a, 5, 200);
    step(b, 5, 200);
    expect(a.state.history).toEqual(b.state.history);
    expect(a.state.positions).toEqual(b.state.positions);
  });

  it("serialize/deserialize resumes with identical future dice", () => {
    const original = new GameSession({ seed: 404 });
    step(original, 9, 21);
    const resumed = GameSession.deserialize(original.serialize());
    expect(resumed.state).toEqual(original.state);
    // Both should roll the same dice from here on.
    step(original, 11, 40);
    step(resumed, 11, 40);
    expect(resumed.state.history).toEqual(original.state.history);
  });

  it("undoToPlayerRoll rewinds to the player's own decision point", () => {
    const session = new GameSession({ seed: 77 });
    step(session, 3, 24);
    const rollsBefore = session.state.rollCount;
    session.undoToPlayerRoll(0);
    expect(session.phase).toBe("awaiting-roll");
    expect(session.state.current).toBe(0);
    expect(session.state.rollCount).toBeLessThan(rollsBefore);
  });
});
