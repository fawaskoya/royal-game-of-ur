import { describe, expect, it } from "vitest";
import { createAgent, runMatch } from "../src";

/**
 * Ladder validation: each tier must clearly beat lower tiers. Matches are
 * fully seeded, so these are deterministic regression checks, with thresholds
 * set well under measured rates (easy 90%, medium 99%, hard-vs-medium 70%).
 * Expert (depth 3) is exercised in agents.test; its full ladder run lives in
 * the CLI bench command to keep the unit suite fast.
 */
describe("difficulty ladder strength", () => {
  it("easy convincingly beats beginner", () => {
    const result = runMatch(() => createAgent("easy"), () => createAgent("beginner"), {
      games: 100,
      seed: 12345,
    });
    expect(result.aWinRate).toBeGreaterThanOrEqual(0.75);
  });

  it("medium crushes beginner", () => {
    const result = runMatch(() => createAgent("medium"), () => createAgent("beginner"), {
      games: 100,
      seed: 12345,
    });
    expect(result.aWinRate).toBeGreaterThanOrEqual(0.9);
  });

  it("medium clearly beats easy", () => {
    const result = runMatch(() => createAgent("medium"), () => createAgent("easy"), {
      games: 100,
      seed: 12345,
    });
    expect(result.aWinRate).toBeGreaterThanOrEqual(0.6);
  });

  it("hard beats medium", () => {
    const result = runMatch(() => createAgent("hard"), () => createAgent("medium"), {
      games: 40,
      seed: 12345,
    });
    expect(result.aWinRate).toBeGreaterThanOrEqual(0.55);
  });
});
