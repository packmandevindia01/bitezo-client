import { getDecimalPart } from "../../../../utils/formatters";
import { formatItemDisplayName } from "../../utils/alternativeHelpers";
import { allocate } from "./pos-calc";

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
  targetView?: "Inclusive" | "Exclusive"
): number => {
  const view = targetView || getPriceView();
  const isVatEnabled = getVatStatus();
  const rate = (vatRate !== undefined && vatRate !== null && !isNaN(Number(vatRate)))
    ? Number(vatRate) / 100
    : 0.10;

  if (!isVatEnabled || rate <= 0 || !rawPrice || rawPrice <= 0) {
    return rawPrice || 0;
  }

  const isStoredIncl = isProductIncl === true;

  if (view === "Exclusive") {
    if (isStoredIncl) {
      return roundCalc(rawPrice / (1 + rate), CALC_PRECISION);
    }
    return rawPrice;
  } else {
    if (!isStoredIncl) {
      return roundCalc(rawPrice * (1 + rate), CALC_PRECISION);
    }
    return rawPrice;
  }
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
    const rawSc = configs.serviceCharges ?? configs.serviceCharge ?? configs.ServiceCharges ?? 0;
    const rawLevy = configs.levy ?? configs.Levy ?? 0;

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
      serviceChargeRate: 0.10,
      levyRate: 0.05,
      vatRate: 0.10,
      vatType: getPriceView(),
      discountType: getDiscountCalculation(),
      orderType
    };
  }
};

export const getVatStatus = (): boolean => {
  try {
    // Priority 1: Check direct localStorage vatStatus / enableVat / isVatEnabled
    for (const key of ['vatStatus', 'VatStatus', 'enableVat', 'EnableVat', 'isVatEnabled']) {
      const direct = localStorage.getItem(key);
      if (direct !== null && direct !== undefined) {
        const norm = String(direct).trim().toLowerCase();
        if (norm === 'true' || norm === 'enable' || norm === '1') return true;
        if (norm === 'false' || norm === 'disable' || norm === '0') return false;
      }
    }

    // Priority 2: Check cached posConfigs JSON
    for (const key of ['posConfigs', 'posConfig', 'pos_configs', 'pos_config']) {
      const saved = localStorage.getItem(key);
      if (!saved) continue;
      const parsed = JSON.parse(saved);
      const configs = parsed?.configs || parsed;
      const val =
        configs?.VatStatus ??
        configs?.vatStatus ??
        configs?.enableVat ??
        configs?.EnableVat ??
        configs?.isVatEnabled ??
        parsed?.VatStatus ??
        parsed?.vatStatus ??
        parsed?.enableVat ??
        parsed?.EnableVat;
      if (val !== undefined && val !== null) {
        return (
          val === true ||
          String(val).toLowerCase() === 'true' ||
          String(val).toLowerCase() === 'enable' ||
          String(val).toLowerCase() === '1'
        );
      }
      const vatRateVal = configs?.vat ?? configs?.Vat ?? configs?.vatRate ?? configs?.VatRate ?? parsed?.vat ?? parsed?.Vat;
      if (vatRateVal !== undefined && vatRateVal !== null && Number(vatRateVal) > 0) {
        return true;
      }
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

export const calculateLineItem = (
  qty: number,
  price: number,
  discount: number | { type: 'percentage' | 'amount'; value: number },
  extras: number,
  config: BillingConfig,
  itemVatRate?: number,
  isIncl?: boolean   // per-line override: true=inclusive, false=exclusive, undefined=follow global config
) => {
  const isVatEnabled = getVatStatus();
  const rawVatRate = itemVatRate !== undefined ? itemVatRate / 100 : config.vatRate;
  const activeVatRate = isVatEnabled ? rawVatRate : 0;

  const isSystemInclusive = config.vatType === 'Inclusive';
  const isDineIn = (config.orderType || '').toLowerCase().includes('dine');
  const scRate = (isDineIn && config.serviceChargeRate > 0) ? config.serviceChargeRate : 0;
  const levyRate = config.levyRate > 0 ? config.levyRate : 0;

  const vatFactor = (isVatEnabled && activeVatRate > 0) ? (1 + activeVatRate) : 1;
  const levyFactor = levyRate > 0 ? (1 + levyRate) : 1;
  const scFactor = scRate > 0 ? (1 + scRate) : 1;
  const combinedFactor = vatFactor * levyFactor * scFactor;

  // 1. Determine exclusive base price and base extras:
  let basePrice = price;
  let baseExtras = extras;

  if (isIncl === false) {
    // Explicitly tax-exclusive product master item
    basePrice = price;
    baseExtras = extras;
  } else if (isSystemInclusive) {
    basePrice = price / combinedFactor;
    baseExtras = extras / combinedFactor;
  } else if (isIncl === true) {
    // Product master isIncl: price is VAT-inclusive only (not SC or levy inclusive)
    basePrice = (isVatEnabled && activeVatRate > 0) ? price / (1 + activeVatRate) : price;
    baseExtras = (isVatEnabled && activeVatRate > 0 && extras > 0) ? extras / (1 + activeVatRate) : extras;
  } else {
    basePrice = price;
    baseExtras = extras;
  }

  const baseAmount = qty * basePrice;
  const amount = baseAmount + baseExtras;

  // 2. Determine baseDiscount (exclusive) and grossDiscount (inclusive):
  let baseDiscount = 0;
  let grossDiscount = 0;
  let rawVal = 0;
  let isPercent = false;

  if (typeof discount === 'object' && discount !== null) {
    if (discount.type === 'percentage') {
      isPercent = true;
      const pct = Math.min(100, Math.max(0, Number(discount.value) || 0));
      baseDiscount = amount * (pct / 100);
      grossDiscount = (amount * combinedFactor) * (pct / 100);
      rawVal = baseDiscount;
    } else {
      rawVal = Math.max(0, Number(discount.value) || 0);
    }
  } else {
    rawVal = Math.max(0, Number(discount) || 0);
  }

  if (!isPercent && rawVal > 0) {
    if (config.discountType === 'Inclusive') {
      // Typed discount is inclusive (reduces gross)
      grossDiscount = Math.min(amount * combinedFactor, rawVal);
      baseDiscount = grossDiscount / combinedFactor;
    } else {
      // Typed discount is exclusive (reduces base)
      baseDiscount = Math.min(amount, rawVal);
      grossDiscount = baseDiscount * combinedFactor;
    }
  }

  baseDiscount = Math.min(amount, Math.max(0, baseDiscount));
  grossDiscount = Math.min(amount * combinedFactor, Math.max(0, grossDiscount));

  // 3. Charges and tax on discounted base:
  const netValue = Math.max(0, amount - baseDiscount);
  const sc = isDineIn && netValue > 0 ? netValue * scRate : 0;
  const levy = netValue > 0 ? (netValue + sc) * levyRate : 0;
  const vatBase = roundCalc(Math.max(0, netValue + sc + levy));
  let vatAmount = 0;
  if (isVatEnabled && activeVatRate > 0 && vatBase > 0) {
    vatAmount = Math.max(0, vatBase * activeVatRate);
  }
  const lineNetAmount = Math.max(0, vatBase + vatAmount);

  return {
    basePrice: roundCalc(basePrice, CALC_PRECISION),
    baseAmount: roundCalc(baseAmount),
    amount: roundCalc(amount),
    netValue: roundCalc(netValue),
    sc: roundCalc(sc),
    levy: roundCalc(levy),
    vatAmount: roundCalc(vatAmount),
    lineNetAmount: roundCalc(lineNetAmount),
    discountAmount: isSystemInclusive ? roundCalc(grossDiscount) : roundCalc(baseDiscount),
    baseDiscount: roundCalc(baseDiscount),
    combinedFactor,
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
 * Single Source of Truth Central POS Calculation Engine.
 * Calculates all cart lines, taxes, discounts, surcharges, and totals deterministically.
 */
export const calculateOrder = (
  items: any[] = [],
  options: OrderCalculationOptions = {}
): OrderCalculationResult => {
  const config = options.config || getBillingConfig(options.orderType || 'DineIn');
  const isVatEnabled = getVatStatus();
  const isTaxInclusive = config.vatType === 'Inclusive';
  const billDiscVal = Number(options.billDiscountValue) || 0;
  const billDiscType = options.billDiscountType || 'percentage';

  // ── PASS 1: Pre-calculate gross and base amounts for proportional bill discount ──────
  let totalGross = 0;
  let totalBase = 0;
  const preCalculated = items.map((item) => {
    const cachedProduct = (options.productCache && options.productCache[item.productId]);
    const product = cachedProduct
      ? { ...item.product, ...cachedProduct, vatValue: cachedProduct.vatValue ?? item.product?.vatValue ?? item.vatValue }
      : (item.product || {});
    const price = Number(item.price ?? product.price ?? 0);
    const quantity = Number(item.quantity ?? 1);

    const extras = item.extras || [];
    const modifiers = item.modifiers || [];
    const messages = item.messages || [];

    const totalExtrasForLine = extras.reduce((sum: number, ex: any) => {
      const p = parseFloat(String(ex.price)) || 0;
      const q = parseFloat(String(ex.qty)) || 1;
      return sum + (p * q);
    }, 0);

    const rawVatRate = (product.vatValue !== undefined && product.vatValue !== null)
      ? Number(product.vatValue)
      : (item.product?.vatValue !== undefined && item.product?.vatValue !== null)
      ? Number(item.product.vatValue)
      : (item.vatValue !== undefined && item.vatValue !== null)
      ? Number(item.vatValue)
      : (item.vatRate !== undefined && item.vatRate !== null)
      ? Number(item.vatRate)
      : (config.vatRate * 100);
    const effectiveVatRate = isVatEnabled ? rawVatRate : 0;

    const noDiscountCalcs = calculateLineItem(
      quantity,
      price,
      0,
      totalExtrasForLine,
      config,
      effectiveVatRate,
      item.isIncl
    );

    const itemGross = noDiscountCalcs.lineNetAmount;
    const itemBase = noDiscountCalcs.amount;
    totalGross += itemGross;
    totalBase += itemBase;

    return {
      item,
      product,
      price,
      quantity,
      extras,
      modifiers,
      messages,
      totalExtrasForLine,
      effectiveVatRate,
      noDiscountCalcs,
      itemGross,
      itemBase,
    };
  });

  // Calculate savedBillDiscount (strictly in exclusive terms)
  let savedBillDiscount = 0;
  if (billDiscVal > 0 && totalBase > 0) {
    if (billDiscType === 'percentage') {
      savedBillDiscount = totalBase * (billDiscVal / 100);
    } else {
      if (config.discountType === 'Inclusive') {
        const orderFactor = totalGross > 0 ? totalGross / totalBase : 1;
        savedBillDiscount = billDiscVal / orderFactor;
      } else {
        savedBillDiscount = billDiscVal;
      }
    }
    savedBillDiscount = Math.min(totalBase, Math.max(0, savedBillDiscount));
  }

  // Allocate saved exclusive bill discount across lines proportionally
  const lineWeights = preCalculated.map(p => p.itemBase);
  const allocatedBillDiscounts = allocate(savedBillDiscount, lineWeights);

  // ── PASS 2: Calculate line items and allocate discounts ─────────────────────
  const calculatedLines: CalculatedLineItem[] = preCalculated.map(
    ({ item, product, price, quantity, extras, modifiers, messages, totalExtrasForLine, effectiveVatRate, noDiscountCalcs }, idx) => {
      const displayName = formatItemDisplayName(product.name || 'Item', item.variantName);

      let discountObj: { type: 'percentage' | 'amount'; value: number } | number = 0;
      let isBillDisc = false;

      if (billDiscVal > 0 && totalBase > 0) {
        isBillDisc = true;
        // The allocated bill discount is strictly in exclusive terms
        discountObj = { type: 'amount', value: allocatedBillDiscounts[idx] };
      } else if (item.discountValue && Number(item.discountValue) > 0) {
        discountObj = { type: item.discountType || 'amount', value: Number(item.discountValue) };
      }

      // If bill discount, it is already converted to exclusive amount:
      const lineConfig = isBillDisc ? { ...config, discountType: 'Exclusive' as const } : config;

      const calcs = calculateLineItem(
        quantity,
        price,
        discountObj,
        totalExtrasForLine,
        lineConfig,
        effectiveVatRate,
        item.isIncl
      );

      const effectiveDiscountAmount = isBillDisc ? 0 : calcs.discountAmount;
      const baseDiscountAmount = calcs.baseDiscount;
      const itemDiscountAmount = isBillDisc ? 0 : baseDiscountAmount;
      const billDiscountAmount = isBillDisc ? baseDiscountAmount : 0;
      const itemDiscountGross = isBillDisc ? 0 : calcs.discountAmount;
      const displayItemDiscount = isBillDisc ? 0 : (isTaxInclusive ? calcs.discountAmount : calcs.baseDiscount);

      // Deduct extras proportionally from main detail line for backend payload compatibility
      let mainNetAmount = calcs.lineNetAmount;
      let mainVatAmount = calcs.vatAmount;
      let mainSc = calcs.sc;
      let mainLevy = calcs.levy;

      if (extras.length > 0) {
        const activeRateFraction = effectiveVatRate / 100;
        const isItemInclusive =
          item.isIncl === true ? true :
          item.isIncl === false ? false :
          config.vatType === 'Inclusive';
        extras.forEach((extra: any) => {
          const exPrice = Number(extra.price) || 0;
          const exQty = Number(extra.qty) || 1;
          const actualExtraPrice = isItemInclusive && isVatEnabled && activeRateFraction > 0 ? exPrice / (1 + activeRateFraction) : exPrice;
          const extraBase = actualExtraPrice * exQty;
          const proportion = calcs.amount > 0 ? extraBase / calcs.amount : 0;

          mainNetAmount -= (calcs.lineNetAmount * proportion);
          mainVatAmount -= (calcs.vatAmount * proportion);
          mainSc -= (calcs.sc * proportion);
          mainLevy -= (calcs.levy * proportion);
        });
      }

        const resolvedUnitId = item.unitId || product.unitId || 1;
        const effectiveUnitRate = isTaxInclusive
          ? (quantity > 0 ? roundCalc((noDiscountCalcs.lineNetAmount - totalExtrasForLine) / quantity, CALC_PRECISION) : price)
          : calcs.basePrice;

        const effectiveLineTotal = isTaxInclusive
          ? (isBillDisc ? noDiscountCalcs.lineNetAmount : calcs.lineNetAmount)
          : (isBillDisc ? noDiscountCalcs.amount : calcs.netValue);

        const effectiveOriginalLineTotal = isTaxInclusive
          ? noDiscountCalcs.lineNetAmount
          : noDiscountCalcs.amount;

        return {
          ...item,
          uniqueId: item.uniqueId || `${item.productId}-${Date.now()}-${Math.random()}`,
          productId: item.productId || product.id || 0,
          unitId: resolvedUnitId,
          quantity,
          catalogPrice: price,
          price: effectiveUnitRate,
          basePrice: calcs.basePrice,
          exclusivePrice: calcs.basePrice,
          isIncl: item.isIncl,
          variantName: item.variantName,
          variantArabic: item.variantArabic,
          product: {
            ...product,
            unitId: resolvedUnitId,
            name: displayName,
            catalogPrice: price,
            price: effectiveUnitRate,
          },
        extras,
        modifiers,
        messages,
        mapId: item.mapId,
        isExisting: item.isExisting,
        originalQty: item.originalQty,
        discountValue: item.discountValue,
        discountType: item.discountType,

        baseAmount: calcs.baseAmount,
        extrasTotal: totalExtrasForLine,
        amount: calcs.amount,
        itemDiscount: displayItemDiscount,
        itemDiscountAmount,
        itemDiscountExcl: isTaxInclusive ? ((calcs as any).baseDiscount ?? itemDiscountAmount) : itemDiscountAmount,
        itemDiscountIncl: itemDiscountGross,
        billDiscountAmount,
        effectiveDiscountAmount,
        netValue: calcs.netValue,
        sc: calcs.sc,
        levy: calcs.levy,
        vatBase: calcs.netValue + calcs.sc + calcs.levy,
        vatRate: effectiveVatRate,
        vatAmount: calcs.vatAmount,
        lineTotal: effectiveLineTotal,
        lineNetAmount: calcs.lineNetAmount,
        originalLineTotal: effectiveOriginalLineTotal,

        mainNetAmount: roundCalc(Math.max(0, mainNetAmount)),
        mainVatAmount: roundCalc(Math.max(0, mainVatAmount)),
        mainSc: roundCalc(Math.max(0, mainSc)),
        mainLevy: roundCalc(Math.max(0, mainLevy)),
      };
    }
  );

  // ── PASS 3: Resolve delivery charges & aggregate master totals ──────────────
  const normalizedOrderTypeName = (options.orderType || config.orderType || '').toLowerCase().replace(/[\s_-]/g, '');
  const isDelivery = options.orderTypeId === 4 || normalizedOrderTypeName.includes('delivery');

  let deliveryCharge = 0;
  if (isDelivery) {
    if (options.customDeliveryCharge !== null && options.customDeliveryCharge !== undefined) {
      deliveryCharge = Number(options.customDeliveryCharge) || 0;
    } else {
      deliveryCharge = getStoredDefaultDeliveryCharge();
    }
  }

  const grossSubtotal = roundCalc(
    Math.max(
      0,
      calculatedLines.reduce(
        (sum, l) => sum + (l.originalLineTotal ?? (l.price * l.quantity + l.extrasTotal)),
        0
      )
    )
  );
  const exclSubtotal = roundCalc(Math.max(0, calculatedLines.reduce((sum, l) => sum + l.amount, 0)));
  const baseSubtotal = roundCalc(Math.max(0, calculatedLines.reduce((sum, l) => sum + l.baseAmount, 0)));
  const subtotal = exclSubtotal;

  const isBillDisc = billDiscVal > 0;

  // Aggregate line-level discounts
  const itemDiscountsExcl = roundCalc(Math.max(0, calculatedLines.reduce((sum, l) => sum + (l.itemDiscountExcl ?? l.itemDiscountAmount ?? 0), 0)));
  const itemDiscountsIncl = roundCalc(Math.max(0, calculatedLines.reduce((sum, l) => sum + (l.itemDiscountIncl ?? l.itemDiscountGross ?? l.itemDiscountAmount ?? 0), 0)));

  // Aggregate bill discount
  const billDiscountExcl = roundCalc(savedBillDiscount);
  const billDiscountIncl = roundCalc(savedBillDiscount * (totalBase > 0 ? totalGross / totalBase : 1));

  const totalDiscountExcl = roundCalc(Math.min(exclSubtotal, isBillDisc ? billDiscountExcl : itemDiscountsExcl));
  const totalDiscountIncl = roundCalc(Math.min(grossSubtotal, isBillDisc ? billDiscountIncl : itemDiscountsIncl));
  const displayDiscount = totalDiscountExcl;
  const itemDiscountsTotal = itemDiscountsExcl;
  const billDiscountTotal = billDiscountExcl;
  const serviceCharge = roundCalc(Math.max(0, calculatedLines.reduce((sum, l) => sum + l.sc, 0)));
  const levy = roundCalc(Math.max(0, calculatedLines.reduce((sum, l) => sum + l.levy, 0)));
  const charges = roundCalc(serviceCharge + levy);
  const vatAmount = roundCalc(Math.max(0, calculatedLines.reduce((sum, l) => sum + l.vatAmount, 0)));
  const vatExclAmount = roundCalc(Math.max(0, exclSubtotal - totalDiscountExcl + serviceCharge + levy));
  const itemCount = calculatedLines.reduce((sum, l) => sum + l.quantity, 0);
  const totalExtras = roundCalc(calculatedLines.reduce((sum, l) => sum + l.extrasTotal, 0));

  // Align grandTotal directly with sum of line net amounts to prevent floating-point accumulation drift
  const linesNetTotal = roundCalc(Math.max(0, calculatedLines.reduce((sum, l) => sum + l.lineNetAmount, 0)));
  const grandTotal = roundCalc(Math.max(0, linesNetTotal + deliveryCharge));

  return {
    lines: calculatedLines,
    summary: {
      baseSubtotal,
      subtotal,
      subTotalInclusive: grossSubtotal,
      subTotalExclusive: exclSubtotal,
      itemDiscountsTotal,
      billDiscountTotal,
      totalDiscount: displayDiscount,
      totalDiscountIncl,
      totalDiscountExcl,
      serviceCharge,
      levy,
      charges,
      netValue: vatExclAmount,
      vatExclAmount,
      vatAmount,
      deliveryCharge: roundCalc(Math.max(0, deliveryCharge)),
      grandTotal,
      netAmount: grandTotal,
      itemCount,
      totalExtras,
      totalServiceCharge: serviceCharge,
      totalLevy: levy,
      tax: vatAmount,
      total: grandTotal,
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
    // If inclusive, (remainingBase / (1 + activeVatRate)) * activeVatRate == vatAmt
    // OR netAmt matches remainingBase while vatAmt is on top
    if (
      Math.abs((remainingBase / (1 + activeVatRate)) * activeVatRate - vatAmt) < 0.03 ||
      (netAmt > 0 && Math.abs(netAmt - remainingBase) < 0.03)
    ) {
      return roundCalc(rawPrice / (1 + activeVatRate), CALC_PRECISION);
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
    return roundCalc(rawPrice / (1 + activeVatRate), CALC_PRECISION);
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
  isInclusive: boolean
): number => {
  const p = Number(extraPrice) || 0;
  if (p === 0) return 0;
  const isVatEnabled = getVatStatus();
  const rateFraction = vatRatePercent / 100;
  if (!isVatEnabled || rateFraction <= 0 || !isInclusive) {
    return roundCalc(p, CALC_PRECISION);
  }
  return roundCalc(p / (1 + rateFraction), CALC_PRECISION);
};

