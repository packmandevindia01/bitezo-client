// @vitest-environment jsdom
/**
 * Safety net for splitting the Recall details and Settled details windows (2026-11-11):
 * both windows are rendered with the same saved orders and their HTML is compared with a snapshot.
 * A refactor must not change these snapshots unless the change on screen is intended.
 */
import { createElement } from "react";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";
import { render, screen, cleanup } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { store } from "../app/store";
import { PosRecallDetailsModal } from "../features/pos/terminal/components/modals/order/PosRecallDetailsModal";
import { PosSettledDetailsModal } from "../features/pos/terminal/components/modals/system/PosSettledDetailsModal";
import { orderApi } from "../features/pos/services/orderApi";
import { settledOrdersApi } from "../features/pos/services/settledOrdersApi";

vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });
vi.mock("../app/providers/useToast", () => ({ useToast: () => ({ showToast: vi.fn() }) }));
vi.mock("../features/pos/terminal/hooks/usePosProducts", () => ({
  usePosProducts: () => ({ products: [] }),
  alternativesCache: {},
}));
vi.mock("../features/pos/services/orderApi", () => ({ orderApi: { getOrderDetails: vi.fn() } }));
vi.mock("../features/pos/services/settledOrdersApi", () => ({
  settledOrdersApi: { getSettledOrderDetails: vi.fn(), getSettledPrintData: vi.fn(async () => null) },
}));
vi.mock("../features/pos/services/salesInvoiceApi", () => ({ salesInvoiceApi: { getSalesInvoiceData: vi.fn(async () => null) } }));
vi.mock("../features/pos/services/menuApi", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  menuApi: { getModifierTypes: vi.fn(async () => []), getAllExtras: vi.fn(async () => []), getAlternatives: vi.fn(async () => []) },
}));
vi.mock("../features/pos/customer/services/deliveryApi", () => ({ deliveryApi: { getDeliveryAddress: vi.fn(async () => null) } }));
vi.mock("../features/general/employee/services/employeeService", () => ({
  getEmployeeNames: vi.fn(async () => []),
  getEmployeeById: vi.fn(async () => null),
}));

const mock = (fn: unknown) => fn as ReturnType<typeof vi.fn>;

/** Dine-in, item discount on one line, an extra, a modifier and a message. */
const DINE_IN_ITEM_DISCOUNT = {
  masterData: [{
    orderId: 301, orderNo: "301", ticketNo: 12, orderTypeId: 1, orderType: "DineIn",
    employeeId: 7, employeeName: "Ahmed", customerName: "CASH CUSTOMER", tableNo: "T4", sectionName: "MAIN",
    note: "No onions", voucherDate: "2026-11-04T09:25:00",
    vatExclAmount: 13.5, serviceCharge: 1.0, levy: 0, vatAmount: 1.35, netAmount: 14.85, discAmount: 0, discPer: 0,
  }],
  detailsData: [
    { mapId: 1, productId: 9, productName: "Burger", qty: 2, price: 5.25, amount: 10.5, discAmount: 1, discPer: 0, vatValue: 10 },
    { mapId: 2, productId: 6, productName: "Tea", arabicName: "شاي", qty: 1, price: 3, amount: 3, discAmount: 0, discPer: 0, vatValue: 10 },
  ],
  modifiersData: [
    { mapId: 1, modifierId: 11, modifierName: "Cheese", price: 0.25, qty: 1, typeId: 2, status: "extras" },
    { mapId: 1, modifierId: 12, modifierName: "Less salt", price: 0, qty: 1, typeId: 1, status: "modifier" },
    { mapId: 2, modifierId: 13, modifierName: "Very hot", price: 0, qty: 1, typeId: 3, status: "message" },
  ],
};

/** Delivery, 10 % bill discount, delivery charge and a full address. */
const DELIVERY_BILL_DISCOUNT = {
  masterData: [{
    orderId: 302, orderNo: "302", ticketNo: 13, orderTypeId: 4, orderType: "Delivery",
    employeeId: 8, employeeName: "Sara", customerName: "CASH CUSTOMER", deliveryCustomerName: "Mona",
    mobileNo: "33445566", callBack: "17001700", area: "Seef", blockNo: "428", roadNo: "2803", buildingNo: "12", flatNo: "3", change: "20",
    voucherDate: "2026-11-04T13:40:00",
    vatExclAmount: 18, serviceCharge: 0, levy: 0, vatAmount: 1.8, deliveryCharge: 1, netAmount: 20.8,
    discAmount: 2, discPer: 10, isBillDiscount: true,
  }],
  detailsData: [
    { mapId: 1, productId: 21, productName: "Pizza", qty: 1, price: 12, amount: 12, discAmount: 1.2, discPer: 10, vatValue: 10 },
    { mapId: 2, productId: 22, productName: "Juice", qty: 2, price: 4, amount: 8, discAmount: 0.8, discPer: 10, vatValue: 10 },
  ],
  modifiersData: [
    { mapId: 1, modifierId: 31, modifierName: "Olives", price: 0.5, qty: 2, typeId: 2, status: "extras" },
    { mapId: 1, modifierId: 31, modifierName: "Olives", price: 0.5, qty: 2, typeId: 2, status: "extras" }, // SQL-join duplicate
  ],
};

const ORDERS = [
  ["dine-in with an item discount", DINE_IN_ITEM_DISCOUNT],
  ["delivery with a bill discount", DELIVERY_BILL_DISCOUNT],
] as const;

const show = (el: ReturnType<typeof createElement>) =>
  render(createElement(Provider, { store, children: createElement(MemoryRouter, null, el) }));

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  localStorage.setItem("decimalPart", "3");
  localStorage.setItem("posConfigs", JSON.stringify({ configs: { priceView: "Exclusive", printPrice: "Exclusive", discCalc: "Exclusive", vatStatus: true } }));
  vi.clearAllMocks();
});
afterEach(() => cleanup());

describe.each(ORDERS)("saved order windows — %s", (_name, order) => {
  const orderId = order.masterData[0].orderId;

  it("Recall details", async () => {
    mock(orderApi.getOrderDetails).mockResolvedValue({ isSuccess: true, data: structuredClone(order) });
    show(createElement(PosRecallDetailsModal, { isOpen: true, onClose: () => {}, orderId }));
    await screen.findByText("Grand Total");
    expect(document.body.innerHTML).toMatchSnapshot();
  });

  it("Settled details", async () => {
    mock(settledOrdersApi.getSettledOrderDetails).mockResolvedValue({
      isSuccess: true,
      data: { ...structuredClone(order), masterData: [{ ...order.masterData[0], voucherNo: "S-55" }] },
    });
    mock(orderApi.getOrderDetails).mockResolvedValue({ isSuccess: true, data: structuredClone(order) });
    show(createElement(PosSettledDetailsModal, { isOpen: true, onClose: () => {}, orderId, orderSummary: { saleId: 55 } }));
    await screen.findByText("Grand Total");
    expect(document.body.innerHTML).toMatchSnapshot();
  });
});
