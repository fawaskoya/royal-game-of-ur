# Cosmetics Catalog

Creative catalog for every locked SKU in `.agent/cosmetics/CONTRACT.md`. This document is the
source of truth for **names, collections, rarity labels, lore, prices, and per-token hex
suggestions** — the visual agent should be able to implement every skin directly from the entries
below without inventing anything. SKU ids are locked and reproduced verbatim; nothing here renames
or adds an id.

## Direction

Museum-Mesopotamian luxury, full stop: dark wood, ivory, lapis lazuli, carnelian, electrum,
bitumen — the display case at the British Museum, not a fantasy-game shop. Every name and lore
line leans on real Ur/Sumerian material culture (the actual Royal Game of Ur boards, the royal
tombs Leonard Woolley excavated at Ur, the Venus Tablet of Ammisaduqa) without claiming to be a
literal history lesson — soft hedges ("as if," "in the manner of," "named for") keep it playful.
Hard avoid list: neon, cyberpunk, anime, meme, gore, modern-brand color language. Nothing below is
pay-to-win — every SKU is presentation only.

## Rarity ladder

Each collection gets its own rarity word so the ladder reads as coherent, not arbitrary:

| Rarity | Collection | Meaning |
| --- | --- | --- |
| Classic | Museum Classics | The permanent free baseline everyone owns |
| Treasured | Royal Treasury (standard) | Paid, the everyday luxury tier |
| Exalted | Royal Treasury (flagship) | Paid, one flagship item per category (board/dice/piece) |
| Omen | Star Omens | Paid, optional, celestial/astrology theme |
| Relic | Excavation Finds | Free-by-achievement later; shipped this sprint as locked stubs |

## Token compliance (read before implementing)

- Board skins may only set `--frame`, `--frame-edge`, `--tile`, `--tile-lane`, `--tile-edge`,
  `--rosette-ink`. Piece skins only `--light-piece`, `--light-piece-edge`, `--dark-piece`,
  `--dark-piece-edge`. Dice skins only `--die-face`, `--die-edge`, `--die-pip`. **No entry below
  touches `--bg`, `--ink`, `--gold`, `--gold-bright`, `--gold-soft`, `--gold-faint`, `--ink-dim`,
  `--bg-raised`, `--danger`, or `--danger-soft`.**
- `--light-piece(-edge)` / `--dark-piece(-edge)` already exist in `globals.css` today — no new
  token needed for pieces.
- `--rosette-ink` (board) and `--die-face` / `--die-edge` / `--die-pip` (dice) do **not** exist yet
  (contract marks them `*`). The visual agent introduces them with defaults equal to today's real
  hardcoded look (zero visual change unskinned). The values given below for the two free entries
  (`board.classic_museum`'s `--rosette-ink`, all of `dice.bone_classic`) are this catalog's best
  match to the existing palette family (gold rosette, ivory/bone die, dark ink pip) — **the visual
  agent should confirm against the actual current hardcoded values and use those instead if they
  differ even slightly**, since the whole point of these two entries is zero visual drift.
- Selector shape (mirrors `data-theme`): `:root[data-board-skin="cedar_bitumen"] { --frame: …; }`,
  `:root[data-piece-skin="ivory_basalt"] { --light-piece: …; }`,
  `:root[data-dice-skin="volcanic_obsidian"] { --die-face: …; }`. The attribute value is always the
  SKU's snake_id (the part after the dot).
- Flair (`flair.*`) has **no CSS token surface** in the contract — it renders as a small glyph/icon
  on identity surfaces (lobby "Playing as," room header, leaderboard row), not a board/dice/piece
  skin. Entries below give a motif description and a color *language* (often reusing existing
  tokens like `--gold` or a hue already established by a paired board/piece skin) instead of hex
  token overrides, since none are contractually available to override.

---

## Museum Classics (free — auto-owned forever)

The baseline. Every hex below is copied verbatim from the current `:root` block in
`apps/web/app/globals.css` — this collection documents today's look, unchanged.

### `board.classic_museum` — Museum Standard
- **Collection:** Museum Classics · **Rarity:** Classic · **Price:** Free (auto-owned)
- **Lore:** The board exactly as it has always stood in the case — dark-varnished frame, ivory
  tile-plaques, a bronze-gold inlay line. No provenance claim, just the house mount every visitor
  sees first.
- **Tokens:** `--frame: #1a1610` · `--frame-edge: #8a6f3a` · `--tile: #e3d6ba` ·
  `--tile-lane: #eadfc6` · `--tile-edge: #b3a37e` · `--rosette-ink: #c9a24b` (net-new token;
  default equals current `--gold`, so the rosette glyph's color is unchanged)
- **Readability:** Benchmark pairing every other board is measured against; frame/tile/lane keep
  their current separation in both page themes.

### `dice.bone_classic` — Bone Pyramids
- **Collection:** Museum Classics · **Rarity:** Classic · **Price:** Free (auto-owned)
- **Lore:** Four-sided dice cut from plain bone, the everyday material of the tomb finds — no
  gilding, no stone, just honest ivory-white pyramids tumbling the pit.
- **Tokens (suggested default, see compliance note above):** `--die-face: #e3d6ba` ·
  `--die-edge: #8a6f3a` · `--die-pip: #1a1610`
- **Readability:** Dark ink pip on a pale bone face is the highest-contrast pairing in the whole
  catalog by design — it's the reference every paid die is checked against.

### `piece.alabaster_obsidian` — Alabaster & Obsidian
- **Collection:** Museum Classics · **Rarity:** Classic · **Price:** Free (auto-owned)
- **Lore:** Light pieces in banded alabaster, dark pieces in polished obsidian — the pairing found
  in the simplest surviving gaming sets, chosen for contrast over ornament.
- **Tokens:** `--light-piece: #f3ead3` · `--light-piece-edge: #6b5b38` ·
  `--dark-piece: #2e2a26` · `--dark-piece-edge: #c9a24b`
- **Contrast note:** Light face ~92% average brightness vs. dark face ~17% — an enormous, unmissable
  gap. This is the baseline every other piece skin is checked against below. The engine's
  structural markers (light = solid dot, dark = ring, drawn in `PieceDisc`) are outside the token
  surface entirely and are never touched by any skin.

### `flair.none` — Unmarked
- **Collection:** Museum Classics · **Rarity:** Classic · **Price:** Free (auto-owned)
- **Lore:** No seal, no cartouche — your name stands alone, plain as an unstamped tally, and lets
  the board do the talking.
- **Motif:** No glyph rendered at all. This is the absence state every other flair is opting out of.

---

## Royal Treasury (paid)

The everyday luxury tier, spanning all four categories. Collection-wide visual language: warmer,
richer material call-outs than the Classics — cedar, lapis, carnelian, ivory, basalt, electrum —
still inside the same dark-wood-and-ivory case.

### Boards

#### `board.cedar_bitumen` — Cedar & Bitumen
- **Collection:** Royal Treasury · **Rarity:** Treasured · **Price:** $3.49
- **Lore:** Cedar of Lebanon, the timber kings shipped downriver at ruinous cost, banded in the
  same black bitumen once used to caulk reed boats and seat the original board's shell inlay.
  Warmer wood, darker seams.
- **Tokens:** `--frame: #3a2418` · `--frame-edge: #1c140d` · `--tile: #e8d2a8` ·
  `--tile-lane: #efdcb4` · `--tile-edge: #6b5230` · `--rosette-ink: #cf9a45`
- **Readability:** Frame is noticeably warmer/lighter than Museum Standard's near-black, so the
  near-black bitumen edge is what keeps frame vs. tile-plaque separation crisp — verify at
  implementation that the edge doesn't read as too close to the frame fill itself.

#### `board.night_lapis` — Night Lapis
- **Collection:** Royal Treasury · **Rarity:** Exalted (flagship board) · **Price:** $4.99
- **Lore:** A frame darkened to near-midnight, tiles cut pale and cool as moonlit bone, gold
  pyrite flecks caught in the edge banding the way real lapis lazuli — Ur's most treasured import —
  holds its own small stars.
- **Tokens:** `--frame: #12172c` · `--frame-edge: #b5924a` · `--tile: #d7dceb` ·
  `--tile-lane: #e4e8f2` · `--tile-edge: #35407a` · `--rosette-ink: #d4af5a`
- **Readability:** Cool pale-blue tile against a warm gold edge/rosette is a deliberate
  temperature contrast (lapis stone + pyrite fleck) — holds up in both page themes since board
  tokens don't change with `data-theme`.

#### `board.floodplain_parchment` — Floodplain Parchment
- **Collection:** Royal Treasury · **Rarity:** Treasured · **Price:** $3.99
- **Lore:** Sun-bleached tones of silt and reed, as if the board were cut straight from the drying
  floodplain clay between the two rivers — the warmest, brightest board in the Treasury.
- **Tokens:** `--frame: #4a3520` · `--frame-edge: #9c8148` · `--tile: #ede2c2` ·
  `--tile-lane: #f2e9cd` · `--tile-edge: #b8a374` · `--rosette-ink: #c1893f`
- **Readability:** The lightest frame in the catalog — confirm frame-vs-tile separation still
  reads at a glance against the light/parchment page theme specifically, since both are warm and
  pale (same family of check the existing Classic pairing already passes today).

### Dice

#### `dice.gold_inlaid_bone` — Gold-Inlaid Bone
- **Collection:** Royal Treasury · **Rarity:** Treasured · **Price:** $2.49
- **Lore:** The same bone pyramids, their marked corners now filled with gold the way the royal
  tombs' finest gaming pieces were finished — a small luxury tumbling in your palm.
- **Tokens:** `--die-face: #ecdfc0` · `--die-edge: #b58a3e` · `--die-pip: #9c7530`
- **Readability:** Pip deliberately darkened to a deep antique gold (not a bright gold) so it still
  reads clearly against the pale face at real die size (~24–28px) — flag for a legibility check at
  render scale before ship.

#### `dice.volcanic_obsidian` — Volcanic Obsidian
- **Collection:** Royal Treasury · **Rarity:** Treasured · **Price:** $2.99
- **Lore:** Dice cut from black volcanic glass, sharp-edged and light-swallowing, with pale bone
  pips set deep enough to still call the roll at a glance.
- **Tokens:** `--die-face: #17140f` · `--die-edge: #3a352c` · `--die-pip: #efe6cf`
- **Readability:** Highest-contrast dice pairing in the Treasury (near-black face, pale ivory pip)
  — comfortably clear.

#### `dice.carnelian_gold` — Carnelian & Gold
- **Collection:** Royal Treasury · **Rarity:** Exalted (flagship dice) · **Price:** $3.49
- **Lore:** Deep carnelian — the orange-red stone traded up the Gulf from the Indus — pyramids
  finished in gold pip-work, the costliest hand in the dice pit.
- **Tokens:** `--die-face: #7a2f22` · `--die-edge: #c9974a` · `--die-pip: #e8c37a`
- **Readability:** Strong value gap between deep red-orange face and bright gold pip; clear at a
  glance.

### Pieces

#### `piece.ivory_basalt` — Ivory & Basalt
- **Collection:** Royal Treasury · **Rarity:** Treasured · **Price:** $2.99
- **Lore:** A quieter, cooler cousin of the Museum Standard: warmer ivory against true volcanic
  basalt instead of glassy obsidian, for players who want their pieces a shade more understated.
- **Tokens:** `--light-piece: #f0e6cd` · `--light-piece-edge: #5c4c30` ·
  `--dark-piece: #3a3632` · `--dark-piece-edge: #b8923f`
- **Contrast note:** Light face ~90% average brightness vs. dark face ~21% — a ~69-point gap,
  comfortably as clear as the free baseline. Structural dot/ring markers untouched (outside the
  token surface).

#### `piece.lapis_eyes` — Lapis Eyes
- **Collection:** Royal Treasury · **Rarity:** Treasured · **Price:** $3.49
- **Lore:** Both faces rimmed in lapis lazuli, echoing the inlaid blue eyes of Ur's votive statues
  and the bull-headed lyre — a shared accent that marks the set as a pair, whichever side you're
  playing.
- **Tokens:** `--light-piece: #f2ecdd` · `--light-piece-edge: #3f5cae` ·
  `--dark-piece: #241f1c` · `--dark-piece-edge: #3f5cae`
- **Contrast note:** Light face ~93% vs. dark face ~13% — an ~80-point gap, the widest in the
  catalog. Both edges intentionally share the same lapis blue (the "paired eyes" idea) — this is a
  deliberate design choice, not an oversight; the *fill* color, not the edge, remains the primary
  light/dark cue and does so by a wide margin. Structural dot/ring markers untouched.

#### `piece.electrum_filigree` — Electrum Filigree
- **Collection:** Royal Treasury · **Rarity:** Exalted (flagship piece set) · **Price:** $4.49
- **Lore:** Rimmed in electrum, the pale natural alloy of gold and silver worn in a queen's own
  headdress at Ur — the single most opulent piece set in the Treasury.
- **Tokens:** `--light-piece: #f5ecd8` · `--light-piece-edge: #d3b56a` ·
  `--dark-piece: #2c2620` · `--dark-piece-edge: #d3b56a`
- **Contrast note:** Light face ~93% vs. dark face ~15% — ~78-point gap, comfortably clear. Both
  edges share the same electrum filigree tone by design (same rationale as Lapis Eyes above); fill
  contrast carries the light/dark read. Structural dot/ring markers untouched.

### Flair

#### `flair.lapis_cartouche` — Lapis Cartouche
- **Collection:** Royal Treasury · **Rarity:** Treasured · **Price:** $1.99
- **Lore:** Your name set inside an oval medallion of lapis lazuli, gold-bordered, in the manner
  of a noble's inscribed seal.
- **Motif:** Oval medallion/frame glyph beside the player name. Color language: the same lapis
  blue family as `piece.lapis_eyes` (~`#3f5cae`) for cross-catalog coherence, gold border reads
  from the existing `--gold` token — no new custom property needed.

#### `flair.rosette_seal` — Rosette Seal
- **Collection:** Royal Treasury · **Rarity:** Treasured · **Price:** $2.49
- **Lore:** The board's own eight-petaled rosette, stamped beside your name like a cylinder seal
  pressed fresh into wet clay.
- **Motif:** Reuse the existing `RosetteGlyph` (already drawn in `Board.tsx`) at badge scale.
  Color language: `--gold` / `--gold-bright` — literally the same rosette already on the board, so
  zero new palette risk.

#### `flair.scribes_colophon` — Scribe's Colophon
- **Collection:** Royal Treasury · **Rarity:** Treasured · **Price:** $1.99
- **Lore:** A tiny tablet mark in the shape of a scribe's closing note — the line that once
  recorded who copied a text, and for whom.
- **Motif:** Small rectangular "tablet" glyph with a few abstracted incised strokes (not literal
  readable script). Color language: warm clay fill from the `--tile` family (`#e3d6ba`) with a dark
  ink stroke from the `--frame` family (`#1a1610`) — both already page tokens, no new hex needed.

---

## Star Omens (paid, optional this sprint)

A smaller, deliberately rarer sub-collection: astrology and celestial omen-reading, the one place
in the catalog that trades gold for silver/starlight as its accent language, so it never gets lost
next to the Treasury's gold-forward look.

#### `board.venus_tablet` — The Venus Tablet
- **Collection:** Star Omens · **Rarity:** Omen · **Price:** $4.99
- **Lore:** Named for the Babylonian record of Venus's risings and settings, read for omens
  twenty-one years running — this board trades gold for starlight, its rosettes inked in silver
  instead.
- **Tokens:** `--frame: #0d0f1c` · `--frame-edge: #7d86a8` · `--tile: #e6e2d6` ·
  `--tile-lane: #ece8dc` · `--tile-edge: #454b6e` · `--rosette-ink: #cbd0e6`
- **Readability — flagged risk:** `--rosette-ink` (`#cbd0e6`, pale silver) sits on `--tile`
  (`#e6e2d6`, pale grey-tan) — both light values, a light-on-light pairing. Verify the rosette
  glyph still reads distinctly on-tile at implementation; if it washes out, darken/desaturate the
  ink slightly (this is the single biggest palette risk in the catalog — see flag list below).

#### `flair.morning_star` — Morning Star
- **Collection:** Star Omens · **Rarity:** Omen · **Price:** $2.99
- **Lore:** An eight-pointed star for Venus at her brightest, the omen-bringer of every
  Mesopotamian sky-watcher's tablet — a rarer mark for a rarer badge.
- **Motif:** Eight-pointed star badge, smaller and sharper than `flair.rosette_seal` so the two
  never get confused at a glance. Color language: pale silver-white (`#cbd0e6`, matching
  `board.venus_tablet`'s rosette ink) instead of gold, reinforcing the celestial/rare read.

---

## Excavation Finds (free-by-achievement; shipped as locked stubs this sprint)

Not sold. These ship locked/greyed this sprint and unlock later via achievement — the visual
language should read as "still being catalogued," not "coming soon to the shop."

#### `board.field_journal` — Field Journal
- **Collection:** Excavation Finds · **Rarity:** Relic · **Price:** Earned (not sold)
- **Lore:** Sepia and pencil-graphite, as if sketched straight from the excavation notebook at the
  royal cemetery of Ur — a find still being catalogued, not yet on general display.
- **Tokens:** `--frame: #4b3a26` · `--frame-edge: #7a6b52` · `--tile: #ddcca8` ·
  `--tile-lane: #e6d8b8` · `--tile-edge: #8a765a` · `--rosette-ink: #5b5346`
- **Readability:** Rosette ink deliberately muted graphite grey rather than gold — reads as
  "unfinished/earned," not purchased. Frame/edge/tile still keep clear separation from each other.

#### `flair.first_dig` — First Dig
- **Collection:** Excavation Finds · **Rarity:** Relic · **Price:** Earned (not sold)
- **Lore:** A crossed trowel and potsherd, sketched in the same hurried hand as the field journal
  — the mark of whoever's spade struck something first.
- **Motif:** Tiny crossed-trowel-and-shard icon, sketch-line style to match `board.field_journal`'s
  mood. Color language: graphite grey (`#5b5346`, matching that board's rosette ink) rather than
  gold — same "earned, not bought" signal.

---

## Palette risks flagged for the visual agent

1. **`board.venus_tablet` rosette ink vs. tile — highest priority.** `--rosette-ink: #cbd0e6` on
   `--tile: #e6e2d6` is light-on-light. Confirm the rosette glyph is still clearly legible on-tile;
   darken/desaturate the ink if it washes out at implementation.
2. **Dice pip legibility at real render size.** All three Treasury dice pips (especially
   `dice.gold_inlaid_bone`'s antique-gold pip on a pale face) were value-checked on paper but
   dice render small (~24–28px, smaller still in the horizontal sidebar and short-viewport CSS).
   Spot-check each at actual size.
3. **Shared edge hue on both piece faces.** `piece.lapis_eyes` and `piece.electrum_filigree` both
   intentionally reuse one accent color across `--light-piece-edge` and `--dark-piece-edge` (a
   "paired accent" design choice, not an error). Fill-color contrast carries the light/dark read
   in both cases by a wide margin — confirmed above — but call this out in review since it departs
   from the free skin's pattern of two different edge tones.
4. **`board.night_lapis` vs. `board.venus_tablet` similarity.** Both are dark blue-black "night
   sky" boards, differentiated on purpose (lapis = gold/pyrite accents + cool pale tile; Venus =
   silver/starlight accents + deeper near-black frame + grey-tan tile). Worth a side-by-side check
   in a store-grid thumbnail so they don't read as near-duplicates at small size.

---

## Summary table

| SKU | Name | Collection | Price |
| --- | --- | --- | --- |
| `board.classic_museum` | Museum Standard | Museum Classics | Free |
| `dice.bone_classic` | Bone Pyramids | Museum Classics | Free |
| `piece.alabaster_obsidian` | Alabaster & Obsidian | Museum Classics | Free |
| `flair.none` | Unmarked | Museum Classics | Free |
| `board.cedar_bitumen` | Cedar & Bitumen | Royal Treasury | $3.49 |
| `board.night_lapis` | Night Lapis | Royal Treasury | $4.99 |
| `board.floodplain_parchment` | Floodplain Parchment | Royal Treasury | $3.99 |
| `dice.gold_inlaid_bone` | Gold-Inlaid Bone | Royal Treasury | $2.49 |
| `dice.volcanic_obsidian` | Volcanic Obsidian | Royal Treasury | $2.99 |
| `dice.carnelian_gold` | Carnelian & Gold | Royal Treasury | $3.49 |
| `piece.ivory_basalt` | Ivory & Basalt | Royal Treasury | $2.99 |
| `piece.lapis_eyes` | Lapis Eyes | Royal Treasury | $3.49 |
| `piece.electrum_filigree` | Electrum Filigree | Royal Treasury | $4.49 |
| `flair.lapis_cartouche` | Lapis Cartouche | Royal Treasury | $1.99 |
| `flair.rosette_seal` | Rosette Seal | Royal Treasury | $2.49 |
| `flair.scribes_colophon` | Scribe's Colophon | Royal Treasury | $1.99 |
| `board.venus_tablet` | The Venus Tablet | Star Omens | $4.99 |
| `flair.morning_star` | Morning Star | Star Omens | $2.99 |
| `board.field_journal` | Field Journal | Excavation Finds | Earned (not sold) |
| `flair.first_dig` | First Dig | Excavation Finds | Earned (not sold) |
