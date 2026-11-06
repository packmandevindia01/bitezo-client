/**
 * Stock Transfer and Stock Adjustment: a line's unit can be changed, its cost comes from the unit-cost API,
 * and baseQty uses the selected unit's value.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const get = vi.fn();
vi.mock("../api/axiosInstance", () => ({ default: { get: (...a: unknown[]) => get(...a) } }));

import { internalStockTransferApi } from "../features/transaction/internalStockTransfer/services/internalStockTransferApi";
import { stockAdjustmentApi } from "../features/transaction/stockAdjustment/services/stockAdjustmentApi";
import {
  getLineUnitOptions,
  getLineUnitValue,
} from "../features/transaction/shared/lineUnits";

const pcs = { label: "PCS", value: "1", currentValue: 1, category: "Quantity" };
const dozen = { label: "Dozen", value: "2", currentValue: 12, category: "Quantity" };
const kg = { label: "Kg", value: "3", currentValue: 1000, category: "Weight" };
const master = [pcs, dozen, kg];

describe("unit value for baseQty", () => {
  it("found in the loaded category list", () => {
    expect(getLineUnitValue(2, { Quantity: [pcs, dozen] }, [])).toBe(12);
  });

  it("category list not loaded: uses master units, not 1", () => {
    expect(getLineUnitValue("2", {}, master)).toBe(12);
  });

  it("zero or bad value in a category list falls through to master", () => {
    expect(getLineUnitValue("2", { Quantity: [{ ...dozen, currentValue: 0 }] }, master)).toBe(12);
  });

  it("unit unknown everywhere: base unit", () => {
    expect(getLineUnitValue("99", { Quantity: [pcs] }, master)).toBe(1);
    expect(getLineUnitValue("99", {}, undefined)).toBe(1);
  });
});

describe("units offered on a line", () => {
  it("loaded category list wins", () => {
    const loaded = { Quantity: [pcs, dozen] };
    expect(getLineUnitOptions({ unit: "1", unitCategory: "Quantity" }, loaded, master)).toEqual([pcs, dozen]);
  });

  it("category list missing: master units of that category only", () => {
    expect(getLineUnitOptions({ unit: "1", unitCategory: "quantity " }, {}, master)).toEqual([pcs, dozen]);
  });

  it("no category on the line: taken from its current unit", () => {
    expect(getLineUnitOptions({ unit: "3" }, {}, master)).toEqual([kg]);
  });

  it("nothing known: all master units", () => {
    expect(getLineUnitOptions({ unit: "" }, {}, master)).toEqual(master);
    expect(getLineUnitOptions({ unit: "" }, {}, undefined)).toEqual([]);
  });
});

describe("unit cost API", () => {
  beforeEach(() => get.mockReset());

  it("calls the product + unit endpoint and returns the cost", async () => {
    get.mockResolvedValue({ data: { isSuccess: true, data: { cost: 120 } } });
    await expect(internalStockTransferApi.getUnitCost(55, 2)).resolves.toBe(120);
    expect(get).toHaveBeenCalledWith("/stock-transfer/55/unit-cost/2");
  });

  it("accepts a plain number", async () => {
    get.mockResolvedValue({ data: { isSuccess: true, data: 120 } });
    await expect(internalStockTransferApi.getUnitCost(55, 2)).resolves.toBe(120);
  });

  it("an unusable response is an error, not a NaN cost", async () => {
    get.mockResolvedValue({ data: { isSuccess: true, data: { price: 120 } } });
    await expect(internalStockTransferApi.getUnitCost(55, 2)).rejects.toThrow();
  });

  it("a failed response is an error", async () => {
    get.mockResolvedValue({ data: { isSuccess: false, message: "No cost" } });
    await expect(internalStockTransferApi.getUnitCost(55, 2)).rejects.toThrow("No cost");
  });
});

describe("stock adjustment unit cost API", () => {
  beforeEach(() => get.mockReset());

  it("calls its own endpoint and returns the cost as a number", async () => {
    get.mockResolvedValue({ data: { isSuccess: true, data: { cost: 120 } } });
    await expect(stockAdjustmentApi.getUnitCost(55, 2)).resolves.toBe(120);
    expect(String(get.mock.calls[0][0])).toMatch(/\/55\/unit-cost\/2$/);
  });

  it("a zero cost is valid; an empty body is an error, not 0", async () => {
    get.mockResolvedValue({ data: { isSuccess: true, data: { cost: 0 } } });
    await expect(stockAdjustmentApi.getUnitCost(55, 2)).resolves.toBe(0);
    get.mockResolvedValue({ data: { isSuccess: true, data: { cost: null } } });
    await expect(stockAdjustmentApi.getUnitCost(55, 2)).rejects.toThrow();
  });
});
