/**
 * Multiplayer transport interfaces — TYPES ONLY, deliberately unused by the
 * game today. They define the seam a future online mode plugs into without
 * touching game code. See docs/MULTIPLAYER_ARCHITECTURE.md for the plan and
 * the trust model (server-authoritative; the client is presentation only).
 */
import type { GameEvent, Move, PlayerId } from "@ur/engine";

/** Wire-format move: what a client is allowed to *propose*. */
export interface ProposedMove {
  readonly roomId: string;
  readonly gameId: string;
  /** Index into the server's event log this proposal builds on (staleness check). */
  readonly afterEvent: number;
  readonly move: Move;
}

/**
 * Events are the unit of sync: the server owns dice and validation and
 * broadcasts the authoritative event log (clients rebuild state via
 * buildStateFromEvents — the same anti-cheat replay used offline).
 */
export interface ServerEventBatch {
  readonly gameId: string;
  readonly fromIndex: number;
  readonly events: readonly GameEvent[];
}

export interface RoomPlayer {
  readonly id: string;
  readonly name: string;
  readonly seat: PlayerId | null; // null = spectator
  readonly connected: boolean;
}

export type TransportStatus = "idle" | "connecting" | "connected" | "reconnecting" | "closed";

export interface MultiplayerTransport {
  readonly status: TransportStatus;
  connect(roomId: string, token: string): Promise<void>;
  disconnect(): void;
  /** Propose a move; resolution arrives as server events (never applied locally first). */
  sendMove(proposal: ProposedMove): Promise<void>;
  /** Request a roll; the server generates dice (commit–reveal per ONLINE_ARCHITECTURE). */
  requestRoll(gameId: string, afterEvent: number): Promise<void>;
  onEvents(callback: (batch: ServerEventBatch) => void): () => void;
  onPlayersChanged(callback: (players: readonly RoomPlayer[]) => void): () => void;
  onStatusChanged(callback: (status: TransportStatus) => void): () => void;
}
