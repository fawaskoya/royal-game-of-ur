import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { forgetActiveGame, loadActiveGame, rememberActiveGame } from "./activeGame";

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

let store: Storage;

function installWindow(value: unknown): void {
  Object.defineProperty(globalThis, "window", { value, configurable: true, writable: true });
}

beforeEach(() => {
  store = fakeStorage();
  installWindow({ localStorage: store });
});

afterEach(() => {
  Reflect.deleteProperty(globalThis as object, "window");
});

describe("active online game", () => {
  it("round-trips a private room", () => {
    rememberActiveGame("game-1", "ABCD");
    expect(loadActiveGame()).toMatchObject({ gameId: "game-1", code: "ABCD" });
  });

  it("round-trips a matchmade game, which has no room code", () => {
    rememberActiveGame("game-2", null);
    expect(loadActiveGame()).toMatchObject({ gameId: "game-2", code: null });
  });

  it("forgets on request", () => {
    rememberActiveGame("game-3", "WXYZ");
    forgetActiveGame();
    expect(loadActiveGame()).toBeNull();
  });

  it("returns null when nothing is stored", () => {
    expect(loadActiveGame()).toBeNull();
  });

  it("drops a stale entry rather than offering a dead game", () => {
    store.setItem(
      "ur:online-active",
      JSON.stringify({
        version: 1,
        gameId: "old",
        code: "OLDX",
        savedAt: new Date(Date.now() - 13 * 60 * 60 * 1000).toISOString(),
      }),
    );
    expect(loadActiveGame()).toBeNull();
    expect(store.getItem("ur:online-active")).toBeNull(); // and cleans up after itself
  });

  it("rejects a wrong-version or malformed payload", () => {
    store.setItem("ur:online-active", JSON.stringify({ version: 99, gameId: "x", savedAt: new Date().toISOString() }));
    expect(loadActiveGame()).toBeNull();
    store.setItem("ur:online-active", "{ not json");
    expect(loadActiveGame()).toBeNull();
    store.setItem("ur:online-active", JSON.stringify({ version: 1, savedAt: new Date().toISOString() }));
    expect(loadActiveGame()).toBeNull();
  });

  it("degrades to 'nothing remembered' when storage is blocked", () => {
    installWindow({
      get localStorage(): Storage {
        throw new Error("storage disabled");
      },
    });
    expect(() => rememberActiveGame("g", "CODE")).not.toThrow();
    expect(loadActiveGame()).toBeNull();
    expect(() => forgetActiveGame()).not.toThrow();
  });

  it("is inert on the server", () => {
    Reflect.deleteProperty(globalThis as object, "window");
    expect(() => rememberActiveGame("g", null)).not.toThrow();
    expect(loadActiveGame()).toBeNull();
  });
});
