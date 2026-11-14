// @vitest-environment jsdom
/**
 * Safety net for the shared DocumentForm work (2026-11-13): the six Back Office document pages rendered with a saved
 * document loaded (real hooks and pages, only the network mocked). The page HTML must not change unless intended.
 * What the pages save is covered by purchasePayloadGolden and stockDocumentPayloadGolden.
 */
import { createElement } from "react";
import { Provider } from "react-redux";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, cleanup, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { store } from "../app/store";
import PurchaseInvoiceFormPage from "../features/transaction/purchaseInvoice/pages/PurchaseInvoiceFormPage";
import PurchaseReturnFormPage from "../features/transaction/purchaseReturn/pages/PurchaseReturnFormPage";
import StockAdjustmentPage from "../features/transaction/stockAdjustment/pages/StockAdjustmentPage";
import PhysicalEntryPage from "../features/transaction/physicalEntry/pages/PhysicalEntryPage";
import InternalStockTransferPage from "../features/transaction/internalStockTransfer/pages/InternalStockTransferPage";
import ProductionPage from "../features/transaction/production/pages/ProductionPage";
import { purchaseInvoiceApi } from "../features/transaction/purchaseInvoice/services/purchaseInvoiceApi";
import { purchaseReturnApi } from "../features/transaction/purchaseReturn/services/purchaseReturnApi";
import { productService } from "../features/inventory/product/services/productService";

vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });

// ── Purchase documents (their API modules are mocked whole) ──────────────────────────────────────────────
const masters = {
  series: [{ seriesId: 3, seriesName: "Main", prefix: "", startNo: 1, branchId: 2 }],
  branches: [{ branchId: 2, branchName: "Main" }],
  paymodes: [{ paymodeId: 1, paymodeName: "Cash" }, { paymodeId: 2, paymodeName: "Card" }, { paymodeId: 3, paymodeName: "MultiPay" }],
  employees: [{ employeeId: 1, employeeName: "Ali" }],
  salesman: [{ employeeId: 1, employeeName: "Ali" }],
  vats: [{ vatId: 1, vatName: "10%", vatValue: 10 }],
};
const sharedApi = {
  getAllUnits: async () => [{ unitId: 1, unitName: "Nos", currentValue: 1, category: "Count" }, { unitId: 2, unitName: "Box", currentValue: 12, category: "Count" }],
  getUnitsByCategory: async () => [],
  searchProductsByName: async () => [],
  searchSuppliers: async () => [],
  getProductCostData: async () => null,
  getProductCostDataById: async () => null,
  getUnitCost: async () => null,
  loadMasterData: async () => masters,
};
vi.mock("../features/transaction/purchaseInvoice/services/purchaseInvoiceApi", () => ({
  purchaseInvoiceApi: { getPurchaseNumber: vi.fn(async () => "2"), getPurchaseInvoiceById: vi.fn(), savePurchaseInvoice: vi.fn(async () => ({})), updatePurchaseInvoice: vi.fn(async () => ({})) },
}));
vi.mock("../features/transaction/purchaseReturn/services/purchaseReturnApi", () => ({
  purchaseReturnApi: { getPurchaseReturnNumber: vi.fn(async () => "2"), getPurchaseReturnById: vi.fn(), getPurchaseInvoiceData: vi.fn(async () => null), getPurchaseInvoiceBalanceQty: vi.fn(async () => 100000), searchPurchaseInvoices: vi.fn(async () => []), savePurchaseReturn: vi.fn(async () => ({})), updatePurchaseReturn: vi.fn(async () => ({})) },
}));
vi.mock("../features/general/configuration/services/backofficeConfigApi", () => ({ backofficeConfigApi: { getConfigData: vi.fn(async () => null) } }));

// ── Stock documents (through their real API layers, only HTTP mocked) ────────────────────────────────────
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
vi.mock("../hooks/usePermissions", () => ({ usePermissions: () => ({ hasPermission: () => true }) }));

const mock = (fn: unknown) => fn as ReturnType<typeof vi.fn>;
/** Stands in for Product Master: shows the query it was opened with. */
const ProductAddStub = () => createElement("div", { "data-testid": "product-add-stub" }, useLocation().search);

const purchaseLines = [
  { productName: "Rice", barcode: "1", unitName: "Box", qty: 3, foc: 1, price: 7.125, discPer: 0, discAmount: 0, vatName: "10%", vatAmount: 0, netAmount: 0, productId: 5, unitId: 2, vatId: 1, vatValue: 10 },
  { productName: "Oil", barcode: "2", unitName: "Nos", qty: 0.5, foc: 0, price: 19.99, discPer: 12.5, discAmount: 0, vatName: "10%", vatAmount: 0, netAmount: 0, productId: 6, unitId: 1, vatId: 1, vatValue: 10 },
];
const purchaseHeader = { seriesId: 3, branchId: 2, employeeId: 1, supplierId: 2, supplierName: "Supplier", refNo: "R-1", narration: "note", paymodeId: 1, discAmount: 1.5, discPer: 0, roundOff: 0.25, netAmount: 40, isCancelled: false };

const stockLines = [
  { productId: 5, productCode: "P5", barcode: "P5", productName: "Rice", unitId: 2, unitName: "Box", unitCategory: "Count", qty: 3, baseQty: 36, price: 1.1, cost: 1.1, amount: 3.3, typeId: 1, typeName: "Damage", effect: "-" },
  { productId: 6, productCode: "P6", barcode: "P6", productName: "Oil", unitId: 1, unitName: "Nos", unitCategory: "Count", qty: 0.1, baseQty: 0.1, price: 0.2, cost: 0.2, amount: 0.02, typeId: 1, typeName: "Damage", effect: "+" },
];
const units = [{ unitId: 1, name: "Nos", unitName: "Nos", currentValue: 1 }, { unitId: 2, name: "Box", unitName: "Box", currentValue: 12 }];
const stockMaster = { transDate: "2026-11-05T00:00:00", refNo: "R5", branchId: 2, fromBranchId: 2, toBranchId: 3, employeeId: 4, narration: "note", netAmount: 3.32 };
const production = {
  masterData: { ...stockMaster, productionDate: "2026-11-05T00:00:00", productionNo: "7", productId: 9, unitId: 2, qty: 2, totalWage: 1.5, finishedProductName: "Cake" },
  detailsData: stockLines,
};

const renderAt = (path: string, route: string, page: React.ComponentType) =>
  render(
    createElement(Provider, { store, children:
      createElement(QueryClientProvider, { client: new QueryClient({ defaultOptions: { queries: { retry: false } } }), children:
        createElement(MemoryRouter, { initialEntries: [path], children:
          createElement(Routes, null, createElement(Route, { path: route, element: createElement(page) })) }) }) }),
  );

/** Page HTML (with each field's current value written out, since typed values are not in the HTML) without React's generated ids. */
const html = () => {
  const copy = document.body.cloneNode(true) as HTMLElement;
  const live = document.body.querySelectorAll("input, textarea, select");
  copy.querySelectorAll("input, textarea, select").forEach((el, i) => {
    const src = live[i] as HTMLInputElement;
    el.setAttribute("data-value", src.type === "checkbox" ? String(src.checked) : src.value);
  });
  return copy.innerHTML.replace(/«r[0-9a-z]+»|:r[0-9a-z]+:/g, "ID");
};
/** Lets the async loads and focus timers settle. */
const settle = async () => { await new Promise((r) => setTimeout(r, 400)); };

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-13T10:00:00"));
  vi.clearAllMocks();
  Object.assign(purchaseInvoiceApi, sharedApi);
  Object.assign(purchaseReturnApi, sharedApi);
  localStorage.clear();
  localStorage.setItem("decimalPart", "3");
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  http.post.mockResolvedValue({ data: { isSuccess: true, data: {} } });
  http.put.mockResolvedValue({ data: { isSuccess: true, data: {} } });
  http.get.mockImplementation(async (url: string) => {
    const ok = (data: unknown) => ({ data: { isSuccess: true, data } });
    if (url.startsWith("/production/data/")) return ok(production);
    if (url.includes("/data/")) return ok({ masterData: stockMaster, detailsData: stockLines });
    if (url.includes("product-cost-data")) return ok({ productId: 5, unitCategory: "Count", baseUnitId: 1, cost: 1 });
    if (url.includes("unit-list") || url.includes("units")) return ok(units);
    if (url.includes("ref-number")) return ok({ refNo: "R9" });
    return ok([]);
  });
});
afterEach(() => { cleanup(); vi.useRealTimers(); });

describe("document pages with a saved document", () => {
  it("Purchase Invoice", async () => {
    mock(purchaseInvoiceApi.getPurchaseInvoiceById).mockResolvedValue({
      masterData: { ...purchaseHeader, purchaseNo: "1", purchaseDate: "2026-11-07T00:00:00", invoiceNo: "INV1", invoiceDate: "2026-11-06T00:00:00" }, detailsData: purchaseLines, paymodesData: null,
    });
    renderAt("/purchase-invoice/edit/1", "/purchase-invoice/edit/:id", PurchaseInvoiceFormPage);
    await waitFor(() => expect((document.getElementById("pi-invoiceNo") as HTMLInputElement)?.value).toBe("INV1"));
    await settle();
    expect(html()).toMatchSnapshot();
    fireEvent.click(screen.getByRole("button", { name: /^Clear$/ }));
    expect(screen.getByText("Clear Form")).toBeTruthy();
    expect(html()).toMatchSnapshot("clear confirm");
  });

  it("Purchase Return", async () => {
    mock(purchaseReturnApi.getPurchaseReturnById).mockResolvedValue({
      masterData: { ...purchaseHeader, purchaseId: 0, purchaseReturnNo: "1", purchaseReturnDate: "2026-11-07T00:00:00" }, detailsData: purchaseLines, paymodesData: null,
    });
    renderAt("/purchase-return/edit/1", "/purchase-return/edit/:id", PurchaseReturnFormPage);
    await waitFor(() => expect((document.getElementById("pr-refNo") as HTMLInputElement)?.value).toBe("R-1"));
    await settle();
    expect(html()).toMatchSnapshot();
  });

  it("Stock Adjustment", async () => {
    renderAt("/stock-adjustment?id=1", "/stock-adjustment", StockAdjustmentPage);
    await waitFor(() => expect(document.body.innerHTML).toContain("Rice"));
    await settle();
    expect(html()).toMatchSnapshot();
  });

  it("Physical Entry", async () => {
    renderAt("/physical-entry?id=1", "/physical-entry", PhysicalEntryPage);
    await waitFor(() => expect(document.body.innerHTML).toContain("Rice"));
    await settle();
    expect(html()).toMatchSnapshot();
  });

  it("Stock Transfer", async () => {
    renderAt("/internal-stock-transfer/edit/1", "/internal-stock-transfer/edit/:id", InternalStockTransferPage);
    await waitFor(() => expect(document.body.innerHTML).toContain("Rice"));
    await settle();
    expect(html()).toMatchSnapshot();
  });

  it("Production", async () => {
    renderAt("/production/1", "/production/:id", ProductionPage);
    await waitFor(() => expect(document.body.innerHTML).toContain("Rice"));
    await settle();
    expect(html()).toMatchSnapshot();
  });
});

describe("choosing MultiPay as the paymode", () => {
  // The dropdown opens only once it has a size; the test browser measures everything as 0.
  beforeEach(() => {
    vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue({ x: 0, y: 0, top: 0, left: 0, bottom: 30, right: 200, width: 200, height: 30, toJSON: () => ({}) } as DOMRect);
  });
  afterEach(() => { vi.restoreAllMocks(); });
  const pickMultiPay = async (prefix: string) => {
    fireEvent.mouseDown(document.getElementById(`${prefix}-paymode`)!);
    const option = await screen.findByRole("option", { name: "MultiPay" });
    fireEvent.mouseDown(option);
  };

  it("opens the payment window on Purchase Invoice", async () => {
    mock(purchaseInvoiceApi.getPurchaseInvoiceById).mockResolvedValue({
      masterData: { ...purchaseHeader, purchaseNo: "1", purchaseDate: "2026-11-07T00:00:00", invoiceNo: "INV1", invoiceDate: "2026-11-06T00:00:00" }, detailsData: purchaseLines, paymodesData: null,
    });
    renderAt("/purchase-invoice/edit/1", "/purchase-invoice/edit/:id", PurchaseInvoiceFormPage);
    await waitFor(() => expect((document.getElementById("pi-invoiceNo") as HTMLInputElement)?.value).toBe("INV1"));
    await settle();
    await pickMultiPay("pi");
    expect(await screen.findByText("PAYMODE")).toBeTruthy();
  });

  // Was a bug until 2026-11-13: on Purchase Return the window never opened.
  it("opens the payment window on Purchase Return", async () => {
    mock(purchaseReturnApi.getPurchaseReturnById).mockResolvedValue({
      masterData: { ...purchaseHeader, purchaseId: 0, purchaseReturnNo: "1", purchaseReturnDate: "2026-11-07T00:00:00" }, detailsData: purchaseLines, paymodesData: null,
    });
    renderAt("/purchase-return/edit/1", "/purchase-return/edit/:id", PurchaseReturnFormPage);
    await waitFor(() => expect((document.getElementById("pr-refNo") as HTMLInputElement)?.value).toBe("R-1"));
    await settle();
    await pickMultiPay("pr");
    expect(await screen.findByText("PAYMODE")).toBeTruthy();
  });
});

// 2026-11-14: the Provider Settings "find product in list" box on the five document grids (shared GridFindBar).
describe("find product in list on the document grids", () => {
  const findIn = (boxId: string, rowPrefix: string, text: string) => {
    fireEvent.change(document.getElementById(boxId)!, { target: { value: text } });
    return [0, 1].map((i) => document.getElementById(`${rowPrefix}-${i}`)?.getAttribute("data-find") ?? null);
  };
  const checkFind = (boxId: string, rowPrefix: string, withCode: boolean) => {
    // saved lines are found by the product name shown in their product box
    expect(findIn(boxId, rowPrefix, "oil")).toEqual([null, "current"]);
    expect(screen.getByTestId(`${boxId}-count`).textContent).toBe("1 of 1");
    expect(findIn(boxId, rowPrefix, "RICE")).toEqual(["current", null]);
    if (withCode) expect(findIn(boxId, rowPrefix, "p6")).toEqual([null, "current"]);
    expect(findIn(boxId, rowPrefix, "sugar")).toEqual([null, null]);
    expect(screen.getByTestId(`${boxId}-count`).textContent).toBe("No match");
    // Esc clears
    fireEvent.keyDown(document.getElementById(boxId)!, { key: "Escape" });
    expect((document.getElementById(boxId) as HTMLInputElement).value).toBe("");
  };

  it("Purchase Invoice", async () => {
    mock(purchaseInvoiceApi.getPurchaseInvoiceById).mockResolvedValue({
      masterData: { ...purchaseHeader, purchaseNo: "1", purchaseDate: "2026-11-07T00:00:00", invoiceNo: "INV1", invoiceDate: "2026-11-06T00:00:00" }, detailsData: purchaseLines, paymodesData: null,
    });
    renderAt("/purchase-invoice/edit/1", "/purchase-invoice/edit/:id", PurchaseInvoiceFormPage);
    await waitFor(() => expect((document.getElementById("pi-invoiceNo") as HTMLInputElement)?.value).toBe("INV1"));
    await settle();
    checkFind("purchase-line-find", "purchase-line-row", false);
  });

  it("Purchase Return", async () => {
    // Purchase Return edit names its lines through the product lookup
    mock(productService.getById).mockImplementation(async (id: number) => ({ product: { productId: id, code: "", barcode: "", name: id === 5 ? "Rice" : "Oil" } }));
    mock(purchaseReturnApi.getPurchaseReturnById).mockResolvedValue({
      masterData: { ...purchaseHeader, purchaseId: 0, purchaseReturnNo: "1", purchaseReturnDate: "2026-11-07T00:00:00" }, detailsData: purchaseLines, paymodesData: null,
    });
    renderAt("/purchase-return/edit/1", "/purchase-return/edit/:id", PurchaseReturnFormPage);
    await waitFor(() => expect((document.getElementById("pr-refNo") as HTMLInputElement)?.value).toBe("R-1"));
    await settle();
    checkFind("purchase-line-find", "purchase-line-row", false);
    mock(productService.getById).mockImplementation(async () => null);
  });

  it("Stock Adjustment", async () => {
    renderAt("/stock-adjustment?id=1", "/stock-adjustment", StockAdjustmentPage);
    await waitFor(() => expect(document.body.innerHTML).toContain("Rice"));
    await settle();
    checkFind("sa-line-find", "sa-line-row", true);
  });

  it("Physical Entry", async () => {
    renderAt("/physical-entry?id=1", "/physical-entry", PhysicalEntryPage);
    await waitFor(() => expect(document.body.innerHTML).toContain("Rice"));
    await settle();
    checkFind("pe-line-find", "pe-line-row", true);
  });

  it("Stock Transfer", async () => {
    renderAt("/internal-stock-transfer/edit/1", "/internal-stock-transfer/edit/:id", InternalStockTransferPage);
    await waitFor(() => expect(document.body.innerHTML).toContain("Rice"));
    await settle();
    checkFind("ist-line-find", "ist-line-row", true);
  });
});

// 2026-11-14: Purchase prints show the time the document was saved (backend createdAt), AM/PM, and "Printed on".
describe("purchase print time (AM/PM)", () => {
  const openPurchasePrint = async () => {
    fireEvent.click(screen.getByRole("button", { name: /^Print$/ }));
    const dialog = await screen.findByRole("dialog");
    return (dialog.textContent || "").replace(/\s+/g, " ");
  };

  it("Purchase Invoice opened for edit: the date shows the saved time", async () => {
    mock(purchaseInvoiceApi.getPurchaseInvoiceById).mockResolvedValue({
      masterData: { ...purchaseHeader, purchaseNo: "1", purchaseDate: "2026-11-07T00:00:00", invoiceNo: "INV1", invoiceDate: "2026-11-06T00:00:00", createdAt: "2026-11-07T15:25:00" },
      detailsData: purchaseLines, paymodesData: null,
    });
    renderAt("/purchase-invoice/edit/1", "/purchase-invoice/edit/:id", PurchaseInvoiceFormPage);
    await waitFor(() => expect((document.getElementById("pi-invoiceNo") as HTMLInputElement)?.value).toBe("INV1"));
    await settle();
    const text = await openPurchasePrint();
    expect(text).toMatch(/Date\s*:\s*06\/11\/2026 03:25 PM/);
    expect(text).toMatch(/Printed on\s*:\s*\d{2}\/\d{2}\/\d{4} \d{2}:\d{2} (AM|PM)/);
  });

  it("print right after Save shows the time of the save", async () => {
    mock(purchaseInvoiceApi.getPurchaseInvoiceById).mockResolvedValue({
      masterData: { ...purchaseHeader, purchaseNo: "1", purchaseDate: "2026-11-07T00:00:00", invoiceNo: "INV1", invoiceDate: "2026-11-06T00:00:00" },
      detailsData: purchaseLines, paymodesData: null,
    });
    renderAt("/purchase-invoice/edit/1", "/purchase-invoice/edit/:id", PurchaseInvoiceFormPage);
    await waitFor(() => expect((document.getElementById("pi-invoiceNo") as HTMLInputElement)?.value).toBe("INV1"));
    await settle();
    fireEvent.click(document.getElementById("pi-save-btn")!);
    // the save question's own Save button (the page's Save button comes first)
    await waitFor(() => expect(screen.getAllByRole("button", { name: /^Save$/ }).length).toBeGreaterThan(1));
    const buttons = screen.getAllByRole("button", { name: /^Save$/ });
    fireEvent.click(buttons[buttons.length - 1]);
    const dialog = await screen.findByText("Print Preview", {}, { timeout: 3000 });
    const box = () => (dialog.closest("[role=dialog]")?.textContent || "").replace(/\s+/g, " ");
    await waitFor(() => expect(box()).toMatch(/Date\s*:/), { timeout: 3000 });
    const text = box();
    const now = new Date(); // fake timers fake only Date; the save happens at the faked "now"
    const h = now.getHours();
    const expected = `${String(h % 12 === 0 ? 12 : h % 12).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
    expect(text).toMatch(new RegExp(`Date\\s*:\\s*06/11/2026 ${expected}`));
  });

  it("Purchase Return opened for edit: the date shows the saved time", async () => {
    mock(purchaseReturnApi.getPurchaseReturnById).mockResolvedValue({
      masterData: { ...purchaseHeader, purchaseId: 0, purchaseReturnNo: "1", purchaseReturnDate: "2026-11-07T00:00:00", createdAt: "2026-11-07T09:05:00" },
      detailsData: purchaseLines, paymodesData: null,
    });
    renderAt("/purchase-return/edit/1", "/purchase-return/edit/:id", PurchaseReturnFormPage);
    await waitFor(() => expect((document.getElementById("pr-refNo") as HTMLInputElement)?.value).toBe("R-1"));
    await settle();
    const text = await openPurchasePrint();
    expect(text).toMatch(/PRT Dt\s*:\s*07\/11\/2026 09:05 AM/);
  });
});

// 2026-11-14: Enter on the Purchase Invoice / Return header and paymode, and Purchase Invoice's "New Product" window.
import { firstUsableId } from "../features/transaction/shared/documentForm/documentKeys";
import { handleFocusNextInput } from "../utils/keyboard";

describe("purchase Enter keys and New Product", () => {
  beforeEach(() => {
    vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue({ x: 0, y: 0, top: 0, left: 0, bottom: 30, right: 200, width: 200, height: 30, toJSON: () => ({}) } as DOMRect);
  });
  afterEach(() => { vi.restoreAllMocks(); });

  const openInvoice = async () => {
    mock(purchaseInvoiceApi.getPurchaseInvoiceById).mockResolvedValue({
      masterData: { ...purchaseHeader, purchaseNo: "1", purchaseDate: "2026-11-07T00:00:00", invoiceNo: "INV1", invoiceDate: "2026-11-06T00:00:00" }, detailsData: purchaseLines, paymodesData: null,
    });
    renderAt("/purchase-invoice/edit/1", "/purchase-invoice/edit/:id", PurchaseInvoiceFormPage);
    await waitFor(() => expect((document.getElementById("pi-invoiceNo") as HTMLInputElement)?.value).toBe("INV1"));
    await settle();
  };
  const openReturn = async () => {
    mock(purchaseReturnApi.getPurchaseReturnById).mockResolvedValue({
      masterData: { ...purchaseHeader, purchaseId: 0, purchaseReturnNo: "1", purchaseReturnDate: "2026-11-07T00:00:00" }, detailsData: purchaseLines, paymodesData: null,
    });
    renderAt("/purchase-return/edit/1", "/purchase-return/edit/:id", PurchaseReturnFormPage);
    await waitFor(() => expect((document.getElementById("pr-refNo") as HTMLInputElement)?.value).toBe("R-1"));
    await settle();
  };
  const enterOn = (id: string) => fireEvent.keyDown(document.getElementById(id)!, { key: "Enter" });

  it("Purchase Invoice: Series skips the read-only Purchase No; Salesman hands over to the lines; Paymode (Cash) → Save", async () => {
    await openInvoice();
    enterOn("pi-series");
    expect(document.activeElement?.id).toBe("pi-purchaseDate");
    enterOn("pi-salesman");
    expect(document.activeElement?.id).toBe("product-select-1"); // both lines filled: the last line
    enterOn("pi-paymode");
    expect(document.activeElement?.id).toBe("pi-save-btn");
  });

  it("Purchase Return: Salesman hands over to the lines; Paymode → Save", async () => {
    await openReturn();
    enterOn("pr-salesman");
    expect(document.activeElement?.id).toBe("product-select-1");
    enterOn("pr-paymode");
    expect(document.activeElement?.id).toBe("pr-save-btn");
  });

  it("a locked or disabled next field is passed over; the Find box is passed over by a list pick", () => {
    document.body.innerHTML = `<form>
      <div id="sel" role="combobox" tabindex="0"></div>
      <div id="branch" role="combobox" tabindex="-1"></div>
      <input id="inv" disabled />
      <input id="ref" />
      <input id="find" data-enter-skip="true" />
      <input id="line" />
    </form>`;
    expect(firstUsableId(["branch", "inv", "ref"])).toBe("ref");
    expect(firstUsableId(["missing", "branch"])).toBeUndefined();
    const ref = document.getElementById("ref")!;
    handleFocusNextInput(ref);
    expect(document.activeElement?.id).toBe("line");
  });

  // "New Product" → Product Master → back: the invoice is kept as typed and the new product goes on a line.
  const renderInvoiceRoutes = (path: string) =>
    render(
      createElement(Provider, { store, children:
        createElement(QueryClientProvider, { client: new QueryClient({ defaultOptions: { queries: { retry: false } } }), children:
          createElement(MemoryRouter, { initialEntries: [path], children:
            createElement(Routes, null,
              createElement(Route, { path: "/dashboard/purchase-invoice/edit/:id", element: createElement(PurchaseInvoiceFormPage) }),
              createElement(Route, { path: "/dashboard/products/add", element: createElement(ProductAddStub) })) }) }) }),
    );
  const loadSavedInvoice = async () => {
    mock(purchaseInvoiceApi.getPurchaseInvoiceById).mockResolvedValue({
      masterData: { ...purchaseHeader, purchaseNo: "1", purchaseDate: "2026-11-07T00:00:00", invoiceNo: "INV1", invoiceDate: "2026-11-06T00:00:00" }, detailsData: purchaseLines, paymodesData: null,
    });
    renderInvoiceRoutes("/dashboard/purchase-invoice/edit/1");
    await waitFor(() => expect((document.getElementById("pi-invoiceNo") as HTMLInputElement)?.value).toBe("INV1"));
    await settle();
  };

  it("New Product keeps the invoice as typed and opens Product Master, which will come back here", async () => {
    sessionStorage.clear();
    await loadSavedInvoice();
    fireEvent.change(document.getElementById("pi-refNo")!, { target: { value: "TYPED" } });
    fireEvent.click(document.getElementById("pi-new-product")!);
    expect(await screen.findByTestId("product-add-stub")).toBeTruthy();
    expect(screen.getByTestId("product-add-stub").textContent).toBe("?returnTo=%2Fdashboard%2Fpurchase-invoice%2Fedit%2F1");
    const draft = JSON.parse(sessionStorage.getItem("purchaseInvoiceDraft")!);
    expect(draft.path).toBe("/dashboard/purchase-invoice/edit/1");
    expect(draft.values.refNo).toBe("TYPED");
    expect(draft.values.items).toHaveLength(2);
    expect(draft.selectedPaymodeId).toBe(1);
  });

  it("back from Product Master with a new product: the typed invoice is put back and the product is on a new line", async () => {
    sessionStorage.clear();
    // what New Product stored, then what Save Product stored
    await loadSavedInvoice();
    fireEvent.change(document.getElementById("pi-refNo")!, { target: { value: "TYPED" } });
    fireEvent.click(document.getElementById("pi-new-product")!);
    await screen.findByTestId("product-add-stub");
    cleanup();
    sessionStorage.setItem("purchaseInvoiceCreatedProduct", JSON.stringify({ id: 77, name: "New Rice", code: "N1", barcode: "N1" }));

    await loadSavedInvoice();
    await waitFor(() => expect((document.getElementById("pi-refNo") as HTMLInputElement).value).toBe("TYPED"));
    await waitFor(() => expect(document.getElementById("purchase-line-row-2")).toBeTruthy());
    await waitFor(() => expect((document.getElementById("product-select-2") as HTMLInputElement).value).toContain("New Rice"));
    expect(sessionStorage.getItem("purchaseInvoiceDraft")).toBeNull();
    expect(sessionStorage.getItem("purchaseInvoiceCreatedProduct")).toBeNull();
  });

  it("back from Product Master without saving: the typed invoice is put back, no line is added", async () => {
    sessionStorage.clear();
    await loadSavedInvoice();
    fireEvent.change(document.getElementById("pi-refNo")!, { target: { value: "TYPED" } });
    fireEvent.click(document.getElementById("pi-new-product")!);
    await screen.findByTestId("product-add-stub");
    cleanup();

    await loadSavedInvoice();
    await waitFor(() => expect((document.getElementById("pi-refNo") as HTMLInputElement).value).toBe("TYPED"));
    await settle();
    expect(document.getElementById("purchase-line-row-2")).toBeNull();
  });

  it("Purchase Return has no New Product button", async () => {
    await openReturn();
    expect(document.getElementById("pi-new-product")).toBeNull();
  });
});
