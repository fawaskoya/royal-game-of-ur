# Cosmetics Sprint — Wave Log

## Wave 0 — Bootstrap (orchestrator) — 2026-07-11 · DONE

Created:
- `.agent/cosmetics/CONTRACT.md` — locked: SKU scheme + full id list, loadout shape,
  data-attr mechanism (mirrors existing `data-theme` on `<html>`), overridable token surface
  (+ new indirection tokens `--rosette-ink`, `--die-face/edge/pip`), readability invariants,
  ownership/resolve model, `ur:cosmetics` storage shape, commerce lean, file ownership map,
  verified grounding facts (CSS hooks, ThemeEffect/settings/donate patterns).
- `.agent/cosmetics/TASK_BOARD.md` — waves 1-6 with per-loop tasks.
- 9 agent definitions in `.agent/agents/` (commerce, creative, domain, visual, atelier-ui,
  checkout, entitlements, flair, integration) — existing engineering-agent format + safety
  block + token budget.
- 11 loop files `.agent/loops/20...30` — existing loop format + Subagent assignment /
  Parallelism / Forbidden actions sections.

Discovery notes (orchestrator, small reads only): board/dice/piece styling is already fully
token-driven except rosette ink + die face colors (hence the indirection tokens); theme
mechanism (`ThemeEffect` -> `data-theme` on `<html>` -> `:root[...]` overrides) is the exact
template for skin application; settings.ts is the storage template; donate route is the
checkout template; MASTER_SPEC line ~55 sanctions cosmetics, never P2W.

### Safety attestation (Wave 0)
- No production deploy. No `vercel` invocations.
- No `git push`. (No commits made either — files in working tree only; human decides.)
- No payment mode changes; no env files touched.
- No secrets written anywhere.
- No engine (`packages/*`) files touched.

Next: Wave 1 (parallel: Loop 20 commerce + Loop 21 catalog) — awaiting orchestrator go.

## Wave 1 — Decide + Create (parallel) — 2026-07-11 · DONE

- Loop 20 (commerce): Route **A confirmed** — Dodo Checkout Sessions + Supabase entitlements.
  Amendments (with rationale): SKU→product mapped by **price tier** (4 Dodo products via
  `DODO_COSMETICS_PRODUCT_MAP` JSON env, not 14 per-SKU products); **verify-on-return first**,
  webhook deferred to expand phase (no webhook precedent in repo to ground against).
  Env names: DODO_PAYMENTS_API_KEY (reuse), DODO_PAYMENTS_MODE (test/unset),
  COSMETICS_DEV_GRANTS (new), DODO_COSMETICS_PRODUCT_MAP (new). Human questions in doc §9.
- Loop 21 (creative): `docs/COSMETICS_CATALOG.md` — 20/20 locked SKUs, collections Museum
  Classics/Royal Treasury/Star Omens/Excavation Finds, rarity ladder
  Classic/Treasured/Exalted/Omen/Relic, prices $1.99–$4.99 (flair cheapest, boards top),
  free skins = verbatim current :root values, piece-skin contrast notes ≥69pt gaps.
  Palette risks handed to visual agent: venus_tablet rosette-ink light-on-light; pip
  legibility at ~24px; lapis_eyes/electrum_filigree single-accent edges (intentional);
  night_lapis vs venus_tablet thumbnail similarity.

Safety: no commits, no push, no prod, docs only. Both agents stayed in scope.

## Wave 2 — Domain foundation — 2026-07-11 · DONE

Loop 22 (domain agent; agent's API connection dropped at the very end — orchestrator verified
and closed out): `apps/web/lib/cosmetics/` complete — types, catalog (20 SKUs via `sku()`
helper, category derived from id so it can't drift), freeGrants/DEFAULT_LOADOUT, fail-closed
resolveLoadout, versioned `ur:cosmetics` storage (+`ur:cosmetics-changed` event, injectable
StorageLike), tokens (attr mapping), entitlementsClient stub, named-exports barrel.
Verified by orchestrator: 15 new unit tests, web suite 46/46 green, typecheck green.
Safety: no commits/push/prod; engine untouched.

## Wave 3 — Presentation (parallel) — 2026-07-14 · DONE

- Loop 23 (visual): indirection tokens landed with pixel-identical defaults — notably
  `--die-face` uses `var(--die-face, url(#gradient))` fallback so the free die keeps its
  two-facet gradients exactly and skins collapse to flat color only when set. 11 skin blocks
  (5 board / 3 dice / 3 piece). All three flagged palette risks fixed with computed contrast
  (venus_tablet rosette-ink → #3d4460 ~7.1:1; gold_inlaid_bone pip → #6b4f1f ~5.75:1;
  venus_tablet tiles warmed away from night_lapis). Surgical var swaps in Board/DiceTray only.
- Loop 24 (atelier-ui): AtelierPanel (tabs w/ tablist semantics, swatch previews from catalog
  hexes, equip/equipped/locked states, inner scroll region, 390px-safe) + 6-line GameApp diff
  (button + state + mount). Donate/mode-cards untouched. Consumes only domain exports;
  ownership = FREE_GRANTS ∪ devGrants via resolveLoadout.
- Orchestrator integration check on combined tree: typecheck green · 46/46 tests · dev :3000
  200 · 11 skin selectors present · migrations 0001–0006 so 0007 free for Wave 4.
- Note: equipping in Atelier persists but won't restyle the board until Wave 5's
  CosmeticsEffect stamps the data-attrs (by design).

Safety: no commits, no push, no prod. Earlier attempt of this wave died to session limits
BEFORE any writes (verified clean start).

## Waves 4+5 — Backend ownership + Integration (orchestrator inline) — 2026-07-14 · DONE

Context: all three Wave 4 subagents were killed by plan session limits BEFORE writing
(verified: only empty api/cosmetics dirs existed). Orchestrator implemented Loops 25–30
inline — same contract, same scopes.

- Loop 25: `supabase/migrations/0007_cosmetics_entitlements.sql` — entitlements table
  (pk profile_id+sku = idempotent grants; sku format CHECK; source enum; provider_ref index),
  RLS select-own with NO write policies (service-role-only, game_secrets pattern);
  `profiles.flair` additive column (+format CHECK) as the one shared cosmetic — rationale
  comment inline. **Written, NOT applied to any database.** entitlementsClient.ts real:
  fetchEntitlements (RLS read, [] all failure modes), saveSharedFlair (flair.none→null),
  fetchSharedFlair (batch, {} on failure).
- Loop 26: /api/cosmetics/checkout — tier-mapped (category+collection → adornment/
  vessel_bone/grand_board/star_omens; DODO_COSMETICS_PRODUCT_MAP env), REFUSES live mode,
  mints orderRef, test /checkouts per donate pattern. /verify — honest 501 citing the
  human-blocked Dodo retrieve-API confirmation (commerce doc §9). /dev-grant — 404 unless
  dev/COSMETICS_DEV_GRANTS=1, validates catalog+paid. lib/cosmetics/devGrants.ts client
  helper (+barrel export).
- Loop 27: Flair.tsx (glyph map, ≤1em, null-safe) + useOwnFlair (free∪dev immediately,
  server entitlements merged async, live on ur:cosmetics-changed). Wired: AuthPanel identity,
  OnlineRoomView "Playing as", RoomGameScreen subtitle. Leaderboard intentionally skipped —
  row query carries no flair field; no per-row fetches allowed (gap for a future query add).
- Loop 28: CosmeticsEffect (mirrors ThemeEffect) — stamps/removes the four data-attrs from
  resolveLoadout(loadCosmetics(), FREE∪dev∪server) on mount, ur:cosmetics-changed, and
  supabase onAuthStateChange; default sku ⇒ attribute absent (SSR/hydration-safe);
  publishes shared flair once per distinct value. Mounted in layout.tsx beside ThemeEffect.
- Loop 29 (verification):
  · typecheck: all workspaces clean
  · unit: engine 49/49 · ai 17/17 · web 46/46 (full-suite exit 0). One @ur/ai strength test
    observed flaky ONLY under parallel full-suite load in 2 of 4 runs (passes in isolation;
    pre-existing timing sensitivity; ai/engine untouched by sprint — recorded, not chased).
  · routes (dev): checkout unconfigured→clean 503; free sku→400; dev-grant paid→{granted},
    free→400, non-dev→404 by construction; verify→501; homepage 200 after all edits.
  · interactive click-through intentionally left to the human per their standing
    "don't test in Chrome, I review on dev" instruction. Script: menu→Atelier→equip a free
    board→board restyles live→refresh persists→(dev) grant paid via Atelier-adjacent
    devGrants→equip→restyles; Donate panel unaffected.
- Loop 30: MONETIZATION Atelier status; root CHANGELOG Unreleased entry; .agent/CHANGELOG
  sprint entry; README status row. CONTRACT amended: product-map line now names
  DODO_COSMETICS_PRODUCT_MAP (per commerce doc flag).
- Also: apps/web/vitest.config.ts added (@/ alias) — first runtime cross-lib import in the
  domain tests exposed that vitest had no alias config.

## Wave 6 — Sprint safety attestation (FINAL)
- NO production deploy at any point (no vercel invocations this sprint).
- NO git push. NO git commits — every change sits in the working tree for human review.
- NO live payment mode: cosmetics checkout hard-refuses DODO_PAYMENTS_MODE=live in code.
- NO secrets/env values written anywhere (names only, per docs).
- Migration 0007 NOT applied to any database.
- packages/* (engine, ai) untouched by the sprint.
