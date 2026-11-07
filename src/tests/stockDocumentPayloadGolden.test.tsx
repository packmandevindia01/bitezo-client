// @vitest-environment jsdom
/**
 * Phase 5 safety net: what the stock documents send when a saved document is opened and saved again, through the
 * real hooks and API layers with only the network mocked. Only the clock fields are removed.
 * One line is in a bigger unit (12 per box), one in the base unit, with amounts that show float errors.
 */
import { createElement, type ReactNode } from "react";
import { Provider } from "react-redux";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor, act, cleanup } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { store } from "../app/store";
import { useStockAdjustment } from "../features/transaction/stockAdjustment/hooks/useStockAdjustment";
import { savedUnitValue, usePhysicalEntry } from "../features/transaction/physicalEntry/hooks/usePhysicalEntry";
import { useInternalStockTransfer } from "../features/transaction/internalStockTransfer/hooks/useInternalStockTransfer";
import { useProductionForm } from "../features/transaction/production/hooks/useProductionForm";

const http = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn() }));
vi.mock("../api/axiosInstance", () => ({ default: http }));
vi.mock("../features/inventory/branches/services/branchApi", () => {
  const names = vi.fn(async () => [{ id: 2, branchName: "Main" }, { id: 3, branchName: "Mall" }]);
  return { fetchBranchNames: names, fetchBranches: names, branchApi: { fetchBranchNames: names } };
});
vi.mock("../features/inventory/product/services/productService", () => ({
  productService: { loadMasterData: vi.fn(async () => null), getById: vi.fn(async () => null), getClosingStock: vi.fn(async () => 0), getAverageCost: vi.fn(async () => 0) },
}));
vi.mock("../app/providers/useToast", () => ({ useToast: () => ({ showToast: vi.fn() }) }));

const lines = [
  { productId: 5, productCode: "P5", barcode: "P5", productName: "Rice", unitId: 2, unitName: "Box", unitCategory: "Count", qty: 3, baseQty: 36, price: 1.1, cost: 1.1, amount: 3.3, typeId: 1, typeName: "Damage", effect: "-" },
  { productId: 6, productCode: "P6", barcode: "P6", productName: "Oil", unitId: 1, unitName: "Nos", unitCategory: "Count", qty: 0.1, baseQty: 0.1, price: 0.2, cost: 0.2, amount: 0.02, typeId: 1, typeName: "Damage", effect: "+" },
];
const units = [{ unitId: 1, name: "Nos", unitName: "Nos", currentValue: 1 }, { unitId: 2, name: "Box", unitName: "Box", currentValue: 12 }];
const master = { transDate: "2026-11-05T00:00:00", refNo: "R5", branchId: 2, fromBranchId: 2, toBranchId: 3, employeeId: 4, narration: "note", netAmount: 3.32 };
const production = {
  masterData: { ...master, productionDate: "2026-11-05T00:00:00", productionNo: "7", productId: 9, unitId: 2, qty: 2, totalWage: 1.5, finishedProductName: "Cake" },
  detailsData: lines,
};

const wrapper = ({ children }: { children: ReactNode }) => createElement(Provider, {
  store,
  children: createElement(QueryClientProvider, { client: new QueryClient({ defaultOptions: { queries: { retry: false } } }), children }),
});
const withoutClock = (p: Record<string, unknown>) => Object.fromEntries(Object.entries(p).filter(([k]) => !["createdAt", "updatedAt", "updateAt"].includes(k)));

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.setItem("decimalPart", "3");
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
  http.post.mockResolvedValue({ data: { isSuccess: true, data: {} } });
  http.put.mockResolvedValue({ data: { isSuccess: true, data: {} } });
  http.get.mockImplementation(async (url: string) => {
    const ok = (data: unknown) => ({ data: { isSuccess: true, data } });
    if (url.startsWith("/production/data/")) return ok(production);
    if (url.includes("/data/")) return ok({ masterData: master, detailsData: lines });
    if (url.includes("product-cost-data")) return ok({ productId: 5, unitCategory: "Count", baseUnitId: 1, cost: 1 });
    if (url.includes("unit-list") || url.includes("units")) return ok(units);
    if (url.includes("ref-number")) return ok({ refNo: "R9" });
    return ok([]);
  });
});
afterEach(() => cleanup());

describe("payloads sent today, editing a saved document", () => {
  it("Stock Adjustment", async () => {
    const { result } = renderHook(() => useStockAdjustment("1"), { wrapper });
    await waitFor(() => expect(result.current.methods.getValues("items")?.length).toBe(2));
    await waitFor(() => expect(result.current.methods.getValues("items.0.product")).toBe("5"));
    await act(async () => { await new Promise((r) => setTimeout(r, 40)); });
    await act(async () => { await result.current.onSubmit(result.current.methods.getValues()); });
    const [url, body] = http.put.mock.calls[0];
    expect(url).toBe("/stock-adjustment/1");
    expect(withoutClock(body)).toMatchSnapshot();
  });

  it("Physical Entry", async () => {
    const { result } = renderHook(() => usePhysicalEntry("1"), { wrapper });
    await waitFor(() => expect(result.current.methods.getValues("items.0.product")).toBe("5"));
    await act(async () => { await new Promise((r) => setTimeout(r, 40)); });
    await act(async () => { await result.current.handleFormSubmit(result.current.methods.getValues()); });
    const [url, body] = http.put.mock.calls[0];
    expect(url).toBe("/physical-entry/1");
    expect(withoutClock(body)).toMatchSnapshot();
  });

  it("Stock Transfer", async () => {
    const { result } = renderHook(() => useInternalStockTransfer("1"), { wrapper });
    await waitFor(() => expect(result.current.methods.getValues("items.0.product")).toBe("5"));
    await act(async () => { await new Promise((r) => setTimeout(r, 40)); });
    await act(async () => { await result.current.onSubmit(result.current.methods.getValues()); });
    const [url, body] = http.put.mock.calls[0];
    expect(url).toBe("/stock-transfer/1");
    expect(withoutClock(body)).toMatchSnapshot();
  });

  it("Production", async () => {
    const { result } = renderHook(() => useProductionForm(1), { wrapper });
    await waitFor(() => expect(result.current.form.getValues("items")?.[0]?.product).toBe("5"));
    await act(async () => { await new Promise((r) => setTimeout(r, 40)); });
    await act(async () => { await result.current.onSubmit(); });
    await waitFor(() => expect(http.put).toHaveBeenCalled());
    const [url, body] = http.put.mock.calls[0];
    expect(url).toBe("/production/1");
    expect(withoutClock(body)).toMatchSnapshot();
  });
});

describe("Physical Entry unit values", () => {
  it("come from a saved line's baseQty per qty, never baseQty itself", () => {
    expect(savedUnitValue(36, "3")).toBe(12);
    expect(savedUnitValue(0.1, "0.1")).toBe(1);
    expect(savedUnitValue(undefined, "3")).toBe(1);
    expect(savedUnitValue(36, "0")).toBe(1);
  });
});
