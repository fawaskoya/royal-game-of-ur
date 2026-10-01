import { describe, expect, it } from "vitest";
import { legalMoves } from "@ur/engine";
import type { StorageLike } from "@/lib/persistence/gameStorage";
import {
  bestDailyStreak,
  buildDailyPuzzle,
  dailyStreak,
  dateKeyUTC,
  loadDaily,
  rankOf,
  recordDaily,
} from "./daily";

const mem = (): StorageLike => {
  const m = new Map<string, string>();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v), removeItem: (k) => void m.delete(k) };
};

describe("daily puzzle", () => {
  it("is deterministic per date and differs across dates", () => {
    const a = buildDailyPuzzle("2026-10-01");
    const b = buildDailyPuzzle("2026-10-01");
    expect(JSON.stringify(a.state)).toBe(JSON.stringify(b.state));
    expect(a.ranking.map((r) => r.value)).toEqual(b.ranking.map((r) => r.value));
    const c = buildDailyPuzzle("2026-10-02");
    expect(JSON.stringify(c.state)).not.toBe(JSON.stringify(a.state));
  });

  it("always offers a real decision with a pending roll", () => {
    for (const day of ["2026-01-01", "2026-03-14", "2026-07-04", "2026-12-25", "2027-02-28"]) {
      const p = buildDailyPuzzle(day);
      expect(p.state.dice).not.toBeNull();
      expect(p.state.winner).toBeNull();
      expect(legalMoves(p.state).length).toBeGreaterThanOrEqual(2);
      expect(p.ranking.length).toBe(legalMoves(p.state).length);
    }
  });

  it("ranks the best move first", () => {
    const p = buildDailyPuzzle("2026-10-01");
    expect(rankOf(p, p.ranking[0]!.move)).toBe(1);
    expect(rankOf(p, p.ranking[p.ranking.length - 1]!.move)).toBe(p.ranking.length);
  });

  it("builds quickly (it runs when the panel opens)", () => {
    const t = performance.now();
    buildDailyPuzzle("2026-11-11");
    expect(performance.now() - t).toBeLessThan(1500);
  });
});

describe("daily record", () => {
  it("keeps the first answer of the day only", () => {
    const s = mem();
    expect(recordDaily("2026-10-01", { rank: 2, of: 3 }, s)).toBe(true);
    expect(recordDaily("2026-10-01", { rank: 1, of: 3 }, s)).toBe(false);
    expect(loadDaily(s)["2026-10-01"]).toEqual({ rank: 2, of: 3 });
  });

  it("counts streaks, including a day still open", () => {
    const r = {
      "2026-09-28": { rank: 1, of: 3 },
      "2026-09-29": { rank: 1, of: 3 },
      "2026-09-30": { rank: 2, of: 3 },
    };
    expect(dailyStreak(r, "2026-09-30")).toBe(3);
    expect(dailyStreak(r, "2026-10-01")).toBe(3); // today not yet played
    expect(dailyStreak(r, "2026-10-03")).toBe(0); // broken
    expect(bestDailyStreak({ ...r, "2026-09-20": { rank: 1, of: 2 } })).toBe(3);
  });

  it("survives corrupt storage", () => {
    const s = mem();
    s.setItem("ur:daily", "{nope");
    expect(loadDaily(s)).toEqual({});
    expect(dateKeyUTC(new Date("2026-10-01T23:59:59Z"))).toBe("2026-10-01");
  });
});
