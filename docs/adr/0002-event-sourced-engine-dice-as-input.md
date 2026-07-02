# ADR 0002 — event-sourced immutable engine; dice are inputs; forced passes auto-apply

**Status:** accepted · 2026-07-02

## Context

The spec requires: deterministic rules engine, replay generation/verification, undo, serialization, server-authoritative online play, and AI search — all over the same core.

## Decision

1. **Immutable `GameState` + pure transitions.** `applyRoll(state, roll)` / `applyMove(state, move)` return new states; no hidden mutation, no RNG inside transitions. RNG lives in a separate seeded utility (`createRng`, mulberry32) and the optional `GameSession` wrapper; servers will substitute crypto rolls.
2. **Event-sourced history.** Every transition appends `roll`/`move`/`pass` events carrying derived outcomes (capture, rosette, extraTurn, finished). Ruleset + events reconstruct any position; `buildStateFromEvents` re-validates each event and throws `REPLAY_MISMATCH` on any forgery — one mechanism powers replay scrubbing, undo (`undoLastRoll` = rebuild minus tail), saved games, and anti-cheat.
3. **Forced passes auto-apply inside `applyRoll`.** A zero roll or moveless roll immediately records `pass` and hands over the turn. Rationale: the pass is rule-forced (no player choice exists), so exposing an intermediate "must pass" state would only create illegal-limbo bugs in clients; UIs animate the recorded events instead.
4. **Versioned formats**: `ur-state@1`, `ur-replay@1`, `ur-session@1`. Shape changes require a new version, never in-place edits.

## Consequences

- States carry their history; AI search pays a small copying cost (fine at current depths — a history-free `SearchState` is the known optimization if depth ≥ 4 is wanted).
- UIs must read history tails to narrate rolls/passes (implemented in CLI and web).
- mulberry32 is gameplay-grade; anything with stakes uses server crypto rolls by design.
