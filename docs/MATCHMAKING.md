# Matchmaking & accounts (v1)

Shipped on top of private rooms (Phase A).

## Product surface

| Entry | Behaviour |
|-------|-----------|
| **Find a match** | Casual Elo pool, global. Guests (anonymous) or signed-in. |
| **Private room** | 4-letter invite codes (unchanged). |
| **Account panel** | Guest handle, rename, email sign-up/sign-in, sign-out. |

## Auth

- Default online path: Supabase **anonymous** session (`ensureSession`).
- **Sign up / sign in**: email + password via Supabase Auth.
- Upgrading a guest: `updateUser({ email, password })` keeps the same `auth.users` id (ratings stay).
- Dashboard: enable **Email** and **Anonymous** providers.

## Matchmaking algorithm (Edge `game-move`)

Actions: `enqueue_match`, `poll_match`, `cancel_match`.

1. Upsert caller into `matchmaking_queue` with current casual rating.
2. Look for the oldest waiting opponent in the same pool whose rating is within  
   `±(200 + 25 × minutes_waiting)` (uncapped after 5 minutes).
3. Create a `games` row with both seats filled, `status=playing`, `match_pool='casual'`, `room_code=null`.
4. Claim both queue rows (`matched_game_id`); race losers roll back the orphan game.
5. Client opens the game via existing `SupabaseRoomTransport` (same roll/move path as private rooms).

Rating updates still run once at game finish (`applyRatings`).

## Schema

Migration `0005_matchmaking.sql`:

- `matchmaking_queue (profile_id, pool, rating, enqueued_at, matched_game_id)`
- `games.match_pool` (null = private invite)

## Deploy

```bash
# from repo root, with Supabase CLI logged in and project linked
supabase db push
supabase functions deploy game-move
```

Web: redeploy Vercel (`apps/web` root) with existing `NEXT_PUBLIC_SUPABASE_*` env.
