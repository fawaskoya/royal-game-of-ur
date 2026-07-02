import { describe, expect, it } from "vitest";
import { getLayout } from "../src";

const layout = getLayout("finkel");

describe("finkel board layout", () => {
  it("has 20 unique physical squares in a 3×8 grid with notches", () => {
    expect(layout.cells).toHaveLength(20);
    const keys = new Set(layout.cells.map((c) => c.key));
    expect(keys.size).toBe(20);
    for (const { cell } of layout.cells) {
      expect(cell.row).toBeGreaterThanOrEqual(0);
      expect(cell.row).toBeLessThan(3);
      expect(cell.col).toBeGreaterThanOrEqual(0);
      expect(cell.col).toBeLessThan(8);
    }
    // The notches: rows 0 and 2 have no squares at columns 4 and 5.
    for (const row of [0, 2]) {
      for (const col of [4, 5]) {
        expect(layout.cells.find((c) => c.cell.row === row && c.cell.col === col)).toBeUndefined();
      }
    }
  });

  it("gives each player a 14-square path with start 0 and finish 15", () => {
    expect(layout.pathLength).toBe(14);
    expect(layout.startIndex).toBe(0);
    expect(layout.finishIndex).toBe(15);
    for (const player of [0, 1] as const) {
      expect(layout.cellAt(player, 0)).toBeNull();
      expect(layout.cellAt(player, 15)).toBeNull();
      for (let i = 1; i <= 14; i++) expect(layout.cellAt(player, i)).not.toBeNull();
    }
  });

  it("shares exactly path indices 5..12 (the middle lane) between the players", () => {
    for (let i = 1; i <= 14; i++) {
      const shouldShare = i >= 5 && i <= 12;
      expect(layout.isShared(i)).toBe(shouldShare);
      if (shouldShare) {
        expect(layout.cellAt(0, i)!.row).toBe(1);
        expect(layout.keyAt(0, i)).toBe(layout.keyAt(1, i));
      }
    }
  });

  it("keeps the players' private squares fully disjoint", () => {
    const privateKeys = (player: 0 | 1): Set<string> => {
      const keys = new Set<string>();
      for (const i of [1, 2, 3, 4, 13, 14]) keys.add(layout.keyAt(player, i)!);
      return keys;
    };
    const light = privateKeys(0);
    for (const key of privateKeys(1)) expect(light.has(key)).toBe(false);
  });

  it("places rosettes at path indices 4, 8, and 14 for both players — 5 squares total", () => {
    for (const player of [0, 1] as const) {
      for (let i = 1; i <= 14; i++) {
        expect(layout.isRosette(player, i)).toBe(i === 4 || i === 8 || i === 14);
      }
    }
    expect(layout.cells.filter((c) => c.rosette)).toHaveLength(5);
    expect(layout.sharedRosetteIndices).toEqual([8]);
  });

  it("annotates each cell with per-player path indices consistent with the tracks", () => {
    for (const info of layout.cells) {
      for (const player of [0, 1] as const) {
        const index = info.pathIndex[player];
        if (index !== null) expect(layout.keyAt(player, index)).toBe(info.key);
      }
      expect(info.shared).toBe(info.pathIndex[0] !== null && info.pathIndex[1] !== null);
    }
  });
});
