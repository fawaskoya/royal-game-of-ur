/**
 * Core types for the cosmetics system: SKU identity, catalog entry shape,
 * the equipped loadout, and the ownership set resolution reads against.
 *
 * Pure data types only — no React, no DOM. See `.agent/cosmetics/CONTRACT.md`
 * for the locked SKU scheme and `docs/COSMETICS_CATALOG.md` for the catalog
 * this module's data (`catalog.ts`) is transcribed from.
 */

/** SKU scheme: `{category}.{snake_id}`, category singular, id snake_case. */
export type CosmeticCategory = "board" | "dice" | "piece" | "flair";

export type BoardSkuId = `board.${string}`;
export type DiceSkuId = `dice.${string}`;
export type PieceSkuId = `piece.${string}`;
export type FlairSkuId = `flair.${string}`;

/** Any valid SKU id, e.g. `"board.night_lapis"`, `"flair.none"`. */
export type SkuId = BoardSkuId | DiceSkuId | PieceSkuId | FlairSkuId;

/** Rarity ladder — one word per collection tier (see catalog doc). */
export type CosmeticRarity = "Classic" | "Treasured" | "Exalted" | "Omen" | "Relic";

/** Collection groupings a SKU belongs to. */
export type CosmeticCollection = "Museum Classics" | "Royal Treasury" | "Star Omens" | "Excavation Finds";

/** A single catalog entry: everything needed to list, price, and equip a SKU. */
export interface CosmeticSku {
  readonly id: SkuId;
  readonly category: CosmeticCategory;
  readonly name: string;
  readonly collection: CosmeticCollection;
  readonly rarity: CosmeticRarity;
  /** USD price, or `null` for free (auto-owned) and "earned, not sold" SKUs. */
  readonly priceUsd: number | null;
  /** True only for SKUs with no purchase path yet (Excavation Finds this sprint):
   * shown as a locked/greyed stub rather than something with a buy button. */
  readonly lockedByDefault: boolean;
}

/**
 * The four equip slots. Key `pieces` is plural (matches the on-page label);
 * the SKU category it holds stays singular `piece.*` (see contract note).
 */
export interface CosmeticLoadout {
  readonly board: SkuId;
  readonly dice: SkuId;
  readonly pieces: SkuId;
  readonly flair: SkuId;
}

/** The set of SKU ids a player currently owns (free grants ∪ dev grants ∪ server entitlements). */
export type Ownership = ReadonlySet<SkuId>;
