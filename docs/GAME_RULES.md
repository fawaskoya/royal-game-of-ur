# Game Rules — as implemented in `@ur/engine`

The default ruleset is Irving Finkel's British Museum reconstruction of the Royal Game of Ur. This document is the precise, testable statement of those rules and of every variant knob the engine supports. If code and this document disagree, one of them is a bug.

## Board and paths

The board is a 3×8 grid with notches: rows 0 and 2 have no squares at columns 4–5 (20 squares total). Row 1 is the shared battle lane. Player 0 (**Light**) owns row 2; player 1 (**Dark**) owns row 0.

```
 col:    0    1    2    3    4    5    6    7
 row 0 [ ✿ ][   ][   ][ en]          [ ✿ ][ ex]   Dark private
 row 1 [   ][   ][   ][ ✿ ][   ][   ][   ][   ]   shared lane
 row 2 [ ✿ ][   ][   ][ en]          [ ✿ ][ ex]   Light private
```

Each player's **path** is 14 on-board squares, indexed per player:

| Path index | Light square | Notes |
| --- | --- | --- |
| 0 | — | start pool (off board) |
| 1–4 | (2,3) (2,2) (2,1) (2,0) | private entry lane; **4 is a rosette** |
| 5–12 | (1,0) → (1,7) | shared lane, both players in the same direction; **8 is the central rosette** |
| 13–14 | (2,7) (2,6) | private exit lane; **14 is a rosette** |
| 15 | — | finished (borne off) |

Dark's path mirrors Light's (row 2 ↔ row 0). Shared-lane path indices coincide: Light's index *i* and Dark's index *i* (5 ≤ i ≤ 12) are the same physical square — which is what makes captures possible there and only there. Private squares of the two players are disjoint, so pieces on indices 1–4 and 13–14 can never be captured.

## Dice

Four tetrahedral dice, two of four corners marked: each die is a fair coin (0/1). The throw total 0–4 moves a piece that many squares. Distribution: P(0)=1/16, P(1)=4/16, P(2)=6/16, P(3)=4/16, P(4)=1/16. A throw of **0 forfeits the turn**.

## A turn

1. **Roll.** If the total is 0, or no legal move exists, the turn passes automatically (both the roll and the forced pass are recorded).
2. **Move one piece** by exactly the total:
   - **Enter** from the start pool: a throw of *n* lands on path index *n* (your private entry lane).
   - You may never land on your own piece.
   - Landing on an opponent's piece on the shared lane **captures** it — it returns to the opponent's start pool.
   - The **central rosette (index 8) is safe**: an opponent's piece there cannot be captured, so that square is blocked to you while occupied (`safeRosettes`).
   - **Bear off** from index 14 (or earlier squares) only with the **exact** throw to reach index 15 (`exactBearOff`); overshooting is not a legal move for that piece.
3. Landing on any **rosette** (4, 8, 14) grants **another roll** (`rosettesGrantExtraTurn`) — turns can chain.
4. First player to bear off all 7 pieces **wins**. There are no draws in the classic rules.

Edge cases the engine pins with tests: multiple start-pool pieces produce one (de-duplicated) entry move; a playable total with every destination blocked is a forced pass; a rosette landing that also wins does not grant an extra turn (the game simply ends); captures cannot occur on private squares (structurally impossible).

## Variant knobs (`RulesetConfig`)

| Knob | Classic | Meaning when changed |
| --- | --- | --- |
| `piecesPerPlayer` | 7 | shorter/longer games (1–10) |
| `diceCount` | 4 | changes movement distribution (1–8) |
| `rosettesGrantExtraTurn` | true | off ⇒ rosettes are decorative safety only |
| `safeRosettes` | true | off ⇒ central rosette can be captured on |
| `exactBearOff` | true | off ⇒ any overshoot bears off |
| `pathId` | `finkel` | alternative historical paths (future: the longer late-Babylonian route) |

Presets: `finkel` (classic), `tournament` (currently identical; reserved so competitive rules can diverge), `createRuleset(...)` for house rules. **New variants must be expressed as knobs or new `pathId`s — never as conditionals sprinkled through game logic.** Historically attested variants (e.g. the later Babylonian long path documented by Finkel) require research before implementation; do not invent history.

## Determinism, replay, undo

Dice results are *inputs* to the engine (`applyRoll`), so every transition is reproducible. The event log (`roll` / `move` / `pass`) plus the ruleset reconstructs any position; `buildStateFromEvents` re-validates every event and rejects tampered logs (`REPLAY_MISMATCH`) — the same mechanism will verify server games. Undo rewinds to before the most recent roll (`undoLastRoll`), or to the player's previous decision point (`GameSession.undoToPlayerRoll`).

## Sources

- Irving Finkel, "On the Rules for the Royal Game of Ur" (in *Ancient Board Games in Perspective*, British Museum Press).
- British Museum object 1928,1009.378 (the Ur board) and Finkel's published demonstration games.
- RGU cuneiform tablet BM 33333B (Babylonian rules text, basis for future historical variants).
