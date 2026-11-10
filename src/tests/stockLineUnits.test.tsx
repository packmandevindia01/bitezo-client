// @vitest-environment jsdom
/**
 * Phase 5 safety net: changing a line's unit and loading the unit lists, through the real hooks and API layers with
 * only the network mocked. Written against the separate copies.
 */
import { createElement, type ReactNode } from "react";
import { Provider } from "react-redux";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor, act, cleanup } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { store } from "../app/store";
import { useStockAdjustment } from "../features/transaction/stockAdjustment/hooks/useStockAdjustment";
import { usePhysicalEntry } from "../features/transaction/physicalEntry/hooks/usePhysicalEntry";
import { useInternalStockTransfer } from "../features/transaction/internalStockTransfer/hooks/useInternalStockTransfer";
import { productService } from "../features/inventory/product/services/productService";

const http = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn() }));
const showToast = vi.hoisted(() => vi.fn());
vi.mock("../api/axiosInstance", () => ({ default: http }));
vi.mock("../features/inventory/product/services/productService", () => ({
  productService: { loadMasterData: vi.fn(async () => null), getById: vi.fn(async () => null), getClosingStock: vi.fn(async () => ({ stock: 7 })), getAverageCost: vi.fn(async () => 0) },
}));
vi.mock("../app/providers/useToast", () => ({ useToast: () => ({ showToast }) }));

const ok = (data: unknown) => ({ data: { isSuccess: true, data } });
const wrapper = ({ children }: { children: ReactNode }) => createElement(Provider, {
  store,
  children: createElement(QueryClientProvider, { client: new QueryClient({ defaultOptions: { queries: { retry: false } } }), children }),
});
const settle = () => act(async () => { await new Promise((r) => setTimeout(r, 40)); });
const WARNING = "Could not load the cost for this unit. Please check the Cost before saving.";

let unitCost: () => Promise<unknown>;
let unitRows: unknown[];
let unitListFails = false;

/* eslint-disable @typescript-eslint/no-explicit-any -- each hook returns its own shape */
const WITH_GUARD = [
  { name: "Stock Adjustment", useDocument: () => useStockAdjustment() as any, base: "/stock-adjustment", field: "branch" },
  { name: "Stock Transfer", useDocument: () => useInternalStockTransfer() as any, base: "/stock-transfer", field: "fromBranch" },
] as const;

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
  localStorage.clear();
  sessionStorage.setItem("tempSystemType", "backoffice");
  localStorage.setItem("decimalPart", "3");
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
  unitCost = async () => ok({ cost: 2.5 });
  unitListFails = false;
  unitRows = [{ unitId: 1, name: "Nos", currentValue: 1 }, { id: 2, unitName: "Box", currentvalue: 12 }, { unitId: 3, name: "Bag" }];
  http.get.mockImplementation(async (url: string) => {
    if (url === "/Branch/list") return ok([{ branchId: 2, branchName: "Main" }]);
    if (url.includes("/unit-cost/")) return unitCost();
    if (url.includes("product-cost-data")) return ok({ productId: 5, productCode: "P5", productName: "Rice", baseUnitId: 1, cost: 1, unitCategory: "Count" });
    if (url.includes("unit-list")) {
      if (unitListFails) throw new Error("down");
      return ok(unitRows);
    }
    if (url.endsWith("/product-list-name")) return ok([{ productId: 5, productName: "Rice", code: "P5", barcode: "B5" }]);
    return ok([]);
  });
});
afterEach(() => cleanup());

describe.each(WITH_GUARD)("$name unit change", ({ useDocument, base, field }) => {
  const open = async () => {
    const view = renderHook(useDocument, { wrapper });
    await waitFor(() => expect(view.result.current.methods.getValues(field)).toBe("2"));
    await settle();
    act(() => {
      view.result.current.methods.setValue("items.0.id", "L1");
      view.result.current.methods.setValue("items.0.product", "5");
      view.result.current.methods.setValue("items.0.cost", "1.000");
    });
    return view.result;
  };
  const value = (result: { current: any }, name: string) => result.current.methods.getValues(`items.0.${name}`);

  it("sets the unit, loads its cost and refreshes the stock", async () => {
    const result = await open();
    await act(async () => { await result.current.handleUnitChange(0, "2"); });
    await settle();
    expect(http.get).toHaveBeenCalledWith(`${base}/5/unit-cost/2`);
    expect(value(result, "unit")).toBe("2");
    expect(value(result, "unitId")).toBe(2);
    expect(value(result, "cost")).toBe("2.500");
    expect(productService.getClosingStock).toHaveBeenCalledWith(5, 2);
    expect(value(result, "stock")).toBe(7);
  });

  it("does nothing more on a line with no product", async () => {
    const result = await open();
    act(() => result.current.methods.setValue("items.0.product", ""));
    await act(async () => { await result.current.handleUnitChange(0, "2"); });
    expect(value(result, "unit")).toBe("2");
    expect(http.get.mock.calls.some(([u]) => String(u).includes("/unit-cost/"))).toBe(false);
  });

  it("a slow reply does not change a line whose unit has moved on", async () => {
    const result = await open();
    let release: (v: unknown) => void = () => {};
    unitCost = () => new Promise((r) => { release = r; });
    let pending: Promise<unknown> = Promise.resolve();
    act(() => { pending = result.current.handleUnitChange(0, "2"); });
    await settle();
    act(() => result.current.methods.setValue("items.0.unit", "3"));
    await act(async () => { release(ok({ cost: 9 })); await pending; });
    expect(value(result, "cost")).toBe("1.000");
    expect(productService.getClosingStock).not.toHaveBeenCalled();
  });

  it("a failed reply warns the cashier", async () => {
    const result = await open();
    unitCost = async () => { throw new Error("down"); };
    await act(async () => { await result.current.handleUnitChange(0, "2"); });
    expect(showToast).toHaveBeenCalledWith(WARNING, "warning");
    expect(value(result, "cost")).toBe("1.000");
  });

  it("a failed reply for a line that moved on stays quiet", async () => {
    const result = await open();
    let fail: (e: Error) => void = () => {};
    unitCost = () => new Promise((_, reject) => { fail = reject; });
    let pending: Promise<unknown> = Promise.resolve();
    act(() => { pending = result.current.handleUnitChange(0, "2"); });
    await settle();
    act(() => result.current.methods.setValue("items.0.unit", "3"));
    await act(async () => { fail(new Error("down")); await pending; });
    expect(showToast).not.toHaveBeenCalled();
  });

  it("a failed stock lookup shows Error", async () => {
    vi.mocked(productService.getClosingStock).mockRejectedValueOnce(new Error("down"));
    const result = await open();
    await act(async () => { await result.current.handleUnitChange(0, "2"); });
    await settle();
    expect(value(result, "stock")).toBe("Error");
  });
});

describe("Stock Transfer product choice", () => {
  it("fills the line and loads the closing stock of the From branch", async () => {
    const view = renderHook(() => useInternalStockTransfer() as any, { wrapper });
    await waitFor(() => expect(view.result.current.methods.getValues("fromBranch")).toBe("2"));
    await settle();
    await act(async () => { await view.result.current.handleProductSelect(0, "5"); });
    await settle();
    expect(view.result.current.methods.getValues("items.0")).toMatchObject({ code: "B5", productName: "Rice", unit: "1", unitCategory: "Count", cost: "1.000", stock: 7 });
    expect(productService.getClosingStock).toHaveBeenCalledWith(5, 2);
  });
});

describe.each([
  { name: "Stock Adjustment", useDocument: () => useStockAdjustment() as any, base: "/stock-adjustment", field: "branch", fill: (r: any) => r.handleBarcodeScan(0, "B5") },
  { name: "Physical Entry", useDocument: () => usePhysicalEntry() as any, base: "/physical-entry", field: "branch", fill: (r: any) => r.handleBarcodeScan(0, "B5") },
  { name: "Stock Transfer", useDocument: () => useInternalStockTransfer() as any, base: "/stock-transfer", field: "fromBranch", fill: (r: any) => r.handleProductSelect(0, "5") },
] as const)("$name unit list", ({ useDocument, base, field, fill }) => {
  const open = async () => {
    const view = renderHook(useDocument, { wrapper });
    await waitFor(() => expect(view.result.current.methods.getValues(field)).toBe("2"));
    await settle();
    return view.result;
  };
  const unitListCalls = () => http.get.mock.calls.filter(([u]) => u === `${base}/unit-list-name`).length;

  it("reads every field spelling, and a missing value counts as 1", async () => {
    const result = await open();
    await act(async () => { await fill(result.current); });
    await waitFor(() => expect(result.current.categoryUnits.Count).toBeDefined());
    expect(result.current.categoryUnits.Count).toEqual([
      { label: "Nos", value: "1", currentValue: 1 },
      { label: "Box", value: "2", currentValue: 12 },
      { label: "Bag", value: "3", currentValue: 1 },
    ]);
  });

  it("loads a category once", async () => {
    const result = await open();
    await act(async () => { await fill(result.current); });
    await waitFor(() => expect(result.current.categoryUnits.Count).toBeDefined());
    const before = unitListCalls();
    await act(async () => { await fill(result.current); });
    await settle();
    expect(unitListCalls()).toBe(before);
  });

  it("a failed load can be tried again", async () => {
    const result = await open();
    unitListFails = true;
    await act(async () => { await fill(result.current); });
    await settle();
    expect(result.current.categoryUnits.Count).toBeUndefined();
    unitListFails = false;
    await act(async () => { await fill(result.current); });
    await waitFor(() => expect(result.current.categoryUnits.Count).toBeDefined());
  });
});
