/**
 * Package (packager) print and master KOT — checked against today's print rules:
 * Print Price, real ticket numbers, "TYPE NAME" modifiers, missed call, footer that adds up,
 * packager header setting, and RE-ORDER printing only what was added.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { calculateOrder } from "../features/pos/terminal/utils/billing";
import { generateKotHtml } from "../features/pos/utils/kotTemplate";
import { generateGuestPrintHtml } from "../features/pos/utils/guestPrintTemplate";
import { executePackagerPrint } from "../features/pos/utils/printerRouting";
import { buildReorderItems } from "../features/pos/terminal/utils/reorderItems";

type GuestArgs = Parameters<typeof generateGuestPrintHtml>;
type KotArgs = Parameters<typeof generateKotHtml>;

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem("posConfigs", JSON.stringify({ configs: { vatStatus: true, serviceCharges: 10, levy: 5 } }));
  localStorage.setItem("decimalPart", "3");
  localStorage.setItem("kotArabic", "Disable");
  localStorage.setItem("billArabic", "Disable");
});

const text = (html: string) =>
  html.replace(/<style[\s\S]*?<\/style>/g, "").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ");
const fils = (v: number) => Math.round(v * 1000);

const cart = (orderType = "Delivery", orderTypeId = 4) =>
  calculateOrder(
    [
      { uniqueId: "a", productId: 9, quantity: 2, price: 12.705, isIncl: true,
        product: { id: 9, name: "ABCD", price: 12.705, vatValue: 10, isIncl: true },
        modifiers: [{ id: 5, name: "TEST1", qty: 1, typeId: 3, typeName: "TEST" }],
        extras: [{ id: 1, name: "CHEESE", price: 1.2705, qty: 1, typeId: 2 }] },
      { uniqueId: "b", productId: 6, quantity: 3, price: 3.333, isIncl: false,
        product: { id: 6, name: "DEMO", price: 3.333, vatValue: 10, isIncl: false } },
    ],
    { orderType, orderTypeId }
  ).lines;

const common = { orderNo: "310", ticketNo: "57", waiter: "emp1", counter: "Main", orderType: "Delivery", orderTypeId: 4,
  contactNo: "33445566", customerName: "Ali", missedCall: true };

describe("package (packager) print", () => {
  it("title PACKAGER, real ticket no, modifier label, missed call, footer adds up", async () => {
    const t = text(await generateGuestPrintHtml(cart() as unknown as GuestArgs[0],
      { ...common, isPackager: true, printPrice: "Inclusive", deliveryCharge: 1.5, showCompanyHeader: true } as unknown as GuestArgs[1]));
    expect(t).toMatch(/PACKAGER/);
    expect(t).toMatch(/Ticket No : #57/);
    expect(t).toContain("* TEST TEST1");
    expect(t).toMatch(/Missed Call : YES/);
    const num = (label: string) => Number(new RegExp(`${label}\\s+-?([0-9.]+)`).exec(t)?.[1]);
    const sub = num("Sub Total"), charges = num("Levy \\(5%\\)"), net = num("Net Value"), vat = num("VAT Amount");
    const del = num("Delivery Charge"), grand = num("Grand Total");
    expect(fils(sub) + fils(charges)).toBe(fils(net));
    expect(fils(net) + fils(del) + fils(vat)).toBe(fils(grand));
  });

  it("respects the packager header setting (header off → company header not forced on)", async () => {
    const generate = vi.fn().mockResolvedValue("<html></html>");
    const printer = { getPrinterData: vi.fn().mockResolvedValue({ isSuccess: true, data: { generalPrinter: { packagerPrinter: "PKG" } } }) };
    const print = vi.fn().mockResolvedValue(undefined);
    await executePackagerPrint(cart() as never, { ...common, showCompanyHeader: false }, printer, print, generate);
    expect(generate.mock.calls[0][1].showCompanyHeader).toBe(false);
    expect(generate.mock.calls[0][1].isPackager).toBe(true);

    await executePackagerPrint(cart() as never, { ...common }, printer, print, generate);
    expect(generate.mock.calls[1][1].showCompanyHeader).toBe(true); // default: show
  });

  describe("company header and footer from the branch print design", () => {
    const render = (over: Record<string, unknown>) => {
      localStorage.setItem("branchPrintData", JSON.stringify([
        { section: "header", code: "H1", value: "BITEZO RESTAURANT" },
        { section: "footer", code: "F1", value: "THANK YOU VISIT AGAIN" },
      ]));
      return generateGuestPrintHtml(cart() as unknown as GuestArgs[0], { ...common, printPrice: "Inclusive", ...over } as unknown as GuestArgs[1]).then(text);
    };

    it("Packager Header on: header and footer", async () => {
      const t = await render({ isPackager: true, showCompanyHeader: true });
      expect(t).toContain("BITEZO RESTAURANT");
      expect(t).toContain("THANK YOU VISIT AGAIN");
    });

    it("Packager Header off: no header, the footer still prints", async () => {
      const t = await render({ isPackager: true, showCompanyHeader: false });
      expect(t).not.toContain("BITEZO RESTAURANT");
      expect(t).toContain("THANK YOU VISIT AGAIN");
    });

    it("other prints with the header switched off stay without both", async () => {
      const t = await render({ showCompanyHeader: false });
      expect(t).not.toContain("BITEZO RESTAURANT");
      expect(t).not.toContain("THANK YOU VISIT AGAIN");
    });
  });
});

describe("master KOT", () => {
  it("MASTER KOT title, real ticket no, modifier label, missed call, no totals / VAT", async () => {
    const t = text(await generateKotHtml(cart() as unknown as KotArgs[0],
      { ...common, isMaster: true, headerTitle: "MASTER KOT", printPrice: "Inclusive" } as unknown as KotArgs[1]));
    expect(t).toMatch(/MASTER KOT/);
    expect(t).toMatch(/#57/);
    expect(t).toContain("* TEST TEST1");
    expect(t).toMatch(/Missed Call : YES/);
    expect(t).not.toMatch(/Grand Total|VAT Amount|Sub Total/);
  });

  it("amounts follow Print Price (inclusive 2 × 12.705 = 25.410 + extra 1.271)", async () => {
    const t = text(await generateKotHtml(cart() as unknown as KotArgs[0],
      { ...common, isMaster: true, headerTitle: "MASTER KOT", printPrice: "Inclusive" } as unknown as KotArgs[1]));
    expect(t).toMatch(/26\.681/); // 25.410 + 1.2705 (extra, inclusive) = 26.6805 → 26.681
  });
});

describe("RE-ORDER (edited order sent again)", () => {
  const lines = [
    { uniqueId: "x", isExisting: true, quantity: 3, originalQty: 1, lineTotal: 30,
      modifiers: [{ id: 5, name: "TEST1", qty: 1 }], extras: [{ id: 1, name: "CHEESE", qty: 1 }] },
    { uniqueId: "y", isExisting: true, quantity: 2, originalQty: 2, lineTotal: 20 },
    { uniqueId: "z", isExisting: false, quantity: 1, lineTotal: 5 },
  ];

  it("prints only what was added; unchanged lines are skipped", () => {
    const r = buildReorderItems(lines);
    expect(r.map((l) => [l.uniqueId, l.quantity])).toEqual([["x", 2], ["z", 1]]);
    expect(r[0].lineTotal).toBeCloseTo(20, 10);
  });

  it("modifiers and extras keep their quantity (were multiplied to 0.667)", () => {
    const r = buildReorderItems(lines);
    const first = r[0] as (typeof lines)[number];
    expect(first.modifiers?.[0].qty).toBe(1);
    expect(first.extras?.[0].qty).toBe(1);
  });
});
