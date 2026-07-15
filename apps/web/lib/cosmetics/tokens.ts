/**
 * SKU -> DOM attribute mapping. Mirrors the existing `data-theme` mechanism:
 * a small client effect (owned by the integration agent, Wave 5) stamps
 * these onto `document.documentElement`, and `globals.css` skins key off
 * the attribute value. Pure string mapping only — no DOM access here.
 */
import type { CosmeticCategory, SkuId } from "./types";

/** The snake_id half of a SKU, e.g. `"board.night_lapis"` -> `"night_lapis"`. */
export function skuToAttrValue(sku: SkuId): string {
  return sku.slice(sku.indexOf(".") + 1);
}

const ATTR_NAME_FOR_CATEGORY: Record<CosmeticCategory, string> = {
  board: "data-board-skin",
  dice: "data-dice-skin",
  piece: "data-piece-skin",
  flair: "data-flair",
};

export function attrNameForCategory(category: CosmeticCategory): string {
  return ATTR_NAME_FOR_CATEGORY[category];
}
