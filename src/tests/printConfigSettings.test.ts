// @vitest-environment jsdom
/** POS Configuration, KOT & Printing tab: Bill Copies, KOT Print (Settle), and settings changed on another terminal. */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { forEachBillCopy, getBillCopies, isKotPrintSettleEnabled } from "../features/pos/utils/settlePrintConfig";
import { printKotOnSettle } from "../features/pos/terminal/utils/settleKot";
import { getRuntimePosConfig } from "../features/pos/terminal/hooks/system/useTerminalInit";
import { isKotArabicEnabled, isOtherKitchenItemEnabled } from "../features/pos/utils/alternativeHelpers";
import { posConfigApi } from "../features/pos/services/posConfigApi";
import { generateKotHtml, kotNumber } from "../features/pos/utils/kotTemplate";
import { generateGuestPrintHtml } from "../features/pos/utils/guestPrintTemplate";
import { generateBillMarkup } from "../features/pos/utils/escPosGenerator";

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

describe("Order No and Ticket No on the KOT", () => {
  const row = async (over: Record<string, unknown> = {}) => {
    const html = await generateKotHtml([item({})], { ...printData, orderNo: "21", ticketNo: "21", ...over } as never);
    const at = html.indexOf("Order No");
    return html.slice(html.lastIndexOf("<table", at), html.indexOf("</table>", at));
  };

  it.each([[1, "#1"], ["21", "#21"], [321, "#321"], [9001, "#9001"], ["21, 22", "#21, 22"], [0, ""], [undefined, ""], [null, ""]])("%s prints as %s", (value, shown) => {
    expect(kotNumber(value)).toBe(shown);
  });

  it("labels are normal weight, numbers bold", async () => {
    const html = await row();
    expect(html).toMatch(/font-weight: normal;">Order No/);
    expect(html).toMatch(/font-weight: normal;">Ticket No/);
    expect(html.match(/font-size: 18px; font-weight: bold;[^"]*">#21</g)).toHaveLength(2);
  });

  it("Ticket No starts in the second column, not at the far right edge", async () => {
    const html = await row();
    expect(html).not.toContain("text-align: right");
    expect(html.match(/width: 50%; text-align: left/g)).toHaveLength(2);
  });

  it("order and ticket keep their own numbers", async () => {
    const t = text(await row({ orderNo: "7", ticketNo: "1234" }));
    expect(t).toContain("#7");
    expect(t).not.toContain("#007");
    expect(t).toContain("#1234");
  });
});

describe("Guest print customer and heading line", () => {
  const bill = (over: Record<string, unknown> = {}) =>
    generateGuestPrintHtml([item({})], { ...printData, orderType: "DineIn", section: "In", table: "T1", netAmount: 10, showCompanyHeader: false, ...over } as never);
  const customerRows = (html: string) => (text(html).match(/Customer/g) ?? []).length;
  const headingLine = "table.items-table th { padding-bottom: 9px; border-bottom: 1px dashed #000000; }";

  it("prints the customer, escaped, in the header", async () => {
    expect(text(await bill({ customerName: "CASH CUSTOMER" }))).toMatch(/Customer :(?:&nbsp;)? ?CASH CUSTOMER/);
    expect(await bill({ customerName: "A<b>" })).toContain("A&lt;b&gt;");
  });

  it.each([["guest", {}], ["settle", { invoiceNo: "84", isSettlement: true }], ["settle with no invoice number yet", { isSettlement: true }]])("%s bill always has a customer, CASH CUSTOMER when the order has none", async (_name, over) => {
    expect(text(await bill(over))).toMatch(/Customer :(?:&nbsp;)? ?CASH CUSTOMER/);
    expect(text(await bill({ ...over, customerName: "Ali" }))).toMatch(/Customer :(?:&nbsp;)? ?Ali/);
  });

  it.each([["TakeOut"], ["DineIn"]])("%s settle bill names the customer once", async (orderType) => {
    expect(customerRows(await bill({ orderType, invoiceNo: "84", isSettlement: true, customerName: "Ali" }))).toBe(1);
  });

  it("thermal format: guest and settle name the customer, packager does not", () => {
    const markup = (over: Record<string, unknown>) => generateBillMarkup({ cartDetails: [item({})], data: { ...printData, orderType: "TakeOut", netAmount: 10, customerName: "Ali", ...over } as never });
    expect(markup({})).toContain("Customer: Ali");
    expect(markup({ invoiceNo: "84", isSettlement: true })).toContain("Customer: Ali");
    expect(markup({ isPackager: true })).not.toContain("Customer: Ali");
  });

  it("a delivery guest bill prints the customer once, in Delivery Details", async () => {
    expect(customerRows(await bill({ orderType: "Delivery", customerName: "Ali" }))).toBe(1);
  });

  it("adds the line under the item headings on guest prints only", async () => {
    expect(await bill()).toContain(headingLine);
    expect(await bill({ invoiceNo: "84", isSettlement: true })).not.toContain(headingLine);
    expect(await bill({ isPackager: true })).not.toContain(headingLine);
  });

  it.each([["guest", {}], ["settle", { invoiceNo: "84", saleId: 84, isSettlement: true }]])("delivery %s bill: the Delivery Details block ends with its own line before the barcode", async (_name, over) => {
    const html = await bill({ orderType: "Delivery", customerName: "Ali", contactNo: "33445566", ...over });
    const block = html.slice(html.indexOf("DELIVERY DETAILS"), html.indexOf('<div class="barcode-container">'));
    expect(block).toContain('margin: 9px 0 1px 0;');
    expect(block.trimEnd().endsWith('<div class="dashed-hr"></div>')).toBe(true);
  });

  it("a dine-in bill has no Delivery Details block or extra line", async () => {
    const html = await bill({ customerName: "Ali" });
    expect(html).not.toContain("DELIVERY DETAILS");
  });

  it("packager prints get no header Customer row", async () => {
    expect(customerRows(await bill({ isPackager: true, customerName: "Ali" }))).toBe(0);
  });

  it("a delivery settle bill prints the customer once, in Delivery Details", async () => {
    expect(customerRows(await bill({ orderType: "Delivery", invoiceNo: "84", isSettlement: true, customerName: "Ali" }))).toBe(1);
  });
});

describe("Waiter label on the prints", () => {
  const data = { ...printData, waiter: "Ali", netAmount: 10, showCompanyHeader: false };

  it.each([
    ["dine in guest", { orderType: "DineIn" }],
    ["take out guest", { orderType: "TakeOut" }],
    ["delivery guest", { orderType: "Delivery" }],
    ["settle", { orderType: "TakeOut", invoiceNo: "84", isSettlement: true }],
    ["packager", { orderType: "TakeOut", isPackager: true }],
  ])("%s bill says Waiter", async (_name, over) => {
    const t = text(await generateGuestPrintHtml([item({})], { ...data, ...over } as never));
    expect(t).toMatch(/Waiter :(?:&nbsp;)? ?Ali/);
    expect(t).not.toContain("Employee");
  });

  it.each(["DINE IN", "TakeOut", "DELIVERY"])("%s KOT says Waiter", async (orderType) => {
    const t = text(await generateKotHtml([item({})], { ...data, orderType, section: "In", table: "T1" } as never));
    expect(t).toMatch(/Waiter : Ali/);
    expect(t).not.toContain("Employee");
  });

  it("the Arabic label is the waiter word too", async () => {
    const html = await generateGuestPrintHtml([item({})], { ...data, orderType: "TakeOut", billArabic: true } as never);
    expect(html).toContain("النادل");
    expect(html).not.toContain("الموظف");
  });
});

describe("KOT header layout", () => {
  const dineIn = (over: Record<string, unknown> = {}) =>
    generateKotHtml([item({})], { ...printData, orderType: "DINE IN", section: "In", table: "T1", waiter: "cashier", counter: "Main", date: "04/06/2026", ...over } as never);

  it("no Customer row in the header, even when the order has a customer", async () => {
    expect(text(await dineIn({ customerName: "CASH CUSTOMER" }))).not.toMatch(/Customer|CASH CUSTOMER/);
    expect(text(await dineIn({ orderType: "TakeOut", customerName: "CASH CUSTOMER" }))).not.toMatch(/Customer|CASH CUSTOMER/);
  });

  it("a delivery KOT still shows the customer in its delivery details", async () => {
    expect(text(await dineIn({ orderType: "DELIVERY", customerName: "Ali" }))).toMatch(/DELIVERY DETAILS[\s\S]*Customer : Ali/);
  });

  it("prints in the sample's order and labels", async () => {
    const t = text(await dineIn({ orderNo: "10", ticketNo: "10" }));
    expect(t).toMatch(/DINE IN \*\*\*KOT\*\*\* Date .*Time .*Waiter : cashier Counter : Main Section : In Table : T1 Order No (?:&nbsp;)+ #10 Ticket No (?:&nbsp;)+ #10 QTY DESCRIPTION AMT/);
    expect(t).not.toMatch(/Date :|Time :|Order No:|Ticket No:/);
  });

  it("no line between ***KOT*** and the Date row, a solid line under the table headings", async () => {
    const html = await dineIn();
    expect(html.slice(html.indexOf("***KOT***"), html.indexOf(">Date<"))).not.toContain("<hr");
    expect(html).toContain("border-bottom: 1px solid #000000;\">");
  });
});

describe("KOT header row gaps", () => {
  const kot = (over: Record<string, unknown> = {}) => generateKotHtml([item({})], { ...printData, orderType: "DINE IN", section: "In", table: "T1", ...over } as never);

  it("Order No keeps enough room above the line: its row must not be squeezed", async () => {
    const html = await kot();
    expect(html.match(/padding: 0; font-size: 11\.5px; line-height: 1\.3;/g)).toHaveLength(2);
    expect(html).toContain('<hr class="solid-line" style="margin: 5px 0 0 0; border-top-width: 1px;" />');
  });

  it("both lines around the headings are the same thickness, and the gap under the headings stays open", async () => {
    const html = await kot();
    expect(html).toMatch(/padding-bottom: 12px !important;/);
    expect(html.slice(html.indexOf("<thead"), html.indexOf("</thead>"))).not.toMatch(/border-bottom: 1\.5px/);
  });
});

describe("Table on the dine in KOT", () => {
  const kot = (over: Record<string, unknown> = {}) =>
    generateKotHtml([item({})], { ...printData, orderType: "DINE IN", section: "Main", table: "T5", ...over } as never);
  const tableRow = (size: number) => new RegExp(`font-weight: normal;">Table[\\s\\S]{0,20}:</span> <span style="font-weight: bold; font-size: ${size}px;[^"]*">T5<`);

  it("normal KOT: label normal, table name bold and larger", async () => {
    expect(await kot()).toMatch(tableRow(14));
  });

  it("master KOT: every Table row has a normal label and a larger bold name", async () => {
    const html = await kot({ isMaster: true, headerTitle: "MASTER KOT" });
    expect(html).toMatch(tableRow(14));
    expect(html).toMatch(tableRow(21));
    expect(html).not.toMatch(/font-weight: bold;">Table/);
  });

  it("the Section row keeps its bold label and normal value", async () => {
    expect(await kot()).toMatch(/font-weight: bold;">Section :<\/span> <span style="font-weight: normal;">Main</);
  });
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
