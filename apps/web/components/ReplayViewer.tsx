"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { replayStateAt, type Replay } from "@ur/engine";
import { describeEvent } from "@/lib/describeEvent";
import { Board } from "./Board";
import { PlayerPanel } from "./PlayerPanel";

const AUTOPLAY_MS = 900;

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

/** Read-only playback of a finished (or in-progress) game's event log — scrub, autoplay, export. */
export function ReplayViewer({ replay, onClose }: { replay: Replay; onClose(): void }) {
  const [index, setIndex] = useState(replay.events.length);
  const [playing, setPlaying] = useState(false);
  const total = replay.events.length;

  const state = useMemo(() => replayStateAt(replay, index), [replay, index]);
  const currentEvent = index > 0 ? replay.events[index - 1] : null;

  useEffect(() => {
    if (!playing) return;
    if (index >= total) {
      setPlaying(false);
      return;
    }
    const timer = setTimeout(() => setIndex((i) => Math.min(i + 1, total)), AUTOPLAY_MS);
    return () => clearTimeout(timer);
  }, [playing, index, total]);

  const scrubberRef = useRef<HTMLInputElement>(null);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
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
        <button className="btn rounded-lg px-3 py-1.5 text-sm" onClick={() => downloadReplay(replay)}>
          Export
        </button>
      </header>

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
        <div className="ga-board">
          <Board state={state} legal={[]} canAct={false} onMove={() => undefined} orientation="vertical" />
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
                ref={scrubberRef}
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
    </motion.div>
  );
}
