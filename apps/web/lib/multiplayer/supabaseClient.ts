"use client";

/**
 * Single Supabase client, browser-side only. Uses the publishable key
 * (safe for client code by design — it's the modern replacement for the
 * legacy "anon" key and carries no elevated privilege; RLS policies in
 * supabase/migrations/0001_init.sql are what actually gate access).
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null; // online play simply isn't offered — see isOnlineConfigured()
  client = createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true } });
  return client;
}

export function isOnlineConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
}

/**
 * Guest identity via Supabase anonymous sign-in — no login screen. Requires
 * "Anonymous Sign-ins" enabled in Dashboard → Authentication → Providers
 * (a one-time project toggle; see docs/GO_LIVE_PLAN.md).
 */
export async function ensureSession(): Promise<string> {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error("online play is not configured");
  const { data } = await supabase.auth.getSession();
  if (data.session) return data.session.access_token;
  const { data: signIn, error } = await supabase.auth.signInAnonymously();
  if (error || !signIn.session) throw new Error(error?.message ?? "could not start a guest session");
  return signIn.session.access_token;
}
