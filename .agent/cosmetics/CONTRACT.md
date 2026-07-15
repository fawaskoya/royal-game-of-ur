# Cosmetics Contract (locked — only the orchestrator revises this file)

Every cosmetics subagent reads this fully before acting. If your task conflicts with this
contract, stop and report `blocked` — do not invent alternatives.

## Safety (absolute, inherited by every agent)
dev only · no `git push` · no `vercel --prod` / no production env flips · Dodo **test** mode
only (`DODO_PAYMENTS_MODE` unset or `test`) · no secrets in git · no pay-to-win · no ads ·
guests keep free full play · no engine (`packages/*`) edits · migrations are **written, never
applied to production**.

## SKU scheme
`{category}.{snake_id}` — category ∈ `board | dice | piece | flair` (singular), id snake_case.
Examples: `board.night_lapis`, `dice.volcanic_obsidian`, `piece.ivory_basalt`,
`flair.lapis_cartouche`.

### Locked SKU ids (creative agent may add lore/pricing, NOT rename)
Free (auto-owned by everyone, forever):
- `board.classic_museum` · `dice.bone_classic` · `piece.alabaster_obsidian` · `flair.none`

Royal Treasury (paid):
- boards: `board.cedar_bitumen`, `board.night_lapis`, `board.floodplain_parchment`
- dice: `dice.gold_inlaid_bone`, `dice.volcanic_obsidian`, `dice.carnelian_gold`
- pieces: `piece.ivory_basalt`, `piece.lapis_eyes`, `piece.electrum_filigree`
- flair: `flair.lapis_cartouche`, `flair.rosette_seal`, `flair.scribes_colophon`

Star Omens (paid, optional this sprint): `board.venus_tablet`, `flair.morning_star`
Excavation Finds (free-by-achievement later; ship as locked stubs): `board.field_journal`,
`flair.first_dig`

## Loadout shape
```ts
interface CosmeticLoadout { board: SkuId; dice: SkuId; pieces: SkuId; flair: SkuId }
```
(Loadout key `pieces` is plural; the SKU category stays singular `piece.*`.)

## DOM application (mirrors the existing `data-theme` mechanism exactly)
A small client effect (like `ThemeEffect`) stamps attributes on `document.documentElement`:
`data-board-skin` · `data-dice-skin` · `data-piece-skin` · `data-flair`
(attribute value = the snake_id only, e.g. `data-board-skin="night_lapis"`).
CSS skins are token overrides: `:root[data-board-skin="night_lapis"] { --frame: …; --tile: …; }`
This skins every surface at once (menu vignette, game, tutorial, rooms, replay viewer). **No
forked component trees. No per-component skin props.**

### Token surface a skin may override (and nothing else)
- Board: `--frame`, `--frame-edge`, `--tile`, `--tile-lane`, `--tile-edge`, `--rosette-ink`*
- Pieces: `--light-piece`, `--light-piece-edge`, `--dark-piece`, `--dark-piece-edge`
- Dice: `--die-face`*, `--die-edge`*, `--die-pip`*
Tokens marked * do not exist yet — the visual agent introduces them in `globals.css` with
defaults equal to today's hard-coded values (zero visual change when unskinned), then skins
override them. Skins must **never** override page-chrome tokens (`--bg`, `--ink`, `--gold`,
`--bg-raised`, …): the rosette/pip color indirection exists precisely so `--gold` stays
untouched.

### Readability invariants (non-negotiable, checked in Loop 29)
- Light vs dark pieces stay instantly distinguishable; the structural shape markers in
  `PieceDisc` (light = solid dot, dark = ring) are never removed — skins recolor only.
- Legal-move halo, capture ring, last-move wash, hint ring keep ≥ current visibility on every
  skin (they use their own classes: `.piece-movable`, `.tile-target*`, `.tile-last`, `.piece-hint`).
- Both page themes (dark + parchment `data-theme="light"`) must stay readable under every skin.

## Ownership & resolve
`owned = FREE_GRANTS ∪ devGrants (dev-gated) ∪ serverEntitlements (signed-in)`.
`resolveLoadout(requested, owned)` falls back **per category** to the free default for any
un-owned SKU (fail-closed). Equipping never round-trips the server for free skins.

## Storage
localStorage key `ur:cosmetics`, versioned like `ur:settings`:
`{ version: 1, loadout: CosmeticLoadout, devGrants?: SkuId[] }` — validated on read, corrupt →
defaults. Change event `ur:cosmetics-changed` (mirror the settings pattern).

## Commerce lean (Loop 20 confirms or amends with rationale)
Primary: Dodo Checkout Sessions (test) via `POST /api/cosmetics/checkout { sku }` (raw fetch,
same style as `app/api/donate/route.ts`) + Supabase `entitlements` (migration `0007_*`, written
not applied) + idempotent grant (webhook preferred, verify-on-return fallback).
Fallback (no keys present): dev grants only — the entire equip pipeline must work with zero
payment config.
Dev grants gated: `NODE_ENV === "development" || COSMETICS_DEV_GRANTS === "1"`.
Env var **names** (values never committed): `DODO_PAYMENTS_API_KEY`, `DODO_PAYMENTS_MODE`
(stays `test`/unset), `COSMETICS_DEV_GRANTS`, `DODO_COSMETICS_PRODUCT_MAP` (tier-keyed JSON — mapping decided in Loop 20/26: 4 price-tier products, sku→tier derived from category+collection in the checkout route).

## Multiplayer v1
Board/dice/piece skins are **local presentation** (each player sees their own). Flair is the
only shared cosmetic: persisted with the profile, rendered on identity surfaces (lobby "Playing
as", room header, leaderboard rows) when online.

## Module root & UI name
`apps/web/lib/cosmetics/{types,catalog,freeGrants,tokens,resolveLoadout,storage,entitlementsClient,index}.ts`
Panel component: `apps/web/components/AtelierPanel.tsx` · Menu entry label: **Atelier**.

## File ownership (two agents never edit the same file in one wave)
| Path | Owner |
| --- | --- |
| `docs/COSMETICS_AND_COMMERCE.md`, `docs/MONETIZATION.md` status | commerce agent |
| `docs/COSMETICS_CATALOG.md` | creative agent |
| `apps/web/lib/cosmetics/**` | domain agent |
| `globals.css` skin tokens; `Board.tsx`/`DiceTray.tsx`/`PieceDisc` data-attr wiring | visual agent |
| `AtelierPanel.tsx`; menu button in `GameApp.tsx` | atelier-ui agent |
| `app/api/cosmetics/**` | checkout agent |
| `supabase/migrations/0007_*.sql`, `entitlementsClient.ts` review | entitlements agent |
| flair rendering in `AuthPanel`/`OnlineRoomView`/`LeaderboardPanel`/`RoomGameScreen` | flair agent |
| cross-file glue, conflicts | integration agent |
| `packages/**` (engine/ai) | **NOBODY** |

## Grounding facts (verified 2026-07-11, so agents don't re-discover)
- Board CSS lives at `globals.css` → `.board-frame` (+`::before` grain, `::after` inlay),
  `.tile`, `.tile-lane`, `.tile-rosette`; pieces `.piece`, `.piece-light`, `.piece-dark`;
  dice `.dice-tray`, `.die`; rosette glyph + piece markers are inline SVG/divs in `Board.tsx`
  (`RosetteGlyph`, `PieceDisc`) using `var(--gold)` / piece tokens.
- Theme mechanism to mirror: `ThemeEffect` stamps `data-theme` on `<html>`;
  `:root[data-theme="light"] { …token overrides… }` in `globals.css`.
- Settings storage pattern to mirror: `apps/web/lib/settings.ts` (versioned key, fail-safe
  read, window CustomEvent for live sync).
- Donate route pattern to mirror for checkout: `apps/web/app/api/donate/route.ts` (raw fetch,
  Dodo `/checkouts`, `test` default, 503 when unconfigured).
- MASTER_SPEC sanctions cosmetics as future revenue, never pay-to-win (line ~55).
