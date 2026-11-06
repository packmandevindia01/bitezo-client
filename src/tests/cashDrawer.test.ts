import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { CASH_DRAWER_WAIT_MS, hasCashPayment, openDrawerIfCash } from "../features/pos/utils/cashDrawer";
import { isCashDrawerEnabled, POS_CONFIGS_STORAGE_KEY } from "../features/pos/services/posConfigApi";

const openCashDrawer = vi.fn();
vi.mock("../features/pos/services/qzService", () => ({
  openCashDrawer: (printer?: string) => openCashDrawer(printer),
}));

const TENDERS = [
  { id: 1, label: "Cash" },
  { id: 2, label: "Card" },
  { id: 3, label: "Credit" },
  { id: 7, label: "Benefit" },
  { id: 9, label: "Talabat" },
];
const CASH = { paymodeId: 1, amount: 5 };
const CARD = { paymodeId: 2, amount: 5 };

const setDrawerConfig = (value?: string) =>
  localStorage.setItem(POS_CONFIGS_STORAGE_KEY, JSON.stringify({ configs: { cashdrawer: value } }));

describe("which payments open the drawer", () => {
  it.each([
    ["Cash", [CASH], true],
    ["Card", [CARD], false],
    ["Credit", [{ paymodeId: 3, amount: 5 }], false],
    ["Benefit", [{ paymodeId: 7, amount: 5 }], false],
    ["Talabat", [{ paymodeId: 9, amount: 5 }], false],
    ["Cash + Card", [CASH, CARD], true],
    ["Cash for 0 (100% discount)", [{ paymodeId: 1, amount: 0 }], false],
    ["Card + Cash for 0", [CARD, { paymodeId: 1, amount: 0 }], false],
    ["no payments", [], false],
  ])("%s", (_name, payments, expected) => {
    expect(hasCashPayment(payments, TENDERS)).toBe(expected);
  });

  it("goes by the tender name, not the id, when the tender is known", () => {
    expect(hasCashPayment([{ paymodeId: 1, amount: 5 }], [{ id: 1, label: "Card" }])).toBe(false);
    expect(hasCashPayment([{ paymodeId: 5, amount: 5 }], [{ id: 5, label: "CASH" }])).toBe(true);
  });

  it("uses the payment's own name when there is no tender list (bulk settlement)", () => {
    expect(hasCashPayment([{ paymodeId: 4, amount: 5, label: "Cash" }])).toBe(true);
    expect(hasCashPayment([{ paymodeId: 4, amount: 5, label: "Card" }])).toBe(false);
  });

  it("treats a nameless id 1 as cash, the POS default", () => {
    expect(hasCashPayment([{ paymodeId: 1, amount: 5 }])).toBe(true);
    expect(hasCashPayment([{ paymodeId: 2, amount: 5 }])).toBe(false);
  });
});

describe("POS config setting", () => {
  beforeEach(() => localStorage.clear());

  it("is on only for Enable: old values and no setting stay off", () => {
    expect(isCashDrawerEnabled()).toBe(false);
    for (const [value, expected] of [["Enable", true], ["Disable", false], ["Default", false], ["Normal", false]] as const) {
      setDrawerConfig(value);
      expect(isCashDrawerEnabled()).toBe(expected);
    }
  });

  it("broken saved config counts as off", () => {
    localStorage.setItem(POS_CONFIGS_STORAGE_KEY, "{oops");
    expect(isCashDrawerEnabled()).toBe(false);
  });
});

describe("opening the drawer", () => {
  const onFailed = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    openCashDrawer.mockResolvedValue(undefined);
  });
  afterEach(() => vi.useRealTimers());

  it("opens on cash when enabled", async () => {
    setDrawerConfig("Enable");
    await openDrawerIfCash([CASH], TENDERS, onFailed);
    expect(openCashDrawer).toHaveBeenCalledTimes(1);
    expect(onFailed).not.toHaveBeenCalled();
  });

  it("stays shut when the setting is off, even on cash", async () => {
    setDrawerConfig("Disable");
    await openDrawerIfCash([CASH], TENDERS, onFailed);
    expect(openCashDrawer).not.toHaveBeenCalled();
  });

  it("stays shut on card when enabled", async () => {
    setDrawerConfig("Enable");
    await openDrawerIfCash([CARD], TENDERS, onFailed);
    expect(openCashDrawer).not.toHaveBeenCalled();
  });

  it("uses the bill printer, skipping No Printer", async () => {
    setDrawerConfig("Enable");
    localStorage.setItem("cachedBillPrinter", "POS-80C");
    await openDrawerIfCash([CASH], TENDERS, onFailed);
    expect(openCashDrawer).toHaveBeenLastCalledWith("POS-80C");

    localStorage.setItem("cachedBillPrinter", "No Printer");
    localStorage.setItem("cachedBillPrinterIp", "192.168.1.41");
    await openDrawerIfCash([CASH], TENDERS, onFailed);
    expect(openCashDrawer).toHaveBeenLastCalledWith("192.168.1.41");
  });

  it("a failure is reported and does not throw (the sale is already saved)", async () => {
    setDrawerConfig("Enable");
    openCashDrawer.mockRejectedValue(new Error("printer offline"));
    await expect(openDrawerIfCash([CASH], TENDERS, onFailed)).resolves.toBeUndefined();
    expect(onFailed).toHaveBeenCalledWith("printer offline");
  });

  it("a printer that never answers stops holding up the settlement", async () => {
    setDrawerConfig("Enable");
    vi.useFakeTimers();
    openCashDrawer.mockReturnValue(new Promise(() => {}));
    const done = openDrawerIfCash([CASH], TENDERS, onFailed);
    await vi.advanceTimersByTimeAsync(CASH_DRAWER_WAIT_MS);
    await done;
    expect(onFailed).toHaveBeenCalledWith("no response from the printer");
  });
});
