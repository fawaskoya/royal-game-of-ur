# Master Specification — The Royal Game of Ur

This is the canonical product vision. Subsystem docs (GAME_RULES, AI_ENGINE, ONLINE_ARCHITECTURE, UI_UX) refine it; ROADMAP and TASKS sequence it. When priorities conflict, this document wins.

## Objective

Build the world's most polished, educational, competitive, historically accurate, and commercially scalable version of the Royal Game of Ur — capable of rivaling premium chess and backgammon applications, and of supporting casual players, ranked competition, AI research, and education for years.

Every decision prioritizes: beautiful UX · historically authentic gameplay · extremely polished animation · high performance · expandability · clean architecture · competitive online play · AI-research friendliness · mobile-first responsiveness · future monetization.

**Non-negotiables:** built in modular phases; no temporary hacks; everything scalable; never sacrifice architecture for speed; propose better designs (ADR) before implementing them; refactor + test + document at the end of every milestone; preserve backwards compatibility.

## Feel references

Chess.com / Lichess (competitive depth) · Backgammon Galaxy (dice-game polish) · Monument Valley (visual poetry) · Apple HIG (interface discipline) · Nintendo (game feel). The player should feel like they are touching an ancient artifact brought into the modern world.

## Historical authenticity

Faithful Irving Finkel / British Museum rules as the default: 2 players, 7 pieces each, 4 binary tetrahedral dice, 20-square board, shared middle lane, rosettes grant extra throws, the contested central rosette is safe, exact throw to bear off, first to bear off all pieces wins. Selectable rulesets — Classic (Finkel), Tournament, Custom House Rules, and researched historical variants — all as modular `RulesetConfig` presets, never scattered conditionals. Details: [GAME_RULES.md](GAME_RULES.md).

## Platforms

Now: responsive web (desktop/tablet/mobile). Future: PWA, Electron/Steam, iOS, Android.

## Technology

Frontend: Next.js, React, TypeScript, Tailwind, Framer Motion, Canvas/WebGL where needed.
Backend (future): Node, Supabase (PostgreSQL + realtime), Redis if needed. Auth: Google/Apple/Discord/guest. Analytics: PostHog + Sentry.
Core: pure TypeScript rules engine and AI packages, UI-independent and server-runnable.

## Core gameplay requirements

Movement validation, turn management, captures, rosettes/extra turns, entry/exit, win detection, undo (local), replay engine — with **every move passing through the rules engine**; gameplay is never hardcoded in a client. The engine exposes: generate legal moves, validate move, apply move, undo, clone/serialize/deserialize state, evaluate winner, generate/verify replay. Game state is immutable and fully serializable.

Dice: authentic tetrahedral pair-marked dice; satisfying roll presentation (physics/quick/instant modes), seeded and verifiable randomness.

## Game modes

Local PvP · vs AI · AI vs AI · Tutorial · Practice · Puzzle · Replay · Spectator · Sandbox · Daily challenge.

## AI

A modular ladder from Beginner (random) through Easy/Medium (heuristics) and Hard/Expert (expectimax with true dice probabilities) to Master (MCTS) and Grandmaster (hybrid search + learned evaluation, opening book, endgame tables). Difficulty never cheats — each tier differs only in decision quality. Evaluation considers distance to finish, capture chances/risks, rosette and shared-lane control, roll probabilities, tempo, safety. Architecture must permit future self-play training, dataset generation, RL, and benchmarking. A hint engine and puzzle generator build on the same search. Details: [AI_ENGINE.md](AI_ENGINE.md).

## Online play (after local play is perfected)

Server-authoritative realtime multiplayer: server rolls the dice, validates every move through the same engine, verifies replays; never trust clients. Matchmaking (casual/ranked/friends/invite/tournaments), Elo then Glicko with seasons and divisions, leaderboards, profiles, achievements, spectating, reconnection. Details: [ONLINE_ARCHITECTURE.md](ONLINE_ARCHITECTURE.md).

## Experience

Minimal luxury museum aesthetic — stone, parchment, gold; dark and light modes; ambient temple soundscape with a minimalist option; Nintendo-quality interactive tutorial; replays with timeline scrubbing, export/import/share; rich statistics (accuracy, blunders, streaks, openings); accessibility as a requirement (colorblind modes, high contrast, reduced motion, screen readers, keyboard nav, large UI, touch). Details: [UI_UX.md](UI_UX.md).

## Performance & quality bars

60–144 fps; fast load; offline local play; save/auto-resume; lazy loading. Unit + property tests on the engine, replay verification, AI benchmarking, network and regression suites. Cosmetics (board/dice/music themes: Babylonian, Egyptian, Persian, Greek, Roman) are future revenue — never pay-to-win.

## Long-horizon features

Voice chat, clans/guilds, community tournaments, opening explorer, AI coach and game analysis, streaming/Discord integration, educational academy, documentary/museum modes, VR/AR tabletop.
