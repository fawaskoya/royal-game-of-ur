# ADR 0001 — pnpm monorepo with source-first internal packages

**Status:** accepted · 2026-07-02

## Context

The product spans a rules engine, AI, a web client, future server code, and research tooling. The master spec demands strict modularity ("every feature isolated", engine never depends on UI) and multiple future runtimes (browser, Node server, Electron, workers).

## Decision

- pnpm workspaces: `packages/engine`, `packages/ai` (pure libraries), `apps/cli`, `apps/web` (consumers). Dependency direction is one-way: `apps → ai → engine`.
- Internal packages are **source-first**: `exports` points at `src/index.ts`; Next.js compiles them via `transpilePackages`, tsx/vitest consume TS directly. No build orchestration, no stale-dist bugs, cross-package jump-to-definition.
- Strict TS everywhere (`noUncheckedIndexedAccess` included), shared `tsconfig.base.json`.

## Consequences

- Publishing a package externally later requires adding a build step (tsup) and flipping `exports` — contained, low-cost change.
- Every consumer must transpile TS from workspace deps (Next config documents this; any future bundler must too).
