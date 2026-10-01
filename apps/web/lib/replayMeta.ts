/**
 * Who sat in each seat of a recorded game, read back from the replay's
 * `meta.mode` (written by GameView and the archive via `exportReplay(state,
 * { mode })`). Replays are user-importable JSON, so the shape is validated
 * field by field; anything unrecognised — including shared links, which carry
 * no mode — falls back to "human" for both seats.
 */
import { DIFFICULTIES, type DifficultyId } from "@ur/ai";
import type { Controller } from "@/lib/useGame";

const DIFFICULTY_IDS = new Set<string>(DIFFICULTIES.map((d) => d.id));

function difficulty(value: unknown): DifficultyId | null {
  return typeof value === "string" && DIFFICULTY_IDS.has(value) ? (value as DifficultyId) : null;
}

export function replayControllers(meta: Readonly<Record<string, unknown>> | undefined): readonly [Controller, Controller] {
  const mode = meta?.mode;
  if (typeof mode !== "object" || mode === null) return ["human", "human"];
  const m = mode as Record<string, unknown>;
  if (m.kind === "ai") {
    const ai = difficulty(m.difficulty);
    if (ai === null || (m.human !== 0 && m.human !== 1)) return ["human", "human"];
    return m.human === 0 ? ["human", ai] : [ai, "human"];
  }
  if (m.kind === "watch") {
    const light = difficulty(m.light);
    const dark = difficulty(m.dark);
    if (light !== null && dark !== null) return [light, dark];
  }
  return ["human", "human"];
}
