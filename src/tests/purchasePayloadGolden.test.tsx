// @vitest-environment jsdom
/**
 * Phase 5 safety net: the exact payloads Purchase Invoice and Purchase Return send today. When the two hooks are
 * merged (usePurchaseDocument), these snapshots must not change. Only the clock fields are removed.
 */
import { createElement, type ReactNode } from "react";
import { Provider } from "react-redux";
import { renderHook, waitFor, act, cleanup } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { store } from "../app/store";
import { usePurchaseInvoice } from "../features/transaction/purchaseInvoice/hooks/usePurchaseInvoice";
import { usePurchaseReturn } from "../features/transaction/purchaseReturn/hooks/usePurchaseReturn";
import { purchaseInvoiceApi } from "../features/transaction/purchaseInvoice/services/purchaseInvoiceApi";
import { purchaseReturnApi } from "../features/transaction/purchaseReturn/services/purchaseReturnApi";

const masters = {
  series: [{ seriesId: 3, seriesName: "Main", prefix: "", startNo: 1, branchId: 2 }],
  branches: [{ branchId: 2, branchName: "Main" }],
  paymodes: [{ paymodeId: 1, paymodeName: "Cash" }],
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
vi.mock("../features/inventory/product/services/productService", () => ({
  productService: { loadMasterData: vi.fn(async () => null), getById: vi.fn(async () => null), getClosingStock: vi.fn(async () => 0), getAverageCost: vi.fn(async () => 0) },
}));
vi.mock("../features/general/configuration/services/backofficeConfigApi", () => ({ backofficeConfigApi: { getConfigData: vi.fn(async () => null) } }));
vi.mock("../app/providers/useToast", () => ({ useToast: () => ({ showToast: vi.fn() }) }));

const mock = (fn: unknown) => fn as ReturnType<typeof vi.fn>;
const wrapper = ({ children }: { children: ReactNode }) => createElement(Provider, { store, children });
const withoutClock = (p: Record<string, unknown>) =>
  Object.fromEntries(Object.entries(p).filter(([k]) => !["createdAt", "updateAt", "updatedAt"].includes(k)));

/** Two lines (one in a bigger unit, one with its own discount), a bill discount and a round off. */
const lines = [
  { productName: "Rice", barcode: "1", unitName: "Box", qty: 3, foc: 1, price: 7.125, discPer: 0, discAmount: 0, vatName: "10%", vatAmount: 0, netAmount: 0, productId: 5, unitId: 2, vatId: 1, vatValue: 10 },
  { productName: "Oil", barcode: "2", unitName: "Nos", qty: 0.5, foc: 0, price: 19.99, discPer: 12.5, discAmount: 0, vatName: "10%", vatAmount: 0, netAmount: 0, productId: 6, unitId: 1, vatId: 1, vatValue: 10 },
];
const header = { seriesId: 3, branchId: 2, employeeId: 1, supplierId: 2, supplierName: "Supplier", refNo: "R-1", narration: "note", paymodeId: 1, discAmount: 1.5, discPer: 0, roundOff: 0.25, netAmount: 40, isCancelled: false };

const save = async (hook: { current: { totals: { grandTotal: number }; methods: { getValues: () => unknown }; onSubmit: (d: never) => Promise<boolean> } }) => {
  await waitFor(() => expect(hook.current.totals.grandTotal).toBeGreaterThan(0));
  let ok = false;
  await act(async () => { ok = await hook.current.onSubmit(hook.current.methods.getValues() as never); });
  expect(ok).toBe(true);
};

beforeEach(() => {
  vi.clearAllMocks();
  Object.assign(purchaseInvoiceApi, sharedApi);
  Object.assign(purchaseReturnApi, sharedApi);
  localStorage.setItem("decimalPart", "3");
  vi.spyOn(console, "log").mockImplementation(() => {});
});
afterEach(() => cleanup());

describe("payloads sent today", () => {
  it("Purchase Invoice, edit", async () => {
    mock(purchaseInvoiceApi.getPurchaseInvoiceById).mockResolvedValue({
      masterData: { ...header, purchaseNo: "1", purchaseDate: "2026-11-07T00:00:00", invoiceNo: "INV1", invoiceDate: "2026-11-06T00:00:00" }, detailsData: lines, paymodesData: null,
    });
    const { result } = renderHook(() => usePurchaseInvoice("1"), { wrapper });
    await waitFor(() => expect(result.current.methods.getValues("invoiceNo")).toBe("INV1"));
    await save(result as never);
    const [id, payload] = mock(purchaseInvoiceApi.updatePurchaseInvoice).mock.calls[0];
    expect(id).toBe("1");
    expect(withoutClock(payload)).toMatchSnapshot();
  });

  it("Purchase Return, edit", async () => {
    mock(purchaseReturnApi.getPurchaseReturnById).mockResolvedValue({
      masterData: { ...header, purchaseId: 0, purchaseReturnNo: "1", purchaseReturnDate: "2026-11-07T00:00:00" }, detailsData: lines, paymodesData: null,
    });
    const { result } = renderHook(() => usePurchaseReturn("1"), { wrapper });
    await waitFor(() => expect(result.current.methods.getValues("refNo")).toBe("R-1"));
    await save(result as never);
    const [id, payload] = mock(purchaseReturnApi.updatePurchaseReturn).mock.calls[0];
    expect(id).toBe("1");
    expect(withoutClock(payload)).toMatchSnapshot();
  });

  it("Purchase Return, new", async () => {
    const { result } = renderHook(() => usePurchaseReturn(), { wrapper });
    await waitFor(() => expect(result.current.loadingMaster).toBe(false));
    act(() => {
      result.current.setSelectedPaymodeId(1);
      result.current.methods.reset({
        ...result.current.methods.getValues(),
        series: "3", purchaseNo: "2", purchaseDate: "2026-11-07", supplier: "2", branch: "2", salesman: "1", refNo: "R-1", narration: "note", discAmount: "1.5", roundOff: "0.25",
        items: [
          { id: "a", product: "5", code: "5", unit: "2", qty: "3", foc: "1", price: "7.125", discPercent: "0", vatId: "1", vatPercent: "10", stock: "0", avgCost: "0" },
          { id: "b", product: "6", code: "6", unit: "1", qty: "0.5", foc: "0", price: "19.99", discPercent: "12.5", vatId: "1", vatPercent: "10", stock: "0", avgCost: "0" },
        ],
        payments: [{ mode: "cash", amount: "99", paymodeId: 1 }],
      });
    });
    await save(result as never);
    expect(withoutClock(mock(purchaseReturnApi.savePurchaseReturn).mock.calls[0][0])).toMatchSnapshot();
  });
});
