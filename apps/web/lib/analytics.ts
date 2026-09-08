/**
 * Product analytics — the single place custom events are defined and sent.
 *
 * Every event in the taxonomy gets one exported, typed function here, and
 * every one of them funnels through `emit()`. Components never call
 * `track()` directly: a typo'd event name or a stray property shape should
 * be a type error at build time, not a mystery gap in the dashboard.
 *
 * Three rules this module enforces so call sites don't have to:
 *
 * 1. **Never throws.** Analytics is not load-bearing. `track()` actually
 *    *throws* outside the browser when NODE_ENV isn't production (see the
 *    upstream guard in @vercel/analytics), so the window check below is
 *    required, not merely defensive — and the try/catch backstops it.
 * 2. **Never runs on the server.** Importing this module from a server
 *    component is safe; calling into it there is a no-op.
 * 3. **Never sends raw durations.** Callers hand over milliseconds and get
 *    a bucket — see `durationBucket`. Keeps the shape stable and the
 *    property cardinality low.
 *
 * Property values may only be string | number | boolean | null (Vercel's
 * constraint — no nested objects, no arrays). The union types below are the
 * enforcement.
 *
 * Adding an event: extend `AnalyticsEvent`, export a `trackX` wrapper, and
 * document it in /ANALYTICS.md. See that file for the full table.
 */
import { track } from "@vercel/analytics";
import type { GameMode } from "@/lib/useGame";

/** Play surfaces, as the funnel thinks of them (not the engine's internal names). */
export type AnalyticsMode = "tutorial" | "ai" | "pass_and_play" | "online" | "private" | "spectate";

/**
 * How a game ended, from the local human's point of view.
 *
 * `finished` covers the modes with no single "you" — pass-and-play (two
 * humans) and spectate (none). `draw` is unreachable in Ur (a game always
 * resolves to a winner); it stays in the type as a guard for future rule
 * variants rather than as something to expect in the data.
 */
export type GameResult = "win" | "loss" | "draw" | "finished" | "abandoned";

export type DurationBucket = "under_1m" | "1_3m" | "3_10m" | "over_10m";

export type PlayerSide = "light" | "dark";

/**
 * Where a Store or Donate surface was opened from. Only `menu` exists today
 * — both live in the main menu footer and nowhere else. The property is
 * here so new entry points (a post-game link, say) are one value away from
 * being measurable.
 */
export type StoreSource = "menu";
export type DonateSource = "menu";

export interface GameStartProps {
  mode: AnalyticsMode;
  difficulty: string | null;
  side: PlayerSide | null;
}

export interface GameCompleteProps {
  mode: AnalyticsMode;
  result: GameResult;
  difficulty: string | null;
  turns: number;
  duration_bucket: DurationBucket;
}

/** The closed set of events. Anything not in here cannot be sent. */
export type AnalyticsEvent =
  | { name: "game_start"; props: GameStartProps }
  | { name: "first_roll"; props: { mode: AnalyticsMode } }
  | { name: "game_complete"; props: GameCompleteProps }
  | { name: "store_open"; props: { source: StoreSource } }
  | { name: "skin_click"; props: { skin_id: string; price: number } }
  | { name: "donate_click"; props: { source: DonateSource } }
  | { name: "room_created"; props?: undefined }
  | { name: "room_joined"; props?: undefined }
  | { name: "tutorial_complete"; props?: undefined };

/**
 * Log every event to the console instead of guessing whether wiring works.
 * On outside production by default; `NEXT_PUBLIC_DEBUG_ANALYTICS=1` forces
 * it on anywhere (useful against a preview deploy).
 */
export const DEBUG_ANALYTICS =
  process.env.NEXT_PUBLIC_DEBUG_ANALYTICS === "1" || process.env.NODE_ENV !== "production";

/**
 * The one chokepoint. Every event passes through here, which is also what
 * makes adding a second sink later (PostHog for funnels/cohorts) a change
 * to this function rather than a re-wiring of the whole app.
 */
function emit(event: AnalyticsEvent): void {
  try {
    if (typeof window === "undefined") return; // server render — track() would throw
    if (DEBUG_ANALYTICS) {
      // eslint-disable-next-line no-console
      console.debug("[analytics]", event.name, event.props ?? {});
    }
    if (event.props) track(event.name, { ...event.props });
    else track(event.name);
  } catch {
    // An analytics failure must never interrupt a game in progress.
  }
}

/** Bucket a duration in ms. Raw seconds are deliberately never sent. */
export function durationBucket(ms: number): DurationBucket {
  if (!Number.isFinite(ms) || ms < 60_000) return "under_1m";
  if (ms < 180_000) return "1_3m";
  if (ms < 600_000) return "3_10m";
  return "over_10m";
}

/** Map an engine `GameMode` onto the funnel's vocabulary. */
export function analyticsMode(mode: GameMode): AnalyticsMode {
  switch (mode.kind) {
    case "ai":
      return "ai";
    case "pvp":
      return "pass_and_play";
    case "watch":
      return "spectate";
    case "online":
      return "online";
  }
}

export function sideOf(player: 0 | 1): PlayerSide {
  return player === 0 ? "light" : "dark";
}

/* ── Session guard ─────────────────────────────────────────────────────
 * `first_roll` answers "did this visitor actually engage", so it must fire
 * at most once per session. sessionStorage (not localStorage) scopes it to
 * the tab session, which is the unit we want. When storage is unavailable
 * — private mode, blocked cookies — we fall back to a module-level flag:
 * still at most once per page load, which is the safe direction to fail.
 */
const FIRST_ROLL_KEY = "ur:analytics:first-roll";
let firstRollFiredThisLoad = false;

function sessionStore(): Storage | null {
  try {
    if (typeof window === "undefined") return null;
    return window.sessionStorage;
  } catch {
    return null;
  }
}

/** True exactly once per session (or once per page load without storage). */
function claimFirstRoll(): boolean {
  if (firstRollFiredThisLoad) return false;
  firstRollFiredThisLoad = true;
  const store = sessionStore();
  if (!store) return true;
  try {
    if (store.getItem(FIRST_ROLL_KEY) === "1") return false;
    store.setItem(FIRST_ROLL_KEY, "1");
    return true;
  } catch {
    return true;
  }
}

/** Test-only: forget that the session already rolled. */
export function resetFirstRollGuardForTests(): void {
  firstRollFiredThisLoad = false;
  try {
    sessionStore()?.removeItem(FIRST_ROLL_KEY);
  } catch {
    // ignore
  }
}

/* ── Events ───────────────────────────────────────────────────────────── */

/** A game is live and the first turn is available (not merely mode-selected). */
export function trackGameStart(props: GameStartProps): void {
  emit({ name: "game_start", props });
}

/** The human's first roll of the session. Self-guarding — safe to call on every roll. */
export function trackFirstRoll(mode: AnalyticsMode): void {
  if (!claimFirstRoll()) return;
  emit({ name: "first_roll", props: { mode } });
}

/** A game reached a terminal state (including being abandoned). */
export function trackGameComplete(props: {
  mode: AnalyticsMode;
  result: GameResult;
  difficulty: string | null;
  turns: number;
  durationMs: number;
}): void {
  emit({
    name: "game_complete",
    props: {
      mode: props.mode,
      result: props.result,
      difficulty: props.difficulty,
      turns: props.turns,
      duration_bucket: durationBucket(props.durationMs),
    },
  });
}

export function trackStoreOpen(source: StoreSource): void {
  emit({ name: "store_open", props: { source } });
}

/**
 * A locked skin's buy action was triggered. Note this is purchase *intent*:
 * every paid SKU shares one unlock-everything checkout, and guests hit an
 * account step before payment. `skin_id` is the catalog id of the card the
 * player clicked from — which skin motivated the attempt.
 *
 * @param price Whole USD units (e.g. 1.99), not minor units.
 */
export function trackSkinClick(skinId: string, price: number): void {
  emit({ name: "skin_click", props: { skin_id: skinId, price } });
}

/** The outbound donate action — the real click, not opening the panel. */
export function trackDonateClick(source: DonateSource): void {
  emit({ name: "donate_click", props: { source } });
}

export function trackRoomCreated(): void {
  emit({ name: "room_created" });
}

export function trackRoomJoined(): void {
  emit({ name: "room_joined" });
}

/** The scripted first game was played to the end (not exited or skipped). */
export function trackTutorialComplete(): void {
  emit({ name: "tutorial_complete" });
}
