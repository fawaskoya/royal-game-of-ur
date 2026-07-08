/**
 * Commit-reveal dice fairness (docs/ONLINE_ARCHITECTURE.md): the server
 * commits to a seed hash before any roll happens, so it cannot pick a seed
 * retroactively to favor an outcome; the seed is revealed at game end, and
 * anyone can then recompute every historical roll with `createRng(seed)` +
 * `Rng.setState` and confirm it matches `game_events`.
 *
 * The RNG itself (mulberry32) is "gameplay-quality, not cryptographic" per
 * its own doc comment — the commit-reveal wrapper is what supplies the
 * unpredictability and verifiability guarantee, not the generator's
 * statistical strength. A 32-bit crypto-random seed (~4.3 billion
 * possibilities) is adequate for a dice board game; this is not a
 * gambling-grade RNG.
 *
 * Full uint32 range (0..4294967295) — `game_secrets.seed`/`rng_state` are
 * `bigint` columns specifically so this and the RNG's evolving internal
 * state (also a full uint32, produced by mulberry32's `a >>> 0` — masking
 * it would desync exact-resume continuation) both fit without truncation.
 */
export function randomSeed(): number {
  const bytes = new Uint32Array(1);
  crypto.getRandomValues(bytes);
  return bytes[0]!;
}

export async function commitmentFor(seed: number): Promise<string> {
  const data = new TextEncoder().encode(String(seed));
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
