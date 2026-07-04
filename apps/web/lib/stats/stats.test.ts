import { describe, expect, it } from "vitest";
import { GameSession, createRng } from "@ur/engine";
import type { GameMode } from "@/lib/useGame";
import type { StorageLike } from "@/lib/persistence/gameStorage";
import {
  clearResults,
  loadResults,
  recordResult,
  resultFromGame,
  summarizeStats,
  type MatchResult,
} from "./matchResults";

function memoryStorage(): StorageLike {
  const map = new Map<string, string>();
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
    removeItem: (k) => void map.delete(k),
  };
}

/** Play a full seeded random game to completion. */
function finishedGame(seed: number): GameSession {
  const session = new GameSession({ seed });
  const rng = createRng(seed ^ 0xbeef);
  let guard = 0;
  while (session.state.winner === null) {
    if (++guard > 4000) throw new Error("game did not terminate");
    if (session.phase === "awaiting-roll") session.roll();
    else {
      const moves = session.legalMoves();
      session.move(moves[Math.floor(rng.next() * moves.length)]!);
    }
  }
  return session;
}

const AI_MODE: GameMode = { kind: "ai", human: 0, difficulty: "medium" };

describe("resultFromGame", () => {
  it("computes an honest result from the event log", () => {
    const session = finishedGame(11);
    const result = resultFromGame(session.state, AI_MODE, "g1", new Date(Date.now() - 60_000).toISOString());
    expect(result).not.toBeNull();
    expect(result!.winner).toBe(session.state.winner);
    expect(result!.turns).toBe(session.state.rollCount);
    expect(result!.durationMs).toBeGreaterThanOrEqual(60_000);
    const captures = session.state.history.filter((e) => e.type === "move" && e.capture);
    expect(result!.captures[0]! + result!.captures[1]!).toBe(captures.length);
  });

  it("returns null for an unfinished game", () => {
    const session = new GameSession({ seed: 1 });
    expect(resultFromGame(session.state, AI_MODE, "g", new Date().toISOString())).toBeNull();
  });
});

describe("results store + summary", () => {
  it("records, caps corruption, and aggregates from the human perspective", () => {
    const storage = memoryStorage();
    const wins: MatchResult[] = [];
    for (const seed of [11, 22, 33]) {
      const session = finishedGame(seed);
      const result = resultFromGame(session.state, AI_MODE, `g${seed}`, new Date().toISOString())!;
      recordResult(result, storage);
      wins.push(result);
    }
    // one pvp game — must not count toward the "you vs AI" summary
    const pvp = finishedGame(44);
    recordResult(resultFromGame(pvp.state, { kind: "pvp" }, "gp", new Date().toISOString())!, storage);

    const results = loadResults(storage);
    expect(results.length).toBe(4);

    const summary = summarizeStats(results);
    expect(summary.games).toBe(3);
    const expectedWins = wins.filter((r) => r.winner === 0).length;
    expect(summary.wins).toBe(expectedWins);
    expect(summary.losses).toBe(3 - expectedWins);
    expect(summary.byDifficulty["medium"]?.games).toBe(3);
    expect(Math.abs(summary.currentStreak)).toBeGreaterThanOrEqual(1);

    clearResults(storage);
    expect(loadResults(storage)).toEqual([]);
  });

  it("ignores corrupt payloads", () => {
    const storage = memoryStorage();
    storage.setItem("ur:results", "{nope");
    expect(loadResults(storage)).toEqual([]);
    storage.setItem("ur:results", JSON.stringify({ version: 99, results: [{}] }));
    expect(loadResults(storage)).toEqual([]);
  });
});
