# Analytics

Custom event tracking for royalgameofur.app, on Vercel Web Analytics.

The whole point of this instrumentation is one question: **do people who land
on the site actually play, and how far do they get?** Page views alone can't
answer it — the entire game runs on `/`, so a visitor can land, play a full
match and leave while counting as a single-page-view bounce. That is why the
reported ~87% bounce rate says nothing about engagement.

Everything lives in [`apps/web/lib/analytics.ts`](apps/web/lib/analytics.ts).
Components never call `track()` directly.

## The funnel

```
page view  →  game_start  →  first_roll  →  game_complete
                                  ↑
                     the "did they actually engage" signal
```

`first_roll` is the important one. It fires at most once per session, so
`first_roll ÷ visitors` is the real engagement rate — the number the bounce
rate was never able to give.

## Events

| Event | Fires when | Properties | What it answers |
|---|---|---|---|
| `game_start` | A board is live and the first turn is available — not when a mode is picked | `mode`, `difficulty`, `side` | How many landings become games, and which modes people choose |
| `first_roll` | The human's first roll of the session (once per session) | `mode` | **Did they actually engage?** |
| `game_complete` | A game reaches a terminal state, or is abandoned | `mode`, `result`, `difficulty`, `turns`, `duration_bucket` | Do they finish? How long do games run? Which difficulties get abandoned? |
| `store_open` | The Store surface is opened | `source` | Does anyone look at cosmetics? |
| `skin_click` | A locked skin's buy action is triggered | `skin_id`, `price` | Which skin motivates a purchase attempt |
| `donate_click` | The outbound Donate action is activated | `source` | Does the donate nudge convert to a click? |
| `room_created` | A private room code is generated | none | Private-room usage |
| `room_joined` | A player joins a private room by code | none | How many created rooms actually get a second player |
| `tutorial_complete` | The scripted first game is played to the end | none | Tutorial completion rate (against `game_start` with `mode: tutorial`) |

## Property values

Vercel allows only `string | number | boolean | null` — no nested objects, no
arrays. These unions are the enforcement:

| Property | Values |
|---|---|
| `mode` | `tutorial` · `ai` · `pass_and_play` · `online` · `private` · `spectate` |
| `result` | `win` · `loss` · `draw` · `finished` · `abandoned` |
| `duration_bucket` | `under_1m` · `1_3m` · `3_10m` · `over_10m` |
| `side` | `light` · `dark` · `null` |
| `difficulty` | A `DifficultyId` (`beginner`…`master`) for `mode: ai`, otherwise `null` |
| `source` | `menu` (the only Store/Donate entry point today) |
| `skin_id` | A catalog SKU id (`board.night_lapis`), or `unlock_all` for the banner |
| `price` | Whole USD units — `1.99`, **not** minor units |

### Reading `mode`

The funnel's vocabulary is not the engine's. `analyticsMode()` maps between them:

| Engine / surface | Reports as |
|---|---|
| `{ kind: "ai" }` | `ai` |
| `{ kind: "pvp" }` | `pass_and_play` |
| `{ kind: "watch" }` | `spectate` |
| Matchmaking (`joinGameId`) | `online` |
| Private room, online wire | `private` |
| Private room, same-device wire | `private` |

### Reading `result`

`win` and `loss` are from the local human's point of view, and only exist
where there is a single human seat — vs-AI, matchmaking, and online private
rooms. Resign and timeout report `loss` for the resigning/timed-out side:
they are rated exactly like an on-board loss, so they are counted as one.

`finished` covers the modes with no single "you": pass-and-play (two humans)
and spectate (none).

`draw` is **unreachable** — Ur always resolves to a winner. It stays in the
type as a guard for future rule variants; seeing one in the data means a
rules change happened.

`abandoned` fires on the reliable in-app exits only: leaving a live game via
**‹ Menu**, starting a **New** game over a live one, or leaving a live room.
See "What is deliberately not tracked" below.

## What is deliberately not tracked

- **No per-move or per-roll events.** A typical session emits 3–6 custom
  events total. See the budget section.
- **No `visibilitychange` / `pagehide` abandonment.** `visibilitychange`
  fires on every tab switch and phone lock, which on mobile would drown the
  real signal in noise; `pagehide` is closer to honest but `track()` is
  fire-and-forget, so unload-time events are frequently lost. Abandonment is
  therefore measured only at the in-app exits, which are fully observable.
  Closing the tab mid-game is not counted.
- **No `game_complete` for the tutorial.** `game_start(tutorial)` →
  `first_roll` → `tutorial_complete` is already the complete funnel for that
  mode; a fourth event would buy nothing.
- **No `game_start` on Continue.** A resumed game already reported its start
  when it began. The trade-off: a resumed game that finishes produces a
  `game_complete` with no matching `game_start` in that session.
- **No PII.** No IPs, emails, usernames, room codes, or free text. `skin_id`
  is always a catalog id. No third-party script, tag manager, or pixel.

## Known measurement caveats

- **Same-device private rooms double-count.** Two browser windows on one
  machine each run their own hook, so one game emits two `game_start`s and
  two `game_complete`s. Online rooms also emit once per player, but there
  those are two genuinely different visitors.
- **`source` has one value.** Store and Donate each have exactly one entry
  point (the main menu footer), so "which surface leads to the Store" cannot
  be answered until a second surface exists. The property is in place so that
  adding one requires no schema change.
- **`skin_click` is intent, not checkout.** All paid SKUs share a single
  $1.99 unlock-everything product, and guests hit an account step before
  payment. The event means "tried to buy, from this card".

## Event budget

Hobby includes **50,000 events/month** (page views and custom events
combined) and pauses collection rather than billing when exceeded.

Against 30-day baseline traffic of **1,120 visitors / 1,325 page views**:

| Scenario | Assumption | Custom events | + page views | Total | % of 50k |
|---|---|---|---|---|---|
| Current, central | 50% of visitors play, 1.4 games each | ~2,300 | 1,325 | **~3,600** | 7% |
| Current, high | every visitor plays, 2 games each | ~5,900 | 1,325 | **~7,300** | 15% |
| 10× traffic, central | same behaviour, 11,200 visitors | ~23,000 | 13,250 | **~36,000** | 73% |
| 10× traffic, high | same behaviour, 11,200 visitors | ~59,000 | 13,250 | **~72,000** | **over** |

**Headroom is roughly 7,700–15,500 visitors/month** depending on how engaged
they turn out to be — call it 7–14× current traffic. Growth past that needs
either the Pro plan or sampling; it is not a reason to trim events now.

Per-session event count, central case: `game_start` 1.4 + `first_roll` 1 +
`game_complete` 1.4 + occasional store/donate/tutorial ≈ **4.1**.

## Adding a new event

1. Add a variant to the `AnalyticsEvent` union in `apps/web/lib/analytics.ts`.
   Property values must be `string | number | boolean | null`; prefer a small
   string union over free-form strings to keep cardinality down.
2. Export a `trackX()` wrapper that calls `emit()`. Never call `track()`
   directly from a component.
3. Fire it from a **state transition** — a reducer, a callback, or a
   ref-guarded effect — never from a render body or an effect that re-runs.
   StrictMode double-invokes effects in development; a `useRef` guard keyed
   on the game id is the pattern used throughout.
4. Add the row to the table above, and a test in `lib/analytics.test.ts`.
5. Check the budget: will this fire more than once or twice per session?

## Local verification

`DEBUG_ANALYTICS` is on whenever `NODE_ENV !== "production"`, and can be
forced anywhere (a preview deploy, say) with `NEXT_PUBLIC_DEBUG_ANALYTICS=1`.
Every event is logged as:

```
[analytics] first_roll { mode: "ai" }
```

In development, Vercel's own script also runs in debug mode and logs events
rather than sending them, so nothing you do locally reaches the dashboard.

### Manual QA checklist

Run `pnpm dev`, open the console, filter on `[analytics]`.

| # | Click path | Expect |
|---|---|---|
| 1 | Menu → *Play the machine*, pick Master + Dark → **Begin** | `game_start {mode:"ai", difficulty:"master", side:"dark"}` |
| 2 | Press **Roll** | `first_roll {mode:"ai"}` |
| 3 | Press **Roll** again, several times | **nothing** — once per session |
| 4 | Play to a win | `game_complete {mode:"ai", result:"win"\|"loss", difficulty:"master", turns:N, duration_bucket:"…"}` |
| 5 | **Play again** in the win overlay | `game_start` only — no second `game_complete` |
| 6 | Mid-game, press **‹ Menu** | `game_complete {result:"abandoned"}` |
| 7 | Mid-game, press **New** → confirm | `game_complete {result:"abandoned"}` then `game_start` |
| 8 | Win a game, then press **Menu** from the overlay | **nothing** — a decided game never also reports abandoned |
| 9 | Menu → *Two players* → Begin, play to a finish | `game_start {mode:"pass_and_play"}` … `game_complete {result:"finished"}` |
| 10 | Menu → *Watch AI vs AI* → Begin | `game_start {mode:"spectate"}`, and **no** `first_roll` at any point |
| 11 | Menu → *Learn to play* → Start tutorial | `game_start {mode:"tutorial", side:"light"}` |
| 12 | Roll in the tutorial | `first_roll {mode:"tutorial"}` (only if step 2 hasn't already fired this session) |
| 13 | Tutorial → **Skip** early | **no** `tutorial_complete` |
| 14 | Tutorial → play to the last step → **Finish** | `tutorial_complete` |
| 15 | Menu → *Private room* → **Create a private room** | `room_created` |
| 16 | Second window → join with the code | `room_joined`, then `game_start {mode:"private"}` in both windows |
| 17 | Menu → **Store** | `store_open {source:"menu"}` |
| 18 | Store → a locked skin's **Unlock All** | `skin_click {skin_id:"<that sku>", price:1.99}` |
| 19 | Store → the top **Unlock everything** banner | `skin_click {skin_id:"unlock_all", price:1.99}` |
| 20 | Menu → **Donate** → **Donate ♡** | `donate_click {source:"menu"}` — *opening the panel alone logs nothing* |

Reload the page between runs to reset the `first_roll` guard, or clear
`ur:analytics:first-roll` from sessionStorage. Closing and reopening the tab
also resets it, by design.

Automated coverage lives in `apps/web/lib/analytics.test.ts` (13 tests):
payload shapes, the session guard including the storage-blocked and remount
paths, allowed value types, non-throwing behaviour under a failing `track()`,
and the server-side no-op.

## Later: PostHog

Vercel gives counts; it will not tell you whether the same person came back
three days later. If cohorts and funnels become the question, PostHog's free
tier can run alongside — and the wiring is already shaped for it. Every event
in the app passes through the single `emit()` function, so a second sink is a
change to one function body, not a re-wiring of the app.
