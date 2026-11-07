/**
 * POS CROSS-VERIFICATION — randomized, end to end.
 *
 * For a few hundred deterministic random carts (mixed inclusive / exclusive products, VAT 0/5/10/15,
 * extras, item OR bill discounts as % or amount, discount mode Inclusive / Exclusive, Dine-In /
 * Take-Out / Delivery, VAT on / off, service charge and levy) this checks:
 *
 *   1. The engine against an INDEPENDENT reference model written from the rules R1–R7 (plain floats).
 *   2. Engine identities (each line and the totals add up exactly).
 *   3. Screen (calculateOrder) = saved order payload = sales invoice.
 *   4. Saved order (what the backend stores) → recall footer, in both price views = same total.
 *   5. Saved order → edit (load into cart) → unchanged cart = same total.
 *   6. Saved order → print pricing = same total.
 *
 * Any failure prints the seed so the exact cart can be replayed.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { priceBill, priceLine, storedOrderFooter, storedLineToCartPricing, deriveOrderChargeRatesFromMaster, ORDER_TYPE_NAMES } from "../features/pos/pricing";
import type { PricingSettings } from "../features/pos/pricing";
import { calculateOrder, getBillingConfigForOrder, toPricingSettings } from "../features/pos/terminal/utils/billing";
import { buildDirectSettleOrderPayload } from "../features/pos/terminal/mappers/orderPayloadMapper";
import { buildSalesInvoicePayload } from "../features/pos/terminal/mappers/invoicePayloadMapper";
import { applyStoredOrderView } from "../features/pos/services/storedOrderView";
import { buildSavedOrderLoad, dispatchSavedOrderLoad } from "../features/pos/terminal/utils/savedOrderToCart";
import posReducer from "../features/pos/terminal/store/posSlice";
import { selectCartCalculation } from "../features/pos/terminal/store/posSelectors";
import { buildPrintPricing } from "../features/pos/utils/printPricing";

// ── deterministic PRNG ───────────────────────────────────────────────────────
const mulberry32 = (seed: number) => () => {
  let t = (seed += 0x6d2b79f5);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const pick = <T,>(rnd: () => number, arr: readonly T[]): T => arr[Math.floor(rnd() * arr.length)];
const money3 = (rnd: () => number, min: number, max: number) => Math.round((min + rnd() * (max - min)) * 1000) / 1000;

const ORDER_TYPES = [
  { id: 1, name: "DineIn" },
  { id: 2, name: "TakeOut" },
  { id: 4, name: "Delivery" },
] as const;

interface Scenario {
  seed: number;
  vatOn: boolean;
  sc: number;
  levy: number;
  discCalc: "Inclusive" | "Exclusive";
  view: "Inclusive" | "Exclusive";
  orderType: (typeof ORDER_TYPES)[number];
  deliveryCharge: number;
  billDiscount: { type: "percentage" | "amount"; value: number } | null;
  products: any[];
  items: any[];
}

const makeScenario = (seed: number): Scenario => {
  const rnd = mulberry32(seed);
  const vatOn = rnd() < 0.85;
  const sc = pick(rnd, [0, 0, 5, 10]);
  const levy = pick(rnd, [0, 0, 5]);
  const discCalc = pick(rnd, ["Inclusive", "Exclusive"] as const);
  const view = pick(rnd, ["Inclusive", "Exclusive"] as const);
  const orderType = pick(rnd, ORDER_TYPES);
  const deliveryCharge = orderType.id === 4 ? pick(rnd, [0, 0.5, 1.5, 2]) : 0;

  const nLines = 1 + Math.floor(rnd() * 5);
  const products: any[] = [];
  const items: any[] = [];
  const discountMode = pick(rnd, ["none", "none", "item", "bill"] as const);
  for (let i = 0; i < nLines; i++) {
    const id = 100 + i;
    const isIncl = rnd() < 0.5;
    const product = { id, name: `P${id}`, price: money3(rnd, 0.1, 50), vatValue: pick(rnd, [0, 5, 10, 10, 15]), isIncl, categoryId: 1 };
    products.push(product);
    const extras = Array.from({ length: Math.floor(rnd() * 3) }, (_, k) => ({
      id: 500 + k, name: `X${k}`, price: money3(rnd, 0.05, 3), qty: 1 + Math.floor(rnd() * 4), typeId: 1,
    }));
    const item: any = {
      uniqueId: `u${i}`, productId: id, quantity: 1 + Math.floor(rnd() * 4),
      price: product.price, isIncl, product, extras, modifiers: [], messages: [],
    };
    if (discountMode === "item" && rnd() < 0.7) {
      if (rnd() < 0.5) { item.discountType = "percentage"; item.discountValue = pick(rnd, [5, 10, 25, 50, 100]); }
      else { item.discountType = "amount"; item.discountValue = money3(rnd, 0.1, product.price * item.quantity * 1.2); }
    }
    items.push(item);
  }
  const billDiscount = discountMode === "bill"
    ? (rnd() < 0.5
        ? { type: "percentage" as const, value: pick(rnd, [5, 10, 15, 50]) }
        : { type: "amount" as const, value: money3(rnd, 0.1, 20) })
    : null;
  return { seed, vatOn, sc, levy, discCalc, view, orderType, deliveryCharge, billDiscount, products, items };
};

const applyConfig = (s: Scenario) => {
  localStorage.clear();
  localStorage.setItem("posConfigs", JSON.stringify({
    configs: {
      vatStatus: s.vatOn, serviceCharges: s.sc, levy: s.levy, deliveryCharge: s.deliveryCharge,
      discountCalc: s.discCalc, priceView: s.view,
    },
  }));
  localStorage.setItem("priceView", s.view);
  localStorage.setItem("printPrice", s.view);
  localStorage.setItem("discCalc", s.discCalc);
  localStorage.setItem("decimalPart", "3");
};

// ── INDEPENDENT reference model (plain floats, written from the rules, not from engine.ts) ──
const reference = (s: Scenario) => {
  const isDineIn = s.orderType.id === 1;
  const scR = isDineIn ? s.sc / 100 : 0;
  const levyR = s.levy / 100;
  const lines = s.items.map((it) => {
    const vatR = s.vatOn ? it.product.vatValue / 100 : 0;
    const factor = (1 + scR) * (1 + levyR) * (1 + vatR);
    const baseUnit = it.isIncl ? it.price / factor : it.price;
    const extrasGross = it.extras.reduce((a: number, e: any) => a + e.price * (e.qty || 1), 0);
    const amount = it.quantity * baseUnit + extrasGross / factor;
    return { it, factor, vatR, amount };
  });
  const totalBase = lines.reduce((a, l) => a + l.amount, 0);
  const totalGross = lines.reduce((a, l) => a + l.amount * l.factor, 0);

  let discounts: number[];
  if (s.billDiscount) {
    const v = s.billDiscount.value;
    let e = s.billDiscount.type === "percentage" ? totalBase * v / 100
      : s.discCalc === "Inclusive" ? v * totalBase / totalGross : v;
    e = Math.min(totalBase, e);
    discounts = lines.map((l) => (totalBase > 0 ? e * l.amount / totalBase : 0));
  } else {
    discounts = lines.map((l) => {
      const v = Number(l.it.discountValue) || 0;
      if (v <= 0) return 0;
      if (l.it.discountType === "percentage") return l.amount * Math.min(100, v) / 100;
      if (s.discCalc === "Inclusive") return Math.min(l.amount * l.factor, v) / l.factor;
      return Math.min(l.amount, v);
    });
  }

  let sc = 0, levy = 0, vat = 0, vatBase = 0, linesNet = 0;
  lines.forEach((l, i) => {
    const net = Math.max(0, l.amount - discounts[i]);
    const lsc = net * scR;
    const llevy = (net + lsc) * levyR;
    const lvb = net + lsc + llevy;
    const lvat = lvb * l.vatR;
    sc += lsc; levy += llevy; vatBase += lvb; vat += lvat; linesNet += lvb + lvat;
  });
  const delivery = s.orderType.id === 4 ? s.deliveryCharge : 0;
  return { sc, levy, vat, vatBase, linesNet, delivery, grandTotal: linesNet + delivery, discount: discounts.reduce((a, b) => a + b, 0) };
};

const engineSettings = (s: Scenario): PricingSettings => ({
  vatEnabled: s.vatOn,
  defaultVatRate: 10,
  serviceChargeRate: s.orderType.id === 1 ? s.sc : 0,
  levyRate: s.levy,
  discountCalc: s.discCalc,
  priceView: s.view,
});

const engineBill = (s: Scenario) => priceBill({
  lines: s.items.map((it) => ({
    qty: it.quantity, unitPrice: it.price, priceIncludesTax: it.isIncl, vatRate: it.product.vatValue,
    extras: it.extras.map((e: any) => ({ price: e.price, qty: e.qty })),
    discount: s.billDiscount ? null : (Number(it.discountValue) > 0 ? { type: it.discountType, value: Number(it.discountValue) } : null),
  })),
  billDiscount: s.billDiscount,
  deliveryCharge: s.orderType.id === 4 ? s.deliveryCharge : 0,
}, engineSettings(s));

const screen = (s: Scenario) => calculateOrder(s.items.map((i) => ({ ...i })), {
  orderType: s.orderType.name, orderTypeId: s.orderType.id,
  productCache: Object.fromEntries(s.products.map((p) => [p.id, p])),
  billDiscountValue: s.billDiscount?.value, billDiscountType: s.billDiscount?.type,
  customDeliveryCharge: s.orderType.id === 4 ? s.deliveryCharge : null,
});

const save = (s: Scenario, calc: ReturnType<typeof screen>) => buildDirectSettleOrderPayload({
  cartDetails: calc.lines, tax: calc.summary.vatAmount, total: calc.summary.grandTotal,
  deliveryCharge: calc.summary.deliveryCharge,
  selectedOrderTypeName: s.orderType.name, selectedOrderTypeId: s.orderType.id,
  billDiscountValue: s.billDiscount?.value ?? 0, billDiscountType: s.billDiscount?.type ?? "percentage",
} as any, { userId: 1, employeeId: 1, customerId: 1, transDate: "2026-11-05" } as any);

/** What the backend stores and returns = the exclusive values the POS sent (R9). */
const storedFromPayload = (s: Scenario, payload: any) => ({
  masterData: {
    orderNo: 7000 + s.seed, ticketNo: 7000 + s.seed, orderType: s.orderType.name, orderTypeId: s.orderType.id,
    deliveryCharge: payload.deliveryCharge, discAmount: payload.discAmount, discPer: payload.discPer,
    serviceCharge: payload.serviceCharge, levy: payload.levy,
    vatExclAmount: payload.vatExclAmount, vatAmount: payload.vatAmount, netAmount: payload.netAmount,
  },
  detailsData: payload.details.map((d: any, i: number) => ({
    qty: d.qty, productId: d.productId, productName: s.items[i].product.name,
    price: d.price, amount: d.price * d.qty, discAmount: d.discAmount,
    serviceCharge: d.serviceCharge, levy: d.levy, vatAmount: d.vatAmount,
    vatValue: s.vatOn ? s.items[i].product.vatValue : 0, mapId: d.mapId,
  })),
  modifiersData: (payload.modifiers || [])
    .filter((m: any) => Number(m.amount) > 0 || Number(m.price) > 0)
    .map((m: any) => ({ ...m, modifierName: `X${m.modifierId}`, typeName: "" })),
});

const SEEDS = Array.from({ length: 200 }, (_, i) => i + 1);
const TOL = 1e-6;
const close = (a: number, b: number, tol = TOL) => Math.abs(a - b) <= tol * Math.max(1, Math.abs(b));

describe("POS cross-verification (200 random carts)", () => {
  beforeEach(() => localStorage.clear());

  it("1. engine = independent reference model (grand total, VAT, service charge, levy, discount)", () => {
    const failures: string[] = [];
    for (const seed of SEEDS) {
      const s = makeScenario(seed);
      const ref = reference(s);
      const t = engineBill(s).totals;
      const checks: [string, number, number][] = [
        ["grandTotal", t.grandTotal, ref.grandTotal], ["vatAmount", t.vatAmount, ref.vat],
        ["serviceCharge", t.serviceCharge, ref.sc], ["levy", t.levy, ref.levy],
        ["vatExclAmount", t.vatExclAmount, ref.vatBase], ["discountExclusive", t.discountExclusive, ref.discount],
      ];
      for (const [k, got, want] of checks) if (!close(got, want)) failures.push(`seed ${seed} ${k}: engine ${got} ≠ reference ${want}`);
    }
    expect(failures).toEqual([]);
  });

  it("2. engine identities hold on every line and on the totals", () => {
    const failures: string[] = [];
    for (const seed of SEEDS) {
      const s = makeScenario(seed);
      const bill = engineBill(s);
      bill.lines.forEach((l, i) => {
        const id = `seed ${seed} line ${i}`;
        if (!close(l.netValue, l.amount - l.discountBase)) failures.push(`${id}: net ≠ amount − discount`);
        if (!close(l.vatBase, l.netValue + l.serviceCharge + l.levy)) failures.push(`${id}: vatBase ≠ net + sc + levy`);
        if (!close(l.lineNet, l.vatBase + l.vatAmount)) failures.push(`${id}: lineNet ≠ vatBase + vat`);
        if (l.discountBase > l.amount + 1e-12) failures.push(`${id}: discount exceeds the line`);
        // R1: an inclusive line with no discount costs exactly its price × qty + extras.
        const it = s.items[i];
        if (it.isIncl && l.discountBase === 0 && !close(l.lineNet, it.price * it.quantity + l.extrasGross)) {
          failures.push(`${id}: inclusive line ${l.lineNet} ≠ price×qty+extras ${it.price * it.quantity + l.extrasGross}`);
        }
      });
      const t = bill.totals;
      const sum = (f: (l: any) => number) => bill.lines.reduce((a, l) => a + f(l), 0);
      if (!close(t.linesNet, sum((l) => l.lineNet))) failures.push(`seed ${seed}: linesNet ≠ Σ lines`);
      if (!close(t.grandTotal, t.linesNet + t.deliveryCharge)) failures.push(`seed ${seed}: grand ≠ lines + delivery`);
      if (!close(t.vatExclAmount + t.vatAmount, t.linesNet)) failures.push(`seed ${seed}: vatExcl + vat ≠ linesNet`);
      if (s.billDiscount?.type === "amount" && s.discCalc === "Inclusive") {
        // An inclusive fixed bill discount takes exactly the typed amount off the bill (when it fits).
        const before = sum((l) => l.grossAmount);
        if (s.billDiscount.value <= before && !close(t.billDiscountInclusive, s.billDiscount.value)) {
          failures.push(`seed ${seed}: inclusive bill discount ${t.billDiscountInclusive} ≠ typed ${s.billDiscount.value}`);
        }
      }
    }
    expect(failures).toEqual([]);
  });

  it("3. screen = engine = saved order payload = sales invoice", () => {
    const failures: string[] = [];
    for (const seed of SEEDS) {
      const s = makeScenario(seed);
      applyConfig(s);
      const t = engineBill(s).totals;
      const calc = screen(s);
      const c = calc.summary;
      const p = save(s, calc) as any;
      const inv = buildSalesInvoicePayload({
        orderPayload: p, payments: [{ paymodeId: 1, amount: p.netAmount }],
        employeeId: 1, dayId: 1, shiftId: 1, transDate: "2026-11-05",
      }) as any;
      const id = `seed ${seed} (${s.orderType.name}, view ${s.view}, disc ${s.discCalc}, vat ${s.vatOn})`;
      const eq = (k: string, got: number, want: number) => { if (!close(got, want)) failures.push(`${id} ${k}: ${got} ≠ ${want}`); };

      eq("screen.grandTotal", c.grandTotal, t.grandTotal);
      eq("screen.vatAmount", c.vatAmount, t.vatAmount);
      eq("screen.serviceCharge", c.serviceCharge, t.serviceCharge);
      eq("screen.levy", c.levy, t.levy);
      eq("screen.deliveryCharge", c.deliveryCharge, t.deliveryCharge);

      eq("payload.netAmount", p.netAmount, t.grandTotal);
      eq("payload.vatAmount", p.vatAmount, t.vatAmount);
      eq("payload.serviceCharge", p.serviceCharge, t.serviceCharge);
      eq("payload.levy", p.levy, t.levy);
      eq("payload.vatExcl+vat+delivery", p.vatExclAmount + p.vatAmount + p.deliveryCharge, p.netAmount);
      eq("payload Σdetail.netAmount + delivery", p.details.reduce((a: number, d: any) => a + d.netAmount, 0) + p.deliveryCharge, p.netAmount);
      eq("payload Σdetail.vatAmount", p.details.reduce((a: number, d: any) => a + d.vatAmount, 0), p.vatAmount);
      // R9: detail prices are exclusive. Agreed "combined product price" rule (combinedProductExtrasPricing
      // test): detail price = (product base + extras base) ÷ qty; modifier rows carry the extras for reference.
      const lines = engineBill(s).lines;
      p.details.forEach((d: any, i: number) => {
        eq(`payload.detail[${i}].price (exclusive, incl. extras)`, d.price, lines[i].amount / lines[i].qty);
      });

      eq("invoice.netAmount", inv.netAmount, p.netAmount);
      eq("invoice.vatAmount", inv.vatAmount, p.vatAmount);
      eq("invoice.deliveryCharge", inv.deliveryCharge ?? 0, p.deliveryCharge ?? 0);
    }
    expect(failures).toEqual([]);
  });

  it("4. saved order → recall footer (Inclusive and Exclusive view) = saved total", () => {
    const failures: string[] = [];
    for (const seed of SEEDS) {
      const s = makeScenario(seed);
      applyConfig(s);
      const p = save(s, screen(s)) as any;
      for (const view of ["Inclusive", "Exclusive"] as const) {
        localStorage.setItem("priceView", view);
        const data = applyStoredOrderView({ data: JSON.parse(JSON.stringify(storedFromPayload(s, p))) }, view).data;
        const f = storedOrderFooter(data, view);
        if (!close(f.netAmount, p.netAmount, 1e-5)) failures.push(`seed ${seed} ${view}: footer ${f.netAmount} ≠ saved ${p.netAmount}`);
        if (!close(f.vatAmount, p.vatAmount, 1e-5)) failures.push(`seed ${seed} ${view}: footer VAT ${f.vatAmount} ≠ saved ${p.vatAmount}`);
      }
    }
    expect(failures).toEqual([]);
  });

  it("5. saved order → cart via the shared loader (Settled → Edit, Recall → Edit, Recall → Settle), unchanged = saved total", () => {
    const failures: string[] = [];
    for (const seed of SEEDS) {
      const s = makeScenario(seed);
      applyConfig(s);
      const p = save(s, screen(s)) as any;
      if (p.netAmount <= 0) continue; // fully discounted bills are covered by the complimentary tests
      const productCache = Object.fromEntries(s.products.map((x) => [x.id, x]));
      const data = applyStoredOrderView({ data: JSON.parse(JSON.stringify(storedFromPayload(s, p))) }, s.view).data;
      for (const mode of ["settledEdit", "recallEdit", "recallSettle"] as const) {
        const actions: any[] = [];
        const load = buildSavedOrderLoad(JSON.parse(JSON.stringify(data)), { mode, orderId: 7000 + seed, products: s.products, productCache });
        dispatchSavedOrderLoad(load, ((a: any) => { actions.push(a); return a; }) as any, 7000 + seed);
        let state = posReducer(undefined, { type: "@@init" } as any);
        for (const a of actions) if (a?.type) state = posReducer(state, a);
        state = { ...state, productCache } as any;
        const total = selectCartCalculation({ pos: { ...state, isCartModified: true } } as any).summary.grandTotal;
        if (!close(total, p.netAmount, 1e-4)) {
          failures.push(`seed ${seed} ${mode} (${s.orderType.name}, view ${s.view}, disc ${s.discCalc}, bill ${JSON.stringify(s.billDiscount)}): cart ${total} ≠ saved ${p.netAmount}`);
        }
        if (!close(load.netAmount, p.netAmount, 1e-5)) failures.push(`seed ${seed} ${mode}: load.netAmount ${load.netAmount} ≠ saved ${p.netAmount}`);
      }
    }
    expect(failures).toEqual([]);
  });

  it("6. saved order → print pricing (Inclusive and Exclusive print) = saved total", () => {
    const failures: string[] = [];
    for (const seed of SEEDS) {
      const s = makeScenario(seed);
      applyConfig(s);
      const p = save(s, screen(s)) as any;
      const stored = storedFromPayload(s, p);
      for (const printPrice of ["Inclusive", "Exclusive"] as const) {
        const pricing = buildPrintPricing(JSON.parse(JSON.stringify(stored)), {
          dataView: "Exclusive", printPrice, orderType: s.orderType.name, products: s.products,
        });
        if (!close(pricing.summary.grandTotal, p.netAmount, 1e-5)) {
          failures.push(`seed ${seed} print ${printPrice}: ${pricing.summary.grandTotal} ≠ saved ${p.netAmount}`);
        }
      }
    }
    expect(failures).toEqual([]);
  });

  it("7. split: a saved order split into two bills (same steps as the split screen) adds up to the saved total", () => {
    const failures: string[] = [];
    let checked = 0;
    for (const seed of SEEDS) {
      const s = makeScenario(seed);
      // split is blocked for bill-discount / complimentary orders (any 100 % item)
      if (s.billDiscount || s.items.some((i: any) => i.discountType === "percentage" && Number(i.discountValue) === 100)) continue;
      applyConfig(s);
      const p = save(s, screen(s)) as any;
      for (const view of ["Inclusive", "Exclusive"] as const) {
        localStorage.setItem("priceView", view);
        const data = applyStoredOrderView({ data: JSON.parse(JSON.stringify(storedFromPayload(s, p))) }, view).data;
        const master = data.masterData;
        const orderTypeName = master.orderType || ORDER_TYPE_NAMES[Number(master.orderTypeId)] || "DineIn";
        const config = getBillingConfigForOrder(orderTypeName, deriveOrderChargeRatesFromMaster(data, view));
        const lines = (data.detailsData || []).map((d: any, i: number) => {
          const pricing = storedLineToCartPricing(data, d, view, { productIsInclusive: s.items[i].isIncl, discountCalc: s.discCalc, isBillDiscount: false });
          const mods = (data.modifiersData || []).filter((m: any) => m.mapId === d.mapId).map((m: any, k: number) => ({
            id: m.modifierId, name: m.modifierName, qty: m.qty || 1, typeId: 2,
            price: pricing.extraGrossById.get(Number(m.modifierId)) ?? pricing.extraGrossList[k] ?? 0,
          }));
          return { d, pricing, mods };
        });
        const bucket = (part: "A" | "B") => calculateOrder(lines.map(({ d, pricing, mods }: any, i: number) => {
          const q = Number(d.qty);
          const a = Math.max(1, Math.floor(q / 2));
          const qty = part === "A" ? a : q - a;
          const disc = pricing.discount;
          // same rule as PosSplitModal.moveItem: percentages keep their rate; a fixed discount moves by
          // quantity, capped at the moved part's product value (it carries no extras); the base keeps the rest.
          let discountValue = 0;
          if (disc) {
            if (disc.type === "percentage") discountValue = disc.value;
            else {
              const settings = toPricingSettings(config);
              const pl = priceLine({ qty: q - a, unitPrice: pricing.price, priceIncludesTax: pricing.isIncl, vatRate: Number(pricing.savedVatRate ?? 10), extras: [] }, settings);
              const cap = settings.discountCalc === "Inclusive" ? pl.grossAmount : pl.amount;
              const moved = q - a > 0 ? Math.min(disc.value * (q - a) / q, cap) : 0;
              discountValue = part === "B" ? moved : disc.value - moved;
            }
          }
          return {
            uniqueId: `${part}${i}`, productId: d.productId, quantity: qty, price: pricing.price, isIncl: pricing.isIncl,
            discountValue, discountType: disc?.type ?? "percentage",
            extras: part === "A" ? mods.filter((m: any) => m.price > 0) : [],
            product: { id: d.productId, name: "x", price: pricing.price, categoryId: 0, vatValue: pricing.savedVatRate },
          };
        }).filter((l: any) => l.quantity > 0), {
          orderType: orderTypeName, config,
          // same rule as PosSplitModal.bucketDeliveryCharge: delivery stays on the base bill only
          customDeliveryCharge: part === "A" ? Number(master.deliveryCharge) || 0 : 0,
        }).summary.grandTotal;
        const total = bucket("A") + bucket("B");
        checked++;
        if (!close(total, p.netAmount, 1e-5)) failures.push(`seed ${seed} ${view}: A+B ${total} ≠ saved total ${p.netAmount}`);
      }
    }
    expect(checked).toBeGreaterThan(100);
    expect(failures).toEqual([]);
  });
});
