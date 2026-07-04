# Tutorial & Strategy

Two entry points from the menu, per the founding brief:

## 1. Tutorial Section — "How to play" (`components/HowToPlay.tsx`)

Modal guide, two tabs, content checked against [`GAME_RULES.md`](GAME_RULES.md) (if they ever
disagree, GAME_RULES wins and this UI is the bug):

- **Rules**: objective · board (entry lane / shared lane / exit lane, rosettes) · dice
  (four 0/1 pyramids, totals 0–4, distribution 1-4-6-4-1/16, zero forfeits) · moving & entering
  · rosettes (extra throw; central one safe + blocking) · captures (shared lane only) · exact
  bear-off.
- **Strategy**: opening development (enter early; entry-4 chains onto the rosette) · shared-lane
  threat counting (2 is the likeliest throw — the worst square is exactly 2 ahead of an enemy)
  · central-rosette value (safe + forward + tempo) · when to capture (reply exposure vs tempo
  swing) · endgame arithmetic (exact bear-offs; spread exit distances; exit-lane rosette).

CTA at the bottom starts the interactive mode.

## 2. Tutorial Mode — "Learn to play" (`components/TutorialView.tsx` + `lib/useTutorial.ts`)

A guided first game on the **real engine** — dice are engine inputs, so the script forces exact
rolls (`applyRoll(makeRoll(n))`) while legality, captures, rosettes, and animations are all live
engine behavior. Nothing is mocked; every scripted move is legal by construction.

14 steps: welcome → roll (forced 4) → enter onto the private rosette → extra-turn lesson →
step onto the shared lane → watch the guide (Dark) enter and advance → capture Dark's piece →
see the return-to-pool → claim the safe central rosette → bear-off/exact-throw explanation →
finish with a "play Beginner" nudge.

Mechanics:

- The learner may only play the scripted move: `legal` passed to the board is filtered to it,
  and it doubles as the hint highlight (pulsing piece + ringed destination).
- Guide turns auto-play after a readable beat ("Dark is playing…").
- **Progress persists** under `ur:tutorial` (v1: `{step, completed}`, fail-safe); mid-script
  resume replays the scripted actions 0..step through the engine, so the resumed position is
  exact. Restart and Skip are always available; finishing or skipping marks it completed.
- Layout reuses the responsive game grid (both orientations, same fit guarantees).

## Verification (2026-07-04)

Driven end-to-end in-browser: all 14 steps, every scripted action legal, capture and central-
rosette moments land as written, completion flag persisted, exit returns to menu. Guide tabs
render all sections.
