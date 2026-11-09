/**
 * Shown / printed amounts always add up to the fil (largest-remainder balancing, display only).
 *   Sub Total − Discount + Charges = Net Value;  Net Value + VAT + Delivery = Grand Total
 *   Exclusive print: Σ row amounts = Sub Total.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { balanceToTotal, balanceBillFooter, sumMoney, round } from "../utils/money";
import { calculateOrder } from "../features/pos/terminal/utils/billing";
import { generateGuestPrintHtml } from "../features/pos/utils/guestPrintTemplate";

const fils = (v: number) => Math.round(v * 1000);

describe("balanceToTotal", () => {
  it("three thirds of 10 show as 3.334 + 3.333 + 3.333 = 10.000", () => {
    const parts = balanceToTotal([10 / 3, 10 / 3, 10 / 3], 10, 3);
    expect(sumMoney(parts)).toBe(10);
    parts.forEach((p) => expect(Math.abs(fils(p) - fils(10 / 3))).toBeLessThanOrEqual(1));
  });

  it("moves the value closest to the other rounding (largest remainder)", () => {
    // 1.2344 → 1.234 (closest to rounding up), 2.2341 → 2.234 ; total 3.4690 → 3.469
    // 1.2344 → 1.234, 2.2341 → 2.234, 0.0005 → 0.001 ; Σ 3.469 = total 3.4690 → nothing to move
    expect(balanceToTotal([1.2344, 2.2341, 0.0005], 3.469, 3)).toEqual([1.234, 2.234, 0.001]);
    // total 3.4685 → 3.469 but rows round to 1.234 + 2.234 = 3.468 → one fil short:
    // 1.2344 was rounded down the most (0.4 fil) → it becomes 1.235
    expect(balanceToTotal([1.2344, 2.2341], 3.4685, 3)).toEqual([1.235, 2.234]);
    expect(sumMoney(balanceToTotal([1.2344, 2.2341], 3.4685, 3))).toBe(round(3.4685, 3));
  });

  it("zero rows stay zero", () => {
    const r = balanceToTotal([0, 5.0005, 4.9995], 10.0015, 3);
    expect(r[0]).toBe(0);
    expect(sumMoney(r)).toBe(10.002);
  });

  it("safety: values that do not belong to the total are not forced (plain rounding)", () => {
    expect(balanceToTotal([1, 2], 10, 3)).toEqual([1, 2]);
  });
});

describe("balanceBillFooter", () => {
  const addsUp = (f: ReturnType<typeof balanceBillFooter>) => {
    expect(fils(f.subTotal) - fils(f.discount) + fils(f.charges)).toBe(fils(f.netValue));
    expect(fils(f.netValue) + fils(f.vat) + fils(f.delivery)).toBe(fils(f.grandTotal));
  };

  it("#285 (old print 302.727 − 30.273 + 27.245 = 299.699 ≠ 299.700) now adds up", () => {
    const f = balanceBillFooter({ subTotal: 302.7272727, discount: 30.2727273, charges: 0, vat: 27.2454545, delivery: 0, grandTotal: 299.7 }, 3);
    addsUp(f);
    expect(f.grandTotal).toBe(299.7);
    expect(f.vat).toBe(27.245);
    expect(f.discount).toBe(30.273);
  });

  it("Dine-In with service charge, levy and delivery", () => {
    // net 54.3290909 − 5.4329091 + 7.5787574 = 56.4749392; VAT 10 % = 5.64749392; + delivery 2 = 64.12243312
    const f = balanceBillFooter({ subTotal: 54.3290909, discount: 5.4329091, charges: 7.5787574, vat: 5.64749392, delivery: 2, grandTotal: 64.12243312 }, 3);
    addsUp(f);
    expect(f.delivery).toBe(2);
    expect(f.grandTotal).toBe(64.122);
  });

  it("safety: a footer whose numbers do not belong together is shown as-is, not forced", () => {
    const f = balanceBillFooter({ subTotal: 54.329, discount: 5.433, charges: 7.616, vat: 5.651, delivery: 2, grandTotal: 64.764 }, 3);
    expect(f.subTotal).toBe(54.329);
    expect(f.grandTotal).toBe(64.764);
  });

  it("grand total is the exact payable rounded; nothing moves more than 1 fil", () => {
    const v = { subTotal: 100, discount: 9.0909091, charges: 4.545, vat: 9.545, delivery: 0, grandTotal: 105 };
    const f = balanceBillFooter(v, 3);
    addsUp(f);
    expect(f.grandTotal).toBe(105);
    expect(Math.abs(fils(f.discount) - fils(v.discount))).toBeLessThanOrEqual(1);
  });
});

describe("guest bill (Exclusive print): rows add up to Sub Total, footer adds up", () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem("posConfigs", JSON.stringify({ configs: { vatStatus: true, serviceCharges: 10, levy: 5 } }));
    localStorage.setItem("decimalPart", "3");
    localStorage.setItem("printPrice", "Exclusive");
    localStorage.setItem("billArabic", "Disable");
  });

  it("3 items whose exclusive prices round badly", async () => {
    const product = (id: number, price: number) => ({ id, name: `P${id}`, price, vatValue: 10, isIncl: true });
    const lines = calculateOrder(
      [1, 2, 3].map((id) => ({ uniqueId: String(id), productId: id, quantity: 1, price: 1.001, isIncl: true, product: product(id, 1.001) })),
      { orderType: "DineIn", orderTypeId: 1 }
    ).lines;
    type GuestArgs = Parameters<typeof generateGuestPrintHtml>;
    const html = await generateGuestPrintHtml(lines as unknown as GuestArgs[0], { orderNo: "1", ticketNo: "1", waiter: "w", orderType: "DineIn", printPrice: "Exclusive" } as unknown as GuestArgs[1]);
    const text = html.replace(/<style[\s\S]*?<\/style>/g, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
    const num = (label: string) => Number(new RegExp(`${label}\\s+-?([0-9.]+)`).exec(text)?.[1]);
    const rows = [...text.matchAll(/P[123]\s+[0-9.]+\s+([0-9.]+)/g)].map((m) => Number(m[1]));
    expect(rows).toHaveLength(3);
    expect(rows.reduce((s, r) => s + fils(r), 0)).toBe(fils(num("Sub Total")));
    const sub = num("Sub Total"), levy = num("Levy \\(5%\\)"), sc = num("Service Charge \\(10%\\)"), net = num("Net Value"), vat = num("VAT Amount"), grand = num("Grand Total");
    expect(fils(sub) + fils(levy) + fils(sc)).toBe(fils(net));
    expect(fils(net) + fils(vat)).toBe(fils(grand));
  });
});
