import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const trackMock = vi.fn();
vi.mock("@vercel/analytics", () => ({ track: (...args: unknown[]) => trackMock(...args) }));

const {
  analyticsMode,
  durationBucket,
  resetFirstRollGuardForTests,
  sideOf,
  trackDonateClick,
  trackFirstRoll,
  trackGameComplete,
  trackGameStart,
  trackRoomCreated,
  trackSkinClick,
  trackStoreOpen,
} = await import("./analytics");

/** Minimal sessionStorage stand-in — the tests run in vitest's node env. */
function fakeStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: (k: string) => map.get(k) ?? null,
    key: (i: number) => [...map.keys()][i] ?? null,
    removeItem: (k: string) => void map.delete(k),
    setItem: (k: string, v: string) => void map.set(k, v),
  };
}

/** Pretend to be a browser; the module no-ops on the server by design. */
function installWindow(storage: Storage | null = fakeStorage()): void {
  Object.defineProperty(globalThis, "window", {
    value: storage
      ? { sessionStorage: storage }
      : {
          get sessionStorage(): Storage {
            throw new Error("storage disabled");
          },
        },
    configurable: true,
    writable: true,
  });
}

function removeWindow(): void {
  Reflect.deleteProperty(globalThis as object, "window");
}

beforeEach(() => {
  trackMock.mockReset();
  trackMock.mockImplementation(() => undefined);
  vi.spyOn(console, "debug").mockImplementation(() => undefined);
  installWindow();
  resetFirstRollGuardForTests();
});

afterEach(() => {
  vi.restoreAllMocks();
  removeWindow();
});

describe("payload shape", () => {
  it("sends game_start with exactly the documented properties", () => {
    trackGameStart({ mode: "ai", difficulty: "master", side: "light" });
    expect(trackMock).toHaveBeenCalledTimes(1);
    expect(trackMock).toHaveBeenCalledWith("game_start", {
      mode: "ai",
      difficulty: "master",
      side: "light",
    });
  });

  it("buckets game_complete duration instead of sending raw time", () => {
    trackGameComplete({
      mode: "online",
      result: "win",
      difficulty: null,
      turns: 84,
      durationMs: 240_000,
    });
    expect(trackMock).toHaveBeenCalledWith("game_complete", {
      mode: "online",
      result: "win",
      difficulty: null,
      turns: 84,
      duration_bucket: "3_10m",
    });
    // The raw duration must not leak through under any key.
    const payload = trackMock.mock.calls[0]?.[1] as Record<string, unknown>;
    expect(Object.values(payload)).not.toContain(240_000);
  });

  it("sends property-less events with no payload argument", () => {
    trackRoomCreated();
    expect(trackMock).toHaveBeenCalledWith("room_created");
  });

  it("carries the skin id and whole-unit price", () => {
    trackSkinClick("board.night_lapis", 1.99);
    expect(trackMock).toHaveBeenCalledWith("skin_click", {
      skin_id: "board.night_lapis",
      price: 1.99,
    });
  });

  it("only ever emits allowed property value types", () => {
    trackGameStart({ mode: "spectate", difficulty: null, side: null });
    trackStoreOpen("menu");
    trackDonateClick("menu");
    for (const [, props] of trackMock.mock.calls) {
      for (const value of Object.values((props ?? {}) as Record<string, unknown>)) {
        expect(["string", "number", "boolean"].includes(typeof value) || value === null).toBe(true);
      }
    }
  });
});

describe("first_roll session guard", () => {
  it("fires once and stays quiet for the rest of the session", () => {
    trackFirstRoll("ai");
    trackFirstRoll("ai");
    trackFirstRoll("online");
    expect(trackMock).toHaveBeenCalledTimes(1);
    expect(trackMock).toHaveBeenCalledWith("first_roll", { mode: "ai" });
  });

  it("persists the guard in sessionStorage, so a remount does not re-fire", () => {
    const storage = fakeStorage();
    installWindow(storage);
    trackFirstRoll("ai");
    expect(storage.getItem("ur:analytics:first-roll")).toBe("1");

    // A fresh module load (new page-load flag) still sees the stored guard.
    resetFirstRollGuardForTests();
    installWindow(storage);
    storage.setItem("ur:analytics:first-roll", "1");
    trackMock.mockReset();
    trackFirstRoll("ai");
    expect(trackMock).not.toHaveBeenCalled();
  });

  it("still fires at most once when sessionStorage is unavailable", () => {
    installWindow(null);
    trackFirstRoll("private");
    trackFirstRoll("private");
    expect(trackMock).toHaveBeenCalledTimes(1);
  });
});

describe("never throws", () => {
  it("swallows a failing track() so a game in progress survives", () => {
    trackMock.mockImplementation(() => {
      throw new Error("network down");
    });
    expect(() => trackGameStart({ mode: "ai", difficulty: "hard", side: "dark" })).not.toThrow();
    expect(() => trackFirstRoll("ai")).not.toThrow();
    expect(() => trackRoomCreated()).not.toThrow();
  });

  it("no-ops on the server rather than throwing", () => {
    removeWindow();
    expect(() => trackGameStart({ mode: "ai", difficulty: null, side: null })).not.toThrow();
    expect(() => trackFirstRoll("ai")).not.toThrow();
    expect(trackMock).not.toHaveBeenCalled();
  });
});

describe("helpers", () => {
  it("buckets durations at the documented boundaries", () => {
    expect(durationBucket(0)).toBe("under_1m");
    expect(durationBucket(59_999)).toBe("under_1m");
    expect(durationBucket(60_000)).toBe("1_3m");
    expect(durationBucket(179_999)).toBe("1_3m");
    expect(durationBucket(180_000)).toBe("3_10m");
    expect(durationBucket(599_999)).toBe("3_10m");
    expect(durationBucket(600_000)).toBe("over_10m");
    expect(durationBucket(Number.NaN)).toBe("under_1m");
  });

  it("maps engine modes onto funnel modes", () => {
    expect(analyticsMode({ kind: "ai", human: 0, difficulty: "medium" })).toBe("ai");
    expect(analyticsMode({ kind: "pvp" })).toBe("pass_and_play");
    expect(analyticsMode({ kind: "watch", light: "hard", dark: "easy" })).toBe("spectate");
    expect(analyticsMode({ kind: "online", mySeat: 1, opponent: null })).toBe("online");
  });

  it("names sides", () => {
    expect(sideOf(0)).toBe("light");
    expect(sideOf(1)).toBe("dark");
  });
});
