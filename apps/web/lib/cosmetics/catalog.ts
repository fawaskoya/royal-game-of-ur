/**
 * The full cosmetics catalog: every SKU this sprint ships, transcribed from
 * `docs/COSMETICS_CATALOG.md` (names/collections/rarity/prices) with ids
 * locked exactly per `.agent/cosmetics/CONTRACT.md`. This is the single
 * source of truth other modules (resolve, storage, UI) read against — do
 * not hand-roll SKU lists elsewhere.
 */
import type { CosmeticCategory, CosmeticCollection, CosmeticRarity, CosmeticSku, SkuId } from "./types";

function sku(
  id: SkuId,
  name: string,
  collection: CosmeticCollection,
  rarity: CosmeticRarity,
  priceUsd: number | null,
  lockedByDefault = false,
): CosmeticSku {
  // Category is derived from the id prefix, never restated, so it can't drift from the id.
  const category = id.slice(0, id.indexOf(".")) as CosmeticCategory;
  return { id, category, name, collection, rarity, priceUsd, lockedByDefault };
}

export const CATALOG: readonly CosmeticSku[] = [
  // Museum Classics — free, auto-owned forever.
  sku("board.classic_museum", "Museum Standard", "Museum Classics", "Classic", null),
  sku("dice.bone_classic", "Bone Pyramids", "Museum Classics", "Classic", null),
  sku("piece.alabaster_obsidian", "Alabaster & Obsidian", "Museum Classics", "Classic", null),
  sku("flair.none", "Unmarked", "Museum Classics", "Classic", null),

  // Royal Treasury — boards.
  sku("board.cedar_bitumen", "Cedar & Bitumen", "Royal Treasury", "Treasured", 3.49),
  sku("board.night_lapis", "Night Lapis", "Royal Treasury", "Exalted", 4.99),
  sku("board.floodplain_parchment", "Floodplain Parchment", "Royal Treasury", "Treasured", 3.99),

  // Royal Treasury — dice.
  sku("dice.gold_inlaid_bone", "Gold-Inlaid Bone", "Royal Treasury", "Treasured", 2.49),
  sku("dice.volcanic_obsidian", "Volcanic Obsidian", "Royal Treasury", "Treasured", 2.99),
  sku("dice.carnelian_gold", "Carnelian & Gold", "Royal Treasury", "Exalted", 3.49),

  // Royal Treasury — pieces.
  sku("piece.ivory_basalt", "Ivory & Basalt", "Royal Treasury", "Treasured", 2.99),
  sku("piece.lapis_eyes", "Lapis Eyes", "Royal Treasury", "Treasured", 3.49),
  sku("piece.electrum_filigree", "Electrum Filigree", "Royal Treasury", "Exalted", 4.49),

  // Royal Treasury — flair.
  sku("flair.lapis_cartouche", "Lapis Cartouche", "Royal Treasury", "Treasured", 1.99),
  sku("flair.rosette_seal", "Rosette Seal", "Royal Treasury", "Treasured", 2.49),
  sku("flair.scribes_colophon", "Scribe's Colophon", "Royal Treasury", "Treasured", 1.99),

  // Star Omens — paid, optional sub-collection.
  sku("board.venus_tablet", "The Venus Tablet", "Star Omens", "Omen", 4.99),
  sku("flair.morning_star", "Morning Star", "Star Omens", "Omen", 2.99),

  // Excavation Finds — free-by-achievement later; shipped locked this sprint.
  sku("board.field_journal", "Field Journal", "Excavation Finds", "Relic", null, true),
  sku("flair.first_dig", "First Dig", "Excavation Finds", "Relic", null, true),
];

/** O(1) id -> catalog entry lookup, used by resolve/storage to validate incoming SKU ids. */
export const CATALOG_BY_ID: ReadonlyMap<SkuId, CosmeticSku> = new Map(CATALOG.map((entry) => [entry.id, entry]));

/** One purchase unlocks every SELLABLE cosmetic (priceUsd != null). The
 * "Earned, not sold" Excavation Finds stay achievement-gated on purpose —
 * buying everything must not cheapen the earned badges. */
export const UNLOCK_ALL_PRICE_USD = 1.99;

export const ALL_PAID_SKUS: readonly SkuId[] = CATALOG.filter((s) => s.priceUsd !== null).map((s) => s.id);
