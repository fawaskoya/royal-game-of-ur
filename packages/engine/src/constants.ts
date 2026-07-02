import type { PlayerId } from "./types";

export const ENGINE_VERSION = "0.1.0";

/** Format tags embedded in serialized payloads for forward compatibility. */
export const STATE_FORMAT = "ur-state@1";
export const REPLAY_FORMAT = "ur-replay@1";

export const PLAYERS: readonly PlayerId[] = [0, 1];

/** Path index of the off-board start pool. */
export const START_INDEX = 0;

/**
 * Probability of each total (index = total) when throwing four binary
 * tetrahedral dice: C(4, k) / 16.
 */
export const DICE_PROBABILITIES: readonly number[] = [1 / 16, 4 / 16, 6 / 16, 4 / 16, 1 / 16];

export function otherPlayer(p: PlayerId): PlayerId {
  return p === 0 ? 1 : 0;
}
