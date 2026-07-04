# Test Plan

## Automated (must stay green — run before every commit)

```bash
pnpm test        # engine (48: rules, captures, rosettes, win, replay, 120-game fuzz) + ai (14: legality, ladder monotonicity)
pnpm typecheck   # all packages, strict TS
pnpm --filter @ur/web build   # required before committing web changes
```

There is no lint script; do not invent one (see KNOWN_ISSUES AG-4).

## Manual viewport matrix (responsive changes MUST run this)

Open `http://localhost:3000/viewport-lab.html` (dev server). For each preset the lab shows a
live **FIT / OVERFLOW** badge (compares the iframe document's scroll size to its client size).

| Viewport | Device class | Layouts to check |
|---|---|---|
| 390×844 | iPhone portrait | vertical |
| 430×932 | iPhone Pro Max portrait | vertical |
| 844×390 | iPhone landscape | horizontal |
| 932×430 | iPhone Pro Max landscape | horizontal |
| 1024×768 | tablet landscape | horizontal + vertical |
| 1366×768 | laptop | horizontal + vertical |
| 1440×900 | desktop | horizontal + vertical |
| 1920×1080 | desktop | horizontal + vertical |

Pass = badge FIT, all controls visible/usable, no clipped gameplay element, board comfortably
readable. Use `?layout=` to force each orientation inside the lab.

## Gameplay regression (manual, each web change)

1. New game vs AI (medium) → roll (R key and button) → move a piece → AI replies.
2. Land on a rosette → extra turn granted.
3. Capture an opponent piece → it returns to their pool.
4. Roll 0 / no legal moves → pass toast appears, turn passes.
5. Undo → state steps back cleanly (vs AI: undoes to your previous decision point).
6. Finish a game → win overlay, Play again works.
7. Orientation: toggle on desktop (persists across reload); rotate on a real phone if available.
8. Keyboard: R rolls; piece buttons focusable; screen-reader live region announces moves.

## Persistence tests (Phase 2, once built)

- Mid-game refresh → exact resume (turn, dice, legal moves, history length).
- Corrupt `localStorage` payload → app starts clean, no crash, save discarded.
- Version bump → migration path or safe discard.
- New Game with live save → confirmation modal; cancel keeps game.

## AI checks

`pnpm bench` — every tier must beat the tier below (monotonic ladder). AI must never emit an
illegal move (engine throws → test failure).

## Accessibility spot checks

Focus visible on all interactive elements; aria-labels on icon buttons; `prefers-reduced-motion`
respected; touch targets ≥44px on mobile; contrast ≥ 4.5:1 for text.

## Performance spot checks

No dropped-frame jank when moving pieces at 1920×1080; AI think time doesn't block input
(UI stays responsive); no unnecessary full-board re-renders (React DevTools highlight).
