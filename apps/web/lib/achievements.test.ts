import { describe, expect, it } from "vitest";
import type { MatchResult } from "@/lib/stats/matchResults";
import type { StorageLike } from "@/lib/persistence/gameStorage";
import { ACHIEVEMENTS, markSeen, markShared, newlyUnlocked, unlockedIds, type AchievementContext } from "./achievements";

const mem = (): StorageLike => {
  const m = new Map<string, string>();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v), removeItem: (k) => void m.delete(k) };
};

const win = (over: Partial<MatchResult> = {}): MatchResult => ({
  gameId: "g",
  completedAt: "2026-10-01T00:00:00Z",
  mode: { kind: "ai", human: 0, difficulty: "medium" },
  winner: 0,
  turns: 80,
  durationMs: 1000,
  captures: [3, 2],
  rosettes: [2, 2],
  ...over,
});
const base: AchievementContext = { results: [], tutorialCompleted: false, daily: {}, sharedGame: false };

describe("achievements", () => {
  it("has unique ids", () => {
    expect(new Set(ACHIEVEMENTS.map((a) => a.id)).size).toBe(ACHIEVEMENTS.length);
  });

  it("starts empty", () => {
    expect(unlockedIds(base)).toEqual([]);
  });

  it("unlocks from real results only", () => {
    const loss = win({ winner: 1 });
    expect(unlockedIds({ ...base, results: [loss] })).not.toContain("first-victory");
    const ids = unlockedIds({ ...base, results: [win()] });
    expect(ids).toContain("first-victory");
    expect(ids).toContain("beat-medium");
    expect(ids).not.toContain("beat-expert");
  });

  it("detects flawless, swift and rosette-rider per game", () => {
    const ids = unlockedIds({ ...base, results: [win({ captures: [1, 0], turns: 45, rosettes: [5, 1] })] });
    expect(ids).toEqual(expect.arrayContaining(["flawless", "swift", "rosette-rider"]));
    // A Dark-side human is judged on their own seat.
    const dark = win({
      mode: { kind: "ai", human: 1, difficulty: "easy" },
      winner: 1,
      captures: [0, 4],
      rosettes: [0, 5],
    });
    expect(unlockedIds({ ...base, results: [dark] })).toEqual(expect.arrayContaining(["flawless", "rosette-rider"]));
  });

  it("derives daily and tutorial achievements", () => {
    const daily = Object.fromEntries(
      Array.from({ length: 7 }, (_, i) => [`2026-09-${String(20 + i)}`, { rank: i === 0 ? 1 : 2, of: 3 }]),
    );
    const ids = unlockedIds({ ...base, daily, tutorialCompleted: true, sharedGame: true });
    expect(ids).toEqual(
      expect.arrayContaining(["daily-first", "daily-perfect", "daily-streak-7", "scholar", "storyteller"]),
    );
  });

  it("announces each unlock once", () => {
    const s = mem();
    const ctx = { ...base, results: [win()] };
    const first = newlyUnlocked(ctx, s);
    expect(first.length).toBeGreaterThan(0);
    markSeen(first, s);
    expect(newlyUnlocked(ctx, s)).toEqual([]);
    markShared(s);
    expect(newlyUnlocked({ ...ctx, sharedGame: true }, s)).toEqual(["storyteller"]);
  });
});
