import { describe, expect, it } from "vitest";
import { GameSession, createRng, replayStateAt } from "@ur/engine";
import type { StorageLike } from "@/lib/persistence/gameStorage";
import { archiveGame, deleteArchiveEntry, loadArchive, replayOf } from "./archive";
import { INITIAL_RATING, expectedScore, ratingTrajectory, updateRating } from "./rating/elo";
import { trainingRating } from "./rating/training";
import type { MatchResult } from "@/lib/stats/matchResults";

function memoryStorage(): StorageLike {
  const map = new Map<string, string>();
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
    removeItem: (k) => void map.delete(k),
  };
}

function finishedGame(seed: number): GameSession {
  const session = new GameSession({ seed });
  const rng = createRng(seed ^ 0xabc);
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

describe("archive", () => {
  it("stores finished games as verifiable replays and caps the store", () => {
    const storage = memoryStorage();
    const session = finishedGame(9);
    expect(archiveGame(session.state, { kind: "pvp" }, "g-9", storage)).toBe(true);

    const entries = loadArchive(storage);
    expect(entries.length).toBe(1);
    expect(entries[0]!.winner).toBe(session.state.winner);
    expect(entries[0]!.turns).toBe(session.state.rollCount);

    // The stored replay re-verifies through the engine and ends decided.
    const replay = replayOf(entries[0]!);
    expect(replay).not.toBeNull();
    const rebuilt = replayStateAt(replay!);
    expect(rebuilt.winner).toBe(session.state.winner);
  });

  it("refuses unfinished games, dedupes by id, and deletes", () => {
    const storage = memoryStorage();
    const live = new GameSession({ seed: 2 });
    expect(archiveGame(live.state, { kind: "pvp" }, "live", storage)).toBe(false);

    const done = finishedGame(4);
    archiveGame(done.state, { kind: "pvp" }, "dup", storage);
    archiveGame(done.state, { kind: "pvp" }, "dup", storage);
    expect(loadArchive(storage).length).toBe(1);

    deleteArchiveEntry("dup", storage);
    expect(loadArchive(storage)).toEqual([]);
  });

  it("ignores corrupt payloads", () => {
    const storage = memoryStorage();
    storage.setItem("ur:archive", "{nope");
    expect(loadArchive(storage)).toEqual([]);
    storage.setItem("ur:archive", JSON.stringify({ version: 99, entries: [{}] }));
    expect(loadArchive(storage)).toEqual([]);
  });
});

describe("elo", () => {
  it("expected score is symmetric and rating updates are zero-sum-ish", () => {
    expect(expectedScore(1000, 1000)).toBeCloseTo(0.5);
    expect(expectedScore(1200, 1000) + expectedScore(1000, 1200)).toBeCloseTo(1);
    const up = updateRating(1000, 1000, 1, 0);
    const down = updateRating(1000, 1000, 0, 0);
    expect(up).toBeGreaterThan(1000);
    expect(down).toBeLessThan(1000);
  });

  it("trajectory rises on wins, falls on losses, and shrinks K after provisional games", () => {
    const wins = ratingTrajectory(Array.from({ length: 25 }, () => ({ opponent: 1000, won: true })));
    expect(wins.current).toBeGreaterThan(INITIAL_RATING);
    // Later deltas are damped both by K drop and by rising expected score.
    expect(Math.abs(wins.points[24]!.delta)).toBeLessThan(Math.abs(wins.points[0]!.delta));

    const losses = ratingTrajectory([{ opponent: 600, won: false }]);
    expect(losses.current).toBeLessThan(INITIAL_RATING);
  });

  it("training rating reads only vs-AI games from results", () => {
    const results: MatchResult[] = [
      {
        gameId: "a",
        completedAt: new Date().toISOString(),
        mode: { kind: "ai", human: 0, difficulty: "medium" },
        winner: 0,
        turns: 100,
        durationMs: 1,
        captures: [0, 0],
        rosettes: [0, 0],
      },
      {
        gameId: "b",
        completedAt: new Date().toISOString(),
        mode: { kind: "pvp" },
        winner: 1,
        turns: 100,
        durationMs: 1,
        captures: [0, 0],
        rosettes: [0, 0],
      },
    ];
    const rating = trainingRating(results);
    expect(rating.games).toBe(1);
    expect(rating.current).toBeGreaterThan(INITIAL_RATING); // won vs medium (1000 anchor)
    expect(rating.lastDelta).not.toBeNull();
  });
});
