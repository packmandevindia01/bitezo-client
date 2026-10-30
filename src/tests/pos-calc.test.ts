import { describe, it, expect } from 'vitest';
import {
  calculatePos, factorOf, round3,
  type PriceView, type DiscountCalc, type DiscountType, type Rates,
} from '../features/pos/terminal/utils/pos-calc';

const RATES: Rates = { levyPct: 5, servicePct: 10, vatPct: 10 };
const P = 3; // toBeCloseTo precision (3 decimals)

const run = (
  priceView: PriceView, discountCalc: DiscountCalc, discountType: DiscountType,
  lineBases = [100], discount: { kind: 'fixed' | 'percent'; value: number } = { kind: 'fixed', value: 10 },
) => calculatePos({ lineBases, rates: RATES, priceView, discountCalc, discountType, discount, itemIndex: 0 });

describe('factor', () => {
  it('cascaded factor = 1.05 x 1.10 x 1.10', () => {
    expect(factorOf(RATES)).toBeCloseTo(1.2705, 6);
  });
});

// ---------- Step 1 + 2: what the backend saves (independent of price view and type) ----------
describe('saved values depend only on discount calc', () => {
  const cases: [DiscountCalc, number, number, number, number, number, number, number][] = [
    //  calc         saved  baseAfter levy   service net      vat     grand
    ['exclusive',   10.000, 90.000,  4.500, 9.450,  103.950, 10.395, 114.345],
    ['inclusive',    7.871, 92.129,  4.606, 9.674,  106.409, 10.641, 117.050],
  ];
  const views: PriceView[] = ['exclusive', 'inclusive'];
  const types: DiscountType[] = ['item', 'bill'];

  for (const [calc, saved, base, levy, service, net, vat, grand] of cases) {
    for (const view of views) {
      for (const type of types) {
        it(`${view} view / ${calc} calc / ${type} discount`, () => {
          const r = run(view, calc, type);
          expect(r.savedDiscount).toBeCloseTo(saved, P);
          expect(r.baseAfterDiscount).toBeCloseTo(base, P);
          expect(r.levy).toBeCloseTo(levy, P);
          expect(r.service).toBeCloseTo(service, P);
          expect(r.netValue).toBeCloseTo(net, P);
          expect(r.vat).toBeCloseTo(vat, P);
          expect(r.grandTotal).toBeCloseTo(grand, P);
        });
      }
    }
  }
});

// ---------- Step 2: item discount, line display ----------
describe('item discount: line display', () => {
  const cases: [PriceView, DiscountCalc, number, number, number][] = [
    //  view         calc          price    discount  total
    ['exclusive', 'exclusive', 100.000, 10.000, 90.000],
    ['inclusive', 'exclusive', 127.050, 12.705, 114.345],
    ['exclusive', 'inclusive', 100.000, 7.871,  92.129],
    ['inclusive', 'inclusive', 127.050, 10.000, 117.050],
  ];
  for (const [view, calc, price, disc, total] of cases) {
    it(`${view} view / ${calc} calc`, () => {
      const line = run(view, calc, 'item').display.lines[0];
      expect(line.price).toBeCloseTo(price, P);
      expect(line.discount).not.toBeNull();
      expect(line.discount!).toBeCloseTo(disc, P);
      expect(line.total).toBeCloseTo(total, P);
    });
  }
});

// ---------- Step 3: summary panel ----------
describe('summary panel', () => {
  const cases: [PriceView, DiscountCalc, number, number][] = [
    //  view         calc          subTotal  discount
    ['exclusive', 'exclusive', 100.000, 10.000],
    ['inclusive', 'exclusive', 100.000, 10.000],
    ['exclusive', 'inclusive', 100.000, 7.871],
    ['inclusive', 'inclusive', 100.000, 7.871],
  ];
  for (const [view, calc, sub, disc] of cases) {
    it(`${view} view / ${calc} calc: subtotal and discount in summary show saved exclusive amounts`, () => {
      const r = run(view, calc, 'item');
      expect(r.display.subTotal).toBeCloseTo(sub, P);
      expect(r.display.discount).toBeCloseTo(disc, P);
    });
  }

  it('grand total is identical in both price views', () => {
    for (const calc of ['exclusive', 'inclusive'] as DiscountCalc[]) {
      expect(run('exclusive', calc, 'item').grandTotal)
        .toBeCloseTo(run('inclusive', calc, 'item').grandTotal, P);
    }
  });
});

// ---------- Item vs bill ----------
describe('bill discount: placement', () => {
  it('line shows no discount and total is before discount (inclusive/inclusive)', () => {
    const r = run('inclusive', 'inclusive', 'bill');
    expect(r.display.lines[0].discount).toBeNull();
    expect(r.display.lines[0].total).toBeCloseTo(127.050, P);
    expect(r.display.discount).toBeCloseTo(7.871, P);
    expect(r.grandTotal).toBeCloseTo(117.050, P);
  });

  it('single item: item and bill give the same grand total in every combination', () => {
    for (const v of ['exclusive', 'inclusive'] as PriceView[])
      for (const c of ['exclusive', 'inclusive'] as DiscountCalc[])
        expect(run(v, c, 'bill').grandTotal).toBeCloseTo(run(v, c, 'item').grandTotal, P);
  });
});

// ---------- Percentage discounts ----------
describe('percentage discount', () => {
  it('10% gives the same result in inclusive and exclusive calc', () => {
    const pct = { kind: 'percent' as const, value: 10 };
    const a = run('exclusive', 'exclusive', 'item', [100], pct);
    const b = run('exclusive', 'inclusive', 'item', [100], pct);
    expect(a.savedDiscount).toBeCloseTo(10, P);
    expect(b.savedDiscount).toBeCloseTo(10, P);
    expect(a.grandTotal).toBeCloseTo(114.345, P);
    expect(b.grandTotal).toBeCloseTo(114.345, P);
  });
});

// ---------- Your screenshot (reverse calculation) ----------
describe('screenshot: inclusive view, inclusive calc, item discount 27.050', () => {
  const r = run('inclusive', 'inclusive', 'item', [100], { kind: 'fixed', value: 27.05 });
  it('saves exclusive discount 21.291', () => expect(r.savedDiscount).toBeCloseTo(21.291, P));
  it('base after discount 78.709', () => expect(r.baseAfterDiscount).toBeCloseTo(78.709, P));
  it('net value 90.909, VAT 9.091', () => {
    expect(r.netValue).toBeCloseTo(90.909, P);
    expect(r.vat).toBeCloseTo(9.091, P);
  });
  it('grand total 100.000', () => expect(r.grandTotal).toBeCloseTo(100.0, P));
  it('line shows 127.050 / -27.050 / 100.000', () => {
    const l = r.display.lines[0];
    expect(l.price).toBeCloseTo(127.05, P);
    expect(l.discount!).toBeCloseTo(27.05, P);
    expect(l.total).toBeCloseTo(100.0, P);
  });
});

// ---------- Multi-item bill discount ----------
describe('multi-item bill discount', () => {
  const bases = [100, 50, 33.333];
  for (const calc of ['exclusive', 'inclusive'] as DiscountCalc[]) {
    it(`${calc} calc: line discounts sum exactly to the saved total`, () => {
      const r = run('exclusive', calc, 'bill', bases, { kind: 'fixed', value: 10 });
      const sum = round3(r.savedLineDiscounts.reduce((a, b) => a + b, 0));
      expect(sum).toBe(r.savedDiscount);
    });
    it(`${calc} calc: split is proportional (last line takes the remainder)`, () => {
      const r = run('exclusive', calc, 'bill', bases, { kind: 'fixed', value: 10 });
      const total = bases.reduce((a, b) => a + b, 0);
      r.savedLineDiscounts.slice(0, -1).forEach((d, i) =>
        expect(Math.abs(d - (r.savedDiscount * bases[i]) / total)).toBeLessThan(0.002));
    });
  }
  it('item discount only touches the selected line', () => {
    const r = calculatePos({
      lineBases: bases, rates: RATES, priceView: 'exclusive', discountCalc: 'exclusive',
      discountType: 'item', discount: { kind: 'fixed', value: 10 }, itemIndex: 1,
    });
    expect(r.savedLineDiscounts).toEqual([0, 10, 0]);
    expect(r.display.lines[0].discount).toBeNull();
    expect(r.display.lines[1].discount).toBeCloseTo(10, P);
  });
});

// ---------- Edge cases ----------
describe('edge cases', () => {
  it('zero discount: nothing changes', () => {
    const r = run('inclusive', 'inclusive', 'item', [100], { kind: 'fixed', value: 0 });
    expect(r.savedDiscount).toBe(0);
    expect(r.grandTotal).toBeCloseTo(127.05, P);
    expect(r.display.lines[0].discount).toBeNull();
  });
  it('100% discount: total is 0', () => {
    const r = run('exclusive', 'exclusive', 'item', [100], { kind: 'percent', value: 100 });
    expect(r.grandTotal).toBe(0);
  });
  it('discount larger than the price is capped (never negative total)', () => {
    for (const calc of ['exclusive', 'inclusive'] as DiscountCalc[]) {
      const r = run('inclusive', calc, 'item', [100], { kind: 'fixed', value: 500 });
      expect(r.baseAfterDiscount).toBe(0);
      expect(r.grandTotal).toBe(0);
    }
  });
  it('no taxes: inclusive and exclusive behave the same', () => {
    const rates: Rates = { levyPct: 0, servicePct: 0, vatPct: 0 };
    const mk = (c: DiscountCalc) => calculatePos({
      lineBases: [100], rates, priceView: 'inclusive', discountCalc: c,
      discountType: 'item', discount: { kind: 'fixed', value: 10 },
    });
    expect(mk('inclusive').grandTotal).toBeCloseTo(mk('exclusive').grandTotal, P);
    expect(mk('inclusive').grandTotal).toBeCloseTo(90, P);
  });
});
