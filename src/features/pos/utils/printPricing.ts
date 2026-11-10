/**
 * PRINT PRICING — the numbers every guest bill / settled bill / recall print shows.
 *
 * Rule: the print follows the PRINT PRICE setting (Inclusive / Exclusive), independently of the
 * screen's Price View. All amounts come from the STORED order values and each line's own saved
 * rates (service charge, levy, VAT) — never from the current settings and never guessed.
 *
 * Names, extras, modifiers and messages come from orderLineShape, which calculates nothing.
 */
import { buildOrderLineShapes, orderHasBillDiscount, orderHasVat } from "./orderLineShape";
import type { UnifiedOrderLine, UnifiedOrderPricingResult, BuildUnifiedPricingOptions } from "./orderPricing";
import { calculateOrder } from "../terminal/utils/billing";
import { storedLineRates, dedupeModifierRows, storedOrderCharges } from "../pricing";
import { round } from "../pricing/money";

type View = "Inclusive" | "Exclusive";

const n = (v: unknown): number => {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
};
/** 14-decimal half-up (pricing/money.ts) — never truncated. */
const r14 = (v: number) => round(v);
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
 * Build the pricing a print template consumes, with summary.printPrice set so the template uses it directly.
 */
export const buildPrintPricing = (order: any, options: PrintPricingOptions): UnifiedOrderPricingResult => {
  const { dataView, printPrice, ...unifiedOptions } = options;
  const rawDetails = order?.detailsData || order?.details;
  const details: any[] = Array.isArray(rawDetails) ? rawDetails : [];

  const master = masterOf(order);
  const isBill = Boolean(orderHasBillDiscount(order, unifiedOptions) || n(pickField(master, "discAmount", "DiscAmount")) > 0);
  const modifiers: any[] = order?.modifiersData || order?.modifiers || [];

  let subEx = 0, subIn = 0, discEx = 0, discIn = 0;

  const lines = (details.length > 0 ? buildOrderLineShapes(order, unifiedOptions) : []).map((line, i) => {
    const d = details[i];
    const s = lineNumbers(order, d, dataView);
    const exclusiveRate = r14(s.amount / s.qty);
    const inclusiveRate = r14((s.amount * s.factor) / s.qty);
    const exclusiveGross = r14(s.amount);
    const inclusiveGross = r14(s.amount * s.factor);
    // Bill discount is printed once, in the footer — rows show no per-line discount (same as the screen).
    const lineDiscountExcl = isBill ? 0 : r14(s.disc);
    const lineDiscountIncl = isBill ? 0 : r14(s.disc * s.factor);
    const exclusiveAmount = r14(Math.max(0, s.amount - s.disc));
    const inclusiveAmount = r14(Math.max(0, (s.amount - s.disc) * s.factor));
    subEx += exclusiveGross; subIn += inclusiveGross; discEx += r14(s.disc); discIn += r14(s.disc * s.factor);

    const mapId = n(pickField(d, "mapId", "MapId"));
    const lineMods = dedupeModifierRows(modifiers).filter((m: any) => n(pickField(m, "mapId", "MapId")) === mapId && n(pickField(m, "price", "Price")) > 0);
    const extras = (line.extras || []).map((ex: any, k: number) => {
      const mod = lineMods.find((m) => n(pickField(m, "modifierId", "ModifierId")) === n(ex.id ?? ex.modifierId)) ?? lineMods[k];
      const exExcl = r14(dataView === "Inclusive" ? n(mod ? mod.price : ex.price) / s.factor : n(mod ? mod.price : ex.price));
      const exIncl = r14(exExcl * s.factor);
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
  const subTotalExclusive = r14(subEx);
  const subTotalInclusive = r14(subIn);
  const totalDiscountExcl = r14(discEx);
  const totalDiscountIncl = r14(discIn);
  const netValue = r14(Math.max(0, subTotalExclusive - totalDiscountExcl) + serviceCharge + levy);
  const grandTotal = n(pickField(master, "netAmount", "NetAmount")) || r14(netValue + deliveryCharge + vatAmount);

  return {
    lines,
    summary: {
      isVatActive: orderHasVat(order, unifiedOptions),
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
      charges: r14(serviceCharge + levy),
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
    const exclusiveGross = r14(p.amount * ratio);
    const inclusiveGross = r14(p.grossAmount * ratio);
    const dEx = r14(p.discountBase * ratio);
    const dIn = r14(p.discountGross * ratio);
    const lineDiscountExcl = isBill ? 0 : dEx;
    const lineDiscountIncl = isBill ? 0 : dIn;
    const exclusiveAmount = r14(p.netValue * ratio);
    const inclusiveAmount = r14(p.lineNet * ratio);
    const exclusiveRate = p.qty > 0 ? r14(p.amount / p.qty) : 0;
    const inclusiveRate = p.qty > 0 ? r14(p.grossAmount / p.qty) : 0;
    subEx += exclusiveGross; subIn += inclusiveGross; discEx += dEx; discIn += dIn;
    sc += p.serviceCharge * ratio; levy += p.levy * ratio; vat += p.vatAmount * ratio; net += p.lineNet * ratio;
    return {
      ...line,
      exclusiveRate, inclusiveRate, exclusiveGross, inclusiveGross, exclusiveAmount, inclusiveAmount,
      lineDiscount: lineDiscountExcl, lineDiscountExcl, lineDiscountIncl,
      vatAmount: r14(p.vatAmount * ratio), vatRate: p.vatRate,
      getRate: (incl: boolean) => (incl ? inclusiveRate : exclusiveRate),
      getAmount: (incl: boolean, isBillDisc?: boolean) =>
        (isBillDisc ?? isBill) ? (incl ? inclusiveGross : exclusiveGross) : (incl ? inclusiveAmount : exclusiveAmount),
      getDiscount: (incl?: boolean) => (incl ? lineDiscountIncl : lineDiscountExcl),
    };
  });

  const deliveryCharge = n(options.deliveryCharge);
  const subTotalExclusive = r14(subEx), subTotalInclusive = r14(subIn);
  const totalDiscountExcl = r14(discEx), totalDiscountIncl = r14(discIn);
  const serviceCharge = r14(sc), levyTotal = r14(levy), vatAmount = r14(vat);
  const netValue = r14(Math.max(0, subTotalExclusive - totalDiscountExcl) + serviceCharge + levyTotal);
  const grandTotal = r14(net + deliveryCharge);
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
      taxableBase: netValue, serviceCharge, levy: levyTotal, charges: r14(serviceCharge + levyTotal),
      netValue, vatExclAmount: netValue, deliveryCharge, vatAmount, grandTotal, netAmount: grandTotal,
      isBillDiscount: isBill,
      getSubTotal: (incl: boolean) => (incl ? subTotalInclusive : subTotalExclusive),
      getTotalDiscount: (incl: boolean) => (incl ? totalDiscountIncl : totalDiscountExcl),
    },
  } as UnifiedOrderPricingResult;
};

/**
 * A live cart priced by the cart engine alone, with no old pricing underneath.
 * Returns null when the lines are not a live cart.
 */
export const buildLiveCartPricing = (
  cartItems: any[],
  options: { printPrice: View; deliveryCharge?: number; orderType?: string; [key: string]: any }
): UnifiedOrderPricingResult | null => {
  if (!Array.isArray(cartItems) || cartItems.length === 0) return null;
  const base = { lines: buildOrderLineShapes(cartItems, options), summary: { isVatActive: orderHasVat(cartItems, options) } } as unknown as UnifiedOrderPricingResult;
  return applyCartPricingToUnified(base, cartItems, options);
};

/**
 * Rows that are not a live cart. Rows already priced from the saved order stay exactly as they are.
 * Any other row prints the amounts it carries: baseAmount (or lineTotal, amount, price x quantity) exclusive,
 * netAmount (or lineNetAmount) inclusive. Nothing is worked out from tax settings.
 */
export const buildRowLines = (rows: any[], options?: Record<string, any>): UnifiedOrderLine[] =>
  buildOrderLineShapes(rows, options).map((shape: any, i) => {
    const row = rows[i];
    if (row?.isUnifiedPricingLine === true) return row as UnifiedOrderLine;
    const qty = shape.quantity;
    const exclusive = n(row?.baseAmount) || n(row?.lineTotal) || n(row?.amount) || n(row?.price) * qty;
    const inclusive = n(row?.netAmount) || n(row?.lineNetAmount) || exclusive;
    const exclusiveRate = r14(exclusive / qty);
    const inclusiveRate = r14(inclusive / qty);
    return {
      ...shape,
      exclusiveRate, inclusiveRate,
      exclusiveGross: exclusive, inclusiveGross: inclusive,
      exclusiveAmount: exclusive, inclusiveAmount: inclusive,
      lineDiscount: 0, lineDiscountExcl: 0, lineDiscountIncl: 0,
      vatAmount: n(row?.vatAmount), vatRate: 0,
      getRate: (incl: boolean) => (incl ? inclusiveRate : exclusiveRate),
      getAmount: (incl: boolean) => (incl ? inclusive : exclusive),
      getDiscount: () => 0,
    } as UnifiedOrderLine;
  });

/**
 * A guest bill for rows that are not a live cart: the rows print their own amounts. Only the Sub Total is summed here;
 * the bill takes discount, charges, VAT and Grand Total from its print data, which holds the saved order's totals.
 */
export const buildRowPricing = (rows: any[], options: { printPrice: View; [key: string]: any }): UnifiedOrderPricingResult => {
  const lines = buildRowLines(rows, options);
  return {
    lines,
    summary: {
      isVatActive: orderHasVat(rows, options),
      printPrice: options.printPrice,
      priceView: options.printPrice,
      isTaxInclusive: options.printPrice === "Inclusive",
      subTotalExclusive: r14(lines.reduce((sum, l) => sum + n(l.exclusiveGross), 0)),
      subTotalInclusive: r14(lines.reduce((sum, l) => sum + n(l.inclusiveGross), 0)),
      isBillDiscount: orderHasBillDiscount(rows, options),
    },
  } as unknown as UnifiedOrderPricingResult;
};
