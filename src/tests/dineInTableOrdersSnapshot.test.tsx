// @vitest-environment jsdom
/**
 * Safety net for splitting the Dine-In table orders window (2026-11-11). Rendered with two saved orders, it
 * records: the list, the sales invoice sent on SETTLE, the settle receipt, the guest receipt (row PRINT) and the
 * cart after EDIT. A refactor must not change these snapshots unless the change is intended.
 */
import { createElement } from "react";
import { Provider } from "react-redux";
import { render, screen, fireEvent, waitFor, cleanup, within } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { store } from "../app/store";
import { DineInTableOrdersModal } from "../features/pos/terminal/components/modals/dining/DineInTableOrdersModal";
import { orderApi } from "../features/pos/services/orderApi";
import { dineInApi } from "../features/pos/services/dineInApi";
import { salesInvoiceApi } from "../features/pos/services/salesInvoiceApi";
import { cacheProducts, clearCart } from "../features/pos/terminal/store/posSlice";

vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });
const mock = (fn: unknown) => fn as ReturnType<typeof vi.fn>;
const printed: string[] = [];

vi.mock("react-router-dom", async (orig) => ({ ...(await orig<object>()), useNavigate: () => vi.fn() }));
vi.mock("../features/pos/services/qzService", () => ({
  printHtmlReceipt: async (html: string) => { printed.push(html); },
  openCashDrawer: async () => {},
}));
vi.mock("../features/pos/services/printerSettingsApi", () => ({
  printerSettingsApi: { getGeneral: async () => ({ data: { billPrinter: "POS-80C" } }), getPrinterData: async () => ({ isSuccess: false }) },
}));
vi.mock("../features/pos/services/orderApi", () => ({ orderApi: { getOrderDetails: vi.fn() } }));
vi.mock("../features/pos/services/dineInApi", () => ({ dineInApi: { getTableOrders: vi.fn() } }));
vi.mock("../features/pos/services/salesInvoiceApi", () => ({ salesInvoiceApi: { createSalesInvoice: vi.fn() } }));
vi.mock("../features/pos/services/menuApi", async (orig) => ({ ...(await orig<object>()), menuApi: { getAlternatives: async () => [], getModifierTypes: async () => [], getAllExtras: async () => [] } }));
vi.mock("../features/pos/terminal/hooks/usePosProducts", () => ({ usePosProducts: () => ({ products: [] }), alternativesCache: {} }));
vi.mock("../features/inventory/branches/services/branchApi", () => ({ branchApi: { getBranchPrintDesign: async () => null } }));
vi.mock("../features/general/employee/services/employeeService", () => ({
  getEmployeeNames: async () => [], getEmployeeById: async () => null, employeeService: {},
}));
vi.mock("../app/providers/useToast", () => ({ useToast: () => ({ showToast: () => {} }) }));
vi.mock("../features/pos/cashier", () => ({ useCashierLog: () => ({ status: { dayId: 1, shiftId: 1, userId: 1, transDate: "2026-11-06" } }) }));
vi.mock("../features/pos/terminal/hooks/usePosQueries", () => ({ usePosMasterData: () => ({ data: null }) }));
vi.mock("../features/pos/terminal/hooks/usePosRecall", () => ({
  usePosRecall: () => ({
    orders: [{ orderId: 41, details: "Order : 41 Ticket : 5 09:25:00 AM (DineIn) (CASH CUSTOMER) (Ali) Section : Hall TableNo : T9 Amnt : 12.320", isPrinted: true }],
    fetchOrders: vi.fn(),
  }),
}));
vi.mock("../features/pos/terminal/hooks/system/useTerminalInit", () => ({ getRuntimePosConfig: async () => ({ defaultEmployee: "Disable" }) }));
vi.mock("../features/pos/terminal/hooks/useEmployeeAuthorization", () => ({
  useEmployeeAuthorization: () => ({
    authorizationModalKey: 1, authorizationModalProps: {},
    requestAuthorization: ({ onAuthorized }: { onAuthorized: (id: number) => void }) => onAuthorized(1),
  }),
}));
vi.mock("../features/pos/utils/defaultEmployee", async (orig) => ({ ...(await orig<object>()), isDefaultEmployeeValidInCache: () => true }));
vi.mock("../features/pos/terminal/components/modals/system/EmployeePasswordModal", () => ({ EmployeePasswordModal: () => null }));
vi.mock("../features/pos/terminal/components/modals/dining/GuestCountModal", () => ({ GuestCountModal: () => null }));
vi.mock("../features/pos/terminal/components/modals/order/PosRecallDetailsModal", () => ({
  PosRecallDetailsModal: ({ isOpen, onSettleRequest, onEditRequest }: { isOpen: boolean; onSettleRequest: () => void; onEditRequest: () => void }) =>
    isOpen ? createElement("div", null,
      createElement("button", { onClick: onSettleRequest }, "stub-settle"),
      createElement("button", { onClick: onEditRequest }, "stub-edit")) : null,
}));
vi.mock("../features/pos/terminal/components/modals/payment/PosMultiPayModal", () => ({
  PosMultiPayModal: ({ onSubmit, totalDue }: { onSubmit: (p: unknown[], c: number) => void; totalDue: number }) =>
    createElement("button", { onClick: () => onSubmit([{ paymodeId: 1, label: "Cash", amount: totalDue + 1 }], 1) }, "stub-pay-cash"),
}));

/** Item discount on one line, an extra and a modifier, 10 % service charge. */
const ORDER_A = {
  masterData: {
    orderId: 41, orderNo: 41, ticketNo: 5, orderType: "DineIn", orderTypeId: 1, sectionId: 7, sectionName: "Hall", tableId: 9, tableNo: "T9",
    voucherDate: "2026-11-04T09:25:00", deliveryCharge: 0, discAmount: 0, discPer: 0, serviceCharge: 1.1, levy: 0,
    vatExclAmount: 12.1, vatAmount: 1.21, netAmount: 13.31, employeeId: 1, employeeName: "Ali", customerId: 1, guestNo: 2,
  },
  detailsData: [
    { qty: 2, productId: 1, productName: "Burger", price: 5.25, amount: 10.5, discAmount: 0.5, discPer: 0, serviceCharge: 1.0, levy: 0, vatAmount: 1.1, vatValue: 10, vatId: 1, mapId: 1, netAmount: 12.1, unitId: 1 },
    { qty: 1, productId: 2, productName: "Tea", price: 1, amount: 1, discAmount: 0, discPer: 0, serviceCharge: 0.1, levy: 0, vatAmount: 0.11, vatValue: 10, vatId: 1, mapId: 2, netAmount: 1.21, unitId: 1 },
  ],
  modifiersData: [
    { mapId: 1, modifierId: 11, modifierName: "Cheese", price: 0.25, qty: 1, typeId: 2, status: "extras" },
    { mapId: 1, modifierId: 12, modifierName: "Less salt", price: 0, qty: 1, typeId: 1, status: "modifier" },
  ],
};

/** 10 % bill discount spread on the lines. */
const ORDER_B = {
  masterData: {
    orderId: 42, orderNo: 42, ticketNo: 6, orderType: "DineIn", orderTypeId: 1, sectionId: 7, sectionName: "Hall", tableId: 9, tableNo: "T9",
    voucherDate: "2026-11-04T10:05:00", deliveryCharge: 0, discAmount: 2, discPer: 10, isBillDiscount: true, serviceCharge: 0, levy: 0,
    vatExclAmount: 18, vatAmount: 1.8, netAmount: 19.8, employeeId: 1, employeeName: "Ali", customerId: 1, guestNo: 1,
  },
  detailsData: [
    { qty: 1, productId: 3, productName: "Pizza", price: 12, amount: 12, discAmount: 1.2, discPer: 10, serviceCharge: 0, levy: 0, vatAmount: 1.08, vatValue: 10, vatId: 1, mapId: 1, netAmount: 11.88, unitId: 1 },
    { qty: 2, productId: 4, productName: "Juice", price: 4, amount: 8, discAmount: 0.8, discPer: 10, serviceCharge: 0, levy: 0, vatAmount: 0.72, vatValue: 10, vatId: 1, mapId: 2, netAmount: 7.92, unitId: 1 },
  ],
  modifiersData: [],
};

const ORDERS: Record<number, typeof ORDER_A | typeof ORDER_B> = { 41: ORDER_A, 42: ORDER_B };

const show = () =>
  render(createElement(Provider, {
    store,
    children: createElement(DineInTableOrdersModal, { isOpen: true, table: { tableId: 9, tableName: "T9", capacity: 4 } as never, sectionId: 7, onClose: vi.fn() }),
  }));

/** The order cards, once both are loaded in full (their ticket shows). */
const rows = () => waitFor(() => {
  const els = Array.from(document.body.querySelectorAll('[role="button"][aria-label^="Order "]')) as HTMLElement[];
  if (els.length < 2 || els.some((el) => !el.textContent?.includes("Order No"))) throw new Error("no cards");
  return els;
});
/** An action button on the right (Edit / Settle / KOT / Guest …). */
const action = (label: string) => screen.getByRole("button", { name: new RegExp("^" + label + "$", "i") });

/** The cart fields an EDIT fills (ids and timestamps that change per run left out). */
const cartSnapshot = () => {
  const pos = store.getState().pos as unknown as Record<string, unknown>;
  const items = (pos.cartItems as Record<string, unknown>[] | undefined) ?? [];
  return {
    editingOrderId: pos.editingOrderId,
    selectedOrderTypeName: pos.selectedOrderTypeName,
    selectedSectionId: pos.selectedSectionId,
    selectedTableId: pos.selectedTableId,
    billDiscountValue: pos.billDiscountValue,
    billDiscountType: pos.billDiscountType,
    waiterName: pos.waiterName,
    items: items.map(({ uniqueId: _u, ...rest }) => rest),
  };
};

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-06T12:30:00"));
  localStorage.clear();
  localStorage.setItem("systemCounterName", "Counter1"); // this device's counter (system registration)
  sessionStorage.clear();
  printed.length = 0;
  vi.clearAllMocks();
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  localStorage.setItem("decimalPart", "3");
  localStorage.setItem("posConfigs", JSON.stringify({ configs: { vatStatus: true, priceView: "Exclusive", printPrice: "Exclusive", discCalc: "Exclusive", serviceCharge: 10 } }));
  store.dispatch(clearCart());
  store.dispatch(cacheProducts([
    { id: 1, name: "Burger", price: 5, vatValue: 10, isIncl: false, categoryId: 1 },
    { id: 2, name: "Tea", price: 1, vatValue: 10, isIncl: false, categoryId: 1 },
    { id: 3, name: "Pizza", price: 12, vatValue: 10, isIncl: false, categoryId: 1 },
    { id: 4, name: "Juice", price: 4, vatValue: 10, isIncl: false, categoryId: 1 },
  ] as never));
  mock(dineInApi.getTableOrders).mockResolvedValue({ isSuccess: true, data: { masterData: [ORDER_A.masterData, ORDER_B.masterData] } });
  mock(orderApi.getOrderDetails).mockImplementation(async (id: number) => ({ isSuccess: true, data: structuredClone(ORDERS[id]) }));
  mock(salesInvoiceApi.createSalesInvoice).mockResolvedValue({ id: 105672, voucherNo: "77" });
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("Dine-In table orders window", () => {
  it("list", async () => {
    show();
    await rows();
    expect(document.body.innerHTML).toMatchSnapshot();
  });

  it("each card shows the Recall ticket: meta fields and totals", async () => {
    show();
    const [a, b] = await rows();
    expect(a.textContent).toMatch(/Emp/);
    expect(b.textContent).toMatch(/Order No/);
  });

  it("Details opens the full Recall preview", async () => {
    show();
    const [a] = await rows();
    fireEvent.click(within(a).getByRole("button", { name: /^Details of order/ }));
    expect(await screen.findByText("stub-edit")).toBeTruthy();
  });

  it("KOT prints the selected order", async () => {
    show();
    fireEvent.click((await rows())[0]);
    fireEvent.click(action("KOT"));
    await waitFor(() => expect(printed.length).toBeGreaterThan(0));
  });

  describe.each([[0, "item discount"], [1, "bill discount"]] as const)("order %i (%s)", (index, _kind) => {
    it("SETTLE: invoice sent and settle receipt", async () => {
      show();
      fireEvent.click((await rows())[index]);
      fireEvent.click(action("Settle"));
      fireEvent.click(await screen.findByText("stub-pay-cash"));
      await waitFor(() => expect(salesInvoiceApi.createSalesInvoice).toHaveBeenCalledTimes(1));
      await waitFor(() => expect(printed.length).toBe(1));
      expect(mock(salesInvoiceApi.createSalesInvoice).mock.calls[0][0]).toMatchSnapshot("invoice");
      expect(printed[0]).toMatchSnapshot("settle receipt");
    });

    it("GUEST: guest receipt", async () => {
      show();
      fireEvent.click((await rows())[index]);
      fireEvent.click(action("Guest"));
      await waitFor(() => expect(printed.length).toBe(1));
      expect(printed[0]).toMatchSnapshot("guest receipt");
    });

    it("EDIT: cart", async () => {
      show();
      fireEvent.click((await rows())[index]);
      fireEvent.click(action("Edit"));
      await waitFor(() => expect(store.getState().pos.editingOrderId).toBe(index === 0 ? 41 : 42));
      expect(cartSnapshot()).toMatchSnapshot("cart");
    });
  });
});
