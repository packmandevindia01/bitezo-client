// @vitest-environment jsdom
/** Dine-in settle prints against POS config, on the rendered screen. Recall preview and payment screens are stubs. */
import { createElement } from "react";
import { Provider } from "react-redux";
import { render, screen, fireEvent, waitFor, cleanup, within } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { store } from "../app/store";
import { DineInTableOrdersModal } from "../features/pos/terminal/components/modals/dining/DineInTableOrdersModal";
import { saveSettlePrintConfig } from "../features/pos/utils/settlePrintConfig";
import { orderApi } from "../features/pos/services/orderApi";
import { dineInApi } from "../features/pos/services/dineInApi";
import { salesInvoiceApi } from "../features/pos/services/salesInvoiceApi";
import { cacheProducts } from "../features/pos/terminal/store/posSlice";

vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });
const mock = (fn: unknown) => fn as ReturnType<typeof vi.fn>;
const printed: string[] = [];
let drawerOpens = 0;
const toasts: string[] = [];

vi.mock("react-router-dom", async (orig) => ({ ...(await orig<object>()), useNavigate: () => vi.fn() }));
vi.mock("../features/pos/services/qzService", () => ({
  printHtmlReceipt: async (html: string) => { printed.push(html); },
  openCashDrawer: async () => { drawerOpens++; },
}));
vi.mock("../features/pos/services/printerSettingsApi", () => ({
  printerSettingsApi: { getGeneral: async () => ({ data: { billPrinter: "POS-80C" } }), getPrinterData: async () => ({ isSuccess: false }) },
}));
vi.mock("../features/pos/services/orderApi", () => ({ orderApi: { getOrderDetails: vi.fn() } }));
vi.mock("../features/pos/services/dineInApi", () => ({ dineInApi: { getTableOrders: vi.fn() } }));
vi.mock("../features/pos/services/salesInvoiceApi", () => ({ salesInvoiceApi: { createSalesInvoice: vi.fn() } }));
vi.mock("../features/pos/services/menuApi", async (orig) => ({ ...(await orig<object>()), menuApi: { getAlternatives: async () => [] } }));
vi.mock("../features/inventory/branches/services/branchApi", () => ({ branchApi: { getBranchPrintDesign: async () => null } }));
vi.mock("../features/general/employee/services/employeeService", () => ({
  getEmployeeNames: async () => [], getEmployeeById: async () => null, employeeService: {},
}));
vi.mock("../app/providers/useToast", () => ({ useToast: () => ({ showToast: (m: string) => { toasts.push(m); } }) }));
vi.mock("../features/pos/cashier", () => ({ useCashierLog: () => ({ status: { dayId: 1, shiftId: 1, userId: 1, transDate: "2026-11-06" } }) }));
vi.mock("../features/pos/terminal/hooks/usePosQueries", () => ({ usePosMasterData: () => ({ data: null }) }));
vi.mock("../features/pos/terminal/hooks/usePosRecall", () => ({ usePosRecall: () => ({ orders: [], fetchOrders: vi.fn() }) }));
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
// Recall preview and payment screens are stubs with one button each: this test is about what settling prints.
vi.mock("../features/pos/terminal/components/modals/order/PosRecallDetailsModal", () => ({
  PosRecallDetailsModal: ({ isOpen, onSettleRequest }: { isOpen: boolean; onSettleRequest: () => void }) =>
    isOpen ? createElement("button", { onClick: onSettleRequest }, "stub-settle") : null,
}));
vi.mock("../features/pos/terminal/components/modals/payment/PosMultiPayModal", () => ({
  PosMultiPayModal: ({ onSubmit }: { onSubmit: (p: unknown[], c: number) => void }) =>
    createElement("div", null,
      createElement("button", { onClick: () => onSubmit([{ paymodeId: 1, label: "Cash", amount: 11 }], 0) }, "stub-pay-cash"),
      createElement("button", { onClick: () => onSubmit([{ paymodeId: 2, label: "Card", amount: 11 }], 0) }, "stub-pay-card")),
}));

const MASTER = {
  orderId: 3, orderNo: 3, ticketNo: 3, orderType: "DineIn", orderTypeId: 1, sectionId: 7, sectionName: "Hall", tableId: 9, tableNo: "T9",
  deliveryCharge: 0, discAmount: 0, serviceCharge: 0, levy: 0, vatExclAmount: 10, vatAmount: 1, netAmount: 11, employeeId: 1, employeeName: "Ali", customerId: 1,
};
const ORDER = {
  masterData: MASTER,
  detailsData: [{ qty: 1, productId: 1, productName: "Burger", price: 10, amount: 10, discAmount: 0, serviceCharge: 0, levy: 0, vatAmount: 1, vatValue: 10, mapId: 1, netAmount: 11, unitId: 1 }],
  modifiersData: [],
};

const openAndPay = async (button: "stub-pay-cash" | "stub-pay-card") => {
  const { container } = render(createElement(Provider, {
    store,
    children: createElement(DineInTableOrdersModal, { isOpen: true, table: { tableId: 9, tableName: "T9" } as never, sectionId: 7, onClose: vi.fn() }),
  }));
  const row = await waitFor(() => {
    const el = document.body.querySelector('[role="button"][tabindex="0"]');
    if (!el) throw new Error("no row");
    return el as HTMLElement;
  });
  fireEvent.click(row);
  fireEvent.click(await screen.findByText("stub-settle"));
  fireEvent.click(await screen.findByText(button));
  return container;
};

const saved = () => waitFor(() => expect(salesInvoiceApi.createSalesInvoice).toHaveBeenCalledTimes(1));
const receipts = () => printed.filter((h) => /SIMPLIFIED/.test(h));
const finished = () => waitFor(() => expect(toasts.some((t) => /settled successfully/.test(t))).toBe(true));

beforeEach(() => {
  localStorage.clear();
  printed.length = 0;
  toasts.length = 0;
  drawerOpens = 0;
  vi.clearAllMocks();
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  localStorage.setItem("posConfigs", JSON.stringify({ configs: { vatStatus: true, priceView: "Exclusive", cashdrawer: "Enable" } }));
  localStorage.setItem("cachedBillPrinter", "POS-80C");
  store.dispatch(cacheProducts([{ id: 1, name: "Burger", price: 10, vatValue: 10, isIncl: false, categoryId: 1 }] as never));
  mock(dineInApi.getTableOrders).mockResolvedValue({ isSuccess: true, data: { masterData: [MASTER] } });
  mock(orderApi.getOrderDetails).mockResolvedValue({ isSuccess: true, data: ORDER });
  mock(salesInvoiceApi.createSalesInvoice).mockResolvedValue({ id: 105672, voucherNo: "77" });
});
afterEach(() => cleanup());

describe("dine-in settle", () => {
  it("print directly, cash: receipt, drawer, barcode is the sale id", async () => {
    await openAndPay("stub-pay-cash");
    await saved();
    await finished();
    expect(receipts().length).toBe(1);
    expect(receipts()[0]).toContain("105672");
    expect(drawerOpens).toBe(1);
  });

  it("Bill Copies 3: three receipts from one settlement", async () => {
    localStorage.setItem("posConfigs", JSON.stringify({ configs: { billCopies: 3 } }));
    await openAndPay("stub-pay-card");
    await saved();
    await finished();
    expect(receipts()).toHaveLength(3);
  });

  it("print directly, card: receipt, no drawer", async () => {
    await openAndPay("stub-pay-card");
    await saved();
    await finished();
    expect(receipts().length).toBe(1);
    expect(drawerOpens).toBe(0);
  });

  it("disabled, cash: no receipt, drawer still opens, no question", async () => {
    saveSettlePrintConfig({ enabled: false, askBeforePrint: true });
    await openAndPay("stub-pay-cash");
    await saved();
    await finished();
    expect(receipts().length).toBe(0);
    expect(drawerOpens).toBe(1);
    expect(screen.queryByText("Do you want to print the receipt?")).toBeNull();
  });

  it.each([["Yes", 1], ["No", 0]] as const)("asks first, answer %s", async (answer, count) => {
    saveSettlePrintConfig({ enabled: true, askBeforePrint: true });
    await openAndPay("stub-pay-cash");
    await saved();
    const question = await screen.findByText("Do you want to print the receipt?");
    expect(receipts().length).toBe(0);
    expect(screen.queryByText("stub-pay-cash")).toBeNull(); // payment popup closed behind the question
    const dialog = question.parentElement as HTMLElement;
    fireEvent.click(within(dialog).getByRole("button", { name: answer }));
    await finished();
    expect(receipts().length).toBe(count);
    expect(drawerOpens).toBe(1);
  });
});
