// @vitest-environment jsdom
/** Purchase Invoice round off: reaches the save payload, and comes back when the invoice is opened. */
import { createElement, type ReactNode } from "react";
import { Provider } from "react-redux";
import { renderHook, waitFor, act, cleanup } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { store } from "../app/store";
import { usePurchaseInvoice } from "../features/transaction/purchaseInvoice/hooks/usePurchaseInvoice";
import { purchaseInvoiceApi } from "../features/transaction/purchaseInvoice/services/purchaseInvoiceApi";

vi.mock("../features/transaction/purchaseInvoice/services/purchaseInvoiceApi", () => ({
  purchaseInvoiceApi: {
    getAllUnits: vi.fn(async () => [{ unitId: 1, unitName: "Nos", currentValue: 1, category: "Count" }]),
    getUnitsByCategory: vi.fn(async () => []),
    searchProductsByName: vi.fn(async () => []),
    searchSuppliers: vi.fn(async () => []),
    getProductCostData: vi.fn(async () => null),
    getProductCostDataById: vi.fn(async () => null),
    getUnitCost: vi.fn(async () => null),
    getPurchaseNumber: vi.fn(async () => "2"),
    loadMasterData: vi.fn(async () => ({
      series: [{ seriesId: 3, seriesName: "PI", prefix: "" }],
      branches: [{ branchId: 2, branchName: "Main" }],
      paymodes: [{ paymodeId: 1, paymodeName: "Cash" }],
      employees: [{ employeeId: 1, employeeName: "Ali" }],
      vats: [{ vatId: 1, vatName: "10%", vatValue: 10 }],
    })),
    getPurchaseInvoiceById: vi.fn(),
    savePurchaseInvoice: vi.fn(async () => ({})),
    updatePurchaseInvoice: vi.fn(async () => ({})),
  },
}));
vi.mock("../features/inventory/product/services/productService", () => ({
  productService: {
    loadMasterData: vi.fn(async () => null),
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

/** The reply from GET /purchase-invoice/data/1, with a round off of 0.5 on top of the 385 lines. */
const savedInvoice = (roundOff: number | undefined) => ({
  masterData: {
    seriesId: 3, purchaseNo: "1", purchaseDate: "2026-11-07T00:00:00", invoiceNo: "11", invoiceDate: "2026-11-07T00:00:00", branchId: 2,
    employeeId: 1, supplierId: 2, supplierName: "Supplier", refNo: "112", narration: "", paymodeId: 1, discAmount: 0, discPer: 0,
    vatExclAmount: 350, vatAmount: 35, roundOff, netAmount: 385 + (roundOff ?? 0), isCancelled: false,
  },
  detailsData: [{
    productName: "Burgers", barcode: "00005", unitName: "Nos", qty: 50, price: 7, discPer: 0, discAmount: 0, vatName: "10%", vatAmount: 35,
    netAmount: 385, productId: 5, unitId: 1, vatId: 1, vatValue: 10,
  }],
  paymodesData: null,
});

const openInvoice = async (roundOff: number | undefined) => {
  mock(purchaseInvoiceApi.getPurchaseInvoiceById).mockResolvedValue(savedInvoice(roundOff));
  const view = renderHook(() => usePurchaseInvoice("1"), { wrapper });
  await waitFor(() => expect(view.result.current.methods.getValues("invoiceNo")).toBe("11"));
  return view.result;
};

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.setItem("decimalPart", "3");
  vi.spyOn(console, "log").mockImplementation(() => {});
});
afterEach(() => cleanup());

describe("Purchase Invoice round off", () => {
  it("opening a saved invoice shows its round off and keeps it in the total", async () => {
    const hook = await openInvoice(0.5);
    expect(Number(hook.current.methods.getValues("roundOff"))).toBe(0.5);
    await waitFor(() => expect(hook.current.totals.grandTotal).toBe(385.5));
  });

  it("an old invoice without the field opens as 0", async () => {
    const hook = await openInvoice(undefined);
    expect(Number(hook.current.methods.getValues("roundOff"))).toBe(0);
    await waitFor(() => expect(hook.current.totals.grandTotal).toBe(385));
  });

  it("saving sends the round off, and netAmount already includes it", async () => {
    const hook = await openInvoice(0.5);
    await waitFor(() => expect(hook.current.totals.grandTotal).toBe(385.5));
    let saved = false;
    await act(async () => { saved = await hook.current.onSubmit(hook.current.methods.getValues()); });
    expect(saved).toBe(true);
    const payload = mock(purchaseInvoiceApi.updatePurchaseInvoice).mock.calls[0][1];
    expect(payload.roundOff).toBe(0.5);
    expect(payload.netAmount).toBe(385.5);
    expect(payload.vatExclAmount + payload.vatAmount + payload.roundOff).toBe(payload.netAmount);
  });

  it("a changed round off is what gets saved", async () => {
    const hook = await openInvoice(0.5);
    act(() => hook.current.methods.setValue("roundOff", "0.25"));
    await waitFor(() => expect(hook.current.totals.grandTotal).toBe(385.25));
    await act(async () => { await hook.current.onSubmit(hook.current.methods.getValues()); });
    const payload = mock(purchaseInvoiceApi.updatePurchaseInvoice).mock.calls[0][1];
    expect(payload.roundOff).toBe(0.25);
    expect(payload.netAmount).toBe(385.25);
  });

  it("no round off saves as 0", async () => {
    const hook = await openInvoice(0);
    await waitFor(() => expect(hook.current.totals.grandTotal).toBe(385));
    await act(async () => { await hook.current.onSubmit(hook.current.methods.getValues()); });
    expect(mock(purchaseInvoiceApi.updatePurchaseInvoice).mock.calls[0][1].roundOff).toBe(0);
  });
});
