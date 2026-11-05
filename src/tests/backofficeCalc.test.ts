/**
 * BACK OFFICE — calculations and hardcoded-value fixes (2026-11-05).
 * Pure helpers used by the back-office screens; every money rule is exact decimal, half-up at the
 * currency decimals (same as the POS, utils/money.ts).
 */
import { describe, it, expect } from "vitest";
import { currencyDecimals, resolveDecimalPart, dialCodeForCountry, withDialCodes } from "../features/company/utils/regionalData";
import {
  happyHourFromPercent, happyHourFromDiscount, happyHourFromPromo, validateHappyHourEntry,
} from "../features/general/happyHour/utils/happyHourCalc";
import { voucherAmount, voucherTotal, invoiceBalance, comparePaid, multiPaymodeId } from "../features/transaction/shared/voucherCalc";
import { productionLineAmount, productionTotals } from "../features/transaction/production/utils/productionCalc";
import { stockLineAmount, stockBaseQty, stockNetAmount } from "../features/transaction/shared/stockCalc";
import { calculatePurchaseLine, sumPurchaseLines } from "../features/transaction/shared/purchaseCalc";

// deterministic PRNG for the randomized checks
const prng = (seed: number) => () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const r3 = (x: number) => Math.round(x * 1000) / 1000;

describe("company: currency decimals (no fixed 2 for BHD)", () => {
  it("derives minor units from the currency code", () => {
    expect(currencyDecimals("BHD")).toBe(3);
    expect(currencyDecimals("kwd")).toBe(3);
    expect(currencyDecimals("OMR")).toBe(3);
    expect(currencyDecimals("SAR")).toBe(2);
    expect(currencyDecimals("AED")).toBe(2);
    expect(currencyDecimals("INR")).toBe(2);
    expect(currencyDecimals("JPY")).toBe(0);
    expect(currencyDecimals("")).toBe(3);
    expect(currencyDecimals(undefined)).toBe(3);
  });

  it("uses the backend decimalPart when valid (0 allowed), else the currency", () => {
    expect(resolveDecimalPart(2, "BHD")).toBe(2);
    expect(resolveDecimalPart(0, "BHD")).toBe(0);
    expect(resolveDecimalPart("3", "SAR")).toBe(3);
    expect(resolveDecimalPart(undefined, "BHD")).toBe(3);
    expect(resolveDecimalPart(null, "SAR")).toBe(2);
    expect(resolveDecimalPart("", "KWD")).toBe(3);
    expect(resolveDecimalPart("abc", "BHD")).toBe(3);
    expect(resolveDecimalPart(-1, "BHD")).toBe(3);
  });
});

describe("company: no invented country / currency IDs", () => {
  it("dial codes are looked up by country NAME only", () => {
    expect(dialCodeForCountry("Bahrain")).toBe("+973");
    expect(dialCodeForCountry(" saudi arabia ")).toBe("+966");
    expect(dialCodeForCountry("Atlantis")).toBe("");
  });

  it("withDialCodes keeps the API ids and only fills a missing mobCode", () => {
    const api = [{ id: 17, name: "Bahrain" }, { id: 4, name: "Qatar", mobCode: "+974" }, { id: 99, name: "Atlantis" }];
    const out = withDialCodes(api);
    expect(out.map((c) => c.id)).toEqual([17, 4, 99]); // ids untouched
    expect(out.map((c) => c.mobCode)).toEqual(["+973", "+974", ""]);
    expect(withDialCodes([])).toEqual([]); // empty stays empty (no fallback list)
  });
});

describe("happy hour: price ↔ % ↔ discount ↔ promo", () => {
  it("percentage", () => {
    expect(happyHourFromPercent(10, 25, 3)).toEqual({ percent: 25, discount: 2.5, promo: 7.5 });
    expect(happyHourFromPercent(1.255, 10, 3)).toEqual({ percent: 10, discount: 0.126, promo: 1.129 }); // half-up
  });

  it("discount amount and promo price", () => {
    expect(happyHourFromDiscount(10, 2.5, 3)).toEqual({ percent: 25, discount: 2.5, promo: 7.5 });
    expect(happyHourFromPromo(10, 7.5, 3)).toEqual({ percent: 25, discount: 2.5, promo: 7.5 });
  });

  it("never a negative promo price or more than 100 %", () => {
    expect(happyHourFromPercent(10, 150, 3)).toEqual({ percent: 100, discount: 10, promo: 0 });
    expect(happyHourFromDiscount(10, 15, 3)).toEqual({ percent: 100, discount: 10, promo: 0 });
    expect(happyHourFromPromo(10, -5, 3)).toEqual({ percent: 100, discount: 10, promo: 0 });
    expect(happyHourFromPromo(10, 12, 3)).toEqual({ percent: 0, discount: 0, promo: 10 });
    expect(happyHourFromDiscount(10, -1, 3)).toEqual({ percent: 0, discount: 0, promo: 10 });
  });

  it("promo + discount always equals the price exactly (500 random cases)", () => {
    const rnd = prng(11);
    for (let i = 0; i < 500; i++) {
      const price = r3(0.01 + rnd() * 100);
      const pct = Math.round(rnd() * 12000) / 100; // 0–120 %
      for (const r of [happyHourFromPercent(price, pct, 3), happyHourFromDiscount(price, rnd() * 120, 3), happyHourFromPromo(price, rnd() * 120 - 10, 3)]) {
        expect(r3(r.promo + r.discount)).toBe(price);
        expect(r.promo).toBeGreaterThanOrEqual(0);
        expect(r.discount).toBeLessThanOrEqual(price);
        expect(r.percent).toBeLessThanOrEqual(100);
      }
    }
  });

  it("entry validation", () => {
    expect(validateHappyHourEntry(10, 7.5)).toBeNull();
    expect(validateHappyHourEntry(10, 0)).toBeNull(); // free item is allowed
    expect(validateHappyHourEntry(0, 0)).toMatch(/Price/);
    expect(validateHappyHourEntry(10, -1)).toMatch(/negative/);
    expect(validateHappyHourEntry(10, 11)).toMatch(/higher/);
    expect(validateHappyHourEntry(10, NaN)).toMatch(/promo/i);
  });
});

describe("vouchers: amounts, totals, balance, multi-pay", () => {
  it("rounds half-up at the currency decimals", () => {
    expect(voucherAmount(1.0005, 3)).toBe(1.001);
    expect(voucherAmount("2.6745", 3)).toBe(2.675);
    expect(voucherAmount("", 3)).toBe(0);
    expect(voucherAmount(1.005, 2)).toBe(1.01);
  });

  it("header total = exact Σ of the rounded lines", () => {
    expect(voucherTotal([1.0005, 1.0005], 3)).toBe(2.002); // a float sum rounded once gives 2.001
    expect(voucherTotal([0.1, 0.2], 3)).toBe(0.3);
    const rnd = prng(5);
    for (let i = 0; i < 300; i++) {
      const lines = Array.from({ length: 1 + Math.floor(rnd() * 8) }, () => Math.round(rnd() * 1e9) / 1e7);
      const total = voucherTotal(lines, 3);
      expect(total).toBe(r3(lines.reduce((a, l) => a + voucherAmount(l, 3), 0)));
    }
  });

  it("invoice balance is never negative (a fully paid invoice has balance 0)", () => {
    expect(invoiceBalance(10, 10, 3)).toBe(0); // old fallback showed 10
    expect(invoiceBalance(10, 12, 3)).toBe(0);
    expect(invoiceBalance(10, 3.5, 3)).toBe(6.5);
    expect(invoiceBalance("10.0005", 0, 3)).toBe(10.001);
  });

  it("paid vs due at fils", () => {
    expect(comparePaid(["5", "5.0004"], 10, 3)).toMatchObject({ roundedPaid: 10, remaining: 0, change: 0, isComplete: true });
    expect(comparePaid(["4"], 10, 3)).toMatchObject({ remaining: 6, isComplete: false });
    expect(comparePaid(["12"], 10, 3)).toMatchObject({ change: 2, isComplete: true });
    expect(comparePaid([], 0, 3).isComplete).toBe(false);
  });

  it("Multi paymode is found by name, not a hardcoded 3", () => {
    expect(multiPaymodeId([{ paymodeId: 1, paymodeName: "Cash" }, { paymodeId: 7, paymodeName: "MultiPay" }])).toBe(7);
    expect(multiPaymodeId([{ paymodeId: "5", paymodeName: "Multi Payment" }])).toBe(5);
    expect(multiPaymodeId([{ paymodeId: 1, paymodeName: "Cash" }])).toBe(3); // seeded fallback
    expect(multiPaymodeId(undefined)).toBe(3);
  });
});

describe("production costing (exact decimal)", () => {
  it("line amount and totals carry no float noise", () => {
    expect(productionLineAmount(3, 0.1)).toBe(0.3); // float: 0.30000000000000004
    expect(productionLineAmount("2", "1.005")).toBe(2.01);
    const t = productionTotals([{ qty: 3, cost: 0.1 }, { qty: 1, cost: 0.2 }], 0.5, 4);
    expect(t.itemTotal).toBe(0.5);
    expect(t.grandTotal).toBe(1);
    expect(t.costPerUnit).toBe(0.25);
  });

  it("cost per unit is 0 when the finished qty is 0", () => {
    expect(productionTotals([{ qty: 1, cost: 5 }], 0, 0).costPerUnit).toBe(0);
  });
});

describe("stock documents (adjustment / physical entry / transfer)", () => {
  it("exact line amounts and base quantities", () => {
    expect(stockLineAmount(3, 0.1)).toBe(0.3);
    expect(stockLineAmount("0.7", "0.1")).toBe(0.07); // float: 0.06999999999999999
    expect(stockBaseQty(0.1, 3)).toBe(0.3);
    expect(stockBaseQty(2, undefined)).toBe(2);
  });

  it("net amount with + / − effects", () => {
    expect(stockNetAmount([{ amount: 0.3 }, { amount: 0.1, sign: -1 }, { amount: 0.2 }])).toBe(0.4);
    expect(stockNetAmount([])).toBe(0);
  });
});

describe("purchase: bill discount limited to the bill", () => {
  it("a discount larger than the bill never makes taxable amounts or VAT negative", () => {
    const gross = 20; // two lines of 10
    const a = calculatePurchaseLine(1, 10, 10, gross, 50);
    const b = calculatePurchaseLine(1, 10, 10, gross, 50);
    expect(a.discountAmount).toBe(10);
    expect(a.vatAmount).toBe(0);
    expect(a.netAmount).toBe(0);
    expect(sumPurchaseLines([a, b]).netAmount).toBe(0);
  });

  it("header = Σ lines and Σ line discounts = bill discount (300 random invoices)", () => {
    const rnd = prng(3);
    for (let i = 0; i < 300; i++) {
      const items = Array.from({ length: 1 + Math.floor(rnd() * 6) }, () => ({
        qty: 1 + Math.floor(rnd() * 10), price: r3(rnd() * 50), vat: [0, 5, 10, 15][Math.floor(rnd() * 4)],
      }));
      const gross = items.reduce((s, it) => s + it.qty * it.price, 0);
      const disc = r3(rnd() * gross * 0.5);
      const lines = items.map((it) => calculatePurchaseLine(it.qty, it.price, it.vat, gross, disc));
      const tot = sumPurchaseLines(lines);
      expect(Math.abs(Number(tot.discountAmount) - disc)).toBeLessThan(1e-9);
      expect(Math.abs(Number(tot.netAmount) - lines.reduce((s, l) => s + l.netAmount, 0))).toBeLessThan(1e-9);
      lines.forEach((l) => expect(l.vatAmount).toBeGreaterThanOrEqual(0));
    }
  });
});
