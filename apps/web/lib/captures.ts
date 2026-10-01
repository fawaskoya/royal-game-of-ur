/**
 * "Biggest capture": the most painful hit in a game — the one that sent a
 * piece back from the furthest square. Derived from the event log only, in a
 * single forward pass (replaying from scratch per capture was quadratic).
 */
import { applyMove, applyRoll, createGame, type GameState, type Replay } from "@ur/engine";

export interface BigCapture {
  /** Index into `replay.events` of the capturing move event. */
  readonly eventIndex: number;
  /** Path index the victim had reached (1–14) before being sent home. */
  readonly victimProgress: number;
  /** Player who made the capture. */
  readonly by: 0 | 1;
}

export function findBiggestCapture(replay: Replay): BigCapture | null {
  let best: BigCapture | null = null;
  let state: GameState = createGame(replay.ruleset);
  try {
    for (let i = 0; i < replay.events.length; i++) {
      const event = replay.events[i]!;
      if (event.type === "roll") {
        // applyRoll materializes forced passes itself (ADR 0002), so the
        // replay's own pass events are skipped below.
        state = applyRoll(state, { values: event.values, total: event.total });
        continue;
      }
      if (event.type === "pass") continue;
      if (event.capture) {
        const victimProgress = state.positions[event.capture.player][event.capture.piece] ?? 0;
        if (best === null || victimProgress > best.victimProgress) {
          best = { eventIndex: i, victimProgress, by: event.player };
        }
      }
      state = applyMove(state, { player: event.player, piece: event.piece, from: event.from, to: event.to });
    }
  } catch {
    return best; // a corrupt replay keeps whatever was found before the bad event
  }
  return best;
}
