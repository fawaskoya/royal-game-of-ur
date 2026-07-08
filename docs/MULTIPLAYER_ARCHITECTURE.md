# Multiplayer Architecture — plan (Phase 7 deliverable)

**Nothing online is implemented.** The binding technical design (server-authoritative model,
data schema, protocol, commit–reveal dice) lives in
[`ONLINE_ARCHITECTURE.md`](ONLINE_ARCHITECTURE.md) — this document adds the product plan, the
backend evaluation the founding brief asked for, and the code seam that now exists.

## Trust boundary (non-negotiable)

The client is presentation only. The server rolls all dice (commit–reveal), validates every
move through the same `@ur/engine`, owns the append-only event log, and is the sole arbiter of
results. Clients rebuild state with `buildStateFromEvents` — the engine's replay verification
(`REPLAY_MISMATCH`) doubles as anti-cheat. Any PR that applies a remote player's move without
server validation is wrong by definition.

## The seam in code (shipped — types AND a working local wire)

`apps/web/lib/network/types.ts` defines `MultiplayerTransport`: connect/disconnect,
`sendMove(ProposedMove)` (a *proposal*, staleness-checked against the event index),
`requestRoll`, and subscriptions for `ServerEventBatch`, room players, and status. The unit of
sync is the **event**, not the state.

**2026-07-06 — the full room flow is live over a local wire** (`lib/multiplayer/localRoom.ts`,
`useLocalRoom.ts`, `components/OnlineRoomView.tsx`): create/join by 4-letter code,
`LocalRoomHost` as the embedded stand-in server (owns the session, rolls all dice, validates
every proposal through the engine, broadcasts append-only event batches), clients — including
the host's own UI, via loopback — talk only through `MultiplayerTransport` and rebuild state
with `buildStateFromEvents` (full re-verification per batch). The wire is a BroadcastChannel,
so rooms reach other windows of the same browser today. Verified end-to-end across two tabs
(host and guest alternating turns).

**2026-07-08 — the real wire is written, not yet deployed.** A Supabase project exists
(`royal-game-of-ur`, `potentdream's Org`); `supabase/migrations/0001_init.sql` (profiles, games,
game_events, ratings, and a policy-less `game_secrets` table for commit-reveal dice) and
`supabase/functions/game-move/index.ts` (the exact `LocalRoomHost` logic — reconstruct via
`buildStateFromEvents`, validate through `@ur/engine`, append events — against Postgres instead
of memory) are both in the repo. `SupabaseRoomTransport implements MultiplayerTransport`
(`apps/web/lib/multiplayer/supabaseTransport.ts`) mirrors `LocalRoomTransport`'s shape exactly.
None of this has run against the live database yet — this environment can't complete Supabase's
browser-based CLI login, so the migration hasn't been applied and the function hasn't been
deployed. Exact remaining steps in `docs/GO_LIVE_PLAN.md` Phase L2.

## Backend evaluation

| Option | Fit | Notes |
|---|---|---|
| **Supabase (Realtime + Edge Functions + Postgres + Auth)** ✅ recommended | High | Matches the master spec and ONLINE_ARCHITECTURE (already the binding choice): auth providers + guest, Postgres for the event log/ratings, Realtime channels for broadcast/presence. Engine runs in Edge Functions (Node) — one rules codebase. Managed, cheap at MVP scale. |
| Firebase (RTDB/Firestore + Cloud Functions) | Medium | Comparable managed stack, but document DBs fit an append-only relational event log worse, and we'd re-implement what Postgres gives (queries for ratings/leaderboards/disputes). |
| Plain WebSocket server (Node + ws) | Medium | Maximum control, most ops burden (scaling, presence, reconnect, auth from scratch). Right later if Edge Function latency/concurrency disappoints — the transport seam makes the swap invisible to the client. |
| Socket.io | Medium− | Same as above plus a protocol layer we don't need (Realtime/WS suffice). |
| PartyKit | Medium | Great DX for rooms; young platform, still needs a DB for logs/ratings — ends up Supabase+PartyKit (two vendors where one suffices). |
| Cloudflare Durable Objects | Medium | Excellent room model at scale; more novel ops surface, and the event log still wants Postgres. A scale-stage option, not an MVP one. |

**Recommendation: Supabase**, per the existing binding design. Re-evaluate only if Realtime
latency in target regions (India focus) measures poorly in an MVP spike.

## MVP phasing

**Phase A — private rooms:** invite code → room; two seats + spectators; server-validated
moves; reconnect via `state_sync` from the event log; no chat (emotes at most).
**Phase B — accounts & competition:** profiles, match history (server `MatchResult`s —
same shape as local stats), Elo ranked pool + leaderboards (see
LEADERBOARDS_AND_STATS.md), spectating, then matchmaking.

## Explicitly not being built yet (and why)

- Any networking code beyond types — no backend exists; local play polish is the priority
  (MASTER_SPEC gating).
- Client-side prediction — start fully server-driven; add prediction only if measured latency
  demands it.
- Chat — moderation cost outweighs MVP value.
- Ranked before casual is stable — rating integrity depends on stable infrastructure.
