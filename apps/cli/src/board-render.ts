/** ASCII board renderer for terminal output. Light = ○ (player 0), Dark = ● (player 1). */
import { finishedCount, getLayout, occupancy, startCount, type GameState } from "@ur/engine";

export function renderBoard(state: GameState): string {
  const layout = getLayout(state.ruleset);
  const occ = occupancy(state);

  const square = (row: number, col: number): string => {
    const info = layout.cells.find((c) => c.cell.row === row && c.cell.col === col);
    if (!info) return "     ";
    const occupant = occ.get(info.key);
    const glyph = occupant ? (occupant.player === 0 ? "○" : "●") : info.rosette ? "✿" : "·";
    return `[ ${glyph} ]`;
  };

  const rowText = (row: number): string =>
    Array.from({ length: layout.cols }, (_, col) => square(row, col)).join("");

  const pool = (player: 0 | 1): string =>
    `start ${startCount(state, player)} · home ${finishedCount(state, player)}`;

  return [
    `      ${rowText(0)}   ● Dark  ${pool(1)}`,
    `      ${rowText(1)}`,
    `      ${rowText(2)}   ○ Light ${pool(0)}`,
  ].join("\n");
}
