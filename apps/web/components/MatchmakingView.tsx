"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getAuthSnapshot, getCachedSnapshot, type AuthSnapshot } from "@/lib/multiplayer/auth";
import { cancelMatch, enqueueMatch, pollMatch } from "@/lib/multiplayer/matchmaking";
import { useOnlineRoom } from "@/lib/multiplayer/useOnlineRoom";
import { isOnlineConfigured } from "@/lib/multiplayer/supabaseClient";
import { AuthPanel } from "./AuthPanel";
import { RoomGameScreen } from "./RoomGameScreen";

/**
 * Global casual matchmaking: sign-in optional (guests allowed), Elo pool, find
 * anyone waiting worldwide. On match, reuses the online room transport.
 */
export function MatchmakingView({ onExit }: { onExit(): void }) {
  const online = isOnlineConfigured();
  const room = useOnlineRoom();
  // Start from any warm/optimistic snapshot so the account strip shows the
  // player instantly instead of flashing "Not connected".
  const [auth, setAuth] = useState<AuthSnapshot>(() => getCachedSnapshot() ?? { user: null, identity: null });
  const [authLoading, setAuthLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [waitSec, setWaitSec] = useState(0);
  const [rating, setRating] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [winNote, setWinNote] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const preRatingRef = useRef<number | null>(null);

  const stopPoll = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!online) {
      setAuthLoading(false);
      return;
    }
    let cancelled = false;
    getAuthSnapshot()
      .then((snap) => {
        if (cancelled) return;
        setAuth(snap);
        preRatingRef.current = snap.identity?.rating ?? null;
        setRating(snap.identity?.rating ?? null);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setAuthLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [online]);

  useEffect(() => () => {
    stopPoll();
    void cancelMatch().catch(() => undefined);
  }, [stopPoll]);

  const onMatched = useCallback(
    (gameId: string) => {
      stopPoll();
      setSearching(false);
      void cancelMatch().catch(() => undefined);
      room.joinGameId(gameId, "LIVE");
    },
    [room, stopPoll],
  );

  const startSearch = useCallback(() => {
    setError(null);
    setSearching(true);
    setWaitSec(0);
    void (async () => {
      try {
        const first = await enqueueMatch("casual");
        setRating(first.rating ?? rating);
        setWaitSec(first.waitingSeconds);
        if (first.status === "matched" && first.gameId) {
          onMatched(first.gameId);
          return;
        }
        stopPoll();
        pollRef.current = setInterval(() => {
          void (async () => {
            try {
              const next = await pollMatch();
              setWaitSec(next.waitingSeconds);
              if (next.rating != null) setRating(next.rating);
              if (next.status === "matched" && next.gameId) onMatched(next.gameId);
              if (next.status === "idle") {
                setSearching(false);
                stopPoll();
              }
            } catch (e) {
              setError(e instanceof Error ? e.message : "Matchmaking failed");
              setSearching(false);
              stopPoll();
            }
          })();
        }, 2000);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not start matchmaking");
        setSearching(false);
      }
    })();
  }, [onMatched, rating, stopPoll]);

  const cancelSearch = useCallback(() => {
    stopPoll();
    setSearching(false);
    void cancelMatch().catch(() => undefined);
  }, [stopPoll]);

  // Rating note when a match ends
  const winner = room.state?.winner ?? null;
  useEffect(() => {
    if (winner === null) {
      setWinNote(null);
      return;
    }
    let cancelled = false;
    getAuthSnapshot()
      .then((snap) => {
        if (cancelled) return;
        setAuth(snap);
        const before = preRatingRef.current;
        preRatingRef.current = snap.identity?.rating ?? null;
        if (snap.identity?.rating == null) return;
        const delta = before === null ? null : snap.identity.rating - before;
        setWinNote(
          delta === null
            ? `Online rating: ${snap.identity.rating}`
            : `Online rating: ${snap.identity.rating} (${delta >= 0 ? "+" : ""}${delta})`,
        );
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [winner]);

  if (!online) {
    return (
      <main className="menu-shell mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-4 px-4 py-10 text-center">
        <h1 className="font-display gold-text text-3xl">Find a match</h1>
        <p className="text-sm text-[var(--ink-dim)]">
          Online play is not configured in this build (missing Supabase env). Private rooms on this
          device still work from the menu.
        </p>
        <button className="btn rounded-lg px-4 py-2 text-sm" onClick={onExit}>
          ‹ Back
        </button>
      </main>
    );
  }

  if (room.phase === "playing" && room.state) {
    const subtitle =
      room.handles[0] || room.handles[1]
        ? `${room.handles[0] ?? "Light"} vs ${room.handles[1] ?? "Dark"}`
        : "Casual match";
    return (
      <RoomGameScreen
        room={room}
        title="Live match"
        subtitle={subtitle}
        notice={room.actionError}
        winNote={winNote}
        rematchLabel={room.rematchOffered ? "Join rematch" : "Rematch"}
        onRematch={room.rematch}
        onLeave={() => {
          room.leave();
          onExit();
        }}
      />
    );
  }

  if (room.phase === "waiting" || room.phase === "error") {
    return (
      <main className="menu-shell mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-4 px-4 py-10 text-center">
        <h1 className="font-display gold-text text-3xl">
          {room.phase === "error" ? "Could not join" : "Opening match…"}
        </h1>
        {room.error ? <p className="text-sm text-[var(--danger)]">{room.error}</p> : null}
        <button
          className="btn rounded-lg px-4 py-2 text-sm"
          onClick={() => {
            room.leave();
            setSearching(false);
          }}
        >
          Back
        </button>
      </main>
    );
  }

  return (
    <main className="menu-shell mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-5 px-4 py-10">
      <header className="text-center">
        <h1 className="font-display gold-text text-3xl">Find a match</h1>
        <p className="mt-2 text-sm text-[var(--ink-dim)]">
          Casual Elo ladder. Play anyone online — guests welcome; create an account to keep your
          rating across devices.
        </p>
      </header>

      <AuthPanel auth={auth} onAuthChange={setAuth} loading={authLoading} />

      {searching ? (
        <div className="card flex flex-col items-center gap-4 rounded-xl p-6 text-center">
          <div className="font-display text-xl text-[var(--gold)]">Searching…</div>
          <div className="text-sm text-[var(--ink-dim)]">
            {waitSec < 5
              ? "Looking for a nearby-rated opponent"
              : waitSec < 30
                ? "Expanding the rating window"
                : "Anyone free will do — hang tight"}
          </div>
          <div className="text-xs text-[var(--ink-dim)]">
            Waited {waitSec}s
            {rating != null ? ` · your rating ${rating}` : ""}
          </div>
          <button className="btn rounded-lg px-4 py-2 text-sm" onClick={cancelSearch}>
            Cancel search
          </button>
        </div>
      ) : (
        <button className="card btn w-full rounded-xl px-4 py-4 text-left" onClick={startSearch}>
          <div className="font-display text-lg">Find opponent</div>
          <div className="mt-0.5 text-xs text-[var(--ink-dim)]">
            Casual pool · server rolls dice · ~worldwide
          </div>
        </button>
      )}

      {error ? <p className="text-center text-sm text-[var(--danger)]">{error}</p> : null}

      <div className="flex justify-center">
        <button
          className="btn rounded-lg px-4 py-2 text-sm"
          onClick={() => {
            cancelSearch();
            onExit();
          }}
        >
          ‹ Back to menu
        </button>
      </div>
    </main>
  );
}
