/**
 * @ur/ai — modular opponents for the Royal Game of Ur.
 *
 * Depends only on @ur/engine. Agents pick among engine-generated legal moves;
 * they cannot see future dice or bend a rule (difficulty never cheats).
 */

export { evaluate, DEFAULT_WEIGHTS, MASTER_WEIGHTS, WIN_SCORE, type EvalWeights } from "./eval";
export { bestMove, searchValue, type SearchOptions } from "./expectimax";
export {
  randomAgent,
  greedyAgent,
  searchAgent,
  masterAgent,
  type UrAgent,
  type AgentContext,
} from "./agents";
export { DIFFICULTIES, createAgent, type DifficultyId, type DifficultyInfo } from "./difficulty";
export { playGame, runMatch, type GameResult, type MatchResult } from "./match";
export { analyzeMoves, hintFor, type MoveAnalysis, type HintTag, type HintOptions } from "./hint";
