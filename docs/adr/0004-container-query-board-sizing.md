# ADR 0004 — orientation-aware layout with container-query board sizing

**Status:** accepted · 2026-07-04

## Context

The game must fit entirely inside the viewport — no scrolling, nothing clipped — across desktop,
tablet, and phone in both portrait ("vertical", 3×8 board) and landscape ("horizontal", 8×3
board + sidebar). The founding brief (`/MASTER_PROMPT.md`) sketches a JS hook that measures the
viewport and computes a clamped tile size, but allows CSS if CSS is enough. A plain
`aspect-ratio` box cannot solve this alone: centered as a flex item with `width:auto`, nothing
forces it to grow, and it collapses to content size (observed: an 84px board).

## Decision

1. **JS decides only the orientation; CSS does all sizing.** `useGameLayout` maps touch devices
   (`hover: none & pointer: coarse`) to OS rotation and gives non-touch devices a persisted
   header toggle (`ur-layout` key). `?layout=vertical|horizontal` forces the initial mode for
   the viewport lab (test-only, never persisted).
2. **Contain-fit via container queries.** The board grid cell (`.ga-board`) is
   `container-type: size`; the frame sizes itself
   `width: min(100cqw, calc(100cqh * var(--bcols) / var(--brows)), var(--board-max-w))` with
   `aspect-ratio: var(--bcols)/var(--brows)`. `Board.tsx` sets `--bcols/--brows` to 8/3 or 3/8.
   No resize listeners; any container change (URL-bar collapse, split screen) re-fits for free.
3. **The screen never scrolls during gameplay.** `.game-screen` is `100dvh; overflow:hidden` in
   both orientations; the grid gives the board `minmax(0, 1fr)` of the leftover space. Chrome
   (header, panels, dice) compacts under `@media (max-height: 560px)`; the layout toggle goes
   icon-only under 700px width.
4. **Fit beats a minimum tile size.** A hard min-tile would reintroduce overflow on small
   screens; instead we cap only the maximum (`--board-max-w`: 56rem landscape / 22rem portrait)
   and verified empirically that the 8-viewport matrix yields ≥ ~50px tiles everywhere.
5. **DOM order is orientation-independent** (dark / board / light / dice, rearranged only by
   `grid-template-areas`), so framer-motion `layoutId` piece animations survive orientation
   switches. The sidebar keeps a content-honest fixed width (21rem): squeezing it below
   min-content doesn't shrink content — it silently clips under `overflow:hidden` (observed at
   `clamp(…26vw…)` on 844×390).

## Consequences

- Tile squareness is approximate (frame ratio includes padding/gaps): tiles deviate a few
  percent from square — invisible at game scale, revisit if a texture pass makes it matter.
- Tile size is implicit; per-breakpoint tile clamps from the brief are expressed as board-width
  caps instead.
- The viewport lab (`apps/web/public/viewport-lab.html`) is the acceptance harness: FIT badge =
  no document scroll **and** no gameplay element outside the viewport box.
