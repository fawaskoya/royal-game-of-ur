/**
 * "Biggest capture": the most painful hit in a game — the one that sent a
 * piece back from the furthest square. Derived from the event log only.
 */
import { replayStateAt, type Replay } from "@ur/engine";

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
  for (let i = 0; i < replay.events.length; i++) {
    const event = replay.events[i]!;
    if (event.type !== "move" || !event.capture) continue;
    const before = replayStateAt(replay, i);
    const victimProgress = before.positions[event.capture.player][event.capture.piece] ?? 0;
    if (best === null || victimProgress > best.victimProgress) {
      best = { eventIndex: i, victimProgress, by: event.player };
    }
  }
  return best;
}
