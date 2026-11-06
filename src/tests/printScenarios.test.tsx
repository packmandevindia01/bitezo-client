/**
 * Every KOT and settle print against POS config, through the real hooks, store, templates and routing. Only the
 * server and the printer are fake. Dine-in settle: dineInSettlePrint.test.tsx.
 */
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { Provider } from "react-redux";
import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";
import { store } from "../app/store";
import { usePosCartActions } from "../features/pos/terminal/hooks/usePosCartActions";
import { usePosCheckoutFlow } from "../features/pos/terminal/hooks/usePosCheckoutFlow";
import {
  addVoidProduct, cacheProducts, clearCart, setOrderType, setSectionId, setTableId, setTableNo, setGuestNo, updateItemQty, setItemCustomizations,
} from "../features/pos/terminal/store/posSlice";
import { buildSavedOrderLoad, dispatchSavedOrderLoad } from "../features/pos/terminal/utils/savedOrderToCart";
import { orderApi } from "../features/pos/services/orderApi";
import { salesInvoiceApi } from "../features/pos/services/salesInvoiceApi";
import { saveSettlePrintConfig } from "../features/pos/utils/settlePrintConfig";

const printed: { html: string; printer?: string }[] = [];
const toasts: string[] = [];
let drawerOpens = 0;

vi.mock("../features/pos/services/qzService", () => ({
  printHtmlReceipt: async (html: string, printer?: string) => { printed.push({ html, printer }); },
  openCashDrawer: async () => { drawerOpens++; },
}));
vi.mock("../features/pos/services/printerSettingsApi", () => ({
  printerSettingsApi: {
    getPrinterData: async () => ({ isSuccess: true, data: { generalPrinter: { kotPrinter: "POS-80C", billPrinter: "POS-80C" } } }),
    getGeneral: async () => ({ data: { billPrinter: "POS-80C", kotPrinter: "POS-80C" } }),
  },
}));
vi.mock("../features/pos/services/orderApi", () => ({
  orderApi: { submitOrder: vi.fn(), updateOrder: vi.fn(), getOrderDetails: vi.fn() },
}));
vi.mock("../features/pos/services/salesInvoiceApi", () => ({
  salesInvoiceApi: { createSalesInvoice: vi.fn(), updateSalesInvoice: vi.fn(), getSalesInvoiceData: vi.fn(async () => null) },
}));
vi.mock("../features/pos/services/settledOrdersApi", () => ({
  settledOrdersApi: { getSettledOrderDetails: vi.fn(async () => null), getSettledPrintData: vi.fn(async () => null) },
}));
vi.mock("../features/inventory/branches/services/branchApi", () => ({ branchApi: { getBranchPrintDesign: async () => null } }));
vi.mock("../features/general/employee/services/employeeService", () => ({ getEmployeeNames: async () => [], employeeService: {} }));
vi.mock("../app/providers/useToast", () => ({ useToast: () => ({ showToast: (m: string) => { toasts.push(m); } }) }));

const BURGER = { id: 1, name: "Burger", price: 10, vatValue: 10, isIncl: false, categoryId: 1 };
const FRIES = { id: 2, name: "Fries", price: 5, vatValue: 10, isIncl: false, categoryId: 1 };
const products = [BURGER, FRIES];
const productCache = { 1: BURGER, 2: FRIES };
const session = { dayId: 1, shiftId: 1, userId: 1, employeeId: 1, customerId: 1 };
const status = { dayId: 1, shiftId: 1, userId: 1, transDate: "2026-11-06" };
const TENDERS = [{ id: "1", label: "Cash" }, { id: "2", label: "Card" }];

const mock = (fn: unknown) => fn as ReturnType<typeof vi.fn>;

interface SavedDetail { productId: number; price: number; qty: number; discAmount?: number; serviceCharge?: number; levy?: number; vatAmount?: number; mapId?: number }
interface SavedPayload { details: SavedDetail[]; modifiers?: unknown[]; serviceCharge: number; levy: number; vatExclAmount: number; vatAmount: number; netAmount: number }

const render = (fn: () => void) => renderToString(createElement(Provider, { store, children: createElement(() => { fn(); return null; }) }));

/** The real hook, against the real store as it stands now. */
const cartActions = () => {
  const box: { hook?: ReturnType<typeof usePosCartActions> } = {};
  render(() => { box.hook = usePosCartActions(); });
  return box.hook!;
};

const checkout = (editingSaleId: number | null = null) => {
  const box: { hook?: ReturnType<typeof usePosCheckoutFlow> } = {};
  render(() => {
    const cart = usePosCartActions();
    box.hook = usePosCheckoutFlow({
      status, cartDetails: cart.cartDetails, activeProvider: null, editingOrderId: store.getState().pos.editingOrderId, editingSaleId,
      isCartModified: false, subtotal: cart.subtotal, totalDiscountAmount: cart.discount, totalServiceCharge: cart.totalServiceCharge,
      totalLevy: cart.totalLevy, totalVat: cart.tax, total: cart.total, deliveryCharge: 0, tenderOptions: TENDERS, decimalPart: 3,
      waiterName: "Ali", waiterId: 1, submitOrder: cart.submitOrder, getDirectSettleOrderPayload: cart.getDirectSettleOrderPayload,
      requestAuthorization: () => {}, showToast: (m: string) => { toasts.push(m); }, handleClearCart: () => { store.dispatch(clearCart()); },
      setIsCashModalOpen: () => {}, setIsMultiPayModalOpen: () => {}, setSelectedKey: () => {}, setSelectedProduct: () => {},
      setAlternatives: () => {}, setActiveProvider: () => {}, setChange: () => {}, getRuntimePosConfig: async () => ({ defaultEmployee: "Disable" }),
    } as never);
  });
  return box.hook!;
};

const prints = () =>
  printed.map((p) => {
    const text = p.html.replace(/<style[\s\S]*?<\/style>/g, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
    const title = /(MASTER RE-ORDER|UPDATE MASTER KOT|MASTER KOT|UPDATE KOT|RE-ORDER|VOID ITEMS|PACKAGER|SIMPLIFIED TAX INVOICE|SIMPLIFIED INVOICE|GUEST PRINT|KOT)/.exec(text)?.[1] ?? "?";
    return { title, text, barcode: /class="barcode-container"/.test(p.html) };
  });
const titles = () => prints().map((p) => p.title);

const savedFromPayload = (p: SavedPayload, typeName: string, typeId: number) => ({
  masterData: {
    orderId: 3, orderNo: 3, ticketNo: 3, orderType: typeName, orderTypeId: typeId, sectionId: typeId === 1 ? 7 : 0, tableId: typeId === 1 ? 9 : 0, tableNo: typeId === 1 ? "T9" : "",
    sectionName: typeId === 1 ? "Hall" : "", deliveryCharge: 0, discAmount: 0, discPer: 0, serviceCharge: p.serviceCharge, levy: p.levy,
    vatExclAmount: p.vatExclAmount, vatAmount: p.vatAmount, netAmount: p.netAmount, employeeId: 1, employeeName: "Ali", updatedAt: "2026-11-06T10:00:00", addressId: 5,
  },
  detailsData: p.details.map((d, i) => ({
    ...d, productName: products.find((x) => x.id === d.productId)?.name, amount: d.price * d.qty, vatValue: 10, mapId: d.mapId || i + 1,
    netAmount: d.price * d.qty - (d.discAmount || 0) + (d.serviceCharge || 0) + (d.levy || 0) + (d.vatAmount || 0),
  })),
  modifiersData: p.modifiers || [],
});

const setConfig = (kotPrint: string, extra: Record<string, unknown> = {}) =>
  localStorage.setItem("posConfigs", JSON.stringify({ configs: { vatStatus: true, serviceCharges: 0, levy: 0, priceView: "Exclusive", kotPrint, masterKot: "Disable", cashdrawer: "Enable", ...extra } }));

const ORDER_TYPES = [
  { name: "TakeOut", id: 2 },
  { name: "DineIn", id: 1 },
  { name: "DriveThru", id: 3 },
] as const;

const startCart = (type: { name: string; id: number }) => {
  store.dispatch(clearCart());
  store.dispatch(setOrderType({ id: type.id, name: type.name } as never));
  if (type.id === 1) {
    store.dispatch(setSectionId(7));
    store.dispatch(setTableId(9));
    store.dispatch(setTableNo("T9"));
    store.dispatch(setGuestNo(2));
  }
};

const placeFirstOrder = async (type: { name: string; id: number }) => {
  startCart(type);
  cartActions().addProduct(1, undefined, 10, false);
  const sent: { payload?: SavedPayload } = {};
  mock(orderApi.submitOrder).mockImplementation(async (payload: SavedPayload) => {
    sent.payload = payload;
    return { isSuccess: true, data: { orderId: 3, orderNo: 3, ticketNo: 3 } };
  });
  mock(orderApi.getOrderDetails).mockImplementation(async () => ({ data: sent.payload ? savedFromPayload(sent.payload, type.name, type.id) : null }));
  await cartActions().submitOrder(session as never, true);
  return savedFromPayload(sent.payload!, type.name, type.id);
};

const open = (saved: unknown, mode: string) => {
  const load = buildSavedOrderLoad(saved, { mode, orderId: 3, products, productCache } as never);
  dispatchSavedOrderLoad(load, store.dispatch as never, 3);
};
const reorder = async () => { await cartActions().submitOrder(session as never, true); };
const settled = async () => { await vi.waitFor(() => expect(store.getState().pos.cartItems.length).toBe(0), { timeout: 3000 }); };

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  printed.length = 0;
  toasts.length = 0;
  drawerOpens = 0;
  vi.clearAllMocks();
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  localStorage.setItem("cachedBillPrinter", "POS-80C");
  localStorage.setItem("cachedKotPrinter", "POS-80C");
  localStorage.setItem("authorizedEmployeeId", "1");
  store.dispatch(cacheProducts(products as never));
  mock(orderApi.updateOrder).mockResolvedValue({ isSuccess: true, data: { orderId: 3 } });
  mock(salesInvoiceApi.createSalesInvoice).mockResolvedValue({ id: 105672, voucherNo: "77" });
  mock(salesInvoiceApi.updateSalesInvoice).mockResolvedValue(true);
});
afterAll(() => { store.dispatch(clearCart()); });

describe.each(ORDER_TYPES)("KOT, order type $name", (type) => {
  describe.each([["Enable", true], ["Disable", false]] as const)("Standard KOT %s", (kot, on) => {
    beforeEach(() => setConfig(kot));

    it("new order", async () => {
      await placeFirstOrder(type);
      expect(titles()).toEqual(on ? ["KOT"] : []);
    });

    it("recall edit, new item", async () => {
      const saved = await placeFirstOrder(type);
      printed.length = 0;
      open(saved, "recallEdit");
      cartActions().addProduct(2, undefined, 5, false);
      await reorder();
      expect(titles()).toEqual(on ? ["RE-ORDER"] : []);
      if (on) {
        expect(prints()[0].text).toContain("FRIES");
        expect(prints()[0].text).not.toContain("BURGER");
      }
    });

    it("recall edit, same product again (new row)", async () => {
      const saved = await placeFirstOrder(type);
      printed.length = 0;
      open(saved, "recallEdit");
      cartActions().addProduct(1, undefined, 10, false);
      expect(store.getState().pos.cartItems.length).toBe(2);
      await reorder();
      expect(titles()).toEqual(on ? ["RE-ORDER"] : []);
    });

    it("recall edit, quantity raised", async () => {
      const saved = await placeFirstOrder(type);
      printed.length = 0;
      open(saved, "recallEdit");
      const line = store.getState().pos.cartItems[0];
      store.dispatch(updateItemQty({ uniqueId: line.uniqueId, quantity: 3 } as never));
      expect(store.getState().pos.cartItems[0].quantity).toBe(3);
      await reorder();
      expect(titles()).toEqual(on ? ["RE-ORDER"] : []);
    });

    it("recall edit, nothing changed: UPDATE KOT with the whole order", async () => {
      const saved = await placeFirstOrder(type);
      printed.length = 0;
      open(saved, "recallEdit");
      await reorder();
      expect(titles()).toEqual(on ? ["UPDATE KOT"] : []);
      if (on) expect(prints()[0].text).toContain("BURGER");
    });

    it("recall edit, extra added to an existing line: UPDATE KOT shows it", async () => {
      const saved = await placeFirstOrder(type);
      printed.length = 0;
      open(saved, "recallEdit");
      const line = store.getState().pos.cartItems[0];
      store.dispatch(setItemCustomizations({
        uniqueId: line.uniqueId,
        extras: [{ id: 9, name: "Cheese", price: 1, qty: 1, typeId: 2 }],
      }));
      await reorder();
      expect(titles()).toEqual(on ? ["UPDATE KOT"] : []);
      if (on) expect(prints()[0].text.toUpperCase()).toContain("CHEESE");
    });

    it("recall edit, only a void: VOID ITEMS, no extra KOT", async () => {
      const saved = await placeFirstOrder(type);
      printed.length = 0;
      open(saved, "recallEdit");
      store.dispatch(addVoidProduct({ productId: 1, qty: 1, unitId: 1, amount: 10, mapId: 1, productName: "Burger", name: "Burger", price: 10 } as never));
      await reorder();
      expect(titles()).toEqual(on ? ["VOID ITEMS"] : []);
    });

    it("recall edit, item voided", async () => {
      const saved = await placeFirstOrder(type);
      printed.length = 0;
      open(saved, "recallEdit");
      store.dispatch(addVoidProduct({ productId: 1, qty: 1, unitId: 1, amount: 10, mapId: 1, productName: "Burger", name: "Burger", price: 10 } as never));
      cartActions().addProduct(2, undefined, 5, false);
      await reorder();
      expect(titles()).toEqual(on ? ["RE-ORDER", "VOID ITEMS"] : []);
    });
  });
});

it("Master KOT on an edit with no added line: UPDATE MASTER KOT", async () => {
  setConfig("Enable", { masterKot: "Enable" });
  localStorage.setItem("cachedMasterKotPrinter", "POS-80C");
  const saved = await placeFirstOrder(ORDER_TYPES[0]);
  printed.length = 0;
  open(saved, "recallEdit");
  await reorder();
  expect(titles()).toEqual(["UPDATE KOT", "UPDATE MASTER KOT"]);
});

describe("KOT, Master KOT combinations (recall edit with new item)", () => {
  it.each([
    ["Enable", "Disable", ["RE-ORDER"]],
    ["Enable", "Enable", ["RE-ORDER", "MASTER RE-ORDER"]],
    ["Disable", "Enable", ["MASTER RE-ORDER"]],
    ["Disable", "Disable", []],
  ])("standard %s, master %s", async (kot, master, expected) => {
    setConfig(kot, { masterKot: master });
    localStorage.setItem("cachedMasterKotPrinter", "POS-80C");
    const saved = await placeFirstOrder(ORDER_TYPES[0]);
    printed.length = 0;
    open(saved, "recallEdit");
    cartActions().addProduct(2, undefined, 5, false);
    await reorder();
    expect(titles()).toEqual(expected);
  });
});

const MODES = [
  ["print directly", { enabled: true, askBeforePrint: false }, 1],
  ["disabled", { enabled: false, askBeforePrint: false }, 0],
  ["disabled, ask left on", { enabled: false, askBeforePrint: true }, 0],
] as const;

describe.each(MODES)("settle print %s", (_label, config, receipts) => {
  beforeEach(() => { setConfig("Enable"); saveSettlePrintConfig(config); });

  it("terminal: direct settle, cash", async () => {
    startCart(ORDER_TYPES[0]);
    cartActions().addProduct(1, undefined, 10, false);
    const flow = checkout();
    flow.settleShouldPrintRef.current = true;
    await flow.handleCompleteSettlement([{ paymodeId: 1, amount: 11 }], 0);
    await settled();
    expect(prints().filter((p) => /INVOICE/.test(p.title)).length).toBe(receipts);
    expect(drawerOpens).toBe(1);
  });

  it("terminal: direct settle, card", async () => {
    startCart(ORDER_TYPES[0]);
    cartActions().addProduct(1, undefined, 10, false);
    const flow = checkout();
    flow.settleShouldPrintRef.current = true;
    await flow.handleCardCreditSettlement(2);
    await settled();
    expect(prints().filter((p) => /INVOICE/.test(p.title)).length).toBe(receipts);
    expect(drawerOpens).toBe(0);
  });

  it("recall: settle a saved order", async () => {
    const saved = await placeFirstOrder(ORDER_TYPES[0]);
    printed.length = 0;
    open(saved, "recallSettle");
    const flow = checkout();
    flow.settleShouldPrintRef.current = true;
    await flow.handleCompleteSettlement([{ paymodeId: 1, amount: 11 }], 0);
    await settled();
    expect(prints().filter((p) => /INVOICE/.test(p.title)).length).toBe(receipts);
    expect(drawerOpens).toBe(1);
  });

  it("settled bill: edit and update", async () => {
    const saved = await placeFirstOrder(ORDER_TYPES[0]);
    printed.length = 0;
    open(saved, "settledEdit");
    const flow = checkout(105672);
    flow.settleShouldPrintRef.current = true;
    await flow.handleCompleteSettlement([{ paymodeId: 1, amount: 11 }], 0);
    await settled();
    expect(prints().filter((p) => /INVOICE/.test(p.title)).length).toBe(receipts);
    expect(drawerOpens).toBe(0);
  });
});

describe("settle print asks first", () => {
  beforeEach(() => { setConfig("Enable"); saveSettlePrintConfig({ enabled: true, askBeforePrint: true }); });

  it.each([[true, 1], [false, 0]] as const)("terminal: answer %s", async (answer, receipts) => {
    startCart(ORDER_TYPES[0]);
    cartActions().addProduct(1, undefined, 10, false);
    const flow = checkout();
    flow.settleShouldPrintRef.current = true;
    await flow.handleCompleteSettlement([{ paymodeId: 1, amount: 11 }], 0);
    await new Promise((r) => setTimeout(r, 50));
    expect(printed.length).toBe(0);
    expect(store.getState().pos.cartItems.length).toBe(1);
    flow.settlePrintPromptProps.onAnswer(answer);
    await settled();
    expect(prints().filter((p) => /INVOICE/.test(p.title)).length).toBe(receipts);
  });
});

