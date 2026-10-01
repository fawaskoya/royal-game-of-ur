/**
 * Share-a-game links. A finished Finkel game is fully determined by its dice
 * throws and which piece was moved each turn — the destination follows from
 * the roll and the piece, and forced passes are re-derived by the engine. So a
 * whole game packs into ~100 bytes and travels in a URL, no server involved.
 *
 * Wire format (base64url): [version, rollsHi, rollsLo, ...bitstream]
 *   per roll : 4 bits  — the four die faces
 *   per move : 3 bits  — the piece index (only when a move was possible)
 *
 * Decoding replays the stream through `@ur/engine`, so a tampered or
 * malformed link can never produce an illegal game: it fails to decode.
 */
import {
  applyMove,
  applyRoll,
  createGame,
  exportReplay,
  legalMoves,
  type DieValue,
  type GameState,
  type Replay,
} from "@ur/engine";

const SHARE_VERSION = 1;
const DICE = 4;
const PIECE_BITS = 3;

function isShareable(replay: Replay): boolean {
  const r = replay.ruleset;
  return r.id === "finkel" && r.diceCount === DICE && r.piecesPerPlayer <= 1 << PIECE_BITS;
}

class BitWriter {
  private bytes: number[] = [];
  private cur = 0;
  private n = 0;
  write(value: number, bits: number): void {
    for (let i = bits - 1; i >= 0; i--) {
      this.cur = (this.cur << 1) | ((value >> i) & 1);
      if (++this.n === 8) {
        this.bytes.push(this.cur);
        this.cur = 0;
        this.n = 0;
      }
    }
  }
  finish(): number[] {
    if (this.n > 0) this.bytes.push(this.cur << (8 - this.n));
    return this.bytes;
  }
}

class BitReader {
  private pos = 0;
  constructor(private readonly bytes: Uint8Array) {}
  read(bits: number): number | null {
    if (this.pos + bits > this.bytes.length * 8) return null;
    let v = 0;
    for (let i = 0; i < bits; i++) {
      const byte = this.bytes[this.pos >> 3]!;
      v = (v << 1) | ((byte >> (7 - (this.pos & 7))) & 1);
      this.pos++;
    }
    return v;
  }
}

function toBase64Url(bytes: number[]): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(text: string): Uint8Array | null {
  if (!/^[A-Za-z0-9_-]+$/.test(text)) return null;
  try {
    const bin = atob(text.replace(/-/g, "+").replace(/_/g, "/"));
    return Uint8Array.from(bin, (c) => c.charCodeAt(0));
  } catch {
    return null;
  }
}

/** Pack a replay into a URL-safe code, or null if it isn't a classic game. */
export function encodeShare(replay: Replay): string | null {
  if (!isShareable(replay)) return null;
  const rolls = replay.events.filter((e) => e.type === "roll").length;
  if (rolls === 0 || rolls > 0xffff) return null;
  const w = new BitWriter();
  for (const event of replay.events) {
    if (event.type === "roll") for (const v of event.values) w.write(v, 1);
    else if (event.type === "move") w.write(event.piece, PIECE_BITS);
  }
  return toBase64Url([SHARE_VERSION, rolls >> 8, rolls & 0xff, ...w.finish()]);
}

/** Rebuild a replay from a share code; null for anything malformed or illegal. */
export function decodeShare(code: string): Replay | null {
  const bytes = fromBase64Url(code.trim());
  if (!bytes || bytes.length < 4 || bytes[0] !== SHARE_VERSION) return null;
  const rolls = (bytes[1]! << 8) | bytes[2]!;
  const reader = new BitReader(bytes.subarray(3));
  let state: GameState = createGame();
  try {
    for (let r = 0; r < rolls; r++) {
      if (state.winner !== null) return null; // data after the game ended
      const values: DieValue[] = [];
      for (let d = 0; d < DICE; d++) {
        const bit = reader.read(1);
        if (bit === null) return null;
        values.push(bit as DieValue);
      }
      state = applyRoll(state, { values, total: values.reduce<number>((s, v) => s + v, 0) });
      if (state.dice !== null) {
        const piece = reader.read(PIECE_BITS);
        if (piece === null) return null;
        const move = legalMoves(state).find((m) => m.piece === piece);
        if (!move) return null;
        state = applyMove(state, move);
      }
    }
  } catch {
    return null;
  }
  return exportReplay(state, { shared: true });
}

/** Full URL a player can send; `origin` is injected so this stays testable. */
export function shareUrl(origin: string, replay: Replay): string | null {
  const code = encodeShare(replay);
  return code === null ? null : `${origin}/?g=${code}`;
}
