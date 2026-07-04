# Gameplay Experience

Phase 4 state: what the player sees/feels during play, and where each signal comes from.
Everything renders **engine events** (`state.history` / the `tail` of the last action) — the UI
never infers game facts.

## During play

| Signal | Source | Presentation |
|---|---|---|
| Whose turn / what now | `phaseOf`, controllers | Status line ("Light to roll", "pick a glowing piece", "Dark is thinking…"), active player card lit |
| Roll | `roll` event | Dice tumble (staggered), total pops; R key or button |
| Legal pieces | `legalMoves` | Gold halo on movable pieces; hover/focus previews destination ring |
| Capture preview | occupancy at destination | Danger-red destination ring (`.tile-target-capture`) |
| Move | `move` event | Shared-element piece animation pool→board→home |
| Capture happened | `move.capture` | "Captured!" status emphasis; victim animates back to its pool |
| Rosette | `move.extraTurn` | "Rosette! X rolls again" gold status |
| Forced pass | `pass` event | Center toast ("Zero — turn passes" / "No legal moves") |
| Last move | last `move` event | Quiet gold wash on from/to squares until the next roll |
| Hint (H) | `@ur/ai` `hintFor` depth 2 | Suggested piece pulses, destination ringed, reason in status ("Hint: captures an opponent piece") |
| Undo (U) | engine event-sourced rebuild | Vs AI rewinds to your previous decision point |

## Move history

Header ≡ button (or win screen → History). Right drawer, turn-grouped from roll events:

```
12. Dark  rolled 3 — 4 → 7 · ⚔ capture
11. Light rolled 4 — enters → 4 · ✿ again
```

Latest first; Esc/backdrop closes.

## End of game

Win overlay with honest summary computed from the event log: turns (roll count), duration
(from the persisted `startedAt`), captures and rosettes per player. Actions: Play again ·
History · Menu. Match results feed the local stats store (Phase 8).

## Feel guardrails

- Animations never gate input: the moment state allows an action, controls are live.
- Reduced motion: every animated signal has a text/static equivalent.
- AI think delay (~650–750ms) is UX pacing, not compute; Master's real think (~150ms) stays under it.
- No fake tension: dice results are decided by the engine before any tumble renders.
