/**
 * Local match results + aggregate statistics. Results are computed from the
 * engine event log at game end (never invented), stored under a versioned
 * key, and summarized on read — raw results are the source of truth, derived
 * numbers are never persisted. Same safety rules as the game save: corrupt
 * data fails closed, storage errors degrade silently.
 */
import type { GameState, PlayerId } from "@ur/engine";
import type { GameMode } from "@/lib/useGame";
import type { StorageLike } from "@/lib/persistence/gameStorage";

export const RESULTS_VERSION = 1;
const RESULTS_KEY = "ur:results";
/** Keep the store bounded; oldest results fall off. */
const MAX_RESULTS = 200;

export interface MatchResult {
  readonly gameId: string;
  readonly completedAt: string; // ISO
  readonly mode: GameMode;
  readonly winner: PlayerId;
  readonly turns: number;
  readonly durationMs: number;
  readonly captures: readonly [number, number];
  readonly rosettes: readonly [number, number];
}

/** Build a result from a finished game's event log. Returns null unless decided. */
export function resultFromGame(
  state: GameState,
  mode: GameMode,
  gameId: string,
  startedAt: string,
): MatchResult | null {
  if (state.winner === null) return null;
  const count = (player: PlayerId, flag: "capture" | "extraTurn") =>
    state.history.filter((e) => e.type === "move" && e.player === player && e[flag]).length;
  const started = new Date(startedAt).getTime();
  return {
    gameId,
    completedAt: new Date().toISOString(),
    mode,
    winner: state.winner,
    turns: state.rollCount,
    durationMs: Number.isFinite(started) ? Math.max(0, Date.now() - started) : 0,
    captures: [count(0, "capture"), count(1, "capture")],
    rosettes: [count(0, "extraTurn"), count(1, "extraTurn")],
  };
}

function defaultStorage(): StorageLike | null {
  try {
    if (typeof window === "undefined") return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

export function loadResults(storage: StorageLike | null = defaultStorage()): MatchResult[] {
  if (!storage) return [];
  try {
    const raw = storage.getItem(RESULTS_KEY);
    if (raw === null) return [];
    const parsed = JSON.parse(raw) as { version?: unknown; results?: unknown };
    if (parsed.version !== RESULTS_VERSION || !Array.isArray(parsed.results)) return [];
    return parsed.results.filter(
      (r: Partial<MatchResult>) =>
        (r.winner === 0 || r.winner === 1) &&
        typeof r.turns === "number" &&
        typeof r.completedAt === "string" &&
        typeof r.mode === "object" &&
        Array.isArray(r.captures) &&
        Array.isArray(r.rosettes),
    ) as MatchResult[];
  } catch {
    return [];
  }
}

export function recordResult(result: MatchResult, storage: StorageLike | null = defaultStorage()): boolean {
  if (!storage) return false;
  try {
    const results = [...loadResults(storage), result].slice(-MAX_RESULTS);
    storage.setItem(RESULTS_KEY, JSON.stringify({ version: RESULTS_VERSION, results }));
    return true;
  } catch {
    return false;
  }
}

export function clearResults(storage: StorageLike | null = defaultStorage()): void {
  try {
    storage?.removeItem(RESULTS_KEY);
  } catch {
    /* ignore */
  }
}

export interface StatsSummary {
  games: number;
  wins: number;
  losses: number;
  winRate: number;
  currentStreak: number;
  bestStreak: number;
  averageTurns: number;
  capturesMade: number;
  capturesSuffered: number;
  rosettesLanded: number;
  fastestWinMs: number | null;
  fewestTurnsWin: number | null;
  /** wins/games per difficulty id, vs-AI games only. */
  byDifficulty: Record<string, { games: number; wins: number }>;
}

/**
 * Aggregate from the human's perspective. Only `ai`-mode games count — pvp
 * and watch games have no single "you". Chronological input order assumed
 * (as stored).
 */
export function summarizeStats(results: readonly MatchResult[]): StatsSummary {
  const mine = results.filter((r) => r.mode.kind === "ai");
  const summary: StatsSummary = {
    games: mine.length,
    wins: 0,
    losses: 0,
    winRate: 0,
    currentStreak: 0,
    bestStreak: 0,
    averageTurns: 0,
    capturesMade: 0,
    capturesSuffered: 0,
    rosettesLanded: 0,
    fastestWinMs: null,
    fewestTurnsWin: null,
    byDifficulty: {},
  };
  let streak = 0;
  let turnsTotal = 0;
  for (const result of mine) {
    if (result.mode.kind !== "ai") continue;
    const me = result.mode.human;
    const won = result.winner === me;
    const difficulty = result.mode.difficulty;
    const bucket = (summary.byDifficulty[difficulty] ??= { games: 0, wins: 0 });
    bucket.games++;
    turnsTotal += result.turns;
    summary.capturesMade += result.captures[me]!;
    summary.capturesSuffered += result.captures[me === 0 ? 1 : 0]!;
    summary.rosettesLanded += result.rosettes[me]!;
    if (won) {
      summary.wins++;
      bucket.wins++;
      streak = streak >= 0 ? streak + 1 : 1;
      summary.bestStreak = Math.max(summary.bestStreak, streak);
      if (summary.fastestWinMs === null || result.durationMs < summary.fastestWinMs) {
        summary.fastestWinMs = result.durationMs;
      }
      if (summary.fewestTurnsWin === null || result.turns < summary.fewestTurnsWin) {
        summary.fewestTurnsWin = result.turns;
      }
    } else {
      summary.losses++;
      streak = streak <= 0 ? streak - 1 : -1;
    }
  }
  summary.currentStreak = streak;
  summary.winRate = summary.games > 0 ? summary.wins / summary.games : 0;
  summary.averageTurns = summary.games > 0 ? turnsTotal / summary.games : 0;
  return summary;
}
