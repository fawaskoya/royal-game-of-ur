# ADR 0003 — per-player path indices as the movement coordinate system

**Status:** accepted · 2026-07-02

## Context

Ur movement is linear along each player's own route, but captures depend on physical squares where routes overlap. Two candidate models: global board coordinates (row/col) everywhere, or per-player path indices with a mapping to physical cells.

## Decision

Movement, positions, and rules use **per-player path indices** (0 = start pool, 1..14 = board, 15 = finished); a `BoardLayout` maps `(player, index) → cell` and answers `isShared` / `isRosette`. Collision and capture derive from *physical cell equality*, not from hardcoded "shared range" constants.

## Consequences

- Move arithmetic is `to = from + roll` — trivial to validate, search, and test.
- Alternative historical paths (different lengths/overlaps) are new `BoardLayout`s; rules code doesn't change because sharing is derived, not assumed.
- Renderers get grid coordinates from the same layout (`cellAt`, `cells`), so UI and rules can never disagree about geometry.
