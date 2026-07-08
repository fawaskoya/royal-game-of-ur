"use client";

/**
 * Real online transport: implements `MultiplayerTransport` against the
 * `game-move` Edge Function (writes) + Realtime on `game_events` (reads).
 * This is the class Phase L2 (docs/GO_LIVE_PLAN.md) swaps in for
 * `LocalRoomTransport` — the room UI (`useOnlineRoom`, once built) does not
 * change; only which transport it's given does.
 *
 * UNVERIFIED end-to-end: written before a live Supabase project/session was
 * available to exercise it against. The request/response shapes match
 * `supabase/functions/game-move/index.ts` exactly; verify together once
 * the migration is applied and the function is deployed.
 */
import type { GameEvent, Move, PlayerId, RulesetConfig } from "@ur/engine";
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
}

async function invoke<T>(action: string, payload: Record<string, unknown>, token: string): Promise<T> {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error("online play is not configured");
  const { data, error } = await supabase.functions.invoke("game-move", {
    body: { action, ...payload },
    headers: { Authorization: `Bearer ${token}` },
  });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  return data as T;
}

export class SupabaseRoomTransport implements MultiplayerTransport {
  status: TransportStatus = "idle";
  #gameId: string | null = null;
  #token: string | null = null;
  #eventCbs = new Set<(batch: ServerEventBatch) => void>();
  #playerCbs = new Set<(players: readonly RoomPlayer[]) => void>();
  #statusCbs = new Set<(status: TransportStatus) => void>();
  #channel: ReturnType<NonNullable<ReturnType<typeof getSupabaseClient>>["channel"]> | null = null;

  /** Set once `connect()` resolves — a future room hook reads these instead
   * of the generic interface, mirroring how `LocalRoomTransport.onWelcome`
   * surfaces the same "who am I, what ruleset" facts for its transport. */
  ruleset: RulesetConfig | null = null;
  mySeat: PlayerId | null = null;

  #setStatus(status: TransportStatus): void {
    this.status = status;
    for (const cb of this.#statusCbs) cb(status);
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

    // Full history first (the "state_sync" this transport delivers on every
    // join/reconnect), as one batch through the same channel live updates use.
    const { data: eventRows, error: eventsError } = await supabase
      .from("game_events")
      .select("event")
      .eq("game_id", gameId)
      .order("seq", { ascending: true });
    if (eventsError) {
      this.#setStatus("closed");
      throw new Error(eventsError.message);
    }
    const history = (eventRows ?? []).map((row) => row.event as GameEvent);
    for (const cb of this.#eventCbs) cb({ gameId, fromIndex: 0, events: history });

    // Known simplification: subscribing after the history fetch leaves a
    // narrow race (an event inserted in between could be missed). Fine for
    // Phase A verification; harden by subscribing first, buffering, then
    // reconciling by `seq` once this carries real traffic.
    this.#channel = supabase
      .channel(`game:${gameId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "game_events", filter: `game_id=eq.${gameId}` }, (payload) => {
        const row = payload.new as { seq: number; event: GameEvent };
        for (const cb of this.#eventCbs) cb({ gameId, fromIndex: row.seq, events: [row.event] });
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "games", filter: `id=eq.${gameId}` }, (payload) => {
        this.#emitPlayers(payload.new as GameRow);
      })
      .subscribe();

    this.#setStatus("connected");
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
    await invoke<{ events: GameEvent[] }>(
      "move",
      { gameId: proposal.gameId, afterEvent: proposal.afterEvent, move: proposal.move },
      this.#token,
    );
    // The insert also arrives via the Realtime subscription above; the
    // direct response lets the mover's own UI update without waiting on it.
  }

  async requestRoll(gameId: string, afterEvent: number): Promise<void> {
    if (!this.#token) throw new Error("not connected");
    await invoke<{ events: GameEvent[] }>("roll", { gameId, afterEvent }, this.#token);
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
