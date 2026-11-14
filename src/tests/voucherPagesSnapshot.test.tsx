// @vitest-environment jsdom
/**
 * Safety net for sharing the voucher form pages (2026-11-13): Payment / Receipt Voucher and Payment / Receipt Against
 * Voucher pages rendered with a saved voucher (real hooks, pages and API layers; only HTTP mocked). Records the HTML
 * and every field value. What the pages send is covered by voucherPayloadGolden and againstVoucherPayloadGolden.
 */
import { createElement } from "react";
import { Provider } from "react-redux";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, cleanup, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { store } from "../app/store";
import PaymentVoucherFormPage from "../features/transaction/paymentVoucher/pages/PaymentVoucherFormPage";
import ReceiptVoucherFormPage from "../features/transaction/receiptVoucher/pages/ReceiptVoucherFormPage";
import PaymentAgainstVoucherPage from "../features/transaction/paymentAgainstVoucher/pages/PaymentAgainstVoucherPage";
import ReceiptAgainstVoucherPage from "../features/transaction/receiptAgainstVoucher/pages/ReceiptAgainstVoucherPage";

vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });

const http = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn() }));
vi.mock("../api/axiosInstance", () => ({ default: http }));
vi.mock("../utils/transactionSync", () => ({ notifyTransactionsUpdated: vi.fn(), subscribeToTransactionUpdates: () => () => {} }));
vi.mock("../features/inventory/branches/services/branchApi", () => {
  const names = vi.fn(async () => [{ id: 1, branchName: "All" }, { id: 2, branchName: "Main" }, { id: 3, branchName: "Mall" }]);
  return { fetchBranchNames: names, fetchBranches: names, branchApi: { fetchBranchNames: names } };
});
vi.mock("../features/general/paymode/services/paymodeService", () => ({ paymodeService: { list: vi.fn(async () => []) } }));
vi.mock("../features/general/employee/services/employeeService", () => ({ getEmployeeNames: vi.fn(async () => []), getEmployees: vi.fn(async () => []) }));
vi.mock("../app/providers/useToast", () => ({ useToast: () => ({ showToast: vi.fn() }) }));
vi.mock("../hooks/usePermissions", () => ({ usePermissions: () => ({ hasPermission: () => true }) }));

const masters = {
  series: [{ seriesId: 7, seriesName: "Main", prefix: "", startNo: 1, branchId: 2 }],
  branches: [{ branchId: 2, branchName: "Main" }, { branchId: 3, branchName: "Mall" }],
  salesman: [{ employeeId: 4, employeeName: "Ali" }],
  paymodes: [{ paymodeId: 1, paymodeName: "Cash" }, { paymodeId: 2, paymodeName: "Card" }, { paymodeId: 3, paymodeName: "MultiPay" }],
};
const voucher = {
  masterData: { seriesId: 7, voucherNo: "V5", voucherDate: "2026-11-05T00:00:00", branchId: 2, employeeId: 4, accountId: 9, accountName: "Acme", refNo: "R-1", narration: "note", paymodeId: 1, amount: 12.5, discount: 0, isCancelled: false },
  detailsData: [
    { invoiceId: 11, voucherType: "Sales", invoiceNo: "A1", invoiceDate: "2026-11-01T00:00:00", invoiceAmount: 100, receivedAmount: 0.1, paidAmount: 0.1, balance: 99.9 },
    { invoiceId: 12, voucherType: "Sales", invoiceNo: "A2", invoiceDate: "2026-11-02T00:00:00", invoiceAmount: 50, receivedAmount: 0.2, paidAmount: 0.2, balance: 49.8 },
  ],
  paymodesData: null,
};

const renderAt = (path: string, route: string, page: React.ComponentType) =>
  render(
    createElement(Provider, { store, children:
      createElement(QueryClientProvider, { client: new QueryClient({ defaultOptions: { queries: { retry: false } } }), children:
        createElement(MemoryRouter, { initialEntries: [path], children:
          createElement(Routes, null, createElement(Route, { path: route, element: createElement(page) })) }) }) }),
  );

/** Page HTML with each field's current value written out, without React's generated ids. */
const html = () => {
  const copy = document.body.cloneNode(true) as HTMLElement;
  const live = document.body.querySelectorAll("input, textarea, select");
  copy.querySelectorAll("input, textarea, select").forEach((el, i) => {
    const src = live[i] as HTMLInputElement;
    el.setAttribute("data-value", src.type === "checkbox" ? String(src.checked) : src.value);
  });
  return copy.innerHTML.replace(/«r[0-9a-z]+»|:r[0-9a-z]+:/g, "ID");
};
const settle = async () => { await new Promise((r) => setTimeout(r, 400)); };

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-13T10:00:00"));
  vi.clearAllMocks();
  localStorage.clear();
  localStorage.setItem("decimalPart", "3");
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  http.post.mockResolvedValue({ data: { isSuccess: true, data: { id: 1 } } });
  http.put.mockResolvedValue({ data: { isSuccess: true, data: {} } });
  http.get.mockImplementation(async (url: string) => {
    const ok = (data: unknown) => ({ data: { isSuccess: true, data } });
    if (url.endsWith("/load-master")) return ok(masters);
    if (url.endsWith("/account-list") || url.endsWith("/account-list-name")) return ok([{ accountId: 9, code: "1", accountName: "Acme" }]);
    if (url.includes("/voucher-number/")) return ok("NEXT-9");
    if (url.includes("/pending-invoices")) return ok([]);
    if (url.endsWith("/details")) return ok([]);
    if (url.includes("/data/")) return ok(voucher);
    return ok([]);
  });
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });

const fieldValue = (id: string) => (document.getElementById(id) as HTMLInputElement | null)?.value;

describe("voucher pages with a saved voucher", () => {
  it("Payment Voucher", async () => {
    renderAt("/payment-voucher/edit/1", "/payment-voucher/edit/:id", PaymentVoucherFormPage);
    await waitFor(() => expect(fieldValue("pv-refno")).toBe("R-1"));
    await settle();
    expect(html()).toMatchSnapshot();
  });

  it("Receipt Voucher", async () => {
    renderAt("/receipt-voucher/edit/1", "/receipt-voucher/edit/:id", ReceiptVoucherFormPage);
    await waitFor(() => expect(fieldValue("rv-refno")).toBe("R-1"));
    await settle();
    expect(html()).toMatchSnapshot();
  });

  it("Payment Against Voucher", async () => {
    renderAt("/payment-against-voucher/1", "/payment-against-voucher/:id", PaymentAgainstVoucherPage);
    await waitFor(() => expect(document.body.innerHTML).toContain("A2"));
    await settle();
    expect(html()).toMatchSnapshot();
  });

  it("Receipt Against Voucher", async () => {
    renderAt("/receipt-against-voucher/1", "/receipt-against-voucher/:id", ReceiptAgainstVoucherPage);
    await waitFor(() => expect(document.body.innerHTML).toContain("A2"));
    await settle();
    expect(html()).toMatchSnapshot();
  });
});

describe("plain voucher pages after Save is pressed with missing fields", () => {
  it.each([
    ["Payment", "/payment-voucher/new", "/payment-voucher/new", PaymentVoucherFormPage, "pv"],
    ["Receipt", "/receipt-voucher/new", "/receipt-voucher/new", ReceiptVoucherFormPage, "rv"],
  ] as const)("%s Voucher shows the field errors", async (_l, path, route, page, p) => {
    renderAt(path, route, page);
    await settle();
    expect(document.body.innerHTML).not.toContain("(required)");
    fireEvent.click(document.getElementById(`${p}-save`)!);
    await waitFor(() => expect(document.body.innerHTML).toContain("(required)"));
    expect(screen.getAllByText(/\(required\)/).length).toBeGreaterThan(0);
  });
});

describe("plain voucher pages: choices made when they were merged", () => {
  beforeEach(() => {
    vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue({ x: 0, y: 0, top: 0, left: 0, bottom: 30, right: 200, width: 200, height: 30, toJSON: () => ({}) } as DOMRect);
  });

  const pick = async (fieldId: string, option: string) => {
    const field = document.getElementById(fieldId)!;
    // A list with autofocus (Branch) is already open; a click would close it.
    if (field.getAttribute("aria-expanded") !== "true") fireEvent.mouseDown(field);
    fireEvent.mouseDown(await screen.findByRole("option", { name: option }));
  };
  const shown = (fieldId: string) => document.getElementById(fieldId)!.textContent;

  it.each([
    ["Payment", "/payment-voucher/edit/1", "/payment-voucher/edit/:id", PaymentVoucherFormPage, "pv"],
    ["Receipt", "/receipt-voucher/edit/1", "/receipt-voucher/edit/:id", ReceiptVoucherFormPage, "rv"],
  ] as const)("%s Voucher: closing MultiPay without paying brings back the paymode chosen before", async (_l, path, route, page, p) => {
    renderAt(path, route, page);
    await waitFor(() => expect(fieldValue(`${p}-refno`)).toBe("R-1"));
    await settle();
    expect(shown(`${p}-paymode`)).toContain("Cash");
    await pick(`${p}-paymode`, "MultiPay");
    const cancel = await screen.findByRole("button", { name: "Cancel" });
    fireEvent.click(cancel);
    await waitFor(() => expect(screen.queryByRole("button", { name: "Cancel" })).toBeNull());
    expect(shown(`${p}-paymode`)).toContain("Cash");
  });

  it.each([
    ["Payment", "/payment-voucher/edit/1", "/payment-voucher/edit/:id", PaymentVoucherFormPage, "pv"],
    ["Receipt", "/receipt-voucher/edit/1", "/receipt-voucher/edit/:id", ReceiptVoucherFormPage, "rv"],
  ] as const)("%s Voucher: changing the branch clears the account and paymode", async (_l, path, route, page, p) => {
    renderAt(path, route, page);
    await waitFor(() => expect(fieldValue(`${p}-refno`)).toBe("R-1"));
    await settle();
    expect(shown(`${p}-account`)).toContain("Acme");
    await pick(`${p}-branch`, "Mall");
    await waitFor(() => expect(shown(`${p}-account`)).not.toContain("Acme"));
    expect(shown(`${p}-paymode`)).not.toContain("Cash");
  });
});

// 2026-11-14: voucher prints show the time the voucher was saved (backend createdAt), AM/PM, and "Printed on".
describe("voucher print time (AM/PM)", () => {
  const withCreatedAt = () => {
    const base = http.get.getMockImplementation()!;
    http.get.mockImplementation(async (url: string) =>
      url.includes("/data/") ? { data: { isSuccess: true, data: { ...voucher, masterData: { ...voucher.masterData, createdAt: "2026-11-05T16:45:00" } } } } : base(url));
  };
  const openPrint = async () => {
    fireEvent.click(screen.getByRole("button", { name: /Print/ }));
    const title = await screen.findByText("Print Preview", {}, { timeout: 3000 });
    const box = () => (title.closest("[role=dialog]")?.textContent || document.body.textContent || "").replace(/\s+/g, " ");
    await waitFor(() => expect(box()).toMatch(/Date\s*:/), { timeout: 3000 });
    return box();
  };

  it("Receipt Voucher", async () => {
    withCreatedAt();
    renderAt("/receipt-voucher/edit/1", "/receipt-voucher/edit/:id", ReceiptVoucherFormPage);
    await waitFor(() => expect(fieldValue("rv-refno")).toBe("R-1"));
    await settle();
    const text = await openPrint();
    expect(text).toMatch(/Date\s*:\s*05\/11\/2026 04:45 PM/);
    expect(text).toMatch(/Printed on\s*:\s*13\/11\/2026 10:00 AM/);
  });

  it("Receipt Against Voucher", async () => {
    withCreatedAt();
    renderAt("/receipt-against-voucher/1", "/receipt-against-voucher/:id", ReceiptAgainstVoucherPage);
    await waitFor(() => expect(document.body.innerHTML).toContain("A2"));
    await settle();
    const text = await openPrint();
    expect(text).toMatch(/Date\s*:\s*05\/11\/2026 04:45 PM/);
  });
});
