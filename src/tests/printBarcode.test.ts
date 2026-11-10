import { describe, it, expect, vi } from "vitest";
import { barcodeHtml, code128Modules } from "../features/pos/utils/printBarcode";
import { generateGuestPrintHtml } from "../features/pos/utils/guestPrintTemplate";

vi.mock("../features/inventory/branches/services/branchApi", () => ({
  branchApi: { getBranchPrintDesign: vi.fn().mockResolvedValue(null) },
}));

const CODE128_PATTERN_LENGTH = 11;
const STOP = "1100011101011";
const barWidths = (html: string) => [...html.matchAll(/flex:none; width:([\d.]+)px/g)].map((m) => Number(m[1]));
const hasBars = (html: string) => html.includes("flex:none");

const print = (extra: Record<string, unknown>) =>
  generateGuestPrintHtml([{ uniqueId: "a", productId: 1, quantity: 1, price: 1, lineTotal: 1, product: { id: 1, name: "ITEM", price: 1 } }] as never, {
    orderNo: "9001", ticketNo: "1", waiter: "Ali", counter: "C1", orderType: "TAKE OUT", subTotal: 0, vatAmount: 0,
    netAmount: 0, showCompanyHeader: false, ...extra,
  } as never);
const caption = (html: string) =>
  /class="barcode-container">.*?letter-spacing:1px; margin-top:2px;">([^<]*)</s.exec(html)?.[1];

describe("Code 128 encoding", () => {
  it("encodes a known value: start C, 90, 12, check digit, stop", () => {
    // Patterns from the Code 128 table. Check = (105 + 90*1 + 12*2) % 103 = 13.
    expect(code128Modules("9012")).toBe("11010011100" + "11011110110" + "10110011100" + "10011011100" + STOP);
  });

  it("ends every symbol with the stop pattern and has a whole number of patterns", () => {
    for (const value of ["9001", "105672", "ORD-20481", "1234567890"]) {
      const modules = code128Modules(value)!;
      expect(modules.endsWith(STOP)).toBe(true);
      expect((modules.length - STOP.length) % CODE128_PATTERN_LENGTH).toBe(0);
    }
  });

  it("refuses text Code 128 cannot carry", () => {
    expect(code128Modules("طلب")).toBeNull();
  });
});

describe("barcode HTML", () => {
  it("draws 3-dot bars: every width is a multiple of 1.5 px (3 printer dots)", () => {
    const widths = barWidths(barcodeHtml("105672"));
    expect(widths.length).toBeGreaterThan(10);
    expect(widths.every((w) => Number.isInteger(w / 1.5))).toBe(true);
  });

  it("starts on a whole pixel, so bars land on whole printer dots", () => {
    for (const value of ["9001", "105672", "ORD-20481"]) {
      const left = Number(/margin-left:([\d.]+)px/.exec(barcodeHtml(value))![1]);
      expect(Number.isInteger(left)).toBe(true);
      expect(left).toBeGreaterThanOrEqual(15); // quiet zone: 10 modules x 3 dots
    }
  });

  it("stays left-to-right on an Arabic receipt", () => {
    expect(barcodeHtml("9001")).toContain('dir="ltr"');
  });

  it("falls back to 2-dot bars, then to the number alone, as the value gets longer", () => {
    const medium = "A".repeat(18);
    expect(hasBars(barcodeHtml(medium))).toBe(true);
    expect(barWidths(barcodeHtml(medium)).every((w) => Number.isInteger(w))).toBe(true);

    const tooLong = "A".repeat(60);
    expect(hasBars(barcodeHtml(tooLong))).toBe(false);
    expect(barcodeHtml(tooLong)).toContain(tooLong);
  });

  it("prints unencodable text as escaped text, and nothing for no value", () => {
    expect(barcodeHtml("<b>طلب")).toContain("&lt;b&gt;");
    expect(hasBars(barcodeHtml("<b>طلب"))).toBe(false);
    expect(barcodeHtml("")).toBe("");
    expect(barcodeHtml(null)).toBe("");
  });
});

describe("which number each print encodes", () => {
  it("guest print: the order number, and the old *9001* text is gone", async () => {
    const html = await print({});
    expect(caption(html)).toBe("9001");
    expect(html).not.toContain("*9001*");
    expect(hasBars(html)).toBe(true);
  });

  it("guest print: the first order of a combined order, without #", async () => {
    expect(caption(await print({ orderNo: "#12, #13" }))).toBe("12");
  });

  it("packager print: the order number", async () => {
    expect(caption(await print({ isPackager: true, saleId: 555 }))).toBe("9001");
  });

  it("settle print: the sale id, not the order or voucher number", async () => {
    const html = await print({ isSettlement: true, invoiceNo: "INV-77", saleId: 105672 });
    expect(caption(html)).toBe("105672");
    expect(hasBars(html)).toBe(true);
  });

  it("settle print without a sale id: no barcode rather than a guessed number", async () => {
    for (const saleId of [undefined, 0]) {
      expect(await print({ isSettlement: true, invoiceNo: "INV-77", saleId })).not.toContain('class="barcode-container"');
    }
  });

  it("a saved order with no number prints no barcode", async () => {
    expect(await print({ orderNo: "" })).not.toContain('class="barcode-container"');
  });
});
