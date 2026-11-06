/**
 * Product master → Opening Stock: selecting a unit shows the cost for that unit.
 */
import { describe, it, expect } from "vitest";
import { calcOpeningStockCost } from "../features/inventory/product/utils/openingStockCost";
import { formatAmount } from "../utils/formatters";

const units = [
  { id: 1, currentvalue: 1 }, // PCS
  { id: 2, currentvalue: 12 }, // Dozen
  { id: 3, currentvalue: 24 }, // Box
  { id: 4, currentvalue: 0 }, // bad master data
  { id: 5, currentValue: 6 }, // other API spelling
  { id: 6 }, // no value
];

const base = { units, mainUnitId: "1", productCost: "10.000" };

describe("cost from the product master cost", () => {
  it("main unit is the smallest: PCS 10 → Dozen 120, Box 240", () => {
    expect(calcOpeningStockCost({ ...base, unitId: "2" })).toBe(120);
    expect(calcOpeningStockCost({ ...base, unitId: "3" })).toBe(240);
  });

  it("selecting the main unit gives the master cost", () => {
    expect(calcOpeningStockCost({ ...base, unitId: "1" })).toBe(10);
  });

  it("main unit is larger: Dozen 120 → PCS 10, Box 240", () => {
    const dozen = { units, mainUnitId: "2", productCost: "120" };
    expect(calcOpeningStockCost({ ...dozen, unitId: "1" })).toBe(10);
    expect(calcOpeningStockCost({ ...dozen, unitId: "3" })).toBe(240);
  });

  it("master cost wins over a cost on the row", () => {
    expect(calcOpeningStockCost({ ...base, unitId: "2", previousUnitId: "1", previousCost: "15" })).toBe(120);
  });

  it("reads currentValue as well as currentvalue", () => {
    expect(calcOpeningStockCost({ ...base, unitId: "5" })).toBe(60);
  });

  it("rounds to the currency decimals only at display", () => {
    const cost = calcOpeningStockCost({ units, mainUnitId: "2", productCost: "10", unitId: "1" });
    expect(formatAmount(cost, 3)).toBe("0.833");
    expect(formatAmount(cost, 2)).toBe("0.83");
  });
});

describe("no master cost: converts the row's own cost", () => {
  const noMaster = { units, mainUnitId: "1", productCost: "0.000" };

  it("typed 5 per PCS → Dozen 60, and back to PCS 5", () => {
    expect(calcOpeningStockCost({ ...noMaster, unitId: "2", previousUnitId: "1", previousCost: "5" })).toBe(60);
    expect(calcOpeningStockCost({ ...noMaster, unitId: "1", previousUnitId: "2", previousCost: "60" })).toBe(5);
  });

  it("nothing to convert → null, current cost is kept", () => {
    expect(calcOpeningStockCost({ ...noMaster, unitId: "2", previousUnitId: "1", previousCost: "0" })).toBeNull();
  });
});

describe("cannot be worked out → null, never 0 or NaN", () => {
  it("unit cleared or unknown", () => {
    expect(calcOpeningStockCost({ ...base, unitId: "" })).toBeNull();
    expect(calcOpeningStockCost({ ...base, unitId: null })).toBeNull();
    expect(calcOpeningStockCost({ ...base, unitId: "99" })).toBeNull();
  });

  it("selected unit has a zero or missing value", () => {
    expect(calcOpeningStockCost({ ...base, unitId: "4" })).toBeNull();
    expect(calcOpeningStockCost({ ...base, unitId: "6" })).toBeNull();
  });

  it("main unit has a zero value or master data is not loaded", () => {
    expect(calcOpeningStockCost({ ...base, mainUnitId: "4", unitId: "2" })).toBeNull();
    expect(calcOpeningStockCost({ ...base, units: undefined, unitId: "2" })).toBeNull();
  });
});
