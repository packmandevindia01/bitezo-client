// @vitest-environment jsdom
/** More → OPEN CASH DRAWER on the rendered screen. Only the command to the printer is fake. */
import { createElement } from "react";
import { MemoryRouter } from "react-router-dom";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { PosMoreModal } from "../features/pos/terminal/components/modals/system/PosMoreModal";

const openCashDrawer = vi.fn();
const showToast = vi.fn();
let defaultEmployee = false;

vi.mock("../features/pos/services/qzService", () => ({ openCashDrawer: (printer?: string) => openCashDrawer(printer) }));
vi.mock("../app/providers/useToast", () => ({ useToast: () => ({ showToast }) }));
vi.mock("../features/pos/utils/defaultEmployee", async (orig) => ({
  ...(await orig<object>()),
  isDefaultEmployeeActive: () => defaultEmployee,
}));
vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });

const setDrawer = (value: string) => localStorage.setItem("posConfigs", JSON.stringify({ configs: { cashdrawer: value } }));

const show = () => {
  const onClose = vi.fn();
  const requestAuthorization = vi.fn();
  const noop = () => {};
  render(createElement(MemoryRouter, null, createElement(PosMoreModal, {
    isOpen: true, onClose, requestAuthorization, onCashierOut: noop, onCustomerMaster: noop, onItemComplimentary: noop,
    onBillComplimentary: noop, onSettledOrders: noop, onReport: noop, onVoidOrder: noop,
  })));
  return { onClose, requestAuthorization, tile: screen.getByText("OPEN CASH DRAWER") };
};

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  defaultEmployee = false;
  localStorage.setItem("cachedBillPrinter", "POS-80C");
  openCashDrawer.mockResolvedValue(undefined);
});
afterEach(() => cleanup());

describe("More: Open Cash Drawer", () => {
  it("is on the screen", () => {
    expect(show().tile).toBeTruthy();
  });

  it("asks for an employee PIN, and sends nothing before it", () => {
    setDrawer("Enable");
    const { tile, requestAuthorization } = show();
    fireEvent.click(tile);
    expect(requestAuthorization).toHaveBeenCalledTimes(1);
    expect(openCashDrawer).not.toHaveBeenCalled();
  });

  it("opens on the bill printer after a valid PIN, and closes the popup", async () => {
    setDrawer("Enable");
    const { tile, requestAuthorization, onClose } = show();
    fireEvent.click(tile);
    requestAuthorization.mock.calls[0][0].onAuthorized();
    await waitFor(() => expect(openCashDrawer).toHaveBeenCalledWith("POS-80C"));
    expect(onClose).toHaveBeenCalled();
    await waitFor(() => expect(showToast).toHaveBeenCalledWith("Cash drawer open command sent", "success"));
  });

  it("a default employee skips the PIN", async () => {
    setDrawer("Enable");
    defaultEmployee = true;
    const { tile, requestAuthorization } = show();
    fireEvent.click(tile);
    expect(requestAuthorization).not.toHaveBeenCalled();
    await waitFor(() => expect(openCashDrawer).toHaveBeenCalledTimes(1));
  });

  it.each(["Disable", "Default"])("config %s: sends nothing and says why", async (value) => {
    setDrawer(value);
    defaultEmployee = true;
    fireEvent.click(show().tile);
    await waitFor(() => expect(showToast).toHaveBeenCalledWith("Cash Drawer is turned off in POS config", "warning"));
    expect(openCashDrawer).not.toHaveBeenCalled();
  });

  it("a printer failure is shown to the cashier", async () => {
    setDrawer("Enable");
    defaultEmployee = true;
    openCashDrawer.mockRejectedValue(new Error("printer offline"));
    fireEvent.click(show().tile);
    await waitFor(() => expect(showToast).toHaveBeenCalledWith("The cash drawer did not open: printer offline", "error"));
  });
});
