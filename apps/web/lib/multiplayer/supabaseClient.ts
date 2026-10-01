"use client";

/**
 * Single Supabase client, browser-side only. Uses the publishable key
 * (safe for client code by design — it's the modern replacement for the
 * legacy "anon" key and carries no elevated privilege; RLS policies in
 * supabase/migrations/0001_init.sql are what actually gate access).
 *
 * supabase-js is ~60 KB gzipped and most visitors never play online, so it is
 * loaded on demand: nothing imports it statically (types only), and the first
 * `getSupabase()` call fetches it. A visitor who never touches an online
 * feature — and has no stored session — never downloads it at all.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

let clientPromise: Promise<SupabaseClient> | null = null;
let loadedClient: SupabaseClient | null = null;
const readyListeners = new Set<(client: SupabaseClient) => void>();

export function isOnlineConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_KEY);
}

/** The client, loading supabase-js on first use; null when online isn't configured. */
export function getSupabase(): Promise<SupabaseClient | null> {
  if (!SUPABASE_URL || !SUPABASE_KEY) return Promise.resolve(null);
  clientPromise ??= import("@supabase/supabase-js").then(({ createClient }) => {
    const client = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: true, autoRefreshToken: true },
    });
    loadedClient = client;
    for (const cb of readyListeners) cb(client);
    return client;
  });
  return clientPromise;
}

/**
 * Run `cb` once the client exists — immediately if it already does — without
 * causing it to load. For passive observers (cosmetics re-syncing on sign-in)
 * that should ride along with online play rather than trigger it.
 */
export function onSupabaseReady(cb: (client: SupabaseClient) => void): () => void {
  // Exactly once: now if loaded, otherwise when the load completes.
  if (loadedClient) {
    cb(loadedClient);
    return () => undefined;
  }
  readyListeners.add(cb);
  return () => void readyListeners.delete(cb);
}

/**
 * True when this browser already holds a Supabase session — read straight
 * from storage, no network, no library load. supabase-js keys the session as
 * `sb-<project-ref>-auth-token`.
 */
export function hasStoredSession(): boolean {
  if (!SUPABASE_URL || typeof window === "undefined") return false;
  try {
    const ref = new URL(SUPABASE_URL).hostname.split(".")[0];
    return window.localStorage.getItem(`sb-${ref}-auth-token`) !== null;
  } catch {
    return false;
  }
}

/**
 * The client only if there could be a signed-in player to act for: it is
 * already loaded, or a session is stored. Signed-out visitors get null and
 * never pay for the library.
 */
export function getSupabaseIfSession(): Promise<SupabaseClient | null> {
  if (clientPromise || hasStoredSession()) return getSupabase();
  return Promise.resolve(null);
}

/**
 * Guest identity via Supabase anonymous sign-in — no login screen. Requires
 * "Anonymous Sign-ins" enabled in Dashboard → Authentication → Providers
 * (a one-time project toggle; see docs/GO_LIVE_PLAN.md).
 */
export async function ensureSession(): Promise<string> {
  const supabase = await getSupabase();
  if (!supabase) throw new Error("online play is not configured");
  const { data } = await supabase.auth.getSession();
  if (data.session) return data.session.access_token;
  const { data: signIn, error } = await supabase.auth.signInAnonymously();
  if (error || !signIn.session) throw new Error(error?.message ?? "could not start a guest session");
  return signIn.session.access_token;
}
