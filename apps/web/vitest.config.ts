import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Mirrors tsconfig's `@/*` → `./*` so runtime (value) imports across lib
// modules resolve under vitest exactly like they do under Next/tsc.
// (Type-only `@/` imports never needed this — they erase at compile time —
// which is why the gap only surfaced when a domain module gained a real
// runtime import.)
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
    },
  },
});
