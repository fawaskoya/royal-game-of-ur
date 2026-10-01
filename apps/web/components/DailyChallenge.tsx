"use client";

import { useEffect, useMemo, useState } from "react";
import { applyMove, legalMoves, type Move } from "@ur/engine";
import { TIP } from "@/lib/coach";
import {
  bestDailyStreak,
  buildDailyPuzzle,
  dailyStreak,
  dateKeyUTC,
  loadDaily,
  rankOf,
  recordDaily,
  type DailyPuzzle,
  type DailyRecord,
} from "@/lib/daily";
import { useGameLayout } from "@/lib/useGameLayout";
import { Board } from "./Board";
import { PlayerPanel } from "./PlayerPanel";

const STARS = (rank: number) => "★".repeat(Math.max(1, Math.min(3, 4 - rank))).padEnd(3, "☆");

function verdict(rank: number, of: number): string {
  if (rank === 1) return "The best move — well seen.";
  if (rank === 2 && of > 2) return "A good move; one was slightly stronger.";
  return "Not the strongest — the ringed move was better.";
}

/**
 * One puzzle per UTC day, the same for every player: a real mid-game position
 * with a roll already thrown. Pick a move; the hint engine's ranking is the
 * answer key. The first answer of the day is the one that counts.
 */
export function DailyChallenge({ onClose }: { onClose(): void }) {
  const todayKey = useMemo(() => dateKeyUTC(), []);
  const [puzzle, setPuzzle] = useState<DailyPuzzle | null>(null);
  const [record, setRecord] = useState<DailyRecord>({});
  const [chosen, setChosen] = useState<Move | null>(null);
  const [copied, setCopied] = useState(false);
  const { layout, isTouch } = useGameLayout();

  // Build after first paint so the screen appears instantly.
  useEffect(() => {
    setRecord(loadDaily());
    const t = setTimeout(() => setPuzzle(buildDailyPuzzle(todayKey)), 20);
    return () => clearTimeout(t);
  }, [todayKey]);

  const previous = record[todayKey] ?? null;
  const answered = chosen !== null || previous !== null;
  const rank = chosen && puzzle ? rankOf(puzzle, chosen) : previous?.rank ?? null;
  const total = puzzle?.ranking.length ?? previous?.of ?? 0;
  const best = puzzle?.ranking[0] ?? null;

  const choose = (move: Move) => {
    if (!puzzle || answered) return;
    setChosen(move);
    recordDaily(todayKey, { rank: rankOf(puzzle, move), of: puzzle.ranking.length });
    setRecord(loadDaily());
  };

  const shown = useMemo(() => {
    if (!puzzle) return null;
    return chosen ? applyMove(puzzle.state, chosen) : puzzle.state;
  }, [puzzle, chosen]);
  const legal = useMemo(() => (puzzle && !answered ? legalMoves(puzzle.state) : []), [puzzle, answered]);

  const streak = dailyStreak(record, todayKey);
  const bestStreak = bestDailyStreak(record);
  const side = puzzle ? (puzzle.state.current === 0 ? "Light" : "Dark") : "";

  const shareText =
    rank !== null
      ? `Royal Game of Ur — Daily ${todayKey}\n${STARS(rank)} (move ${rank} of ${total})${streak > 1 ? ` · ${streak}-day streak` : ""}\n${window.location.origin}`
      : "";

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable — result stays on screen */
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[var(--bg)]" role="dialog" aria-modal="true" aria-label="Daily challenge">
     <div className="game-screen mx-auto w-full max-w-3xl gap-2 px-2 py-2 sm:gap-3 sm:px-3 sm:py-4 lg:max-w-6xl lg:gap-4 lg:py-6">
      <header className="game-header flex shrink-0 items-center justify-between">
        <button className="btn rounded-lg px-3 py-1.5 text-sm" onClick={onClose}>
          ‹ Close
        </button>
        <div className="text-center">
          <h1 className="font-display text-lg text-[var(--gold)]">Daily challenge</h1>
          <div className="text-[11px] text-[var(--ink-dim)]">{todayKey}</div>
        </div>
        <span className="chip">
          {streak > 0 ? `🔥 ${streak}` : "No streak"}
        </span>
      </header>

      {!puzzle || !shown ? (
        <p className="m-auto text-sm text-[var(--ink-dim)]">Setting the board…</p>
      ) : (
        <div className="game-grid min-h-0 flex-1" data-layout={layout}>
          <div className="ga-dark">
            <PlayerPanel
              state={shown}
              player={1}
              controller="human"
              active={!answered && puzzle.state.current === 1}
              entryMove={null}
              canAct={false}
              onMove={() => undefined}
              variant={layout === "vertical" && isTouch ? "rail" : "default"}
            />
          </div>
          <div className="ga-board relative">
            <Board
              state={shown}
              legal={legal}
              canAct={!answered}
              onMove={choose}
              orientation={layout}
              hintMove={answered && best ? best.move : null}
              routeFor={puzzle.state.current}
            />
          </div>
          <div className="ga-light">
            <PlayerPanel
              state={shown}
              player={0}
              controller="human"
              active={!answered && puzzle.state.current === 0}
              entryMove={null}
              canAct={false}
              onMove={() => undefined}
              variant={layout === "vertical" && isTouch ? "rail" : "default"}
            />
          </div>
          <div className="ga-dice">
            <div className="dice-tray flex flex-col gap-2 rounded-xl bg-[var(--bg-raised)] px-4 py-3 text-sm">
              {!answered ? (
                <>
                  <p className="text-[var(--ink)]" role="status">
                    <strong className="text-[var(--gold)]">{side}</strong> has rolled a{" "}
                    <strong>{puzzle.state.dice?.total}</strong>. Tap the move you think is best.
                  </p>
                  <p className="text-xs text-[var(--ink-dim)]">
                    One answer per day. Same position for every player, everywhere.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-[var(--ink)]" role="status">
                    <span className="mr-2 font-display text-lg text-[var(--gold)]">{rank !== null ? STARS(rank) : ""}</span>
                    {rank !== null ? verdict(rank, total) : ""}
                  </p>
                  {best ? (
                    <p className="text-xs text-[var(--ink-dim)]">
                      Best move: {best.move.from === 0 ? "enter a piece" : `square ${best.move.from}`} →{" "}
                      {best.move.to > 14 ? "home" : `square ${best.move.to}`}
                      {best.tags.find((t) => t !== "risky") ? ` — ${TIP[best.tags.find((t) => t !== "risky")!]}` : ""}.
                    </p>
                  ) : null}
                  <p className="text-xs text-[var(--ink-dim)]">
                    Streak {streak} · best {bestStreak} · a new puzzle arrives at 00:00 UTC.
                  </p>
                  <div className="flex gap-2">
                    <button className="btn btn-primary rounded-lg px-4 py-1.5 text-sm" onClick={() => void copy()}>
                      {copied ? "Copied ✓" : "Share result"}
                    </button>
                    <button className="btn rounded-lg px-4 py-1.5 text-sm" onClick={onClose}>
                      Done
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
     </div>
    </div>
  );
}
