import type { RulesetConfig } from "./types";
import { UrEngineError } from "./errors";

/**
 * The classic rules as reconstructed by Irving Finkel for the British Museum:
 * 7 pieces, 4 binary tetrahedral dice, rosettes grant an extra throw, a piece
 * on the contested central rosette is safe, and bearing off needs an exact throw.
 */
export const FINKEL_RULESET: RulesetConfig = Object.freeze({
  id: "finkel",
  name: "Classic — Irving Finkel / British Museum",
  piecesPerPlayer: 7,
  diceCount: 4,
  pathId: "finkel",
  rosettesGrantExtraTurn: true,
  safeRosettes: true,
  exactBearOff: true,
});

/** Competitive preset. Rule-identical to Finkel today; kept separate so it can diverge. */
export const TOURNAMENT_RULESET: RulesetConfig = Object.freeze({
  ...FINKEL_RULESET,
  id: "tournament",
  name: "Tournament",
});

export const RULESET_PRESETS: Readonly<Record<string, RulesetConfig>> = Object.freeze({
  finkel: FINKEL_RULESET,
  tournament: TOURNAMENT_RULESET,
});

export function validateRuleset(ruleset: RulesetConfig): void {
  const fail = (message: string): never => {
    throw new UrEngineError("INVALID_RULESET", message);
  };
  if (!ruleset.id) fail("ruleset.id is required");
  if (!Number.isInteger(ruleset.piecesPerPlayer) || ruleset.piecesPerPlayer < 1 || ruleset.piecesPerPlayer > 10) {
    fail(`piecesPerPlayer must be an integer in 1..10, got ${ruleset.piecesPerPlayer}`);
  }
  if (!Number.isInteger(ruleset.diceCount) || ruleset.diceCount < 1 || ruleset.diceCount > 8) {
    fail(`diceCount must be an integer in 1..8, got ${ruleset.diceCount}`);
  }
  if (ruleset.pathId !== "finkel") {
    fail(`unknown pathId "${String(ruleset.pathId)}" (available: finkel)`);
  }
}

/** Build a custom house-rules variant on top of the classic defaults. */
export function createRuleset(
  overrides: Partial<RulesetConfig> & Pick<RulesetConfig, "id" | "name">,
): RulesetConfig {
  const ruleset: RulesetConfig = Object.freeze({ ...FINKEL_RULESET, ...overrides });
  validateRuleset(ruleset);
  return ruleset;
}
