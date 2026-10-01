/**
 * Daily challenge: one position per UTC day, the same for everyone. The
 * position comes from a date-seeded random opening plus the first roll that
 * leaves a genuine decision (3+ legal moves with a clear best one). The
 * "answer" is the hint engine's ranking — the same scoring the AI uses.
 *
 * Nothing is stored server-side: the date is the seed, so every device
 * regenerates the identical puzzle.
 */
import {
  applyMove,
  applyRoll,
  createGame,
  createRng,
  legalMoves,
  rollDice,
  type GameState,
  type Move,
} from "@ur/engine";
import { analyzeMoves, type MoveAnalysis } from "@ur/ai";
import type { StorageLike } from "@/lib/persistence/gameStorage";

export interface DailyPuzzle {
  readonly dateKey: string;
  /** A position with a pending roll — the player to move chooses. */
  readonly state: GameState;
  /** Every legal move, best first. */
  readonly ranking: readonly MoveAnalysis[];
}

export function dateKeyUTC(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

/** FNV-1a — stable across platforms, which `Math.random`/`Date` seeds are not. */
function seedFromKey(key: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

const MIN_GAP = 12; // best must beat the runner-up by a clear margin
const MAX_ATTEMPTS = 80;

export function buildDailyPuzzle(dateKey: string): DailyPuzzle {
  const rng = createRng(seedFromKey(`ur-daily:${dateKey}`));
  let fallback: DailyPuzzle | null = null;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    let state = createGame();
    const plies = 6 + Math.floor(rng.next() * 18);
    for (let i = 0; i < plies && state.winner === null; i++) {
      state = applyRoll(state, rollDice(rng));
      if (state.dice === null) continue; // forced pass
      const moves = legalMoves(state);
      state = applyMove(state, moves[Math.floor(rng.next() * moves.length)]!);
    }
    if (state.winner !== null) continue;

    for (let tries = 0; tries < 10; tries++) {
      const candidate = applyRoll(state, rollDice(rng));
      if (candidate.dice === null) continue;
      const moves = legalMoves(candidate);
      if (moves.length < 2) continue;
      const ranking = analyzeMoves(candidate, { depth: 2 });
      const puzzle: DailyPuzzle = { dateKey, state: candidate, ranking };
      fallback ??= puzzle;
      if (moves.length >= 3 && ranking[0]!.value - ranking[1]!.value >= MIN_GAP) return puzzle;
    }
  }
  if (fallback) return fallback;
  // Practically unreachable; keeps the function total.
  const state = applyRoll(createGame(), { values: [1, 1, 0, 0], total: 2 });
  return { dateKey, state, ranking: analyzeMoves(state, { depth: 2 }) };
}

/** 1-based rank of the chosen move (equal-destination moves are the same move). */
export function rankOf(puzzle: DailyPuzzle, move: Move): number {
  const i = puzzle.ranking.findIndex((a) => a.move.from === move.from && a.move.to === move.to);
  return i < 0 ? puzzle.ranking.length : i + 1;
}

/* ───────────────────────── persistence ───────────────────────── */

const DAILY_KEY = "ur:daily";
const DAILY_VERSION = 1;
const MAX_DAYS = 400;

export interface DailyEntry {
  readonly rank: number;
  readonly of: number;
}
export type DailyRecord = Readonly<Record<string, DailyEntry>>;

function defaultStorage(): StorageLike | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

export function loadDaily(storage: StorageLike | null = defaultStorage()): DailyRecord {
  if (!storage) return {};
  try {
    const raw = storage.getItem(DAILY_KEY);
    if (raw === null) return {};
    const parsed = JSON.parse(raw) as { version?: unknown; days?: unknown };
    if (parsed.version !== DAILY_VERSION || typeof parsed.days !== "object" || parsed.days === null) return {};
    const out: Record<string, DailyEntry> = {};
    for (const [k, v] of Object.entries(parsed.days as Record<string, Partial<DailyEntry>>)) {
      if (/^\d{4}-\d{2}-\d{2}$/.test(k) && Number.isInteger(v?.rank) && Number.isInteger(v?.of)) {
        out[k] = { rank: v.rank!, of: v.of! };
      }
    }
    return out;
  } catch {
    return {};
  }
}

export function recordDaily(
  dateKey: string,
  entry: DailyEntry,
  storage: StorageLike | null = defaultStorage(),
): boolean {
  if (!storage) return false;
  try {
    const days = { ...loadDaily(storage) };
    if (days[dateKey]) return false; // one attempt per day — the first answer stands
    days[dateKey] = entry;
    const keep = Object.keys(days).sort().slice(-MAX_DAYS);
    const pruned = Object.fromEntries(keep.map((k) => [k, days[k]!]));
    storage.setItem(DAILY_KEY, JSON.stringify({ version: DAILY_VERSION, days: pruned }));
    return true;
  } catch {
    return false;
  }
}

function shiftDay(dateKey: string, delta: number): string {
  const d = new Date(`${dateKey}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return dateKey.length === 10 ? d.toISOString().slice(0, 10) : dateKey;
}

/** Consecutive days played, counting back from today (or yesterday if today is still open). */
export function dailyStreak(record: DailyRecord, todayKey: string): number {
  let day = record[todayKey] ? todayKey : shiftDay(todayKey, -1);
  let streak = 0;
  while (record[day]) {
    streak++;
    day = shiftDay(day, -1);
  }
  return streak;
}

/** Longest run of consecutive days ever played. */
export function bestDailyStreak(record: DailyRecord): number {
  const days = Object.keys(record).sort();
  let best = 0;
  let run = 0;
  let prev: string | null = null;
  for (const day of days) {
    run = prev !== null && shiftDay(prev, 1) === day ? run + 1 : 1;
    best = Math.max(best, run);
    prev = day;
  }
  return best;
}
