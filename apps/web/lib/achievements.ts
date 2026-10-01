/**
 * Achievements — derived, never stored. Everything unlocks from data the app
 * already keeps (match results, tutorial progress, daily record), so there is
 * no extra tracking and nothing to drift out of sync. Only the set of
 * already-announced ids is persisted, to know what is *new*.
 */
import { DIFFICULTIES } from "@ur/ai";
import type { MatchResult } from "@/lib/stats/matchResults";
import { summarizeStats } from "@/lib/stats/matchResults";
import { bestDailyStreak, type DailyRecord } from "@/lib/daily";
import type { StorageLike } from "@/lib/persistence/gameStorage";

export interface AchievementContext {
  readonly results: readonly MatchResult[];
  readonly tutorialCompleted: boolean;
  readonly daily: DailyRecord;
  readonly sharedGame: boolean;
}

export interface Achievement {
  readonly id: string;
  readonly title: string;
  readonly blurb: string;
  readonly glyph: string;
}

interface Def extends Achievement {
  readonly test: (ctx: AchievementContext) => boolean;
}

/** Games where the human won against the machine. */
function humanWins(results: readonly MatchResult[]): MatchResult[] {
  return results.filter((r) => r.mode.kind === "ai" && r.winner === r.mode.human);
}

/** Per-game count of the human's rosettes/captures. */
function mine(r: MatchResult, key: "captures" | "rosettes", own: boolean): number {
  if (r.mode.kind !== "ai") return 0;
  const me = r.mode.human;
  return r[key][own ? me : me === 0 ? 1 : 0]!;
}

const TIER_GLYPH = "♜";

const DEFS: Def[] = [
  {
    id: "scholar",
    title: "Scholar of Ur",
    blurb: "Finish the interactive tutorial.",
    glyph: "𒀭",
    test: (c) => c.tutorialCompleted,
  },
  {
    id: "first-victory",
    title: "First Victory",
    blurb: "Beat the machine once.",
    glyph: "♛",
    test: (c) => humanWins(c.results).length >= 1,
  },
  ...DIFFICULTIES.map(
    (d): Def => ({
      id: `beat-${d.id}`,
      title: `Conquer ${d.label}`,
      blurb: `Beat the ${d.label} machine.`,
      glyph: TIER_GLYPH,
      test: (c) => humanWins(c.results).some((r) => r.mode.kind === "ai" && r.mode.difficulty === d.id),
    }),
  ),
  {
    id: "streak-3",
    title: "On a Roll",
    blurb: "Win 3 games in a row.",
    glyph: "✦",
    test: (c) => summarizeStats(c.results).bestStreak >= 3,
  },
  {
    id: "streak-5",
    title: "Unbroken",
    blurb: "Win 5 games in a row.",
    glyph: "✸",
    test: (c) => summarizeStats(c.results).bestStreak >= 5,
  },
  {
    id: "captor",
    title: "Sword of Ur",
    blurb: "Capture 25 pieces in total.",
    glyph: "⚔",
    test: (c) => summarizeStats(c.results).capturesMade >= 25,
  },
  {
    id: "rosette-rider",
    title: "Rosette Rider",
    blurb: "Land on 5 rosettes in a single game.",
    glyph: "✿",
    test: (c) => c.results.some((r) => mine(r, "rosettes", true) >= 5),
  },
  {
    id: "flawless",
    title: "Untouchable",
    blurb: "Win without losing a single piece to a capture.",
    glyph: "◈",
    test: (c) => humanWins(c.results).some((r) => mine(r, "captures", false) === 0),
  },
  {
    id: "swift",
    title: "Swift Victory",
    blurb: "Win a game in 50 rolls or fewer.",
    glyph: "➶",
    test: (c) => humanWins(c.results).some((r) => r.turns <= 50),
  },
  {
    id: "veteran",
    title: "Veteran",
    blurb: "Finish 25 games against the machine.",
    glyph: "☗",
    test: (c) => summarizeStats(c.results).games >= 25,
  },
  {
    id: "online-win",
    title: "Across the Wire",
    blurb: "Win a game online.",
    glyph: "◍",
    test: (c) => c.results.some((r) => r.mode.kind === "online" && r.winner === r.mode.mySeat),
  },
  {
    id: "daily-first",
    title: "Puzzle Solver",
    blurb: "Answer your first daily challenge.",
    glyph: "◇",
    test: (c) => Object.keys(c.daily).length >= 1,
  },
  {
    id: "daily-perfect",
    title: "Oracle",
    blurb: "Find the best move in a daily challenge.",
    glyph: "★",
    test: (c) => Object.values(c.daily).some((d) => d.rank === 1),
  },
  {
    id: "daily-streak-7",
    title: "Daily Devotion",
    blurb: "Play the daily challenge 7 days in a row.",
    glyph: "☀",
    test: (c) => bestDailyStreak(c.daily) >= 7,
  },
  {
    id: "storyteller",
    title: "Storyteller",
    blurb: "Share a game with a friend.",
    glyph: "✉",
    test: (c) => c.sharedGame,
  },
];

export const ACHIEVEMENTS: readonly Achievement[] = DEFS.map(({ id, title, blurb, glyph }) => ({
  id,
  title,
  blurb,
  glyph,
}));

/** Ids unlocked by the given context. */
export function unlockedIds(ctx: AchievementContext): string[] {
  return DEFS.filter((d) => d.test(ctx)).map((d) => d.id);
}

/* ───────────── persisted: announced ids + "has shared" flag ───────────── */

const SEEN_KEY = "ur:achievements";
const SEEN_VERSION = 1;

function defaultStorage(): StorageLike | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

interface Persisted {
  readonly seen: readonly string[];
  readonly shared: boolean;
}

export function loadAchievementState(storage: StorageLike | null = defaultStorage()): Persisted {
  const empty: Persisted = { seen: [], shared: false };
  if (!storage) return empty;
  try {
    const raw = storage.getItem(SEEN_KEY);
    if (raw === null) return empty;
    const p = JSON.parse(raw) as { version?: unknown; seen?: unknown; shared?: unknown };
    if (p.version !== SEEN_VERSION || !Array.isArray(p.seen)) return empty;
    return { seen: p.seen.filter((x): x is string => typeof x === "string"), shared: p.shared === true };
  } catch {
    return empty;
  }
}

function save(state: Persisted, storage: StorageLike | null): void {
  try {
    storage?.setItem(SEEN_KEY, JSON.stringify({ version: SEEN_VERSION, ...state }));
  } catch {
    /* best effort */
  }
}

export function markShared(storage: StorageLike | null = defaultStorage()): void {
  const cur = loadAchievementState(storage);
  if (!cur.shared) save({ ...cur, shared: true }, storage);
}

/** Ids unlocked but not yet announced. */
export function newlyUnlocked(ctx: AchievementContext, storage: StorageLike | null = defaultStorage()): string[] {
  const seen = new Set(loadAchievementState(storage).seen);
  return unlockedIds(ctx).filter((id) => !seen.has(id));
}

/** Record ids as announced so they aren't toasted twice. */
export function markSeen(ids: readonly string[], storage: StorageLike | null = defaultStorage()): void {
  if (ids.length === 0) return;
  const cur = loadAchievementState(storage);
  save({ ...cur, seen: [...new Set([...cur.seen, ...ids])] }, storage);
}
