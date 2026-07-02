# UI / UX — design language and interaction spec

**Feel target:** a museum artifact brought to life. Monument Valley's restraint, Apple HIG discipline, Nintendo game-feel. Minimal, luxurious, never busy.

## Design language

- **Palette (dark-first):** near-black lapis `#0B0E14` background; board frame in deep umber `#1A1610`; tiles in bone `#E7DBC1` / `#DCCFAF`; accents in antique gold `#C9A24B`; Light pieces ivory, Dark pieces basalt with gold ring. Light/parchment mode is a Phase-2 deliverable using the same token system (CSS variables in `globals.css` — never hardcode colors in components).
- **Type:** serif display for titles (Iowan Old Style / Palatino stack — no webfont dependency yet), system sans for UI copy, generous letterspacing on small caps labels.
- **Texture & light:** subtle stone grain on tiles, soft vignette, gold glow reserved for rosettes and victories. Restraint: one glowing thing at a time.

## Interaction spec (implemented in Phase 1 web client)

1. Your turn → **Roll** button pulses gently; keyboard `R` rolls.
2. After the roll, movable pieces lift with a soft ring; the destination square highlights on hover/selection. One tap/click on a piece moves it (Ur destinations are forced by the roll — no drag needed; drag is a future enhancement for feel).
3. Zero roll or blocked turn → dice dim and a quiet "no move — turn passes" toast appears; never a modal.
4. Rosette landing → square blooms gold, "roll again" chip appears.
5. Capture → captured piece sinks and slides back to its start pool.
6. Bear-off → piece floats up and settles into the home tally.
7. Win → board dims, victor's pieces glimmer; a single understated overlay with rematch/menu. No confetti.

## Animation principles

- **Physicality:** every movement has anticipation (2–3 px lift), eased travel, and a landing settle. No teleportation, ever — including undo and replay scrubbing.
- **Motion budget:** 150–400 ms for moves; springs (Framer Motion) over linear easing; 60 fps floor.
- **`prefers-reduced-motion`:** all travel collapses to opacity crossfades; game remains fully playable.
- The event log (`state.history`) is the animation source of truth — UIs animate *events*, not diffed positions, so forced passes, captures, and extra turns always read clearly.

## Sound design (Phase 2 — not yet implemented)

Ambient temple room tone (very low), stone-on-wood piece taps, tetrahedral dice clatter, warm chime for rosettes, low thud for captures, short victory phrase. Minimalist mode = taps only. All audio optional and off by default until the pass is done properly.

## Accessibility (requirements, not options)

- Full keyboard play: `R` roll, arrow/tab between movable pieces, Enter to move, visible focus rings.
- Screen readers: every square and piece has an aria-label ("Light piece on shared square 7 of 14; can move to rosette"), moves announced via live region.
- Colorblind safety: Light/Dark pieces differ in *shape marker* (dot vs ring) not only color; board states never encode meaning in hue alone.
- High-contrast toggle, large-UI toggle, hit targets ≥ 44 px, complete touch support.

## Layout

Mobile-first: board scales to viewport width, pools and dice stack below; desktop centers the board with side panels (players, history). The board is CSS grid; pieces are absolutely positioned by cell coordinates and animated with springs — resolution-independent, no canvas needed until 3D dice arrive (WebGL is reserved for the physics dice mode).
