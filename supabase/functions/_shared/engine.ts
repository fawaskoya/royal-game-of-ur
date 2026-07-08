/**
 * Bridge into the workspace rules engine for Edge Functions.
 *
 * `@ur/engine` has zero runtime dependencies and no Node/DOM API usage (a
 * hard invariant of the package — see CLAUDE.md) specifically so it can run
 * anywhere, including Deno. Internal files use extensionless relative
 * imports (Node/bundler style); `sloppy-imports` in ../deno.json is what
 * lets Deno's resolver accept those without every import needing `.ts`.
 *
 * UNVERIFIED: this repo has no Supabase CLI session yet, so this bridge has
 * not been deployed. If sloppy-imports doesn't resolve cleanly in practice,
 * vendor the engine as a single bundled .ts file here instead — the engine
 * has no dependencies, so `esbuild --bundle` from packages/engine/src/index.ts
 * produces a drop-in replacement for this file with zero code changes
 * elsewhere.
 */
export * from "../../../packages/engine/src/index.ts";
