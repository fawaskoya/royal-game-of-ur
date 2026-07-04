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

## Decision: `?layout=` URL override for testing

Date: 2026-07-04
Status: Accepted (test-only)
Context: The viewport lab loads the app in iframes where touch/orientation media queries can't
be faked per-frame.
Decision: `?layout=vertical|horizontal` forces initial layout; never persisted; documented as
dev/test-only. Also the seed of the Phase 9 orientation preference.
Consequences: Trivial code path in `useGameLayout`; must not leak into normal UX flows.
