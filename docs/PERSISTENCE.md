# Persistence

The active game survives refresh, tab close, and returning later. Module:
`apps/web/lib/persistence/` — tests in `persistence.test.ts` (run via `pnpm --filter @ur/web test`).

## What is saved

One active game under localStorage key **`ur:save`**:

```ts
interface SavedGame {
  version: 1;          // CURRENT_SAVE_VERSION — bump with a migration, never mutate in place
  savedAt: string;     // ISO, last write
  startedAt: string;   // ISO, when the game began (duration stats)
  gameId: string;      // uuid per game
  mode: GameMode;      // pvp | { ai, human seat, difficulty } | watch pairing
  session: string;     // engine `ur-session@1` payload: full state + RNG position
}
```

The engine snapshot carries everything gameplay-relevant — board positions, whose turn, pending
dice, legal-move situation, full event history, winner — **plus the RNG position**, so a resumed
game rolls the exact dice it would have rolled without the refresh. Orientation preference and
(future) settings live under their own keys (`ur-layout`, `ur:settings`), not inside the save.

## Save lifecycle

- **Write**: a `useGame` effect saves after every state change (roll/move/pass/undo). No
  debounce — payloads are a few KB.
- **Empty games aren't saves**: `history.length === 0` clears instead (an untouched game equals
  a fresh one, so no misleading "Continue" card).
- **Finished games leave the slot**: `winner !== null` clears the save (match results move to
  the stats store — Phase 8).
- **New game**: fresh session + `gameId` + `startedAt`, save cleared immediately.

## Restore flow

Menu (`GameApp`) loads the save when showing; a valid save renders a **Continue game** card
(mode + saved-ago). Continue passes the save into `GameView → useGame`, which deserializes the
session and flags `restored` (a "Game restored" toast shows once). Exiting to menu mid-game
keeps the save — the card reappears.

## Validation — saves are untrusted input

`loadGame()` = parse → `migrateSavedGame` → `validateSavedGame`, all failure-proof:

1. Structural checks on the wrapper (version, timestamps, mode shape incl. known difficulty ids).
2. `GameSession.deserialize` — engine-side structural validation of the state payload.
3. **Replay cross-check**: `buildStateFromEvents(ruleset, history)` must reproduce the stored
   positions/current/winner/rollCount/dice. Tampered or drifted saves fail closed.

Any failure returns `null` and **removes the bad payload** so it can't wedge future loads.
Storage being unavailable (private mode, quota) degrades to unsaved in-memory play — never a
crash (`saveGame` returns `false`; nobody throws).

## Migrations

`migrations.ts` maps old versions forward shape-to-shape, then full validation still runs.
Unknown versions → `null` → discarded. Adding v2: extend `SavedGame`, bump
`CURRENT_SAVE_VERSION`, add `upgradeV1toV2`, test both paths.

## New Game confirmation

- In-game **New** with a live unfinished game → modal ("Your current game will be replaced").
- Menu **Begin** while a save exists → modal pointing at *Continue game* as the alternative.
- No live game/save → both start immediately.

## Acceptance evidence (2026-07-04, manual + unit)

- Play → refresh → Continue: identical position, turn, and future dice (RNG restored). ✓
- Roll → refresh: pending dice preserved. ✓ (dice live inside the state snapshot)
- Finish a game → save cleared; no stale Continue card. ✓
- New with progress → modal; cancel keeps everything; confirm wipes save + board. ✓
- Corrupt payloads (bad JSON, wrong version, tampered positions) → discarded silently, clean
  start. ✓ (unit-tested, 8 tests)
