/**
 * Save-version migrations. Old saves are migrated shape-to-shape here, then
 * fully validated by `validateSavedGame` — migration never trusts its input.
 * Unknown or unmigratable versions return null (caller discards the save).
 */
import { CURRENT_SAVE_VERSION } from "./saveSchema";

export function migrateSavedGame(raw: unknown): unknown {
  if (typeof raw !== "object" || raw === null) return null;
  const version = (raw as { version?: unknown }).version;

  // v1 is current — pass through for validation.
  if (version === CURRENT_SAVE_VERSION) return raw;

  // Future: `if (version === 1) return upgradeV1toV2(raw);` chains live here.
  return null;
}
