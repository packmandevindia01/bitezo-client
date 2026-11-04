/**
 * Units: the selected PARENT unit must reach the backend.
 * Both create screens (Unit master, Quick Add Unit in the product form) build the parent dropdown from
 * GET /unit/unit-listname and send the option value as `parentId`.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { normalizeUnitNameList, toParentId, unitService } from "../features/inventory/unit/services/unitService";

afterEach(() => vi.restoreAllMocks());

describe("parent unit list (any field spelling)", () => {
  it("documented shape { unitId, name, currentValue }", () => {
    expect(normalizeUnitNameList([{ unitId: 7, name: "Dozen", currentValue: 12 }]))
      .toEqual([{ unitId: 7, name: "Dozen", currentValue: 12 }]);
  });

  it("id under another name (id / Id / UnitId) still gives the right parent id — not 'undefined'", () => {
    const list = normalizeUnitNameList([
      { id: 7, unitName: "Dozen", currentValue: 12 },
      { Id: 8, Name: "Box", CurrentValue: 24 },
      { UnitId: 9, name: "Carton", currentvalue: 48 },
    ]);
    expect(list.map((u) => u.unitId)).toEqual([7, 8, 9]);
    expect(list.map((u) => u.name)).toEqual(["Dozen", "Box", "Carton"]);
    expect(list.map((u) => u.currentValue)).toEqual([12, 24, 48]);
    // the dropdown value is String(unitId)
    expect(list.map((u) => String(u.unitId))).not.toContain("undefined");
  });

  it("rows without a usable id are dropped; missing value defaults to 1; non-array → []", () => {
    expect(normalizeUnitNameList([{ name: "Broken" }, { unitId: 3, name: "Nos" }])).toEqual([{ unitId: 3, name: "Nos", currentValue: 1 }]);
    expect(normalizeUnitNameList(null)).toEqual([]);
  });
});

describe("parentId sent to the backend", () => {
  it("valid ids pass through; empty / NaN / 'undefined' / negative become 0 (base unit)", () => {
    expect(toParentId(7)).toBe(7);
    expect(toParentId("7")).toBe(7);
    for (const v of [0, "", undefined, null, NaN, "undefined", -3, 1.5]) expect(toParentId(v)).toBe(0);
  });
});

describe("read-back check after save", () => {
  it("no warning when the server stored the parent we sent", async () => {
    vi.spyOn(unitService, "getById").mockResolvedValue({ unitId: 20, parentId: 7 } as any);
    expect(await unitService.verifySavedParent(20, 7)).toBeNull();
  });

  it("reports the stored parent when the server saved a different one (e.g. 1)", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(unitService, "getById").mockResolvedValue({ unitId: 20, parentId: 1 } as any);
    expect(await unitService.verifySavedParent(20, 7)).toBe(1);
  });

  it("no unit id or read failure → no false warning", async () => {
    expect(await unitService.verifySavedParent(0, 7)).toBeNull();
    vi.spyOn(unitService, "getById").mockRejectedValue(new Error("offline"));
    expect(await unitService.verifySavedParent(20, 7)).toBeNull();
  });
});
