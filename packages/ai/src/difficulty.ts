/**
 * The player-facing difficulty ladder. Six honest tiers; a future
 * Grandmaster (MCTS/learned eval hybrid) is designed in docs/AI_ENGINE.md
 * and slots in here as a new entry when built.
 */
import { greedyAgent, masterAgent, randomAgent, searchAgent, type UrAgent } from "./agents";

export type DifficultyId = "beginner" | "easy" | "medium" | "hard" | "expert" | "master";

export interface DifficultyInfo {
  readonly id: DifficultyId;
  readonly label: string;
  readonly description: string;
  create(): UrAgent;
}

export const DIFFICULTIES: readonly DifficultyInfo[] = [
  {
    id: "beginner",
    label: "Beginner",
    description: "Plays random legal moves. Misses captures and rosettes — perfect for first games.",
    create: () => randomAgent(),
  },
  {
    id: "easy",
    label: "Easy",
    description: "Understands progress and captures, but blunders often.",
    create: () => greedyAgent(0.35),
  },
  {
    id: "medium",
    label: "Medium",
    description: "Solid positional judgement: safety, rosettes, and races. No lookahead.",
    create: () => greedyAgent(0),
  },
  {
    id: "hard",
    label: "Hard",
    description: "Looks two rolls ahead, weighing every dice outcome by its true probability.",
    create: () => searchAgent(2),
  },
  {
    id: "expert",
    label: "Expert",
    description: "Deep expectimax search. Punishes loose pieces and wins tight races.",
    create: () => searchAgent(3),
  },
  {
    id: "master",
    label: "Master",
    description: "Tournament strength: sharper risk judgement and deeper endgame calculation.",
    create: () => masterAgent(),
  },
];

export function createAgent(id: DifficultyId): UrAgent {
  const info = DIFFICULTIES.find((d) => d.id === id);
  if (!info) throw new Error(`unknown difficulty: ${id}`);
  return info.create();
}
