/**
 * Board topology for the Royal Game of Ur.
 *
 * The physical board is a 3×8 grid with two notches: rows 0 and 2 have no
 * squares at columns 4 and 5. Row 1 is the shared battle lane.
 *
 *        col: 0    1    2    3    4    5    6    7
 *   row 0:  [✿ ][  ][  ][ en]          [✿ ][  ]   ← Dark private squares
 *   row 1:  [  ][  ][  ][ ✿ ][  ][  ][  ][  ]     ← shared lane
 *   row 2:  [✿ ][  ][  ][ en]          [✿ ][  ]   ← Light private squares
 *
 * Each player's path is 14 on-board squares: enter at (row, 3) heading toward
 * column 0, turn onto the middle lane and traverse it to column 7, then exit
 * through (row, 7) and (row, 6). Rosettes sit at path indices 4, 8, and 14.
 */
import type { PlayerId, PathId, RulesetConfig } from "./types";

export interface Cell {
  readonly row: number;
  readonly col: number;
}

/** Stable key for a physical square, `"row,col"`. */
export type CellKey = string;

export function cellKey(cell: Cell): CellKey {
  return `${cell.row},${cell.col}`;
}

/** One physical square with everything a renderer or rules check needs. */
export interface BoardCellInfo {
  readonly cell: Cell;
  readonly key: CellKey;
  readonly rosette: boolean;
  /** True when both players' paths cross this square. */
  readonly shared: boolean;
  /** Path index of this square for each player, or null if not on that player's path. */
  readonly pathIndex: readonly [number | null, number | null];
}

export interface BoardLayout {
  readonly pathId: PathId;
  /** On-board squares per player's path (14 for the classic board). */
  readonly pathLength: number;
  /** Path index of the start pool (always 0). */
  readonly startIndex: number;
  /** Path index representing a borne-off piece (pathLength + 1). */
  readonly finishIndex: number;
  readonly rows: number;
  readonly cols: number;
  readonly cells: readonly BoardCellInfo[];
  /** Physical square for a player's path index, or null for start/finish. */
  cellAt(player: PlayerId, index: number): Cell | null;
  keyAt(player: PlayerId, index: number): CellKey | null;
  /** True when the given path index for the given player is a rosette square. */
  isRosette(player: PlayerId, index: number): boolean;
  /** True when both players' paths use the same physical square at this index. */
  isShared(index: number): boolean;
  /** Path indices (identical for both players) of rosettes on the shared lane. */
  readonly sharedRosetteIndices: readonly number[];
}

/** Light's track (player 0, home row 2), path indices 1..14 at array offsets 0..13. */
const FINKEL_TRACK_LIGHT: readonly Cell[] = [
  { row: 2, col: 3 },
  { row: 2, col: 2 },
  { row: 2, col: 1 },
  { row: 2, col: 0 },
  { row: 1, col: 0 },
  { row: 1, col: 1 },
  { row: 1, col: 2 },
  { row: 1, col: 3 },
  { row: 1, col: 4 },
  { row: 1, col: 5 },
  { row: 1, col: 6 },
  { row: 1, col: 7 },
  { row: 2, col: 7 },
  { row: 2, col: 6 },
];

const FINKEL_ROSETTES: ReadonlySet<CellKey> = new Set(["0,0", "2,0", "1,3", "0,6", "2,6"]);

function mirrorForDark(cell: Cell): Cell {
  if (cell.row === 1) return cell;
  return { row: cell.row === 0 ? 2 : 0, col: cell.col };
}

function buildFinkelLayout(): BoardLayout {
  const tracks: readonly [readonly Cell[], readonly Cell[]] = [
    FINKEL_TRACK_LIGHT,
    FINKEL_TRACK_LIGHT.map(mirrorForDark),
  ];
  const pathLength = FINKEL_TRACK_LIGHT.length;
  const startIndex = 0;
  const finishIndex = pathLength + 1;

  const cellAt = (player: PlayerId, index: number): Cell | null => {
    if (index < 1 || index > pathLength) return null;
    return tracks[player][index - 1] ?? null;
  };
  const keyAt = (player: PlayerId, index: number): CellKey | null => {
    const cell = cellAt(player, index);
    return cell === null ? null : cellKey(cell);
  };
  const isRosette = (player: PlayerId, index: number): boolean => {
    const key = keyAt(player, index);
    return key !== null && FINKEL_ROSETTES.has(key);
  };
  const isShared = (index: number): boolean => {
    const a = keyAt(0, index);
    return a !== null && a === keyAt(1, index);
  };

  const byKey = new Map<CellKey, { cell: Cell; pathIndex: [number | null, number | null] }>();
  for (const player of [0, 1] as const) {
    for (let index = 1; index <= pathLength; index++) {
      const cell = cellAt(player, index)!;
      const key = cellKey(cell);
      const entry = byKey.get(key) ?? { cell, pathIndex: [null, null] };
      entry.pathIndex[player] = index;
      byKey.set(key, entry);
    }
  }
  const cells: BoardCellInfo[] = [...byKey.values()]
    .map(({ cell, pathIndex }) => ({
      cell,
      key: cellKey(cell),
      rosette: FINKEL_ROSETTES.has(cellKey(cell)),
      shared: pathIndex[0] !== null && pathIndex[1] !== null,
      pathIndex: pathIndex as readonly [number | null, number | null],
    }))
    .sort((a, b) => a.cell.row - b.cell.row || a.cell.col - b.cell.col);

  const sharedRosetteIndices: number[] = [];
  for (let index = 1; index <= pathLength; index++) {
    if (isShared(index) && isRosette(0, index)) sharedRosetteIndices.push(index);
  }

  return {
    pathId: "finkel",
    pathLength,
    startIndex,
    finishIndex,
    rows: 3,
    cols: 8,
    cells,
    cellAt,
    keyAt,
    isRosette,
    isShared,
    sharedRosetteIndices,
  };
}

const LAYOUTS: Record<PathId, BoardLayout> = {
  finkel: buildFinkelLayout(),
};

/** Layout for a ruleset (or a raw path id). Layouts are immutable singletons. */
export function getLayout(ruleset: RulesetConfig | PathId): BoardLayout {
  const pathId = typeof ruleset === "string" ? ruleset : ruleset.pathId;
  return LAYOUTS[pathId];
}
