// @vitest-environment jsdom
/** POS Configuration, KOT & Printing tab: Bill Copies, KOT Print (Settle), and settings changed on another terminal. */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { forEachBillCopy, getBillCopies, isKotPrintSettleEnabled } from "../features/pos/utils/settlePrintConfig";
import { printKotOnSettle } from "../features/pos/terminal/utils/settleKot";
import { getRuntimePosConfig } from "../features/pos/terminal/hooks/system/useTerminalInit";
import { isKotArabicEnabled, isOtherKitchenItemEnabled } from "../features/pos/utils/alternativeHelpers";
import { posConfigApi } from "../features/pos/services/posConfigApi";

const printed = vi.hoisted(() => [] as { html: string; printer?: string }[]);
const printFails = vi.hoisted(() => ({ next: false }));
const device = vi.hoisted(() => ({ branch: 2 }));
vi.mock("@shared/config/device", async (orig) => ({ ...(await orig<object>()), getTerminalBranchId: () => device.branch }));
vi.mock("../features/pos/services/qzService", () => ({
  printHtmlReceipt: async (html: string, printer?: string) => {
    if (printFails.next) { printFails.next = false; throw new Error("offline"); }
    printed.push({ html, printer });
  },
}));
vi.mock("../features/pos/services/printerSettingsApi", () => ({
  printerSettingsApi: { getPrinterData: async () => ({ isSuccess: true, data: { generalPrinter: { kotPrinter: "KITCHEN", billPrinter: "BILL" } } }) },
}));

const setConfigs = (configs: Record<string, unknown>) => localStorage.setItem("posConfigs", JSON.stringify({ configs }));
const text = (html: string) => html.replace(/<style[\s\S]*?<\/style>/g, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
const item = (over: Record<string, unknown>) => ({ uniqueId: "a", productId: 1, quantity: 2, price: 5, product: { id: 1, name: "Burger", price: 5, categoryId: 1 }, ...over }) as never;
const printData = { orderNo: "12", ticketNo: "12", orderType: "TakeOut" };

beforeEach(() => {
  localStorage.clear();
  printed.length = 0;
  printFails.next = false;
  localStorage.setItem("cachedKotPrinter", "KITCHEN");
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("Bill Copies", () => {
  it.each([[1, 1], [3, 3], ["2", 2], [0, 1], [-2, 1], ["", 1], [undefined, 1], ["abc", 1], [2.9, 2]])("%s gives %s", (value, copies) => {
    setConfigs({ billCopies: value });
    expect(getBillCopies()).toBe(copies);
  });

  it("is 1 with no config at all or a broken one", () => {
    expect(getBillCopies()).toBe(1);
    localStorage.setItem("posConfigs", "{broken");
    expect(getBillCopies()).toBe(1);
  });

  it("prints once per copy and stops at a failed print", async () => {
    setConfigs({ billCopies: 3 });
    const print = vi.fn().mockResolvedValue(undefined);
    await forEachBillCopy(print);
    expect(print).toHaveBeenCalledTimes(3);
    const failing = vi.fn().mockRejectedValue(new Error("offline"));
    await expect(forEachBillCopy(failing)).rejects.toThrow("offline");
    expect(failing).toHaveBeenCalledTimes(1);
  });
});

describe("KOT Print (Settle)", () => {
  it.each([["Enable", true], ["Disable", false], [true, true], [false, false], ["true", true], [undefined, false]])("%s is %s", (value, on) => {
    setConfigs({ kotPrintSettle: value });
    expect(isKotPrintSettleEnabled()).toBe(on);
  });

  it("off: the kitchen gets nothing", async () => {
    setConfigs({ kotPrintSettle: "Disable", kotPrint: "Enable" });
    await printKotOnSettle({ cartDetails: [item({})], isEdit: false, printData });
    expect(printed).toHaveLength(0);
  });

  it("new order: the whole cart goes to the kitchen printer", async () => {
    setConfigs({ kotPrintSettle: "Enable", kotPrint: "Enable" });
    await printKotOnSettle({ cartDetails: [item({})], isEdit: false, printData });
    expect(printed).toHaveLength(1);
    expect(printed[0].printer).toBe("KITCHEN");
    const t = text(printed[0].html);
    expect(t).toContain("KOT");
    expect(t).toContain("BURGER");
    expect(t).not.toContain("RE-ORDER");
  });

  it("prints even with Standard KOT Print off", async () => {
    setConfigs({ kotPrintSettle: "Enable", kotPrint: "Disable" });
    await printKotOnSettle({ cartDetails: [item({})], isEdit: false, printData });
    expect(printed).toHaveLength(1);
  });

  it("saved order: only what was added, as RE-ORDER", async () => {
    setConfigs({ kotPrintSettle: "Enable", kotPrint: "Enable" });
    const cartDetails = [
      item({ uniqueId: "a", isExisting: true, originalQty: 2, quantity: 2 }),
      item({ uniqueId: "b", productId: 2, isExisting: true, originalQty: 1, quantity: 3, product: { id: 2, name: "Wrap", price: 5, categoryId: 1 } }),
    ];
    await printKotOnSettle({ cartDetails, isEdit: true, printData });
    const t = text(printed[0].html);
    expect(t).toContain("RE-ORDER");
    expect(t).toContain("WRAP");
    expect(t).not.toContain("BURGER");
  });

  it("saved order with nothing added: no KOT", async () => {
    setConfigs({ kotPrintSettle: "Enable", kotPrint: "Enable" });
    await printKotOnSettle({ cartDetails: [item({ isExisting: true, originalQty: 2 })], isEdit: true, printData });
    expect(printed).toHaveLength(0);
  });

  it("a failed print reaches the caller, which warns without undoing the sale", async () => {
    setConfigs({ kotPrintSettle: "Enable", kotPrint: "Enable" });
    printFails.next = true;
    await expect(printKotOnSettle({ cartDetails: [item({})], isEdit: false, printData })).rejects.toThrow("offline");
  });
});

describe("a change made on another terminal reaches this one when the POS opens", () => {
  const serverSays = (configs: Record<string, unknown>) =>
    vi.spyOn(posConfigApi, "getPosConfig").mockResolvedValue({ isSuccess: true, data: { configs } } as never);

  it("replaces the old per-device values", async () => {
    localStorage.setItem("kotArabic", "Disable");
    localStorage.setItem("masterKot", "Enable");
    localStorage.setItem("otherKitchenItem", "false");
    serverSays({ kotArabic: "Enable", masterKot: "Disable", otherKitchenItem: true });
    await getRuntimePosConfig();
    expect(isKotArabicEnabled()).toBe(true);
    expect(localStorage.getItem("masterKot")).toBe("Disable");
    expect(isOtherKitchenItemEnabled()).toBe(true);
  });

  it("leaves a value alone when the server does not send it", async () => {
    localStorage.setItem("kotHeader", "QTY,DESCRIPTION");
    serverSays({ kotHeader: "" });
    await getRuntimePosConfig();
    expect(localStorage.getItem("kotHeader")).toBe("QTY,DESCRIPTION");
  });
});
