// @vitest-environment jsdom
/**
 * Phase 5 safety net: product search and barcode scan on Stock Adjustment and Physical Entry, through the real hooks
 * and API layers with only the network mocked. Written against the two separate copies.
 */
import { createElement, type ReactNode } from "react";
import { Provider } from "react-redux";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor, act, cleanup } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { store } from "../app/store";
import { useStockAdjustment } from "../features/transaction/stockAdjustment/hooks/useStockAdjustment";
import { usePhysicalEntry } from "../features/transaction/physicalEntry/hooks/usePhysicalEntry";
import { productService } from "../features/inventory/product/services/productService";

const http = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn() }));
vi.mock("../api/axiosInstance", () => ({ default: http }));
vi.mock("../features/inventory/product/services/productService", () => ({
  productService: { loadMasterData: vi.fn(async () => null), getById: vi.fn(async () => null), getClosingStock: vi.fn(async () => ({ stock: 7 })), getAverageCost: vi.fn(async () => 0) },
}));
vi.mock("../app/providers/useToast", () => ({ useToast: () => ({ showToast: vi.fn() }) }));

const ok = (data: unknown) => ({ data: { isSuccess: true, data } });
const RICE = { productId: 5, productName: "Rice", code: "P5", barcode: "B5" };
const OIL = { productId: 6, productName: "Oil", code: "", barcode: "B6" };
const COST = { productId: 5, productCode: "P5", productName: "Rice", baseUnitId: 2, cost: 1.5, unitCategory: "Count" };

const wrapper = ({ children }: { children: ReactNode }) => createElement(Provider, {
  store,
  children: createElement(QueryClientProvider, { client: new QueryClient({ defaultOptions: { queries: { retry: false } } }), children }),
});
const settle = () => act(async () => { await new Promise((r) => setTimeout(r, 40)); });

/** Replies by URL for the document under test; anything not set returns an empty list. */
let replies: Record<string, unknown>;
const productCalls = (base: string) => http.get.mock.calls.filter(([u]) => u === `${base}/product-list-name`).map(([, c]) => c.params.productName);
const costCalls = (base: string) => http.get.mock.calls.filter(([u]) => String(u).startsWith(`${base}/product-cost-data/`)).map(([u]) => String(u).split("/").pop());

/* eslint-disable @typescript-eslint/no-explicit-any -- each hook returns its own shape */
const DOCS = [
  { name: "Stock Adjustment", useDocument: (id?: string) => useStockAdjustment(id) as any, base: "/stock-adjustment" },
  { name: "Physical Entry", useDocument: (id?: string) => usePhysicalEntry(id) as any, base: "/physical-entry" },
] as const;

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
  localStorage.clear();
  sessionStorage.setItem("tempSystemType", "backoffice");
  localStorage.setItem("decimalPart", "3");
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
  replies = {};
  http.get.mockImplementation(async (url: string, config?: { params?: Record<string, unknown> }) => {
    const key = config?.params?.productName !== undefined ? `${url}?${config.params.productName}` : url;
    if (key in replies) {
      const reply = replies[key];
      if (reply instanceof Error) throw reply;
      return ok(reply);
    }
    if (url === "/Branch/list") return ok([{ branchId: 2, branchName: "Main" }]);
    if (url.includes("as-on-date-stock")) return ok({ stock: 8 });
    if (url.includes("product-cost-data")) throw new Error("not found");
    if (url.includes("/data/")) return ok({ masterData: { transDate: "2026-11-05T00:00:00", refNo: "R1", branchId: 2, employeeId: 4 }, detailsData: [] });
    return ok([]);
  });
});
afterEach(() => cleanup());

describe.each(DOCS)("$name product lookup", ({ useDocument, base }) => {
  const open = async (id?: string) => {
    const view = renderHook(() => useDocument(id), { wrapper });
    await waitFor(() => expect(view.result.current.methods.getValues("branch")).toBe("2"));
    await settle();
    return view.result;
  };
  const search = async (result: { current: any }, query: string) => {
    await act(async () => { await result.current.handleProductSearch(query); });
  };
  const scan = async (result: { current: any }, barcode: string) => {
    let found: unknown;
    await act(async () => { found = await result.current.handleBarcodeScan(0, barcode); });
    await settle();
    return found;
  };
  const line = (result: { current: any }) => result.current.methods.getValues("items.0");
  const rowLabels = (result: { current: any }) => result.current.getRowOptions(0).map((o: { label: string }) => o.label);

  it("search labels each result with its code", async () => {
    const result = await open();
    replies[`${base}/product-list-name?ri`] = [RICE, OIL];
    await search(result, "ri");
    expect(rowLabels(result)).toEqual(["[P5] Rice", "Oil"]);
    expect(result.current.getRowOptions(0)[0]).toMatchObject({ value: "5", code: "P5", barcode: "B5" });
  });

  it("a code match goes first, and a product is listed once", async () => {
    const result = await open();
    replies[`${base}/product-list-name?P5`] = [OIL, RICE];
    replies[`${base}/product-cost-data/P5`] = COST;
    await search(result, "P5");
    expect(rowLabels(result)).toEqual(["[P5] Rice", "Oil"]);
    expect(result.current.getRowOptions(0)[0].barcode).toBe("P5");
  });

  it("a failed name search still shows the code match", async () => {
    const result = await open();
    replies[`${base}/product-list-name?P5`] = new Error("down");
    replies[`${base}/product-cost-data/P5`] = COST;
    await search(result, "P5");
    expect(rowLabels(result)).toEqual(["[P5] Rice"]);
  });

  it("the row keeps the saved product even when the search no longer lists it", async () => {
    const result = await open();
    replies[`${base}/product-list-name?ol`] = [OIL];
    await search(result, "ol");
    act(() => {
      result.current.methods.setValue("items.0.product", "5");
      result.current.methods.setValue("items.0.productName", "[P5] Rice");
    });
    await settle();
    expect(rowLabels(result)).toEqual(["[P5] Rice", "Oil"]);
  });

  it("a scan fills the line and adds the product to the list", async () => {
    const result = await open();
    replies[`${base}/product-cost-data/B5`] = COST;
    expect(await scan(result, "B5")).toBe(true);
    expect(line(result)).toMatchObject({ product: "5", productName: "[P5] Rice", code: "P5", unitCategory: "Count", unitId: 2, unit: "2", cost: "1.500" });
    expect(rowLabels(result)).toContain("[P5] Rice");
    expect(http.get).toHaveBeenCalledWith(`${base}/unit-list-name`, { params: { unitCategory: "Count" } });
  });

  it("a scan with no code match uses the first name match's barcode", async () => {
    const result = await open();
    replies[`${base}/product-list-name?rice`] = [RICE, OIL];
    replies[`${base}/product-cost-data/B5`] = COST;
    expect(await scan(result, "rice")).toBe(true);
    expect(costCalls(base)).toEqual(["rice", "B5"]);
    expect(line(result)).toMatchObject({ product: "5", cost: "1.500", unit: "2" });
  });

  it("a name match with no cost data still fills product and code", async () => {
    const result = await open();
    replies[`${base}/product-list-name?rice`] = [RICE];
    expect(await scan(result, "rice")).toBe(true);
    expect(line(result)).toMatchObject({ product: "5", productName: "[P5] Rice", code: "P5" });
    expect(line(result).unitCategory ?? "").toBe("");
    expect(rowLabels(result)).toContain("[P5] Rice");
  });

  it("an unknown barcode returns false and leaves the product empty", async () => {
    const result = await open();
    expect(await scan(result, "nope")).toBe(false);
    expect(line(result).product).toBe("");
  });
});

describe("what differs between the two", () => {
  const openDoc = async (useDocument: (typeof DOCS)[number]["useDocument"], id?: string) => {
    const view = renderHook(() => useDocument(id), { wrapper });
    await waitFor(() => expect(view.result.current.methods.getValues("branch")).toBe("2"));
    await settle();
    return view.result;
  };
  const [adjustment, physical] = DOCS;

  it("Stock Adjustment trims the search text, Physical Entry sends it as typed", async () => {
    const sa = await openDoc(adjustment.useDocument);
    await act(async () => { await sa.current.handleProductSearch("  ri "); });
    expect(productCalls(adjustment.base).at(-1)).toBe("ri");
    const pe = await openDoc(physical.useDocument);
    await act(async () => { await pe.current.handleProductSearch("  ri "); });
    expect(productCalls(physical.base).at(-1)).toBe("  ri ");
  });

  it("an empty search: Stock Adjustment reuses its loaded list, Physical Entry asks again", async () => {
    replies[`${adjustment.base}/product-list-name?`] = [RICE];
    replies[`${physical.base}/product-list-name?`] = [RICE];
    const sa = await openDoc(adjustment.useDocument);
    await waitFor(() => expect(sa.current.getRowOptions(0).length).toBe(1));
    const saBefore = productCalls(adjustment.base).length;
    await act(async () => { await sa.current.handleProductSearch(""); });
    expect(productCalls(adjustment.base).length).toBe(saBefore);

    const pe = await openDoc(physical.useDocument);
    const peBefore = productCalls(physical.base).length;
    await act(async () => { await pe.current.handleProductSearch(""); });
    expect(productCalls(physical.base).length).toBe(peBefore + 1);
  });

  it("a scan on a new document: closing stock on Adjustment, as-on-date stock on Physical Entry", async () => {
    replies[`${adjustment.base}/product-cost-data/B5`] = COST;
    replies[`${physical.base}/product-cost-data/B5`] = COST;
    const sa = await openDoc(adjustment.useDocument);
    await act(async () => { await sa.current.handleBarcodeScan(0, "B5"); });
    await waitFor(() => expect(sa.current.methods.getValues("items.0.stock")).toBe(7));
    expect(productService.getClosingStock).toHaveBeenCalledWith(5, 2);

    const pe = await openDoc(physical.useDocument);
    await act(async () => { await pe.current.handleBarcodeScan(0, "B5"); });
    await waitFor(() => expect(pe.current.methods.getValues("items.0.stock")).toBe(8));
    expect(http.get.mock.calls.some(([u]) => String(u) === "/product/as-on-date-stock/5/2")).toBe(true);
  });

  it("a scan on a saved document: Adjustment still loads stock, Physical Entry shows a dash", async () => {
    replies[`${adjustment.base}/product-cost-data/B5`] = COST;
    replies[`${physical.base}/product-cost-data/B5`] = COST;
    const sa = await openDoc(adjustment.useDocument, "1");
    await act(async () => { await sa.current.handleBarcodeScan(0, "B5"); });
    await waitFor(() => expect(sa.current.methods.getValues("items.0.stock")).toBe(7));

    const pe = await openDoc(physical.useDocument, "1");
    await act(async () => { await pe.current.handleBarcodeScan(0, "B5"); });
    await settle();
    expect(pe.current.methods.getValues("items.0.stock")).toBe("-");
  });
});
