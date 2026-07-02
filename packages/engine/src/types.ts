/**
 * Core data types for the Royal Game of Ur engine.
 *
 * Everything here is plain, immutable, JSON-serializable data. The engine
 * never stores functions, class instances, or UI concerns inside game state.
 */

/** The two players. Player 0 is Light and moves first by default; player 1 is Dark. */
export type PlayerId = 0 | 1;

/** A single binary tetrahedral die shows 0 (unmarked corner up) or 1 (marked corner up). */
export type DieValue = 0 | 1;

/** The result of throwing the full set of tetrahedral dice. */
export interface DiceRoll {
  /** Individual die faces, in throw order. Length equals `RulesetConfig.diceCount`. */
  readonly values: readonly DieValue[];
  /** Sum of the die faces — the number of squares to move (0 means the turn is lost). */
  readonly total: number;
}

/**
 * A move of one piece along its owner's path.
 *
 * Path indices are per-player: 0 is the start pool (off board), 1..pathLength
 * are on-board squares, and pathLength + 1 is the finish (borne off).
 */
export interface Move {
  readonly player: PlayerId;
  /** Index of the piece in the player's `positions` array (0-based). */
  readonly piece: number;
  /** Path index the piece moves from. */
  readonly from: number;
  /** Path index the piece moves to. */
  readonly to: number;
}

/** Why a turn was forfeited without a move. */
export type PassReason = "rolled-zero" | "no-legal-moves";

/** A dice throw, recorded in game history. */
export interface RollEvent {
  readonly type: "roll";
  readonly player: PlayerId;
  readonly values: readonly DieValue[];
  readonly total: number;
}

/** A completed move, recorded in game history with everything a UI or verifier needs. */
export interface MoveEvent {
  readonly type: "move";
  readonly player: PlayerId;
  readonly piece: number;
  readonly from: number;
  readonly to: number;
  /** The opposing piece sent back to start, if this move captured one. */
  readonly capture: { readonly player: PlayerId; readonly piece: number } | null;
  /** True when the destination square is a rosette. */
  readonly rosette: boolean;
  /** True when the mover keeps the turn (rosette rule). */
  readonly extraTurn: boolean;
  /** True when the piece was borne off the board by this move. */
  readonly finished: boolean;
}

/** A forfeited turn, recorded in game history. */
export interface PassEvent {
  readonly type: "pass";
  readonly player: PlayerId;
  readonly reason: PassReason;
}

/** Every entry in a game's history. The event log plus the ruleset fully determines a game. */
export type GameEvent = RollEvent | MoveEvent | PassEvent;

/** Identifier for a board path layout. Only the classic Finkel path ships today. */
export type PathId = "finkel";

/**
 * A complete, self-contained description of the rules in force for one game.
 * Rulesets are immutable and embedded in game state so that serialized games
 * replay identically forever.
 */
export interface RulesetConfig {
  /** Stable identifier, e.g. "finkel". */
  readonly id: string;
  /** Human-readable name. */
  readonly name: string;
  /** Pieces per player (7 in the classic game). */
  readonly piecesPerPlayer: number;
  /** Number of binary tetrahedral dice thrown per turn (4 in the classic game). */
  readonly diceCount: number;
  /** Which board path the pieces travel. */
  readonly pathId: PathId;
  /** Landing on a rosette grants another throw. */
  readonly rosettesGrantExtraTurn: boolean;
  /** A piece on a contested rosette cannot be captured (the square is blocked instead). */
  readonly safeRosettes: boolean;
  /** Bearing off requires the exact throw; overshooting the exit is not a legal move. */
  readonly exactBearOff: boolean;
}

/**
 * The complete state of a game. Immutable: every transition returns a new state.
 *
 * `positions[player][piece]` is that piece's path index:
 *   0 = start pool, 1..pathLength = on board, pathLength + 1 = finished.
 */
export interface GameState {
  readonly ruleset: RulesetConfig;
  readonly positions: readonly [readonly number[], readonly number[]];
  /** Whose turn it is (to roll or to move, depending on `dice`). */
  readonly current: PlayerId;
  /** The pending roll awaiting a move, or null when the current player must roll. */
  readonly dice: DiceRoll | null;
  readonly winner: PlayerId | null;
  /** Number of rolls made so far (a simple game-length clock). */
  readonly rollCount: number;
  /** Full event log from the first roll. Replayable and verifiable. */
  readonly history: readonly GameEvent[];
}

/** The three phases of play, derived from state by `phaseOf`. */
export type Phase = "awaiting-roll" | "awaiting-move" | "game-over";
