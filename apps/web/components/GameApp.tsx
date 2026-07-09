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
import { LeaderboardPanel } from "./LeaderboardPanel";
import { ReplayViewer } from "./ReplayViewer";
import { ArchivePanel } from "./ArchivePanel";
import { OnlineRoomView } from "./OnlineRoomView";
import { MatchmakingView } from "./MatchmakingView";
import { MenuVignette } from "./MenuVignette";
import { loadTutorialProgress } from "@/lib/useTutorial";
import { loadResults } from "@/lib/stats/matchResults";
import { isOnlineConfigured } from "@/lib/multiplayer/supabaseClient";

type MenuChoice = "ai" | "pvp" | "watch" | "room" | "tutorial" | "match";

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
    case "online":
      return `Online vs ${mode.opponent ?? "guest"}`;
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

/* Engraved line icons for the mode cards — stroke-only, brand gold. */
function IconDie() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6 lg:h-6 lg:w-6" fill="none" stroke="var(--gold)" strokeWidth="1.5" strokeLinejoin="round" aria-hidden>
      <path d="M12 3 L21 20 L3 20 Z" />
      <path d="M12 3 L12 20" opacity="0.5" />
      <circle cx="12" cy="15.5" r="1.4" fill="var(--gold)" stroke="none" />
    </svg>
  );
}

function IconTwoPieces() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="var(--gold)" strokeWidth="1.5" aria-hidden>
      <circle cx="9" cy="12" r="5.5" />
      <circle cx="16.5" cy="12" r="5.5" opacity="0.55" />
      <circle cx="9" cy="12" r="1.3" fill="var(--gold)" stroke="none" />
    </svg>
  );
}

function IconEye() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="var(--gold)" strokeWidth="1.5" strokeLinejoin="round" aria-hidden>
      <path d="M2.5 12 C6 6.5 18 6.5 21.5 12 C18 17.5 6 17.5 2.5 12 Z" />
      <circle cx="12" cy="12" r="2.6" />
    </svg>
  );
}

function IconGlobe() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="var(--gold)" strokeWidth="1.5" aria-hidden>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M3.5 12 h17 M12 3.5 c3.2 2.6 3.2 14.4 0 17 M12 3.5 c-3.2 2.6 -3.2 14.4 0 17" opacity="0.6" />
    </svg>
  );
}

function IconScroll() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="var(--gold)" strokeWidth="1.5" strokeLinejoin="round" aria-hidden>
      <path d="M7 4.5 h9 a2 2 0 0 1 2 2 v11 a1.5 1.5 0 0 1 -1.5 1.5 H8.5 A1.5 1.5 0 0 1 7 17.5 V4.5 Z" />
      <path d="M7 4.5 A2 2 0 0 0 5 6.5 V18" opacity="0.55" />
      <path d="M10 9 h6 M10 12.5 h6 M10 16 h4" opacity="0.7" />
    </svg>
  );
}

function IconMatch() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="var(--gold)" strokeWidth="1.5" aria-hidden>
      <circle cx="8" cy="10" r="3.2" />
      <circle cx="16" cy="10" r="3.2" />
      <path d="M4.5 18 c1.2 -2.5 3 -3.5 3.5 -3.5 s2.3 1 3.5 3.5" opacity="0.75" />
      <path d="M12.5 18 c1.2 -2.5 3 -3.5 3.5 -3.5 s2.3 1 3.5 3.5" opacity="0.75" />
      <path d="M11 10 h2" opacity="0.5" />
    </svg>
  );
}

const MODE_CARDS: { id: MenuChoice; title: string; blurb: string; icon: () => React.ReactNode }[] = [
  { id: "tutorial", title: "Learn to play", blurb: "Interactive first game on a live board.", icon: IconScroll },
  { id: "ai", title: "Play the machine", blurb: "Six honest tiers, none of them cheat.", icon: IconDie },
  { id: "pvp", title: "Two players", blurb: "Pass and play at one screen.", icon: IconTwoPieces },
  { id: "match", title: "Find a match", blurb: "Play someone online — casual Elo ladder.", icon: IconMatch },
  { id: "room", title: "Private room", blurb: "A 4-letter code, any two devices.", icon: IconGlobe },
  { id: "watch", title: "Watch AI vs AI", blurb: "Set two engines against each other.", icon: IconEye },
];

function DifficultySelect({
  id,
  label,
  value,
  onChange,
  compact,
}: {
  id: string;
  label: string;
  value: DifficultyId;
  onChange(v: DifficultyId): void;
  compact?: boolean;
}) {
  return (
    <label className={["flex items-center justify-between gap-3", compact ? "text-sm" : "text-sm"].join(" ")} htmlFor={id}>
      <span className="text-[var(--ink-dim)]">{label}</span>
      <select
        id={id}
        className={["btn rounded-lg text-sm", compact ? "min-h-10 px-2.5 py-1.5" : "px-3 py-1.5"].join(" ")}
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
  const [boardOpen, setBoardOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [tutorialActive, setTutorialActive] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [roomActive, setRoomActive] = useState(false);
  const [matchActive, setMatchActive] = useState(false);
  const [firstRun, setFirstRun] = useState(false);
  const [importedReplay, setImportedReplay] = useState<Replay | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (mode === null && !tutorialActive && !matchActive && !roomActive) {
      setSaved(loadGame());
      const isFirst = !loadTutorialProgress().completed && loadResults().length === 0;
      setFirstRun(isFirst);
      if (isFirst) setChoice("tutorial");
    }
  }, [mode, tutorialActive, matchActive, roomActive]);

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

  if (matchActive) {
    return <MatchmakingView onExit={() => setMatchActive(false)} />;
  }

  if (roomActive) {
    return <OnlineRoomView onExit={() => setRoomActive(false)} />;
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
    if (choice === "tutorial") {
      setTutorialActive(true);
      return;
    }
    if (choice === "match") {
      setMatchActive(true);
      return;
    }
    if (choice === "room") {
      setRoomActive(true);
      return;
    }
    if (saved) setConfirmBegin(true);
    else begin();
  };

  const continueGame = () => {
    if (!saved) return;
    setGameId((n) => n + 1);
    setResume(saved);
    setMode(saved.mode);
  };

  const selectedInfo = DIFFICULTIES.find((d) => d.id === difficulty);
  const primaryLabel =
    choice === "room"
      ? "Enter lobby"
      : choice === "tutorial"
        ? "Start tutorial"
        : choice === "match"
          ? "Find match"
          : "Begin";

  const modeOptions = (compact: boolean) => (
    <>
      {choice === "ai" ? (
        <>
          <DifficultySelect
            id={compact ? "m-difficulty" : "difficulty"}
            label="Opponent"
            value={difficulty}
            onChange={setDifficulty}
            compact={compact}
          />
          {selectedInfo && !compact ? <p className="text-xs text-[var(--ink-dim)]">{selectedInfo.description}</p> : null}
          <label
            className="flex items-center justify-between gap-3 text-sm"
            htmlFor={compact ? "m-seat" : "seat"}
          >
            <span className="text-[var(--ink-dim)]">You play</span>
            <select
              id={compact ? "m-seat" : "seat"}
              className={["btn rounded-lg text-sm", compact ? "min-h-10 px-2.5 py-1.5" : "px-3 py-1.5"].join(" ")}
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
          <DifficultySelect
            id={compact ? "m-light-ai" : "light-ai"}
            label="Light engine"
            value={lightAi}
            onChange={setLightAi}
            compact={compact}
          />
          <DifficultySelect
            id={compact ? "m-dark-ai" : "dark-ai"}
            label="Dark engine"
            value={darkAi}
            onChange={setDarkAi}
            compact={compact}
          />
        </>
      ) : null}
      {choice === "pvp" ? (
        <p className={["text-[var(--ink-dim)] leading-snug", compact ? "text-[13px]" : "text-xs"].join(" ")}>
          Light rolls first. Rosettes grant another throw; the central rosette is safe.
        </p>
      ) : null}
      {choice === "room" ? (
        <p className={["text-[var(--ink-dim)] leading-snug", compact ? "text-[13px]" : "text-xs"].join(" ")}>
          {isOnlineConfigured()
            ? "Share a 4-letter code — opponent joins any device. Server throws the dice."
            : "Two browser windows, one board. Create in one, join with the code in the other."}
        </p>
      ) : null}
      {choice === "tutorial" ? (
        <p className={["text-[var(--ink-dim)] leading-snug", compact ? "text-[13px]" : "text-xs"].join(" ")}>
          Guided opening on the real rules — captures, rosettes, bear-off. ~2 minutes.
        </p>
      ) : null}
      {choice === "match" ? (
        <p className={["text-[var(--ink-dim)] leading-snug", compact ? "text-[13px]" : "text-xs"].join(" ")}>
          {isOnlineConfigured()
            ? "Casual Elo vs anyone online. Guests welcome; sign up to keep your rating."
            : "Needs Supabase env in this build. Private rooms still work locally."}
        </p>
      ) : null}
    </>
  );

  const secondaryLinks = (compact: boolean) => (
    <>
      <button
        className={[
          "btn rounded-lg",
          compact ? "min-h-9 px-3 py-1.5 text-sm" : "px-4 py-1.5 text-sm",
          firstRun ? "pulse-gold ring-1 ring-[var(--gold)]" : "",
        ].join(" ")}
        onClick={() => setGuideOpen(true)}
      >
        How to play
      </button>
      <button className={["btn rounded-lg", compact ? "min-h-9 px-3 py-1.5 text-sm" : "px-4 py-1.5 text-sm"].join(" ")} onClick={() => setArchiveOpen(true)}>
        Replays
      </button>
      <button className={["btn rounded-lg", compact ? "min-h-9 px-3 py-1.5 text-sm" : "px-4 py-1.5 text-sm"].join(" ")} onClick={() => setStatsOpen(true)}>
        Stats
      </button>
      {isOnlineConfigured() ? (
        <button className={["btn rounded-lg", compact ? "min-h-9 px-3 py-1.5 text-sm" : "px-4 py-1.5 text-sm"].join(" ")} onClick={() => setBoardOpen(true)}>
          Ladder
        </button>
      ) : null}
      <button className={["btn rounded-lg", compact ? "min-h-9 px-3 py-1.5 text-sm" : "px-4 py-1.5 text-sm"].join(" ")} onClick={() => setSettingsOpen(true)}>
        Settings
      </button>
      <button className={["btn rounded-lg", compact ? "min-h-9 px-3 py-1.5 text-sm" : "px-4 py-1.5 text-sm"].join(" ")} onClick={() => fileInputRef.current?.click()}>
        Import
      </button>
    </>
  );

  const panels = (
    <>
      <StatsPanel open={statsOpen} onClose={() => setStatsOpen(false)} />
      <LeaderboardPanel open={boardOpen} onClose={() => setBoardOpen(false)} />
      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <ArchivePanel open={archiveOpen} onClose={() => setArchiveOpen(false)} />
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
    </>
  );

  const fileInput = (
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
  );

  return (
    <>
      {fileInput}

      {/* ── Mobile: single-screen shell, larger type for readability ───── */}
      <main className="menu-shell mx-auto flex h-dvh max-h-dvh w-full max-w-lg flex-col overflow-hidden px-3.5 pb-[max(0.65rem,env(safe-area-inset-bottom))] pt-[max(0.65rem,env(safe-area-inset-top))] lg:hidden">
        <header className="shrink-0 text-center">
          <div className="text-[11px] uppercase tracking-[0.28em] text-[var(--ink-dim)]">✦ c. 2600 BCE · Ur ✦</div>
          <h1 className="font-display gold-text mt-0.5 text-[1.85rem] leading-tight tracking-wide">
            Royal Game of Ur
          </h1>
        </header>

        {saved ? (
          <button
            className="card card--gilded mt-2.5 shrink-0 rounded-xl px-3.5 py-2.5 text-left"
            onClick={continueGame}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="font-display text-base text-[var(--gold)]">Continue</div>
                <div className="truncate text-[13px] text-[var(--ink-dim)]">
                  {modeLabel(saved.mode)} · {timeAgo(saved.savedAt)}
                </div>
              </div>
              <span aria-hidden className="font-display text-xl text-[var(--gold)]">
                ›
              </span>
            </div>
          </button>
        ) : null}

        {/* Accordion mode cards — only the selected one expands options */}
        <div className="mt-2.5 min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <div className="flex flex-col gap-2">
            {MODE_CARDS.map((card) => {
              const open = choice === card.id;
              return (
                <div
                  key={card.id}
                  className={[
                    "card overflow-hidden rounded-xl transition-[box-shadow,border-color]",
                    open ? "ring-1 ring-[var(--gold)]" : "",
                    firstRun && card.id === "tutorial" && open ? "card--gilded" : "",
                  ].join(" ")}
                >
                  <button
                    type="button"
                    className="btn flex min-h-[3.25rem] w-full items-center gap-3 rounded-none px-3.5 py-2.5 text-left"
                    onClick={() => setChoice(card.id)}
                    aria-expanded={open}
                  >
                    <span className="shrink-0 opacity-90">{card.icon()}</span>
                    <span className="min-w-0 flex-1">
                      <span className="font-display flex flex-wrap items-center gap-1.5 text-[1.05rem] leading-tight">
                        {card.title}
                        {card.id === "room" ? (
                          <span className="chip text-[11px]">{isOnlineConfigured() ? "online" : "local"}</span>
                        ) : null}
                        {card.id === "match" && isOnlineConfigured() ? <span className="chip text-[11px]">live</span> : null}
                      </span>
                      {!open ? (
                        <span className="mt-0.5 block line-clamp-2 text-[13px] leading-snug text-[var(--ink-dim)]">
                          {card.blurb}
                        </span>
                      ) : null}
                    </span>
                    <span
                      aria-hidden
                      className={[
                        "shrink-0 text-lg text-[var(--gold)] transition-transform",
                        open ? "rotate-90" : "",
                      ].join(" ")}
                    >
                      ›
                    </span>
                  </button>
                  {open ? (
                    <div className="flex flex-col gap-2.5 border-t border-[var(--gold-faint)] px-3.5 pb-3 pt-2.5">
                      {modeOptions(true)}
                      <button
                        className="btn btn-primary min-h-11 w-full rounded-xl px-4 py-2.5 text-base font-medium"
                        onClick={start}
                      >
                        {primaryLabel}
                      </button>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>

        <footer className="mt-2.5 shrink-0">
          <div className="flex flex-wrap justify-center gap-2">{secondaryLinks(true)}</div>
          {importError ? <p className="mt-1.5 text-center text-[13px] text-[var(--danger)]">{importError}</p> : null}
        </footer>
      </main>

      {/* ── Desktop / tablet landscape ─────────────────────────────────── */}
      <main className="menu-shell mx-auto hidden min-h-dvh w-full max-w-6xl flex-col justify-center gap-8 px-5 py-10 lg:flex lg:py-8 lg:px-8">
        <section className="grid items-center gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:items-start lg:gap-x-10">
          <div className="flex flex-col gap-5 text-center lg:pt-2 lg:text-left">
            <div className="text-xs uppercase tracking-[0.35em] text-[var(--ink-dim)]">
              ✦&ensp;c. 2600 BCE · Mesopotamia&ensp;✦
            </div>
            <h1 className="font-display gold-text text-4xl leading-tight sm:text-5xl lg:text-6xl">
              Royal Game
              <br />
              of Ur
            </h1>
            <p className="mx-auto max-w-md text-sm leading-relaxed text-[var(--ink-dim)] lg:mx-0">
              The world&apos;s oldest playable board game — buried with the queens of Ur, decoded
              from a Babylonian tablet, alive on your screen. Race your seven pieces home;
              rosettes grant another throw; the shared lane is a battlefield.
            </p>

            {saved ? (
              <button
                className="card card--gilded group w-full rounded-xl px-4 py-3 text-left"
                onClick={continueGame}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-display text-[var(--gold)]">Continue game</div>
                    <div className="mt-0.5 text-xs text-[var(--ink-dim)]">
                      {modeLabel(saved.mode)} · saved {timeAgo(saved.savedAt)}
                    </div>
                  </div>
                  <span
                    aria-hidden
                    className="font-display text-xl text-[var(--gold)] transition-transform group-hover:translate-x-0.5"
                  >
                    ›
                  </span>
                </div>
              </button>
            ) : null}

            <div className="ornament-rule mt-1 hidden text-xs lg:flex">✦</div>
            <div className="hidden flex-wrap gap-2 lg:flex">{secondaryLinks(false)}</div>
            {importError ? <p className="hidden text-xs text-[var(--danger)] lg:block">{importError}</p> : null}
            <footer className="hidden text-xs text-[var(--ink-dim)] lg:block">
              Classic Irving Finkel rules · British Museum reconstruction
            </footer>
          </div>

          <div className="flex min-w-0 flex-col gap-4">
            <div className="hidden lg:block lg:max-h-[min(220px,28vh)] lg:overflow-hidden">
              <MenuVignette />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {MODE_CARDS.map((card) => (
                <button
                  key={card.id}
                  className={[
                    "card btn w-full rounded-xl px-4 py-3.5 text-left",
                    choice === card.id ? "ring-1 ring-[var(--gold)]" : "",
                    firstRun && card.id === "tutorial" && choice === "tutorial" ? "card--gilded" : "",
                  ].join(" ")}
                  onClick={() => setChoice(card.id)}
                  aria-pressed={choice === card.id}
                >
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 shrink-0 opacity-80">{card.icon()}</span>
                    <span>
                      <span className="font-display block">
                        {card.title}
                        {card.id === "room" ? (
                          <span className="chip ml-2 align-middle">
                            {isOnlineConfigured() ? "online" : "same device"}
                          </span>
                        ) : null}
                        {card.id === "match" && isOnlineConfigured() ? (
                          <span className="chip ml-2 align-middle">live</span>
                        ) : null}
                      </span>
                      <span className="mt-0.5 block text-xs text-[var(--ink-dim)]">{card.blurb}</span>
                    </span>
                  </div>
                </button>
              ))}
            </div>

            <div className="card flex flex-col gap-3 rounded-xl p-4">
              {modeOptions(false)}
              <button className="btn btn-primary mt-1 rounded-lg px-5 py-2.5" onClick={start}>
                {primaryLabel === "Enter lobby" ? "Enter the lobby" : primaryLabel}
              </button>
            </div>
          </div>
        </section>
      </main>

      {panels}
    </>
  );
}
