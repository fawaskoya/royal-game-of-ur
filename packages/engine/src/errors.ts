/** Machine-readable error codes thrown by the engine. */
export type EngineErrorCode =
  | "INVALID_RULESET"
  | "NOT_AWAITING_ROLL"
  | "GAME_OVER"
  | "INVALID_ROLL"
  | "ILLEGAL_MOVE"
  | "INVALID_STATE"
  | "INVALID_REPLAY"
  | "REPLAY_MISMATCH";

export class UrEngineError extends Error {
  constructor(
    readonly code: EngineErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "UrEngineError";
  }
}
