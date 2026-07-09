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

const ROOM_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no 0/O/1/I/L
const MAX_ROOM_CODE_ATTEMPTS = 10;

function makeRoomCode(): string {
  let code = "";
  for (let i = 0; i < 4; i++) code += ROOM_CODE_ALPHABET[Math.floor(Math.random() * ROOM_CODE_ALPHABET.length)];
  return code;
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

async function ensureProfile(admin: AdminClient, uid: string): Promise<void> {
  await admin.from("profiles").upsert({ id: uid }, { onConflict: "id", ignoreDuplicates: true });
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

async function joinRoom(admin: AdminClient, uid: string, roomCode: string): Promise<{ gameId: string }> {
  if (!/^[A-Z2-9]{4}$/.test(roomCode)) throw new Error("room codes are 4 letters");
  await ensureProfile(admin, uid);

  const { data: game, error } = await admin
    .from("games")
    .select("id, light, dark, status")
    .eq("room_code", roomCode)
    .eq("status", "waiting")
    .single();
  if (error || !game) throw new Error("room not found or already full");
  if (game.light === uid) throw new Error("you already created this room");

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
    .select("id, room_code, ruleset, light, dark, status, winner")
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

async function finalizeIfDecided(admin: AdminClient, gameId: string, state: GameState): Promise<void> {
  if (state.winner === null) return;
  const { data: secret } = await admin.from("game_secrets").select("seed").eq("game_id", gameId).single();
  await admin
    .from("games")
    .update({
      status: "finished",
      winner: state.winner,
      finished_at: new Date().toISOString(),
      seed_revealed: secret ? String(secret.seed) : null,
    })
    .eq("id", gameId);
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
