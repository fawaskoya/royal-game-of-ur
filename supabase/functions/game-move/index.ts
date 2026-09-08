/**
 * Server-authoritative Royal Game of Ur moves — the "game service" from
 * docs/ONLINE_ARCHITECTURE.md. One Edge Function, action-routed, covering
 * Phase A (private rooms): create_room, join_room, roll, move.
 *
 * Every write reconstructs state via `buildStateFromEvents` from the stored
 * event log (never trusts a cached "current player" column), applies the
 * requested action through the same `@ur/engine` the client uses, and
 * appends the resulting events — identical validation to local/offline play,
 * just with the client's own proposal instead of local input. Reads (event
 * history, live updates) go through ordinary PostgREST + Realtime on
 * `game_events`, governed by the RLS policies in the migration — this
 * function only ever needs to write.
 *
 * Verified live 2026-07-08/09: scripted two-account game (create/join/roll/
 * move + cross-seat and staleness rejections), then the real browser client.
 */
import { createClient } from "npm:@supabase/supabase-js@2";
import {
  FINKEL_RULESET,
  applyMove,
  applyRoll,
  buildStateFromEvents,
  createRng,
  phaseOf,
  rollDice,
  type GameEvent,
  type GameState,
  type Move,
  type PlayerId,
} from "../_shared/engine.ts";
import { commitmentFor, randomSeed } from "../_shared/fairDice.ts";
import { INITIAL_RATING, applyResult } from "../_shared/rating.ts";

// Per-turn clock for ALL online games (rooms + matches). The opponent may
// claim a win once the player to act has been silent this long. Keep the
// client display constant (supabaseTransport.ONLINE_TURN_TIMEOUT_SECONDS)
// in sync with this value.
const TURN_TIMEOUT_SECONDS = 120;

const ROOM_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no 0/O/1/I/L
const MAX_ROOM_CODE_ATTEMPTS = 10;

function makeRoomCode(): string {
  let code = "";
  for (let i = 0; i < 4; i++) code += ROOM_CODE_ALPHABET[Math.floor(Math.random() * ROOM_CODE_ALPHABET.length)];
  return code;
}

// Every guest gets a readable identity the moment they first touch the
// server — deterministic from their uid, so concurrent calls agree, and
// editable later via the own-profile RLS policy.
const HANDLE_ADJ = ["Golden", "Swift", "Quiet", "Bold", "Lucky", "Ancient", "Bright", "Cunning", "Steady", "Royal", "Patient", "Fierce"];
const HANDLE_NOUN = ["Rosette", "Heron", "Lion", "Scribe", "Pilgrim", "Falcon", "Reed", "Bull", "Star", "River", "Tablet", "Kite"];

function handleFor(uid: string): string {
  let h = 0;
  for (const ch of uid) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const adj = HANDLE_ADJ[h % HANDLE_ADJ.length];
  const noun = HANDLE_NOUN[Math.floor(h / 64) % HANDLE_NOUN.length];
  return `${adj} ${noun} ${(h % 90) + 10}`;
}

// The full header set supabase-js actually sends (it adds apikey and
// x-client-info beyond the obvious two) — omitting any of them fails the
// browser preflight even though server-to-server calls sail through.
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
} as const;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

function errorResponse(message: string, status = 400): Response {
  return jsonResponse({ error: message }, status);
}

interface GameRow {
  id: string;
  room_code: string | null;
  ruleset: GameState["ruleset"];
  light: string | null;
  dark: string | null;
  status: "waiting" | "playing" | "finished" | "abandoned";
  winner: PlayerId | null;
  rematch_game_id: string | null;
  started_at: string | null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }
  if (req.method !== "POST") return errorResponse("POST only", 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SECRET_KEY");
  if (!supabaseUrl || !serviceKey) return errorResponse("server misconfigured", 500);

  // The service client bypasses RLS (that's the point — this function IS
  // the trusted authority); the caller's own identity comes from their JWT.
  const authHeader = req.headers.get("Authorization") ?? "";
  const jwt = authHeader.replace(/^Bearer\s+/i, "");
  if (!jwt) return errorResponse("missing Authorization bearer token", 401);

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const { data: userData, error: userError } = await admin.auth.getUser(jwt);
  if (userError || !userData.user) return errorResponse("invalid session", 401);
  const uid = userData.user.id;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return errorResponse("body must be JSON");
  }
  const action = body.action;

  try {
    switch (action) {
      case "whoami":
        return jsonResponse(await whoami(admin, uid));
      case "create_room":
        return jsonResponse(await createRoom(admin, uid));
      case "join_room":
        return jsonResponse(await joinRoom(admin, uid, String(body.roomCode ?? "")));
      case "roll":
        return jsonResponse(await handleRoll(admin, uid, String(body.gameId ?? ""), Number(body.afterEvent)));
      case "move":
        return jsonResponse(
          await handleMove(admin, uid, String(body.gameId ?? ""), Number(body.afterEvent), body.move as Move),
        );
      case "rematch":
        return jsonResponse(await rematch(admin, uid, String(body.gameId ?? "")));
      case "resign":
        return jsonResponse(await resignGame(admin, uid, String(body.gameId ?? "")));
      case "claim_timeout":
        return jsonResponse(await claimTimeout(admin, uid, String(body.gameId ?? "")));
      case "enqueue_match":
        return jsonResponse(await enqueueMatch(admin, uid, String(body.pool ?? "casual")));
      case "cancel_match":
        return jsonResponse(await cancelMatch(admin, uid));
      case "poll_match":
        return jsonResponse(await pollMatch(admin, uid));
      default:
        return errorResponse(`unknown action "${String(action)}"`);
    }
  } catch (err) {
    // Engine errors (ILLEGAL_MOVE, REPLAY_MISMATCH, ...) and our own guard
    // throws both land here — never leak internals, but do surface the
    // reason so the client can show something meaningful.
    const message = err instanceof Error ? err.message : "request failed";
    return errorResponse(message, 400);
  }
});

type AdminClient = ReturnType<typeof createClient>;

/** Make sure a profile row exists with a handle; returns the handle. A
 * user-edited handle is never overwritten (the update is null-guarded). */
async function ensureProfile(admin: AdminClient, uid: string): Promise<string> {
  const { data: existing } = await admin.from("profiles").select("handle").eq("id", uid).maybeSingle();
  if (existing?.handle) return existing.handle as string;
  const handle = handleFor(uid);
  if (existing) {
    await admin.from("profiles").update({ handle }).eq("id", uid).is("handle", null);
  } else {
    await admin.from("profiles").upsert({ id: uid, handle }, { onConflict: "id", ignoreDuplicates: true });
  }
  return handle;
}

/** Who am I online: handle + casual-pool rating (null until first rated game). */
async function whoami(
  admin: AdminClient,
  uid: string,
): Promise<{ handle: string; rating: number | null; gamesPlayed: number }> {
  const handle = await ensureProfile(admin, uid);
  const { data } = await admin
    .from("ratings")
    .select("rating, games_played")
    .eq("profile_id", uid)
    .eq("pool", "casual")
    .maybeSingle();
  return {
    handle,
    rating: data ? (data.rating as number) : null,
    gamesPlayed: data ? (data.games_played as number) : 0,
  };
}

async function createRoom(admin: AdminClient, uid: string): Promise<{ gameId: string; roomCode: string }> {
  await ensureProfile(admin, uid);

  const seed = randomSeed();
  const seedCommitment = await commitmentFor(seed);

  let roomCode = "";
  let gameId = "";
  for (let attempt = 0; attempt < MAX_ROOM_CODE_ATTEMPTS; attempt++) {
    roomCode = makeRoomCode();
    const { data, error } = await admin
      .from("games")
      .insert({
        room_code: roomCode,
        ruleset: FINKEL_RULESET,
        light: uid,
        status: "waiting",
        seed_commitment: seedCommitment,
        // match_pool left null (private invite); column added in 0005_matchmaking
      })
      .select("id")
      .single();
    if (!error && data) {
      gameId = data.id as string;
      break;
    }
    if (error && !String(error.message).includes("duplicate")) throw new Error(error.message);
  }
  if (!gameId) throw new Error("could not allocate a room code — try again");

  const { error: secretError } = await admin.from("game_secrets").insert({ game_id: gameId, seed });
  if (secretError) throw new Error(secretError.message);

  return { gameId, roomCode };
}

/** Rating for matchmaking; creates the casual row at INITIAL if needed. */
async function ratingFor(admin: AdminClient, uid: string, pool: string): Promise<number> {
  const { data } = await admin
    .from("ratings")
    .select("rating")
    .eq("profile_id", uid)
    .eq("pool", pool)
    .maybeSingle();
  if (data?.rating != null) return data.rating as number;
  return INITIAL_RATING;
}

/**
 * Global matchmaking: enqueue the player, then try to pair with the oldest
 * suitable waiting opponent in the same pool. Rating window expands with wait
 * time so someone is always findable.
 */
async function enqueueMatch(
  admin: AdminClient,
  uid: string,
  pool: string,
): Promise<{ status: "searching" | "matched"; gameId?: string; rating: number; waitingSeconds: number }> {
  const cleanPool = pool === "ranked" ? "casual" : (pool || "casual"); // single pool for v1
  await ensureProfile(admin, uid);
  const rating = await ratingFor(admin, uid, cleanPool);

  // Already matched while tab was asleep?
  const { data: existing } = await admin
    .from("matchmaking_queue")
    .select("matched_game_id, enqueued_at")
    .eq("profile_id", uid)
    .maybeSingle();
  if (existing?.matched_game_id) {
    return {
      status: "matched",
      gameId: existing.matched_game_id as string,
      rating,
      waitingSeconds: 0,
    };
  }

  const enqueuedAt = existing?.enqueued_at ?? new Date().toISOString();
  const { error: upError } = await admin.from("matchmaking_queue").upsert(
    {
      profile_id: uid,
      pool: cleanPool,
      rating,
      enqueued_at: enqueuedAt,
      matched_game_id: null,
    },
    { onConflict: "profile_id" },
  );
  if (upError) throw new Error(upError.message);

  const matched = await tryPairMatch(admin, uid, cleanPool, rating);
  if (matched) {
    return { status: "matched", gameId: matched, rating, waitingSeconds: 0 };
  }

  const waitingSeconds = Math.max(0, Math.floor((Date.now() - new Date(enqueuedAt).getTime()) / 1000));
  return { status: "searching", rating, waitingSeconds };
}

async function cancelMatch(admin: AdminClient, uid: string): Promise<{ ok: true }> {
  // Drop the queue row entirely (searching or already matched — client joined).
  await admin.from("matchmaking_queue").delete().eq("profile_id", uid);
  return { ok: true };
}

async function pollMatch(
  admin: AdminClient,
  uid: string,
): Promise<{ status: "idle" | "searching" | "matched"; gameId?: string; waitingSeconds: number; rating?: number }> {
  const { data: row } = await admin
    .from("matchmaking_queue")
    .select("matched_game_id, enqueued_at, pool, rating")
    .eq("profile_id", uid)
    .maybeSingle();
  if (!row) return { status: "idle", waitingSeconds: 0 };
  if (row.matched_game_id) {
    return {
      status: "matched",
      gameId: row.matched_game_id as string,
      waitingSeconds: 0,
      rating: row.rating as number,
    };
  }
  const pool = (row.pool as string) || "casual";
  const rating = row.rating as number;
  const matched = await tryPairMatch(admin, uid, pool, rating);
  if (matched) {
    return { status: "matched", gameId: matched, waitingSeconds: 0, rating };
  }
  const waitingSeconds = Math.max(0, Math.floor((Date.now() - new Date(row.enqueued_at as string).getTime()) / 1000));
  return { status: "searching", waitingSeconds, rating };
}

/**
 * Pair this player with the best waiting opponent.
 * Window: ±(200 + 25 * minutes waiting), floored at 200, uncapped after 5 min.
 */
async function tryPairMatch(
  admin: AdminClient,
  uid: string,
  pool: string,
  myRating: number,
): Promise<string | null> {
  const { data: me } = await admin
    .from("matchmaking_queue")
    .select("enqueued_at, matched_game_id")
    .eq("profile_id", uid)
    .maybeSingle();
  if (!me || me.matched_game_id) return (me?.matched_game_id as string) ?? null;

  const waitMin = Math.max(0, (Date.now() - new Date(me.enqueued_at as string).getTime()) / 60000);
  const window = waitMin >= 5 ? 99999 : Math.floor(200 + 25 * waitMin);

  const { data: candidates, error } = await admin
    .from("matchmaking_queue")
    .select("profile_id, rating, enqueued_at")
    .eq("pool", pool)
    .is("matched_game_id", null)
    .neq("profile_id", uid)
    .order("enqueued_at", { ascending: true })
    .limit(40);
  if (error) throw new Error(error.message);
  if (!candidates?.length) return null;

  // Prefer closest rating within window; fall back to oldest in window.
  type Cand = { profile_id: string; rating: number; enqueued_at: string };
  const inWindow = (candidates as Cand[]).filter((c) => Math.abs(c.rating - myRating) <= window);
  if (inWindow.length === 0) return null;
  inWindow.sort((a, b) => Math.abs(a.rating - myRating) - Math.abs(b.rating - myRating));
  const opp = inWindow[0]!;

  // Create the game first, then claim both queue rows atomically.
  const seed = randomSeed();
  const seedCommitment = await commitmentFor(seed);
  // Higher rating opens as Light (first); ties → lexicographic uid.
  const light = myRating > opp.rating || (myRating === opp.rating && uid < opp.profile_id) ? uid : opp.profile_id;
  const dark = light === uid ? opp.profile_id : uid;

  const { data: created, error: createError } = await admin
    .from("games")
    .insert({
      room_code: null,
      ruleset: FINKEL_RULESET,
      light,
      dark,
      status: "playing",
      seed_commitment: seedCommitment,
      started_at: new Date().toISOString(),
      match_pool: pool,
    })
    .select("id")
    .single();
  if (createError || !created) throw new Error(createError?.message ?? "could not create match");
  const gameId = created.id as string;

  const { error: secretError } = await admin.from("game_secrets").insert({ game_id: gameId, seed });
  if (secretError) {
    await admin.from("games").delete().eq("id", gameId);
    throw new Error(secretError.message);
  }

  // Claim both seats on the queue; if either already matched, roll back the game.
  const { data: claimedMe } = await admin
    .from("matchmaking_queue")
    .update({ matched_game_id: gameId })
    .eq("profile_id", uid)
    .is("matched_game_id", null)
    .select("profile_id");
  const { data: claimedOpp } = await admin
    .from("matchmaking_queue")
    .update({ matched_game_id: gameId })
    .eq("profile_id", opp.profile_id)
    .is("matched_game_id", null)
    .select("profile_id");

  if (!claimedMe?.length || !claimedOpp?.length) {
    // Race lost — clean up orphan game and let the next poll retry.
    await admin.from("games").delete().eq("id", gameId);
    if (claimedMe?.length) {
      await admin.from("matchmaking_queue").update({ matched_game_id: null }).eq("profile_id", uid);
    }
    if (claimedOpp?.length) {
      await admin.from("matchmaking_queue").update({ matched_game_id: null }).eq("profile_id", opp.profile_id);
    }
    return null;
  }

  // Clear queue rows after a successful match (optional; keep for a moment so
  // the other client's poll can still read matched_game_id, then they leave).
  // Keep rows until client cancels/leaves — poll returns gameId while present.

  return gameId;
}

/**
 * Resolve a room code to a game — for a new opponent taking the empty seat,
 * OR for a player who is already seated coming back.
 *
 * The rejoin case matters: `room_code` is never cleared, so the code stays a
 * stable handle on the game, and a player who refreshed (or whose mobile
 * browser evicted the tab) has no other way back in — the client keeps no
 * record of the game id. Without this they were locked out of a game that
 * was still perfectly alive server-side, and lost it on the turn clock.
 * Returning the existing game is safe: seats are already assigned, so this
 * grants nothing a rejoining player didn't already have.
 */
async function joinRoom(admin: AdminClient, uid: string, roomCode: string): Promise<{ gameId: string }> {
  if (!/^[A-Z2-9]{4}$/.test(roomCode)) throw new Error("room codes are 4 letters");
  await ensureProfile(admin, uid);

  const { data: game, error } = await admin
    .from("games")
    .select("id, light, dark, status")
    .eq("room_code", roomCode)
    .maybeSingle();
  if (error || !game) throw new Error("room not found");

  // Already seated here — this is a reconnect, not a join.
  if (game.light === uid || game.dark === uid) {
    if (game.status === "finished" || game.status === "abandoned") {
      throw new Error("that game has already finished");
    }
    return { gameId: game.id as string };
  }

  if (game.status !== "waiting") throw new Error("room not found or already full");

  const { error: updateError } = await admin
    .from("games")
    .update({ dark: uid, status: "playing", started_at: new Date().toISOString() })
    .eq("id", game.id)
    .eq("status", "waiting"); // guards a race between two simultaneous joiners
  if (updateError) throw new Error(updateError.message);

  return { gameId: game.id as string };
}

async function loadGame(admin: AdminClient, gameId: string): Promise<GameRow> {
  const { data, error } = await admin
    .from("games")
    .select("id, room_code, ruleset, light, dark, status, winner, rematch_game_id, started_at")
    .eq("id", gameId)
    .single();
  if (error || !data) throw new Error("game not found");
  return data as GameRow;
}

async function loadEvents(admin: AdminClient, gameId: string): Promise<GameEvent[]> {
  const { data, error } = await admin
    .from("game_events")
    .select("event")
    .eq("game_id", gameId)
    .order("seq", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => row.event as GameEvent);
}

function seatOf(game: GameRow, uid: string): PlayerId | null {
  if (game.light === uid) return 0;
  if (game.dark === uid) return 1;
  return null;
}

async function appendEvents(admin: AdminClient, gameId: string, fromIndex: number, events: GameEvent[]): Promise<void> {
  if (events.length === 0) return;
  const rows = events.map((event, i) => ({ game_id: gameId, seq: fromIndex + i, event }));
  const { error } = await admin.from("game_events").insert(rows);
  if (error) throw new Error(error.message);
}

type EndReason = "finish" | "resign" | "timeout";

/** One-shot game ending shared by every path (board finish, resignation,
 * timeout claim). The status guard makes it exactly-once: only the request
 * that actually flips playing → finished gets rows back, and only that
 * request applies ratings — retries and races can't double-count. */
async function endGame(admin: AdminClient, gameId: string, winner: PlayerId, reason: EndReason): Promise<boolean> {
  const { data: secret } = await admin.from("game_secrets").select("seed").eq("game_id", gameId).single();
  const { data: transitioned, error } = await admin
    .from("games")
    .update({
      status: "finished",
      winner,
      end_reason: reason,
      finished_at: new Date().toISOString(),
      seed_revealed: secret ? String(secret.seed) : null,
    })
    .eq("id", gameId)
    .eq("status", "playing")
    .select("light, dark");
  if (error) throw new Error(error.message);
  const row = transitioned?.[0] as { light: string | null; dark: string | null } | undefined;
  if (!row || !row.light || !row.dark) return false;
  const winnerId = winner === 0 ? row.light : row.dark;
  const loserId = winner === 0 ? row.dark : row.light;
  await applyRatings(admin, winnerId, loserId);
  return true;
}

async function finalizeIfDecided(admin: AdminClient, gameId: string, state: GameState): Promise<void> {
  if (state.winner === null) return;
  await endGame(admin, gameId, state.winner, "finish");
}

/** Concede: a seated player hands the win to their opponent. Counts as a
 * normal rated loss — resigning must never be cheaper than losing. */
async function resignGame(
  admin: AdminClient,
  uid: string,
  gameId: string,
): Promise<{ winner: PlayerId; endReason: EndReason }> {
  const game = await loadGame(admin, gameId);
  if (game.status !== "playing") throw new Error("game is not in progress");
  const seat = seatOf(game, uid);
  if (seat === null) throw new Error("you are not seated in this game");
  const winner = (seat === 0 ? 1 : 0) as PlayerId;
  await endGame(admin, gameId, winner, "resign");
  return { winner, endReason: "resign" };
}

/** Claim a win on the opponent's expired turn clock. Server-verified: the
 * clock anchor is the last event's server timestamp (or game start), never
 * anything the client asserts. Early claims return the remaining seconds so
 * the client can resync its countdown instead of erroring. */
async function claimTimeout(
  admin: AdminClient,
  uid: string,
  gameId: string,
): Promise<{ claimable: boolean; remainingSeconds?: number; winner?: PlayerId; endReason?: EndReason }> {
  const game = await loadGame(admin, gameId);
  if (game.status !== "playing") throw new Error("game is not in progress");
  const seat = seatOf(game, uid);
  if (seat === null) throw new Error("you are not seated in this game");

  const events = await loadEvents(admin, gameId);
  const state = buildStateFromEvents(game.ruleset, events);
  if (state.current === seat) throw new Error("it is your turn — you can only claim on the opponent's clock");

  const { data: lastRow } = await admin
    .from("game_events")
    .select("server_ts")
    .eq("game_id", gameId)
    .order("seq", { ascending: false })
    .limit(1)
    .maybeSingle();
  const anchorIso = (lastRow?.server_ts as string | undefined) ?? game.started_at ?? null;
  const anchor = anchorIso ? new Date(anchorIso).getTime() : Date.now();
  const elapsed = (Date.now() - anchor) / 1000;
  const remaining = TURN_TIMEOUT_SECONDS - elapsed;
  if (remaining > 0) return { claimable: false, remainingSeconds: Math.ceil(remaining) };

  const ended = await endGame(admin, gameId, seat, "timeout");
  if (!ended) {
    // Lost a race with the opponent's own move/resign — game already over.
    throw new Error("the game just ended");
  }
  return { claimable: true, winner: seat, endReason: "timeout" };
}

/** Elo for the casual pool — server-authoritative, applied exactly once per
 * finished game (see the transition guard above). */
async function applyRatings(admin: AdminClient, winnerId: string, loserId: string): Promise<void> {
  const { data: rows, error } = await admin
    .from("ratings")
    .select("profile_id, rating, games_played, wins, losses")
    .in("profile_id", [winnerId, loserId])
    .eq("pool", "casual");
  if (error) throw new Error(error.message);
  const find = (id: string) => rows?.find((r) => r.profile_id === id) as
    | { rating: number; games_played: number; wins?: number; losses?: number }
    | undefined;
  const w = find(winnerId) ?? { rating: INITIAL_RATING, games_played: 0, wins: 0, losses: 0 };
  const l = find(loserId) ?? { rating: INITIAL_RATING, games_played: 0, wins: 0, losses: 0 };
  const next = applyResult(
    { rating: w.rating, games: w.games_played },
    { rating: l.rating, games: l.games_played },
  );
  const updated_at = new Date().toISOString();
  const { error: upsertError } = await admin.from("ratings").upsert(
    [
      {
        profile_id: winnerId,
        pool: "casual",
        rating: next.winner,
        games_played: w.games_played + 1,
        wins: (w.wins ?? 0) + 1,
        losses: w.losses ?? 0,
        updated_at,
      },
      {
        profile_id: loserId,
        pool: "casual",
        rating: next.loser,
        games_played: l.games_played + 1,
        wins: l.wins ?? 0,
        losses: (l.losses ?? 0) + 1,
        updated_at,
      },
    ],
    { onConflict: "profile_id,pool" },
  );
  if (upsertError) throw new Error(upsertError.message);
}

/** Arrange (or find) the successor game, seats swapped for fairness. Both
 * players call the same action; the games-row UPDATE that records
 * `rematch_game_id` is also what notifies the other side via Realtime. */
async function rematch(admin: AdminClient, uid: string, gameId: string): Promise<{ gameId: string }> {
  const game = await loadGame(admin, gameId);
  if (seatOf(game, uid) === null) throw new Error("you are not seated in this game");
  if (game.status !== "finished") throw new Error("the game isn't over yet");
  if (game.rematch_game_id) return { gameId: game.rematch_game_id };
  if (!game.light || !game.dark) throw new Error("this game has no opponent to rematch");

  const seed = randomSeed();
  const seedCommitment = await commitmentFor(seed);
  const { data: created, error } = await admin
    .from("games")
    .insert({
      ruleset: game.ruleset,
      light: game.dark, // seats swap: last game's second player opens
      dark: game.light,
      status: "playing",
      seed_commitment: seedCommitment,
      started_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (error || !created) throw new Error(error?.message ?? "could not create the rematch");
  const newId = created.id as string;
  const { error: secretError } = await admin.from("game_secrets").insert({ game_id: newId, seed });
  if (secretError) throw new Error(secretError.message);

  // Claim the pointer; if the opponent's simultaneous click won, discard
  // ours (cascade removes its secret) and follow theirs.
  const { data: claimed } = await admin
    .from("games")
    .update({ rematch_game_id: newId })
    .eq("id", gameId)
    .is("rematch_game_id", null)
    .select("id");
  if (!claimed || claimed.length === 0) {
    await admin.from("games").delete().eq("id", newId);
    const again = await loadGame(admin, gameId);
    if (again.rematch_game_id) return { gameId: again.rematch_game_id };
    throw new Error("could not arrange the rematch — try again");
  }
  return { gameId: newId };
}

async function handleRoll(
  admin: AdminClient,
  uid: string,
  gameId: string,
  afterEvent: number,
): Promise<{ events: GameEvent[] }> {
  const game = await loadGame(admin, gameId);
  if (game.status !== "playing") throw new Error("game is not in progress");
  const seat = seatOf(game, uid);
  if (seat === null) throw new Error("you are not seated in this game");

  const events = await loadEvents(admin, gameId);
  if (events.length !== afterEvent) throw new Error("stale request — the game has moved on");

  const state = buildStateFromEvents(game.ruleset, events);
  if (state.current !== seat) throw new Error("not your turn");
  if (phaseOf(state) !== "awaiting-roll") throw new Error("a roll is not expected right now");

  const { data: secret, error: secretError } = await admin
    .from("game_secrets")
    .select("seed, rng_state")
    .eq("game_id", gameId)
    .single();
  if (secretError || !secret) throw new Error("room secret missing — this room may be corrupted");

  const rng = createRng(secret.seed as number);
  if (secret.rng_state !== null) rng.setState(secret.rng_state as number);
  const roll = rollDice(rng, game.ruleset.diceCount);

  const next = applyRoll(state, roll);
  const newEvents = next.history.slice(events.length);
  await appendEvents(admin, gameId, events.length, newEvents);
  await admin.from("game_secrets").update({ rng_state: rng.getState() }).eq("game_id", gameId);
  await finalizeIfDecided(admin, gameId, next);

  return { events: newEvents };
}

async function handleMove(
  admin: AdminClient,
  uid: string,
  gameId: string,
  afterEvent: number,
  move: Move,
): Promise<{ events: GameEvent[] }> {
  if (!move || typeof move !== "object") throw new Error("missing move");
  const game = await loadGame(admin, gameId);
  if (game.status !== "playing") throw new Error("game is not in progress");
  const seat = seatOf(game, uid);
  if (seat === null) throw new Error("you are not seated in this game");
  if (move.player !== seat) throw new Error("you can only move your own pieces");

  const events = await loadEvents(admin, gameId);
  if (events.length !== afterEvent) throw new Error("stale request — the game has moved on");

  const state = buildStateFromEvents(game.ruleset, events);
  const next = applyMove(state, move); // throws ILLEGAL_MOVE on any invalid move
  const newEvents = next.history.slice(events.length);
  await appendEvents(admin, gameId, events.length, newEvents);
  await finalizeIfDecided(admin, gameId, next);

  return { events: newEvents };
}
