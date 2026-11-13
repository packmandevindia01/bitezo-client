import { orderTypeNameFromId } from "../utils/providerOrderType";
/**
 * Saved (backend) orders.
 *
 * The backend stores exclusive values per line: price/amount (product + extras, exclusive),
 * discAmount, serviceCharge, levy, vatAmount. When asked for priceView=Inclusive it multiplies
 * price/amount/discAmount/modifier price by (1+sc)(1+levy)(1+vat) using the sc/levy passed in
 * the URL — which the POS used to fill from the CURRENT settings (and TakeOut by default),
 * producing wrongly converted prices for Dine-In orders or orders saved before a settings change.
 *
 * Instead we always fetch Exclusive (stored values, untouched) and convert here using the
 * rates each line was actually saved with, derived exactly from its own stored amounts.
 */
import { round } from "./money";

export interface StoredLineRates {
  /** percents */
  serviceCharge: number;
  levy: number;
  vat: number;
  factor: number;
}

const n = (v: unknown): number => {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
};

/** Snap a derived percent to 3 decimals (removes 7-dp storage noise: 9.9999997% → 10%). */
const snapPercent = (p: number) => Math.round(p * 1000) / 1000;

const withFactor = (r: Omit<StoredLineRates, "factor">): StoredLineRates => ({
  ...r,
  factor: (1 + r.serviceCharge / 100) * (1 + r.levy / 100) * (1 + r.vat / 100),
});

const field = (d: any, ...keys: string[]) => {
  for (const k of keys) if (d?.[k] !== undefined && d?.[k] !== null) return d[k];
  return undefined;
};

/** Rates a saved line was priced with, or null when they cannot be derived (net value 0). */
export const deriveStoredLineRates = (detail: any): StoredLineRates | null => {
  const amount = n(field(detail, "amount", "Amount")) || n(field(detail, "price", "Price")) * (n(field(detail, "qty", "Qty")) || 1);
  const disc = n(field(detail, "discAmount", "DiscAmount"));
  const sc = n(field(detail, "serviceCharge", "ServiceCharge"));
  const levy = n(field(detail, "levy", "Levy", "levyAmt"));
  const vat = n(field(detail, "vatAmount", "VatAmount"));
  const net = amount - disc;
  if (net <= 0.0000005) return null;
  const vatBase = net + sc + levy;
  return withFactor({
    serviceCharge: snapPercent((sc / net) * 100),
    levy: snapPercent((levy / (net + sc)) * 100),
    vat: vatBase > 0 ? snapPercent((vat / vatBase) * 100) : 0,
  });
};

export interface StoredOrderParts {
  masterData?: any;
  detailsData?: any[] | null;
  modifiersData?: any[] | null;
  [key: string]: any;
}

/**
 * Rates for every line of a saved order, keyed by mapId.
 * Lines whose rates cannot be derived (100% discount) use the order's other lines,
 * then `fallback` (current configuration for that order type).
 */
export const deriveStoredOrderRates = (
  order: StoredOrderParts,
  fallback: StoredLineRates
): Map<number, StoredLineRates> => {
  const details = order?.detailsData || [];
  // Lines with nothing to derive from (fully discounted) use the master rates, then another line's, then fallback.
  const otherLine = details.map((d) => deriveStoredLineRates(d)).find((r): r is StoredLineRates => r !== null);
  const result = new Map<number, StoredLineRates>();
  details.forEach((d) => {
    const mapId = n(field(d, "mapId", "MapId"));
    result.set(mapId, storedLineRates(order, d, "Exclusive", otherLine ?? fallback));
  });
  return result;
};

export const buildFallbackRates = (rates: { serviceCharge: number; levy: number; vat: number }): StoredLineRates =>
  withFactor(rates);

const scale = (v: unknown, factor: number) => (v === undefined || v === null ? v : n(v) * factor);

/**
 * Convert an Exclusive saved-order payload into the Inclusive view
 * (same fields the backend returns for priceView=Inclusive, but with the correct per-line factor).
 * Master totals are not view-dependent and are left untouched.
 */
export const toInclusiveView = <T extends StoredOrderParts>(order: T, fallback: StoredLineRates): T => {
  if (!order || !Array.isArray(order.detailsData)) return order;
  const rates = deriveStoredOrderRates(order, fallback);
  const factorFor = (mapId: unknown) => (rates.get(n(mapId)) ?? fallback).factor;

  return {
    ...order,
    detailsData: order.detailsData.map((d: any) => {
      const f = factorFor(field(d, "mapId", "MapId"));
      return {
        ...d,
        price: scale(d.price, f),
        amount: scale(d.amount, f),
        discAmount: scale(d.discAmount, f),
      };
    }),
    modifiersData: Array.isArray(order.modifiersData)
      ? order.modifiersData.map((m: any) => ({ ...m, price: scale(m.price, factorFor(field(m, "mapId", "MapId"))) }))
      : order.modifiersData,
  };
};

/**
 * Restore a saved order's bill discount for editing so the cart engine reproduces the stored
 * exclusive discount exactly.
 *  - Every line discounted at the same rate → percentage (also applies to items added while editing).
 *  - Otherwise a fixed amount, expressed the way the engine reads typed amounts (discountCalc):
 *      Inclusive → Σ(line discount × line factor), Exclusive → Σ line discount.
 * `view` is the price view the order data is in (Inclusive data has amount/discAmount × factor).
 */
export const restoreBillDiscount = (
  order: StoredOrderParts,
  view: "Inclusive" | "Exclusive",
  discountCalc: "Inclusive" | "Exclusive"
): { type: "percentage" | "amount"; value: number } | null => {
  const details = order?.detailsData || [];
  const lines = details.map((d: any) => {
    const amount = n(field(d, "amount", "Amount")) || n(field(d, "price", "Price")) * (n(field(d, "qty", "Qty")) || 1);
    const disc = n(field(d, "discAmount", "DiscAmount"));
    const factor = storedLineRates(order, d, view).factor;
    const exclusive = view === "Inclusive" ? disc / factor : disc;
    const gross = view === "Inclusive" ? disc : disc * factor;
    return { amount, disc, exclusive, gross };
  });

  const totalExclusive = lines.reduce((s, l) => s + l.exclusive, 0);
  if (totalExclusive <= 0.0000005) return null;

  // Same ratio on every line → it was a percentage bill discount (ratio is view-independent).
  const ratios = lines.filter((l) => l.amount > 0).map((l) => l.disc / l.amount);
  if (ratios.length > 0 && ratios.every((r) => Math.abs(r - ratios[0]) < 0.000001) && ratios[0] > 0) {
    return { type: "percentage", value: Math.round(ratios[0] * 100 * 10000) / 10000 };
  }
  const value = discountCalc === "Inclusive" ? lines.reduce((s, l) => s + l.gross, 0) : totalExclusive;
  return { type: "amount", value: round(value) };
};

/** Exclusive discount of one saved line, whatever view the data is in. */
export const storedLineExclusiveDiscount = (detail: any, view: "Inclusive" | "Exclusive", order: StoredOrderParts = {}): number => {
  const disc = n(field(detail, "discAmount", "DiscAmount"));
  if (disc <= 0 || view === "Exclusive") return Math.max(0, disc);
  return disc / storedLineRates(order, detail, view).factor;
};

/**
 * An order whose bill discount was saved only on the order total, with nothing on its lines: spread it over the
 * lines by amount, so rows and footer agree. The saved totals give the discount in the view the lines are in:
 *   Inclusive lines: lines total - (vatExclAmount + vatAmount)
 *   Exclusive lines: lines total + charges - vatExclAmount
 * Orders with a discount on any line are returned as they are.
 */
export const withBillDiscountOnLines = <T extends StoredOrderParts>(order: T, view: "Inclusive" | "Exclusive"): T => {
  const details: any[] | undefined = order?.detailsData || (order as any)?.details;
  if (!Array.isArray(details) || details.length === 0) return order;
  const raw = order?.masterData || (order as any)?.master || {};
  const master = Array.isArray(raw) ? raw[0] || {} : raw;
  const masterDiscount = n(field(master, "discAmount", "DiscAmount", "discAmt", "DiscAmt", "discount", "Discount", "billDiscount", "BillDiscount"));
  if (masterDiscount <= 0.0000005) return order;
  if (details.some((d) => n(field(d, "discAmount", "DiscAmount")) > 0.0000005)) return order;

  const amounts = details.map((d) => n(field(d, "amount", "Amount")) || n(field(d, "price", "Price")) * (n(field(d, "qty", "Qty", "quantity", "orderQty", "OrderQty")) || 1));
  const linesTotal = amounts.reduce((sum, a) => sum + a, 0);
  if (linesTotal <= 0) return order;

  const storedVatExcl = field(master, "vatExclAmount", "VatExclAmount");
  const { serviceCharge, levy } = storedOrderCharges(order);
  const fromTotals = storedVatExcl === undefined
    ? 0
    : view === "Inclusive"
    ? linesTotal - n(storedVatExcl) - n(field(master, "vatAmount", "VatAmount"))
    : linesTotal + serviceCharge + levy - n(storedVatExcl);
  const discount = fromTotals > 0.0000005 ? fromTotals : masterDiscount;

  return {
    ...order,
    detailsData: details.map((d, i) => ({ ...d, discAmount: round((discount * amounts[i]) / linesTotal) })),
  };
};

export interface StoredOrderFooter {
  subTotal: number;
  discount: number;
  serviceCharge: number;
  levy: number;
  charges: number;
  netValue: number;
  vatAmount: number;
  deliveryCharge: number;
  netAmount: number;
}

/** 14-decimal half-up (pricing/money.ts) — never truncated. */
const r14 = (v: number) => round(v);

/**
 * THE footer of a saved order — used by the recall screen, recall-edit, and settled-edit so they
 * always show identical numbers. Everything comes from stored values; discounts are exclusive.
 *   subTotal = vatExclAmount − charges + discount
 */
export const storedOrderFooter = (order: StoredOrderParts, view: "Inclusive" | "Exclusive"): StoredOrderFooter => {
  const raw = order?.masterData || (order as any)?.master || {};
  const master = Array.isArray(raw) ? raw[0] || {} : raw;
  const details = order?.detailsData || [];

  const { serviceCharge, levy } = storedOrderCharges(order);
  const charges = r14(serviceCharge + levy);
  const vatAmount = n(field(master, "vatAmount", "VatAmount", "vatAmt"));
  const deliveryCharge = n(field(master, "deliveryCharge", "DeliveryCharge"));
  const netAmount = n(field(master, "netAmount", "NetAmount"));
  const storedVatExcl = field(master, "vatExclAmount", "VatExclAmount");
  // vatExclAmount when stored; print-style payloads only carry netAmount/vatAmount (+ subTotal before discount)
  const netValue = storedVatExcl !== undefined ? n(storedVatExcl) : r14(Math.max(0, netAmount - vatAmount - deliveryCharge));
  const storedSubTotal = field(master, "subTotal", "SubTotal");
  const masterDiscount = n(field(master, "discAmount", "DiscAmount", "discAmt", "DiscAmt", "discount", "Discount", "billDiscount", "BillDiscount"));
  const lineDiscount = details.reduce((s: number, d: any) => s + storedLineExclusiveDiscount(d, view, order), 0);
  const discount = r14(masterDiscount > 0 ? masterDiscount : lineDiscount);

  return {
    subTotal: storedVatExcl === undefined && storedSubTotal !== undefined
      ? n(storedSubTotal)
      : r14(Math.max(0, netValue - charges) + discount),
    discount,
    serviceCharge,
    levy,
    charges,
    netValue,
    vatAmount,
    deliveryCharge,
    netAmount,
  };
};

export interface OrderChargeRates {
  /** percents */
  serviceCharge: number;
  levy: number;
}

/**
 * Service charge and levy a saved order was priced with — derived from its stored amounts,
 * whatever view the data is in. Null when no line has a positive net value (e.g. fully complimentary).
 */
export const deriveOrderChargeRates = (order: StoredOrderParts, view: "Inclusive" | "Exclusive"): OrderChargeRates | null => {
  for (const d of order?.detailsData || []) {
    const amount = n(field(d, "amount", "Amount")) || n(field(d, "price", "Price")) * (n(field(d, "qty", "Qty")) || 1);
    const disc = n(field(d, "discAmount", "DiscAmount"));
    const sc = n(field(d, "serviceCharge", "ServiceCharge"));
    const levy = n(field(d, "levy", "Levy", "levyAmt"));
    const vat = n(field(d, "vatAmount", "VatAmount"));
    const net = view === "Inclusive" ? amount - disc - sc - levy - vat : amount - disc;
    if (net > 0.0000005) {
      return {
        serviceCharge: snapPercent((sc / net) * 100),
        levy: snapPercent((levy / (net + sc)) * 100),
      };
    }
  }
  return null;
};


/**
 * Service charge / levy an order was saved with, from the stored MASTER totals (view-independent).
 * Falls back to the lines when the master has no vatExclAmount.
 */
export const deriveOrderChargeRatesFromMaster = (order: StoredOrderParts, view: "Inclusive" | "Exclusive"): OrderChargeRates | null => {
  const raw = order?.masterData || (order as any)?.master || {};
  const m = Array.isArray(raw) ? raw[0] || {} : raw;
  const vatExclRaw = field(m, "vatExclAmount", "VatExclAmount");
  if (vatExclRaw !== undefined) {
    const { serviceCharge: sc, levy } = storedOrderCharges(order);
    const net = n(vatExclRaw) - sc - levy;
    if (net > 0.0000005) {
      return { serviceCharge: snapPercent((sc / net) * 100), levy: snapPercent((levy / (net + sc)) * 100) };
    }
  }
  return deriveOrderChargeRates(order, view);
};

export interface StoredLineCartPricing {
  /** price to put in the cart (inclusive or exclusive per product master) */
  price: number;
  isIncl: boolean;
  /** exclusive unit price of the product only (extras removed) */
  baseUnitPrice: number;
  /** gross (inclusive) price per extra, keyed by modifierId */
  extraGrossById: Map<number, number>;
  /** gross price per extra in modifier order (fallback when ids are missing) */
  extraGrossList: number[];
  /** item discount to restore (null when none or when it is a bill discount) */
  discount: { type: "percentage" | "amount"; value: number } | null;
  /** VAT percent the line was saved with (null when not derivable) */
  savedVatRate: number | null;
}

/**
 * Convert ONE saved order line into cart pricing fields so the cart engine reproduces the stored
 * values exactly. Works for data in either view.
 */
export const storedLineToCartPricing = (
  order: StoredOrderParts,
  detail: any,
  view: "Inclusive" | "Exclusive",
  options: {
    productIsInclusive: boolean;
    discountCalc: "Inclusive" | "Exclusive";
    isBillDiscount: boolean;
    /** current-settings rates (percent) — only for lines whose saved rates cannot be derived at all */
    fallbackRates?: { serviceCharge: number; levy: number; vat: number };
  }
): StoredLineCartPricing => {
  const qty = n(field(detail, "qty", "Qty", "quantity")) || 1;
  const amount = n(field(detail, "amount", "Amount")) || n(field(detail, "price", "Price")) * qty;
  const disc = n(field(detail, "discAmount", "DiscAmount"));
  // Saved rates of this line (robust to rounded stored amounts) — see storedLineRates.
  const rates = storedLineRates(order, detail, view, options.fallbackRates);
  const f = rates.factor;
  const toExcl = (v: number) => (view === "Inclusive" ? v / f : v);

  const mapId = n(field(detail, "mapId", "MapId"));
  // Backend may return the same extra row twice (SQL join duplicates) — count each extra once.
  const extrasRows = dedupeModifierRows(order?.modifiersData || []).filter(
    (m: any) => n(field(m, "mapId", "MapId")) === mapId && n(field(m, "price", "Price")) > 0
  );
  const extraGrossById = new Map<number, number>();
  const extraGrossList: number[] = [];
  let extrasBase = 0;
  for (const m of extrasRows) {
    const exBase = toExcl(n(field(m, "price", "Price")));
    const exQty = n(field(m, "qty", "Qty")) || 1;
    extrasBase += exBase * exQty;
    const gross = round(exBase * f);
    extraGrossById.set(n(field(m, "modifierId", "ModifierId", "id")), gross);
    extraGrossList.push(gross);
  }

  const amountExcl = toExcl(amount);
  const baseUnitPrice = Math.max(0, amountExcl - extrasBase) / qty;
  const discExcl = toExcl(disc);

  const savedVatRate: number | null = rates.vat;
  // The backend stores discPer rounded to 2 decimals (e.g. 42.44 for 42.4448%). Use it only when it
  // reproduces the stored discount exactly; otherwise restore the exact stored amount.
  const rawDiscPer = n(field(detail, "discPer", "DiscPer"));
  const storedDiscPer = rawDiscPer > 0 && amount > 0 && Math.abs((amount * rawDiscPer) / 100 - disc) < 0.0000005 * Math.max(1, amount)
    ? rawDiscPer
    : 0;

  return {
    price: round((options.productIsInclusive ? baseUnitPrice * f : baseUnitPrice)),
    isIncl: options.productIsInclusive,
    baseUnitPrice: round(baseUnitPrice),
    extraGrossById,
    extraGrossList,
    discount:
      !options.isBillDiscount && storedDiscPer > 0
        ? { type: "percentage", value: storedDiscPer }
        : !options.isBillDiscount && discExcl > 0.0000005
        ? { type: "amount", value: round((options.discountCalc === "Inclusive" ? discExcl * f : discExcl)) }
        : null,
    savedVatRate,
  };
};

export const ORDER_TYPE_NAMES: Record<number, string> = {
  1: "DineIn",
  2: "TakeOut",
  3: "DriveThru",
  4: "Delivery",
  // Above 4: each provider by its own id (orderTypeNameFromId). There is no "Coming" order type.
};

/** Fields only `/menu/order/order_data` returns per line, copied onto the recall lines. */
const MENU_DETAIL_FIELDS = ["vatId", "vatValue", "netAmount", "discPer", "unitId", "complimentaryStatus", "productArabicName"];
/** Master fields only `/menu/order/order_data` returns. */
const MENU_MASTER_FIELDS = [
  "orderTypeId", "discPer", "customerId", "customerName", "sectionId", "tableId", "addressId", "updatedAt",
  "vehicleCustomerName", "vehicleNo", "mobileNo", "contactNo", "note", "change", "isComing", "comingTime",
  "flatNo", "buildingNo", "roadNo", "blockNo", "area", "deliveryCustomerName", "providerNo", "driverId", "missedCall",
];

const pick = (src: any, keys: string[]) => {
  const out: any = {};
  for (const k of keys) if (src && src[k] !== undefined && src[k] !== null) out[k] = src[k];
  return out;
};

const normalizeMenuOnly = (menu: StoredOrderParts): StoredOrderParts => {
  const master = { ...(menu.masterData || {}) };
  if (!master.orderType && master.orderTypeId) master.orderType = orderTypeNameFromId(master.orderTypeId);
  return {
    ...menu,
    modifiersData: dedupeModifierRows(menu.modifiersData),
    masterData: master,
    detailsData: (menu.detailsData || []).map((d: any) => ({
      ...d,
      amount: d.amount ?? n(d.price) * (n(d.qty) || 1),
    })),
  };
};

/**
 * Merge the two saved-order endpoints:
 *  - recall  (/order/recall/order_data): proven prices, extras (modifiersData), display fields
 *  - menu    (/menu/order/order_data):   stored vatValue / vatId / discPer / netAmount /
 *                                         complimentaryStatus / unitId per line, discPer + ids on master
 * Money values are identical in both; only the extra fields are taken from `menu`.
 */
export const mergeStoredOrderSources = (recall: StoredOrderParts | null | undefined, menu: StoredOrderParts | null | undefined): StoredOrderParts | null => {
  const hasLines = (o: any) => o && Array.isArray(o.detailsData);
  if (!hasLines(recall)) return hasLines(menu) ? normalizeMenuOnly(menu as StoredOrderParts) : (recall ?? menu ?? null);
  if (!hasLines(menu)) return { ...(recall as StoredOrderParts), modifiersData: dedupeModifierRows((recall as StoredOrderParts).modifiersData) };

  const r = recall as StoredOrderParts;
  const m = menu as StoredOrderParts;
  const menuLines = m.detailsData || [];
  const master = { ...(r.masterData || {}), ...pick(m.masterData, MENU_MASTER_FIELDS) };
  if (!master.orderType && master.orderTypeId) master.orderType = orderTypeNameFromId(master.orderTypeId);

  return {
    ...r,
    modifiersData: dedupeModifierRows(r.modifiersData),
    masterData: master,
    detailsData: (r.detailsData || []).map((d: any, i: number) => {
      const mapId = n(field(d, "mapId", "MapId"));
      const match = menuLines.find((x: any) => n(field(x, "mapId", "MapId")) === mapId && mapId > 0) ?? menuLines[i];
      return match ? { ...d, ...pick(match, MENU_DETAIL_FIELDS) } : d;
    }),
  };
};

/**
 * THE rates of one saved line — used by every conversion (recall view, edit, prints, discounts).
 *
 * Line amounts may be stored ROUNDED (orders edited before the update-path fix have line VAT at 3
 * decimals, e.g. #288: 0.262 instead of 0.2616144), which makes a rate derived from the line slightly
 * off (10.015% instead of 10%). So:
 *  - VAT %: the line's stored `vatValue` (menu endpoint) when VAT was charged; otherwise the rate from
 *    the order master totals (7 decimals) when it is within 0.1 of the line-derived rate; otherwise
 *    the line-derived rate (a genuinely different VAT rate on this line).
 *  - Service charge / levy %: master-derived when within 0.1 of the line-derived value.
 *  - Lines with no positive net value use master rates, then `fallback`.
 */
export const storedLineRates = (
  order: StoredOrderParts,
  detail: any,
  view: "Inclusive" | "Exclusive",
  fallback?: { serviceCharge: number; levy: number; vat: number }
): StoredLineRates => {
  const raw = order?.masterData || (order as any)?.master || {};
  const m = Array.isArray(raw) ? raw[0] || {} : raw;
  const mVatExcl = n(field(m, "vatExclAmount", "VatExclAmount"));
  const { serviceCharge: mSc, levy: mLevy } = storedOrderCharges(order);
  const mVat = n(field(m, "vatAmount", "VatAmount"));
  const mNet = mVatExcl - mSc - mLevy;
  const master = mNet > 0.0000005
    ? { serviceCharge: snapPercent((mSc / mNet) * 100), levy: snapPercent((mLevy / (mNet + mSc)) * 100), vat: snapPercent((mVat / mVatExcl) * 100) }
    : null;

  const qty = n(field(detail, "qty", "Qty", "quantity")) || 1;
  const amount = n(field(detail, "amount", "Amount")) || n(field(detail, "price", "Price")) * qty;
  const disc = n(field(detail, "discAmount", "DiscAmount"));
  const sc = n(field(detail, "serviceCharge", "ServiceCharge"));
  const levy = n(field(detail, "levy", "Levy", "levyAmt"));
  const vat = n(field(detail, "vatAmount", "VatAmount"));
  const netExcl = view === "Inclusive" ? amount - disc - sc - levy - vat : amount - disc;
  const line = netExcl > 0.0000005
    ? {
        serviceCharge: snapPercent((sc / netExcl) * 100),
        levy: snapPercent((levy / (netExcl + sc)) * 100),
        vat: netExcl + sc + levy > 0 ? snapPercent((vat / (netExcl + sc + levy)) * 100) : 0,
      }
    : null;

  const prefer = (lineV: number | undefined, masterV: number | undefined, fb: number | undefined): number => {
    if (lineV === undefined) return masterV ?? fb ?? 0;
    if (masterV !== undefined && Math.abs(lineV - masterV) < 0.1) return masterV;
    return lineV;
  };

  const storedVatValue = field(detail, "vatValue", "VatValue");
  const vatCharged = !(line && vat <= 0); // a line with net value but 0 VAT was saved with VAT off
  const vatPct = storedVatValue !== undefined && vatCharged
    ? n(storedVatValue)
    : prefer(line?.vat, master?.vat, fallback?.vat);

  return withFactor({
    serviceCharge: prefer(line?.serviceCharge, master?.serviceCharge, fallback?.serviceCharge),
    levy: prefer(line?.levy, master?.levy, fallback?.levy),
    vat: vatPct,
  });
};

/** Money fields of a saved order. When order data is merged with sales-invoice data, these always come from the ORDER. */
export const ORDER_MONEY_FIELDS = [
  "discAmount", "DiscAmount", "discPer", "DiscPer", "vatExclAmount", "VatExclAmount", "vatAmount", "VatAmount",
  "serviceCharge", "ServiceCharge", "levy", "levyAmt", "Levy", "netAmount", "NetAmount", "deliveryCharge",
  "DeliveryCharge", "subTotal", "complimentaryStatus", "ComplimentaryStatus",
];

/** The order's money fields only (to re-apply after spreading sales-invoice data over an order master). */
export const pickOrderMoney = (master: any): Record<string, any> => {
  const out: Record<string, any> = {};
  for (const k of ORDER_MONEY_FIELDS) if (master && master[k] !== undefined && master[k] !== null) out[k] = master[k];
  return out;
};


/**
 * Remove duplicate modifier / extra rows (same line, same modifier, same name). The backend sometimes
 * returns an extra twice (e.g. sales-data for order 299, recall data for order 301); counting it twice
 * makes the product price come out too low. The POS always sends each extra as one row per line, with its qty.
 */
export const dedupeModifierRows = <T = any>(rows: T[] | null | undefined): T[] => {
  if (!Array.isArray(rows)) return [];
  const seen = new Set<string>();
  return rows.filter((m: any) => {
    const key = [
      n(field(m, "mapId", "MapId", "mapID")),
      n(field(m, "modifierId", "ModifierId", "id", "Id")),
      String(field(m, "modifierName", "ModifierName", "name") ?? "").trim().toLowerCase(),
    ].join("|");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};


/**
 * Order service charge / levy totals. The LINES are the source of truth: the backend's update API
 * can leave the master serviceCharge / levy at their pre-edit values (order 301: master 16.135 / 8.874,
 * lines 24.006 / 13.204). Falls back to the master only when the lines carry no charges.
 */
export const storedOrderCharges = (order: StoredOrderParts): { serviceCharge: number; levy: number } => {
  const raw = order?.masterData || (order as any)?.master || {};
  const m = Array.isArray(raw) ? raw[0] || {} : raw;
  const details = order?.detailsData || [];
  const lineSc = details.reduce((t: number, d: any) => t + n(field(d, "serviceCharge", "ServiceCharge")), 0);
  const lineLevy = details.reduce((t: number, d: any) => t + n(field(d, "levy", "Levy", "levyAmt")), 0);
  const hasLineCharges = details.some((d: any) =>
    field(d, "serviceCharge", "ServiceCharge") !== undefined || field(d, "levy", "Levy", "levyAmt") !== undefined
  );
  if (hasLineCharges && (lineSc > 0 || lineLevy > 0 || (n(field(m, "serviceCharge", "ServiceCharge")) === 0 && n(field(m, "levyAmt", "levy", "Levy")) === 0))) {
    return { serviceCharge: r14(lineSc), levy: r14(lineLevy) };
  }
  return { serviceCharge: n(field(m, "serviceCharge", "ServiceCharge")), levy: n(field(m, "levyAmt", "levy", "Levy")) };
};
