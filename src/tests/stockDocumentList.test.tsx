// @vitest-environment jsdom
/**
 * Phase 5 safety net: Stock Adjustment and Physical Entry saved lists and API calls, on the rendered page with only
 * the network mocked. Written against the two separate pages, so the shared page has to behave the same.
 */
import { createElement, type ComponentType } from "react";
import { Provider } from "react-redux";
import { MemoryRouter, useLocation } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, fireEvent, waitFor, cleanup, within } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { store } from "../app/store";
import StockAdjustmentListPage from "../features/transaction/stockAdjustment/pages/StockAdjustmentListPage";
import PhysicalEntryListPage from "../features/transaction/physicalEntry/pages/PhysicalEntryListPage";
import { stockAdjustmentApi } from "../features/transaction/stockAdjustment/services/stockAdjustmentApi";
import { physicalEntryApi } from "../features/transaction/physicalEntry/services/physicalEntryApi";

const http = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn() }));
vi.mock("../api/axiosInstance", () => ({ default: http }));
vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });

const ok = (data: unknown) => ({ data: { isSuccess: true, data } });
const REAL_BRANCHES = [{ branchId: 2, branchName: "Main" }, { branchId: 3, branchName: "Mall" }];
const WITH_ALL = [{ branchId: 1, branchName: "All" }, ...REAL_BRANCHES];
const ROWS = [
  { transId: 5, transDate: "2026-11-03T00:00:00", refNo: "OLD", branch: "Main", netAmount: 10 },
  { transId: 8, transDate: "2026-11-05T00:00:00", refNo: "NEW", branch: "Main", netAmount: 20.5 },
  { transId: 9, transDate: "2026-11-05T00:00:00", refNo: "NEWEST", branch: "Mall", netAmount: 1 },
];

const Where = () => {
  const { pathname, search } = useLocation();
  return createElement("output", { "data-testid": "where" }, pathname + search);
};

const show = (Page: ComponentType) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const invalidate = vi.spyOn(client, "invalidateQueries");
  render(createElement(Provider, {
    store,
    children: createElement(QueryClientProvider, {
      client,
      children: createElement(MemoryRouter, { initialEntries: ["/list"] }, createElement(Page), createElement(Where)),
    }),
  }));
  return { invalidate };
};

const detailCalls = (base: string) => http.get.mock.calls.filter(([url]) => url === `${base}/details`);
const lastParams = (base: string) => detailCalls(base).at(-1)?.[1]?.params;
const rowTexts = () => Array.from(document.querySelectorAll("tbody tr")).map((row) => row.textContent ?? "");
const branchSelect = () => document.getElementById("filter-branch") as HTMLSelectElement;
const headerCell = (name: string) => Array.from(document.querySelectorAll("th")).find((th) => th.textContent?.trim() === name) as HTMLElement;
const loaded = () => waitFor(() => expect(rowTexts().join()).toContain("NEWEST"));

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
  localStorage.clear();
  sessionStorage.setItem("tempSystemType", "backoffice");
  localStorage.setItem("decimalPart", "3");
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
  http.put.mockResolvedValue(ok({}));
  http.post.mockResolvedValue(ok({}));
  http.get.mockImplementation(async (url: string) => {
    if (url === "/Branch/list") return ok(REAL_BRANCHES);
    if (url.endsWith("/list-name") || url.endsWith("/list-branch-name")) return ok(WITH_ALL);
    if (url.endsWith("/details")) return ok(ROWS);
    return ok([]);
  });
});
afterEach(() => cleanup());

describe.each([
  {
    name: "Stock Adjustment", Page: StockAdjustmentListPage, base: "/stock-adjustment", route: "/dashboard/stock-adjustment",
    table: "Stock Adjustment Records",
    tip: "Cancel Adjustment", dialog: "Cancel Stock Adjustment", confirm: "Cancel Record",
    message: "Are you sure you want to cancel this stock adjustment? This action cannot be undone.",
    failed: "Failed to cancel stock adjustment",
  },
  {
    name: "Physical Entry", Page: PhysicalEntryListPage, base: "/physical-entry", route: "/dashboard/physical-entry",
    table: "Physical Entry Records",
    tip: "Cancel Entry", dialog: "Cancel Physical Entry", confirm: "Cancel Entry",
    message: "Are you sure you want to cancel this entry? This action cannot be undone and will reverse the stock changes.",
    failed: "Failed to cancel physical entry",
  },
])("$name saved list", (doc) => {
  it("shows its own table title", async () => {
    show(doc.Page);
    await loaded();
    expect(screen.getByText(doc.table)).toBeTruthy();
  });

  it("asks for the opening filters, All by default", async () => {
    show(doc.Page);
    await loaded();
    const today = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const month = `${today.getFullYear()}-${pad(today.getMonth() + 1)}`;
    expect(lastParams(doc.base)).toEqual({ BranchId: 1, FromDate: `${month}-01`, ToDate: `${month}-${pad(today.getDate())}`, Decimals: 3 });
    expect(branchSelect().value).toBe("1");
    expect(branchSelect().disabled).toBe(false);
  });

  it("lists the newest first, by date then id", async () => {
    show(doc.Page);
    await loaded();
    const texts = rowTexts();
    expect(texts[0]).toContain("NEWEST");
    expect(texts[1]).toContain("NEW");
    expect(texts[2]).toContain("OLD");
  });

  it("numbers the rows and shows date, branch and total", async () => {
    show(doc.Page);
    await loaded();
    const cells = Array.from(document.querySelectorAll("tbody tr")[1].querySelectorAll("td")).map((td) => td.textContent?.trim());
    expect(cells.slice(0, 5)).toEqual(["2", "2026-11-05", "NEW", "Main", "20.500"]);
  });

  it("search matches Ref No and Branch, in any case", async () => {
    show(doc.Page);
    await loaded();
    const search = screen.getByPlaceholderText("Search by Ref No or Branch...");
    fireEvent.change(search, { target: { value: "newest" } });
    expect(rowTexts()).toHaveLength(1);
    fireEvent.change(search, { target: { value: "MALL" } });
    expect(rowTexts()[0]).toContain("NEWEST");
    expect(rowTexts()).toHaveLength(1);
  });

  it("Add New and Edit go to the document", async () => {
    show(doc.Page);
    await loaded();
    fireEvent.click(screen.getByText("Add New"));
    expect(screen.getByTestId("where").textContent).toBe(doc.route);
    fireEvent.click(within(document.querySelectorAll("tbody tr")[0] as HTMLElement).getByTitle("Edit"));
    expect(screen.getByTestId("where").textContent).toBe(`${doc.route}?id=9`);
  });

  it("cancelling asks first, then cancels, reloads and refreshes the stock reports", async () => {
    const { invalidate } = show(doc.Page);
    await loaded();
    fireEvent.click(within(document.querySelectorAll("tbody tr")[0] as HTMLElement).getByTitle(doc.tip));
    expect(screen.getByText(doc.dialog)).toBeTruthy();
    expect(screen.getByText(doc.message)).toBeTruthy();
    expect(http.put).not.toHaveBeenCalled();
    const before = detailCalls(doc.base).length;
    fireEvent.click(screen.getByText(doc.confirm));
    await waitFor(() => expect(http.put).toHaveBeenCalledWith(`${doc.base}/cancel/9`));
    await waitFor(() => expect(detailCalls(doc.base).length).toBeGreaterThan(before));
    await waitFor(() => expect(screen.queryByText(doc.dialog)).toBeNull());
    const keys = invalidate.mock.calls.map(([filter]) => filter?.queryKey?.[0]);
    expect(keys).toEqual(expect.arrayContaining([
      "stockRegisterReport", "productClosingStock", "stockAdjustmentReport", "productWiseStockAdjustmentReport", "productTransactionLogReport",
    ]));
  });

  it("a failed cancel shows the reason, or its own message when there is none", async () => {
    show(doc.Page);
    await loaded();
    http.put.mockRejectedValueOnce(new Error("Already cancelled"));
    fireEvent.click(within(document.querySelectorAll("tbody tr")[0] as HTMLElement).getByTitle(doc.tip));
    fireEvent.click(screen.getByText(doc.confirm));
    await waitFor(() => expect(screen.getByText("Already cancelled")).toBeTruthy());
    http.put.mockRejectedValueOnce(new Error(""));
    fireEvent.click(within(document.querySelectorAll("tbody tr")[0] as HTMLElement).getByTitle(doc.tip));
    fireEvent.click(screen.getByText(doc.confirm));
    await waitFor(() => expect(screen.getByText(doc.failed)).toBeTruthy());
  });

  it("a failed load shows the reason", async () => {
    http.get.mockImplementation(async (url: string) => {
      if (url.endsWith("/details")) return { data: { isSuccess: false, message: "Server said no" } };
      return ok(WITH_ALL);
    });
    show(doc.Page);
    await waitFor(() => expect(screen.getByText("Server said no")).toBeTruthy());
  });

  it("lists every branch once, in the order the navbar API sends", async () => {
    show(doc.Page);
    await loaded();
    await waitFor(() => expect(branchSelect().options.length).toBe(3));
    const labels = Array.from(branchSelect().options).filter((o) => !o.hidden).map((o) => o.text);
    expect(labels).toEqual(["All", "Main", "Mall"]);
  });

  it("loads its own branch list once when the page opens", async () => {
    show(doc.Page);
    await loaded();
    await new Promise((r) => setTimeout(r, 30));
    expect(http.get.mock.calls.filter(([url]) => url === `${doc.base}/list-branch-name`)).toHaveLength(1);
  });

  it("changing the branch and dates reloads with them", async () => {
    show(doc.Page);
    await loaded();
    fireEvent.change(branchSelect(), { target: { value: "3" } });
    await waitFor(() => expect(lastParams(doc.base).BranchId).toBe(3));
    fireEvent.change(screen.getByLabelText("From Date"), { target: { value: "2026-10-01" } });
    await waitFor(() => expect(lastParams(doc.base).FromDate).toBe("2026-10-01"));
  });

  it("a user locked to a branch stays on it", async () => {
    sessionStorage.setItem("backoffice_activeBranchId", "3");
    show(doc.Page);
    await loaded();
    expect(lastParams(doc.base).BranchId).toBe(3);
    expect(branchSelect().disabled).toBe(true);
  });

  it("centres the columns and right-aligns the total", async () => {
    show(doc.Page);
    await loaded();
    expect(headerCell("Ref No").className).toContain("text-center");
    expect(headerCell("Total Amount").className).toContain("text-right");
  });
});

describe.each([
  ["Stock Adjustment", StockAdjustmentListPage, "/stock-adjustment"],
  ["Physical Entry", PhysicalEntryListPage, "/physical-entry"],
] as const)("%s: All comes from the backend", (_name, Page, base) => {
  it("picking it keeps it selected and asks the server for branch 1", async () => {
    show(Page);
    await loaded();
    await waitFor(() => expect(branchSelect().options.length).toBe(3));
    fireEvent.change(branchSelect(), { target: { value: "3" } });
    await waitFor(() => expect(lastParams(base).BranchId).toBe(3));
    fireEvent.change(branchSelect(), { target: { value: "1" } });
    await waitFor(() => expect(lastParams(base).BranchId).toBe(1));
    await new Promise((r) => setTimeout(r, 30));
    expect(branchSelect().selectedOptions[0].text).toBe("All");
    expect(lastParams(base).BranchId).toBe(1);
  });

  it("adds no All of its own", async () => {
    http.get.mockImplementation(async (url: string) => {
      if (url.endsWith("/details")) return ok(ROWS);
      return ok(REAL_BRANCHES);
    });
    show(Page);
    await loaded();
    await waitFor(() => expect(branchSelect().options.length).toBeGreaterThan(1));
    const labels = Array.from(branchSelect().options).map((o) => o.text);
    expect(labels).not.toContain("All Branches");
  });
});

describe.each([
  { name: "Stock Adjustment", api: stockAdjustmentApi as never as Record<string, (...a: unknown[]) => Promise<unknown>>, base: "/stock-adjustment", details: "getStockAdjustmentDetails", byId: "getStockAdjustmentById", cancel: "cancelStockAdjustment" },
  { name: "Physical Entry", api: physicalEntryApi as never as Record<string, (...a: unknown[]) => Promise<unknown>>, base: "/physical-entry", details: "getPhysicalEntryDetails", byId: "getPhysicalEntryById", cancel: "cancelPhysicalEntry" },
])("$name API requests", ({ api, base, details, byId, cancel }) => {
  it.each([
    ["getBranchList", [], "/list-branch-name", undefined],
    ["getEmployeeList", [4], "/list-employee-name", { params: { branchId: 4 } }],
    ["getProductListByName", ["Ri"], "/product-list-name", { params: { productName: "Ri" } }],
    ["getPurchaseCostData", ["B1"], "/product-cost-data/B1", undefined],
    ["getUnitList", ["Count"], "/unit-list-name", { params: { unitCategory: "Count" } }],
    ["getRefNumber", [2], "/ref-number/2", undefined],
  ] as const)("%s", async (method, args, path, config) => {
    http.get.mockResolvedValueOnce(ok("the data"));
    await expect(api[method](...args)).resolves.toBe("the data");
    expect(http.get.mock.calls[0]).toEqual(config ? [base + path, config] : [base + path]);
  });

  it("details sends only the filters given, with 3 decimals by default", async () => {
    await api[details]({ BranchId: 2, FromDate: "2026-11-01T10:00:00", ToDate: "2026-11-05", RefNo: "R" });
    expect(http.get).toHaveBeenLastCalledWith(`${base}/details`, { params: { BranchId: 2, FromDate: "2026-11-01", ToDate: "2026-11-05", RefNo: "R", Decimals: 3 } });
    await api[details]({ Decimals: 2 });
    expect(http.get).toHaveBeenLastCalledWith(`${base}/details`, { params: { Decimals: 2 } });
  });

  it("loads and cancels one document", async () => {
    await api[byId](7);
    expect(http.get).toHaveBeenLastCalledWith(`${base}/data/7`);
    await api[cancel](7);
    expect(http.put).toHaveBeenLastCalledWith(`${base}/cancel/7`);
  });

  it("isSuccess false is an error", async () => {
    http.get.mockResolvedValueOnce({ data: { isSuccess: false, message: "No access" } });
    await expect(api.getBranchList()).rejects.toThrow("No access");
  });
});

describe("what stays different between the two APIs", () => {
  it("unit cost: Stock Adjustment reads a number, Physical Entry returns the reply as sent", async () => {
    http.get.mockResolvedValueOnce(ok({ cost: 2.5 }));
    await expect(stockAdjustmentApi.getUnitCost(5, 1)).resolves.toBe(2.5);
    http.get.mockResolvedValueOnce(ok({ cost: 2.5 }));
    await expect(physicalEntryApi.getUnitCost(5, 1)).resolves.toEqual({ cost: 2.5 });
    expect(http.get).toHaveBeenCalledWith("/stock-adjustment/5/unit-cost/1");
    expect(http.get).toHaveBeenCalledWith("/physical-entry/5/unit-cost/1");
  });

  it("saving: only Physical Entry adds timestamps and transId", async () => {
    const payload = { transDate: "2026-11-05T09:00:00" } as never;
    await stockAdjustmentApi.createStockAdjustment(payload);
    expect(http.post).toHaveBeenLastCalledWith("/stock-adjustment", { transDate: "2026-11-05" });
    await stockAdjustmentApi.updateStockAdjustment(7, payload);
    expect(http.put).toHaveBeenLastCalledWith("/stock-adjustment/7", { transDate: "2026-11-05" });
    await physicalEntryApi.createPhysicalEntry(payload);
    expect(http.post).toHaveBeenLastCalledWith("/physical-entry", { transDate: "2026-11-05", createdAt: expect.any(String) });
    await physicalEntryApi.updatePhysicalEntry(7, payload);
    expect(http.put).toHaveBeenLastCalledWith("/physical-entry/7", { transDate: "2026-11-05", transId: 7, updatedAt: expect.any(String) });
  });

  it("Physical Entry reads as-on-date stock from the product API", async () => {
    await physicalEntryApi.getAsOnDateStock(5, 2, "2026-11-05T09:00:00");
    expect(http.get).toHaveBeenLastCalledWith("/product/as-on-date-stock/5/2", { params: { asOnDate: "2026-11-05" } });
  });
});
