# Cosmetics Integration Loop

## Mission
One working end-to-end pipeline on localhost with no payment keys: equip -> attrs stamped ->
skins visible everywhere -> persistence across refresh -> entitlement merge on sign-in -> donate
path untouched.

## Subagent assignment
`cosmetics-integration-agent` (pull `engineering-agent` if a conflict crosses packages).

## Parallelism
Wave 5, serial — starts after Waves 3+4 report done.

## Inputs
Everything prior; WAVE_LOG conflict notes.

## Files to inspect
`ThemeEffect.tsx` · `app/layout.tsx` · `lib/cosmetics/index.ts` · `AtelierPanel.tsx` ·
agents' summaries in TASK_BOARD/WAVE_LOG.

## Steps
1. `CosmeticsEffect.tsx`: on mount + on `ur:cosmetics-changed` + on auth change -> resolve
   loadout vs ownership -> stamp/remove the four data-attrs on `<html>` (defaults = attrs
   absent, so SSR markup is skinless and hydration-safe).
2. Mount in `layout.tsx` beside ThemeEffect.
3. Sign-in merge: entitlementsClient results union dev/local grants; resolve re-runs.
4. Sweep for agent collisions (GameApp menu vs attrs, globals.css sections) and fix, noting
   owner.
5. Manual happy-path script recorded in WAVE_LOG.

## Checks
No hydration warnings on dev console · unskinned first paint acceptable (no FOUC beyond
theme's existing behavior) · Support flow still opens.

## Tests to run
`pnpm --filter @ur/web test` · typecheck · manual script (equip free, refresh, dev-grant paid,
equip, refresh).

## Documentation to update
WAVE_LOG entry with the passed script.

## Git commit format
`feat(cosmetics): end-to-end equip pipeline (CosmeticsEffect)`

## Done criteria
The acceptance happy path passes on dev exactly as written in the mega-prompt.
## Forbidden actions
Production deploy · `git push` · live payment mode · applying migrations to prod · secrets in
git · engine edits. Local commits allowed only when the loop's Done criteria pass.
