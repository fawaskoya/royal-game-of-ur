/**
 * Resolve a requested loadout against what the player actually owns.
 *
 * Fails closed, per category: a slot falls back to the free default the
 * moment its requested SKU is anything other than a known, correctly
 * categorized, owned id. That covers three distinct failure shapes with one
 * check — an id that isn't in the catalog at all (renamed/garbage), an id
 * from the wrong category (e.g. a dice id smuggled into the board slot),
 * and a real catalog id the player simply doesn't own. Equipping a free SKU
 * never fails this check (it's always in `owned`) and never round-trips
 * the server.
 */
import { CATALOG_BY_ID } from "./catalog";
import { DEFAULT_LOADOUT } from "./freeGrants";
import type { CosmeticCategory, CosmeticLoadout, Ownership, SkuId } from "./types";

const LOADOUT_KEY_FOR_CATEGORY: Record<CosmeticCategory, keyof CosmeticLoadout> = {
  board: "board",
  dice: "dice",
  piece: "pieces",
  flair: "flair",
};

export function resolveLoadout(requested: CosmeticLoadout, owned: Ownership): CosmeticLoadout {
  return {
    board: resolveSlot("board", requested.board, owned),
    dice: resolveSlot("dice", requested.dice, owned),
    pieces: resolveSlot("piece", requested.pieces, owned),
    flair: resolveSlot("flair", requested.flair, owned),
  };
}

function resolveSlot(category: CosmeticCategory, requestedId: SkuId, owned: Ownership): SkuId {
  const entry = CATALOG_BY_ID.get(requestedId);
  const ownsIt = entry !== undefined && entry.category === category && owned.has(entry.id);
  return ownsIt ? requestedId : DEFAULT_LOADOUT[LOADOUT_KEY_FOR_CATEGORY[category]];
}
