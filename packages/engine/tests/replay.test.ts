import { describe, expect, it } from "vitest";
import {
  buildStateFromEvents,
  createRng,
  deserializeState,
  GameSession,
  importReplay,
  phaseOf,
  replayStateAt,
  serializeReplay,
  serializeState,
  undoLastRoll,
  UrEngineError,
  type GameState,
  type MoveEvent,
} from "../src";

/** Play a full seeded game with a random policy; returns the finished state. */
function playRandomGame(seed: number): GameState {
  const session = new GameSession({ seed });
  const policy = createRng(seed ^ 0x5f3759df);
  let guard = 0;
  while (session.state.winner === null) {
    if (++guard > 4000) throw new Error("game did not terminate");
    if (session.phase === "awaiting-roll") {
      session.roll();
      continue;
    }
    const moves = session.legalMoves();
    session.move(moves[Math.floor(policy.next() * moves.length)]!);
  }
  return session.state;
}

describe("replay round-trip", () => {
  it("rebuilds the exact final state from the exported event log", () => {
    const final = playRandomGame(1234);
    const replay = importReplay(serializeReplay(final, { note: "test game" }));
    const rebuilt = replayStateAt(replay);
    expect(rebuilt.positions).toEqual(final.positions);
    expect(rebuilt.winner).toBe(final.winner);
    expect(rebuilt.rollCount).toBe(final.rollCount);
    expect(rebuilt.history).toEqual(final.history);
  });

  it("scrubs to any intermediate position", () => {
    const final = playRandomGame(99);
    const replay = importReplay(serializeReplay(final));
    for (const count of [0, 1, 5, Math.floor(replay.events.length / 2)]) {
      const mid = replayStateAt(replay, count);
      expect(["awaiting-roll", "awaiting-move", "game-over"]).toContain(phaseOf(mid));
      expect(mid.history).toHaveLength(count);
    }
  });
});

describe("replay verification (anti-tamper)", () => {
  it("rejects a move event whose destination was altered", () => {
    const final = playRandomGame(555);
    const firstMoveIndex = final.history.findIndex((e) => e.type === "move");
    const events = [...final.history];
    const move = events[firstMoveIndex] as MoveEvent;
    events[firstMoveIndex] = { ...move, to: move.to + 1 };
    expect(() => buildStateFromEvents(final.ruleset, events)).toThrow(UrEngineError);
  });

  it("rejects a move event whose recorded outcome flags were forged", () => {
    const final = playRandomGame(555);
    const idx = final.history.findIndex((e) => e.type === "move" && !e.rosette);
    const events = [...final.history];
    events[idx] = { ...(events[idx] as MoveEvent), rosette: true, extraTurn: true };
    expect(() => buildStateFromEvents(final.ruleset, events)).toThrow(/REPLAY|outcome/i);
  });

  it("rejects a pass that was not forced", () => {
    const final = playRandomGame(777);
    // Take a real roll that had legal moves and forge a pass right after it.
    const rollIdx = final.history.findIndex(
      (e, i) => e.type === "roll" && e.total > 0 && final.history[i + 1]?.type === "move",
    );
    const events = [...final.history.slice(0, rollIdx + 1), { type: "pass", player: (final.history[rollIdx] as { player: 0 | 1 }).player, reason: "no-legal-moves" } as const];
    expect(() => buildStateFromEvents(final.ruleset, events)).toThrow(UrEngineError);
  });

  it("accepts events whose object keys were reordered by storage (jsonb)", () => {
    // Postgres jsonb canonicalizes key order (length, then bytewise) — the
    // verifier must compare values, not serialized strings. Regression for a
    // real online game that failed at its first capture (2026-07-09).
    const withCaptures = [555, 777, 1234, 4242]
      .map(playRandomGame)
      .find((s) => s.history.some((e) => e.type === "move" && e.capture !== null));
    if (!withCaptures) throw new Error("no seeded game produced a capture");
    const jsonbOrder = (value: unknown): unknown => {
      if (Array.isArray(value)) return value.map(jsonbOrder);
      if (value === null || typeof value !== "object") return value;
      const entries = Object.entries(value as Record<string, unknown>).sort(
        ([a], [b]) => a.length - b.length || (a < b ? -1 : 1),
      );
      return Object.fromEntries(entries.map(([k, v]) => [k, jsonbOrder(v)]));
    };
    const reordered = withCaptures.history.map((e) => jsonbOrder(e) as (typeof withCaptures.history)[number]);
    const rebuilt = buildStateFromEvents(withCaptures.ruleset, reordered);
    expect(rebuilt.positions).toEqual(withCaptures.positions);
    expect(rebuilt.winner).toBe(withCaptures.winner);
  });
});

describe("undo", () => {
  it("undoLastRoll rewinds to just before the most recent roll, repeatedly to the start", () => {
    const session = new GameSession({ seed: 42 });
    const policy = createRng(7);
    for (let plies = 0; plies < 30 && session.state.winner === null; plies++) {
      if (session.phase === "awaiting-roll") session.roll();
      else {
        const moves = session.legalMoves();
        session.move(moves[Math.floor(policy.next() * moves.length)]!);
      }
    }
    const before = session.state;
    const lastRollIdx = before.history.map((e) => e.type).lastIndexOf("roll");
    const rewound = undoLastRoll(before);
    expect(rewound.history).toHaveLength(lastRollIdx);
    expect(phaseOf(rewound)).toBe("awaiting-roll");

    let state = before;
    let guard = 0;
    while (state.history.length > 0) {
      if (++guard > 200) throw new Error("undo did not reach the initial position");
      state = undoLastRoll(state);
    }
    expect(state.positions[0].every((p) => p === 0)).toBe(true);
    expect(state.rollCount).toBe(0);
  });
});

describe("state serialization", () => {
  it("round-trips a mid-game state exactly", () => {
    const session = new GameSession({ seed: 31337 });
    const policy = createRng(2);
    for (let i = 0; i < 25 && session.state.winner === null; i++) {
      if (session.phase === "awaiting-roll") session.roll();
      else {
        const moves = session.legalMoves();
        session.move(moves[Math.floor(policy.next() * moves.length)]!);
      }
    }
    const restored = deserializeState(serializeState(session.state));
    expect(restored).toEqual(session.state);
  });

  it("rejects corrupt payloads", () => {
    expect(() => deserializeState("not json")).toThrow(UrEngineError);
    expect(() => deserializeState(JSON.stringify({ format: "wrong" }))).toThrow(UrEngineError);

    const good = JSON.parse(serializeState(new GameSession({ seed: 1 }).state));
    const twoOnOneSquare = { ...good, positions: [[3, 3, 0, 0, 0, 0, 0], good.positions[1]] };
    expect(() => deserializeState(JSON.stringify(twoOnOneSquare))).toThrow(UrEngineError);

    const outOfRange = { ...good, positions: [[99, 0, 0, 0, 0, 0, 0], good.positions[1]] };
    expect(() => deserializeState(JSON.stringify(outOfRange))).toThrow(UrEngineError);
  });
});
