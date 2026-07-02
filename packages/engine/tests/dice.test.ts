import { describe, expect, it } from "vitest";
import { createRng, makeRoll, rollDice, rollDistribution, validateDiceRoll, UrEngineError } from "../src";

describe("seeded rng", () => {
  it("produces an identical sequence for an identical seed", () => {
    const a = createRng(42);
    const b = createRng(42);
    for (let i = 0; i < 100; i++) expect(a.next()).toBe(b.next());
  });

  it("resumes exactly from a saved state", () => {
    const a = createRng(7);
    for (let i = 0; i < 10; i++) a.next();
    const saved = a.getState();
    const tail = Array.from({ length: 10 }, () => a.next());
    const b = createRng(0);
    b.setState(saved);
    expect(Array.from({ length: 10 }, () => b.next())).toEqual(tail);
  });
});

describe("dice", () => {
  it("rolls values in {0,1} with a matching total", () => {
    const rng = createRng(1);
    for (let i = 0; i < 200; i++) {
      const roll = rollDice(rng);
      expect(roll.values).toHaveLength(4);
      for (const v of roll.values) expect(v === 0 || v === 1).toBe(true);
      expect(roll.total).toBe(roll.values.reduce<number>((s, v) => s + v, 0));
    }
  });

  it("matches the binomial distribution over many throws", () => {
    const rng = createRng(2026);
    const counts = [0, 0, 0, 0, 0];
    const n = 20000;
    for (let i = 0; i < n; i++) counts[rollDice(rng).total]!++;
    const expected = [1 / 16, 4 / 16, 6 / 16, 4 / 16, 1 / 16];
    counts.forEach((count, total) => {
      expect(Math.abs(count / n - expected[total]!)).toBeLessThan(0.02);
    });
  });

  it("computes the exact roll distribution", () => {
    expect(rollDistribution(4)).toEqual([1 / 16, 4 / 16, 6 / 16, 4 / 16, 1 / 16]);
    expect(rollDistribution(1)).toEqual([1 / 2, 1 / 2]);
  });

  it("builds canonical rolls and rejects impossible totals", () => {
    expect(makeRoll(3)).toEqual({ values: [1, 1, 1, 0], total: 3 });
    expect(makeRoll(0).total).toBe(0);
    expect(() => makeRoll(5)).toThrow(UrEngineError);
    expect(() => makeRoll(-1)).toThrow(UrEngineError);
    expect(() => makeRoll(1.5)).toThrow(UrEngineError);
  });

  it("validates roll structure", () => {
    expect(() => validateDiceRoll({ values: [1, 1], total: 2 }, 4)).toThrow(UrEngineError);
    expect(() => validateDiceRoll({ values: [1, 1, 1, 2 as 0 | 1], total: 5 }, 4)).toThrow(UrEngineError);
    expect(() => validateDiceRoll({ values: [1, 1, 0, 0], total: 3 }, 4)).toThrow(UrEngineError);
    expect(() => validateDiceRoll(makeRoll(2), 4)).not.toThrow();
  });
});
