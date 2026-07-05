"use client";

import { useEffect, useRef, useState } from "react";
import { DIFFICULTIES, type DifficultyId } from "@ur/ai";
import { importReplay, UrEngineError, type PlayerId, type Replay } from "@ur/engine";
import { GameView } from "./GameView";
import type { GameMode } from "@/lib/useGame";
import { clearGame, loadGame } from "@/lib/persistence/gameStorage";
import type { SavedGame } from "@/lib/persistence/saveSchema";
import { Modal } from "./ui/Modal";
import { HowToPlay } from "./HowToPlay";
import { TutorialView } from "./TutorialView";
import { SettingsPanel } from "./SettingsPanel";
import { StatsPanel } from "./StatsPanel";
import { ReplayViewer } from "./ReplayViewer";

type MenuChoice = "pvp" | "ai" | "watch";

function difficultyLabel(id: DifficultyId): string {
  return DIFFICULTIES.find((d) => d.id === id)?.label ?? id;
}

function modeLabel(mode: GameMode): string {
  switch (mode.kind) {
    case "pvp":
      return "Two players";
    case "ai":
      return `You (${mode.human === 0 ? "Light" : "Dark"}) vs ${difficultyLabel(mode.difficulty)}`;
    case "watch":
      return `Watching ${difficultyLabel(mode.light)} vs ${difficultyLabel(mode.dark)}`;
  }
}

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms) || ms < 0) return "just now";
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? "yesterday" : `${days} days ago`;
}

function DifficultySelect({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: DifficultyId;
  onChange(v: DifficultyId): void;
}) {
  return (
    <label className="flex items-center justify-between gap-3 text-sm" htmlFor={id}>
      <span className="text-[var(--ink-dim)]">{label}</span>
      <select
        id={id}
        className="btn rounded-lg px-3 py-1.5 text-sm"
        value={value}
        onChange={(e) => onChange(e.target.value as DifficultyId)}
      >
        {DIFFICULTIES.map((d) => (
          <option key={d.id} value={d.id}>
            {d.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function GameApp() {
  const [mode, setMode] = useState<GameMode | null>(null);
  const [choice, setChoice] = useState<MenuChoice>("ai");
  const [difficulty, setDifficulty] = useState<DifficultyId>("medium");
  const [seat, setSeat] = useState<PlayerId>(0);
  const [lightAi, setLightAi] = useState<DifficultyId>("expert");
  const [darkAi, setDarkAi] = useState<DifficultyId>("medium");
  const [gameId, setGameId] = useState(0);
  const [saved, setSaved] = useState<SavedGame | null>(null);
  const [resume, setResume] = useState<SavedGame | undefined>(undefined);
  const [confirmBegin, setConfirmBegin] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [tutorialActive, setTutorialActive] = useState(false);
  const [importedReplay, setImportedReplay] = useState<Replay | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // (Re)check for a saved game whenever the menu is showing — the game
  // auto-saves, so returning from a live game brings its save with it.
  useEffect(() => {
    if (mode === null && !tutorialActive) setSaved(loadGame());
  }, [mode, tutorialActive]);

  useEffect(() => {
    if (!importError) return;
    const timer = setTimeout(() => setImportError(null), 4000);
    return () => clearTimeout(timer);
  }, [importError]);

  const handleReplayFile = async (file: File) => {
    setImportError(null);
    try {
      const text = await file.text();
      setImportedReplay(importReplay(text));
    } catch (err) {
      setImportError(err instanceof UrEngineError ? err.message : "Couldn't read that file as a replay.");
    }
  };

  if (tutorialActive) {
    return <TutorialView onExit={() => setTutorialActive(false)} />;
  }

  if (importedReplay) {
    return <ReplayViewer replay={importedReplay} onClose={() => setImportedReplay(null)} />;
  }

  if (mode) {
    return (
      <GameView
        key={gameId}
        mode={mode}
        resume={resume}
        onExit={() => {
          setResume(undefined);
          setMode(null);
        }}
      />
    );
  }

  const begin = () => {
    setGameId((n) => n + 1);
    setResume(undefined);
    clearGame();
    if (choice === "pvp") setMode({ kind: "pvp" });
    else if (choice === "ai") setMode({ kind: "ai", human: seat, difficulty });
    else setMode({ kind: "watch", light: lightAi, dark: darkAi });
  };

  const start = () => {
    if (saved) setConfirmBegin(true);
    else begin();
  };

  const continueGame = () => {
    if (!saved) return;
    setGameId((n) => n + 1);
    setResume(saved);
    setMode(saved.mode);
  };

  const card = (value: MenuChoice, title: string, blurb: string) => (
    <button
      className={[
        "btn w-full rounded-xl px-4 py-3 text-left",
        choice === value ? "ring-1 ring-[var(--gold)]" : "",
      ].join(" ")}
      onClick={() => setChoice(value)}
      aria-pressed={choice === value}
    >
      <div className="font-display">{title}</div>
      <div className="mt-0.5 text-xs text-[var(--ink-dim)]">{blurb}</div>
    </button>
  );

  const selectedInfo = DIFFICULTIES.find((d) => d.id === difficulty);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-6 px-4 py-10">
      <header className="text-center">
        <div className="text-xs uppercase tracking-[0.3em] text-[var(--ink-dim)]">c. 2600 BCE · Mesopotamia</div>
        <h1 className="font-display mt-2 text-4xl text-[var(--gold)]">Royal Game of Ur</h1>
        <p className="mt-3 text-sm text-[var(--ink-dim)]">
          The world&apos;s oldest playable board game. Race your seven pieces around the board;
          rosettes grant another throw; the shared lane is a battlefield.
        </p>
      </header>

      {saved ? (
        <button
          className="btn w-full rounded-xl px-4 py-3 text-left ring-1 ring-[var(--gold)]"
          onClick={continueGame}
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="font-display text-[var(--gold)]">Continue game</div>
              <div className="mt-0.5 text-xs text-[var(--ink-dim)]">
                {modeLabel(saved.mode)} · saved {timeAgo(saved.savedAt)}
              </div>
            </div>
            <span aria-hidden className="font-display text-xl text-[var(--gold)]">
              ›
            </span>
          </div>
        </button>
      ) : null}

      <div className="flex flex-col gap-2.5">
        {card("ai", "Play the machine", "Honest difficulty tiers — none of them cheat.")}
        {card("pvp", "Two players", "Pass and play at one screen.")}
        {card("watch", "Watch AI vs AI", "Set two engines against each other.")}
      </div>

      <div className="flex flex-col gap-3 rounded-xl bg-[var(--bg-raised)] p-4">
        {choice === "ai" ? (
          <>
            <DifficultySelect id="difficulty" label="Opponent" value={difficulty} onChange={setDifficulty} />
            {selectedInfo ? <p className="text-xs text-[var(--ink-dim)]">{selectedInfo.description}</p> : null}
            <label className="flex items-center justify-between gap-3 text-sm" htmlFor="seat">
              <span className="text-[var(--ink-dim)]">You play</span>
              <select
                id="seat"
                className="btn rounded-lg px-3 py-1.5 text-sm"
                value={seat}
                onChange={(e) => setSeat(Number(e.target.value) as PlayerId)}
              >
                <option value={0}>Light (first)</option>
                <option value={1}>Dark (second)</option>
              </select>
            </label>
          </>
        ) : null}
        {choice === "watch" ? (
          <>
            <DifficultySelect id="light-ai" label="Light engine" value={lightAi} onChange={setLightAi} />
            <DifficultySelect id="dark-ai" label="Dark engine" value={darkAi} onChange={setDarkAi} />
          </>
        ) : null}
        {choice === "pvp" ? (
          <p className="text-xs text-[var(--ink-dim)]">
            Light rolls first. Rosettes (the gold flowers) grant another throw; the central rosette is safe ground.
          </p>
        ) : null}

        <button className="btn btn-primary mt-1 rounded-lg px-5 py-2.5" onClick={start}>
          Begin
        </button>
      </div>

      <div className="flex flex-wrap justify-center gap-2">
        <button className="btn rounded-lg px-4 py-1.5 text-sm" onClick={() => setGuideOpen(true)}>
          How to play
        </button>
        <button className="btn rounded-lg px-4 py-1.5 text-sm" onClick={() => setStatsOpen(true)}>
          Stats
        </button>
        <button className="btn rounded-lg px-4 py-1.5 text-sm" onClick={() => setSettingsOpen(true)}>
          Settings
        </button>
        <button className="btn rounded-lg px-4 py-1.5 text-sm" onClick={() => fileInputRef.current?.click()}>
          View a replay
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) void handleReplayFile(file);
          }}
        />
      </div>
      {importError ? <p className="text-center text-xs text-[var(--danger)]">{importError}</p> : null}

      <footer className="text-center text-xs text-[var(--ink-dim)]">
        Classic Irving Finkel rules · British Museum reconstruction
      </footer>

      <StatsPanel open={statsOpen} onClose={() => setStatsOpen(false)} />
      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <HowToPlay
        open={guideOpen}
        onClose={() => setGuideOpen(false)}
        onStartTutorial={() => setTutorialActive(true)}
      />

      <Modal
        open={confirmBegin}
        title="Start a new game?"
        onClose={() => setConfirmBegin(false)}
        actions={
          <>
            <button className="btn rounded-lg px-4 py-2 text-sm" onClick={() => setConfirmBegin(false)}>
              Cancel
            </button>
            <button
              className="btn btn-primary rounded-lg px-4 py-2 text-sm"
              onClick={() => {
                setConfirmBegin(false);
                begin();
              }}
            >
              Start new game
            </button>
          </>
        }
      >
        {saved ? (
          <>
            Your saved game ({modeLabel(saved.mode)}) will be replaced. Choose{" "}
            <em>Continue game</em> instead to pick it back up.
          </>
        ) : null}
      </Modal>
    </main>
  );
}
