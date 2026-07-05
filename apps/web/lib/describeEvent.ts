import type { GameEvent } from "@ur/engine";

/** One-line human description of an engine event — shared by live narration and the replay viewer. */
export function describeEvent(event: GameEvent): string {
  const who = event.player === 0 ? "Light" : "Dark";
  switch (event.type) {
    case "roll":
      return `${who} rolled ${event.total}.`;
    case "pass":
      return `${who} ${event.reason === "rolled-zero" ? "rolled a zero" : "had no legal moves"}; turn passes.`;
    case "move":
      return [
        `${who} ${event.from === 0 ? "entered a piece" : `moved from square ${event.from}`} ${
          event.finished ? "home" : `to square ${event.to}`
        }.`,
        event.capture ? "Captured an opponent piece." : "",
        event.extraTurn ? "Rosette: rolls again." : "",
      ]
        .filter(Boolean)
        .join(" ");
  }
}
