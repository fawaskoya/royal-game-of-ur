import { describe, expect, it } from "vitest";
import { GameSession, createRng, exportReplay } from "@ur/engine";
import { hintFor } from "@ur/ai";
import { accuracyFromMeanLoss, analyzeGame, analyzeGameAsync, classify, countDecisions } from "./analysis";

/** Finish a game where the mover picks uniformly at random. */
function randomGame(seed: number) {
  const session = new GameSession({ seed });
  const rng = createRng(seed ^ 0xfeed);
  let guard = 0;
  while (session.state.winner === null) {
    if (++guard > 4000) throw new Error("no terminate");
    if (session.phase === "awaiting-roll") session.roll();
    else {
      const moves = session.legalMoves();
      session.move(moves[Math.floor(rng.next() * moves.length)]!);
    }
  }
  return session;
}

/** Finish a game where BOTH sides always play the hint engine's best at `depth`. */
function bestPlayGame(seed: number, depth: number) {
  const session = new GameSession({ seed });
  let guard = 0;
  while (session.state.winner === null) {
    if (++guard > 4000) throw new Error("no terminate");
    if (session.phase === "awaiting-roll") session.roll();
    else session.move(hintFor(session.state, { depth })!.move);
  }
  return session;
}

describe("classification bands", () => {
  it("maps losses to the documented bands", () => {
    expect(classify(0)).toBe("best");
    expect(classify(-5)).toBe("good");
    expect(classify(-20)).toBe("inaccuracy");
    expect(classify(-50)).toBe("mistake");
    expect(classify(-200)).toBe("blunder");
  });

  it("accuracy curve is monotone and bounded", () => {
    expect(accuracyFromMeanLoss(0)).toBe(100);
    expect(accuracyFromMeanLoss(10)).toBeLessThan(100);
    expect(accuracyFromMeanLoss(60)).toBeLessThan(accuracyFromMeanLoss(10));
    expect(accuracyFromMeanLoss(1000)).toBeGreaterThanOrEqual(0);
  });
});

describe("analyzeGame", () => {
  it("grades exactly the multi-choice decisions, with legal moves and non-positive deltas", () => {
    const session = randomGame(31);
    const replay = exportReplay(session.state);
    const analysis = analyzeGame(replay, { depth: 1 });

    expect(analysis.grades.length).toBe(countDecisions(replay));
    expect(analysis.grades.length).toBeGreaterThan(0);
    for (const grade of analysis.grades) {
      expect(grade.delta).toBeLessThanOrEqual(1e-9);
      expect(grade.classification).toBe(classify(grade.delta));
      expect(grade.eventIndex).toBeGreaterThanOrEqual(0);
      expect(replay.events[grade.eventIndex]!.type).toBe("move");
    }
    for (const player of [0, 1] as const) {
      const acc = analysis.accuracy[player];
      if (acc !== null) {
        expect(acc).toBeGreaterThanOrEqual(0);
        expect(acc).toBeLessThanOrEqual(100);
      }
    }
  });

  it("scores perfect play as 100 accuracy with only best moves", () => {
    const session = bestPlayGame(7, 1);
    const analysis = analyzeGame(exportReplay(session.state), { depth: 1 });
    expect(analysis.accuracy[0]).toBe(100);
    expect(analysis.accuracy[1]).toBe(100);
    expect(analysis.counts[0]!.blunder + analysis.counts[1]!.blunder).toBe(0);
    expect(analysis.keyMoments.length).toBe(0);
    for (const grade of analysis.grades) expect(grade.classification).toBe("best");
  });

  it("random play scores worse than best play", () => {
    const randomAnalysis = analyzeGame(exportReplay(randomGame(11).state), { depth: 1 });
    const bestAnalysis = analyzeGame(exportReplay(bestPlayGame(11, 1).state), { depth: 1 });
    const worst = Math.min(randomAnalysis.accuracy[0] ?? 100, randomAnalysis.accuracy[1] ?? 100);
    expect(worst).toBeLessThan(100);
    expect(bestAnalysis.accuracy[0]).toBe(100);
  });

  it("async variant matches the sync result and reports progress", async () => {
    const replay = exportReplay(randomGame(5).state);
    let calls = 0;
    const [sync, async_] = [
      analyzeGame(replay, { depth: 1 }),
      await analyzeGameAsync(replay, { depth: 1, onProgress: () => calls++ }),
    ];
    expect(async_.grades).toEqual(sync.grades);
    expect(calls).toBe(sync.grades.length);
  });

  it("forced-only replays produce no grades and null accuracy", () => {
    // At game start the sole legal move is the (deduplicated) entry, so a
    // one-move replay contains no real decision.
    const session = new GameSession({ seed: 3 });
    while (session.state.history.length === 0 || session.phase === "awaiting-roll") {
      if (session.phase === "awaiting-roll") session.roll();
      else break;
    }
    const moves = session.legalMoves();
    if (moves.length > 0) {
      expect(moves.length).toBe(1); // entry is the only option on an empty board
      session.move(moves[0]!);
    }
    const analysis = analyzeGame(exportReplay(session.state), { depth: 1 });
    expect(analysis.grades.length).toBe(0);
    expect(analysis.accuracy).toEqual([null, null]);
  });
});
