/**
 * PRINT PRICING — the numbers every guest bill / settled bill / recall print shows.
 *
 * Rule: the print follows the PRINT PRICE setting (Inclusive / Exclusive), independently of the
 * screen's Price View. All amounts come from the STORED order values and each line's own saved
 * rates (service charge, levy, VAT) — never from the current settings and never guessed.
 *
 * Names, extras, modifiers and messages still come from buildUnifiedOrderPricing (unchanged);
 * only the numbers are replaced.
 */
import { buildUnifiedOrderPricing } from "./orderPricing";
import type { UnifiedOrderPricingResult, BuildUnifiedPricingOptions } from "./orderPricing";
import { calculateOrder } from "../terminal/utils/billing";
import { storedLineRates, dedupeModifierRows, storedOrderCharges } from "../pricing";

type View = "Inclusive" | "Exclusive";

const n = (v: unknown): number => {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
};
const r7 = (v: number) => Math.round(v * 1e7) / 1e7;
const pickField = (d: any, ...keys: string[]) => {
  for (const k of keys) if (d?.[k] !== undefined && d?.[k] !== null) return d[k];
  return undefined;
};
const masterOf = (order: any) => {
  const raw = order?.masterData || order?.master || {};
  return Array.isArray(raw) ? raw[0] || {} : raw;
};

/** Order-level factor (1+sc)(1+levy)(1+vat) from stored master totals — view-independent. */
const orderFactor = (order: any): number => {
  const m = masterOf(order);
  const vatExcl = n(pickField(m, "vatExclAmount", "VatExclAmount"));
  const net = vatExcl - n(pickField(m, "serviceCharge", "ServiceCharge")) - n(pickField(m, "levyAmt", "levy", "Levy"));
  const vat = n(pickField(m, "vatAmount", "VatAmount"));
  return net > 0.0000005 ? (vatExcl + vat) / net : 1;
};

interface StoredLineNumbers {
  qty: number;
  factor: number;
  amount: number; // exclusive, before discount (product + extras)
  disc: number; // exclusive
  vatAmount: number;
  vatRate: number;
}

/** Exclusive numbers + factor of one saved line, from data in `view`. */
const lineNumbers = (order: any, d: any, view: View): StoredLineNumbers => {
  const qty = n(pickField(d, "qty", "Qty", "quantity")) || 1;
  const rawAmount = n(pickField(d, "amount", "Amount")) || n(pickField(d, "price", "Price")) * qty;
  const rawDisc = n(pickField(d, "discAmount", "DiscAmount"));
  const vat = n(pickField(d, "vatAmount", "VatAmount"));

  // Saved rates of this line (robust to rounded stored amounts) — shared with recall / edit.
  const rates = storedLineRates(order, d, view, {
    serviceCharge: 0, levy: 0, vat: (orderFactor(order) - 1) * 100,
  });
  const f = rates.factor;
  const toExcl = (v: number) => (view === "Inclusive" ? v / f : v);
  return { qty, factor: f, amount: toExcl(rawAmount), disc: toExcl(rawDisc), vatAmount: vat, vatRate: rates.vat };
};

export interface PrintPricingOptions extends BuildUnifiedPricingOptions {
  /** price view the order data was fetched in */
  dataView: View;
  /** the Print Price setting */
  printPrice: View;
}

/**
 * Build the pricing a print template consumes. Same shape as buildUnifiedOrderPricing, with
 * summary.printPrice set so the template uses it directly.
 */
export const buildPrintPricing = (order: any, options: PrintPricingOptions): UnifiedOrderPricingResult => {
  const { dataView, printPrice, ...unifiedOptions } = options;
  // Names / extras / modifiers: build with the view the data is actually in (no conversion needed).
  const unified = buildUnifiedOrderPricing(order, { ...unifiedOptions, priceView: dataView, printPrice: dataView });

  const details: any[] = order?.detailsData || order?.details || [];
  if (!Array.isArray(details) || details.length === 0 || unified.lines.length !== details.length) {
    // Not a saved order (or unexpected shape): keep the previous behaviour.
    return buildUnifiedOrderPricing(order, { ...unifiedOptions, priceView: printPrice, printPrice });
  }

  const master = masterOf(order);
  const isBill = Boolean(unified.summary.isBillDiscount || n(pickField(master, "discAmount", "DiscAmount")) > 0);
  const modifiers: any[] = order?.modifiersData || order?.modifiers || [];

  let subEx = 0, subIn = 0, discEx = 0, discIn = 0;

  const lines = unified.lines.map((line, i) => {
    const d = details[i];
    const s = lineNumbers(order, d, dataView);
    const exclusiveRate = r7(s.amount / s.qty);
    const inclusiveRate = r7((s.amount * s.factor) / s.qty);
    const exclusiveGross = r7(s.amount);
    const inclusiveGross = r7(s.amount * s.factor);
    // Bill discount is printed once, in the footer — rows show no per-line discount (same as the screen).
    const lineDiscountExcl = isBill ? 0 : r7(s.disc);
    const lineDiscountIncl = isBill ? 0 : r7(s.disc * s.factor);
    const exclusiveAmount = r7(Math.max(0, s.amount - s.disc));
    const inclusiveAmount = r7(Math.max(0, (s.amount - s.disc) * s.factor));
    subEx += exclusiveGross; subIn += inclusiveGross; discEx += r7(s.disc); discIn += r7(s.disc * s.factor);

    const mapId = n(pickField(d, "mapId", "MapId"));
    const lineMods = dedupeModifierRows(modifiers).filter((m: any) => n(pickField(m, "mapId", "MapId")) === mapId && n(pickField(m, "price", "Price")) > 0);
    const extras = (line.extras || []).map((ex: any, k: number) => {
      const mod = lineMods.find((m) => n(pickField(m, "modifierId", "ModifierId")) === n(ex.id ?? ex.modifierId)) ?? lineMods[k];
      if (!mod) return ex;
      const exExcl = r7(dataView === "Inclusive" ? n(mod.price) / s.factor : n(mod.price));
      const exIncl = r7(exExcl * s.factor);
      return { ...ex, price: exExcl, exclusivePrice: exExcl, inclusivePrice: exIncl, getPrice: (incl: boolean) => (incl ? exIncl : exExcl) };
    });

    return {
      ...line,
      exclusiveRate,
      inclusiveRate,
      exclusiveGross,
      inclusiveGross,
      exclusiveAmount,
      inclusiveAmount,
      lineDiscount: lineDiscountExcl,
      lineDiscountExcl,
      lineDiscountIncl,
      vatAmount: s.vatAmount,
      vatRate: Math.round(s.vatRate * 1000) / 1000,
      extras,
      getRate: (incl: boolean) => (incl ? inclusiveRate : exclusiveRate),
      getAmount: (incl: boolean, isBillDisc?: boolean) =>
        (isBillDisc ?? isBill) ? (incl ? inclusiveGross : exclusiveGross) : (incl ? inclusiveAmount : exclusiveAmount),
      getDiscount: (incl?: boolean) => (incl ? lineDiscountIncl : lineDiscountExcl),
    };
  });

  // Charges from the lines (the master can be stale after an edit — see storedOrderCharges)
  const { serviceCharge, levy } = storedOrderCharges(order);
  const vatAmount = n(pickField(master, "vatAmount", "VatAmount"));
  const deliveryCharge = n(pickField(master, "deliveryCharge", "DeliveryCharge"));
  const grandTotal = n(pickField(master, "netAmount", "NetAmount")) || unified.summary.grandTotal;
  const subTotalExclusive = r7(subEx);
  const subTotalInclusive = r7(subIn);
  const totalDiscountExcl = r7(discEx);
  const totalDiscountIncl = r7(discIn);
  const netValue = r7(Math.max(0, subTotalExclusive - totalDiscountExcl) + serviceCharge + levy);

  return {
    lines,
    summary: {
      ...unified.summary,
      printPrice,
      priceView: printPrice,
      isTaxInclusive: printPrice === "Inclusive",
      subTotalExclusive,
      subTotalInclusive,
      lineDiscountsTotal: isBill ? 0 : totalDiscountExcl,
      lineDiscountsTotalExcl: isBill ? 0 : totalDiscountExcl,
      lineDiscountsTotalIncl: isBill ? 0 : totalDiscountIncl,
      billDiscountTotal: isBill ? totalDiscountExcl : 0,
      billDiscountTotalExcl: isBill ? totalDiscountExcl : 0,
      billDiscountTotalIncl: isBill ? totalDiscountIncl : 0,
      totalDiscount: totalDiscountExcl,
      totalDiscountExcl,
      totalDiscountIncl,
      taxableBase: netValue,
      serviceCharge,
      levy,
      charges: r7(serviceCharge + levy),
      netValue,
      vatExclAmount: netValue,
      deliveryCharge,
      vatAmount,
      grandTotal,
      netAmount: grandTotal,
      isBillDiscount: isBill,
      getSubTotal: (incl: boolean) => (incl ? subTotalInclusive : subTotalExclusive),
      getTotalDiscount: (incl: boolean) => (incl ? totalDiscountIncl : totalDiscountExcl),
    },
  } as UnifiedOrderPricingResult;
};

/**
 * LIVE CART input (not a saved order): replace the numbers of a unified pricing result with the
 * cart engine's own values (each cart line carries `pricedLine` from calculateOrder), so prints show
 * exactly what the cart shows. Lines printed with a smaller quantity (re-order KOT) are scaled.
 * Returns null when the input is not a live cart.
 */
export const applyCartPricingToUnified = (
  unified: UnifiedOrderPricingResult,
  cartItems: any[],
  options: { printPrice: View; deliveryCharge?: number; orderType?: string }
): UnifiedOrderPricingResult | null => {
  if (!Array.isArray(cartItems) || cartItems.length === 0) return null;
  if (cartItems.some((i: any) => i?.isUnifiedPricingLine === true)) return null;
  // Only real cart lines (engine result attached, or a cart uniqueId + quantity) — saved-order detail rows
  // passed as arrays keep the previous path.
  const isCartLine = (i: any) => Boolean(i?.pricedLine) || (i?.uniqueId !== undefined && i?.quantity !== undefined);
  if (!cartItems.every(isCartLine)) return null;
  if (unified.lines.length !== cartItems.length) return null;

  // Lines without an engine result are priced once here.
  const needsPricing = cartItems.some((i: any) => !i?.pricedLine);
  const priced = needsPricing
    ? calculateOrder(cartItems.map((i: any) => ({ ...i, price: i.catalogPrice ?? i.price })), { orderType: options.orderType || "DineIn" })
    : null;
  const isBill = cartItems.some((i: any) => Number(i?.billDiscountAmount || 0) > 0);

  let subEx = 0, subIn = 0, discEx = 0, discIn = 0, sc = 0, levy = 0, vat = 0, net = 0;
  const lines = unified.lines.map((line, idx) => {
    const item = cartItems[idx];
    const p = item?.pricedLine ?? priced?.lines[idx]?.pricedLine;
    if (!p) return line;
    const ratio = p.qty > 0 ? Number(item.quantity ?? p.qty) / p.qty : 1;
    const exclusiveGross = r7(p.amount * ratio);
    const inclusiveGross = r7(p.grossAmount * ratio);
    const dEx = r7(p.discountBase * ratio);
    const dIn = r7(p.discountGross * ratio);
    const lineDiscountExcl = isBill ? 0 : dEx;
    const lineDiscountIncl = isBill ? 0 : dIn;
    const exclusiveAmount = r7(p.netValue * ratio);
    const inclusiveAmount = r7(p.lineNet * ratio);
    const exclusiveRate = p.qty > 0 ? r7(p.amount / p.qty) : 0;
    const inclusiveRate = p.qty > 0 ? r7(p.grossAmount / p.qty) : 0;
    subEx += exclusiveGross; subIn += inclusiveGross; discEx += dEx; discIn += dIn;
    sc += p.serviceCharge * ratio; levy += p.levy * ratio; vat += p.vatAmount * ratio; net += p.lineNet * ratio;
    return {
      ...line,
      exclusiveRate, inclusiveRate, exclusiveGross, inclusiveGross, exclusiveAmount, inclusiveAmount,
      lineDiscount: lineDiscountExcl, lineDiscountExcl, lineDiscountIncl,
      vatAmount: r7(p.vatAmount * ratio), vatRate: p.vatRate,
      getRate: (incl: boolean) => (incl ? inclusiveRate : exclusiveRate),
      getAmount: (incl: boolean, isBillDisc?: boolean) =>
        (isBillDisc ?? isBill) ? (incl ? inclusiveGross : exclusiveGross) : (incl ? inclusiveAmount : exclusiveAmount),
      getDiscount: (incl?: boolean) => (incl ? lineDiscountIncl : lineDiscountExcl),
    };
  });

  const deliveryCharge = n(options.deliveryCharge);
  const subTotalExclusive = r7(subEx), subTotalInclusive = r7(subIn);
  const totalDiscountExcl = r7(discEx), totalDiscountIncl = r7(discIn);
  const serviceCharge = r7(sc), levyTotal = r7(levy), vatAmount = r7(vat);
  const netValue = r7(Math.max(0, subTotalExclusive - totalDiscountExcl) + serviceCharge + levyTotal);
  const grandTotal = r7(net + deliveryCharge);
  return {
    lines,
    summary: {
      ...unified.summary,
      printPrice: options.printPrice,
      priceView: options.printPrice,
      isTaxInclusive: options.printPrice === "Inclusive",
      subTotalExclusive, subTotalInclusive,
      lineDiscountsTotal: isBill ? 0 : totalDiscountExcl,
      lineDiscountsTotalExcl: isBill ? 0 : totalDiscountExcl,
      lineDiscountsTotalIncl: isBill ? 0 : totalDiscountIncl,
      billDiscountTotal: isBill ? totalDiscountExcl : 0,
      totalDiscount: totalDiscountExcl, totalDiscountExcl, totalDiscountIncl,
      taxableBase: netValue, serviceCharge, levy: levyTotal, charges: r7(serviceCharge + levyTotal),
      netValue, vatExclAmount: netValue, deliveryCharge, vatAmount, grandTotal, netAmount: grandTotal,
      isBillDiscount: isBill,
      getSubTotal: (incl: boolean) => (incl ? subTotalInclusive : subTotalExclusive),
      getTotalDiscount: (incl: boolean) => (incl ? totalDiscountIncl : totalDiscountExcl),
    },
  } as UnifiedOrderPricingResult;
};
