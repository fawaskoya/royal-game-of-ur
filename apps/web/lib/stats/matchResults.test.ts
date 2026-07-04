import { describe, expect, it } from "vitest";
import type { MatchResult } from "./matchResults";
import { loadResults, recordResult, summarizeStats } from "./matchResults";
import type { StorageLike } from "@/lib/persistence/gameStorage";

function memoryStorage(): StorageLike {
  const map = new Map<string, string>();
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
    removeItem: (k) => void map.delete(k),
  };
}

function aiResult(overrides: Partial<MatchResult> & { winner: 0 | 1 }): MatchResult {
  return {
    gameId: Math.random().toString(36).slice(2),
    completedAt: new Date().toISOString(),
    mode: { kind: "ai", human: 0, difficulty: "medium" },
    turns: 100,
    durationMs: 120_000,
    captures: [3, 2],
    rosettes: [5, 4],
    ...overrides,
  };
}

describe("summarizeStats", () => {
  it("aggregates wins, streaks, and per-difficulty from the human's perspective", () => {
    const results: MatchResult[] = [
      aiResult({ winner: 0, turns: 90, durationMs: 60_000 }), // win
      aiResult({ winner: 0, turns: 80, durationMs: 50_000 }), // win (streak 2)
      aiResult({ winner: 1 }), // loss
      aiResult({ winner: 0, mode: { kind: "ai", human: 0, difficulty: "hard" } }), // win
      // human seated as Dark, Dark wins ⇒ win for the human
      aiResult({ winner: 1, mode: { kind: "ai", human: 1, difficulty: "master" } }),
      // pvp/watch games are excluded entirely
      { ...aiResult({ winner: 0 }), mode: { kind: "pvp" } },
      { ...aiResult({ winner: 1 }), mode: { kind: "watch", light: "expert", dark: "medium" } },
    ];
    const s = summarizeStats(results);
    expect(s.games).toBe(5);
    expect(s.wins).toBe(4);
    expect(s.losses).toBe(1);
    expect(s.winRate).toBeCloseTo(0.8);
    expect(s.bestStreak).toBe(2);
    expect(s.currentStreak).toBe(2); // last two ai games were wins
    expect(s.fastestWinMs).toBe(50_000);
    expect(s.fewestTurnsWin).toBe(80);
    expect(s.byDifficulty.medium).toEqual({ games: 3, wins: 2 });
    expect(s.byDifficulty.hard).toEqual({ games: 1, wins: 1 });
    expect(s.byDifficulty.master).toEqual({ games: 1, wins: 1 });
  });

  it("captures made/suffered follow the human's seat", () => {
    const s = summarizeStats([
      aiResult({ winner: 0, captures: [7, 3] }), // human Light: made 7, suffered 3
      aiResult({ winner: 1, mode: { kind: "ai", human: 1, difficulty: "easy" }, captures: [2, 6] }), // human Dark: made 6, suffered 2
    ]);
    expect(s.capturesMade).toBe(13);
    expect(s.capturesSuffered).toBe(5);
  });

  it("is empty-safe", () => {
    const s = summarizeStats([]);
    expect(s.games).toBe(0);
    expect(s.winRate).toBe(0);
    expect(s.fastestWinMs).toBeNull();
  });
});

describe("results storage", () => {
  it("round-trips and survives junk", () => {
    const storage = memoryStorage();
    expect(loadResults(storage)).toEqual([]);
    const result = aiResult({ winner: 0 });
    expect(recordResult(result, storage)).toBe(true);
    expect(loadResults(storage)).toHaveLength(1);

    storage.setItem("ur:results", "{broken");
    expect(loadResults(storage)).toEqual([]);
    storage.setItem("ur:results", JSON.stringify({ version: 99, results: [result] }));
    expect(loadResults(storage)).toEqual([]);
  });
});
