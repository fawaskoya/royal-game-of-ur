"use client";

import { ensureSession } from "./supabaseClient";
import { invokeGameAction } from "./supabaseTransport";

export type MatchStatus = "idle" | "searching" | "matched";

export type MatchPollResult = {
  status: MatchStatus;
  gameId?: string;
  waitingSeconds: number;
  rating?: number;
};

export async function enqueueMatch(pool = "casual"): Promise<MatchPollResult> {
  const token = await ensureSession();
  return invokeGameAction<MatchPollResult>("enqueue_match", { pool }, token);
}

export async function pollMatch(): Promise<MatchPollResult> {
  const token = await ensureSession();
  return invokeGameAction<MatchPollResult>("poll_match", {}, token);
}

export async function cancelMatch(): Promise<void> {
  const token = await ensureSession();
  await invokeGameAction("cancel_match", {}, token);
}
