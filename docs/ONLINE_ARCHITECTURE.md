# Online Architecture — design (future phase)

Not yet implemented. This is the binding design so that nothing built now blocks it. Online play begins only after local play is excellent (MASTER_SPEC workflow).

## Principle: the server is the only source of truth

Never trust clients. The server:

1. **Rolls all dice** (crypto RNG; `applyRoll` accepts rolls as inputs by design).
2. **Validates every move** through the same `@ur/engine` used by clients (one codebase, no rules drift).
3. **Stores the event log**, not just state — `buildStateFromEvents` re-verifies whole games (`REPLAY_MISMATCH` = tampering), giving anti-cheat and dispute resolution for free.
4. Sends clients only what they may know: current state + events. Clients render and *predict*; the server's event stream is authoritative and clients reconcile.

The engine's determinism/immutability was chosen precisely so this layer stays thin: a game server is a queue of `(gameId, proposedMove)` → engine validation → event broadcast.

## Stack (per master spec)

- **Supabase**: Postgres + Auth (Google/Apple/Discord/guest) + Realtime channels for move broadcast and presence.
- **Game service**: Node (engine runs server-side). Start as Supabase Edge Functions; move to a dedicated Node service when concurrency demands.
- **Redis (later)**: matchmaking queues, presence, rate limiting.
- **Sentry + PostHog** from day one.

## Data model (Postgres, first cut)

```
profiles(id, handle, country, avatar, created_at)
games(id, ruleset jsonb, white uuid, black uuid, status, winner,
      rating_class, started_at, finished_at, seed_commitment)
game_events(game_id, seq, event jsonb, server_ts)   -- the replay, append-only
ratings(profile_id, pool, rating, rd, updated_at)    -- Elo now, Glicko-2 later
matchmaking_queue(profile_id, pool, enqueued_at, rating)
```

## Protocol sketch

Client → server: `join(gameId)`, `propose_move(seq, move)`, `resign`, `offer/claim` (future: draws in variants, clocks).
Server → clients: `event(seq, GameEvent)` (rolls included), `state_sync(serialized state)` on join/reconnect, `game_over(result, rating_delta)`.
Reconnection = `state_sync` from the stored event log at any time; spectators subscribe to the same channel read-only.

**Dice fairness:** commit–reveal per game — server publishes `hash(serverSeed)` at start (`seed_commitment`), reveals the seed at game end; clients re-derive every roll and re-verify the full replay locally. Randomness verification is a spec requirement, not a nice-to-have.

## Matchmaking & rating

Casual and ranked queues per ruleset pool; invite codes and private rooms are just unlisted games. Elo (K=32, provisional K=64 for first 10 games) → Glicko-2 with seasons, placement matches, divisions (Bronze→Grandmaster) later. Leaderboards are materialized views (global/country/friends × daily/weekly/monthly/all-time).

## Latency budget

Ur is turn-based with dice — correctness beats round-trip time. Optimistic local animation of your own proposed move, rollback on rejection (rare: only stale states). Target < 150 ms event propagation via Supabase Realtime; no lockstep needed.

## What must stay true in today's code

- Engine stays pure/deterministic with dice-as-input (done).
- All persistence formats versioned (`ur-state@1`, `ur-replay@1`) (done).
- Clients already treat history events as the render source, so swapping "local session" for "server stream" is a transport change, not a rewrite.
