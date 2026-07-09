"use client";

import { useState } from "react";
import { useLocalRoom } from "@/lib/multiplayer/useLocalRoom";
import { useOnlineRoom } from "@/lib/multiplayer/useOnlineRoom";
import { isOnlineConfigured } from "@/lib/multiplayer/supabaseClient";
import { RoomGameScreen } from "./RoomGameScreen";

/**
 * Private rooms. Two wires behind one screen:
 *  - Internet rooms (default when configured): Supabase-backed, playable
 *    across any two devices; the server rolls the dice and validates every
 *    move.
 *  - Same-device rooms: BroadcastChannel between two windows of this
 *    browser — instant and fully offline.
 */
export function OnlineRoomView({ onExit }: { onExit(): void }) {
  const online = isOnlineConfigured();
  const [wire, setWire] = useState<"online" | "local">(online ? "online" : "local");
  return wire === "online" && online ? (
    <OnlineFlow onExit={onExit} onSwitchWire={() => setWire("local")} />
  ) : (
    <LocalFlow onExit={onExit} onSwitchWire={online ? () => setWire("online") : undefined} />
  );
}

function Lobby({
  heading,
  blurb,
  hostLabel,
  hostBlurb,
  room,
  joinCode,
  setJoinCode,
  waitingCopy,
  switchLabel,
  onSwitchWire,
  onExit,
}: {
  heading: string;
  blurb: React.ReactNode;
  hostLabel: string;
  hostBlurb: string;
  room: ReturnType<typeof useLocalRoom>;
  joinCode: string;
  setJoinCode(v: string): void;
  waitingCopy: string;
  switchLabel?: string;
  onSwitchWire?: () => void;
  onExit(): void;
}) {
  const leaveAndExit = () => {
    room.leave();
    onExit();
  };

  return (
    <main className="menu-shell mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-6 px-4 py-10">
      <header className="text-center">
        <h1 className="font-display gold-text text-3xl">{heading}</h1>
        <p className="mt-2 text-sm text-[var(--ink-dim)]">{blurb}</p>
      </header>

      {room.phase === "idle" ? (
        <div className="flex flex-col gap-3">
          <button className="card btn w-full rounded-xl px-4 py-3 text-left" onClick={room.host}>
            <div className="font-display">{hostLabel}</div>
            <div className="mt-0.5 text-xs text-[var(--ink-dim)]">{hostBlurb}</div>
          </button>
          <div className="card flex flex-col gap-3 rounded-xl p-4">
            <label className="text-sm text-[var(--ink-dim)]" htmlFor="room-code">
              Join with a code
            </label>
            <div className="flex gap-2">
              <input
                id="room-code"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                maxLength={4}
                placeholder="ABCD"
                className="btn w-28 rounded-lg px-3 py-2 text-center font-mono text-lg tracking-[0.3em]"
                autoComplete="off"
                spellCheck={false}
              />
              <button
                className="btn btn-primary flex-1 rounded-lg px-4 py-2 text-sm"
                disabled={joinCode.trim().length !== 4}
                onClick={() => room.join(joinCode)}
              >
                Join room
              </button>
            </div>
          </div>
          {onSwitchWire ? (
            <button className="text-xs text-[var(--ink-dim)] underline-offset-4 hover:underline" onClick={onSwitchWire}>
              {switchLabel}
            </button>
          ) : null}
        </div>
      ) : null}

      {room.phase === "waiting" ? (
        <div className="card flex flex-col items-center gap-4 rounded-xl p-6 text-center">
          {room.code && room.mySeat === 0 ? (
            <>
              <div className="text-sm text-[var(--ink-dim)]">Share this code with your opponent:</div>
              <div className="font-display gold-text text-5xl tracking-[0.35em]">{room.code}</div>
              <div className="text-xs text-[var(--ink-dim)]">{waitingCopy}</div>
            </>
          ) : (
            <>
              <div className="text-sm text-[var(--ink-dim)]">Joining room</div>
              <div className="font-display gold-text text-4xl tracking-[0.35em]">{room.code ?? "…"}</div>
              <div className="text-xs text-[var(--ink-dim)]">Connecting…</div>
            </>
          )}
          <button className="btn rounded-lg px-4 py-1.5 text-xs" onClick={room.leave}>
            Cancel
          </button>
        </div>
      ) : null}

      {room.phase === "error" ? (
        <div className="card rounded-xl p-4 text-center text-sm text-[var(--danger)]">
          {room.error ?? "Something went wrong."}
          <div className="mt-3">
            <button className="btn rounded-lg px-4 py-1.5 text-xs" onClick={room.leave}>
              Try again
            </button>
          </div>
        </div>
      ) : null}

      <div className="flex justify-center">
        <button className="btn rounded-lg px-4 py-2 text-sm" onClick={leaveAndExit}>
          ‹ Back to menu
        </button>
      </div>
    </main>
  );
}

function OnlineFlow({ onExit, onSwitchWire }: { onExit(): void; onSwitchWire(): void }) {
  const room = useOnlineRoom();
  const [joinCode, setJoinCode] = useState("");

  if (room.phase === "playing" && room.state) {
    return (
      <RoomGameScreen
        room={room}
        title={`Room ${room.code ?? ""}`}
        notice={room.actionError}
        onLeave={() => {
          room.leave();
          onExit();
        }}
      />
    );
  }

  return (
    <Lobby
      heading="Play online"
      blurb={
        <>
          Live across any two devices. The server throws the dice and checks every move —
          nobody can cheat, not even the host.
        </>
      }
      hostLabel="Create an online room"
      hostBlurb="You play Light and share a 4-letter code."
      room={room}
      joinCode={joinCode}
      setJoinCode={setJoinCode}
      waitingCopy="They can join from any device at this site."
      switchLabel="Prefer two windows on this device? Use a same-device room"
      onSwitchWire={onSwitchWire}
      onExit={onExit}
    />
  );
}

function LocalFlow({ onExit, onSwitchWire }: { onExit(): void; onSwitchWire?: () => void }) {
  const room = useLocalRoom();
  const [joinCode, setJoinCode] = useState("");

  if (room.phase === "playing" && room.state) {
    return (
      <RoomGameScreen
        room={room}
        title={`Room ${room.code ?? ""}`}
        onLeave={() => {
          room.leave();
          onExit();
        }}
      />
    );
  }

  return (
    <Lobby
      heading="Same-device room"
      blurb="Two windows of this browser, one board — instant and fully offline."
      hostLabel="Create a room"
      hostBlurb="You play Light; open another window and join with the code."
      room={room}
      joinCode={joinCode}
      setJoinCode={setJoinCode}
      waitingCopy="Open a new window of this browser and join with the code."
      switchLabel="Play across the internet instead"
      onSwitchWire={onSwitchWire}
      onExit={onExit}
    />
  );
}
