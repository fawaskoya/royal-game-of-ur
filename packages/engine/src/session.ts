/**
 * GameSession: a small convenience wrapper for local play (CLI, web client,
 * tests). It owns a seeded RNG and the current state, and funnels everything
 * through the pure rules functions. Networked play will not use sessions —
 * the server owns the dice there.
 */
import type { GameState, Move, PlayerId, RulesetConfig } from "./types";
import { createGame, phaseOf, serializeState, deserializeState } from "./state";
import { applyMove, applyRoll, legalMoves } from "./rules";
import { undoLastRoll } from "./replay";
import { createRng, rollDice, type Rng } from "./dice";
import { FINKEL_RULESET } from "./ruleset";
import { UrEngineError } from "./errors";

export interface SessionOptions {
  readonly ruleset?: RulesetConfig;
  /** Seed for the dice RNG. Omit for a random seed; the seed used is always exposed. */
  readonly seed?: number;
}

interface SessionSnapshot {
  readonly format: "ur-session@1";
  readonly seed: number;
  readonly rngState: number;
  readonly state: string;
}

export class GameSession {
  readonly seed: number;
  #rng: Rng;
  #state: GameState;

  constructor(options: SessionOptions = {}) {
    this.seed = options.seed ?? Math.floor(Math.random() * 0x7fffffff);
    this.#rng = createRng(this.seed);
    this.#state = createGame(options.ruleset ?? FINKEL_RULESET);
  }

  get state(): GameState {
    return this.#state;
  }

  get phase(): ReturnType<typeof phaseOf> {
    return phaseOf(this.#state);
  }

  legalMoves(): Move[] {
    return legalMoves(this.#state);
  }

  /** Roll with the session RNG. May auto-pass; inspect the new state's history tail. */
  roll(): GameState {
    this.#state = applyRoll(this.#state, rollDice(this.#rng, this.#state.ruleset.diceCount));
    return this.#state;
  }

  move(move: Move): GameState {
    this.#state = applyMove(this.#state, move);
    return this.#state;
  }

  /** Rewind to just before the most recent roll. */
  undo(): GameState {
    this.#state = undoLastRoll(this.#state);
    return this.#state;
  }

  /**
   * Rewind until the given player is about to roll — "take back my turn"
   * for a human playing an AI. Rewinds at least one roll.
   */
  undoToPlayerRoll(player: PlayerId, maxSteps = 64): GameState {
    let steps = 0;
    do {
      if (this.#state.history.length === 0) break;
      if (++steps > maxSteps) throw new UrEngineError("INVALID_STATE", "undo exceeded maxSteps");
      this.#state = undoLastRoll(this.#state);
    } while (!(this.phase === "awaiting-roll" && this.#state.current === player) && this.#state.history.length > 0);
    return this.#state;
  }

  /** Exact save: state plus RNG position, so resumed sessions roll the same future dice. */
  serialize(): string {
    const snapshot: SessionSnapshot = {
      format: "ur-session@1",
      seed: this.seed,
      rngState: this.#rng.getState(),
      state: serializeState(this.#state),
    };
    return JSON.stringify(snapshot);
  }

  static deserialize(json: string): GameSession {
    let snapshot: SessionSnapshot;
    try {
      snapshot = JSON.parse(json) as SessionSnapshot;
    } catch {
      throw new UrEngineError("INVALID_STATE", "session payload is not valid JSON");
    }
    if (snapshot.format !== "ur-session@1") {
      throw new UrEngineError("INVALID_STATE", `unknown session format ${String(snapshot.format)}`);
    }
    const state = deserializeState(snapshot.state);
    const session = new GameSession({ ruleset: state.ruleset, seed: snapshot.seed });
    session.#state = state;
    session.#rng.setState(snapshot.rngState);
    return session;
  }
}
