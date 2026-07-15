/**
 * Persisted cosmetics state (versioned, fail-safe) — the equipped loadout
 * plus any dev-only grants. Mirrors `lib/settings.ts`: versioned key,
 * validated on read (corrupt/wrong-version -> defaults), and a window
 * CustomEvent so other mounted consumers can resync. The storage backend
 * is injectable like `lib/persistence/gameStorage.ts` so tests use a
 * memory store instead of real localStorage.
 *
 * Note: unknown/garbage SKU ids surviving into a loaded loadout are still
 * safe — `resolveLoadout` fails closed against the catalog + ownership on
 * every read, regardless of what this layer hands it.
 */
import type { StorageLike } from "@/lib/persistence/gameStorage";
import { CATALOG_BY_ID } from "./catalog";
import { DEFAULT_LOADOUT } from "./freeGrants";
import type { CosmeticLoadout, SkuId } from "./types";

export const COSMETICS_VERSION = 1;
const COSMETICS_KEY = "ur:cosmetics";
const CHANGE_EVENT = "ur:cosmetics-changed";

export interface CosmeticsState {
  readonly loadout: CosmeticLoadout;
  /** Dev-only unlocked SKUs (gated elsewhere by NODE_ENV/COSMETICS_DEV_GRANTS);
   * persisted so they survive a reload. Empty for ordinary players. */
  readonly devGrants: readonly SkuId[];
}

export const DEFAULT_COSMETICS_STATE: CosmeticsState = {
  loadout: DEFAULT_LOADOUT,
  devGrants: [],
};

function defaultStorage(): StorageLike | null {
  try {
    if (typeof window === "undefined") return null;
    return window.localStorage;
  } catch {
    return null; // storage disabled (private mode / policy)
  }
}

function isKnownSkuId(value: unknown): value is SkuId {
  return typeof value === "string" && CATALOG_BY_ID.has(value as SkuId);
}

function readSlot(value: unknown, fallback: SkuId): SkuId {
  return isKnownSkuId(value) ? value : fallback;
}

/**
 * All fields are read individually with a safe fallback, so a corrupt or
 * missing field never throws — worst case a slot (or the whole state)
 * reverts to the free default.
 */
export function loadCosmetics(storage: StorageLike | null = defaultStorage()): CosmeticsState {
  if (!storage) return DEFAULT_COSMETICS_STATE;
  try {
    const raw = storage.getItem(COSMETICS_KEY);
    if (raw === null) return DEFAULT_COSMETICS_STATE;

    const parsed = JSON.parse(raw) as {
      version?: unknown;
      loadout?: Partial<Record<keyof CosmeticLoadout, unknown>>;
      devGrants?: unknown;
    };
    if (parsed.version !== COSMETICS_VERSION || typeof parsed.loadout !== "object" || parsed.loadout === null) {
      return DEFAULT_COSMETICS_STATE;
    }

    const l = parsed.loadout;
    const loadout: CosmeticLoadout = {
      board: readSlot(l.board, DEFAULT_LOADOUT.board),
      dice: readSlot(l.dice, DEFAULT_LOADOUT.dice),
      pieces: readSlot(l.pieces, DEFAULT_LOADOUT.pieces),
      flair: readSlot(l.flair, DEFAULT_LOADOUT.flair),
    };
    const devGrants = Array.isArray(parsed.devGrants) ? parsed.devGrants.filter(isKnownSkuId) : [];
    return { loadout, devGrants };
  } catch {
    return DEFAULT_COSMETICS_STATE;
  }
}

export function saveCosmetics(state: CosmeticsState, storage: StorageLike | null = defaultStorage()): boolean {
  if (!storage) return false;
  try {
    const payload =
      state.devGrants.length > 0
        ? { version: COSMETICS_VERSION, loadout: state.loadout, devGrants: state.devGrants }
        : { version: COSMETICS_VERSION, loadout: state.loadout };
    storage.setItem(COSMETICS_KEY, JSON.stringify(payload));
    if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
    return true;
  } catch {
    return false; // quota exceeded etc. — loadout stays in-memory for this session
  }
}
