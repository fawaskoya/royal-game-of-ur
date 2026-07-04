"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, LayoutGroup, MotionConfig, motion } from "framer-motion";
import type { GameEvent } from "@ur/engine";
import { hintFor, type HintTag, type MoveAnalysis } from "@ur/ai";
import { controllerOf, useGame, type GameMode } from "@/lib/useGame";
import { useGameLayout } from "@/lib/useGameLayout";
import { useSettings } from "@/lib/settings";
import type { SavedGame } from "@/lib/persistence/saveSchema";
import { Board } from "./Board";
import { PlayerPanel } from "./PlayerPanel";
import { DiceTray } from "./DiceTray";
import { Modal } from "./ui/Modal";

function describe(event: GameEvent): string {
  const who = event.player === 0 ? "Light" : "Dark";
  switch (event.type) {
    case "roll":
      return `${who} rolled ${event.total}.`;
    case "pass":
      return `${who} ${event.reason === "rolled-zero" ? "rolled a zero" : "had no legal moves"}; turn passes.`;
    case "move":
      return [
        `${who} ${event.from === 0 ? "entered a piece" : `moved from square ${event.from}`} ${
          event.finished ? "home" : `to square ${event.to}`
        }.`,
        event.capture ? "Captured an opponent piece." : "",
        event.extraTurn ? "Rosette: rolls again." : "",
      ]
        .filter(Boolean)
        .join(" ");
  }
}

const HINT_COPY: Record<HintTag, string> = {
  capture: "captures an opponent piece",
  rosette: "lands on a rosette — roll again",
  finish: "bears the piece off",
  enter: "brings a new piece into the race",
  "to-safety": "reaches the safe central rosette",
  "escapes-danger": "steps out of capture range",
  risky: "worth the risk",
};

function hintText(hint: MoveAnalysis): string {
  const phrases = hint.tags
    .filter((t) => t !== "risky")
    .slice(0, 2)
    .map((t) => HINT_COPY[t]);
  return phrases.length > 0 ? `Hint: ${phrases.join(", ")}` : "Hint: best move by search";
}

interface HistoryTurn {
  n: number;
  player: 0 | 1;
  total: number;
  note: string;
}

function buildHistory(events: readonly GameEvent[]): HistoryTurn[] {
  const turns: HistoryTurn[] = [];
  for (const event of events) {
    if (event.type === "roll") {
      turns.push({ n: turns.length + 1, player: event.player, total: event.total, note: "" });
      continue;
    }
    const turn = turns[turns.length - 1];
    if (!turn) continue;
    if (event.type === "pass") {
      turn.note = event.reason === "rolled-zero" ? "passes (zero)" : "passes (no moves)";
    } else {
      const parts = [
        event.from === 0 ? `enters → ${event.to}` : event.finished ? `${event.from} → home` : `${event.from} → ${event.to}`,
      ];
      if (event.capture) parts.push("⚔ capture");
      if (event.extraTurn && !event.finished) parts.push("✿ again");
      turn.note = parts.join(" · ");
    }
  }
  return turns;
}

function formatDuration(fromIso: string): string {
  const ms = Date.now() - new Date(fromIso).getTime();
  if (!Number.isFinite(ms) || ms <= 0) return "—";
  const minutes = Math.floor(ms / 60_000);
  const seconds = Math.floor((ms % 60_000) / 1000);
  return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
}

export function GameView({
  mode,
  resume,
  onExit,
}: {
  mode: GameMode;
  resume?: SavedGame;
  onExit(): void;
}) {
  const game = useGame(mode, resume);
  const { state, legal, tail } = game;
  const { layout, isTouch, toggle: toggleLayout } = useGameLayout();
  const { settings } = useSettings();
  const [confirmNew, setConfirmNew] = useState(false);
  const [showRestored, setShowRestored] = useState(game.restored);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [hint, setHint] = useState<MoveAnalysis | null>(null);
  const hintsEnabled = settings.hints && mode.kind !== "watch";

  useEffect(() => {
    if (!showRestored) return;
    const timer = setTimeout(() => setShowRestored(false), 2600);
    return () => clearTimeout(timer);
  }, [showRestored]);

  // A hint describes one exact position — any state change invalidates it.
  useEffect(() => setHint(null), [state]);

  const requestNewGame = useCallback(() => {
    if (settings.confirmNew && state.history.length > 0 && state.winner === null) setConfirmNew(true);
    else game.newGame();
  }, [settings.confirmNew, state.history.length, state.winner, game]);

  const requestHint = useCallback(() => {
    if (!hintsEnabled || !game.humanCanMove) return;
    setHint(hintFor(state, { depth: 2 }));
  }, [hintsEnabled, game.humanCanMove, state]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const key = e.key.toLowerCase();
      if (key === "r") game.roll();
      else if (key === "h") requestHint();
      else if (key === "u" && game.canUndo) game.undo();
      else if (key === "n") requestNewGame();
      else if (key === "escape") setHistoryOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [game, requestHint, requestNewGame]);

  const entryMoves = useMemo(
    () => ({
      0: legal.find((m) => m.player === 0 && m.from === 0) ?? null,
      1: legal.find((m) => m.player === 1 && m.from === 0) ?? null,
    }),
    [legal],
  );

  const passToast = tail.find((e) => e.type === "pass");
  const history = useMemo(() => buildHistory(state.history), [state.history]);
  const winStats = useMemo(() => {
    if (state.winner === null) return null;
    const count = (player: 0 | 1, flag: "capture" | "extraTurn") =>
      state.history.filter((e) => e.type === "move" && e.player === player && e[flag]).length;
    return {
      turns: state.rollCount,
      captures: [count(0, "capture"), count(1, "capture")] as const,
      rosettes: [count(0, "extraTurn"), count(1, "extraTurn")] as const,
      duration: formatDuration(game.startedAt),
    };
  }, [state.winner, state.history, state.rollCount, game.startedAt]);

  return (
    <MotionConfig reducedMotion={settings.motion === "reduced" ? "always" : "user"}>
      <div
        className={[
          "game-screen mx-auto flex w-full max-w-3xl flex-col gap-3 px-3 py-4 sm:gap-4 sm:py-6",
          layout === "horizontal" ? "lg:max-w-6xl" : "",
        ].join(" ")}
      >
        <header className="game-header flex items-center justify-between">
          <button className="btn rounded-lg px-3 py-1.5 text-sm" onClick={onExit}>
            ‹ Menu
          </button>
          <h1 className="font-display text-lg tracking-wide text-[var(--gold)] sm:text-xl">Royal Game of Ur</h1>
          <div className="flex gap-2">
            <button
              className="btn rounded-lg px-3 py-1.5 text-sm"
              onClick={() => setHistoryOpen(true)}
              aria-label="Move history"
              title="Move history"
            >
              <span aria-hidden>≡</span>
              <span className="layout-toggle-label"> History</span>
            </button>
            {isTouch ? null : (
              <button
                className="btn rounded-lg px-3 py-1.5 text-sm"
                onClick={toggleLayout}
                aria-label={`Switch to ${layout === "vertical" ? "horizontal" : "vertical"} layout`}
                title={`Switch to ${layout === "vertical" ? "horizontal" : "vertical"} layout`}
              >
                <span aria-hidden>{layout === "vertical" ? "⇄" : "⇅"}</span>
                <span className="layout-toggle-label">{layout === "vertical" ? " Horizontal" : " Vertical"}</span>
              </button>
            )}
            <button className="btn rounded-lg px-3 py-1.5 text-sm" disabled={!game.canUndo} onClick={game.undo}>
              Undo
            </button>
            <button className="btn rounded-lg px-3 py-1.5 text-sm" onClick={requestNewGame}>
              New
            </button>
          </div>
        </header>

        <LayoutGroup>
          <div className="game-grid min-h-0 flex-1" data-layout={layout}>
            <div className="ga-dark">
              <PlayerPanel
                state={state}
                player={1}
                controller={controllerOf(mode, 1)}
                active={state.winner === null && state.current === 1}
                entryMove={state.current === 1 ? entryMoves[1] : null}
                canAct={game.humanCanMove && state.current === 1}
                onMove={game.movePiece}
              />
            </div>

            <div className="ga-board relative">
              <Board
                state={state}
                legal={legal}
                canAct={game.humanCanMove}
                onMove={game.movePiece}
                orientation={layout}
                hintMove={hint?.move ?? null}
              />
              <AnimatePresence>
                {showRestored ? (
                  <motion.div
                    key="restored"
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="pointer-events-none absolute inset-x-0 top-2 flex justify-center"
                  >
                    <div className="rounded-full border border-[var(--frame-edge)] bg-[var(--bg-raised)]/95 px-4 py-1.5 text-xs text-[var(--gold)]">
                      Game restored
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>
              <AnimatePresence>
                {passToast ? (
                  <motion.div
                    key={state.history.length}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="pointer-events-none absolute inset-x-0 top-1/2 flex -translate-y-1/2 justify-center"
                  >
                    <div className="rounded-full border border-[var(--frame-edge)] bg-[var(--bg-raised)]/95 px-4 py-2 text-sm">
                      {passToast.reason === "rolled-zero" ? "Zero — turn passes" : "No legal moves — turn passes"}
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>

            <div className="ga-light">
              <PlayerPanel
                state={state}
                player={0}
                controller={controllerOf(mode, 0)}
                active={state.winner === null && state.current === 0}
                entryMove={state.current === 0 ? entryMoves[0] : null}
                canAct={game.humanCanMove && state.current === 0}
                onMove={game.movePiece}
              />
            </div>

            <div className="ga-dice">
              <DiceTray
                state={state}
                tail={tail}
                aiTurn={game.aiTurn}
                humanCanRoll={game.humanCanRoll}
                humanCanMove={game.humanCanMove}
                hintText={hint ? hintText(hint) : null}
                onHint={hintsEnabled ? requestHint : undefined}
                onRoll={game.roll}
              />
            </div>
          </div>
        </LayoutGroup>

        {/* Screen-reader narration of every action. */}
        <div aria-live="polite" className="sr-only">
          {tail.map(describe).join(" ")}
        </div>

        {/* Move history drawer */}
        <AnimatePresence>
          {historyOpen ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/50"
              onClick={() => setHistoryOpen(false)}
            >
              <motion.aside
                role="dialog"
                aria-label="Move history"
                initial={{ x: 40, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 40, opacity: 0 }}
                transition={{ type: "spring", stiffness: 380, damping: 34 }}
                className="absolute inset-y-0 right-0 flex w-72 max-w-[85vw] flex-col border-l border-[var(--frame-edge)] bg-[var(--bg-raised)]"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between border-b border-[var(--frame-edge)] px-4 py-3">
                  <span className="font-display text-[var(--gold)]">Move history</span>
                  <button className="btn rounded-lg px-2.5 py-1 text-xs" onClick={() => setHistoryOpen(false)}>
                    Close
                  </button>
                </div>
                <ol className="flex-1 overflow-y-auto px-4 py-3 text-sm" aria-label={`${history.length} turns`}>
                  {history.length === 0 ? (
                    <li className="text-[var(--ink-dim)]">No rolls yet.</li>
                  ) : (
                    [...history].reverse().map((turn) => (
                      <li key={turn.n} className="flex gap-2 border-b border-white/5 py-1.5">
                        <span className="w-8 shrink-0 text-right text-[var(--ink-dim)]">{turn.n}.</span>
                        <span className={turn.player === 0 ? "text-[var(--ink)]" : "text-[var(--gold)]"}>
                          {turn.player === 0 ? "Light" : "Dark"}
                        </span>
                        <span className="text-[var(--ink-dim)]">
                          rolled {turn.total}
                          {turn.note ? ` — ${turn.note}` : ""}
                        </span>
                      </li>
                    ))
                  )}
                </ol>
              </motion.aside>
            </motion.div>
          ) : null}
        </AnimatePresence>

        <AnimatePresence>
          {state.winner !== null && winStats ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
            >
              <motion.div
                initial={{ scale: 0.92, y: 10 }}
                animate={{ scale: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 26 }}
                className="board-frame w-full max-w-sm rounded-2xl p-7 text-center"
              >
                <div className="font-display text-3xl text-[var(--gold)]">
                  {state.winner === 0 ? "Light" : "Dark"} wins
                </div>
                <div className="mt-1.5 text-sm text-[var(--ink-dim)]">
                  {controllerOf(mode, state.winner) === "human" ? "A worthy victory." : "The machine prevails — this time."}
                </div>

                <div className="mx-auto mt-5 grid max-w-[260px] grid-cols-2 gap-x-6 gap-y-2 text-left text-sm">
                  <span className="text-[var(--ink-dim)]">Turns</span>
                  <span className="text-right">{winStats.turns}</span>
                  <span className="text-[var(--ink-dim)]">Duration</span>
                  <span className="text-right">{winStats.duration}</span>
                  <span className="text-[var(--ink-dim)]">Captures</span>
                  <span className="text-right">
                    ☀ {winStats.captures[0]} · ☾ {winStats.captures[1]}
                  </span>
                  <span className="text-[var(--ink-dim)]">Rosettes</span>
                  <span className="text-right">
                    ☀ {winStats.rosettes[0]} · ☾ {winStats.rosettes[1]}
                  </span>
                </div>

                <div className="mt-6 flex justify-center gap-3">
                  <button className="btn btn-primary rounded-lg px-5 py-2 text-sm" onClick={game.newGame}>
                    Play again
                  </button>
                  <button className="btn rounded-lg px-5 py-2 text-sm" onClick={() => setHistoryOpen(true)}>
                    History
                  </button>
                  <button className="btn rounded-lg px-5 py-2 text-sm" onClick={onExit}>
                    Menu
                  </button>
                </div>
              </motion.div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        <Modal
          open={confirmNew}
          title="Start a new game?"
          onClose={() => setConfirmNew(false)}
          actions={
            <>
              <button className="btn rounded-lg px-4 py-2 text-sm" onClick={() => setConfirmNew(false)}>
                Cancel
              </button>
              <button
                className="btn btn-primary rounded-lg px-4 py-2 text-sm"
                onClick={() => {
                  setConfirmNew(false);
                  game.newGame();
                }}
              >
                Start new game
              </button>
            </>
          }
        >
          Your current game will be replaced. This can&apos;t be undone.
        </Modal>
      </div>
    </MotionConfig>
  );
}
