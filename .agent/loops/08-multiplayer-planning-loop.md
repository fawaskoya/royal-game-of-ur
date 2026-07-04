# Multiplayer Planning Loop

## Mission
Prepare online play architecture without destabilizing local play: docs, trust boundaries, and
interface stubs only — no live networking until a backend decision is made. Agents:
`engineering-agent` + `security-agent`.

## Inputs
Phase 7 spec in `/MASTER_PROMPT.md`; `docs/ONLINE_ARCHITECTURE.md` (server-authoritative plan,
commit–reveal dice already designed); `docs/MASTER_SPEC.md` gating ("online only after local
play is excellent").

## Files to inspect
`docs/ONLINE_ARCHITECTURE.md`, engine serialization + replay verification (the anti-cheat
foundation), `docs/MULTIPLAYER_ARCHITECTURE.md` (once created).

## Steps
1. Define `MultiplayerTransport` interface types (connect/disconnect/sendMove/onMove/
   onPlayerJoined/onPlayerLeft) in a types-only module — compiled, unused by the game yet.
2. Evaluate backends against the stack (Supabase Realtime, Firebase, plain WebSocket,
   Socket.io, PartyKit, Cloudflare Durable Objects) — pros/cons/cost table; recommend one.
   Note: docs/ONLINE_ARCHITECTURE.md already leans Supabase — reconcile, don't duplicate.
3. Specify the MVP: private room + invite code, two players, reconnect, server-side move
   validation via the engine, minimal/no chat.
4. Write the trust-boundary statement: server validates dice (commit–reveal), legality, turn
   order, results; client is presentation only.
5. Explicitly list what is **not** being built yet and why.

## Checks
No networking code reachable from the game; types compile; recommendation grounded in the
actual stack (Next.js, no backend today); every trust claim maps to an engine capability.

## Tests to run
`pnpm typecheck` · `pnpm --filter @ur/web build` (stubs must not enter the bundle meaningfully).

## Documentation to update
`docs/MULTIPLAYER_ARCHITECTURE.md` (plan, backend comparison, MVP phases, trust boundaries),
`.agent/DECISIONS.md` (backend recommendation), `.agent/CHANGELOG.md`.

## Git commit format
`docs: multiplayer architecture plan` / `feat(web): multiplayer transport interfaces (types only)`

## Done criteria
A future implementer could start the MVP from the doc alone; security agent has signed off on
the trust model; local game byte-identical in behavior.
