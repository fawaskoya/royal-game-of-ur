/**
 * @ur/engine — pure, deterministic Royal Game of Ur rules engine.
 *
 * Invariants this package guarantees (and the rest of the codebase relies on):
 *   1. Zero runtime dependencies, zero UI or I/O knowledge.
 *   2. GameState is immutable, plain data, and JSON-serializable.
 *   3. Dice results are inputs to transitions, never internal effects —
 *      given the same inputs, every transition is bit-for-bit reproducible.
 *   4. Every gameplay decision (legality, captures, rosettes, winning)
 *      lives here and nowhere else.
 */

export type {
  PlayerId,
  DieValue,
  DiceRoll,
  Move,
  PassReason,
  RollEvent,
  MoveEvent,
  PassEvent,
  GameEvent,
  PathId,
  RulesetConfig,
  GameState,
  Phase,
} from "./types";

export {
  ENGINE_VERSION,
  STATE_FORMAT,
  REPLAY_FORMAT,
  PLAYERS,
  START_INDEX,
  DICE_PROBABILITIES,
  otherPlayer,
} from "./constants";

export { UrEngineError, type EngineErrorCode } from "./errors";

export {
  cellKey,
  getLayout,
  type Cell,
  type CellKey,
  type BoardCellInfo,
  type BoardLayout,
} from "./board";

export {
  FINKEL_RULESET,
  TOURNAMENT_RULESET,
  RULESET_PRESETS,
  createRuleset,
  validateRuleset,
} from "./ruleset";

export {
  createRng,
  rollDice,
  makeRoll,
  validateDiceRoll,
  rollDistribution,
  type Rng,
} from "./dice";

export {
  createGame,
  phaseOf,
  occupancy,
  finishedCount,
  startCount,
  serializeState,
  deserializeState,
  type Occupant,
} from "./state";

export {
  legalMoves,
  validateMove,
  applyRoll,
  applyMove,
  movablePieces,
  winnerOf,
  type MoveRejection,
  type MoveValidation,
} from "./rules";

export {
  buildStateFromEvents,
  undoLastRoll,
  exportReplay,
  serializeReplay,
  importReplay,
  replayStateAt,
  type Replay,
} from "./replay";

export { GameSession, type SessionOptions } from "./session";
