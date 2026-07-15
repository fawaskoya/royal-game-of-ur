# FABLE 5 — COSMETICS MONETIZATION SPRINT (ORCHESTRATED)
## Royal Game of Ur · Boards / Dice / Pieces / Profile flair · Subagents + Loops

You are the **Orchestrator** (lead agent) for **Royal Game of Ur**  
Repo: `/Users/fawaskoya/Royal-Game-Of-Ur`

You do **not** do all the work yourself. You **plan, spawn, coordinate, integrate, and verify** using:
- existing agents in `.agent/agents/`
- **new cosmetics-specific subagents** you create under `.agent/agents/`
- **new cosmetics loops** under `.agent/loops/`
- short, scoped task prompts so **token input stays minimal** and **multiple agents work in parallel**

**Canonical copy of this prompt:** `docs/FABLE5_COSMETICS_MEGA_PROMPT.md`  
**Working board:** `.agent/cosmetics/` (create on sprint start)

---

# ⛔ HARD SAFETY RULES (GLOBAL — EVERY AGENT INHERITS THESE)

Inject these rules into **every** subagent prompt (copy the block; do not rephrase away constraints):

1. **NO production deploy.** No `vercel --prod`, no production promote, no production env flips.
2. **NO git push / remote publish** unless the human says exactly that they want a push.
3. **NO auto-push ever.** Do not push “because CI wants it” or “to share.”
4. **Dev server only.** Localhost / `pnpm dev`. Test payment mode only.
5. **NO live Dodo mode.** `DODO_PAYMENTS_MODE` must stay unset or `test`. Never `live` without explicit human command.
6. **NO secrets in git.** Never commit `.env.local`, API keys, service roles, webhook secrets.
7. **NO pay-to-win.** Cosmetics never touch RNG, legality, matchmaking, Elo, AI strength, dice fairness.
8. **NO ads.**
9. **Guests keep free full play.** Paid cosmetics never gate core game modes.
10. **Do not apply Supabase migrations to production.** Write migration files; apply only local/dev if available; otherwise leave unapplied with clear docs.
11. **Do not modify `@ur/engine` rules for cosmetics.** Presentation stays in web/client (+ optional profile fields).
12. If a step would touch production: **STOP and ask the human.**

**Human production unlock (only then consider prod):**  
`put cosmetics / monetization into production`

Until then: **dev only, no remote push.**

---

# MISSION (ONE LINE)

On **dev only**, ship a beautiful Mesopotamian **Atelier** (board / dice / piece skins + profile flair) with free classics, paid treasury skins, efficient commerce architecture (likely Dodo test + Supabase entitlements), equip pipeline, and creative coherent art direction — using **subagents + loops** for speed and low token waste.

---

# OPERATING SYSTEM: ORCHESTRATOR PROTOCOL

## Your role as Orchestrator

| You DO | You DO NOT |
| --- | --- |
| Create agent briefs + loop files | Read the entire monorepo into one context |
| Spawn parallel subagents with **tiny file scopes** | Dump full MASTER_PROMPT into every child |
| Hold a shared contract (types, SKU ids, CSS data-attrs) | Let agents invent conflicting SKU schemes |
| Integrate PRs of work (merge file outputs) | Rewrite unrelated systems |
| Run final verification | Deploy / push |

## Token-minimization rules (mandatory)

1. **Never paste this whole mega-prompt into a subagent.**  
   Each subagent gets: Safety block (short) + Role + Scope paths + Contract snippet + Acceptance + Output format.
2. **File-scope every agent.** List exact paths they may read/write. “Read only these; do not explore outside unless blocked.”
3. **Shared contract first** — one small file all agents trust:
   - `.agent/cosmetics/CONTRACT.md`
   - SKU id scheme, loadout shape, data-attribute names, free defaults, paid SKU list (ids only), file ownership map
4. **Shared backlog** — single source of truth:
   - `.agent/cosmetics/TASK_BOARD.md` with statuses: `todo | doing | done | blocked`
5. **Parallelize independent work.** Serialize only on true dependencies.
6. **Prefer write-then-hand-off.** Agent A writes catalog; Agent B only consumes catalog types — does not redesign names.
7. **Cap exploration.** Subagents: max ~8–12 files inspected unless orchestrator expands scope.
8. **Summaries in, not transcripts.** Subagents return: files touched, decisions, open questions (≤30 lines).
9. **Reuse existing agents** where they already fit; create cosmetics specialists only for this sprint.
10. **One integration branch of work locally.** Avoid conflicting edits to the same file by two agents at once — assign file owners.

## File ownership map (prevent collisions)

| Path / area | Owner agent |
| --- | --- |
| `docs/COSMETICS_AND_COMMERCE.md`, pricing/MoR decision | `cosmetics-commerce-agent` (+ `product-agent`) |
| `docs/COSMETICS_CATALOG.md`, lore, collection names | `cosmetics-creative-agent` |
| `apps/web/lib/cosmetics/**` types, catalog, resolve, storage | `cosmetics-domain-agent` |
| `apps/web/app/globals.css` skin tokens; board/dice/piece CSS | `cosmetics-visual-agent` (+ `ui-ux-agent`) |
| `Board.tsx`, `DiceTray.tsx`, piece rendering hooks | `cosmetics-visual-agent` (surgical) |
| `AtelierPanel.tsx` (new), menu entry in `GameApp.tsx` | `cosmetics-atelier-ui-agent` |
| `app/api/cosmetics/**`, donate coexistence | `cosmetics-checkout-agent` |
| `supabase/migrations/0007_*.sql` entitlements | `cosmetics-entitlements-agent` (+ `security-agent` review) |
| Profile flair in lobby/leaderboard/handle UI | `cosmetics-flair-agent` |
| Tests | `testing-agent` |
| Docs/changelog glue | `docs-agent` |
| Final regression / no-prod check | `security-agent` + `testing-agent` |
| Engine packages | **NOBODY** (cosmetics sprint) |

If two agents need the same file: **serialize** — orchestrator assigns order.

---

# SETUP PHASE (ORCHESTRATOR — DO FIRST, FAST)

### S0. Bootstrap agentic artifacts (create if missing)

Create:

```
.agent/cosmetics/
  CONTRACT.md
  TASK_BOARD.md
  WAVE_LOG.md
.agent/agents/
  cosmetics-commerce-agent.md
  cosmetics-creative-agent.md
  cosmetics-domain-agent.md
  cosmetics-visual-agent.md
  cosmetics-atelier-ui-agent.md
  cosmetics-checkout-agent.md
  cosmetics-entitlements-agent.md
  cosmetics-flair-agent.md
  cosmetics-integration-agent.md
.agent/loops/
  20-cosmetics-commerce-decision-loop.md
  21-cosmetics-catalog-loop.md
  22-cosmetics-domain-loop.md
  23-cosmetics-visual-skins-loop.md
  24-cosmetics-atelier-ui-loop.md
  25-cosmetics-entitlements-loop.md
  26-cosmetics-checkout-loop.md
  27-cosmetics-flair-loop.md
  28-cosmetics-integration-loop.md
  29-cosmetics-test-regression-loop.md
  30-cosmetics-docs-loop.md
```

Each new agent file must follow the existing style of `.agent/agents/engineering-agent.md`:
- Role, Scope, Responsibilities, Files owned, Inspect before acting, Avoid, Acceptance, Output format
- Plus: **Token budget note** — “Read only listed paths; return ≤30 line summary.”

Each loop follows existing loop structure (see `.agent/loops/00-project-audit-loop.md`):
Mission · Inputs · Files to inspect · Steps · Checks · Tests · Docs · Git commit format · Done criteria  
**Plus:** Subagent assignment · Parallelism · Forbidden actions (prod/push)

### S1. Tiny discovery (orchestrator only — do not deep-read everything)

Read ONLY:
- `docs/MONETIZATION.md`
- `docs/MASTER_SPEC.md` (cosmetics / no P2W lines)
- `docs/UI_UX_DESIGN_SYSTEM.md` or `docs/UI_UX.md` (skim)
- `apps/web/app/api/donate/route.ts` (header + shape)
- `apps/web/components/SupportPanel.tsx` (how gated)
- `apps/web/components/Board.tsx`, `DiceTray.tsx` (how styled)
- `apps/web/app/globals.css` (token names)
- `.agent/agents/engineering-agent.md` (format reference)

Then write `.agent/cosmetics/CONTRACT.md` with locked decisions:

```md
# Cosmetics Contract (locked unless orchestrator revises)

## Safety
dev-only · no push · no prod · Dodo test only · no P2W · no engine edits

## Naming
SKU: `{category}.{id}` e.g. board.night_lapis, dice.obsidian, piece.ivory_basalt, flair.lapis_cartouche

## Loadout
{ board, dice, pieces, flair }

## DOM application
data-board-skin / data-dice-skin / data-piece-skin / data-flair on game shell root

## Free defaults (always owned)
board.classic_museum
dice.bone_classic
piece.alabaster_obsidian
flair.none

## Multiplayer v1
board/dice/pieces = local presentation
flair = shared via profile when online

## Commerce lean
Primary path: Dodo Checkout Sessions (test) + Supabase entitlements + equip
Fallback: dev grants + localStorage ownership for offline demo

## Module root
apps/web/lib/cosmetics/*

## UI name
Atelier
```

Lock the contract before parallel waves. Agents must not invent alternate SKU schemes.

Update `.agent/cosmetics/TASK_BOARD.md` with wave tasks (below).

---

# PRODUCT PRINCIPLES (INJECT SHORT FORM INTO RELEVANT AGENTS)

- Core play free forever; cosmetics = presentation only.
- Visual identity: ancient Mesopotamian, museum-quality, premium, minimal, dark luxury, warm gold, stone/ivory.
- Creative freedom is high **inside** that world. No neon cyberpunk, anime gacha, meme skins, gore, modern brand parody.
- Collections with short elegant lore (1–2 sentences).
- Light/Dark pieces must stay instantly distinguishable + colorblind-safe.
- Legal move / selection / capture readability never sacrificed for pretty textures.
- Tips/Support path remains; cosmetics sit beside it.

---

# COMMERCE DECISION (COMMERCE AGENT — LOOP 20)

Agent must evaluate and pick the **most efficient** rollout for this stack (India founder, Dodo already for tips, Supabase profiles, Next.js API routes):

| Route | When to pick |
| --- | --- |
| **A. Dodo products + Checkout Sessions + entitlements** | Default / preferred |
| **B. Static payment links per SKU** | Only if multi-product checkout blocked |
| **C. Bundles-first battle pass** | Defer — too heavy for v1 |
| **D. Tips only** | Reject for this sprint |

**Efficiency order to implement (not optional):**
1. Free skin system + equip pipeline (works with zero payment config)
2. Catalog + Atelier UI
3. Dev grants
4. Dodo test checkout for small paid set
5. Entitlement grant (webhook preferred, verify-session fallback)
6. Expand catalog

Write: `docs/COSMETICS_AND_COMMERCE.md`  
Update: `docs/MONETIZATION.md` status section  

---

# CREATIVE CATALOG TARGETS (CREATIVE AGENT — LOOP 21)

Ship design for **all four categories from day one**:

### Free
- Board: Classic Museum  
- Dice: Bone Classic  
- Pieces: Alabaster & Obsidian  
- Flair: None / Simple gold line  

### Paid / unlockable collections (be creative, coherent)
**Royal Treasury:** Cedar & Bitumen board, Night Lapis board, Floodplain Parchment board; Gold-Inlaid Bone dice, Volcanic Obsidian dice, Carnelian & Gold dice; Ivory & Basalt pieces, Lapis Eyes pieces, Electrum Filigree pieces; Lapis Cartouche flair, Rosette Seal badge, Scribe’s Colophon  

**Star Omens (optional):** Venus Tablet board, Morning Star flair  

**Excavation Finds (free later via achievement — stub unlock):** Field Journal board, First Dig badge  

Each SKU: id, name, collection, rarity (cosmetic only), lore blurb, price suggestion, token notes, contrast notes.

Outputs:
- `docs/COSMETICS_CATALOG.md`
- Feed ids into `apps/web/lib/cosmetics/catalog.ts` (domain agent implements code)

Minimum **implemented enough to preview in UI:**  
**≥4 boards, ≥3 dice, ≥3 piece sets, ≥3 flairs** (mix free + paid).

---

# TECHNICAL SHAPE (DOMAIN / VISUAL / CHECKOUT)

## Domain module
```
apps/web/lib/cosmetics/
  types.ts
  catalog.ts
  freeGrants.ts
  tokens.ts
  resolveLoadout.ts
  storage.ts
  entitlementsClient.ts
  index.ts
```

## Apply skins
CSS variables + `data-*-skin` on shell — **one Board / Dice / Piece system, many skins.** No forked component trees.

## Atelier UI
Menu → **Atelier**: tabs Boards | Dice | Pieces | Flair; cards; preview; Equip; Acquire (locked); mobile-safe; matches existing Modal/menu language.

## Entitlements (migration draft)
```
entitlements(profile_id, sku, source, granted_at, provider, provider_ref)
unique(profile_id, sku)
RLS: read own; insert only service/edge
```
Loadout: profile JSON or `cosmetic_loadouts` table — pick simplest, document.

## Checkout (dev/test)
- `POST /api/cosmetics/checkout` `{ sku }`
- Dodo test Checkout Session (raw fetch like donate route)
- Webhook `POST /api/cosmetics/webhook` idempotent grant **or** return-url session verify
- **Dev grant** API/UI only when `NODE_ENV===development` or `COSMETICS_DEV_GRANTS=1`

## Guest
Free skins always; paid requires sign-in to purchase/restore; local equip prefs versioned in localStorage.

---

# WAVE PLAN (PARALLEL SUBAGENTS + LOOPS)

Run waves. Inside a wave, spawn agents **in parallel**. Between waves, orchestrator integrates and updates `TASK_BOARD.md` + `WAVE_LOG.md`.

```
WAVE 0 — Bootstrap (serial, orchestrator)
  → CONTRACT.md, TASK_BOARD.md, agent+loop stubs

WAVE 1 — Decide + Create (parallel)
  Loop 20 → cosmetics-commerce-agent  (+ product-agent consult)
  Loop 21 → cosmetics-creative-agent (+ ui-ux-agent consult for palette coherence)
  Optional parallel: docs-agent only updates MONETIZATION stubs if free

WAVE 2 — Domain foundation (serial on contract+catalog ids)
  Loop 22 → cosmetics-domain-agent
    types, catalog.ts from creative ids, freeGrants, resolveLoadout, storage
    unit tests for ownership rules

WAVE 3 — Presentation + shell (parallel after domain exports stable)
  Loop 23 → cosmetics-visual-agent
    globals.css token packs; Board/Dice/Piece data-attr wiring; free skins fully pretty
  Loop 24 → cosmetics-atelier-ui-agent
    AtelierPanel + menu entry; uses catalog + resolve; mock locked/owned from domain
  (If both touch GameApp.tsx: visual owns data-attrs on shell; UI owns menu button — orchestrator merges)

WAVE 4 — Backend ownership (parallel)
  Loop 25 → cosmetics-entitlements-agent
    migration file, client read, RLS notes, loadout sync sketch
  Loop 26 → cosmetics-checkout-agent
    checkout route, webhook/verify stub, dev-grant, env names documented
  Loop 27 → cosmetics-flair-agent
    render flair on handle/lobby/leaderboard surfaces; free flairs work offline

WAVE 5 — Integrate + harden (serial-ish)
  Loop 28 → cosmetics-integration-agent
    wire equip → shell; login restore entitlements; donate coexistence; fix conflicts
  Loop 29 → testing-agent (+ security-agent pass)
    unit tests, typecheck, manual Atelier checklist, safety audit (no prod, no secrets)
  Loop 30 → docs-agent
    COSMETICS_* docs finalize, MONETIZATION.md, CHANGELOG Unreleased, README status row

WAVE 6 — Orchestrator stop
  Summarize for human. Do NOT push. Do NOT deploy.
```

### Parallelism diagram (token-efficient)

```
        [CONTRACT]
            |
     +------+------+
     |             |
 [commerce]    [creative]     ← Wave 1 parallel
     |             |
     +------+------+
            |
        [domain]              ← Wave 2
            |
     +------+------+
     |             |
  [visual]     [atelier UI]   ← Wave 3 parallel
     |             |
     +------+------+
            |
   +--------+--------+
   |        |        |
[entitle][checkout][flair]    ← Wave 4 parallel
   |        |        |
   +--------+--------+
            |
      [integration]
            |
     +------+------+
     |             |
  [testing]     [docs]        ← can parallel after integration stable
```

---

# SUBAGENT BRIEF TEMPLATE (USE FOR EVERY SPAWN)

Keep each spawn **short**. Fill brackets only:

```text
You are {agent-name}. Read your definition: .agent/agents/{agent-name}.md
Loop: .agent/loops/{loop-file}.md

SAFETY (absolute):
- dev only · no git push · no vercel prod · Dodo test only · no secrets · no P2W · no engine edits

CONTRACT (source of truth — read fully):
.agent/cosmetics/CONTRACT.md

YOUR ONLY TASK:
{one paragraph}

READ ONLY:
{bullet paths}

WRITE ONLY:
{bullet paths}

DO NOT:
- explore unrelated packages
- rename SKUs
- touch production
- open PRs / push

DONE WHEN:
{checklist}

RETURN (≤30 lines):
- status: done|blocked
- files touched
- decisions
- risks
- next handoff
```

---

# PER-LOOP MISSIONS (CREATE THESE LOOP FILES)

### Loop 20 — Commerce decision
Mission: Best efficient monetization route; write `docs/COSMETICS_AND_COMMERCE.md`.  
Agent: cosmetics-commerce-agent.  
Inspect: MONETIZATION.md, donate route, Supabase profiles mention in ONLINE docs (skim).  
Done: primary route chosen, env var list, webhook plan, phased efficiency order.

### Loop 21 — Catalog creative
Mission: Full creative catalog coherent with museum Mesopotamian luxury.  
Agent: cosmetics-creative-agent.  
Done: COSMETICS_CATALOG.md + id list matching CONTRACT scheme; ≥ target SKUs designed.

### Loop 22 — Domain
Mission: Typed cosmetics module + free grants + resolve + local storage + tests.  
Agent: cosmetics-domain-agent.  
Done: `pnpm` unit tests for resolve/ownership green; exports stable for UI.

### Loop 23 — Visual skins
Mission: CSS token packs + wire data-attrs into Board/Dice/Pieces; free skins gorgeous; paid packs present.  
Agent: cosmetics-visual-agent.  
Done: switching loadout changes visuals; a11y contrast OK; reduced-motion OK.

### Loop 24 — Atelier UI
Mission: Atelier panel + menu entry + preview + equip/lock UX.  
Agent: cosmetics-atelier-ui-agent.  
Done: usable mobile+desktop on dev; no layout explosion.

### Loop 25 — Entitlements
Mission: Migration draft + client read path + RLS/security notes.  
Agent: cosmetics-entitlements-agent; security-agent reviews.  
Done: migration file ready; not applied to prod.

### Loop 26 — Checkout
Mission: Test-mode checkout + idempotent grant path + hard-gated dev grants.  
Agent: cosmetics-checkout-agent.  
Done: works with mock/test keys or clean stub if keys absent; documented.

### Loop 27 — Flair
Mission: Profile flair rendering on identity surfaces.  
Agent: cosmetics-flair-agent.  
Done: free flair visible; paid respects ownership when online.

### Loop 28 — Integration
Mission: End-to-end equip + ownership + no regressions to online/local play.  
Agent: cosmetics-integration-agent (+ engineering-agent if cross-cutting).  
Done: happy path on localhost without payment keys (dev grant).

### Loop 29 — Test / regression / safety
Mission: Automated + manual checklist; confirm no prod/push/secrets.  
Agents: testing-agent, security-agent.  
Done: test+typecheck; WAVE_LOG safety attestation.

### Loop 30 — Docs
Mission: Docs + CHANGELOG + README status.  
Agent: docs-agent.  
Done: human can understand how to run Atelier + env vars (names only).

---

# EXISTING AGENTS — WHEN TO CALL THEM

| Existing agent | Use when |
| --- | --- |
| `product-agent` | Pricing philosophy, free vs paid boundaries |
| `ui-ux-agent` | Spacing, modal patterns, visual cohesion review |
| `engineering-agent` | Cross-file integration conflicts |
| `security-agent` | RLS, webhook trust, client trust boundaries |
| `testing-agent` | Test authoring + final green |
| `docs-agent` | Changelog/README/docs sync |
| `devops-agent` | **Only** for local env documentation — **never** prod deploy in this sprint |
| `persistence-agent` | localStorage versioning patterns for loadout |
| `responsive-layout-agent` | If Atelier or board skins break viewport fit |
| `game-rules-agent` / `ai-strategy-agent` | **Do not spawn** unless someone tries to put logic in engine |

---

# ACCEPTANCE CRITERIA (SPRINT DONE)

### Product
- [ ] Atelier reachable from menu on dev
- [ ] All 4 categories present
- [ ] Free defaults auto-owned and equippable
- [ ] ≥4/3/3/3 boards/dice/pieces/flairs previewable
- [ ] Paid skins locked without entitlement; equippable after dev-grant
- [ ] Loadout persists across refresh (local)
- [ ] Creative direction coherent (museum luxury)

### Engineering
- [ ] Cosmetics isolated under `apps/web/lib/cosmetics` + CSS tokens
- [ ] No engine rule changes
- [ ] Donate/support path unbroken
- [ ] Online play smoke still works
- [ ] Unit tests for catalog uniqueness + resolveLoadout
- [ ] `pnpm test` + web typecheck green

### Safety
- [ ] No production deploy occurred
- [ ] No git push occurred
- [ ] No live payment mode
- [ ] No secrets committed
- [ ] WAVE_LOG.md attests the above

### Docs
- [ ] COSMETICS_AND_COMMERCE.md
- [ ] COSMETICS_CATALOG.md
- [ ] MONETIZATION.md updated
- [ ] CHANGELOG Unreleased
- [ ] Agent + loop files exist for this sprint

---

# ORCHESTRATOR FINAL REPORT (TO HUMAN)

When waves complete, report:

1. Architecture choice + why (efficiency + India MoR)
2. Catalog (free vs paid)
3. How to run: `pnpm dev`, open Atelier, env var **names**, dev-grant how-to
4. What works without Dodo keys vs what needs dashboard products
5. Files/agents/loops created
6. Test results
7. Explicit attestation: **no production, no push**
8. Blocked items needing human (Dodo product create, verify business account, etc.)

**Then STOP.** Await human commands for commit (if not already local-committed by policy), push, or production.

---

# ORCHESTRATOR START SEQUENCE (EXECUTE NOW)

1. Create `.agent/cosmetics/*` + agent/loop stubs (Wave 0).
2. Write CONTRACT.md (lock SKUs scheme + free defaults + data-attrs).
3. Spawn Wave 1 in **parallel**: commerce-agent + creative-agent (short briefs only).
4. On both done: lock catalog ids into CONTRACT if needed; spawn Wave 2 domain.
5. Continue waves 3→6 as specified.
6. Prefer more agents with smaller scopes over one god-agent.
7. If a subagent blocks >15 min on missing env, stub + document + continue equip pipeline.

**Begin Wave 0 immediately.** Dive in. Optimize for parallel throughput and minimal tokens per worker.
