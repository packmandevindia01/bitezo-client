import { getDecimalPart } from "../../../../utils/formatters";
import { formatItemDisplayName } from "../../utils/alternativeHelpers";
import {
  priceBill,
  priceLine,
  buildPricingSettings,
  cartItemToPricingLine,
  readExplicitInclusivity,
  isDeliveryOrderType,
} from "../../pricing";
import type { DiscountInput, PricedExtra, PricedLine, PricingSettings } from "../../pricing";

export interface BillingConfig {
  serviceChargeRate: number;
  levyRate: number;
  vatRate: number;
  vatType: 'Exclusive' | 'Inclusive';
  discountType: 'Exclusive' | 'Inclusive';
  orderType: string;
}

export const getPriceView = (override?: string): "Inclusive" | "Exclusive" => {
  if (override) {
    const norm = String(override).trim().toLowerCase();
    if (norm === "inclusive") return "Inclusive";
    if (norm === "exclusive") return "Exclusive";
  }

  // Priority 1: Check priceView in localStorage
  const directPriceView = localStorage.getItem("priceView");
  if (directPriceView) {
    const norm = String(directPriceView).trim().toLowerCase();
    if (norm === "inclusive") return "Inclusive";
    if (norm === "exclusive") return "Exclusive";
  }

  // Priority 2: Check cached posConfigs JSON
  for (const key of ["posConfigs", "posConfig", "pos_configs", "pos_config"]) {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        const configs = parsed?.configs || parsed;
        const pv = configs?.priceView ?? configs?.PriceView ?? parsed?.priceView ?? parsed?.PriceView;
        if (pv) {
          const norm = String(pv).trim().toLowerCase();
          if (norm === "inclusive") return "Inclusive";
          if (norm === "exclusive") return "Exclusive";
        }
        const vt = configs?.vatType ?? configs?.VatType ?? parsed?.vatType ?? parsed?.VatType;
        if (vt) {
          const norm = String(vt).trim().toLowerCase();
          if (norm === "inclusive") return "Inclusive";
          if (norm === "exclusive") return "Exclusive";
        }
      }
    } catch {}
  }

  return "Inclusive";
};

export const getPrintPrice = (override?: string): "Inclusive" | "Exclusive" => {
  if (override) {
    const norm = String(override).trim().toLowerCase();
    if (norm === "inclusive") return "Inclusive";
    if (norm === "exclusive") return "Exclusive";
  }

  // Priority 1: Check printPrice in localStorage
  const directPrintPrice = localStorage.getItem("printPrice");
  if (directPrintPrice) {
    const norm = String(directPrintPrice).trim().toLowerCase();
    if (norm === "inclusive") return "Inclusive";
    if (norm === "exclusive") return "Exclusive";
  }

  // Priority 2: Check cached posConfigs JSON
  for (const key of ["posConfigs", "posConfig", "pos_configs", "pos_config"]) {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        const configs = parsed?.configs || parsed;
        const pp = configs?.printPrice ?? configs?.PrintPrice ?? parsed?.printPrice ?? parsed?.PrintPrice;
        if (pp) {
          const norm = String(pp).trim().toLowerCase();
          if (norm === "inclusive") return "Inclusive";
          if (norm === "exclusive") return "Exclusive";
        }
      }
    } catch {}
  }

  return getPriceView();
};

export const getDiscountCalculation = (override?: string): "Inclusive" | "Exclusive" => {
  if (override) {
    const norm = String(override).trim().toLowerCase();
    if (norm === "inclusive") return "Inclusive";
    if (norm === "exclusive") return "Exclusive";
  }

  // Priority 1: Check discCalc / discountCalc in localStorage
  for (const key of ["discCalc", "discountCalc", "discountCalculation"]) {
    const direct = localStorage.getItem(key);
    if (direct) {
      const norm = String(direct).trim().toLowerCase();
      if (norm === "inclusive") return "Inclusive";
      if (norm === "exclusive") return "Exclusive";
    }
  }

  // Priority 2: Check cached posConfigs JSON
  for (const key of ["posConfigs", "posConfig", "pos_configs", "pos_config"]) {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        const configs = parsed?.configs || parsed;
        const dc = configs?.discCalc ?? configs?.discountCalc ?? configs?.DiscCalc ?? configs?.DiscountCalc ?? configs?.discountCalculation;
        if (dc) {
          const norm = String(dc).trim().toLowerCase();
          if (norm === "inclusive") return "Inclusive";
          if (norm === "exclusive") return "Exclusive";
        }
      }
    } catch {}
  }

  return getPriceView();
};

/**
 * Calculates the display unit price for a product based on the POS configuration (Inclusive vs Exclusive).
 * Converts the product's stored catalog price:
 * - If target is Exclusive and product is stored as Inclusive: divides by (1 + vatRate).
 * - If target is Inclusive and product is stored as Exclusive: multiplies by (1 + vatRate).
 * - Otherwise returns the stored price.
 */
export const getDisplayPriceForProduct = (
  rawPrice: number,
  isProductIncl?: boolean,
  vatRate?: number,
  targetView?: "Inclusive" | "Exclusive",
  orderType: string = "DineIn"
): number => {
  const view = targetView || getPriceView();
  const isVatEnabled = getVatStatus();
  const rate = (vatRate !== undefined && vatRate !== null && !isNaN(Number(vatRate)))
    ? Number(vatRate) / 100
    : 0.10;

  if (!isVatEnabled || !rawPrice || rawPrice <= 0) {
    return rawPrice || 0;
  }

  const config = getBillingConfig(orderType);
  const isDineIn = (orderType || '').toLowerCase().includes('dine');
  const scRate = (isDineIn && config.serviceChargeRate > 0) ? config.serviceChargeRate : 0;
  const levyRate = config.levyRate > 0 ? config.levyRate : 0;
  const vatFactor = (isVatEnabled && rate > 0) ? (1 + rate) : 1;
  const levyFactor = levyRate > 0 ? (1 + levyRate) : 1;
  const scFactor = scRate > 0 ? (1 + scRate) : 1;
  const combinedFactor = vatFactor * levyFactor * scFactor;

  const isStoredIncl = isProductIncl === true;

  if (view === "Exclusive") {
    if (isStoredIncl) {
      return roundCalc(rawPrice / combinedFactor, CALC_PRECISION);
    }
    return rawPrice;
  } else {
    if (!isStoredIncl) {
      return roundCalc(rawPrice * combinedFactor, CALC_PRECISION);
    }
    return rawPrice;
  }
};

export const getStoredServiceChargeRate = (): number => {
  try {
    for (const key of ['serviceCharges', 'serviceCharge', 'ServiceCharges', 'ServiceCharge']) {
      const raw = localStorage.getItem(key);
      if (raw !== null && raw !== "" && !isNaN(Number(raw))) {
        return Number(raw) / 100;
      }
    }

    for (const key of ['posConfigs', 'posConfig', 'pos_configs', 'pos_config']) {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        const configs = parsed?.configs ?? parsed;
        const val =
          configs?.serviceCharges ??
          configs?.serviceCharge ??
          configs?.ServiceCharges ??
          configs?.ServiceCharge ??
          parsed?.serviceCharges ??
          parsed?.serviceCharge ??
          parsed?.ServiceCharges ??
          parsed?.charges?.serviceCharge;
        if (val !== undefined && val !== null && val !== "" && !isNaN(Number(val))) {
          return Number(val) / 100;
        }
      }
    }
  } catch (e) {
    console.error("[billing] Error reading stored service charge rate:", e);
  }
  return 0;
};

export const getStoredLevyRate = (): number => {
  try {
    for (const key of ['levy', 'Levy', 'levyRate', 'LevyRate']) {
      const raw = localStorage.getItem(key);
      if (raw !== null && raw !== "" && !isNaN(Number(raw))) {
        return Number(raw) / 100;
      }
    }

    for (const key of ['posConfigs', 'posConfig', 'pos_configs', 'pos_config']) {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        const configs = parsed?.configs ?? parsed;
        const val =
          configs?.levy ??
          configs?.Levy ??
          configs?.levyRate ??
          configs?.LevyRate ??
          parsed?.levy ??
          parsed?.Levy ??
          parsed?.levyRate ??
          parsed?.charges?.levy;
        if (val !== undefined && val !== null && val !== "" && !isNaN(Number(val))) {
          return Number(val) / 100;
        }
      }
    }
  } catch (e) {
    console.error("[billing] Error reading stored levy rate:", e);
  }
  return 0;
};

export const getBillingConfig = (orderType: string): BillingConfig => {
  try {
    let configs: any = {};
    for (const key of ['posConfigs', 'posConfig', 'pos_configs', 'pos_config']) {
      const saved = localStorage.getItem(key);
      if (saved) {
        const parsed = JSON.parse(saved);
        configs = parsed?.configs || parsed;
        if (configs && Object.keys(configs).length > 0) break;
      }
    }
    
    const rawVat = configs.vat ?? configs.Vat ?? configs.vatRate ?? configs.VatRate ?? 0;
    const rawSc = configs.serviceCharges ?? configs.serviceCharge ?? configs.ServiceCharges ?? configs.charges?.serviceCharge ?? 0;
    const rawLevy = configs.levy ?? configs.Levy ?? configs.charges?.levy ?? 0;

    return {
      serviceChargeRate: Number(rawSc) / 100,
      levyRate: Number(rawLevy) / 100,
      vatRate: Number(rawVat) > 0 ? Number(rawVat) / 100 : 0.10,
      vatType: getPriceView(),
      discountType: getDiscountCalculation(),
      orderType
    };
  } catch {
    return {
      serviceChargeRate: 0,
      levyRate: 0,
      vatRate: 0.10,
      vatType: getPriceView(),
      discountType: getDiscountCalculation(),
      orderType
    };
  }
};

/**
 * VAT on/off.
 * Priority 1: the POS configuration from the API (`posConfigs.configs.vatStatus`), refreshed every
 *             time the terminal starts — this is the back-office setting.
 * Priority 2: legacy direct localStorage keys (`vatStatus`, `enableVat`, …) — only when the
 *             configuration does not state it. These keys are never written by this app any more and
 *             could be stale, so they must NOT override the configuration.
 * Priority 3: a configured VAT rate > 0.
 */
export const getVatStatus = (): boolean => {
  const toBool = (v: unknown): boolean | undefined => {
    if (v === undefined || v === null || v === "") return undefined;
    if (v === true || v === false) return v;
    const norm = String(v).trim().toLowerCase();
    if (norm === "true" || norm === "enable" || norm === "1") return true;
    if (norm === "false" || norm === "disable" || norm === "0") return false;
    return undefined;
  };
  try {
    const parsedConfigs: any[] = [];
    for (const key of ['posConfigs', 'posConfig', 'pos_configs', 'pos_config']) {
      const saved = localStorage.getItem(key);
      if (!saved) continue;
      try {
        const parsed = JSON.parse(saved);
        parsedConfigs.push({ parsed, configs: parsed?.configs || parsed });
      } catch {}
    }

    // Priority 1: configuration
    for (const { parsed, configs } of parsedConfigs) {
      const val = toBool(
        configs?.vatStatus ?? configs?.VatStatus ?? configs?.enableVat ?? configs?.EnableVat ?? configs?.isVatEnabled ??
        parsed?.vatStatus ?? parsed?.VatStatus ?? parsed?.enableVat ?? parsed?.EnableVat
      );
      if (val !== undefined) return val;
    }

    // Priority 2: legacy direct keys
    for (const key of ['vatStatus', 'VatStatus', 'enableVat', 'EnableVat', 'isVatEnabled']) {
      const val = toBool(localStorage.getItem(key));
      if (val !== undefined) return val;
    }

    // Priority 3: a configured VAT rate
    for (const { parsed, configs } of parsedConfigs) {
      const rate = configs?.vat ?? configs?.Vat ?? configs?.vatRate ?? configs?.VatRate ?? parsed?.vat ?? parsed?.Vat;
      if (rate !== undefined && rate !== null && Number(rate) > 0) return true;
    }
    return false;
  } catch {
    return false;
  }
};

export const CALC_PRECISION = 7;

export const roundCalc = (val: number | string | undefined | null, decimals: number = CALC_PRECISION): number => {
  const num = typeof val === 'string' ? parseFloat(val) : Number(val || 0);
  if (!Number.isFinite(num)) return 0;
  const factor = Math.pow(10, decimals);
  const sign = num < 0 ? -1 : 1;
  const abs = Math.abs(num);
  return sign * (Math.round((abs + 1e-11) * factor) / factor);
};

/** Converts a legacy BillingConfig into engine PricingSettings (rates as percent). */
export const toPricingSettings = (config: BillingConfig, priceViewOverride?: "Inclusive" | "Exclusive"): PricingSettings =>
  buildPricingSettings({
    vatEnabled: getVatStatus(),
    defaultVatRate: (config.vatRate || 0) * 100,
    serviceChargeRate: (config.serviceChargeRate || 0) * 100,
    levyRate: (config.levyRate || 0) * 100,
    discountCalc: config.discountType,
    priceView: priceViewOverride ?? config.vatType,
    orderTypeName: config.orderType,
  });

/**
 * Prices one line. Thin adapter over pricing/engine.ts `priceLine` (kept for existing callers).
 * isIncl: true = inclusive, false = exclusive, undefined = follow Price View (legacy fallback).
 */
export const calculateLineItem = (
  qty: number,
  price: number,
  discount: number | { type: 'percentage' | 'amount'; value: number },
  extras: number,
  config: BillingConfig,
  itemVatRate?: number,
  isIncl?: boolean
) => {
  const settings = toPricingSettings(config);
  const isSystemInclusive = config.vatType === 'Inclusive';
  const discountInput: DiscountInput | null =
    typeof discount === 'object' && discount !== null
      ? { type: discount.type === 'percentage' ? 'percentage' : 'amount', value: Number(discount.value) || 0 }
      : { type: 'amount', value: Number(discount) || 0 };

  const line = priceLine(
    {
      qty,
      unitPrice: price,
      priceIncludesTax: isIncl === false ? false : (isIncl === true || isSystemInclusive),
      vatRate: itemVatRate !== undefined ? itemVatRate : settings.defaultVatRate,
      extras: extras > 0 ? [{ price: extras, qty: 1 }] : [],
      discount: discountInput,
    },
    settings
  );

  return {
    basePrice: line.baseUnitPrice,
    baseAmount: line.productBase,
    amount: line.amount,
    netValue: line.netValue,
    sc: line.serviceCharge,
    levy: line.levy,
    vatAmount: line.vatAmount,
    lineNetAmount: line.lineNet,
    discountAmount: isSystemInclusive ? line.discountGross : line.discountBase,
    baseDiscount: line.discountBase,
    grossDiscount: line.discountGross,
    combinedFactor: line.factor,
  };
};

export const getStoredDefaultDeliveryCharge = (): number => {
  try {
    for (const key of ['posConfigs', 'posConfig', 'pos_configs', 'pos_config']) {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        const configs = parsed?.configs ?? parsed;
        const val =
          configs?.defaultDeliveryCharge ??
          configs?.defaultdeliverycharge ??
          configs?.defaultDeliverycharge ??
          configs?.deliveryCharge ??
          configs?.deliverycharge ??
          configs?.DeliveryCharge ??
          configs?.DefaultDeliveryCharge ??
          parsed?.defaultDeliveryCharge ??
          parsed?.defaultdeliverycharge ??
          parsed?.defaultDeliverycharge ??
          parsed?.deliveryCharge ??
          parsed?.deliverycharge ??
          parsed?.DeliveryCharge ??
          parsed?.DefaultDeliveryCharge ??
          parsed?.charges?.defaultDeliveryCharge ??
          parsed?.charges?.deliveryCharge;
        if (val !== undefined && val !== null && val !== "" && !isNaN(Number(val))) {
          return Number(val);
        }
      }
    }

    for (const key of ['defaultDeliveryCharge', 'deliveryCharge', 'defaultdeliverycharge', 'deliverycharge']) {
      const raw = localStorage.getItem(key);
      if (raw !== null && raw !== "" && !isNaN(Number(raw))) {
        return Number(raw);
      }
    }
  } catch (e) {
    console.error("[billing] Error reading default delivery charge:", e);
  }
  return 0;
};

export interface OrderCalculationOptions {
  orderType?: string;
  orderTypeId?: number;
  billDiscountValue?: number;
  billDiscountType?: 'percentage' | 'amount';
  customDeliveryCharge?: number | null;
  productCache?: Record<string | number, any>;
  config?: BillingConfig;
}

export interface CalculatedLineItem {
  uniqueId: string;
  productId: number;
  unitId?: number;
  quantity: number;
  catalogPrice?: number;
  price: number;
  basePrice: number;
  exclusivePrice: number;
  isIncl: boolean;
  variantName?: string;
  variantArabic?: string;
  product: any;
  extras: any[];
  modifiers: any[];
  messages: any[];
  mapId?: number;
  isExisting?: boolean;
  originalQty?: number;
  discountValue?: number;
  discountType?: 'percentage' | 'amount';

  // Computed values (7-decimal precision)
  baseAmount: number;
  extrasTotal: number;
  amount: number;
  itemDiscount?: number;
  itemDiscountAmount: number;
  itemDiscountExcl?: number;
  itemDiscountIncl?: number;
  itemDiscountGross?: number;
  billDiscountAmount: number;
  effectiveDiscountAmount: number;
  netValue: number;
  sc: number;
  levy: number;
  vatBase: number;
  vatRate: number;
  vatAmount: number;
  lineTotal: number;
  lineNetAmount: number;
  originalLineTotal: number;

  // Payload-ready detail amounts (extras deducted for backend detail rows)
  mainNetAmount: number;
  mainVatAmount: number;
  mainSc: number;
  mainLevy: number;

  /** Engine-priced extras: exclusive unit price per extra (backend modifiers.price). */
  pricedExtras?: PricedExtra[];
  /** Full engine result for this line. */
  pricedLine?: PricedLine;
}

export interface OrderCalculationSummary {
  baseSubtotal: number;
  subtotal: number;
  subTotalInclusive?: number;
  subTotalExclusive?: number;
  itemDiscountsTotal: number;
  billDiscountTotal: number;
  totalDiscount: number;
  totalDiscountIncl?: number;
  totalDiscountExcl?: number;
  serviceCharge: number;
  levy: number;
  charges: number;
  netValue: number;
  vatExclAmount: number;
  vatAmount: number;
  deliveryCharge: number;
  grandTotal: number;
  netAmount: number;
  itemCount: number;
  totalExtras: number;
  // Aliases for compatibility
  totalServiceCharge: number;
  totalLevy: number;
  tax: number;
  total: number;
}

export interface OrderCalculationResult {
  lines: CalculatedLineItem[];
  summary: OrderCalculationSummary;
}

/**
 * Prices the whole cart. Thin adapter over pricing/engine.ts `priceBill`:
 * resolves cart items into engine inputs, then maps the result back into the
 * CalculatedLineItem / OrderCalculationSummary shape the UI already uses.
 */
export const calculateOrder = (
  items: any[] = [],
  options: OrderCalculationOptions = {}
): OrderCalculationResult => {
  const config = options.config || getBillingConfig(options.orderType || 'DineIn');
  const isTaxInclusive = config.vatType === 'Inclusive';
  const isPriceViewInclusive = isTaxInclusive || getPriceView() === 'Inclusive';
  const settings = toPricingSettings(config, isPriceViewInclusive ? 'Inclusive' : 'Exclusive');

  // ── Resolve every cart item ONCE into an engine input ──────────────────────
  const prepared = items.map((item) => {
    const cachedProduct = options.productCache && options.productCache[item.productId];
    const product = cachedProduct
      ? { ...item.product, ...cachedProduct, vatValue: cachedProduct.vatValue ?? item.product?.vatValue ?? item.vatValue }
      : (item.product || {});
    const extras = item.extras || [];
    const totalExtrasForLine = extras.reduce((s: number, ex: any) => {
      const p = parseFloat(String(ex.price)) || 0;
      const q = parseFloat(String(ex.qty)) || 1;
      return s + p * q;
    }, 0);
    return {
      item,
      product,
      explicitIncl: readExplicitInclusivity(item, product, cachedProduct),
      totalExtrasForLine,
      input: cartItemToPricingLine(item, { product, cachedProduct, settings }),
    };
  });

  // ── Delivery charge ────────────────────────────────────────────────────────
  const isDelivery = isDeliveryOrderType(options.orderType || config.orderType, options.orderTypeId);
  let deliveryCharge = 0;
  if (isDelivery) {
    deliveryCharge = options.customDeliveryCharge !== null && options.customDeliveryCharge !== undefined
      ? Number(options.customDeliveryCharge) || 0
      : getStoredDefaultDeliveryCharge();
  }

  // ── Price ──────────────────────────────────────────────────────────────────
  const billDiscVal = Number(options.billDiscountValue) || 0;
  const billDiscType = options.billDiscountType || 'percentage';
  const inputs = prepared.map((p) => p.input);
  const priced = priceBill(
    {
      lines: inputs,
      billDiscount: billDiscVal > 0 ? { type: billDiscType, value: billDiscVal } : null,
      deliveryCharge,
    },
    settings
  );
  const undiscounted = inputs.map((l) => priceLine({ ...l, discount: null }, settings));

  // ── Map back to the legacy line shape ──────────────────────────────────────
  const calculatedLines: CalculatedLineItem[] = prepared.map(({ item, product, explicitIncl, totalExtrasForLine }, idx) => {
    const line = priced.lines[idx];
    const noDisc = undiscounted[idx];
    const isBillDisc = line.isBillDiscount;
    const quantity = line.qty;
    const price = line.unitPrice;
    const displayName = formatItemDisplayName(product.name || 'Item', item.variantName);
    const resolvedUnitId = item.unitId || product.unitId || 1;

    const itemDiscBase = isBillDisc ? 0 : line.discountBase;
    const itemDiscGross = isBillDisc ? 0 : line.discountGross;
    const effectiveUnitRate = isPriceViewInclusive
      ? (quantity > 0 ? roundCalc((noDisc.lineNet - totalExtrasForLine) / quantity, CALC_PRECISION) : price)
      : line.baseUnitPrice;

    return {
      ...item,
      uniqueId: item.uniqueId || `${item.productId}-${Date.now()}-${Math.random()}`,
      productId: item.productId || product.id || 0,
      unitId: resolvedUnitId,
      quantity,
      catalogPrice: price,
      price: effectiveUnitRate,
      basePrice: line.baseUnitPrice,
      exclusivePrice: line.baseUnitPrice,
      isIncl: explicitIncl !== undefined ? explicitIncl : item.isIncl,
      variantName: item.variantName,
      variantArabic: item.variantArabic,
      product: {
        ...product,
        unitId: resolvedUnitId,
        name: displayName,
        catalogPrice: price,
        price: effectiveUnitRate,
      },
      extras: item.extras || [],
      modifiers: item.modifiers || [],
      messages: item.messages || [],
      mapId: item.mapId,
      isExisting: item.isExisting,
      originalQty: item.originalQty,
      discountValue: item.discountValue,
      discountType: item.discountType,

      baseAmount: line.productBase,
      baseDiscount: line.discountBase,
      extrasTotal: totalExtrasForLine,
      amount: line.amount,
      itemDiscount: isTaxInclusive ? itemDiscGross : itemDiscBase,
      itemDiscountAmount: itemDiscBase,
      itemDiscountExcl: itemDiscBase,
      itemDiscountIncl: itemDiscGross,
      billDiscountAmount: isBillDisc ? line.discountBase : 0,
      effectiveDiscountAmount: isBillDisc ? 0 : (isTaxInclusive ? line.discountGross : line.discountBase),
      netValue: line.netValue,
      sc: line.serviceCharge,
      levy: line.levy,
      vatBase: line.vatBase,
      vatRate: line.vatRate,
      vatAmount: line.vatAmount,
      lineTotal: isPriceViewInclusive
        ? (isBillDisc ? noDisc.lineNet : line.lineNet)
        : (isBillDisc ? noDisc.amount : line.netValue),
      lineNetAmount: line.lineNet,
      originalLineTotal: isPriceViewInclusive ? noDisc.lineNet : noDisc.amount,

      mainNetAmount: line.lineNet,
      mainVatAmount: line.vatAmount,
      mainSc: line.serviceCharge,
      mainLevy: line.levy,

      // Engine extras (exclusive prices for backend modifier rows)
      pricedExtras: line.extras,
      // Full engine result for this line (print / KOT read exclusive & inclusive amounts from it)
      pricedLine: line,
    };
  });

  // ── Summary ────────────────────────────────────────────────────────────────
  const t = priced.totals;
  const isBillDisc = priced.billDiscountApplied;
  // Sub-total shown in the footer follows Price View (inclusive or exclusive amounts).
  const grossSubtotal = roundCalc(Math.max(0, calculatedLines.reduce((s, l) => s + (l.originalLineTotal ?? 0), 0)));
  const exclSubtotal = t.subTotalExclusive;
  const baseSubtotal = roundCalc(calculatedLines.reduce((s, l) => s + l.baseAmount, 0));

  const totalDiscountExcl = roundCalc(Math.min(exclSubtotal, isBillDisc ? t.billDiscountExclusive : t.itemDiscountExclusive));
  const totalDiscountIncl = roundCalc(Math.min(grossSubtotal, isBillDisc ? t.billDiscountInclusive : t.itemDiscountInclusive));

  return {
    lines: calculatedLines,
    summary: {
      baseSubtotal,
      subtotal: exclSubtotal,
      subTotalInclusive: grossSubtotal,
      subTotalExclusive: exclSubtotal,
      itemDiscountsTotal: t.itemDiscountExclusive,
      billDiscountTotal: t.billDiscountExclusive,
      totalDiscount: totalDiscountExcl,
      totalDiscountIncl,
      totalDiscountExcl,
      serviceCharge: t.serviceCharge,
      levy: t.levy,
      charges: roundCalc(t.serviceCharge + t.levy),
      netValue: t.vatExclAmount,
      vatExclAmount: t.vatExclAmount,
      vatAmount: t.vatAmount,
      deliveryCharge: t.deliveryCharge,
      grandTotal: t.grandTotal,
      netAmount: t.grandTotal,
      itemCount: t.itemCount,
      totalExtras: roundCalc(calculatedLines.reduce((s, l) => s + l.extrasTotal, 0)),
      totalServiceCharge: t.serviceCharge,
      totalLevy: t.levy,
      tax: t.vatAmount,
      total: t.grandTotal,
    },
  };
};

export const formatBillAmount = (value: number): number => {
  const decimals = getDecimalPart();
  return parseFloat(Number(value || 0).toFixed(decimals));
};

/**
 * Returns the strictly tax-exclusive price for an item or detail line.
 * Retains high precision (CALC_PRECISION = 7 decimals) for calculations.
 */
export const getTaxExclusivePrice = (
  item: any,
  config?: BillingConfig
): number => {
  if (!item) return 0;

  // 1. If already flagged or stored as tax-exclusive, return immediately
  if (item.isPriceTaxExclusive && item.price !== undefined && !isNaN(Number(item.price)) && Number(item.price) > 0) {
    return roundCalc(item.price, CALC_PRECISION);
  }
  if (item.basePrice !== undefined && item.basePrice !== null && !isNaN(Number(item.basePrice)) && Number(item.basePrice) > 0) {
    return roundCalc(item.basePrice, CALC_PRECISION);
  }
  if (item.exclusivePrice !== undefined && item.exclusivePrice !== null && !isNaN(Number(item.exclusivePrice)) && Number(item.exclusivePrice) > 0) {
    return roundCalc(item.exclusivePrice, CALC_PRECISION);
  }

  const rawPrice = Number(item.price ?? item.product?.price ?? 0);
  if (!rawPrice || isNaN(rawPrice)) return 0;

  const isVatEnabled = getVatStatus();
  if (!isVatEnabled) return roundCalc(rawPrice, CALC_PRECISION);

  const resolvedConfig = config || getBillingConfig(item.orderType || 'DineIn');
  const rawVatRate = (item.product?.vatValue !== undefined && item.product?.vatValue !== null)
    ? Number(item.product.vatValue)
    : (item.vatValue !== undefined && item.vatValue !== null)
    ? Number(item.vatValue)
    : (item.vatRate !== undefined && item.vatRate !== null)
    ? Number(item.vatRate)
    : (resolvedConfig.vatRate > 1 ? resolvedConfig.vatRate : (resolvedConfig.vatRate > 0 ? resolvedConfig.vatRate * 100 : 10));

  const activeVatRate = rawVatRate > 1 ? rawVatRate / 100 : (rawVatRate > 0 ? rawVatRate : 0.10);
  if (activeVatRate <= 0) return roundCalc(rawPrice, CALC_PRECISION);

  const isDineIn = (resolvedConfig.orderType || '').toLowerCase().includes('dine');
  const scRate = (isDineIn && resolvedConfig.serviceChargeRate > 0) ? resolvedConfig.serviceChargeRate : 0;
  const levyRate = resolvedConfig.levyRate > 0 ? resolvedConfig.levyRate : 0;
  const vatFactor = (isVatEnabled && activeVatRate > 0) ? (1 + activeVatRate) : 1;
  const levyFactor = levyRate > 0 ? (1 + levyRate) : 1;
  const scFactor = scRate > 0 ? (1 + scRate) : 1;
  const combinedFactor = vatFactor * levyFactor * scFactor;

  const qty = Number(item.qty ?? item.quantity ?? 1);
  const vatAmt = Number(item.vatAmount ?? 0);
  const discAmt = Number(item.discAmount ?? item.discountAmount ?? item.itemDiscount ?? item.effectiveDiscountAmount ?? item.discountValue ?? 0);
  const sc = Number(item.serviceCharge ?? item.sc ?? 0);
  const levy = Number(item.levy ?? 0);
  const netAmt = Number(item.netAmount ?? item.lineNetAmount ?? 0);

  // 2. Mathematical detection from line values if vatAmount > 0
  if (vatAmt > 0.0001 && qty > 0) {
    const lineBase = rawPrice * qty;
    const remainingBase = lineBase - discAmt + sc + levy;

    // Check A: Is rawPrice ALREADY tax-exclusive?
    // If exclusive, remainingBase * activeVatRate == vatAmt
    if (Math.abs(remainingBase * activeVatRate - vatAmt) < 0.03) {
      return roundCalc(rawPrice, CALC_PRECISION);
    }

    // Check B: Is rawPrice INCLUSIVE?
    // If inclusive, (remainingBase / combinedFactor) * activeVatRate == vatAmt
    // OR netAmt matches remainingBase while vatAmt is on top
    if (
      Math.abs((remainingBase / combinedFactor) * activeVatRate - vatAmt) < 0.03 ||
      Math.abs((remainingBase / (1 + activeVatRate)) * activeVatRate - vatAmt) < 0.03 ||
      (netAmt > 0 && Math.abs(netAmt - remainingBase) < 0.03)
    ) {
      return roundCalc(rawPrice / combinedFactor, CALC_PRECISION);
    }
  }

  // 3. Fallback based on inclusivity flag or system config
  const isInclusive =
    item.isIncl === true ? true :
    item.isIncl === false ? false :
    item.priceIsIncl === true ? true :
    item.priceIsIncl === false ? false :
    item.product?.isIncl === true ? true :
    item.product?.isIncl === false ? false :
    item.product?.priceIsIncl === true ? true :
    item.product?.priceIsIncl === false ? false :
    resolvedConfig.vatType === 'Inclusive' ||
    getPriceView() === 'Inclusive';

  if (isInclusive) {
    return roundCalc(rawPrice / combinedFactor, CALC_PRECISION);
  }

  return roundCalc(rawPrice, CALC_PRECISION);
};

/**
 * Sanitizes an order or sales invoice detail line to ensure `price`
 * is STRICTLY tax-exclusive, while `netAmount` includes tax (net payable amount).
 */
export const sanitizeTaxExclusiveDetail = (d: any, config?: BillingConfig) => {
  if (!d) return d;
  if (d.isSanitized === true || d.isPriceTaxExclusive === true) {
    return d;
  }

  const qty = Number(d.qty ?? d.quantity ?? 1);
  let discAmt = roundCalc(Number(d.discAmount ?? d.DiscAmount ?? 0));
  const sc = roundCalc(Number(d.serviceCharge ?? d.ServiceCharge ?? 0));
  const levy = roundCalc(Number(d.levy ?? d.Levy ?? 0));
  let vatAmt = roundCalc(Number(d.vatAmount ?? d.VatAmount ?? 0));
  const rawNet = Number(d.netAmount ?? d.NetAmount ?? 0);
  const rawPrice = Number(d.price ?? d.basePrice ?? 0);

  const isVatEnabled = getVatStatus();
  const resolvedConfig = config || getBillingConfig(d.orderType || 'DineIn');
  const rawVatRate = (d.product?.vatValue !== undefined && d.product?.vatValue !== null)
    ? Number(d.product.vatValue)
    : (d.vatValue !== undefined && d.vatValue !== null)
    ? Number(d.vatValue)
    : (d.vatRate !== undefined && d.vatRate !== null)
    ? Number(d.vatRate)
    : (resolvedConfig.vatRate > 1 ? resolvedConfig.vatRate : (resolvedConfig.vatRate > 0 ? resolvedConfig.vatRate * 100 : 10));
  const activeVatRate = isVatEnabled ? (rawVatRate > 1 ? rawVatRate / 100 : (rawVatRate > 0 ? rawVatRate : 0.10)) : 0;

  // 1. If line already has known basePrice or exclusivePrice, use it
  let exclPrice = d.basePrice ?? d.exclusivePrice;

  // 2. If line has gross netAmount matching (rawPrice * qty) and vatAmount > 0:
  // e.g. rawPrice = 3, qty = 2, rawNet = 6, vatAmt = 0.545 -> rawPrice is 100% INCLUSIVE!
  if (!exclPrice && vatAmt > 0 && qty > 0) {
    const grossLineBase = rawPrice * qty - discAmt + sc + levy;
    if (Math.abs(grossLineBase - rawNet) < 0.05 || Math.abs((rawPrice * qty) - rawNet) < 0.05) {
      // rawPrice is gross/inclusive! Compute strictly exclusive price:
      const exclLineBase = Math.max(0, rawNet - vatAmt - sc - levy + discAmt);
      exclPrice = roundCalc(exclLineBase / qty, CALC_PRECISION);
    }
  }

  // 3. Fallback to getTaxExclusivePrice
  if (!exclPrice) {
    exclPrice = roundCalc(getTaxExclusivePrice(d, config), CALC_PRECISION);
  } else {
    exclPrice = roundCalc(exclPrice, CALC_PRECISION);
  }

  // 4. If line discount was entered as gross/inclusive discount on an inclusive price, convert to tax-exclusive
  const grossExpectedDisc = (d.discPer && Number(d.discPer) > 0) ? (rawPrice * qty * Number(d.discPer) / 100) : 0;
  const isAlreadyExcl = Boolean(
    d.isPriceTaxExclusive ||
    d.isSanitized ||
    (grossExpectedDisc > 0 && Math.abs(discAmt - (grossExpectedDisc / (1 + activeVatRate))) < 0.05) ||
    (d.basePrice !== undefined && d.discountAmount !== undefined) ||
    (d.basePrice !== undefined && d.effectiveDiscountAmount !== undefined)
  );

  if (!isAlreadyExcl && !d.isPriceTaxExclusive && exclPrice < rawPrice && discAmt > 0 && isVatEnabled && activeVatRate > 0) {
    if (Math.abs((rawPrice * qty - discAmt + sc + levy) - rawNet) < 0.05 || Math.abs((rawPrice * qty - discAmt) - rawNet) < 0.05) {
      discAmt = roundCalc(discAmt / (1 + activeVatRate), CALC_PRECISION);
    }
  }

  // Strictly tax-exclusive line base: (exclPrice * qty) - discAmt + sc + levy
  const exclLineBase = roundCalc(Math.max(0, (exclPrice * qty) - discAmt + sc + levy));

  const isComplimentary = Boolean(
    d.complimentaryStatus ||
    d.ComplimentaryStatus ||
    Number(d.discPer ?? d.DiscPer ?? 0) === 100 ||
    (rawNet === 0 && d.complimentaryStatus)
  );

  const currencyDecimals = getDecimalPart();

  // 5. Self-healing VAT: if VAT is enabled and active but vatAmt is missing/0 on a non-complimentary taxable line
  if (vatAmt <= 0.0001 && isVatEnabled && activeVatRate > 0 && exclLineBase > 0 && !isComplimentary) {
    vatAmt = roundCalc(exclLineBase * activeVatRate, currencyDecimals);
  }

  // Line netAmount includes tax: (exclLineBase + vatAmt)
  const lineNetAmountWithTax = roundCalc(Math.max(0, exclLineBase + vatAmt));

  // If rawNet was already inclusive (matching exclLineBase + vatAmt), use rawNet
  const finalNetAmount = (rawNet > 0 && Math.abs(rawNet - lineNetAmountWithTax) < 0.05)
    ? roundCalc(rawNet, currencyDecimals)
    : roundCalc(lineNetAmountWithTax, currencyDecimals);

  return {
    ...d,
    qty,
    price: exclPrice,
    basePrice: exclPrice,
    exclusivePrice: exclPrice,
    isPriceTaxExclusive: true,
    isSanitized: true,
    discAmount: discAmt,
    serviceCharge: sc,
    levy,
    vatAmount: roundCalc(vatAmt, currencyDecimals),
    netAmount: finalNetAmount,
  };
};

/**
 * Returns the tax-exclusive price for extra/modifier rows.
 * Retains high precision (CALC_PRECISION = 7 decimals).
 */
export const getTaxExclusiveExtraPrice = (
  extraPrice: number,
  vatRatePercent: number,
  _isInclusive?: boolean,
  config?: BillingConfig
): number => {
  const p = Number(extraPrice) || 0;
  if (p === 0) return 0;
  const isVatEnabled = getVatStatus();
  const rateFraction = vatRatePercent / 100;
  if (!isVatEnabled || rateFraction <= 0) {
    return roundCalc(p, CALC_PRECISION);
  }
  const fallbackOrderType = (typeof localStorage !== 'undefined' ? localStorage.getItem('pos_selected_order_type') || localStorage.getItem('defaultOrderType') : '') || 'TakeOut';
  const resolvedConfig = config || getBillingConfig(fallbackOrderType);
  const isDineIn = (resolvedConfig.orderType || '').toLowerCase().includes('dine');
  const scRate = (isDineIn && resolvedConfig.serviceChargeRate > 0) ? resolvedConfig.serviceChargeRate : 0;
  const levyRate = resolvedConfig.levyRate > 0 ? resolvedConfig.levyRate : 0;
  const vatFactor = (isVatEnabled && rateFraction > 0) ? (1 + rateFraction) : 1;
  const levyFactor = levyRate > 0 ? (1 + levyRate) : 1;
  const scFactor = scRate > 0 ? (1 + scRate) : 1;
  const combinedFactor = vatFactor * levyFactor * scFactor;
  return roundCalc(p / combinedFactor, CALC_PRECISION);
};


/**
 * Billing config for an order being edited: the order keeps the service charge / levy it was SAVED
 * with (rates in percent); everything else (VAT, discount mode, price view) follows the current config.
 * Used by BOTH the cart selector and the payload mapper so the screen and the saved order always match.
 */
export const getBillingConfigForOrder = (
  orderType: string,
  savedRates?: { serviceCharge: number; levy: number } | null
): BillingConfig => {
  const base = getBillingConfig(orderType);
  if (!savedRates) return base;
  return {
    ...base,
    serviceChargeRate: (Number(savedRates.serviceCharge) || 0) / 100,
    levyRate: (Number(savedRates.levy) || 0) / 100,
  };
};
