# UI/UX Design System

Implementation companion to [`UI_UX.md`](UI_UX.md) (design language/vision). This documents what
is actually shipped: tokens, components, states, and adaptivity rules. Everything is styled via
the tokens in `apps/web/app/globals.css` — components never hardcode colors.

## Tokens

| Group | Tokens |
|---|---|
| Surfaces | `--bg`, `--bg-raised`, `--frame`, `--frame-edge` |
| Board | `--tile`, `--tile-lane`, `--tile-edge` |
| Ink | `--ink`, `--ink-dim` |
| Brand | `--gold`, `--gold-soft` |
| Pieces | `--light-piece(-edge)`, `--dark-piece(-edge)` |
| Alert | `--danger`, `--danger-soft` |

Typography: `font-display` (Iowan/Palatino serif stack) for titles, names, numerals; system
sans for UI copy. Focus: global gold `:focus-visible` ring.

## Component classes

- **`.btn` / `.btn-primary`** — the only two button styles. Gold-border hover glow, press
  translate, disabled at 40%.
- **`.chip`** — small pill metadata (controller, counts). Never interactive.
- **`.player-panel` (+ `--active`)** — two rows: identity (disc, name, controller chip, "to
  play", home count) and status (entry pool button with animated pieces, on-board count,
  captures ⚔). Active = raised bg + gold ring + lit left edge.
- **`.dice-tray`** — dice row (`.die`, `.dice-row`), animated `.roll-total`, Hint + Roll,
  status line (`role="status"`; gold emphasis on rosette/capture; hint reason appended).
- **Board tiles** — `.tile` (+`-lane`, `-rosette`) with states: `.tile-target` (gold ring,
  hovered/hinted destination), `.tile-target-capture` (danger ring — the move captures),
  `.tile-last` (quiet wash on the last move's from/to; cleared by the next roll).
- **Pieces** — `.piece(-light/-dark)` with shape-differentiated centers (colorblind-safe),
  `.piece-movable` gold halo, `.piece-hint` breathing pulse.
- **`Modal`** (`components/ui/Modal.tsx`) — board-frame panel, backdrop/Esc close, focus moved
  in, right-aligned actions (primary last).
- **History drawer** — right slide-in (`role="dialog"`), turn-grouped log, latest first.
- **Toasts** — pill overlays over the board (pass events, "Game restored").

## Motion

Framer-motion inside one `LayoutGroup`; `MotionConfig reducedMotion="user"` globally. Pieces are
shared elements (`layoutId="piece-{player}-{piece}"`) — pool→board→home animate through every
layout because DOM order never changes between orientations. Dice tumble on roll (result already
decided by the engine — presentation only), total pops with delay. Reduced motion ⇒ instant
state changes; text cues (status line) carry the information.

## Adaptivity

See `docs/RESPONSIVE_LAYOUT.md` for the layout system. Chrome adaptivity added by the design
pass, all in `globals.css`:

- `max-width: 700px` — icon-only header buttons (labels in `.layout-toggle-label` hide),
  smaller title, tighter header gaps; slimmer dice row (26px dice) so dice+total+Hint+Roll fit
  a 390px row.
- `max-height: 560px` — compact paddings, panels, pool pieces (14px), dice (22–24px), smaller
  roll total, tighter board padding.
- Horizontal sidebar (21rem) — dice capped at 28px with tighter row gap so the tray never
  presses the overflow-hidden edge.

## Copy rules

Short, warm, definite: "Light to roll" · "Dark is thinking…" · "Rosette! Light rolls again" ·
"Captured! Dark to play" · "No legal moves — turn passes" · "Game restored". Hints phrase
engine facts, never invented judgement ("lands on a rosette — roll again").

## Accessibility

Focus-visible everywhere; aria-labels on icon buttons, pool buttons, tiles (position, lane,
occupancy), dice total; `role="status"` for turn state; `aria-live` narration of every event;
keyboard: R roll, H hint, U undo, N new game, Esc close overlays. Touch targets ≥44px on
mobile-relevant controls.
