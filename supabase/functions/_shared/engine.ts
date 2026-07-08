/**
 * Bridge into the workspace rules engine for Edge Functions.
 *
 * `@ur/engine` has zero runtime dependencies and no Node/DOM API usage (a
 * hard invariant of the package — see CLAUDE.md), so it's portable to any
 * runtime including Deno. The catch: its internal files use extensionless
 * relative imports (Node/bundler style), and Deno's `sloppy-imports` runtime
 * flag doesn't help — the Supabase CLI's own asset-upload file-walk resolves
 * imports literally *before* any Deno bundler sees them, and fails on the
 * missing extensions (confirmed 2026-07-08).
 *
 * Fix: `engine.bundle.ts` is a single self-contained file with every
 * internal import already inlined — generated with esbuild, zero
 * dependencies to resolve, nothing for the CLI's file-walk to trip on.
 *
 * Regenerate after any engine change:
 *   npx esbuild packages/engine/src/index.ts --bundle --format=esm \
 *     --platform=neutral --outfile=supabase/functions/_shared/engine.bundle.ts
 */
export * from "./engine.bundle.ts";
