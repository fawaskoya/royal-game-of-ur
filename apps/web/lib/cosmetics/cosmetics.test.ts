import { describe, expect, it } from "vitest";
import type { StorageLike } from "@/lib/persistence/gameStorage";
import {
  attrNameForCategory,
  CATALOG,
  CATALOG_BY_ID,
  DEFAULT_COSMETICS_STATE,
  DEFAULT_LOADOUT,
  fetchEntitlements,
  FREE_GRANTS,
  loadCosmetics,
  resolveLoadout,
  saveCosmetics,
  skuToAttrValue,
  type CosmeticLoadout,
  type CosmeticsState,
  type SkuId,
} from "./index";

function memoryStorage(): StorageLike {
  const map = new Map<string, string>();
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
    removeItem: (k) => void map.delete(k),
  };
}

// The lock: exactly the 20 ids named in `.agent/cosmetics/CONTRACT.md`. Changing this list
// here is a deliberate contract amendment, not a drive-by edit.
const CONTRACT_IDS: readonly string[] = [
  "board.classic_museum",
  "dice.bone_classic",
  "piece.alabaster_obsidian",
  "flair.none",
  "board.cedar_bitumen",
  "board.night_lapis",
  "board.floodplain_parchment",
  "dice.gold_inlaid_bone",
  "dice.volcanic_obsidian",
  "dice.carnelian_gold",
  "piece.ivory_basalt",
  "piece.lapis_eyes",
  "piece.electrum_filigree",
  "flair.lapis_cartouche",
  "flair.rosette_seal",
  "flair.scribes_colophon",
  "board.venus_tablet",
  "flair.morning_star",
  "board.field_journal",
  "flair.first_dig",
];

describe("catalog", () => {
  it("has exactly the 20 contract-locked ids, each unique", () => {
    const ids = CATALOG.map((entry) => entry.id);
    expect(ids.length).toBe(20);
    expect(new Set(ids).size).toBe(ids.length);
    expect([...ids].sort()).toEqual([...CONTRACT_IDS].sort());
  });

  it("Excavation Finds are locked stubs priced null; free SKUs are priced null too", () => {
    const fieldJournal = CATALOG_BY_ID.get("board.field_journal" as SkuId);
    const firstDig = CATALOG_BY_ID.get("flair.first_dig" as SkuId);
    expect(fieldJournal?.lockedByDefault).toBe(true);
    expect(fieldJournal?.priceUsd).toBeNull();
    expect(firstDig?.lockedByDefault).toBe(true);
    expect(firstDig?.priceUsd).toBeNull();

    for (const id of FREE_GRANTS) {
      expect(CATALOG_BY_ID.get(id)?.priceUsd).toBeNull();
      expect(CATALOG_BY_ID.get(id)?.lockedByDefault).toBe(false);
    }
  });
});

describe("free grants", () => {
  it("every default-loadout slot is a free grant, so the default always resolves to itself", () => {
    const slots: SkuId[] = [DEFAULT_LOADOUT.board, DEFAULT_LOADOUT.dice, DEFAULT_LOADOUT.pieces, DEFAULT_LOADOUT.flair];
    for (const id of slots) expect(FREE_GRANTS).toContain(id);

    const owned = new Set(FREE_GRANTS);
    expect(resolveLoadout(DEFAULT_LOADOUT, owned)).toEqual(DEFAULT_LOADOUT);
  });
});

describe("resolveLoadout", () => {
  it("falls back per category for un-owned SKUs, keeping owned/default slots untouched", () => {
    const owned = new Set(FREE_GRANTS); // baseline player: owns nothing paid
    const requested: CosmeticLoadout = {
      board: "board.night_lapis", // real, paid, not owned
      dice: DEFAULT_LOADOUT.dice, // already the free default
      pieces: DEFAULT_LOADOUT.pieces,
      flair: "flair.lapis_cartouche", // real, paid, not owned
    };
    expect(resolveLoadout(requested, owned)).toEqual(DEFAULT_LOADOUT);
  });

  it("keeps a paid SKU once it's actually owned", () => {
    const owned = new Set([...FREE_GRANTS, "board.night_lapis" as SkuId]);
    const requested: CosmeticLoadout = { ...DEFAULT_LOADOUT, board: "board.night_lapis" };
    expect(resolveLoadout(requested, owned).board).toBe("board.night_lapis");
  });

  it("falls back for unknown/garbage ids even when the id shape looks plausible", () => {
    const owned = new Set(FREE_GRANTS);
    const garbage: CosmeticLoadout = {
      board: "board.totally_made_up",
      dice: "dice.totally_made_up",
      pieces: "piece.totally_made_up",
      flair: "flair.totally_made_up",
    };
    expect(resolveLoadout(garbage, owned)).toEqual(DEFAULT_LOADOUT);
  });

  it("falls back when a slot names a real SKU from the wrong category", () => {
    // Compiles because CosmeticLoadout fields are the broad SkuId union (contract shape);
    // resolveLoadout must catch the mismatch at runtime instead.
    const crossCategory: CosmeticLoadout = { ...DEFAULT_LOADOUT, board: "dice.bone_classic" };
    const owned = new Set([...FREE_GRANTS, "dice.bone_classic" as SkuId]);
    expect(resolveLoadout(crossCategory, owned).board).toBe(DEFAULT_LOADOUT.board);
  });
});

describe("storage", () => {
  it("round-trips a saved loadout and dev grants exactly", () => {
    const storage = memoryStorage();
    const state: CosmeticsState = {
      loadout: {
        board: "board.night_lapis",
        dice: "dice.bone_classic",
        pieces: "piece.alabaster_obsidian",
        flair: "flair.rosette_seal",
      },
      devGrants: ["board.night_lapis", "flair.rosette_seal"],
    };
    expect(saveCosmetics(state, storage)).toBe(true);
    expect(loadCosmetics(storage)).toEqual(state);
  });

  it("returns defaults when nothing has been saved yet", () => {
    expect(loadCosmetics(memoryStorage())).toEqual(DEFAULT_COSMETICS_STATE);
  });

  it("discards corrupt JSON and wrong-version payloads, falling back to defaults", () => {
    const storage = memoryStorage();
    storage.setItem("ur:cosmetics", "{not json at all");
    expect(loadCosmetics(storage)).toEqual(DEFAULT_COSMETICS_STATE);

    storage.setItem("ur:cosmetics", JSON.stringify({ version: 99, loadout: DEFAULT_LOADOUT }));
    expect(loadCosmetics(storage)).toEqual(DEFAULT_COSMETICS_STATE);
  });

  it("sanitizes bad fields individually instead of discarding the whole record", () => {
    const storage = memoryStorage();
    storage.setItem(
      "ur:cosmetics",
      JSON.stringify({
        version: 1,
        loadout: {
          board: "board.does_not_exist", // unknown id
          dice: "dice.bone_classic", // valid
          pieces: 42, // wrong type entirely
          flair: "flair.rosette_seal", // valid
        },
        devGrants: "not-an-array",
      }),
    );
    const loaded = loadCosmetics(storage);
    expect(loaded.loadout.board).toBe(DEFAULT_LOADOUT.board);
    expect(loaded.loadout.dice).toBe("dice.bone_classic");
    expect(loaded.loadout.pieces).toBe(DEFAULT_LOADOUT.pieces);
    expect(loaded.loadout.flair).toBe("flair.rosette_seal");
    expect(loaded.devGrants).toEqual([]);
  });

  it("a null backend never throws; save reports failure and load reports defaults", () => {
    expect(loadCosmetics(null)).toEqual(DEFAULT_COSMETICS_STATE);
    expect(saveCosmetics(DEFAULT_COSMETICS_STATE, null)).toBe(false);
  });
});

describe("tokens", () => {
  it("maps a SKU id to its snake_id attribute value", () => {
    expect(skuToAttrValue("board.night_lapis")).toBe("night_lapis");
    expect(skuToAttrValue("flair.none")).toBe("none");
    expect(skuToAttrValue("dice.gold_inlaid_bone")).toBe("gold_inlaid_bone");
  });

  it("maps each category to its documentElement attribute name", () => {
    expect(attrNameForCategory("board")).toBe("data-board-skin");
    expect(attrNameForCategory("dice")).toBe("data-dice-skin");
    expect(attrNameForCategory("piece")).toBe("data-piece-skin");
    expect(attrNameForCategory("flair")).toBe("data-flair");
  });
});

describe("entitlementsClient", () => {
  it("the offline stub resolves an empty list", async () => {
    expect(await fetchEntitlements()).toEqual([]);
  });
});
