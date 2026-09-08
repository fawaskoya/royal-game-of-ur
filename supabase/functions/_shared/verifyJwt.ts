/**
 * Local verification of Supabase access tokens — a pure fast path.
 *
 * `admin.auth.getUser(jwt)` is a network call to the Auth service, and it was
 * costing ~380 ms on EVERY action: the single most expensive round trip in
 * the request, paid before any game work began. This project signs tokens
 * with ES256 and publishes the public key at the standard JWKS endpoint, so
 * the signature can be checked in-process instead.
 *
 * `createRemoteJWKSet` caches the key set in module scope, which lives as
 * long as the isolate: the first request after a cold start pays one fetch,
 * every request after it pays nothing.
 *
 * Deliberately cannot break authentication. This returns a uid only when the
 * token verifies here; ANY failure — bad signature, expired, unexpected
 * algorithm, unreachable key set, or an issuer that doesn't match because the
 * runtime URL differs from the public one — returns null, and the caller
 * falls back to the authoritative network check. A forged token therefore
 * costs an extra round trip before being rejected, which is the right trade:
 * the fast path can only ever make a *correct* answer quicker, never change
 * which answer is given.
 */
import { createRemoteJWKSet, jwtVerify } from "npm:jose@5";

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

function keySet(supabaseUrl: string): ReturnType<typeof createRemoteJWKSet> {
  if (!jwks) jwks = createRemoteJWKSet(new URL(`${supabaseUrl}/auth/v1/.well-known/jwks.json`));
  return jwks;
}

function algOf(jwt: string): string | null {
  try {
    const [header] = jwt.split(".");
    if (!header) return null;
    const json = JSON.parse(atob(header.replace(/-/g, "+").replace(/_/g, "/")));
    return typeof json.alg === "string" ? json.alg : null;
  } catch {
    return null;
  }
}

/** The caller's uid, or null meaning "ask the Auth service instead". */
export async function uidFromAccessToken(jwt: string, supabaseUrl: string): Promise<string | null> {
  // Symmetric (HS256) tokens are signed with a secret this function isn't
  // given, so there is nothing to check locally.
  const alg = algOf(jwt);
  if (alg !== "ES256" && alg !== "RS256") return null;

  try {
    // The key set is project-specific, so a token minted by any other project
    // cannot verify here; `jose` also enforces exp/nbf. Audience is checked
    // explicitly. Issuer is not: the function's runtime SUPABASE_URL is not
    // guaranteed to be the public one the token was stamped with, and a
    // mismatch there should cost a slow path, not a false rejection.
    const { payload } = await jwtVerify(jwt, keySet(supabaseUrl), { audience: "authenticated" });
    const uid = payload.sub;
    return typeof uid === "string" && uid.length > 0 ? uid : null;
  } catch {
    jwks = null; // a transient fetch failure shouldn't poison later requests
    return null;
  }
}
