/**
 * Table Master floor layout: drag and drop must put a table exactly where it was dropped,
 * leave the others alone, and never produce duplicate positions (POS falls back to a plain list on duplicates).
 */
import { describe, it, expect } from "vitest";
import {
  MIN_TABLE_SLOTS,
  buildTableSlots,
  getLayoutChanges,
  hasLayoutProblem,
  moveTableToSlot,
  nextFreePosition,
  suggestNextTableName,
} from "../features/general/tableMaster/utils/tableLayout";

const t = (tableId: number, position: number) => ({ tableId, position });
const positions = (slots: Array<{ tableId: number } | null>) =>
  slots.flatMap((table, index) => (table ? [`${table.tableId}@${index + 1}`] : []));

describe("slots", () => {
  it("keeps saved positions and gaps", () => {
    const slots = buildTableSlots([t(1, 1), t(2, 10)]);
    expect(positions(slots)).toEqual(["1@1", "2@10"]);
    expect(slots).toHaveLength(MIN_TABLE_SLOTS);
  });

  it("duplicate or missing positions take the first free spot, nobody is lost", () => {
    expect(positions(buildTableSlots([t(1, 1), t(2, 1), t(3, 0), t(4, 3)]))).toEqual(["1@1", "2@2", "4@3", "3@4"]);
  });

  it("all tables on the same position (seen after the old reorder bug)", () => {
    expect(positions(buildTableSlots([t(1, 1), t(2, 1), t(3, 1)]))).toEqual(["1@1", "2@2", "3@3"]);
  });

  it("free spots always remain after the last table", () => {
    expect(buildTableSlots([t(1, 40)])).toHaveLength(48);
    const full = Array.from({ length: 25 }, (_, i) => t(i + 1, i + 1));
    expect(buildTableSlots(full).filter((s) => s === null).length).toBeGreaterThan(0);
  });
});

describe("drop on the floor", () => {
  const tables = [t(1, 1), t(2, 2), t(3, 3), t(4, 10)];
  const slots = buildTableSlots(tables);

  it("regression: dropping into an empty spot saves that exact position and only that table", () => {
    // The old code saved position 1 here (index in the changed list), duplicating table 1.
    expect(getLayoutChanges(moveTableToSlot(slots, 9, 4))).toEqual([t(4, 5)]);
  });

  it("dropping far away does not shift the tables in between", () => {
    expect(getLayoutChanges(moveTableToSlot(slots, 0, 19))).toEqual([t(1, 20)]);
  });

  it("dropping on a table swaps the two, others stay", () => {
    expect(getLayoutChanges(moveTableToSlot(slots, 0, 2))).toEqual([t(3, 1), t(1, 3)]);
  });

  it("same spot, empty source or off-grid target changes nothing", () => {
    expect(moveTableToSlot(slots, 0, 0)).toBe(slots);
    expect(moveTableToSlot(slots, 5, 6)).toBe(slots);
    expect(moveTableToSlot(slots, 0, 999)).toBe(slots);
  });

  it("a move also repairs bad saved positions, and the result has no duplicates", () => {
    const bad = buildTableSlots([t(1, 1), t(2, 1), t(3, 1)]);
    const changes = getLayoutChanges(moveTableToSlot(bad, 0, 7));
    expect(changes).toEqual([t(2, 2), t(3, 3), t(1, 8)]);
  });

  it("500 random moves: positions stay unique and every table stays on the floor", () => {
    let seed = 12345;
    const rnd = (n: number) => (seed = (seed * 16807) % 2147483647) % n;
    let current = Array.from({ length: 12 }, (_, i) => t(i + 1, i * 2 + 1));
    for (let i = 0; i < 500; i++) {
      const s = buildTableSlots(current);
      const changes = getLayoutChanges(moveTableToSlot(s, rnd(s.length), rnd(s.length)));
      const moved = new Map(changes.map((c) => [c.tableId, c.position]));
      current = current.map((c) => ({ ...c, position: moved.get(c.tableId) ?? c.position }));
      expect(new Set(current.map((c) => c.position)).size).toBe(12);
      expect(hasLayoutProblem(current)).toBe(false);
    }
  });
});

describe("layout problem", () => {
  it("clean layout, with gaps", () => expect(hasLayoutProblem([t(1, 1), t(2, 9)])).toBe(false));
  it("duplicate", () => expect(hasLayoutProblem([t(1, 2), t(2, 2)])).toBe(true));
  it("missing", () => expect(hasLayoutProblem([t(1, 0)])).toBe(true));
  it("no tables", () => expect(hasLayoutProblem([])).toBe(false));
});

describe("add next", () => {
  it("next free position skips taken spots", () => {
    expect(nextFreePosition([t(1, 1), t(2, 2), t(3, 3)], 1)).toBe(4);
    expect(nextFreePosition([t(1, 1)], 5)).toBe(6);
  });

  it("next name keeps prefix and padding", () => {
    expect(suggestNextTableName("T1", [])).toBe("T2");
    expect(suggestNextTableName("T9", [])).toBe("T10");
    expect(suggestNextTableName("A09", [])).toBe("A10");
    expect(suggestNextTableName("12", [])).toBe("13");
  });

  it("names in use are skipped, whatever the case", () => {
    expect(suggestNextTableName("T1", ["t2", "T3"])).toBe("T4");
  });

  it("no trailing number or too long: no suggestion", () => {
    expect(suggestNextTableName("VIP", [])).toBe("");
    expect(suggestNextTableName("ABCDEFGHIJKLMN9", [])).toBe("");
  });
});
