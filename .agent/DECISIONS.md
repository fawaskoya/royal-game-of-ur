# Decisions Log

Agentic-campaign decisions. Engine/architecture decisions also get a full ADR in
[`docs/adr/`](../docs/adr/) (repo rule); entries here may just point at one.

---

## Decision: Board sizing via CSS container queries, not a JS resize hook

Date: 2026-07-04
Status: Accepted — see ADR [0004](../docs/adr/0004-container-query-board-sizing.md)
Context: Horizontal mode overflowed the viewport; the founding prompt sketches a
`useResponsiveGameLayout()` hook computing tile sizes in JS, but allows "If CSS alone is enough,
prefer CSS."
Decision: The board area is a `container-type: size` element; the frame sizes itself with
`width: min(100cqw, 100cqh × cols/rows, max-cap)` and `aspect-ratio: cols/rows`. The JS hook
(`useGameLayout`) only decides *which orientation* applies (touch → OS rotation, desktop →
toggle); it never measures pixels.
Alternatives considered: JS ResizeObserver/hook computing `--tile-size` (more moving parts,
resize-event jank, SSR mismatch); pure media-query breakpoints (can't express
"fit remaining space after flexible chrome").
Consequences: Zero resize listeners; layout responds to *any* container change (URL-bar
collapse, split-screen). Tile size is implicit — a hard minimum tile size cannot be enforced
without reintroducing overflow, so we cap only the maximum and verify minimums empirically
across the viewport matrix (fit wins over minimum; documented in RESPONSIVE_LAYOUT.md).

---

## Decision: Vertical mode is also non-scrolling

Date: 2026-07-04
Status: Accepted
Context: Founding prompt requires horizontal to fit; for vertical it says "fit comfortably on
portrait screens" and lists mobile-portrait sizes in the acceptance matrix. Old vertical mode
scrolled (~975px board on a 390px-wide phone).
Decision: One rule everywhere — during gameplay the screen never scrolls; the board absorbs
leftover space in both orientations. Only menu/tutorial/settings screens may scroll.
Alternatives considered: keep vertical scrollable (rejected: fails 390×844 acceptance; feels
like a webpage, not a game app).
Consequences: On very short viewports everything compacts (header/panels/dice) instead of
scrolling; the compaction breakpoints live in `globals.css`.

---

## Decision: Touch devices get no layout toggle; desktop does

Date: 2026-07-03
Status: Accepted (founder-specified)
Context: Founder: "Toggle shouldn't be there on mobile, should be changed when phone is turned."
Decision: `(hover: none) and (pointer: coarse)` → orientation follows OS rotation, no toggle
button. Otherwise → header toggle, persisted under `ur-layout`.
Consequences: A future Settings "orientation: auto/vertical/horizontal" (Phase 9) must supersede
the raw toggle; keep the storage key.

---

## Decision: Master tier = beam-pruned depth-4 expectimax, not MCTS

Date: 2026-07-04
Status: Accepted
Context: The founding prompt wants a sixth tier clearly above Expert (full-width depth-3
expectimax). Weight tuning alone and narrow endgame-only deepening both measured ~49% vs
Expert; full-width depth 4 is ~20× cost (seconds/move).
Decision: `beamWidth` forward pruning in the shared expectimax — inner move layers search only
the top-3 children by static eval; **the root is never pruned**. Master = depth 4, beam 3,
`MASTER_WEIGHTS` (adds a rosette-tempo eval term priced by exact dice probabilities).
Alternatives considered: MCTS (docs' original sketch — bigger build, benched later if beam
plateaus); star-1/transposition tables (heavier, kept as future speedups).
Consequences: 56% vs Expert over 100 seeded games at ~150ms/move (inside the 750ms think
delay). Full-ladder bench with Master pending (slow); AI_ENGINE.md records the tuning history.

---

## Decision: Never run `next build` against a live dev server's `.next`

Date: 2026-07-05
Status: Accepted (operational rule — AG-8)
Context: Twice this campaign, running the production build while `pnpm dev` served the same
`.next` corrupted dev chunks: client JS 404s, hydration dies silently, every button dead —
looks exactly like an app bug and cost real debugging time both times.
Decision: build-verification happens with the dev server stopped, or is followed by
`rm -rf apps/web/.next && pnpm dev`.
Consequences: RELEASE_CHECKLIST build step implies a dev-server restart afterward.

---

## Decision: `?layout=` URL override for testing

Date: 2026-07-04
Status: Accepted (test-only)
Context: The viewport lab loads the app in iframes where touch/orientation media queries can't
be faked per-frame.
Decision: `?layout=vertical|horizontal` forces initial layout; never persisted; documented as
dev/test-only. Also the seed of the Phase 9 orientation preference.
Consequences: Trivial code path in `useGameLayout`; must not leak into normal UX flows.
