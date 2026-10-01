"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { replayStateAt, type Replay } from "@ur/engine";
import { describeEvent } from "@/lib/describeEvent";
import { analyzeGameAsync, type GameAnalysis, type MoveClassification, type MoveGrade } from "@/lib/analysis";
import { Board } from "./Board";
import { PlayerPanel } from "./PlayerPanel";
import { ShareButton } from "./ShareButton";

const AUTOPLAY_MS = 900;

const GRADE_LABEL: Record<MoveClassification, string> = {
  best: "Best move",
  good: "Good",
  inaccuracy: "Inaccuracy",
  mistake: "Mistake",
  blunder: "Blunder",
};

const GRADE_GLYPH: Record<MoveClassification, string> = {
  best: "★",
  good: "✓",
  inaccuracy: "?!",
  mistake: "?",
  blunder: "??",
};

function downloadReplay(replay: Replay): void {
  const blob = new Blob([JSON.stringify(replay, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `royal-game-of-ur-replay-${new Date(String(replay.meta.createdAt ?? Date.now())).getTime()}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Read-only playback of a game's event log — scrub, autoplay, export, and
 * hint-engine analysis (accuracy, key moments) on demand. */
export function ReplayViewer({
  replay,
  onClose,
  autoAnalyze = false,
  startAt,
}: {
  replay: Replay;
  onClose(): void;
  autoAnalyze?: boolean;
  /** Land on this many events instead of the final position (e.g. a highlight). */
  startAt?: number;
}) {
  const [index, setIndex] = useState(Math.min(startAt ?? replay.events.length, replay.events.length));
  const [playing, setPlaying] = useState(false);
  const [analysis, setAnalysis] = useState<GameAnalysis | null>(null);
  const [progress, setProgress] = useState<[number, number] | null>(null);
  const [momentsOpen, setMomentsOpen] = useState(false);
  const analysisStarted = useRef(false);
  const total = replay.events.length;

  const state = useMemo(() => replayStateAt(replay, index), [replay, index]);
  const currentEvent = index > 0 ? replay.events[index - 1] : null;

  // Grade attached to the event we just stepped past, if it was a decision.
  const gradeByEvent = useMemo(() => {
    const map = new Map<number, MoveGrade>();
    for (const grade of analysis?.grades ?? []) map.set(grade.eventIndex, grade);
    return map;
  }, [analysis]);
  const currentGrade = index > 0 ? gradeByEvent.get(index - 1) : undefined;

  const startAnalysis = () => {
    if (analysisStarted.current) return;
    analysisStarted.current = true;
    setProgress([0, 1]);
    void analyzeGameAsync(replay, {
      depth: 2,
      onProgress: (done, all) => setProgress([done, all]),
    }).then((result) => {
      setAnalysis(result);
      setProgress(null);
      setMomentsOpen(result.keyMoments.length > 0);
    });
  };

  useEffect(() => {
    if (autoAnalyze) startAnalysis();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoAnalyze]);

  useEffect(() => {
    if (!playing) return;
    if (index >= total) {
      setPlaying(false);
      return;
    }
    const timer = setTimeout(() => setIndex((i) => Math.min(i + 1, total)), AUTOPLAY_MS);
    return () => clearTimeout(timer);
  }, [playing, index, total]);

  return (
    // Deliberately unanimated: a full-screen opaque view that fades can get
    // stuck mid-fade if the tab is backgrounded while mounting.
    <div
      className="fixed inset-0 z-50 flex flex-col bg-[var(--bg)]"
      role="dialog"
      aria-modal="true"
      aria-label="Replay viewer"
    >
      <header className="game-header flex items-center justify-between px-4 py-3">
        <button className="btn rounded-lg px-3 py-1.5 text-sm" onClick={onClose}>
          ‹ Close
        </button>
        <h1 className="font-display text-lg text-[var(--gold)]">Replay</h1>
        <div className="flex gap-2">
          {analysis === null ? (
            <button
              className="btn rounded-lg px-3 py-1.5 text-sm"
              disabled={progress !== null}
              onClick={startAnalysis}
            >
              {progress ? `Analyzing ${progress[0]}/${progress[1]}…` : "Analyze"}
            </button>
          ) : (
            <button className="btn rounded-lg px-3 py-1.5 text-sm" onClick={() => setMomentsOpen((v) => !v)}>
              {momentsOpen ? "Hide moments" : "Key moments"}
            </button>
          )}
          <ShareButton replay={replay} />
          <button className="btn rounded-lg px-3 py-1.5 text-sm" onClick={() => downloadReplay(replay)}>
            Export
          </button>
        </div>
      </header>

      {analysis ? (
        <div className="mx-4 mb-1 flex flex-wrap items-center justify-center gap-x-6 gap-y-1 rounded-xl bg-[var(--bg-raised)] px-4 py-2 text-sm">
          {([0, 1] as const).map((player) => (
            <span key={player} className="flex items-center gap-2">
              <span className="text-[var(--ink-dim)]">{player === 0 ? "☀ Light" : "☾ Dark"}</span>
              <span className="font-display text-lg text-[var(--gold)]">
                {analysis.accuracy[player] === null ? "—" : `${analysis.accuracy[player]}%`}
              </span>
              <span className="text-xs text-[var(--ink-dim)]">
                {analysis.counts[player].mistake} ? · {analysis.counts[player].blunder} ??
              </span>
            </span>
          ))}
        </div>
      ) : null}

      <div className="game-grid min-h-0 flex-1 px-3 pb-2" data-layout="vertical">
        <div className="ga-dark">
          <PlayerPanel
            state={state}
            player={1}
            controller="human"
            active={state.winner === null && state.current === 1}
            entryMove={null}
            canAct={false}
            onMove={() => undefined}
          />
        </div>
        <div className="ga-board relative">
          <Board state={state} legal={[]} canAct={false} onMove={() => undefined} orientation="vertical" />
          {momentsOpen && analysis ? (
            <div className="absolute inset-y-0 right-0 flex w-64 max-w-[70%] flex-col rounded-xl border border-[var(--frame-edge)] bg-[var(--bg-raised)]/95">
              <div className="border-b border-[var(--frame-edge)] px-3 py-2 text-sm text-[var(--gold)]">
                Key moments
              </div>
              <ol className="flex-1 overflow-y-auto px-3 py-2 text-xs">
                {analysis.keyMoments.length === 0 ? (
                  <li className="text-[var(--ink-dim)]">No mistakes or blunders — clean game.</li>
                ) : (
                  analysis.keyMoments.map((moment) => (
                    <li key={moment.eventIndex}>
                      <button
                        className="w-full rounded px-1 py-1.5 text-left hover:bg-black/20"
                        onClick={() => {
                          setPlaying(false);
                          setIndex(moment.eventIndex + 1);
                        }}
                      >
                        <span className={moment.classification === "blunder" ? "text-[var(--danger)]" : "text-[var(--gold)]"}>
                          {GRADE_GLYPH[moment.classification]}
                        </span>{" "}
                        <span className="text-[var(--ink)]">
                          T{moment.turn} {moment.player === 0 ? "Light" : "Dark"}
                        </span>{" "}
                        <span className="text-[var(--ink-dim)]">
                          {moment.played.from}→{moment.played.to} (best {moment.best.from}→{moment.best.to})
                        </span>
                      </button>
                    </li>
                  ))
                )}
              </ol>
            </div>
          ) : null}
        </div>
        <div className="ga-light">
          <PlayerPanel
            state={state}
            player={0}
            controller="human"
            active={state.winner === null && state.current === 0}
            entryMove={null}
            canAct={false}
            onMove={() => undefined}
          />
        </div>
        <div className="ga-dice">
          <div className="dice-tray flex flex-col gap-2 rounded-xl bg-[var(--bg-raised)] px-4 py-3">
            <p className="min-h-[1.5em] text-sm text-[var(--ink-dim)]" role="status">
              {currentEvent
                ? `${index}/${total} — ${describeEvent(currentEvent)}`
                : `0/${total} — start of game`}
              {currentGrade ? (
                <span
                  className={
                    currentGrade.classification === "mistake" || currentGrade.classification === "blunder"
                      ? "ml-2 text-[var(--danger)]"
                      : "ml-2 text-[var(--gold)]"
                  }
                >
                  {GRADE_GLYPH[currentGrade.classification]} {GRADE_LABEL[currentGrade.classification]}
                  {currentGrade.classification !== "best"
                    ? ` — best was ${currentGrade.best.from === 0 ? "entering" : currentGrade.best.from}→${currentGrade.best.to}`
                    : ""}
                </span>
              ) : null}
            </p>
            <div className="flex items-center gap-3">
              <button
                className="btn rounded-lg px-3 py-1.5 text-sm"
                disabled={index === 0}
                onClick={() => {
                  setPlaying(false);
                  setIndex((i) => Math.max(0, i - 1));
                }}
                aria-label="Previous event"
              >
                ‹
              </button>
              <input
                type="range"
                min={0}
                max={total}
                value={index}
                onChange={(e) => {
                  setPlaying(false);
                  setIndex(Number(e.target.value));
                }}
                className="flex-1 accent-[var(--gold)]"
                aria-label={`Event ${index} of ${total}`}
              />
              <button
                className="btn rounded-lg px-3 py-1.5 text-sm"
                disabled={index >= total}
                onClick={() => {
                  setPlaying(false);
                  setIndex((i) => Math.min(total, i + 1));
                }}
                aria-label="Next event"
              >
                ›
              </button>
              <button
                className="btn btn-primary rounded-lg px-4 py-1.5 text-sm"
                onClick={() => {
                  if (index >= total) setIndex(0);
                  setPlaying((p) => !p || index >= total);
                }}
              >
                {playing ? "Pause" : index >= total ? "Replay" : "Play"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
