/**
 * The rules engine. Every gameplay transition in every client — local play,
 * AI search, replays, and (later) the authoritative server — goes through
 * `applyRoll` and `applyMove`. Nothing outside this package decides legality.
 *
 * All functions are pure: they never mutate their inputs and are fully
 * deterministic given their inputs (dice results are inputs, not effects).
 */
import type { DiceRoll, GameState, Move, MoveEvent, PassReason, PlayerId } from "./types";
import { getLayout } from "./board";
import { occupancy, phaseOf } from "./state";
import { otherPlayer } from "./constants";
import { validateDiceRoll } from "./dice";
import { UrEngineError } from "./errors";

/** Machine-readable reasons a proposed move is rejected. */
export type MoveRejection =
  | "GAME_OVER"
  | "DICE_NOT_ROLLED"
  | "NOT_YOUR_TURN"
  | "INVALID_PIECE"
  | "STALE_MOVE"
  | "PIECE_FINISHED"
  | "ZERO_ROLL"
  | "BAD_TARGET"
  | "EXACT_ROLL_REQUIRED"
  | "BLOCKED_BY_OWN_PIECE"
  | "SQUARE_PROTECTED";

export type MoveValidation =
  | { readonly ok: true; readonly move: Move }
  | { readonly ok: false; readonly code: MoveRejection; readonly message: string };

/**
 * All legal moves for the current player with the pending roll.
 * Entry moves are de-duplicated: only the lowest-numbered piece in the start
 * pool is listed, since every start piece produces an identical move.
 */
export function legalMoves(state: GameState): Move[] {
  if (phaseOf(state) !== "awaiting-move") return [];
  const roll = state.dice!.total;
  if (roll === 0) return [];

  const layout = getLayout(state.ruleset);
  const occ = occupancy(state);
  const player = state.current;
  const moves: Move[] = [];
  let entryListed = false;

  state.positions[player].forEach((from, piece) => {
    if (from === layout.finishIndex) return;
    if (from === layout.startIndex) {
      if (entryListed) return;
      entryListed = true;
    }
    const rawTo = from + roll;
    if (rawTo > layout.finishIndex && state.ruleset.exactBearOff) return;
    const to = Math.min(rawTo, layout.finishIndex);
    if (to !== layout.finishIndex) {
      const occupant = occ.get(layout.keyAt(player, to)!);
      if (occupant) {
        if (occupant.player === player) return;
        if (state.ruleset.safeRosettes && layout.isRosette(player, to)) return;
      }
    }
    moves.push({ player, piece, from, to });
  });
  return moves;
}

/** Validate a proposed move with a specific, user-explainable rejection reason. */
export function validateMove(state: GameState, move: Move): MoveValidation {
  const reject = (code: MoveRejection, message: string): MoveValidation => ({ ok: false, code, message });

  if (state.winner !== null) return reject("GAME_OVER", "The game is over.");
  if (state.dice === null) return reject("DICE_NOT_ROLLED", "Roll the dice before moving.");
  if (move.player !== state.current) return reject("NOT_YOUR_TURN", `It is player ${state.current}'s turn.`);

  const layout = getLayout(state.ruleset);
  if (!Number.isInteger(move.piece) || move.piece < 0 || move.piece >= state.ruleset.piecesPerPlayer) {
    return reject("INVALID_PIECE", `Piece must be in 0..${state.ruleset.piecesPerPlayer - 1}.`);
  }
  const actualFrom = state.positions[move.player][move.piece]!;
  if (actualFrom !== move.from) {
    return reject("STALE_MOVE", `Piece ${move.piece} is at ${actualFrom}, not ${move.from}.`);
  }
  if (actualFrom === layout.finishIndex) return reject("PIECE_FINISHED", "That piece has already been borne off.");

  const roll = state.dice.total;
  if (roll === 0) return reject("ZERO_ROLL", "A roll of zero cannot move.");
  const rawTo = actualFrom + roll;
  if (rawTo > layout.finishIndex && state.ruleset.exactBearOff) {
    return reject("EXACT_ROLL_REQUIRED", "Bearing off requires the exact throw.");
  }
  const to = Math.min(rawTo, layout.finishIndex);
  if (to !== move.to) return reject("BAD_TARGET", `A roll of ${roll} moves this piece to ${to}, not ${move.to}.`);

  if (to !== layout.finishIndex) {
    const occupant = occupancy(state).get(layout.keyAt(move.player, to)!);
    if (occupant) {
      if (occupant.player === move.player) {
        return reject("BLOCKED_BY_OWN_PIECE", "One of your own pieces is on that square.");
      }
      if (state.ruleset.safeRosettes && layout.isRosette(move.player, to)) {
        return reject("SQUARE_PROTECTED", "A piece on that rosette cannot be captured.");
      }
    }
  }
  return { ok: true, move: { player: move.player, piece: move.piece, from: actualFrom, to } };
}

/* ------------------------------------------------------------------ *
 *  Primitive transitions.
 *
 *  These apply exactly one history event with no composition, so a replay
 *  can re-execute a recorded event stream verbatim. They are exported for
 *  the replay module but are not part of the public engine API.
 * ------------------------------------------------------------------ */

/** Record a roll and enter awaiting-move. Does not auto-pass. */
export function withRoll(state: GameState, roll: DiceRoll): GameState {
  if (state.winner !== null) throw new UrEngineError("GAME_OVER", "cannot roll: the game is over");
  if (state.dice !== null) throw new UrEngineError("NOT_AWAITING_ROLL", "cannot roll: a move is pending");
  validateDiceRoll(roll, state.ruleset.diceCount);
  return {
    ...state,
    dice: roll,
    rollCount: state.rollCount + 1,
    history: [...state.history, { type: "roll", player: state.current, values: roll.values, total: roll.total }],
  };
}

/** Record a forfeited turn and hand the dice to the opponent. */
export function withPass(state: GameState, reason: PassReason): GameState {
  if (state.dice === null) throw new UrEngineError("NOT_AWAITING_ROLL", "cannot pass: no roll is pending");
  return {
    ...state,
    dice: null,
    current: otherPlayer(state.current),
    history: [...state.history, { type: "pass", player: state.current, reason }],
  };
}

/** Apply a move that has already been validated. */
export function withMove(state: GameState, move: Move): GameState {
  const layout = getLayout(state.ruleset);
  const player = move.player;
  const opponent = otherPlayer(player);
  const positions: [number[], number[]] = [[...state.positions[0]], [...state.positions[1]]];
  positions[player][move.piece] = move.to;

  let capture: MoveEvent["capture"] = null;
  if (move.to !== layout.finishIndex) {
    const key = layout.keyAt(player, move.to)!;
    const capturedPiece = state.positions[opponent].findIndex(
      (index) => layout.keyAt(opponent, index) === key,
    );
    if (capturedPiece !== -1) {
      positions[opponent][capturedPiece] = layout.startIndex;
      capture = { player: opponent, piece: capturedPiece };
    }
  }

  const rosette = move.to !== layout.finishIndex && layout.isRosette(player, move.to);
  const finished = move.to === layout.finishIndex;
  const winner = positions[player].every((index) => index === layout.finishIndex) ? player : null;
  const extraTurn = winner === null && rosette && state.ruleset.rosettesGrantExtraTurn;

  const event: MoveEvent = {
    type: "move",
    player,
    piece: move.piece,
    from: move.from,
    to: move.to,
    capture,
    rosette,
    extraTurn,
    finished,
  };
  return {
    ...state,
    positions,
    dice: null,
    current: winner !== null || extraTurn ? player : opponent,
    winner,
    history: [...state.history, event],
  };
}

/* ------------------------------------------------------------------ *
 *  Public transitions.
 * ------------------------------------------------------------------ */

/**
 * Apply a dice roll. If the roll leaves no legal move (a zero, or every
 * target blocked), the forced pass is applied in the same transition — the
 * returned state is always either awaiting-move or awaiting-roll for the
 * opponent. Both events land in history so UIs can animate the sequence.
 */
export function applyRoll(state: GameState, roll: DiceRoll): GameState {
  let next = withRoll(state, roll);
  if (legalMoves(next).length === 0) {
    next = withPass(next, roll.total === 0 ? "rolled-zero" : "no-legal-moves");
  }
  return next;
}

/** Validate and apply a move. Throws ILLEGAL_MOVE with a specific reason if rejected. */
export function applyMove(state: GameState, move: Move): GameState {
  const validation = validateMove(state, move);
  if (!validation.ok) {
    throw new UrEngineError("ILLEGAL_MOVE", `${validation.message} [${validation.code}]`);
  }
  return withMove(state, validation.move);
}

/** Convenience: pieces of the current player that have at least one legal move. */
export function movablePieces(state: GameState): Move[] {
  return legalMoves(state);
}

/** The winner, or null while the game is live. */
export function winnerOf(state: GameState): PlayerId | null {
  return state.winner;
}
