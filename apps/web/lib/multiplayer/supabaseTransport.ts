"use client";

/**
 * Real online transport: implements `MultiplayerTransport` against the
 * `game-move` Edge Function (writes) + Realtime on `game_events` (reads).
 * Backend verified end-to-end 2026-07-08 (see docs/MULTIPLAYER_ARCHITECTURE).
 *
 * Delivery model: every batch carries `fromIndex` (the seq of its first
 * event). Batches may overlap or repeat — full history on connect/resync,
 * one-row Realtime inserts, and the mover's own function response all flow
 * through the same `onEvents` path — so the consumer (useOnlineRoom) slots
 * events by seq and ignores what it already has. Subscription starts BEFORE
 * the history fetch, so nothing can fall between them.
 */
import type { GameEvent, PlayerId, RulesetConfig } from "@ur/engine";
import type {
  MultiplayerTransport,
  ProposedMove,
  RoomPlayer,
  ServerEventBatch,
  TransportStatus,
} from "@/lib/network/types";
import { ensureSession, getSupabaseClient } from "./supabaseClient";

interface GameRow {
  id: string;
  room_code: string | null;
  ruleset: RulesetConfig;
  light: string | null;
  dark: string | null;
  status: "waiting" | "playing" | "finished" | "abandoned";
  rematch_game_id?: string | null;
}

export async function invokeGameAction<T>(action: string, payload: Record<string, unknown>, token: string): Promise<T> {
  return invoke<T>(action, payload, token);
}

async function invoke<T>(action: string, payload: Record<string, unknown>, token: string): Promise<T> {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error("online play is not configured");

  // Cold starts are real: the first hit after the function has been idle can
  // 503 while the worker boots. One short retry absorbs almost all of them,
  // and the function's staleness checks make a duplicated action harmless.
  for (let attempt = 0; ; attempt++) {
    const { data, error } = await supabase.functions.invoke("game-move", {
      body: { action, ...payload },
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!error) {
      if (data?.error) throw new Error(data.error);
      return data as T;
    }

    // Surface the function's own error body ("not your turn", "stale
    // request", ...) instead of the generic non-2xx message.
    const context = (error as { context?: Response }).context;
    const status = context?.status ?? 0;
    if (context && typeof context.json === "function") {
      const body = await context.json().catch(() => null);
      if (body && typeof body.error === "string") throw new Error(body.error);
    }
    const transient = status === 0 || status >= 500;
    if (transient && attempt === 0) {
      await new Promise((resolve) => setTimeout(resolve, 1200));
      continue;
    }
    throw new Error(status >= 500 || status === 0 ? "The game server is waking up — please try again." : error.message);
  }
}

export class SupabaseRoomTransport implements MultiplayerTransport {
  status: TransportStatus = "idle";
  #gameId: string | null = null;
  #token: string | null = null;
  #eventCbs = new Set<(batch: ServerEventBatch) => void>();
  #playerCbs = new Set<(players: readonly RoomPlayer[]) => void>();
  #statusCbs = new Set<(status: TransportStatus) => void>();
  #rematchCbs = new Set<(nextGameId: string) => void>();
  #channel: ReturnType<NonNullable<ReturnType<typeof getSupabaseClient>>["channel"]> | null = null;

  /** Set once `connect()` resolves — the room hook reads these, mirroring
   * how `LocalRoomTransport.onWelcome` surfaces "who am I, what ruleset". */
  ruleset: RulesetConfig | null = null;
  mySeat: PlayerId | null = null;

  #setStatus(status: TransportStatus): void {
    this.status = status;
    for (const cb of this.#statusCbs) cb(status);
  }

  #emitBatch(fromIndex: number, events: readonly GameEvent[]): void {
    if (!this.#gameId || events.length === 0) return;
    for (const cb of this.#eventCbs) cb({ gameId: this.#gameId, fromIndex, events });
  }

  /** roomId here is the game's UUID (resolve a room code via `joinOnlineRoom` first). */
  async connect(gameId: string, _token: string): Promise<void> {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error("online play is not configured");
    this.#setStatus("connecting");
    this.#token = await ensureSession();
    this.#gameId = gameId;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data: game, error } = await supabase
      .from("games")
      .select("id, room_code, ruleset, light, dark, status")
      .eq("id", gameId)
      .single<GameRow>();
    if (error || !game) {
      this.#setStatus("closed");
      throw new Error("room not found");
    }
    this.ruleset = game.ruleset;
    this.mySeat = user && game.light === user.id ? 0 : user && game.dark === user.id ? 1 : null;
    this.#emitPlayers(game);

    // Subscribe BEFORE fetching history: seq-keyed delivery makes overlap
    // harmless, while a gap would be unrecoverable without a resync.
    this.#channel = supabase
      .channel(`game:${gameId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "game_events", filter: `game_id=eq.${gameId}` },
        (payload) => {
          const row = payload.new as { seq: number; event: GameEvent };
          this.#emitBatch(row.seq, [row.event]);
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "games", filter: `id=eq.${gameId}` },
        (payload) => {
          const row = payload.new as GameRow;
          this.#emitPlayers(row);
          // A rematch pointer appearing on the finished game IS the offer
          // notification — no separate channel needed.
          if (row.rematch_game_id) for (const cb of this.#rematchCbs) cb(row.rematch_game_id);
        },
      )
      .subscribe();

    await this.resync();
    this.#setStatus("connected");
  }

  /** Refetch the full event log and re-emit it as one batch from seq 0.
   * Cheap and idempotent — the hook's seq-slotting drops known events. */
  async resync(): Promise<void> {
    const supabase = getSupabaseClient();
    if (!supabase || !this.#gameId) return;
    const { data, error } = await supabase
      .from("game_events")
      .select("seq, event")
      .eq("game_id", this.#gameId)
      .order("seq", { ascending: true });
    if (error) throw new Error(error.message);
    this.#emitBatch(0, (data ?? []).map((row) => row.event as GameEvent));
  }

  #emitPlayers(game: GameRow): void {
    const players: RoomPlayer[] = [];
    if (game.light) players.push({ id: game.light, name: "Light", seat: 0, connected: true });
    if (game.dark) players.push({ id: game.dark, name: "Dark", seat: 1, connected: true });
    for (const cb of this.#playerCbs) cb(players);
  }

  disconnect(): void {
    this.#channel?.unsubscribe();
    this.#channel = null;
    this.#gameId = null;
    this.#setStatus("closed");
  }

  async sendMove(proposal: ProposedMove): Promise<void> {
    if (!this.#token) throw new Error("not connected");
    const result = await invoke<{ events: GameEvent[] }>(
      "move",
      { gameId: proposal.gameId, afterEvent: proposal.afterEvent, move: proposal.move },
      this.#token,
    );
    // Realtime will deliver these too; emitting the response directly makes
    // the mover's own UI instant, and seq-slotting dedupes the repeat.
    this.#emitBatch(proposal.afterEvent, result.events);
  }

  async requestRoll(gameId: string, afterEvent: number): Promise<void> {
    if (!this.#token) throw new Error("not connected");
    const result = await invoke<{ events: GameEvent[] }>("roll", { gameId, afterEvent }, this.#token);
    this.#emitBatch(afterEvent, result.events);
  }

  onEvents(cb: (batch: ServerEventBatch) => void): () => void {
    this.#eventCbs.add(cb);
    return () => this.#eventCbs.delete(cb);
  }

  onPlayersChanged(cb: (players: readonly RoomPlayer[]) => void): () => void {
    this.#playerCbs.add(cb);
    return () => this.#playerCbs.delete(cb);
  }

  onStatusChanged(cb: (status: TransportStatus) => void): () => void {
    this.#statusCbs.add(cb);
    return () => this.#statusCbs.delete(cb);
  }

  /** Fires when the current game gains a rematch successor (either side asked). */
  onRematch(cb: (nextGameId: string) => void): () => void {
    this.#rematchCbs.add(cb);
    return () => this.#rematchCbs.delete(cb);
  }
}

/** Ask the server for (or find) the rematch successor of a finished game. */
export async function requestRematch(gameId: string): Promise<{ gameId: string }> {
  const token = await ensureSession();
  return invoke("rematch", { gameId }, token);
}

/** Create a room; returns its game id + shareable 4-letter code. */
export async function createOnlineRoom(): Promise<{ gameId: string; roomCode: string }> {
  const token = await ensureSession();
  return invoke("create_room", {}, token);
}

/** Resolve a room code to a game id and join as the second seat. */
export async function joinOnlineRoom(roomCode: string): Promise<{ gameId: string }> {
  const token = await ensureSession();
  return invoke("join_room", { roomCode: roomCode.toUpperCase() }, token);
}

export type { PlayerId };
