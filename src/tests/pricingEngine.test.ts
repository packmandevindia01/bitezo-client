import { describe, it, expect } from "vitest";
import {
  priceBill,
  priceLine,
  allocateProportionally,
  buildPricingSettings,
  resolvePriceIncludesTax,
} from "../features/pos/pricing";
import type { PricingSettings } from "../features/pos/pricing";

const settings = (over: Partial<PricingSettings> = {}): PricingSettings => ({
  vatEnabled: true,
  defaultVatRate: 10,
  serviceChargeRate: 0,
  levyRate: 5,
  discountCalc: "Exclusive",
  priceView: "Exclusive",
  ...over,
});

const dineIn = (over: Partial<PricingSettings> = {}) => settings({ serviceChargeRate: 10, ...over });

describe("pricing engine — golden bills", () => {
  it("Order #191 (backend sample): TakeOut, 1.000 inclusive product + 0.100 extra, levy 5%, VAT 10%", () => {
    const bill = priceBill(
      { lines: [{ qty: 1, unitPrice: 1, priceIncludesTax: true, vatRate: 10, extras: [{ price: 0.1, qty: 1 }] }] },
      settings()
    );
    const line = bill.lines[0];
    // Values exactly as stored by the backend for order 191
    expect(line.amount).toBeCloseTo(0.952381, 6); // detailsData.price / amount
    expect(line.extras[0].basePrice).toBeCloseTo(0.0865801, 7); // modifiersData.price
    expect(line.levy).toBeCloseTo(0.047619, 6);
    expect(line.serviceCharge).toBe(0);
    expect(line.vatAmount).toBeCloseTo(0.1, 6);
    expect(bill.totals.vatExclAmount).toBeCloseTo(1, 6);
    expect(bill.totals.vatAmount).toBeCloseTo(0.1, 6);
    expect(bill.totals.grandTotal).toBeCloseTo(1.1, 6);
  });

  it("Dine-In inclusive 127.050 → base 100, SC 10, levy 5.5, VAT 11.55, pays 127.050", () => {
    const bill = priceBill({ lines: [{ qty: 1, unitPrice: 127.05, priceIncludesTax: true, vatRate: 10 }] }, dineIn());
    const l = bill.lines[0];
    expect(l.amount).toBeCloseTo(100, 6);
    expect(l.serviceCharge).toBeCloseTo(10, 6);
    expect(l.levy).toBeCloseTo(5.5, 6);
    expect(l.vatAmount).toBeCloseTo(11.55, 6);
    expect(bill.totals.grandTotal).toBeCloseTo(127.05, 6);
  });

  it("Dine-In exclusive 100.000 → pays 127.050", () => {
    const bill = priceBill({ lines: [{ qty: 1, unitPrice: 100, priceIncludesTax: false, vatRate: 10 }] }, dineIn());
    expect(bill.totals.grandTotal).toBeCloseTo(127.05, 6);
  });

  it("TakeOut inclusive 100.000 (VAT 10%, no levy) → customer pays exactly 100.000", () => {
    const bill = priceBill(
      { lines: [{ qty: 1, unitPrice: 100, priceIncludesTax: true, vatRate: 10 }] },
      settings({ levyRate: 0 })
    );
    expect(bill.lines[0].amount).toBeCloseTo(90.909091, 6);
    expect(bill.totals.grandTotal).toBeCloseTo(100, 6);
  });

  it("inclusive price is never inflated: qty 2 × 100 inclusive = 200 payable", () => {
    const bill = priceBill({ lines: [{ qty: 2, unitPrice: 100, priceIncludesTax: true, vatRate: 10 }] }, dineIn());
    expect(bill.totals.grandTotal).toBeCloseTo(200, 6);
  });

  it("Price View does not change the money", () => {
    const line = { qty: 3, unitPrice: 12.5, priceIncludesTax: true, vatRate: 10, extras: [{ price: 0.5, qty: 2 }] };
    const a = priceBill({ lines: [line] }, dineIn({ priceView: "Inclusive" }));
    const b = priceBill({ lines: [line] }, dineIn({ priceView: "Exclusive" }));
    expect(a.totals).toEqual(b.totals);
  });
});

describe("pricing engine — discounts", () => {
  it("item % discount comes off the base before charges", () => {
    const l = priceLine(
      { qty: 1, unitPrice: 100, priceIncludesTax: false, vatRate: 10, discount: { type: "percentage", value: 10 } },
      dineIn()
    );
    expect(l.discountBase).toBeCloseTo(10, 6);
    expect(l.netValue).toBeCloseTo(90, 6);
    expect(l.lineNet).toBeCloseTo(90 * 1.2705, 6);
  });

  it("fixed discount in Inclusive mode reduces the payable by exactly the typed amount", () => {
    const l = priceLine(
      { qty: 1, unitPrice: 127.05, priceIncludesTax: true, vatRate: 10, discount: { type: "amount", value: 27.05 } },
      dineIn({ discountCalc: "Inclusive" })
    );
    expect(l.lineNet).toBeCloseTo(100, 6);
  });

  it("fixed discount in Exclusive mode reduces the base by the typed amount", () => {
    const l = priceLine(
      { qty: 1, unitPrice: 127.05, priceIncludesTax: true, vatRate: 10, discount: { type: "amount", value: 27.05 } },
      dineIn({ discountCalc: "Exclusive" })
    );
    expect(l.discountBase).toBeCloseTo(27.05, 6);
    expect(l.netValue).toBeCloseTo(72.95, 6);
  });

  it("discount never exceeds the line", () => {
    const l = priceLine(
      { qty: 1, unitPrice: 10, priceIncludesTax: false, vatRate: 10, discount: { type: "amount", value: 999 } },
      settings()
    );
    expect(l.netValue).toBe(0);
    expect(l.lineNet).toBe(0);
  });

  it("bill discount replaces item discounts and allocates exactly", () => {
    const bill = priceBill(
      {
        lines: [
          { qty: 1, unitPrice: 10, priceIncludesTax: false, vatRate: 10, discount: { type: "percentage", value: 50 } },
          { qty: 1, unitPrice: 20, priceIncludesTax: false, vatRate: 10 },
          { qty: 1, unitPrice: 30, priceIncludesTax: false, vatRate: 10 },
        ],
        billDiscount: { type: "amount", value: 10 },
      },
      settings()
    );
    expect(bill.billDiscountApplied).toBe(true);
    expect(bill.totals.itemDiscountExclusive).toBe(0);
    expect(bill.totals.billDiscountExclusive).toBeCloseTo(10, 7);
    const allocated = bill.lines.map((l) => l.discountBase);
    expect(allocated.reduce((a, b) => a + b, 0)).toBeCloseTo(10, 7);
    expect(allocated[0]).toBeCloseTo(10 / 6, 6);
  });

  it("inclusive bill discount with mixed VAT rates reduces payable by exactly the typed amount", () => {
    const lines = [
      { qty: 1, unitPrice: 50, priceIncludesTax: true, vatRate: 10 },
      { qty: 1, unitPrice: 50, priceIncludesTax: true, vatRate: 0 },
    ];
    const s = dineIn({ discountCalc: "Inclusive" });
    const before = priceBill({ lines }, s).totals.grandTotal;
    const after = priceBill({ lines, billDiscount: { type: "amount", value: 10 } }, s).totals.grandTotal;
    expect(before).toBeCloseTo(100, 6);
    expect(after).toBeCloseTo(90, 6);
  });

  it("100% bill discount (complimentary) makes everything zero", () => {
    const bill = priceBill(
      {
        lines: [{ qty: 2, unitPrice: 5, priceIncludesTax: true, vatRate: 10 }],
        billDiscount: { type: "percentage", value: 100 },
      },
      dineIn()
    );
    expect(bill.totals.grandTotal).toBe(0);
    expect(bill.totals.vatAmount).toBe(0);
  });
});

describe("pricing engine — VAT rates and charges", () => {
  it("mixed VAT rates: master VAT is the sum of line VAT (no global rate)", () => {
    const bill = priceBill(
      {
        lines: [
          { qty: 1, unitPrice: 100, priceIncludesTax: false, vatRate: 10 },
          { qty: 1, unitPrice: 100, priceIncludesTax: false, vatRate: 0 },
        ],
      },
      settings({ levyRate: 0 })
    );
    expect(bill.totals.vatAmount).toBeCloseTo(10, 6);
    expect(bill.totals.grandTotal).toBeCloseTo(210, 6);
  });

  it("VAT disabled: no VAT, inclusive price still contains levy", () => {
    const bill = priceBill(
      { lines: [{ qty: 1, unitPrice: 105, priceIncludesTax: true, vatRate: 10, extras: [{ price: 2.1, qty: 1 }] }] },
      settings({ vatEnabled: false })
    );
    const l = bill.lines[0];
    expect(l.vatAmount).toBe(0);
    expect(l.productBase).toBeCloseTo(100, 6);
    expect(l.extras[0].basePrice).toBeCloseTo(2, 6);
    expect(bill.totals.grandTotal).toBeCloseTo(107.1, 6);
  });

  it("extras are per line (not multiplied by qty)", () => {
    const l = priceLine(
      { qty: 3, unitPrice: 10, priceIncludesTax: false, vatRate: 0, extras: [{ price: 1, qty: 2 }] },
      settings({ levyRate: 0 })
    );
    expect(l.amount).toBeCloseTo(32, 6);
  });

  it("delivery charge is added after VAT and is not taxed", () => {
    const bill = priceBill(
      { lines: [{ qty: 1, unitPrice: 10, priceIncludesTax: false, vatRate: 10 }], deliveryCharge: 1.5 },
      settings({ levyRate: 0 })
    );
    expect(bill.totals.vatAmount).toBeCloseTo(1, 6);
    expect(bill.totals.grandTotal).toBeCloseTo(12.5, 6);
  });

  it("totals are internally consistent: vatExcl + vat + delivery = grandTotal", () => {
    const bill = priceBill(
      {
        lines: [
          { qty: 3, unitPrice: 7.35, priceIncludesTax: true, vatRate: 10, extras: [{ price: 0.25, qty: 3 }] },
          { qty: 1, unitPrice: 4.2, priceIncludesTax: false, vatRate: 5, discount: { type: "amount", value: 1 } },
        ],
        deliveryCharge: 0.5,
      },
      dineIn()
    );
    const t = bill.totals;
    expect(t.vatExclAmount + t.vatAmount + t.deliveryCharge).toBeCloseTo(t.grandTotal, 6);
    expect(t.subTotalExclusive - t.discountExclusive + t.serviceCharge + t.levy).toBeCloseTo(t.vatExclAmount, 6);
  });
});

describe("pricing helpers", () => {
  it("allocation sums exactly and handles zero weights", () => {
    expect(allocateProportionally(1, [1, 1, 1]).reduce((a, b) => a + b, 0)).toBeCloseTo(1, 7);
    expect(allocateProportionally(5, [0, 0])).toEqual([0, 0]);
  });

  it("service charge only for Dine-In", () => {
    const base = { vatEnabled: true, defaultVatRate: 10, serviceChargeRate: 10, levyRate: 5, discountCalc: "Exclusive", priceView: "Exclusive" };
    expect(buildPricingSettings({ ...base, orderTypeName: "DineIn" }).serviceChargeRate).toBe(10);
    expect(buildPricingSettings({ ...base, orderTypeName: "TakeOut" }).serviceChargeRate).toBe(0);
    expect(buildPricingSettings({ ...base, orderTypeName: "Delivery" }).levyRate).toBe(5);
  });

  it("inclusivity: line flag wins, then product master, Price View only when nothing is known", () => {
    expect(resolvePriceIncludesTax({ isIncl: false }, { isIncl: true }, undefined, true)).toBe(false);
    expect(resolvePriceIncludesTax({}, { isIncl: true }, undefined, false)).toBe(true);
    expect(resolvePriceIncludesTax({}, { isIncl: false }, undefined, true)).toBe(false);
    expect(resolvePriceIncludesTax({}, {}, undefined, true)).toBe(true);
    expect(resolvePriceIncludesTax({}, {}, undefined, false)).toBe(false);
  });
});
