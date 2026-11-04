/**
 * Delivery orders taken from a MISSED CALL (Delivery page toggle → order.missedCall) must say so on the
 * KOT and on the guest / settle bill, in the DELIVERY DETAILS block.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { calculateOrder } from "../features/pos/terminal/utils/billing";
import { generateKotHtml } from "../features/pos/utils/kotTemplate";
import { generateGuestPrintHtml } from "../features/pos/utils/guestPrintTemplate";

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem("posConfigs", JSON.stringify({ configs: { vatStatus: true } }));
  localStorage.setItem("decimalPart", "3");
  localStorage.setItem("kotArabic", "Disable");
  localStorage.setItem("billArabic", "Disable");
});

const text = (html: string) =>
  html.replace(/<style[\s\S]*?<\/style>/g, "").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ");

const lines = () =>
  calculateOrder(
    [{ uniqueId: "a", productId: 9, quantity: 1, price: 10, isIncl: true, product: { id: 9, name: "ABCD", price: 10, vatValue: 10, isIncl: true } }],
    { orderType: "Delivery", orderTypeId: 4 }
  ).lines as any;

const data = (extra: any) => ({
  orderNo: "900", ticketNo: "900", waiter: "w", counter: "C1", orderType: "Delivery", orderTypeId: 4,
  contactNo: "33445566", customerName: "Ali", ...extra,
});

describe("missed call on prints", () => {
  for (const [label, gen] of [
    ["KOT", (d: any) => generateKotHtml(lines(), d)],
    ["guest bill", (d: any) => generateGuestPrintHtml(lines(), d)],
  ] as const) {
    it(`${label}: shows "Missed Call : YES" when the delivery order is a missed call`, async () => {
      const t = text(await gen(data({ missedCall: true })));
      expect(t).toMatch(/DELIVERY DETAILS/);
      expect(t).toMatch(/Missed Call : YES/);
    });

    it(`${label}: accepts the flag as text from the backend ("true")`, async () => {
      expect(text(await gen(data({ missedCall: "true" })))).toMatch(/Missed Call : YES/);
    });

    it(`${label}: nothing printed when it is not a missed call`, async () => {
      expect(text(await gen(data({ missedCall: false })))).not.toMatch(/Missed Call/);
      expect(text(await gen(data({})))).not.toMatch(/Missed Call/);
    });

    it(`${label}: never shown on non-delivery orders`, async () => {
      const t = text(await gen({ orderNo: "1", ticketNo: "1", waiter: "w", orderType: "TakeOut", orderTypeId: 2, missedCall: true }));
      expect(t).not.toMatch(/Missed Call/);
    });
  }

  it("missed call alone (no other delivery details) still prints the block", async () => {
    const t = text(await generateKotHtml(lines(), { orderNo: "900", ticketNo: "900", waiter: "w", orderType: "Delivery", orderTypeId: 4, missedCall: true } as any));
    expect(t).toMatch(/DELIVERY DETAILS Missed Call : YES/);
  });
});
