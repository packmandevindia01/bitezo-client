// @vitest-environment jsdom
/** Purchase Return round off: reaches the save and edit payloads, and comes back when the return is opened. */
import { createElement, type ReactNode } from "react";
import { Provider } from "react-redux";
import { renderHook, waitFor, act, cleanup } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { store } from "../app/store";
import { usePurchaseReturn } from "../features/transaction/purchaseReturn/hooks/usePurchaseReturn";
import { purchaseReturnApi } from "../features/transaction/purchaseReturn/services/purchaseReturnApi";

vi.mock("../features/transaction/purchaseReturn/services/purchaseReturnApi", () => ({
  purchaseReturnApi: {
    getAllUnits: vi.fn(async () => [{ unitId: 1, unitName: "Nos", currentValue: 1, category: "Count" }]),
    getUnitsByCategory: vi.fn(async () => []),
    searchProductsByName: vi.fn(async () => []),
    searchSuppliers: vi.fn(async () => []),
    searchPurchaseInvoices: vi.fn(async () => []),
    getProductCostData: vi.fn(async () => null),
    getUnitCost: vi.fn(async () => null),
    getPurchaseInvoiceData: vi.fn(async () => null),
    getPurchaseInvoiceBalanceQty: vi.fn(async () => 1000),
    getPurchaseReturnNumber: vi.fn(async () => "2"),
    loadMasterData: vi.fn(async () => ({
      series: [{ seriesId: 3, seriesName: "PR", prefix: "", startNo: 1, branchId: 2 }],
      branches: [{ branchId: 2, branchName: "Main" }],
      paymodes: [{ paymodeId: 1, paymodeName: "Cash" }],
      salesman: [{ employeeId: 1, employeeName: "Ali" }],
      vats: [{ vatId: 1, vatName: "10%", vatValue: 10 }],
    })),
    getPurchaseReturnById: vi.fn(),
    savePurchaseReturn: vi.fn(async () => ({})),
    updatePurchaseReturn: vi.fn(async () => ({})),
  },
}));
vi.mock("../features/inventory/product/services/productService", () => ({
  productService: {
    loadMasterData: vi.fn(async () => null),
    getById: vi.fn(async () => null),
    getClosingStock: vi.fn(async () => 0),
    getAverageCost: vi.fn(async () => 0),
  },
}));
vi.mock("../features/general/configuration/services/backofficeConfigApi", () => ({
  backofficeConfigApi: { getConfigData: vi.fn(async () => null) },
}));
vi.mock("../app/providers/useToast", () => ({ useToast: () => ({ showToast: vi.fn() }) }));

const mock = (fn: unknown) => fn as ReturnType<typeof vi.fn>;
const wrapper = ({ children }: { children: ReactNode }) => createElement(Provider, { store, children });

/** The reply from GET purchase return by id, with a round off on top of the 385 lines. */
const savedReturn = (roundOff: number | undefined) => ({
  masterData: {
    seriesId: 3, purchaseReturnNo: "1", purchaseReturnDate: "2026-11-07T00:00:00", purchaseId: 0, branchId: 2, employeeId: 1,
    supplierId: 2, supplierName: "Supplier", refNo: "112", narration: "", paymodeId: 1, discAmount: 0, discPer: 0,
    vatExclAmount: 350, vatAmount: 35, roundOff, netAmount: 385 + (roundOff ?? 0),
  },
  detailsData: [{
    productName: "Burgers", unitName: "Nos", qty: 50, foc: 0, price: 7, discPer: 0, discAmount: 0, vatName: "10%", vatAmount: 35,
    netAmount: 385, productId: 5, unitId: 1, vatId: 1, vatValue: 10,
  }],
  paymodesData: null,
});

const openReturn = async (roundOff: number | undefined) => {
  mock(purchaseReturnApi.getPurchaseReturnById).mockResolvedValue(savedReturn(roundOff));
  const view = renderHook(() => usePurchaseReturn("1"), { wrapper });
  await waitFor(() => expect(view.result.current.methods.getValues("refNo")).toBe("112"));
  return view.result;
};

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.setItem("decimalPart", "3");
  vi.spyOn(console, "log").mockImplementation(() => {});
});
afterEach(() => cleanup());

describe("Purchase Return round off", () => {
  it("opening a saved return shows its round off and keeps it in the total", async () => {
    const hook = await openReturn(0.5);
    expect(Number(hook.current.methods.getValues("roundOff"))).toBe(0.5);
    await waitFor(() => expect(hook.current.totals.grandTotal).toBe(385.5));
  });

  it("an old return without the field opens as 0", async () => {
    const hook = await openReturn(undefined);
    expect(Number(hook.current.methods.getValues("roundOff"))).toBe(0);
    await waitFor(() => expect(hook.current.totals.grandTotal).toBe(385));
  });

  it("editing sends the round off, and netAmount already includes it", async () => {
    const hook = await openReturn(0.5);
    await waitFor(() => expect(hook.current.totals.grandTotal).toBe(385.5));
    let saved = false;
    await act(async () => { saved = await hook.current.onSubmit(hook.current.methods.getValues()); });
    expect(saved).toBe(true);
    const payload = mock(purchaseReturnApi.updatePurchaseReturn).mock.calls[0][1];
    expect(payload.roundOff).toBe(0.5);
    expect(payload.netAmount).toBe(385.5);
    expect(payload.vatExclAmount + payload.vatAmount + payload.roundOff).toBe(payload.netAmount);
  });

  it("a changed round off is what gets saved on edit", async () => {
    const hook = await openReturn(0.5);
    act(() => hook.current.methods.setValue("roundOff", "0.25"));
    await waitFor(() => expect(hook.current.totals.grandTotal).toBe(385.25));
    await act(async () => { await hook.current.onSubmit(hook.current.methods.getValues()); });
    const payload = mock(purchaseReturnApi.updatePurchaseReturn).mock.calls[0][1];
    expect(payload.roundOff).toBe(0.25);
    expect(payload.netAmount).toBe(385.25);
  });

  it("no round off saves as 0", async () => {
    const hook = await openReturn(0);
    await waitFor(() => expect(hook.current.totals.grandTotal).toBe(385));
    await act(async () => { await hook.current.onSubmit(hook.current.methods.getValues()); });
    expect(mock(purchaseReturnApi.updatePurchaseReturn).mock.calls[0][1].roundOff).toBe(0);
  });

  it("a new return sends the round off on save", async () => {
    const view = renderHook(() => usePurchaseReturn(), { wrapper });
    const hook = view.result;
    await waitFor(() => expect(hook.current.loadingMaster).toBe(false));
    act(() => {
      hook.current.setSelectedPaymodeId(1);
      hook.current.methods.reset({
        ...hook.current.methods.getValues(),
        series: "3", purchaseNo: "2", purchaseDate: "2026-11-07", supplier: "2", branch: "2", salesman: "1", roundOff: "0.5",
        items: [{ id: "a", product: "5", code: "5", unit: "1", qty: "50", foc: "0", price: "7", discPercent: "0", vatId: "1", vatPercent: "10", stock: "0", avgCost: "0" }],
        payments: [{ mode: "cash", amount: "385.5", paymodeId: 1 }],
      });
    });
    await waitFor(() => expect(hook.current.totals.grandTotal).toBe(385.5));
    let saved = false;
    await act(async () => { saved = await hook.current.onSubmit(hook.current.methods.getValues()); });
    expect(saved).toBe(true);
    const payload = mock(purchaseReturnApi.savePurchaseReturn).mock.calls[0][0];
    expect(payload.roundOff).toBe(0.5);
    expect(payload.netAmount).toBe(385.5);
    expect(purchaseReturnApi.updatePurchaseReturn).not.toHaveBeenCalled();
  });
});
