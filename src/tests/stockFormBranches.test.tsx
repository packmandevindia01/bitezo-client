// @vitest-environment jsdom
/**
 * Phase 5 safety net: how the stock forms pick and list branches, and what a NEW document sends, through the real
 * hooks and API layers with only the network mocked. Written against the separate copies of the branch code.
 */
import { createElement, type ReactNode } from "react";
import { Provider } from "react-redux";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor, act, cleanup } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { store } from "../app/store";
import { addMasterBranch, clearMasterData } from "../features/inventory/shared/store/masterDataSlice";
import { notifyBranchesUpdated } from "../features/inventory/branches/utils/branchSync";
import { useStockAdjustment } from "../features/transaction/stockAdjustment/hooks/useStockAdjustment";
import { usePhysicalEntry } from "../features/transaction/physicalEntry/hooks/usePhysicalEntry";
import { useInternalStockTransfer } from "../features/transaction/internalStockTransfer/hooks/useInternalStockTransfer";
import { useInternalStockTransferList } from "../features/transaction/internalStockTransfer/hooks/useInternalStockTransferList";

const http = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn() }));
vi.mock("../api/axiosInstance", () => ({ default: http }));
vi.mock("../features/inventory/product/services/productService", () => ({
  productService: { loadMasterData: vi.fn(async () => null), getById: vi.fn(async () => null), getClosingStock: vi.fn(async () => 0), getAverageCost: vi.fn(async () => 0) },
}));
vi.mock("../app/providers/useToast", () => ({ useToast: () => ({ showToast: vi.fn() }) }));

const ok = (data: unknown) => ({ data: { isSuccess: true, data } });
const REAL = [{ branchId: 2, branchName: "Main" }, { branchId: 3, branchName: "Mall" }];
const WITH_ALL = [{ branchId: 1, branchName: "All" }, ...REAL];
const LINE = { id: "L1", product: "5", code: "P5", unit: "2", unitId: 2, unitCategory: "Count", qty: "3", cost: "1.1", type: "1", typeId: 1, effect: "-" };
const UNITS = [{ unitId: 1, name: "Nos", currentValue: 1 }, { unitId: 2, name: "Box", currentValue: 12 }];

const wrapper = ({ children }: { children: ReactNode }) => createElement(Provider, {
  store,
  children: createElement(QueryClientProvider, { client: new QueryClient({ defaultOptions: { queries: { retry: false } } }), children }),
});
const settle = () => act(async () => { await new Promise((r) => setTimeout(r, 40)); });
const labels = (list: { label: string }[]) => list.map((b) => b.label);
const callsTo = (url: string) => http.get.mock.calls.filter(([u]) => u === url).length;
const withoutClock = (p: Record<string, unknown>) => Object.fromEntries(Object.entries(p).filter(([k]) => !["createdAt", "transDate"].includes(k)));

/* eslint-disable @typescript-eslint/no-explicit-any -- each hook returns its own shape */
const FORMS = [
  {
    name: "Stock Adjustment", useDocument: () => useStockAdjustment() as any, base: "/stock-adjustment", field: "branch",
    options: (r: any) => r.masterData.branches, submit: (r: any) => r.onSubmit, firstBranch: "2",
  },
  {
    name: "Physical Entry", useDocument: () => usePhysicalEntry() as any, base: "/physical-entry", field: "branch",
    options: (r: any) => r.branches, submit: (r: any) => r.handleFormSubmit, firstBranch: "2",
  },
  {
    name: "Stock Transfer", useDocument: () => useInternalStockTransfer() as any, base: "/stock-transfer", field: "fromBranch",
    options: (r: any) => r.masterData.fromBranches, submit: (r: any) => r.onSubmit, firstBranch: "2",
  },
] as const;

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
  localStorage.clear();
  sessionStorage.setItem("tempSystemType", "backoffice");
  localStorage.setItem("decimalPart", "3");
  store.dispatch(clearMasterData());
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
  http.post.mockResolvedValue(ok({}));
  http.put.mockResolvedValue(ok({}));
  http.get.mockImplementation(async (url: string) => {
    if (url === "/Branch/list") return ok(REAL);
    if (url.endsWith("/list-name") || url.endsWith("/list-branch-name")) return ok(WITH_ALL);
    if (url.includes("employee")) return ok([{ empId: 4, empName: "Ali" }]);
    if (url.includes("ref-number")) return ok({ refNo: "R9" });
    if (url.includes("unit-list")) return ok(UNITS);
    return ok([]);
  });
});
afterEach(() => cleanup());

describe.each(FORMS)("$name form", (form) => {
  const open = async () => {
    const view = renderHook(form.useDocument, { wrapper });
    await waitFor(() => expect(form.options(view.result.current).length).toBeGreaterThan(0));
    await waitFor(() => expect(labels(form.options(view.result.current))).toContain("All"));
    await settle();
    return view.result;
  };

  it("lists each branch once, the branch master first", async () => {
    const result = await open();
    expect(labels(form.options(result.current))).toEqual(["Main", "Mall", "All"]);
  });

  it("a new document starts on its default branch", async () => {
    const result = await open();
    expect(result.current.methods.getValues(form.field)).toBe(form.firstBranch);
  });

  it("a new document starts on a real branch even when the master list has All first", async () => {
    const normal = http.get.getMockImplementation() as (url: string) => Promise<unknown>;
    http.get.mockImplementation(async (url: string) => (url === "/Branch/list" ? ok(WITH_ALL) : normal(url)));
    const result = await open();
    expect(labels(form.options(result.current))[0]).toBe("All");
    expect(result.current.methods.getValues(form.field)).toBe("2");
  });

  it("a user locked to a branch starts on it", async () => {
    sessionStorage.setItem("backoffice_activeBranchId", "3");
    const result = await open();
    expect(result.current.methods.getValues(form.field)).toBe("3");
  });

  it("still lists branches when one source fails", async () => {
    const normal = http.get.getMockImplementation() as (url: string) => Promise<unknown>;
    http.get.mockImplementation(async (url: string) => {
      if (url === "/Branch/list") throw new Error("down");
      return normal(url);
    });
    const result = await open();
    expect(labels(form.options(result.current)).sort()).toEqual(["All", "Mall", "Main"].sort());
  });

  it("a branch already in the store is listed", async () => {
    store.dispatch(addMasterBranch({ id: 9, name: "New Shop" }));
    const result = await open();
    await waitFor(() => expect(labels(form.options(result.current))).toContain("New Shop"));
  });

  it("a branch update elsewhere reloads the list", async () => {
    const result = await open();
    http.get.mockImplementation(async (url: string) => {
      if (url === "/Branch/list") return ok([...REAL, { branchId: 7, branchName: "Added" }]);
      if (url.endsWith("/list-name") || url.endsWith("/list-branch-name")) return ok(WITH_ALL);
      if (url.includes("unit-list")) return ok(UNITS);
      return ok([]);
    });
    act(() => notifyBranchesUpdated());
    await waitFor(() => expect(labels(form.options(result.current))).toContain("Added"));
  });

  it("saving a new document sends this payload", async () => {
    const result = await open();
    const { setValue, getValues } = result.current.methods;
    act(() => {
      setValue(form.field, "2");
      setValue("salesman", "4");
      setValue("narration", "note");
      setValue("toBranch", "3");
      setValue("items", [LINE]);
    });
    await settle();
    await act(async () => { await form.submit(result.current)(getValues()); });
    await waitFor(() => expect(http.post).toHaveBeenCalled());
    const [url, body] = http.post.mock.calls[0];
    expect(url).toBe(form.base);
    expect(body.transDate).toMatch(/^\d{4}-\d{2}-\d{2}/);
    expect(body.createdAt).toEqual(expect.any(String));
    expect(withoutClock(body)).toMatchSnapshot();
  });
});

describe.each([
  ["Stock Adjustment", () => useStockAdjustment() as any, (r: any) => r.masterData.branches],
  ["Physical Entry", () => usePhysicalEntry() as any, (r: any) => r.branches],
] as const)("%s Reset", (_name, useDocument, options) => {
  it("goes back to a real branch", async () => {
    const normal = http.get.getMockImplementation() as (url: string) => Promise<unknown>;
    http.get.mockImplementation(async (url: string) => (url === "/Branch/list" ? ok(WITH_ALL) : normal(url)));
    const { result } = renderHook(useDocument, { wrapper });
    await waitFor(() => expect(labels(options(result.current))).toContain("Main"));
    await settle();
    act(() => result.current.methods.setValue("branch", "3"));
    act(() => result.current.handleReset());
    await settle();
    expect(result.current.methods.getValues("branch")).toBe("2");
  });
});

describe("Physical Entry and the branch store", () => {
  it("a store that starts with All does not make a new entry start on All", async () => {
    store.dispatch(addMasterBranch({ id: 1, name: "All" }));
    const { result } = renderHook(() => usePhysicalEntry(), { wrapper });
    await waitFor(() => expect(labels(result.current.branches)).toContain("Main"));
    await settle();
    expect(result.current.methods.getValues("branch")).toBe("2");
  });
});

describe("Stock Transfer saved list", () => {
  it("lists each branch once, the branch master first", async () => {
    const { result } = renderHook(() => useInternalStockTransferList(), { wrapper });
    await waitFor(() => expect(labels(result.current.branches)).toContain("All"));
    await settle();
    expect(labels(result.current.branches)).toEqual(["Main", "Mall", "All"]);
  });
});

describe("Stock Transfer to-branches", () => {
  it("reloads the branch-specific data when branches change", async () => {
    const view = renderHook(() => useInternalStockTransfer(), { wrapper });
    await waitFor(() => expect(view.result.current.methods.getValues("fromBranch")).toBe("2"));
    await settle();
    const before = callsTo("/stock-transfer/2/transfer-to-branches");
    expect(before).toBeGreaterThan(0);
    act(() => notifyBranchesUpdated());
    await waitFor(() => expect(callsTo("/stock-transfer/2/transfer-to-branches")).toBeGreaterThan(before));
  });
});

describe.each(FORMS)("$name form requests", (form) => {
  it("asks each branch source once when the form opens", async () => {
    const view = renderHook(form.useDocument, { wrapper });
    await waitFor(() => expect(form.options(view.result.current).length).toBeGreaterThan(0));
    await settle();
    expect(callsTo(`${form.base}/list-branch-name`)).toBe(1);
    expect(callsTo("/Branch/false/list-name")).toBe(1);
  });
});
