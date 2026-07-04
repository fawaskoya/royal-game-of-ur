import { describe, expect, it } from "vitest";
import { GameSession } from "@ur/engine";
import { CURRENT_SAVE_VERSION, validateSavedGame, type SavedGame } from "./saveSchema";
import { migrateSavedGame } from "./migrations";
import { clearGame, loadGame, saveGame, hasSavedGame, type StorageLike } from "./gameStorage";

function memoryStorage(): StorageLike {
  const map = new Map<string, string>();
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
    removeItem: (k) => void map.delete(k),
  };
}

function playedSave(overrides: Partial<SavedGame> = {}): SavedGame {
  const session = new GameSession({ seed: 7 });
  // Play a couple of real turns so history is non-trivial.
  for (let i = 0; i < 4; i++) {
    session.roll();
    const moves = session.legalMoves();
    if (moves.length > 0) session.move(moves[0]!);
    if (session.state.winner !== null) break;
  }
  return {
    version: CURRENT_SAVE_VERSION,
    savedAt: new Date().toISOString(),
    startedAt: new Date().toISOString(),
    gameId: "test-game",
    mode: { kind: "ai", human: 0, difficulty: "medium" },
    session: session.serialize(),
    ...overrides,
  };
}

describe("validateSavedGame", () => {
  it("accepts a real played save", () => {
    const save = playedSave();
    expect(validateSavedGame(save)).not.toBeNull();
  });

  it("rejects junk, wrong versions, and bad modes", () => {
    expect(validateSavedGame(null)).toBeNull();
    expect(validateSavedGame("string")).toBeNull();
    expect(validateSavedGame({})).toBeNull();
    expect(validateSavedGame(playedSave({ version: 99 as never }))).toBeNull();
    expect(validateSavedGame({ ...playedSave(), mode: { kind: "nope" } })).toBeNull();
    expect(
      validateSavedGame({ ...playedSave(), mode: { kind: "ai", human: 0, difficulty: "cheater" } }),
    ).toBeNull();
  });

  it("rejects a corrupted session payload", () => {
    expect(validateSavedGame(playedSave({ session: "{not json" }))).toBeNull();
    expect(validateSavedGame(playedSave({ session: JSON.stringify({ format: "evil@9" }) }))).toBeNull();
  });

  it("rejects tampered positions (replay cross-check)", () => {
    const save = playedSave();
    const parsed = JSON.parse(save.session) as { state: string };
    const state = JSON.parse(parsed.state) as { positions: number[][] };
    // Teleport a piece to the finish without any event backing it.
    state.positions[0]![0] = 15;
    parsed.state = JSON.stringify(state);
    const tampered = { ...save, session: JSON.stringify(parsed) };
    expect(validateSavedGame(tampered)).toBeNull();
  });
});

describe("migrateSavedGame", () => {
  it("passes current version through and nulls unknown versions", () => {
    const save = playedSave();
    expect(migrateSavedGame(save)).toBe(save);
    expect(migrateSavedGame({ version: 0 })).toBeNull();
    expect(migrateSavedGame(undefined)).toBeNull();
  });
});

describe("gameStorage", () => {
  it("round-trips a save and resumes to the identical state", () => {
    const storage = memoryStorage();
    const save = playedSave();
    expect(saveGame(save, storage)).toBe(true);
    expect(hasSavedGame(storage)).toBe(true);

    const loaded = loadGame(storage);
    expect(loaded).not.toBeNull();
    const resumed = GameSession.deserialize(loaded!.session);
    const original = GameSession.deserialize(save.session);
    expect(resumed.state).toEqual(original.state);
    // RNG position restored: the next roll matches exactly.
    expect(resumed.roll().dice).toEqual(original.roll().dice);
  });

  it("discards corrupt payloads safely and clears them", () => {
    const storage = memoryStorage();
    storage.setItem("ur:save", "{definitely not json");
    expect(loadGame(storage)).toBeNull();
    expect(storage.getItem("ur:save")).toBeNull();

    storage.setItem("ur:save", JSON.stringify({ version: 42 }));
    expect(loadGame(storage)).toBeNull();
    expect(storage.getItem("ur:save")).toBeNull();
  });

  it("clearGame removes the save; a null backend never throws", () => {
    const storage = memoryStorage();
    saveGame(playedSave(), storage);
    clearGame(storage);
    expect(hasSavedGame(storage)).toBe(false);

    expect(saveGame(playedSave(), null)).toBe(false);
    expect(loadGame(null)).toBeNull();
    expect(hasSavedGame(null)).toBe(false);
    expect(() => clearGame(null)).not.toThrow();
  });
});
