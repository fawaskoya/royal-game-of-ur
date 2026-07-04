# ROYAL GAME OF UR — FABLE 5 MASTER PROMPT
You are the lead autonomous engineering agent for an existing web game project called **Royal Game of Ur**.
The game already works at a basic level, but it now needs serious product-level refinement, responsive fixes, persistence, improved UX, better AI/game strategy, tutorial mode, future-ready multiplayer, leaderboard preparation, coherent stats, and an agentic development system that keeps improving the project over time.
You must work carefully, incrementally, and professionally.
Do not rewrite the whole project unless absolutely necessary.
First inspect the existing codebase, understand the architecture, identify the framework, state management, styling system, routing system, and build setup, then make improvements in controlled steps.
---
# CURRENT KNOWN ISSUES
The game currently has two board modes:
1. Vertical mode
2. Horizontal mode
Vertical mode looks acceptable.
Horizontal mode is broken on web/mobile landscape because the board is too huge and requires scrolling. The board does not fit within the viewport.
Expected behavior:
- On desktop, the board and controls should fit elegantly inside the visible screen.
- On mobile portrait, the game should use a vertical layout.
- On mobile landscape, the game should automatically switch to horizontal layout and fit completely without awkward scrolling.
- The board should scale fluidly based on available viewport width and height.
- The player panels, dice, buttons, score/stats, and board should all remain visible and usable.
- No core gameplay element should be clipped.
- The game should feel like a polished premium board game app, not a prototype.
Second issue:
When the browser tab is refreshed or the page is reloaded, the current game resets to a fresh game.
Expected behavior:
- Game state must persist automatically.
- If the user refreshes the page, closes the tab, or returns later, the current game should resume from the last saved state.
- Add a clear option to start a new game.
- Add a reset confirmation modal before wiping a saved game.
- Store local game progress safely in localStorage or IndexedDB.
- Use schema versioning so future updates do not break old saves.
- Persist:
  - Current board state
  - Turn
  - Dice roll
  - Legal move state
  - Player pieces
  - Captured pieces if applicable
  - Home/finished pieces
  - Move history
  - Game mode
  - AI difficulty
  - Orientation preference
  - Basic local stats
  - Tutorial progress
---
# PRIMARY OBJECTIVE
Transform the current Royal Game of Ur app from a working prototype into a polished, responsive, persistent, expandable, elegant web game.
The immediate priorities are:
1. Fix horizontal mode sizing and responsive behavior.
2. Add reliable game persistence.
3. Improve visual layout and UI cohesion.
4. Improve statistics and game information display.
5. Improve gameplay feel, animations, and interactions.
6. Add tutorial section and tutorial mode.
7. Improve AI strategy and difficulty levels.
8. Prepare architecture for multiplayer.
9. Prepare architecture for leaderboards and scoring.
10. Create master documentation and agentic prompt-loop system.
11. Maintain changelog.
12. Commit changes to Git after meaningful milestones.
13. Push updates to remote Git if a remote is configured.
---
# VERY IMPORTANT RULES
Do not break existing gameplay.
Do not remove working features unless replacing them with better equivalents.
Do not hardcode for one screen size.
Do not fix horizontal mode by simply making the browser scroll.
Do not create visual chaos.
Do not add multiplayer as a half-broken feature if the local game is not stable.
Do not add fake leaderboard data without clearly marking it as mock/dev-only.
Do not push secrets, environment files, API keys, local credentials, or build artifacts.
Use clean, modular, maintainable code.
Every major change must be documented.
Every major change must be tested manually and, where possible, automatically.
---
# PHASE 0 — PROJECT DISCOVERY
Before coding, inspect the full project.
Identify:
- Framework used
- Package manager
- Build command
- Dev command
- Test command
- Styling system
- State management approach
- Routing structure
- Main game component
- Board rendering component
- Layout/orientation logic
- Rules engine
- AI engine
- Storage/persistence logic if any
- Existing docs
- Existing Git status
- Existing remote branch
Create or update:
```txt
docs/PROJECT_AUDIT.md

Include:

* Current architecture summary
* Current issues discovered
* Main files involved
* Risk areas
* Recommended implementation order

Then proceed.

⸻

PHASE 1 — RESPONSIVE ORIENTATION AND BOARD FIT FIX

Goal

Fix horizontal mode so it fits on screen without vertical scrolling, especially on web and mobile landscape.

Current visual issue

In horizontal mode, the board tiles are too large and extend below the viewport. The screen requires scrolling. This is unacceptable.

Required behavior

The game layout must adapt to:

* Desktop landscape
* Desktop narrow window
* Tablet portrait
* Tablet landscape
* Mobile portrait
* Mobile landscape

Orientation logic

Implement a robust orientation system.

Use a hook or utility such as:

useResponsiveGameLayout()

It should calculate:

* viewportWidth
* viewportHeight
* isPortrait
* isLandscape
* isMobile
* isTablet
* isDesktop
* safeAreaInsets if available
* preferredBoardOrientation
* actualBoardOrientation
* availableBoardWidth
* availableBoardHeight
* idealTileSize
* clampedTileSize
* controlPanelPlacement

Board sizing rules

The Royal Game of Ur board has a known tile grid shape depending on orientation.

The board must be sized using available viewport dimensions, not fixed pixel values.

Use CSS variables where useful:

--tile-size
--board-gap
--board-padding
--panel-width
--panel-height
--safe-top
--safe-bottom

The board should fit inside:

available viewport height - header - controls - margins - safe area

And inside:

available viewport width - side panels - margins - safe area

The final tile size should be:

tileSize = clamp(minTileSize, calculatedResponsiveTileSize, maxTileSize)

Suggested range:

* Mobile: 36px to 68px
* Tablet: 48px to 88px
* Desktop: 56px to 104px

But do not blindly use these numbers. Inspect current UI and tune carefully.

Horizontal mode layout

Horizontal mode should use:

* Board centered
* Player info arranged compactly above/below or left/right depending available width
* Dice and action buttons placed near active player
* No oversized tiles
* No excessive vertical spacing
* No forced full-height board if it causes overflow
* No browser scroll for normal gameplay

In mobile landscape:

* Header should shrink
* Menu/New/Undo buttons should become compact
* Stats should become smaller
* Dice row should become compact
* Board should remain fully visible
* Use safe-area padding for notches

Vertical mode layout

Keep vertical mode working, but refine it.

Vertical mode should:

* Fit comfortably on portrait screens
* Keep controls accessible
* Avoid huge empty spaces
* Use responsive scaling
* Show both players clearly

CSS requirements

Use modern responsive CSS:

@media (orientation: landscape)
@media (orientation: portrait)
@media (max-width: ...)
@media (max-height: ...)

Use:

height: 100dvh;
width: 100dvw;
overflow: hidden;

Where appropriate.

Prefer dynamic viewport units:

100dvh
100svh
100lvh

Be careful on mobile browsers.

Avoid relying only on 100vh.

Acceptance criteria

Horizontal mode must fit inside the visible viewport on:

* 1440x900 desktop
* 1366x768 laptop
* 1024x768 tablet landscape
* 844x390 iPhone landscape
* 932x430 iPhone landscape
* 915x412 Android landscape
* 390x844 mobile portrait
* 430x932 mobile portrait

No board scroll should be needed during normal gameplay.

Only settings/help/tutorial screens may scroll if needed.

Create or update:

docs/RESPONSIVE_LAYOUT.md

Document:

* Layout strategy
* Breakpoints
* Orientation rules
* Board scaling formula

⸻

PHASE 2 — GAME STATE PERSISTENCE

Goal

Game should not reset on refresh.

Implement persistent local save.

Required behavior

When a game is in progress:

* Save automatically after every meaningful state change.
* Restore automatically on reload.
* Validate saved data before loading.
* If save is corrupt, ignore it safely and offer new game.
* Add “Continue Game” behavior if needed.
* Add “New Game” confirmation if saved progress exists.

Storage strategy

Use localStorage first unless the app already has a better storage abstraction.

Create a dedicated persistence module:

src/game/persistence/

Suggested files:

src/game/persistence/gameStorage.ts
src/game/persistence/saveSchema.ts
src/game/persistence/migrations.ts
src/game/persistence/usePersistedGame.ts

Save schema

Include versioning:

type SavedGame = {
  version: number;
  savedAt: string;
  gameId: string;
  mode: "local" | "ai" | "tutorial" | "online";
  ruleset: string;
  orientationPreference?: "auto" | "vertical" | "horizontal";
  state: SerializedGameState;
  history: SerializedMove[];
  stats: LocalStats;
  ai?: {
    enabled: boolean;
    difficulty: string;
  };
};

Persistence requirements

Implement:

saveGame()
loadGame()
clearGame()
hasSavedGame()
migrateSavedGame()
validateSavedGame()

Use try/catch.

Never crash the app because of bad localStorage.

New Game UX

When user clicks New:

If game in progress:

Show modal:

Start a new game?
Your current game will be replaced.
Cancel
Start New Game

If no active game:

Start directly.

Restore UX

When page loads:

* Restore current game silently if valid.
* Optional toast: “Game restored.”
* Do not restart dice/turn incorrectly.
* Do not change player order.
* Do not lose AI mode.

Acceptance criteria

* Make several moves.
* Refresh page.
* Game resumes exactly.
* Roll dice.
* Refresh page.
* Dice state remains valid.
* Complete game.
* Refresh page.
* Completed result is preserved or moved to history based on design.
* Click New Game.
* Confirmation appears.
* Confirming wipes save and starts new game.

Create or update:

docs/PERSISTENCE.md

⸻

PHASE 3 — UI/UX COHESION AND DESIGN POLISH

Goal

Make the entire game feel like one elegant product.

Current UI looks promising but needs stronger cohesion, better spacing, better hierarchy, better stats, and more premium feel.

Design direction

The visual identity should be:

* Ancient Mesopotamian
* Museum-quality
* Premium
* Minimal
* Elegant
* Dark luxury
* Warm gold
* Stone/ivory board
* Smooth animations
* Subtle shadows
* High readability

UI improvements

Refine:

* Header
* Menu button
* Orientation toggle
* Undo button
* New button
* Player cards
* Active player indication
* Dice area
* Roll button
* Stats display
* Home count
* Piece row
* Board tile styling
* Rosette symbols
* Legal move hints
* Capture indication
* End game screen
* Confirmation modals
* Toast messages

Header

Header should adapt:

Desktop:

Menu | Royal Game of Ur | Controls

Mobile portrait:

Compact top bar

Mobile landscape:

Ultra compact bar

Avoid wasting vertical height in landscape.

Player cards

Each player card should show:

* Player name
* Human/AI indicator
* Difficulty if AI
* Active turn state
* Pieces in hand
* Pieces on board
* Pieces home
* Score/progress
* Last move summary where useful

Active player card should have clear elegant highlight.

Inactive player card should be calm and lower emphasis.

Dice UI

Dice should show:

* Roll state
* Result value
* Clear “Roll” button
* Animated roll
* Disabled state when not rollable
* Explanation for zero roll if applicable

Stats display

Make stats coherent and visually organized.

Show only the right level of information during gameplay.

Main gameplay stats:

* Pieces home
* Pieces remaining
* Current roll
* Turn count
* Captures
* Rosette extra turns
* Current streak if relevant

Detailed stats can be moved into a Stats panel.

Board polish

Tiles:

* Consistent size
* Elegant shadows
* Rosette tiles recognizable
* Hover state
* Selected piece state
* Legal destination state
* Capture destination state
* Safe tile indication
* Active route indication optional

Pieces:

* Distinct visual identity
* Smooth movement
* Hover/tap feedback
* Selected glow
* Captured animation
* Home animation

Interaction improvements

Add:

* Click/tap selected piece
* Highlight legal moves
* Explain illegal moves gently
* Show hint after dice roll
* Add undo for local/AI if already supported
* Add keyboard shortcuts later:
    * R = roll
    * U = undo
    * N = new game
    * H = hint
    * Esc = close modal

Acceptance criteria

* App feels consistent.
* No mismatched button styles.
* No awkward spacing.
* Important information is clear.
* UI works on touch and mouse.
* UI fits all target viewports.

Create or update:

docs/UI_UX_DESIGN_SYSTEM.md

⸻

PHASE 4 — GAMEPLAY EXPERIENCE ENHANCEMENTS

Goal

Improve the actual game feel.

Add or improve:

* Legal move highlighting
* Move preview
* Active piece selection
* Capture animation
* Rosette extra-turn animation
* Victory animation
* Better dice animation
* Move history
* Turn summary
* Hint system foundation
* Game over summary

Move history

Create a compact move history model.

Show in menu/stats panel:

* Turn number
* Player
* Roll
* From
* To
* Capture?
* Rosette?
* Piece home?

Example:

12. Light rolled 3, moved P4 to Rosette, extra turn.
13. Light rolled 2, captured Dark P2.

End Game Screen

When game ends, show:

* Winner
* Total turns
* Captures
* Rosettes landed
* Average roll
* Best move streak if available
* New Game button
* Rematch button
* View Replay button later

Acceptance criteria

* Game feels satisfying.
* Player always knows what happened.
* Player always knows what can be done next.

Create or update:

docs/GAMEPLAY_EXPERIENCE.md

⸻

PHASE 5 — TUTORIAL SECTION AND TUTORIAL MODE

Goal

Add a proper tutorial experience.

There should be both:

1. Tutorial Section
2. Tutorial Mode

Tutorial Section

Accessible from Menu.

Create a simple, elegant guide with sections:

* What is the Royal Game of Ur?
* Objective
* Board layout
* Pieces
* Dice
* Movement
* Rosettes
* Captures
* Safe squares
* Extra turns
* How to win
* Basic strategy
* Advanced strategy

Use short explanations with visuals if possible.

Tutorial Mode

Interactive game mode where the app teaches step-by-step.

Tutorial mode should guide the user through:

1. Rolling dice
2. Selecting a piece
3. Moving onto the board
4. Understanding the shared track
5. Landing on a rosette
6. Getting an extra turn
7. Capturing opponent pieces
8. Avoiding danger
9. Bringing pieces home
10. Winning the game

Tutorial UX

Use coach messages:

Welcome to the Royal Game of Ur. Your goal is to move all seven pieces home before your opponent.

Messages should be short and clear.

Add:

* Next button
* Skip tutorial
* Restart tutorial
* Highlight relevant UI elements
* Disable confusing actions during tutorial steps
* Save tutorial progress

Strategy Section

Add a guide for strategy:

Beginner strategy:

* Move pieces out early
* Use rosettes
* Avoid leaving pieces vulnerable
* Capture when safe

Intermediate strategy:

* Control central shared lane
* Use rosettes to chain turns
* Balance racing and blocking
* Time entry of new pieces

Advanced strategy:

* Probability-aware movement
* Rosette control
* Threat range management
* Sacrificial moves
* Endgame race calculation

Create or update:

docs/TUTORIAL_AND_STRATEGY.md

⸻

PHASE 6 — AI STRATEGY IMPROVEMENTS

Goal

Improve the AI so playing against it feels meaningful.

The game should support difficulty levels:

* Beginner
* Easy
* Medium
* Hard
* Expert
* Master

Do not cheat.

AI should only choose among legal moves.

AI architecture

Create or refine:

src/game/ai/

Suggested modules:

aiTypes.ts
evaluateBoard.ts
moveScoring.ts
randomAI.ts
heuristicAI.ts
minimaxAI.ts
probability.ts
difficultyProfiles.ts
aiController.ts

Difficulty behavior

Beginner

* Mostly random legal moves
* Does not plan
* Frequently misses captures
* Frequently misses rosettes

Easy

* Prefers forward progress
* Sometimes captures
* Sometimes uses rosettes
* Minimal risk awareness

Medium

* Scores legal moves
* Understands captures
* Understands rosettes
* Avoids obvious danger
* Balances entering new pieces and progressing

Hard

* Uses stronger heuristic evaluation
* Looks ahead at least one opponent reply where feasible
* Understands safe squares
* Understands central lane control
* Prioritizes high-value rosettes

Expert

* Uses minimax or expectimax-style planning where appropriate
* Considers dice probabilities
* Avoids tactical blunders
* Plays strong endgames

Master

* Strongest engine available
* Uses deeper search if performance allows
* Uses probability-weighted evaluation
* Uses dynamic risk/reward
* Feels tough but fair

AI evaluation should consider

* Pieces home
* Pieces on board
* Pieces waiting
* Distance to finish
* Rosette control
* Capture opportunities
* Capture vulnerability
* Safe squares
* Shared lane position
* Blocking potential
* Tempo
* Extra turn chance
* Endgame race value
* Probability of future rolls

AI UX

When AI is thinking:

* Show subtle thinking indicator
* Add slight delay for natural feel
* Do not freeze UI
* Allow speed setting later

Hint engine

Build a hint engine using the same AI scoring system.

For human player:

* Suggest best move
* Explain briefly:
    * “This move lands on a rosette and gives another turn.”
    * “This capture sends an opponent piece back and improves your race.”
    * “This move is safer because the opponent cannot capture it next turn.”

Create or update:

docs/AI_ENGINE.md

⸻

PHASE 7 — MULTIPLAYER ARCHITECTURE PREPARATION

Goal

Prepare the project for multiplayer without destabilizing the current local game.

Do not rush full online multiplayer if backend is not set up.

First create clean architecture.

Multiplayer modes planned

Future modes:

* Local pass-and-play
* Online private room
* Online matchmaking
* Ranked match
* Friend invite
* Spectator mode
* Replay sharing

Required architecture

Separate core game engine from transport.

The rules engine must be deterministic and server-verifiable.

Client should never be trusted for online games.

Create planning docs and optional interface stubs.

Suggested folders:

src/game/network/
src/game/multiplayer/

Suggested interfaces:

type MultiplayerTransport = {
  connect(roomId: string): Promise<void>;
  disconnect(): void;
  sendMove(move: SerializedMove): Promise<void>;
  onMove(callback: (move: SerializedMove) => void): void;
  onPlayerJoined(callback: ...): void;
  onPlayerLeft(callback: ...): void;
};

Backend options to evaluate

Document options:

* Supabase Realtime
* Firebase
* WebSocket server
* Socket.io
* PartyKit
* Cloudflare Durable Objects

Recommend the best fit based on current stack.

Multiplayer MVP plan

Phase 1:

* Private room
* Invite code
* Two players
* Reconnect support
* Server validates move
* Basic chat disabled or minimal emotes only

Phase 2:

* Accounts
* Match history
* Leaderboards
* Ranked games
* Spectator mode

Create or update:

docs/MULTIPLAYER_ARCHITECTURE.md

⸻

PHASE 8 — LEADERBOARDS, SCORES, AND PLAYER PROGRESSION

Goal

Prepare local and future online stats coherently.

Local stats

Track locally first:

* Games played
* Wins
* Losses
* Win rate
* Current streak
* Best streak
* Total turns played
* Average game length
* Captures made
* Captures suffered
* Rosettes landed
* Extra turns gained
* AI difficulty beaten
* Fastest win
* Fewest turns win

Match result model

Create a reusable match result schema:

type MatchResult = {
  gameId: string;
  completedAt: string;
  mode: "local" | "ai" | "tutorial" | "online";
  winner: PlayerId;
  loser: PlayerId;
  turns: number;
  durationMs: number;
  captures: Record<PlayerId, number>;
  rosettes: Record<PlayerId, number>;
  difficulty?: string;
};

Leaderboard architecture

Prepare but do not fake production.

Potential leaderboard categories:

* Global rating
* Weekly wins
* Monthly wins
* Fastest win
* Best streak
* Most captures
* Puzzle score later
* AI challenge score

Ranking system

Plan Elo first.

Later can upgrade to Glicko.

Create or update:

docs/LEADERBOARDS_AND_STATS.md

⸻

PHASE 9 — MENU, SETTINGS, AND PRODUCT STRUCTURE

Goal

Create a proper app shell.

Menu should include:

* Continue Game
* New Game
* Player vs Player
* Player vs AI
* Tutorial
* Strategy Guide
* Stats
* Settings
* About the Game
* Future Online Multiplayer
* Future Leaderboards

Settings

Add settings where useful:

* Board orientation:
    * Auto
    * Vertical
    * Horizontal
* AI difficulty
* Animation speed:
    * Reduced
    * Normal
    * Enhanced
* Sound:
    * On/Off
* Theme:
    * Dark
    * Light
    * Ancient
* Move hints:
    * On/Off
* Confirm new game:
    * On/Off
* Reduced motion support

Settings should persist.

Create or update:

docs/APP_STRUCTURE_AND_SETTINGS.md

⸻

PHASE 10 — AGENTIC PROMPT LOOP SYSTEM

Goal

Create a system that allows this project to be improved agentically over time.

Create a directory:

.agent/

Inside it, create:

.agent/MASTER_PROMPT.md
.agent/ROADMAP.md
.agent/TASK_BACKLOG.md
.agent/CHANGELOG.md
.agent/DECISIONS.md
.agent/KNOWN_ISSUES.md
.agent/TEST_PLAN.md
.agent/RELEASE_CHECKLIST.md
.agent/agents/
.agent/loops/

Subagents

Create subagent prompts in:

.agent/agents/

Required subagents:

.agent/agents/engineering-agent.md
.agent/agents/ui-ux-agent.md
.agent/agents/game-rules-agent.md
.agent/agents/ai-strategy-agent.md
.agent/agents/responsive-layout-agent.md
.agent/agents/persistence-agent.md
.agent/agents/testing-agent.md
.agent/agents/devops-agent.md
.agent/agents/docs-agent.md
.agent/agents/product-agent.md
.agent/agents/security-agent.md
.agent/agents/performance-agent.md

Each subagent file should include:

* Role
* Scope
* Responsibilities
* Files/directories owned
* What to inspect before acting
* What to avoid
* Acceptance criteria
* Output format

⸻

Prompt loops

Create prompt loops in:

.agent/loops/

Required loops:

.agent/loops/00-project-audit-loop.md
.agent/loops/01-responsive-fix-loop.md
.agent/loops/02-persistence-loop.md
.agent/loops/03-ui-polish-loop.md
.agent/loops/04-gameplay-loop.md
.agent/loops/05-ai-improvement-loop.md
.agent/loops/06-tutorial-loop.md
.agent/loops/07-stats-leaderboard-loop.md
.agent/loops/08-multiplayer-planning-loop.md
.agent/loops/09-testing-loop.md
.agent/loops/10-devops-release-loop.md
.agent/loops/11-documentation-loop.md
.agent/loops/12-regression-loop.md
.agent/loops/13-refactor-loop.md

Each loop should follow this structure:

# Loop Name
## Mission
## Inputs
## Files to inspect
## Steps
## Checks
## Tests to run
## Documentation to update
## Git commit format
## Done criteria

⸻

REQUIRED MASTER PROMPT FILE

Save the full current project mission into:

.agent/MASTER_PROMPT.md

This file must be treated as the living project brain.

Whenever a major direction changes, update it.

⸻

REQUIRED CHANGELOG

Create or update:

.agent/CHANGELOG.md

Use this format:

# Changelog
## [Unreleased]
### Added
- ...
### Changed
- ...
### Fixed
- ...
### Technical
- ...
### Documentation
- ...

Update changelog after every meaningful phase.

⸻

REQUIRED TASK BACKLOG

Create:

.agent/TASK_BACKLOG.md

Organize by:

* Critical
* High
* Medium
* Low
* Future

Initial critical tasks:

* Fix horizontal mode overflow
* Add responsive board scaling
* Add game persistence
* Add new game confirmation
* Improve player stats layout
* Add tutorial entry point
* Improve AI difficulty structure

⸻

REQUIRED DECISIONS LOG

Create:

.agent/DECISIONS.md

For major technical choices, record:

## Decision: Responsive board sizing with dynamic tile calculation
Date:
Status:
Context:
Decision:
Alternatives considered:
Consequences:

⸻

REQUIRED TEST PLAN

Create:

.agent/TEST_PLAN.md

Include:

* Manual viewport test matrix
* Gameplay regression tests
* Persistence tests
* AI tests
* UI tests
* Accessibility tests
* Performance checks

⸻

PHASE 11 — TESTING AND QUALITY

Required tests

If the project already has tests, expand them.

If it does not, add minimal tests without overcomplicating.

Prioritize:

* Rules engine tests
* Legal move tests
* Capture tests
* Rosette tests
* Win condition tests
* Persistence serialization tests
* Save migration tests
* AI legal move tests
* Responsive layout utility tests if applicable

Manual viewport matrix

Test at least:

390x844 portrait
430x932 portrait
844x390 landscape
932x430 landscape
1024x768 landscape
1366x768 desktop
1440x900 desktop
1920x1080 desktop

Use browser dev tools if available.

Build checks

Run:

npm install
npm run build
npm run lint
npm test

Adjust commands based on actual package manager.

If using pnpm:

pnpm install
pnpm build
pnpm lint
pnpm test

If using yarn:

yarn
yarn build
yarn lint
yarn test

Do not invent scripts. Inspect package.json.

⸻

PHASE 12 — DEVOPS AND GIT

Git requirements

Before making changes:

git status
git branch
git remote -v

Work on a feature branch if appropriate:

git checkout -b fix/responsive-persistence-ux

If branch already exists, use a suitable branch name.

Commit after meaningful milestones.

Suggested commits:

git add .
git commit -m "fix: make board responsive across orientations"
git commit -m "feat: persist local game state across refresh"
git commit -m "style: polish game layout and player panels"
git commit -m "docs: add agentic project prompts and changelog"

Push only if a remote is configured and authentication works:

git push origin HEAD

If push fails, document the reason and leave commits locally.

Never commit:

* .env
* secrets
* API keys
* node_modules
* build artifacts unless intentionally required
* local screenshots unless stored intentionally in docs

⸻

PHASE 13 — IMPLEMENTATION ORDER

Follow this exact order unless project discovery shows a better reason.

Step 1

Audit project.

Create:

docs/PROJECT_AUDIT.md

Step 2

Fix horizontal board sizing.

This is the top visual bug.

Step 3

Test all viewport sizes.

Update:

docs/RESPONSIVE_LAYOUT.md

Step 4

Add persistence.

Update:

docs/PERSISTENCE.md

Step 5

Improve New Game UX with confirmation.

Step 6

Refine player cards, dice area, stats, and layout cohesion.

Update:

docs/UI_UX_DESIGN_SYSTEM.md

Step 7

Add tutorial section and strategy guide.

Update:

docs/TUTORIAL_AND_STRATEGY.md

Step 8

Improve AI architecture and difficulty system.

Update:

docs/AI_ENGINE.md

Step 9

Add local stats model and prepare leaderboard architecture.

Update:

docs/LEADERBOARDS_AND_STATS.md

Step 10

Create .agent/ system.

Step 11

Run full checks.

Step 12

Commit and push.

⸻

DETAILED RESPONSIVE IMPLEMENTATION GUIDANCE

The current horizontal layout appears to render huge square tiles, causing the bottom of the board to overflow below the viewport.

Fix this by making tile size derived from the viewport.

Pseudo formula:

const viewportW = window.innerWidth;
const viewportH = window.innerHeight;
const reservedHeaderH = isLandscape ? 56 : 80;
const reservedControlsH = isLandscape ? 90 : 160;
const outerPadding = isMobile ? 12 : 24;
const availableW = viewportW - outerPadding * 2;
const availableH = viewportH - reservedHeaderH - reservedControlsH - outerPadding * 2;
const boardCols = orientation === "horizontal" ? 3 : 8; 
const boardRows = orientation === "horizontal" ? 8 : 3;
// Adjust this based on actual board grid representation.
const gapTotalW = gap * (boardCols - 1);
const gapTotalH = gap * (boardRows - 1);
const tileFromW = (availableW - gapTotalW) / boardCols;
const tileFromH = (availableH - gapTotalH) / boardRows;
const tileSize = clamp(minTile, Math.floor(Math.min(tileFromW, tileFromH)), maxTile);

But inspect the actual board layout first. Do not assume wrong board dimensions. The Royal Game of Ur has an irregular 20-square layout. The visual grid may be represented as 8x3 or 3x8 depending orientation.

The correct fix is:

* Calculate based on bounding grid.
* Hide missing cells.
* Keep actual valid tiles clickable.
* Make grid scale as one unit.
* Keep panels outside or compact.

Use CSS grid with responsive variables.

Example concept:

.board {
  --tile-size: clamp(38px, var(--computed-tile-size), 96px);
  display: grid;
  grid-template-columns: repeat(var(--board-cols), var(--tile-size));
  grid-template-rows: repeat(var(--board-rows), var(--tile-size));
  gap: var(--board-gap);
}

If CSS alone is enough, prefer CSS.

If JS calculation gives better control, use a hook.

⸻

DETAILED PERSISTENCE IMPLEMENTATION GUIDANCE

Do not persist React component state randomly.

Persist the canonical game state.

The game state should be serializable.

Avoid saving derived UI-only values unless needed.

Use a debounce if saving too frequently, but immediate save after moves is preferred.

Example:

useEffect(() => {
  if (!gameState) return;
  saveGame({
    version: CURRENT_SAVE_VERSION,
    savedAt: new Date().toISOString(),
    gameId,
    mode,
    ruleset,
    state: serializeGameState(gameState),
    history,
    stats,
    ai,
  });
}, [gameState, history, mode, ai]);

On load:

const saved = loadGame();
if (saved && validateSavedGame(saved)) {
  setGameState(deserializeGameState(saved.state));
} else {
  startNewGame();
}

Add migration support:

function migrateSavedGame(save: unknown): SavedGame | null {
  // migrate old versions to current version
}

⸻

GAME RULES SAFETY

Before editing gameplay logic, document the current rules.

Ensure:

* Legal moves remain valid.
* Capture rules remain correct.
* Rosette extra turn rules remain correct.
* Home/finish rules remain correct.
* AI cannot make illegal moves.
* Undo does not corrupt state.
* Persistence restore does not corrupt state.

⸻

UI COPY IMPROVEMENTS

Use elegant copy.

Examples:

Light to play
Dark is thinking
Roll the dice
No legal moves — turn passes
Rosette! Take another turn
Captured!
Piece reached home
Game restored
Start a new game?

Avoid awkward labels.

Current labels like “HOME” are okay but should be visually balanced.

⸻

ACCESSIBILITY REQUIREMENTS

Add:

* Button aria-labels
* Keyboard focus states
* Reduced motion support
* Clear contrast
* Tap targets at least 44px on mobile
* Avoid relying on color alone
* Text readable on dark background

Respect:

@media (prefers-reduced-motion: reduce)

⸻

PERFORMANCE REQUIREMENTS

Do not introduce heavy unnecessary libraries.

Avoid rerendering whole board unnecessarily.

Memoize tile components if needed.

AI should not block UI.

If AI search becomes expensive, add async delay or web worker later.

⸻

FUTURE MULTIPLAYER WARNING

Do not implement insecure online multiplayer by trusting local client moves.

For online mode, the backend or authoritative room host must validate:

* Dice result
* Move legality
* Turn order
* Game result

For now, prepare architecture and docs. Implement only if the current project has a suitable backend already configured.

⸻

FINAL DELIVERABLES

At the end of this work, the project should have:

Functional fixes

* Horizontal mode fits viewport.
* Mobile landscape works.
* Mobile portrait works.
* Desktop works.
* Game persists after refresh.
* New game confirmation exists.

UX improvements

* Better player panels.
* Better dice area.
* Better stats.
* Better layout.
* Better visual cohesion.
* Better active turn indication.
* Better move feedback.

Gameplay improvements

* Tutorial section.
* Tutorial mode foundation.
* Strategy guide.
* Improved AI difficulty architecture.
* Better game over summary.
* Better local stats.

Architecture improvements

* Responsive layout system.
* Persistence system.
* AI system improvements.
* Stats model.
* Multiplayer planning interfaces.
* Leaderboard planning.

Documentation

Create/update:

docs/PROJECT_AUDIT.md
docs/RESPONSIVE_LAYOUT.md
docs/PERSISTENCE.md
docs/UI_UX_DESIGN_SYSTEM.md
docs/GAMEPLAY_EXPERIENCE.md
docs/TUTORIAL_AND_STRATEGY.md
docs/AI_ENGINE.md
docs/MULTIPLAYER_ARCHITECTURE.md
docs/LEADERBOARDS_AND_STATS.md
docs/APP_STRUCTURE_AND_SETTINGS.md

Create/update:

.agent/MASTER_PROMPT.md
.agent/ROADMAP.md
.agent/TASK_BACKLOG.md
.agent/CHANGELOG.md
.agent/DECISIONS.md
.agent/KNOWN_ISSUES.md
.agent/TEST_PLAN.md
.agent/RELEASE_CHECKLIST.md
.agent/agents/*.md
.agent/loops/*.md

Git

* Commit meaningful changes.
* Push if possible.
* If push is not possible, explain why.

⸻

FINAL REPORT FORMAT

When finished, provide a final report with:

# Royal Game of Ur Update Report
## Summary
## Fixed
## Added
## Improved
## Files Changed
## Tests Run
## Viewports Tested
## Known Issues Remaining
## Git Commit Hashes
## Push Status
## Recommended Next Phase

⸻

BEGIN NOW

Start with project audit.

Then fix horizontal layout.

Then implement persistence.

Then continue through the phases.

Work carefully and keep improving until the app feels polished, responsive, persistent, and ready for future online play.


