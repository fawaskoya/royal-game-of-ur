import { describe, expect, it } from "vitest";
import { GameSession, createRng, exportReplay, replayStateAt } from "@ur/engine";
import { decodeShare, encodeShare } from "./share";

function play(seed: number) {
  const s = new GameSession({ seed });
  const rng = createRng(seed ^ 0x5eed);
  let guard = 0;
  while (s.state.winner === null) {
    if (++guard > 4000) throw new Error("no end");
    if (s.phase === "awaiting-roll") s.roll();
    else {
      const m = s.legalMoves();
      s.move(m[Math.floor(rng.next() * m.length)]!);
    }
  }
  return exportReplay(s.state);
}

describe("share codec", () => {
  it("round-trips whole games exactly", () => {
    for (const seed of [1, 2, 3, 7, 42, 99, 1234]) {
      const replay = play(seed);
      const code = encodeShare(replay)!;
      expect(code).toMatch(/^[A-Za-z0-9_-]+$/);
      const back = decodeShare(code)!;
      expect(back).not.toBeNull();
      expect(back.events).toEqual(replay.events);
      expect(replayStateAt(back).winner).toBe(replayStateAt(replay).winner);
    }
  });

  it("is compact enough for a URL", () => {
    expect(encodeShare(play(5))!.length).toBeLessThan(400);
  });

  it("rejects garbage, truncation and tampering instead of producing a game", () => {
    const code = encodeShare(play(8))!;
    expect(decodeShare("")).toBeNull();
    expect(decodeShare("not base64 !!")).toBeNull();
    expect(decodeShare(code.slice(0, 6))).toBeNull();
    expect(decodeShare("AAAA")).toBeNull();
    // Every single-character corruption either fails or still yields a legal replay.
    for (let i = 0; i < code.length; i++) {
      const bad = code.slice(0, i) + (code[i] === "A" ? "B" : "A") + code.slice(i + 1);
      const out = decodeShare(bad);
      if (out) expect(() => replayStateAt(out)).not.toThrow();
    }
  });
});
