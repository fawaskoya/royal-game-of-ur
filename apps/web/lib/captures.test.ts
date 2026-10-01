import { describe, expect, it } from "vitest";
import { GameSession, createRng, exportReplay, replayStateAt } from "@ur/engine";
import { findBiggestCapture } from "./captures";

function play(seed: number) {
  const s = new GameSession({ seed });
  const rng = createRng(seed ^ 0xcafe);
  while (s.state.winner === null) {
    if (s.phase === "awaiting-roll") s.roll();
    else {
      const m = s.legalMoves();
      s.move(m[Math.floor(rng.next() * m.length)]!);
    }
  }
  return exportReplay(s.state);
}

describe("findBiggestCapture", () => {
  it("returns the capture that cost the victim the most progress", () => {
    let checked = 0;
    for (const seed of [1, 2, 3, 4, 5, 6]) {
      const replay = play(seed);
      const best = findBiggestCapture(replay);
      const captures = replay.events
        .map((e, i) => ({ e, i }))
        .filter(({ e }) => e.type === "move" && e.capture);
      if (captures.length === 0) {
        expect(best).toBeNull();
        continue;
      }
      checked++;
      expect(best).not.toBeNull();
      const event = replay.events[best!.eventIndex]!;
      expect(event.type === "move" && event.capture).toBeTruthy();
      const progress = captures.map(({ e, i }) => {
        if (e.type !== "move" || !e.capture) return 0;
        return replayStateAt(replay, i).positions[e.capture.player][e.capture.piece]!;
      });
      expect(best!.victimProgress).toBe(Math.max(...progress));
    }
    expect(checked).toBeGreaterThan(0); // the seeds do exercise captures
  });
});
