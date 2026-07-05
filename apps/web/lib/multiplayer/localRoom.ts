"use client";

/**
 * Local room multiplayer — the full online topology with the network swapped
 * for a BroadcastChannel, so it works between two windows/tabs of the same
 * browser today and becomes internet play by replacing the wire, not the UI.
 *
 * Topology (identical to docs/MULTIPLAYER_ARCHITECTURE.md):
 *   - `LocalRoomHost` is the stand-in SERVER: it owns the authoritative
 *     GameSession, rolls all dice, validates every proposal through the
 *     engine, and broadcasts append-only event batches.
 *   - `LocalRoomTransport` is the CLIENT (implements `MultiplayerTransport`
 *     from lib/network/types). Both players use it — the host's own UI talks
 *     to its embedded server through the same interface via a loopback,
 *     because BroadcastChannel doesn't deliver to the posting context.
 *   - Clients rebuild state with `buildStateFromEvents`, re-verifying every
 *     event — the same anti-cheat replay a real server deployment uses.
 */
import {
  FINKEL_RULESET,
  GameSession,
  type GameEvent,
  type Move,
  type PlayerId,
  type RulesetConfig,
} from "@ur/engine";
import type {
  MultiplayerTransport,
  ProposedMove,
  RoomPlayer,
  ServerEventBatch,
  TransportStatus,
} from "@/lib/network/types";

export function makeRoomCode(): string {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no 0/O/1/I/L
  let code = "";
  for (let i = 0; i < 4; i++) code += alphabet[Math.floor(Math.random() * alphabet.length)];
  return code;
}

function channelName(code: string): string {
  return `ur-room-${code.toUpperCase()}`;
}

type WireMessage =
  | { t: "hello"; from: string; name: string }
  | { t: "welcome"; to: string; seat: PlayerId; ruleset: RulesetConfig; events: GameEvent[]; players: RoomPlayer[] }
  | { t: "full"; to: string }
  | { t: "players"; players: RoomPlayer[] }
  | { t: "events"; fromIndex: number; events: GameEvent[] }
  | { t: "roll-request"; from: string; afterEvent: number }
  | { t: "propose"; from: string; afterEvent: number; move: Move }
  | { t: "bye"; from: string };

/** The embedded "server". Runs only in the hosting tab. */
export class LocalRoomHost {
  readonly code: string;
  readonly session: GameSession;
  #channel: BroadcastChannel;
  #players: RoomPlayer[];
  #localDeliver: ((msg: WireMessage) => void) | null = null;
  #guestId: string | null = null;

  constructor(code: string, hostName: string) {
    this.code = code;
    this.session = new GameSession({});
    this.#players = [{ id: "host", name: hostName, seat: 0, connected: true }];
    this.#channel = new BroadcastChannel(channelName(code));
    this.#channel.onmessage = (e: MessageEvent<WireMessage>) => this.#onMessage(e.data);
  }

  /** The host tab's own client receives server messages through this loopback. */
  attachLocalClient(deliver: (msg: WireMessage) => void): void {
    this.#localDeliver = deliver;
    deliver({
      t: "welcome",
      to: "host",
      seat: 0,
      ruleset: this.session.state.ruleset,
      events: [...this.session.state.history],
      players: this.#players,
    });
  }

  #broadcast(msg: WireMessage): void {
    this.#channel.postMessage(msg);
    this.#localDeliver?.(msg);
  }

  #seatOf(senderId: string): PlayerId | null {
    const player = this.#players.find((p) => p.id === senderId);
    return player ? player.seat : null;
  }

  #applyAndBroadcast(action: () => void): void {
    const before = this.session.state.history.length;
    try {
      action();
    } catch {
      return; // engine rejected — ignore the invalid proposal
    }
    const events = this.session.state.history.slice(before);
    if (events.length > 0) this.#broadcast({ t: "events", fromIndex: before, events: [...events] });
  }

  #onMessage(msg: WireMessage): void {
    switch (msg.t) {
      case "hello": {
        if (this.#guestId !== null && this.#guestId !== msg.from) {
          this.#broadcast({ t: "full", to: msg.from });
          return;
        }
        this.#guestId = msg.from;
        this.#players = [
          this.#players[0]!,
          { id: msg.from, name: msg.name || "Guest", seat: 1, connected: true },
        ];
        // Direct the full sync at the new guest; everyone gets the roster.
        this.#broadcast({
          t: "welcome",
          to: msg.from,
          seat: 1,
          ruleset: this.session.state.ruleset,
          events: [...this.session.state.history],
          players: this.#players,
        });
        this.#broadcast({ t: "players", players: this.#players });
        return;
      }
      case "roll-request": {
        const seat = this.#seatOf(msg.from);
        if (seat === null || this.session.state.winner !== null) return;
        if (this.session.state.current !== seat) return;
        if (msg.afterEvent !== this.session.state.history.length) return; // stale
        if (this.session.phase !== "awaiting-roll") return;
        this.#applyAndBroadcast(() => this.session.roll());
        return;
      }
      case "propose": {
        const seat = this.#seatOf(msg.from);
        if (seat === null || this.session.state.winner !== null) return;
        if (this.session.state.current !== seat || msg.move.player !== seat) return;
        if (msg.afterEvent !== this.session.state.history.length) return; // stale
        this.#applyAndBroadcast(() => this.session.move(msg.move));
        return;
      }
      case "bye": {
        if (msg.from === this.#guestId) {
          this.#guestId = null;
          this.#players = [this.#players[0]!];
          this.#broadcast({ t: "players", players: this.#players });
        }
        return;
      }
      default:
        return; // host ignores server-originated message types
    }
  }

  /** Host-side actions go through the same validation path as guest proposals. */
  handleLocal(msg: WireMessage): void {
    this.#onMessage(msg);
  }

  close(): void {
    this.#broadcast({ t: "players", players: [] });
    this.#channel.close();
  }
}

/** Client transport — the `MultiplayerTransport` seam over the local wire. */
export class LocalRoomTransport implements MultiplayerTransport {
  status: TransportStatus = "idle";
  readonly clientId: string;
  #channel: BroadcastChannel | null = null;
  #host: LocalRoomHost | null;
  #eventCbs = new Set<(batch: ServerEventBatch) => void>();
  #playerCbs = new Set<(players: readonly RoomPlayer[]) => void>();
  #statusCbs = new Set<(status: TransportStatus) => void>();
  #welcomeCb: ((seat: PlayerId, ruleset: RulesetConfig, events: GameEvent[], players: RoomPlayer[]) => void) | null =
    null;
  #roomId = "";

  /** Pass the embedded host to run as the hosting player (loopback wire). */
  constructor(host: LocalRoomHost | null = null) {
    this.#host = host;
    this.clientId = host ? "host" : `c-${Math.random().toString(36).slice(2, 10)}`;
  }

  /** Local extra: the initial full-sync payload (server "state_sync"). */
  onWelcome(
    cb: (seat: PlayerId, ruleset: RulesetConfig, events: GameEvent[], players: RoomPlayer[]) => void,
  ): void {
    this.#welcomeCb = cb;
  }

  #setStatus(status: TransportStatus): void {
    this.status = status;
    for (const cb of this.#statusCbs) cb(status);
  }

  #deliver = (msg: WireMessage): void => {
    switch (msg.t) {
      case "welcome":
        if (msg.to === this.clientId) {
          this.#setStatus("connected");
          this.#welcomeCb?.(msg.seat, msg.ruleset, msg.events, msg.players);
        }
        return;
      case "full":
        if (msg.to === this.clientId) this.#setStatus("closed");
        return;
      case "events":
        for (const cb of this.#eventCbs) cb({ gameId: this.#roomId, fromIndex: msg.fromIndex, events: msg.events });
        return;
      case "players":
        for (const cb of this.#playerCbs) cb(msg.players);
        return;
      default:
        return; // clients ignore client-originated message types
    }
  };

  async connect(roomId: string, token: string): Promise<void> {
    this.#roomId = roomId.toUpperCase();
    this.#setStatus("connecting");
    if (this.#host) {
      this.#host.attachLocalClient(this.#deliver);
      return;
    }
    this.#channel = new BroadcastChannel(channelName(this.#roomId));
    this.#channel.onmessage = (e: MessageEvent<WireMessage>) => this.#deliver(e.data);
    this.#send({ t: "hello", from: this.clientId, name: token || "Guest" });
  }

  #send(msg: WireMessage): void {
    if (this.#host) this.#host.handleLocal(msg);
    else this.#channel?.postMessage(msg);
  }

  disconnect(): void {
    this.#send({ t: "bye", from: this.clientId });
    this.#channel?.close();
    this.#channel = null;
    this.#setStatus("closed");
  }

  async sendMove(proposal: ProposedMove): Promise<void> {
    this.#send({ t: "propose", from: this.clientId, afterEvent: proposal.afterEvent, move: proposal.move });
  }

  async requestRoll(_gameId: string, afterEvent: number): Promise<void> {
    this.#send({ t: "roll-request", from: this.clientId, afterEvent });
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

export { FINKEL_RULESET };
