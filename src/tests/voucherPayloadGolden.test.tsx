// @vitest-environment jsdom
/**
 * Phase 5 safety net: what Payment and Receipt Vouchers send to the server (URL and body), through the real hook and
 * API layer with only the network mocked. Only the clock fields are removed. These snapshots must not change when
 * the two forms share code.
 */
import { createElement, type ReactNode } from "react";
import { Provider } from "react-redux";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, renderHook, screen, waitFor, act, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { store } from "../app/store";
import { usePaymentVoucher } from "../features/transaction/paymentVoucher/hooks/usePaymentVoucher";
import { useReceiptVoucher } from "../features/transaction/receiptVoucher/hooks/useReceiptVoucher";
import PaymentVoucherListPage from "../features/transaction/paymentVoucher/pages/PaymentVoucherListPage";
import ReceiptVoucherListPage from "../features/transaction/receiptVoucher/pages/ReceiptVoucherListPage";

const http = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn() }));
const toast = vi.hoisted(() => vi.fn());
vi.mock("../api/axiosInstance", () => ({ default: http }));
vi.mock("../features/inventory/branches/services/branchApi", () => ({
  branchApi: { fetchBranchNames: vi.fn(async () => [{ id: 1, branchName: "All" }, { id: 2, branchName: "Main" }]) },
}));
vi.mock("../features/general/paymode/services/paymodeService", () => ({ paymodeService: { list: vi.fn(async () => []) } }));
vi.mock("../features/general/employee/services/employeeService", () => ({ getEmployeeNames: vi.fn(async () => []), getEmployees: vi.fn(async () => []) }));
vi.mock("../app/providers/useToast", () => ({ useToast: () => ({ showToast: toast }) }));

const masters = {
  series: [{ seriesId: 7, seriesName: "Main", prefix: "", startNo: 1, branchId: 2 }],
  branches: [{ branchId: 2, branchName: "Main" }],
  salesman: [{ employeeId: 4, employeeName: "Ali" }],
  paymodes: [{ paymodeId: 1, paymodeName: "Cash" }, { paymodeId: 2, paymodeName: "Card" }, { paymodeId: 3, paymodeName: "MultiPay" }],
};
const saved = (over: object = {}, paymodesData: unknown = null) => ({
  masterData: { seriesId: 7, voucherNo: "V5", voucherDate: "2026-11-05T00:00:00", branchId: 2, employeeId: 4, accountId: 9, accountName: "Acme", refNo: "R-1", narration: "note", paymodeId: 1, amount: 12.5, isCancelled: false, ...over },
  paymodesData,
});

const wrapper = ({ children }: { children: ReactNode }) => createElement(Provider, {
  store,
  children: createElement(QueryClientProvider, { client: new QueryClient({ defaultOptions: { queries: { retry: false } } }), children }),
});
const withoutClock = (p: Record<string, unknown>) => Object.fromEntries(Object.entries(p).filter(([k]) => !["createdAt", "updatedAt"].includes(k)));
const flush = async () => { await act(async () => { await new Promise((r) => setTimeout(r, 30)); }); };

describe.each([
  ["Payment", "payment", usePaymentVoucher],
  ["Receipt", "receipt", useReceiptVoucher],
] as const)("%s Voucher", (_label, path, useVoucher) => {
  let dataResponse: unknown;
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem("decimalPart", "3");
    dataResponse = saved();
    http.post.mockResolvedValue({ data: { isSuccess: true, data: {} } });
    http.put.mockResolvedValue({ data: { isSuccess: true, data: {} } });
    http.get.mockImplementation(async (url: string) => {
      const ok = (data: unknown) => ({ data: { isSuccess: true, data } });
      if (url.endsWith("/load-master")) return ok(masters);
      if (url.endsWith("/account-list")) return ok([{ accountId: 9, code: "1", accountName: "Acme" }]);
      if (url.includes("/voucher-number/")) return ok("NEXT-9");
      if (url.endsWith("/details")) return ok([]);
      if (url.includes("/data/")) return ok(dataResponse);
      throw new Error(`unexpected GET ${url}`);
    });
  });
  afterEach(() => cleanup());

  const open = async () => {
    const { result } = renderHook(() => {
      const hook = useVoucher(1);
      void hook.form.formState.errors; // subscribes, as a page does when it shows them
      return hook;
    }, { wrapper });
    await waitFor(() => expect(result.current.form.getValues("accountName")).toBe("Acme"));
    await waitFor(() => expect(result.current.paymodeList.length).toBeGreaterThan(0));
    return result;
  };

  it("edit: URL and body", async () => {
    const hook = await open();
    await act(async () => { await hook.current.onSubmit(); });
    await waitFor(() => expect(http.put).toHaveBeenCalled());
    const [url, body] = http.put.mock.calls[0];
    expect(url).toBe(`/${path}/1`);
    expect(withoutClock(body)).toMatchSnapshot();
  });

  it("edit with a split payment: each paymode is sent", async () => {
    dataResponse = saved({ paymodeId: 3, amount: 40 }, [{ paymodeId: 1, amount: 25 }, { paymodeId: 2, amount: 15 }]);
    const hook = await open();
    await act(async () => { await hook.current.onSubmit(); });
    await waitFor(() => expect(http.put).toHaveBeenCalled());
    expect(withoutClock(http.put.mock.calls[0][1])).toMatchSnapshot();
  });

  it("a split that does not add up is not saved", async () => {
    dataResponse = saved({ paymodeId: 3, amount: 40 }, [{ paymodeId: 1, amount: 25 }]);
    const hook = await open();
    await act(async () => { await hook.current.onSubmit(); });
    await flush();
    expect(http.put).not.toHaveBeenCalled();
  });

  it("new: URL and body", async () => {
    const { result } = renderHook(() => useVoucher(), { wrapper });
    await waitFor(() => expect(result.current.paymodeList.length).toBeGreaterThan(0));
    act(() => {
      result.current.form.reset({
        seriesId: 7, prefix: "", voucherDate: "2026-11-05", voucherNo: "NEXT-9", accountId: 9, accountName: "Acme", paymodeId: 2, branchId: 2, employeeId: 4, refNo: "R-1", amount: "12.500", narration: "note",
      });
    });
    await act(async () => { await result.current.onSubmit(); });
    await waitFor(() => expect(http.post).toHaveBeenCalled());
    const [url, body] = http.post.mock.calls[0];
    expect(url).toBe(`/${path}`);
    expect(withoutClock(body)).toMatchSnapshot();
  });

  it("editing keeps the saved voucher number (a receipt used to show the next number)", async () => {
    const hook = await open();
    await flush();
    expect(hook.current.form.getValues("voucherNo")).toBe("V5");
    expect(http.get.mock.calls.some(([u]) => String(u).includes("/voucher-number/"))).toBe(false);
  });

  it("a new voucher starts on the first series with its next number", async () => {
    const { result } = renderHook(() => useVoucher(), { wrapper });
    await waitFor(() => expect(result.current.form.getValues("seriesId")).toBe(7));
    await waitFor(() => expect(result.current.form.getValues("voucherNo")).toBe("NEXT-9"));
  });

  it("spaces around Ref No and Narration are not saved", async () => {
    dataResponse = saved({ refNo: "  R-1 ", narration: " note  " });
    const hook = await open();
    await act(async () => { await hook.current.onSubmit(); });
    await waitFor(() => expect(http.put).toHaveBeenCalled());
    expect(http.put.mock.calls[0][1]).toMatchObject({ refNo: "R-1", narration: "note" });
  });

  it("a split that does not add up marks the Amount field", async () => {
    dataResponse = saved({ paymodeId: 3, amount: 40 }, [{ paymodeId: 1, amount: 25 }]);
    const hook = await open();
    await act(async () => { await hook.current.onSubmit(); });
    await waitFor(() => expect(hook.current.form.formState.errors.amount?.message).toBeTruthy());
    expect(http.put).not.toHaveBeenCalled();
  });

  it("the list asks for the right URL, and cancel uses its own", async () => {
    const { result } = renderHook(() => useVoucher(), { wrapper });
    await waitFor(() => expect(http.get.mock.calls.some(([u]) => u === `/${path}/details`)).toBe(true));
    const details = http.get.mock.calls.find(([u]) => u === `/${path}/details`)!;
    expect(details[1].params.BranchId).toBe(1);
    await act(async () => { result.current.cancelMutation.mutate(5); });
    await waitFor(() => expect(http.put).toHaveBeenCalledWith(`/${path}/cancel/5`));
  });
});

describe.each([
  ["Payment", "payment", PaymentVoucherListPage, "pv", "text-red-500"],
  ["Receipt", "receipt", ReceiptVoucherListPage, "rv", "text-emerald-600"],
] as const)("%s Voucher list page", (label, path, Page, idPrefix, amountClass) => {
  afterEach(() => cleanup());

  it("shows its own title, ids and amount colour", async () => {
    vi.clearAllMocks();
    localStorage.setItem("decimalPart", "3");
    http.get.mockImplementation(async (url: string) => {
      const ok = (data: unknown) => ({ data: { isSuccess: true, data } });
      if (url.endsWith("/details")) return ok([{ transId: 5, sNo: 1, voucherDate: "2026-11-05", voucherNo: "V5", code: "1", account: "Acme", amount: "12.500" }]);
      if (url.endsWith("/load-master")) return ok(masters);
      return ok([]);
    });
    render(wrapper({ children: createElement(MemoryRouter, null, createElement(Page)) }));
    await waitFor(() => expect(screen.getByText("Acme")).toBeTruthy());
    expect(screen.getByText(`Saved ${label} List`)).toBeTruthy();
    expect(document.getElementById(`${idPrefix}-search-from`)).toBeTruthy();
    expect(document.querySelector(`.${amountClass}`)).toBeTruthy();
    expect(http.get.mock.calls.some(([u]) => u === `/${path}/details`)).toBe(true);
  });
});
