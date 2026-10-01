/**
 * The Finkel board as a static SVG (server-rendered, no JS). Coordinates are
 * the engine's: rows 0/2 are Dark/Light private squares, row 1 the shared
 * lane, with notches at columns 4–5 (see packages/engine/src/board.ts).
 */

/** Light's route: (row, col) for path squares 1..14 — identical to the engine's LIGHT_PATH. */
const LIGHT_ROUTE: readonly (readonly [number, number])[] = [
  [2, 3], [2, 2], [2, 1], [2, 0],
  [1, 0], [1, 1], [1, 2], [1, 3], [1, 4], [1, 5], [1, 6], [1, 7],
  [2, 7], [2, 6],
];
const ROSETTES = new Set(["0,0", "0,6", "1,3", "2,0", "2,6"]);
const isNotch = (r: number, c: number) => (r === 0 || r === 2) && (c === 4 || c === 5);

export function BoardDiagram({
  numbered = true,
  print = false,
  label,
}: {
  /** Number Light's route 1–14 (the rules diagram) or leave squares blank (a playable board). */
  numbered?: boolean;
  /** Ink-friendly colours for paper. */
  print?: boolean;
  label: string;
}) {
  const S = 46;
  const G = 4;
  const w = 8 * S + 9 * G;
  const h = 3 * S + 4 * G;
  const pos = (r: number, c: number) => ({ x: G + c * (S + G), y: G + r * (S + G) });
  const tile = print ? "#ffffff" : "#e8dcc0";
  const edge = print ? "#000000" : "#a07f35";
  const ink = print ? "#000000" : "#a07f35";

  const cells = [];
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 8; c++) {
      if (isNotch(r, c)) continue;
      const { x, y } = pos(r, c);
      cells.push(
        <g key={`${r}-${c}`}>
          <rect x={x} y={y} width={S} height={S} rx={print ? 2 : 6} fill={tile} stroke={edge} strokeWidth={print ? 1.2 : 1} opacity={print || r === 1 ? 1 : 0.8} />
          {ROSETTES.has(`${r},${c}`) ? (
            <text x={x + S / 2} y={y + S / 2 + 9} textAnchor="middle" fontSize={28} fill={ink} opacity={print ? 0.85 : 0.55}>
              ✿
            </text>
          ) : null}
        </g>,
      );
    }
  }

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      role="img"
      aria-label={label}
      className={print ? "board-print w-full" : "w-full max-w-xl self-center rounded-xl border border-[var(--frame-edge)] bg-[#1b1710] p-1"}
    >
      {cells}
      {numbered
        ? LIGHT_ROUTE.map(([r, c], i) => {
            const { x, y } = pos(r, c);
            return (
              <text key={i} x={x + S / 2} y={y + S / 2 + 5} textAnchor="middle" fontSize={15} fontWeight={700} fill="#2b2416">
                {i + 1}
              </text>
            );
          })
        : null}
    </svg>
  );
}
