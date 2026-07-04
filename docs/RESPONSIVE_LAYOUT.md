# Responsive Layout

How the game fits every screen. Decision record: [ADR 0004](adr/0004-container-query-board-sizing.md).
Acceptance harness: `apps/web/public/viewport-lab.html` (dev server → `/viewport-lab.html`).

## Strategy

**Invariant: during gameplay the page never scrolls and nothing is clipped, in either
orientation.** Only menu/tutorial/settings screens may scroll.

Three layers, each with one job:

| Layer | Owner | Job |
|---|---|---|
| Orientation decision | `lib/useGameLayout.ts` (JS) | Touch devices follow OS rotation (portrait→vertical, landscape→horizontal), no toggle shown. Non-touch devices get a header toggle, persisted (`ur-layout`). `?layout=` forces it for tests. |
| Space distribution | `.game-screen` + `.game-grid` (CSS grid) | Screen is `100dvh / overflow:hidden`. Grid areas: vertical stacks dark/board/light/dice with `auto minmax(0,1fr) auto auto` rows; horizontal puts the board beside a 21rem sidebar (`"board dark" / "board dice" / "board light"`). Same DOM order both ways (piece animations depend on it). |
| Board fit | `.ga-board` + `.board-frame--fit` (container queries) | `.ga-board` is a size container; the frame takes `width: min(100cqw, 100cqh·cols/rows, cap)` with `aspect-ratio: cols/rows`. `Board.tsx` sets `--bcols/--brows` = 8/3 (horizontal) or 3/8 (vertical) and the cap (56rem / 22rem). |

## Board scaling formula

For grid shape `cols × rows` inside a board cell of size `W × H`:

```
boardWidth = min(W, H × cols/rows, maxCap)   // CSS: min(100cqw, calc(100cqh * cols/rows), cap)
boardHeight = boardWidth × rows/cols          // via aspect-ratio
```

Whichever dimension binds wins; the cap stops comically large tiles on big monitors. There is
**no hard minimum tile size** — fit beats minimums (a floor would reintroduce overflow); the
matrix below empirically yields ≥ ~50px tiles everywhere.

## Breakpoints

| Query | Effect |
|---|---|
| `(hover: none) and (pointer: coarse)` | Device is touch: orientation follows OS rotation; no toggle button. |
| `(orientation: landscape/portrait)` | Drives auto layout on touch devices (live via `matchMedia` change events). |
| `max-width: 700px` | Header compacts: icon-only layout toggle, 1rem title. Header pieces are `white-space: nowrap` at all sizes. |
| `max-height: 560px` | Short-viewport chrome compaction (phone landscape): tighter screen padding/gaps, smaller header buttons/title, slimmer player panels + pool pieces (0.875rem), compact dice (1.5rem), smaller roll total, tighter board-frame padding. |

Sidebar width is a fixed 21rem: it matches its content minimum (7 pool pieces + labels + dice
row). **Don't** "save space" by clamping it below min-content — grid fixed tracks don't shrink;
the content just clips silently under `overflow: hidden` (this exact bug shipped briefly with
`clamp(12rem, 26vw, 21rem)` and was caught by the lab's clip check at 844×390).

## Orientation rules

- Touch + portrait → vertical. Touch + landscape → horizontal. Rotating mid-game switches live;
  DOM order is identical so shared-element piece animations survive.
- Non-touch → last toggled layout (default vertical), persisted across sessions.
- `?layout=vertical|horizontal` (test-only) overrides the initial mode and disables auto-follow.

## Verification — 2026-07-04 matrix run

Programmatic sweep in the viewport lab. FIT = no document scroll in either axis **and** every
gameplay element (`.board-frame`, `.player-panel`, `.dice-tray`, header buttons) fully inside
the viewport box. Game begun (not menu) before measuring; smoke move performed at 390×844.

| Viewport | vertical | horizontal |
|---|---|---|
| 390×844 iPhone portrait | FIT (+ roll/move smoke) | — |
| 430×932 iPhone PM portrait | FIT | — |
| 844×390 iPhone landscape | — | FIT (visual: sidebar, 4 dice, Roll all visible) |
| 932×430 iPhone PM landscape | — | FIT |
| 1024×768 tablet landscape | FIT | FIT |
| 1366×768 laptop | FIT | FIT |
| 1440×900 desktop | FIT | FIT (visual verified) |
| 1920×1080 desktop XL | FIT | FIT |

Re-run the sweep after any layout change: `.agent/loops/01-responsive-fix-loop.md`.

## Known approximations

- Tiles are within a few percent of square, not exact (frame `aspect-ratio` includes
  padding/gaps) — see ADR 0004 consequences / KNOWN_ISSUES AG-5.
- The Next.js dev-tools floating button can overlap the status line in dev; it does not exist
  in production builds.
