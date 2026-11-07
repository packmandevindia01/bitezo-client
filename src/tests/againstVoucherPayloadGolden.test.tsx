// @vitest-environment jsdom
/**
 * Phase 5 safety net: what Payment and Receipt Against Vouchers send (URL and body), through the real hook and API
 * layer with only the network mocked. Only the clock fields are removed.
 */
import { createElement, type ReactNode } from "react";
import { Provider } from "react-redux";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor, act, cleanup } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { store } from "../app/store";
import { usePaymentAgainstVoucherForm } from "../features/transaction/paymentAgainstVoucher/hooks/usePaymentAgainstVoucherForm";
import { useReceiptAgainstVoucherForm } from "../features/transaction/receiptAgainstVoucher/hooks/useReceiptAgainstVoucherForm";
import { paymentAgainstVoucherApi } from "../features/transaction/paymentAgainstVoucher/services/paymentAgainstVoucherApi";
import { receiptAgainstVoucherApi } from "../features/transaction/receiptAgainstVoucher/services/receiptAgainstVoucherApi";

const http = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn() }));
const notify = vi.hoisted(() => vi.fn());
vi.mock("../api/axiosInstance", () => ({ default: http }));
vi.mock("../utils/transactionSync", () => ({ notifyTransactionsUpdated: notify, subscribeToTransactionUpdates: () => () => {} }));
vi.mock("../features/inventory/branches/services/branchApi", () => {
  const names = vi.fn(async () => [{ id: 2, branchName: "Main" }]);
  return { fetchBranchNames: names, fetchBranches: names, branchApi: { fetchBranchNames: names } };
});
vi.mock("../features/general/paymode/services/paymodeService", () => ({ paymodeService: { list: vi.fn(async () => []) } }));
vi.mock("../features/general/employee/services/employeeService", () => ({ getEmployeeNames: vi.fn(async () => []), getEmployees: vi.fn(async () => []) }));

const masters = {
  series: [{ seriesId: 7, seriesName: "Main", prefix: "", startNo: 1, branchId: 2 }],
  branches: [{ branchId: 2, branchName: "Main" }],
  salesman: [{ employeeId: 4, employeeName: "Ali" }],
  paymodes: [{ paymodeId: 1, paymodeName: "Cash" }, { paymodeId: 2, paymodeName: "Card" }, { paymodeId: 3, paymodeName: "MultiPay" }],
};
const saved = (over: object = {}, paymodesData: unknown = null) => ({
  masterData: { seriesId: 7, voucherNo: "V5", voucherDate: "2026-11-05T00:00:00", branchId: 2, employeeId: 4, accountId: 9, accountName: "Acme", refNo: "R-1", narration: "note", paymodeId: 1, discount: 0, isCancelled: false, ...over },
  detailsData: [
    { invoiceId: 11, voucherType: "Sales", invoiceNo: "A1", invoiceDate: "2026-11-01T00:00:00", invoiceAmount: 100, receivedAmount: 0.1 },
    { invoiceId: 12, voucherType: "Sales", invoiceNo: "A2", invoiceDate: "2026-11-02T00:00:00", invoiceAmount: 50, receivedAmount: 0.2 },
  ],
  paymodesData,
});

const wrapper = ({ children }: { children: ReactNode }) => createElement(Provider, {
  store,
  children: createElement(QueryClientProvider, { client: new QueryClient({ defaultOptions: { queries: { retry: false } } }), children }),
});
const withoutClock = (p: Record<string, unknown>) => Object.fromEntries(Object.entries(p).filter(([k]) => !["createdAt", "updatedAt"].includes(k)));

describe.each([
  ["Payment", "payment-against", "SupplierId", usePaymentAgainstVoucherForm, paymentAgainstVoucherApi],
  ["Receipt", "receipt-against", "CustomerId", useReceiptAgainstVoucherForm, receiptAgainstVoucherApi],
] as const)("%s Against Voucher", (_label, path, partyParam, useForm, api) => {
  const kind = path.replace("-against", "");
  let dataResponse: unknown;
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem("decimalPart", "3");
    vi.spyOn(console, "log").mockImplementation(() => {});
    dataResponse = saved();
    http.post.mockResolvedValue({ data: { isSuccess: true, data: { id: 1 } } });
    http.put.mockResolvedValue({ data: { isSuccess: true, data: {} } });
    http.get.mockImplementation(async (url: string) => {
      const ok = (data: unknown) => ({ data: { isSuccess: true, data } });
      if (url.endsWith("/load-master")) return ok(masters);
      if (url.endsWith("/account-list-name")) return ok([{ accountId: 9, code: "1", accountName: "Acme" }]);
      if (url.includes("/voucher-number/")) return ok("NEXT-9");
      if (url.includes("/pending-invoices")) return ok([]);
      if (url.includes("/data/")) return ok(dataResponse);
      throw new Error(`unexpected GET ${url}`);
    });
  });
  afterEach(() => cleanup());

  const open = async () => {
    const { result } = renderHook(() => useForm(1), { wrapper });
    await waitFor(() => expect(result.current.form.getValues("details")?.length).toBe(2));
    await waitFor(() => expect(result.current.paymodeList.length).toBeGreaterThan(0));
    return result;
  };
  const save = async (hook: { current: { form: { getValues: () => unknown }; saveMutation: { mutateAsync: (d: never) => Promise<unknown> } } }) => {
    await act(async () => { await hook.current.saveMutation.mutateAsync(hook.current.form.getValues() as never); });
  };

  it("edit: URL and body", async () => {
    const hook = await open();
    await save(hook as never);
    const [url, body] = http.put.mock.calls[0];
    expect(url).toBe(`/${path}/1`);
    expect(withoutClock(body)).toMatchSnapshot();
  });

  it("new: URL and body", async () => {
    const { result } = renderHook(() => useForm(), { wrapper });
    await waitFor(() => expect(result.current.paymodeList.length).toBeGreaterThan(0));
    act(() => {
      result.current.form.reset({
        ...result.current.form.getValues(), seriesId: 7, prefix: "", vchNo: "NEXT-9", branchId: 2, accountId: 9, paymodeId: 2, employeeId: 4, voucherDate: "2026-11-05", refNo: "R-1", narration: "note",
        details: [{ invoiceId: 11, voucherType: "Sales", amount: "0.100" }, { invoiceId: 12, voucherType: "Sales", amount: "0.200" }],
      } as never);
    });
    await save(result as never);
    const [url, body] = http.post.mock.calls[0];
    expect(url).toBe(`/${path}`);
    expect(withoutClock(body)).toMatchSnapshot();
  });

  it("opening a split payment keeps its lines, and they are saved again", async () => {
    dataResponse = saved({ paymodeId: 3 }, [{ paymodeId: 1, amount: 0.1 }, { paymodeId: 2, amount: 0.2 }]);
    const hook = await open();
    expect(hook.current.form.getValues("paymodes")).toEqual([{ paymodeId: 1, amount: 0.1 }, { paymodeId: 2, amount: 0.2 }]);
    await save(hook as never);
    expect(http.put.mock.calls[0][1].paymodes).toEqual([{ paymodeId: 1, amount: 0.1 }, { paymodeId: 2, amount: 0.2 }]);
  });

  it("the form holds the voucher's own id", async () => {
    const hook = await open();
    expect(hook.current.form.getValues("transId")).toBe(1);
  });

  it("saving and cancelling tell open reports to refresh", async () => {
    await api.create({} as never);
    await api.update(1, {} as never);
    await api.cancel(1);
    expect(notify.mock.calls).toEqual([[kind], [kind], [kind]]);
  });

  it("asks for pending invoices under its own party field", async () => {
    await api.getPendingInvoices(2, 9, 0);
    const call = http.get.mock.calls.find(([u]) => u === `/${path}/pending-invoices`)!;
    expect(call[1].params[partyParam]).toBe(9);
  });

  it("the list and cancel use its own URLs", async () => {
    http.get.mockResolvedValueOnce({ data: { isSuccess: true, data: [] } });
    const list = (path === "payment-against" ? paymentAgainstVoucherApi.getPaymentAgainstVoucherList : receiptAgainstVoucherApi.getReceiptAgainstVoucherList) as (b: number, f: string, t: string) => Promise<unknown>;
    await list(2, "2026-01-01", "2026-11-07");
    const call = http.get.mock.calls.at(-1)!;
    expect(call[0]).toBe(`/${path}/details`);
    expect(call[1].params).toMatchObject({ BranchId: 2, FromDate: "2026-01-01", ToDate: "2026-11-07" });
  });
});
