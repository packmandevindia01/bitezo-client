// @vitest-environment jsdom
/** The print preview of Stock Adjustment and Stock Transfer, opened from the rendered page with only the network mocked. */
import { createElement, type ReactNode } from "react";
import { Provider } from "react-redux";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { store } from "../app/store";
import StockAdjustmentPage from "../features/transaction/stockAdjustment/pages/StockAdjustmentPage";
import InternalStockTransferPage from "../features/transaction/internalStockTransfer/pages/InternalStockTransferPage";

const http = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn() }));
vi.mock("../api/axiosInstance", () => ({ default: http }));
vi.mock("../features/inventory/product/services/productService", () => ({
  productService: { loadMasterData: vi.fn(async () => null), getById: vi.fn(async () => null), getClosingStock: vi.fn(async () => ({ stock: 7 })), getAverageCost: vi.fn(async () => 0) },
}));
vi.mock("../app/providers/useToast", () => ({ useToast: () => ({ showToast: vi.fn() }) }));
vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });
Element.prototype.scrollIntoView = () => {};

const ok = (data: unknown) => ({ data: { isSuccess: true, data } });
const BRANCHES = [{ branchId: 2, branchName: "Main" }, { branchId: 3, branchName: "Mall" }];
const LINE = { productId: 5, productCode: "P5", barcode: "P5", productName: "Rice", unitId: 1, unitName: "Nos", unitCategory: "Count", qty: 3, baseQty: 3, price: 1.1, cost: 1.1, amount: 3.3, typeId: 1, typeName: "Damage", effect: "-" };
const MASTER = { transDate: "2026-11-05T00:00:00", refNo: "R5", branchId: 2, fromBranchId: 2, toBranchId: 3, employeeId: 4, narration: "note", netAmount: 3.3 };

const show = (page: ReactNode, path: string, route: string) => render(createElement(Provider, {
  store,
  children: createElement(QueryClientProvider, {
    client: new QueryClient({ defaultOptions: { queries: { retry: false } } }),
    children: createElement(MemoryRouter, { initialEntries: [path] }, createElement(Routes, null, createElement(Route, { path: route, element: page }))),
  }),
}));

const inputHas = (text: string) => Array.from(document.querySelectorAll("input")).some((input) => input.value.includes(text));

const openPrint = async () => {
  await waitFor(() => expect(inputHas("R5")).toBe(true), { timeout: 3000 });
  await waitFor(() => expect(document.body.textContent).toMatch(/P5/), { timeout: 3000 });
  await new Promise((r) => setTimeout(r, 60));
  fireEvent.click(screen.getAllByRole("button", { name: /Print/ })[0]);
  await waitFor(() => expect(document.querySelector(".print-wrapper")).toBeTruthy());
  return (document.querySelector(".print-wrapper") as HTMLElement).textContent?.replace(/\s+/g, " ") ?? "";
};

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
  localStorage.clear();
  sessionStorage.setItem("tempSystemType", "backoffice");
  localStorage.setItem("decimalPart", "3");
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
  http.get.mockImplementation(async (url: string) => {
    if (url.includes("/data/")) return ok({ masterData: MASTER, detailsData: [LINE] });
    if (url.endsWith("/product-list-name")) return ok([{ productId: 5, productName: "Rice", code: "P5", barcode: "P5" }]);
    if (url.includes("product-cost-data")) return ok({ productId: 5, productCode: "P5", productName: "Rice", baseUnitId: 1, cost: 1.1, unitCategory: "Count" });
    if (url.includes("Branch") || url.includes("branch")) return ok(BRANCHES);
    if (url.includes("employee")) return ok([{ empId: 4, empName: "Ali" }]);
    if (url.includes("ref-number")) return ok({ refNo: "R9" });
    return ok([]);
  });
});
afterEach(() => cleanup());

describe("Stock Adjustment print", () => {
  it("shows the document number, branch, date and product name", async () => {
    show(createElement(StockAdjustmentPage), "/x?id=1", "/x");
    const text = await openPrint();
    expect(text).toMatch(/ST No\s*:\s*R5/);
    expect(text).toMatch(/Depot Name\s*:\s*Main/);
    expect(text).toMatch(/Date\s*:\s*05\/11\/2026/);
    expect(text).toContain("1RiceP5(-)3");
  });
});

describe("Stock Transfer print", () => {
  it("shows the bill number, date and both locations", async () => {
    show(createElement(InternalStockTransferPage), "/x/1", "/x/:id");
    const text = await openPrint();
    expect(text).toMatch(/Bill No\s*:\s*R5/);
    expect(text).toMatch(/Date\s*:\s*05\/11\/2026/);
    expect(text).toMatch(/Location From\s*:\s*Main/);
    expect(text).toMatch(/Location To\s*:\s*Mall/);
    expect(text).not.toContain("Ref No");
    expect(text).toContain("Rice");
  });
});

// 2026-11-14: the Date line shows the time the document was saved (backend createdAt), AM/PM, and a "Printed on" line.
describe("print time (AM/PM)", () => {
  const withCreatedAt = () => {
    const base = http.get.getMockImplementation()!;
    http.get.mockImplementation(async (url: string) =>
      url.includes("/data/") ? ok({ masterData: { ...MASTER, createdAt: "2026-11-05T15:25:00" }, detailsData: [LINE] }) : base(url));
  };
  const printedOn = /Printed on\s*:\s*\d{2}\/\d{2}\/\d{4} \d{2}:\d{2} (AM|PM)/;

  it("Stock Adjustment: saved time after the date, and Printed on", async () => {
    withCreatedAt();
    show(createElement(StockAdjustmentPage), "/x?id=1", "/x");
    const text = await openPrint();
    expect(text).toMatch(/Date\s*:\s*05\/11\/2026 03:25 PM/);
    expect(text).toMatch(printedOn);
  });

  it("Stock Transfer: saved time after the date, and Printed on", async () => {
    withCreatedAt();
    show(createElement(InternalStockTransferPage), "/x/1", "/x/:id");
    const text = await openPrint();
    expect(text).toMatch(/Date\s*:\s*05\/11\/2026 03:25 PM/);
    expect(text).toMatch(printedOn);
  });

  it("no saved time from the backend: the date alone (no made-up time)", async () => {
    show(createElement(StockAdjustmentPage), "/x?id=1", "/x");
    const text = await openPrint();
    expect(text).toMatch(/Date\s*:\s*05\/11\/2026(?! \d)/);
    expect(text).toMatch(printedOn);
  });
});
