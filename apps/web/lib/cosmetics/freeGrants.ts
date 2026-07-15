/**
 * The permanent free baseline: every player owns these four SKUs from
 * first launch, forever — no sign-in, no payment, no dev gate. They are
 * also the fail-closed fallback `resolveLoadout` uses per category.
 */
import type { CosmeticLoadout, SkuId } from "./types";

export const FREE_GRANTS: readonly SkuId[] = [
  "board.classic_museum",
  "dice.bone_classic",
  "piece.alabaster_obsidian",
  "flair.none",
];

/** The loadout every new player starts with. */
export const DEFAULT_LOADOUT: CosmeticLoadout = {
  board: "board.classic_museum",
  dice: "dice.bone_classic",
  pieces: "piece.alabaster_obsidian",
  flair: "flair.none",
};
