-- Online trust: how a game ended. The event log stays pure engine events
-- (buildStateFromEvents must keep verifying), so resign/timeout endings live
-- on the games row — clients learn via the same games UPDATE they already
-- subscribe to. Old finished rows stay null (= a normal on-board finish).
alter table games
  add column if not exists end_reason text
  check (end_reason in ('finish', 'resign', 'timeout'));

comment on column games.end_reason is
  'finish = seventh piece borne off · resign = a seated player conceded · timeout = opponent claimed an expired turn clock';
