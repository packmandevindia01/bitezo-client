/**
 * Safety net for splitting usePosCheckoutFlow (2026-11-11): five terminal settles through the real hooks, store,
 * templates and routing (only the server and the printer are fake). Each records the sales invoice sent and every
 * page printed. A refactor must not change these snapshots unless the change is intended.
 */
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { Provider } from "react-redux";
import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from "vitest";
import { store } from "../app/store";
import { usePosCartActions } from "../features/pos/terminal/hooks/usePosCartActions";
import { usePosCheckoutFlow } from "../features/pos/terminal/hooks/usePosCheckoutFlow";
import { cacheProducts, clearCart, setOrderType, setCombinedOrderIds } from "../features/pos/terminal/store/posSlice";
import { buildSavedOrderLoad, dispatchSavedOrderLoad } from "../features/pos/terminal/utils/savedOrderToCart";
import { orderApi } from "../features/pos/services/orderApi";
import { salesInvoiceApi } from "../features/pos/services/salesInvoiceApi";
import { settledOrdersApi } from "../features/pos/services/settledOrdersApi";
import { saveSettlePrintConfig } from "../features/pos/utils/settlePrintConfig";

const printed: string[] = [];

vi.mock("../features/pos/services/qzService", () => ({
  printHtmlReceipt: async (html: string) => { printed.push(html); },
  openCashDrawer: async () => {},
}));
vi.mock("../features/pos/services/printerSettingsApi", () => ({
  printerSettingsApi: {
    getPrinterData: async () => ({ isSuccess: true, data: { generalPrinter: { kotPrinter: "POS-80C", billPrinter: "POS-80C" } } }),
    getGeneral: async () => ({ data: { billPrinter: "POS-80C", kotPrinter: "POS-80C" } }),
  },
}));
vi.mock("../features/pos/services/orderApi", () => ({
  orderApi: { submitOrder: vi.fn(), updateOrder: vi.fn(), getOrderDetails: vi.fn(async () => null) },
}));
vi.mock("../features/pos/services/salesInvoiceApi", () => ({
  salesInvoiceApi: { createSalesInvoice: vi.fn(), updateSalesInvoice: vi.fn(), getSalesInvoiceData: vi.fn(async () => null) },
}));
vi.mock("../features/pos/services/settledOrdersApi", () => ({
  settledOrdersApi: { getSettledOrderDetails: vi.fn(async () => null), getSettledPrintData: vi.fn(async () => null) },
}));
vi.mock("../features/inventory/branches/services/branchApi", () => ({ branchApi: { getBranchPrintDesign: async () => null } }));
vi.mock("../features/general/employee/services/employeeService", () => ({
  getEmployeeNames: async () => [{ empId: 1, empName: "Ali" }],
  getEmployeeById: async () => null,
  employeeService: { getDrivers: async () => [{ driverId: 4, driverName: "Hassan" }] },
}));
vi.mock("../app/providers/useToast", () => ({ useToast: () => ({ showToast: () => {} }) }));

const mock = (fn: unknown) => fn as ReturnType<typeof vi.fn>;
const BURGER = { id: 1, name: "Burger", price: 10, vatValue: 10, isIncl: false, categoryId: 1 };
const FRIES = { id: 2, name: "Fries", price: 5, vatValue: 10, isIncl: false, categoryId: 1 };
const products = [BURGER, FRIES];
const productCache = { 1: BURGER, 2: FRIES };
const status = { dayId: 1, shiftId: 1, userId: 1, transDate: "2026-11-06" };
const TENDERS = [{ id: "1", label: "Cash" }, { id: "2", label: "Card" }];

const render = (fn: () => void) => renderToString(createElement(Provider, { store, children: createElement(() => { fn(); return null; }) }));
const cartActions = () => {
  const box: { hook?: ReturnType<typeof usePosCartActions> } = {};
  render(() => { box.hook = usePosCartActions(); });
  return box.hook!;
};
const checkout = (editingSaleId: number | null = null, isCartModified = false) => {
  const box: { hook?: ReturnType<typeof usePosCheckoutFlow> } = {};
  render(() => {
    const cart = usePosCartActions();
    box.hook = usePosCheckoutFlow({
      status, cartDetails: cart.cartDetails, activeProvider: null, editingOrderId: store.getState().pos.editingOrderId, editingSaleId,
      isCartModified, subtotal: cart.subtotal, totalDiscountAmount: cart.discount, totalServiceCharge: cart.totalServiceCharge,
      totalLevy: cart.totalLevy, totalVat: cart.tax, total: cart.total, deliveryCharge: cart.deliveryCharge ?? 0, tenderOptions: TENDERS, decimalPart: 3,
      waiterName: "Ali", waiterId: 1, submitOrder: cart.submitOrder, getDirectSettleOrderPayload: cart.getDirectSettleOrderPayload,
      requestAuthorization: () => {}, showToast: () => {}, handleClearCart: () => { store.dispatch(clearCart()); },
      setIsCashModalOpen: () => {}, setIsMultiPayModalOpen: () => {}, setSelectedKey: () => {}, setSelectedProduct: () => {},
      setAlternatives: () => {}, setActiveProvider: () => {}, setChange: () => {}, getRuntimePosConfig: async () => ({ defaultEmployee: "Disable" }),
    } as never);
  });
  return box.hook!;
};

/** A saved order as the server returns it (Exclusive values). */
const savedOrder = (o: { id: number; typeName: string; typeId: number; master?: Record<string, unknown>; lines: { productId: number; qty: number; price: number; discAmount?: number; discPer?: number; vatAmount: number; serviceCharge?: number }[]; modifiers?: unknown[] }) => {
  const names: Record<number, string> = { 1: "Burger", 2: "Fries" };
  const details = o.lines.map((l, i) => ({
    mapId: i + 1, productId: l.productId, productName: names[l.productId], qty: l.qty, price: l.price, amount: l.price * l.qty,
    discAmount: l.discAmount ?? 0, discPer: l.discPer ?? 0, serviceCharge: l.serviceCharge ?? 0, levy: 0, vatAmount: l.vatAmount, vatValue: 10, vatId: 1, unitId: 1,
    netAmount: l.price * l.qty - (l.discAmount ?? 0) + (l.serviceCharge ?? 0) + l.vatAmount,
  }));
  const sum = (f: (d: (typeof details)[number]) => number) => Math.round(details.reduce((s, d) => s + f(d), 0) * 1000) / 1000;
  return {
    masterData: {
      orderId: o.id, orderNo: o.id, ticketNo: o.id, orderType: o.typeName, orderTypeId: o.typeId, employeeId: 1, employeeName: "Ali", customerId: 1,
      sectionId: 0, tableId: 0, deliveryCharge: 0, discPer: 0,
      discAmount: sum((d) => d.discAmount), serviceCharge: sum((d) => d.serviceCharge), levy: 0,
      vatExclAmount: sum((d) => d.amount - d.discAmount + d.serviceCharge), vatAmount: sum((d) => d.vatAmount), netAmount: sum((d) => d.netAmount),
      updatedAt: "2026-11-06T10:00:00", voucherDate: "2026-11-06T10:00:00",
      ...o.master,
    },
    detailsData: details,
    modifiersData: o.modifiers ?? [],
  };
};

const open = (saved: ReturnType<typeof savedOrder>, mode: string, id: number) => {
  const load = buildSavedOrderLoad(saved, { mode, orderId: id, products, productCache } as never);
  dispatchSavedOrderLoad(load, store.dispatch as never, id);
};

/** Server: every order lookup / settled lookup returns these saved orders by id. */
const serve = (orders: Record<number, ReturnType<typeof savedOrder>>) => {
  mock(orderApi.getOrderDetails).mockImplementation(async (id: number) => (orders[id] ? { isSuccess: true, data: structuredClone(orders[id]) } : null));
  mock(settledOrdersApi.getSettledOrderDetails).mockImplementation(async (id: number) => (orders[id] ? { isSuccess: true, data: structuredClone(orders[id]) } : null));
};

const settled = async () => { await vi.waitFor(() => expect(store.getState().pos.cartItems.length).toBe(0), { timeout: 3000 }); };
const record = () => ({
  invoice: mock(salesInvoiceApi.createSalesInvoice).mock.calls[0]?.[0] ?? null,
  invoiceUpdate: mock(salesInvoiceApi.updateSalesInvoice).mock.calls[0] ?? null,
  prints: printed.slice(),
});

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
  localStorage.setItem("cachedBillPrinter", "POS-80C");
  localStorage.setItem("cachedKotPrinter", "POS-80C");
  localStorage.setItem("authorizedEmployeeId", "1");
  localStorage.setItem("posConfigs", JSON.stringify({ configs: { vatStatus: true, serviceCharges: 0, levy: 0, priceView: "Exclusive", printPrice: "Exclusive", discCalc: "Exclusive", kotPrint: "Disable", masterKot: "Disable", cashdrawer: "Enable" } }));
  saveSettlePrintConfig({ enabled: true, askBeforePrint: false });
  store.dispatch(clearCart());
  store.dispatch(cacheProducts(products as never));
  mock(salesInvoiceApi.createSalesInvoice).mockResolvedValue({ id: 105672, voucherNo: "77" });
  mock(salesInvoiceApi.updateSalesInvoice).mockResolvedValue(true);
  serve({});
});
afterEach(() => { vi.useRealTimers(); });
afterAll(() => { store.dispatch(clearCart()); });

describe("terminal settle", () => {
  it("(a) new Take Out cart, cash: receipt rebuilt from the cart", async () => {
    store.dispatch(setOrderType({ id: 2, name: "TakeOut" } as never));
    cartActions().addProduct(1, undefined, 10, false);
    cartActions().addProduct(2, undefined, 5, false);
    const flow = checkout();
    flow.settleShouldPrintRef.current = true;
    await flow.handleCompleteSettlement([{ paymodeId: 1, amount: 20, tenderedAmount: 20 }], 3.5);
    await settled();
    expect(record()).toMatchSnapshot();
  });

  it("(b) recalled Dine-In order, item discount, settled data from the server", async () => {
    const saved = savedOrder({
      id: 51, typeName: "DineIn", typeId: 1, master: { sectionId: 7, sectionName: "Hall", tableId: 9, tableNo: "T9" },
      lines: [{ productId: 1, qty: 2, price: 10, discAmount: 2, vatAmount: 1.8 }, { productId: 2, qty: 1, price: 5, vatAmount: 0.5 }],
      modifiers: [{ mapId: 1, modifierId: 11, modifierName: "Cheese", price: 0.5, qty: 1, typeId: 2, status: "extras" }],
    });
    serve({ 51: saved });
    open(saved, "recallSettle", 51);
    const flow = checkout();
    flow.settleShouldPrintRef.current = true;
    await flow.handleCardCreditSettlement(2);
    await settled();
    expect(record()).toMatchSnapshot();
  });

  it("(c) delivery, bill discount, address, driver and keep change", async () => {
    const saved = savedOrder({
      id: 52, typeName: "Delivery", typeId: 4,
      master: {
        discPer: 10, isBillDiscount: true, addressId: 5, deliveryCharge: 1, mobileNo: "33445566", deliveryCustomerName: "Mona",
        flatNo: "3", buildingNo: "12", roadNo: "2803", blockNo: "428", area: "Seef", change: "20", callBack: "17001700", driverId: 4,
      },
      lines: [{ productId: 1, qty: 1, price: 10, discAmount: 1, discPer: 10, vatAmount: 0.9 }, { productId: 2, qty: 2, price: 5, discAmount: 1, discPer: 10, vatAmount: 0.9 }],
    });
    saved.masterData.netAmount = Math.round((saved.masterData.netAmount + 1) * 1000) / 1000;
    serve({ 52: saved });
    open(saved, "recallSettle", 52);
    const flow = checkout();
    flow.settleShouldPrintRef.current = true;
    await flow.handleCompleteSettlement([{ paymodeId: 1, amount: 20, tenderedAmount: 20 }], 0);
    await settled();
    expect(record()).toMatchSnapshot();
  });

  it("(d) combined order: receipt from the cart lines", async () => {
    const a = savedOrder({ id: 61, typeName: "TakeOut", typeId: 2, lines: [{ productId: 1, qty: 1, price: 10, vatAmount: 1 }] });
    const b = savedOrder({ id: 62, typeName: "TakeOut", typeId: 2, lines: [{ productId: 2, qty: 1, price: 5, vatAmount: 0.5 }] });
    serve({ 61: a, 62: b });
    open(b, "recallSettle", 62);
    store.dispatch(setCombinedOrderIds([61]));
    cartActions().addProduct(1, undefined, 10, false); // order 61's line, as Combine puts it in the cart
    const flow = checkout(null, true);
    flow.settleShouldPrintRef.current = true;
    await flow.handleCompleteSettlement([{ paymodeId: 1, amount: 16.5, tenderedAmount: 16.5 }], 0);
    await settled();
    expect(record()).toMatchSnapshot();
  });

  it("(e) settled bill edited and updated", async () => {
    const saved = savedOrder({ id: 71, typeName: "TakeOut", typeId: 2, master: { saleId: 105600, voucherNo: "70" }, lines: [{ productId: 1, qty: 1, price: 10, vatAmount: 1 }] });
    serve({ 71: saved });
    open(saved, "settledEdit", 71);
    cartActions().addProduct(2, undefined, 5, false);
    const flow = checkout(105600, true);
    flow.settleShouldPrintRef.current = true;
    await flow.handleCompleteSettlement([{ paymodeId: 1, amount: 16.5, tenderedAmount: 16.5 }], 0);
    await settled();
    expect(record()).toMatchSnapshot();
  });
});
