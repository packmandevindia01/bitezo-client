// @vitest-environment jsdom
/**
 * Safety net for splitting PosCashierSessionModal (2026-11-13). Drives the open / close day and shift window
 * through its main paths and records, per path: the window HTML, every server call with its payload, the toasts,
 * the device storage written and every page printed. A refactor must not change these snapshots unless intended.
 */
import { createElement } from "react";
import { render, screen, fireEvent, waitFor, cleanup, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { PosCashierSessionModal } from "../features/pos/terminal/components/modals/system/PosCashierSessionModal";
import { cashierLogService } from "../features/pos/cashier/services/cashierLogService";
import { bulkSettlementApi } from "../features/pos/bulkSettlement/services/bulkSettlementApi";

// Dates in the snapshots are sent as UTC from a fixed local time: pin the zone so they match on any machine.
(globalThis as unknown as { process: { env: Record<string, string> } }).process.env.TZ = "Asia/Kolkata";
vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });
const log: unknown[] = [];
const toasts: unknown[] = [];
const printed: string[] = [];

vi.mock("../features/pos/cashier/services/cashierLogService", () => ({
  cashierLogService: {
    checkStatus: vi.fn(),
    openDay: vi.fn(async (p: unknown) => { log.push(["openDay", p]); return { data: { dayId: 5, shiftId: 9, transDate: "2026-11-13" } }; }),
    openShift: vi.fn(async (p: unknown) => { log.push(["openShift", p]); return { data: { shiftId: 10 } }; }),
    closeShift: vi.fn(async (p: unknown) => { log.push(["closeShift", p]); return {}; }),
    closeDay: vi.fn(async (p: unknown) => { log.push(["closeDay", p]); return {}; }),
    getShiftEndReport: vi.fn(async (d: number, s: number) => { log.push(["getShiftEndReport", d, s]); return { title: "shift" }; }),
    getDayEndReport: vi.fn(async (d: number) => { log.push(["getDayEndReport", d]); return { title: "day" }; }),
  },
}));
vi.mock("../features/pos/bulkSettlement/services/bulkSettlementApi", () => ({
  bulkSettlementApi: {
    checkPendingOrderStatus: vi.fn(),
    submitDaySettlement: vi.fn(async (p: unknown) => { log.push(["submitDaySettlement", p]); return {}; }),
  },
}));
vi.mock("../features/general/denomination/services/denominationService", () => ({
  fetchDenominations: async () => [{ id: 1, name: "20", value: 20 }, { id: 2, name: "5", value: 5 }, { id: 3, name: "0.5", value: 0.5 }],
}));
vi.mock("../features/pos/utils/endReportTemplate", () => ({
  generateEndReportHtml: async (data: unknown, kind: string) => `<${kind}>${JSON.stringify(data)}</${kind}>`,
}));
vi.mock("../features/pos/services/qzService", () => ({
  printHtmlReceipt: async (html: string, printer?: string) => { printed.push(`${printer}|${html}`); },
}));
vi.mock("../app/providers/useToast", () => ({ useToast: () => ({ showToast: (...a: unknown[]) => toasts.push(a) }) }));
vi.mock("../hooks/useCurrency", () => ({ useCurrency: () => ({ formatAmount: (n: number) => Number(n).toFixed(3), decimalPart: 3 }) }));
vi.mock("../features/pos/terminal/components/modals/system/PosPreSessionMoreModal", () => ({
  PosPreSessionMoreModal: ({ isOpen }: { isOpen: boolean }) => (isOpen ? createElement("div", null, "stub-more") : null),
}));
vi.mock("@shared/config/device", async (orig) => ({ ...(await orig<object>()), getSystemBranchId: () => 2 }));

const mock = (fn: unknown) => fn as ReturnType<typeof vi.fn>;
const STORAGE_KEYS = ["activeShift", "transDate", "authorizedEmployeeId", "accessToken", "refreshToken"];
const storage = () => Object.fromEntries(STORAGE_KEYS.map((k) => [k, localStorage.getItem(k)]));
const record = () => ({ calls: log.slice(), toasts: toasts.slice(), printed: printed.slice(), storage: storage() });

const status = (o: Partial<{ isDayClosed: boolean; isShiftClosed: boolean }>) => ({
  cashierInStatus: { dayId: 5, shiftId: 9, userId: 3, transDate: "2026-11-12T00:00:00", isDayClosed: false, isShiftClosed: false, ...o },
});

const open = async (st: ReturnType<typeof status>, initialTab?: "SHIFT" | "DAY") => {
  mock(cashierLogService.checkStatus).mockResolvedValue(st);
  const onClose = vi.fn();
  const onSessionReady = vi.fn();
  const qc = new QueryClient();
  const view = render(
    createElement(QueryClientProvider, { client: qc },
      createElement(PosCashierSessionModal, { isOpen: true, onClose, onSessionReady, initialTab })),
  );
  await waitFor(() => expect(screen.queryByText("Loading session status...")).toBeNull());
  await waitFor(() => expect(cashierLogService.checkStatus).toHaveBeenCalled());
  return { onClose, onSessionReady, view };
};

const press = (...keys: string[]) => keys.forEach((k) => fireEvent.click(screen.getAllByRole("button", { name: k })[0]));
const click = (name: string | RegExp) => fireEvent.click(screen.getByRole("button", { name }));
/** Page HTML without volatile ids. */
const html = () => document.body.innerHTML.replace(/ id="[^"]*"/g, "").replace(/ aria-(labelledby|describedby|controls)="[^"]*"/g, "");

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-13T10:15:00"));
  log.length = 0; toasts.length = 0; printed.length = 0;
  localStorage.clear();
  localStorage.setItem("userId", "3");
  localStorage.setItem("systemCounterId", "4");
  localStorage.setItem("cachedBillPrinter", "POS-80C");
  localStorage.setItem("accessToken", "t");
  localStorage.setItem("refreshToken", "r");
  mock(bulkSettlementApi.checkPendingOrderStatus).mockReset();
});
afterEach(() => { cleanup(); vi.useRealTimers(); });

describe("PosCashierSessionModal safety net", () => {
  it("opens the business day with a keypad amount", async () => {
    const { onClose, onSessionReady } = await open(status({ isDayClosed: true }));
    expect(html()).toMatchSnapshot("open day screen");
    press("1", "2", "5", ".", "5");
    click("Confirm & Open Day");
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(onSessionReady).toHaveBeenCalled();
    expect(record()).toMatchSnapshot("open day");
  });

  it("opens a shift counted in denominations", async () => {
    const { onClose } = await open(status({ isShiftClosed: true }));
    click(/Switch Denomination/);
    expect(html()).toMatchSnapshot("denominations screen");
    const inputs = screen.getAllByPlaceholderText("0");
    fireEvent.change(inputs[0], { target: { value: "3" } });
    fireEvent.focus(inputs[2]);
    press("4", "Backspace", "7");
    click("Confirm & Open Shift");
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(record()).toMatchSnapshot("open shift");
  });

  it("closes the shift after the logout question and prints Shift End", async () => {
    await open(status({}));
    expect(html()).toMatchSnapshot("close shift screen");
    press("4", "0");
    click("Confirm Close Shift");
    click("Yes");
    await screen.findByText("Do you want to print Shift End?");
    click("Print");
    await waitFor(() => expect(printed.length).toBe(1));
    await waitFor(() => expect(toasts.some((t) => String((t as unknown[])[0]).startsWith("Shift Closed"))).toBe(true));
    expect(record()).toMatchSnapshot("close shift");
  });

  it("closes shift and day together, settles pending orders, skips Shift End and prints Day End", async () => {
    mock(bulkSettlementApi.checkPendingOrderStatus).mockResolvedValue({ hasPendingOrder: true });
    localStorage.setItem("systemSeriesId", "7");
    localStorage.setItem("systemPrefix", "INV");
    await open(status({}), "DAY");
    expect(html()).toMatchSnapshot("close day screen");
    press("9");
    click("Confirm Close Day");
    click("Yes, Close Both");
    await screen.findByText("Unsettled Orders Detected");
    expect(html()).toMatchSnapshot("pending orders window");
    click(/Settle All & Close Day/);
    await screen.findByText("Do you want to print Shift End?");
    click("Skip");
    await screen.findByText("Do you want to print Day End?");
    click("Print");
    await waitFor(() => expect(printed.length).toBe(1));
    await waitFor(() => expect(toasts.some((t) => String((t as unknown[])[0]).startsWith("Business Day Closed"))).toBe(true));
    const rec = record();
    // settlement timestamps come from the real clock: only check they are there
    expect(rec.calls.find((c) => (c as unknown[])[0] === "submitDaySettlement")).toBeTruthy();
    expect(rec).toMatchSnapshot("close shift and day");
  });

  it("closes the day (shift already closed) after a failed pending check: Try Again, then Close Day Anyway", async () => {
    mock(bulkSettlementApi.checkPendingOrderStatus).mockRejectedValue(new Error("offline"));
    await open(status({ isShiftClosed: true }), "DAY");
    click(/Switch Denomination/);
    fireEvent.change(screen.getAllByPlaceholderText("0")[1], { target: { value: "2" } });
    click("Confirm Close Day");
    await screen.findByText("Could Not Check Pending Orders");
    click("Try Again");
    await waitFor(() => expect(bulkSettlementApi.checkPendingOrderStatus).toHaveBeenCalledTimes(2));
    await screen.findByText("Could Not Check Pending Orders");
    click("Close Day Anyway");
    await screen.findByText("Do you want to print Day End?");
    click("Skip");
    await waitFor(() => expect(toasts.some((t) => String((t as unknown[])[0]).startsWith("Business Day Closed"))).toBe(true));
    expect(record()).toMatchSnapshot("close day after failed check");
  });

  it("asks before leaving an open-day window, and shows a server error", async () => {
    mock(cashierLogService.openShift).mockRejectedValueOnce({ response: { status: 400, data: { message: "Shift already open" } } });
    await open(status({ isShiftClosed: true }));
    click("Cancel");
    expect(screen.getByText("Logout from POS")).toBeTruthy();
    click("No");
    click("More");
    expect(screen.getByText("stub-more")).toBeTruthy();
    press("5");
    await act(async () => { click("Confirm & Open Shift"); });
    await waitFor(() => expect(toasts.length).toBe(1));
    expect(record()).toMatchSnapshot("open shift error");
  });
});
