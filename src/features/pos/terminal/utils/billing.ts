import { getDecimalPart } from "../../../../utils/formatters";

export interface BillingConfig {
  serviceChargeRate: number;
  levyRate: number;
  vatRate: number;
  vatType: 'Exclusive' | 'Inclusive';
  discountType: 'Exclusive' | 'Inclusive';
  orderType: string;
}

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
    
    const rawDiscCalc = configs.discCalc || configs.discountCalc || configs.DiscCalc || configs.DiscountCalc || '';
    const rawPriceView = configs.priceView || configs.PriceView || '';
    const rawVat = configs.vat ?? configs.Vat ?? configs.vatRate ?? configs.VatRate ?? 0;
    const rawSc = configs.serviceCharges ?? configs.serviceCharge ?? configs.ServiceCharges ?? 0;
    const rawLevy = configs.levy ?? configs.Levy ?? 0;

    return {
      serviceChargeRate: Number(rawSc) / 100,
      levyRate: Number(rawLevy) / 100,
      vatRate: Number(rawVat) / 100,
      vatType: String(rawPriceView).toLowerCase() === 'inclusive' ? 'Inclusive' : 'Exclusive',
      discountType: String(rawDiscCalc).toLowerCase() === 'inclusive' ? 'Inclusive' : 'Exclusive',
      orderType
    };
  } catch {
    return {
      serviceChargeRate: 0.10,
      levyRate: 0.05,
      vatRate: 0.10,
      vatType: 'Exclusive',
      discountType: 'Exclusive',
      orderType
    };
  }
};

export const getVatStatus = (): boolean => {
  try {
    for (const key of ['posConfigs', 'posConfig', 'pos_configs']) {
      const saved = localStorage.getItem(key);
      if (!saved) continue;
      const parsed = JSON.parse(saved);
      const configs = parsed?.configs || parsed;
      const val = configs?.VatStatus ?? configs?.vatStatus ?? parsed?.VatStatus ?? parsed?.vatStatus;
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
  return Math.round((num + Number.EPSILON) * factor) / factor;
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

  // Determine if this specific line item is VAT inclusive
  const isInclusive =
    isIncl === true  ? true :
    isIncl === false ? false :
    config.vatType === 'Inclusive';

  let basePrice = price;
  let baseDiscount = 0;

  // Extras reverse calculation if VAT is active and inclusive
  let baseExtras = (isInclusive && isVatEnabled && activeVatRate > 0) ? extras / (1 + activeVatRate) : extras;

  // Reverse Calculation for Inclusive VAT (Main Product)
  if (isInclusive && isVatEnabled && activeVatRate > 0) {
    basePrice = price / (1 + activeVatRate);
  }

  const amount = (qty * basePrice) + baseExtras;

  if (typeof discount === 'object') {
    if (discount.type === 'percentage') {
      const pct = Math.min(100, Math.max(0, Number(discount.value) || 0));
      baseDiscount = amount * (pct / 100);
    } else {
      const rawVal = Math.max(0, Number(discount.value) || 0);
      if ((isInclusive || config.discountType === 'Inclusive') && isVatEnabled && activeVatRate > 0) {
        baseDiscount = rawVal / (1 + activeVatRate);
      } else {
        baseDiscount = rawVal;
      }
    }
  } else {
    // Reverse Calculation for Discount based on Discount config or inclusive price
    const rawVal = Math.max(0, Number(discount) || 0);
    if ((isInclusive || config.discountType === 'Inclusive') && isVatEnabled && activeVatRate > 0) {
      baseDiscount = rawVal / (1 + activeVatRate);
    } else {
      baseDiscount = rawVal;
    }
  }

  // Cap baseDiscount to amount so net value cannot become negative
  baseDiscount = Math.min(amount, Math.max(0, baseDiscount));

  const netValue = Math.max(0, amount - baseDiscount);
  
  // SC applies only to Dine-In
  const isDineIn = (config.orderType || '').toLowerCase().includes('dine');
  const sc = isDineIn && netValue > 0 ? netValue * config.serviceChargeRate : 0;
  
  // Levy stacks on (Net Value + SC)
  const levy = netValue > 0 ? (netValue + sc) * config.levyRate : 0;
  
  const vatBase = Math.max(0, netValue + sc + levy);
  let vatAmount = 0;
  
  // Calculate VAT only if active, enabled, and vatBase > 0
  if (isVatEnabled && activeVatRate > 0 && vatBase > 0) {
    vatAmount = Math.max(0, vatBase * activeVatRate);
  }
  
  const lineNetAmount = Math.max(0, vatBase + vatAmount);

  return {
    basePrice: roundCalc(basePrice, CALC_PRECISION),
    baseAmount: roundCalc(qty * basePrice),
    amount: roundCalc(amount),
    netValue: roundCalc(netValue),
    sc: roundCalc(sc),
    levy: roundCalc(levy),
    vatAmount: roundCalc(vatAmount),
    lineNetAmount: roundCalc(lineNetAmount),
    discountAmount: roundCalc(baseDiscount)
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
  itemDiscountsTotal: number;
  billDiscountTotal: number;
  totalDiscount: number;
  serviceCharge: number;
  levy: number;
  charges: number;
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
  const billDiscVal = Number(options.billDiscountValue) || 0;
  const billDiscType = options.billDiscountType || 'percentage';

  // ── PASS 1: Pre-calculate gross amounts for proportional bill discount ──────
  let totalGross = 0;
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

    const itemGross = (price * quantity) + totalExtrasForLine;
    totalGross += itemGross;

    return {
      item,
      product,
      price,
      quantity,
      extras,
      modifiers,
      messages,
      totalExtrasForLine,
      itemGross,
    };
  });

  // Remainder-adjusted distribution of flat bill discount across lines
  const allocatedBillDiscounts = preCalculated.map(({ itemGross }) => {
    if (billDiscVal > 0 && totalGross > 0 && billDiscType === 'amount') {
      return (itemGross / totalGross) * billDiscVal;
    }
    return 0;
  });

  if (billDiscVal > 0 && totalGross > 0 && billDiscType === 'amount') {
    const sumAlloc = allocatedBillDiscounts.reduce((a, b) => a + b, 0);
    const delta = billDiscVal - sumAlloc;
    if (Math.abs(delta) > 0.00000001) {
      let maxIdx = 0;
      let maxGross = -1;
      preCalculated.forEach(({ itemGross }, idx) => {
        if (itemGross > maxGross) {
          maxGross = itemGross;
          maxIdx = idx;
        }
      });
      allocatedBillDiscounts[maxIdx] += delta;
    }
  }

  // ── PASS 2: Calculate line items and allocate discounts ─────────────────────
  const calculatedLines: CalculatedLineItem[] = preCalculated.map(
    ({ item, product, price, quantity, extras, modifiers, messages, totalExtrasForLine, itemGross: _itemGross }, idx) => {
      const displayName = item.variantName ? `${product.name || 'Item'} - ${item.variantName}` : (product.name || 'Item');

      let discountObj: { type: 'percentage' | 'amount'; value: number } | number = 0;
      let isBillDisc = false;

      if (billDiscVal > 0 && totalGross > 0) {
        isBillDisc = true;
        if (billDiscType === 'percentage') {
          discountObj = { type: 'percentage', value: billDiscVal };
        } else {
          discountObj = { type: 'amount', value: allocatedBillDiscounts[idx] };
        }
      } else if (item.discountValue && Number(item.discountValue) > 0) {
        discountObj = { type: item.discountType || 'amount', value: Number(item.discountValue) };
      }

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

      const calcs = calculateLineItem(
        quantity,
        price,
        discountObj,
        totalExtrasForLine,
        config,
        effectiveVatRate,
        item.isIncl
      );

      const noDiscountCalcs = calculateLineItem(
        quantity,
        price,
        0,
        totalExtrasForLine,
        config,
        effectiveVatRate,
        item.isIncl
      );

      const effectiveDiscountAmount = calcs.discountAmount ?? 0;
      const itemDiscountAmount = isBillDisc ? 0 : effectiveDiscountAmount;
      const billDiscountAmount = isBillDisc ? effectiveDiscountAmount : 0;

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

      return {
        ...item,
        uniqueId: item.uniqueId || `${item.productId}-${Date.now()}-${Math.random()}`,
        productId: item.productId || product.id || 0,
        unitId: item.unitId || product.unitId || 1,
        quantity,
        price,
        basePrice: calcs.basePrice,
        exclusivePrice: calcs.basePrice,
        isIncl: item.isIncl,
        variantName: item.variantName,
        variantArabic: item.variantArabic,
        product: {
          ...product,
          name: displayName,
          price,
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
        itemDiscount: itemDiscountAmount,
        itemDiscountAmount,
        billDiscountAmount,
        effectiveDiscountAmount,
        netValue: calcs.netValue,
        sc: calcs.sc,
        levy: calcs.levy,
        vatBase: calcs.netValue + calcs.sc + calcs.levy,
        vatRate: effectiveVatRate,
        vatAmount: calcs.vatAmount,
        lineTotal: calcs.lineNetAmount,
        lineNetAmount: calcs.lineNetAmount,
        originalLineTotal: noDiscountCalcs.lineNetAmount,

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

  const baseSubtotal = roundCalc(Math.max(0, calculatedLines.reduce((sum, l) => sum + l.baseAmount, 0)));
  const subtotal = roundCalc(Math.max(0, calculatedLines.reduce((sum, l) => sum + l.amount, 0)));
  const itemDiscountsTotal = roundCalc(Math.max(0, calculatedLines.reduce((sum, l) => sum + l.itemDiscountAmount, 0)));
  const billDiscountTotal = roundCalc(Math.max(0, calculatedLines.reduce((sum, l) => sum + l.billDiscountAmount, 0)));
  const totalDiscount = roundCalc(Math.min(subtotal, Math.max(0, calculatedLines.reduce((sum, l) => sum + l.effectiveDiscountAmount, 0))));
  const serviceCharge = roundCalc(Math.max(0, calculatedLines.reduce((sum, l) => sum + l.sc, 0)));
  const levy = roundCalc(Math.max(0, calculatedLines.reduce((sum, l) => sum + l.levy, 0)));
  const charges = roundCalc(serviceCharge + levy);
  const vatAmount = roundCalc(Math.max(0, calculatedLines.reduce((sum, l) => sum + l.vatAmount, 0)));
  const vatExclAmount = subtotal;
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
      itemDiscountsTotal,
      billDiscountTotal,
      totalDiscount,
      serviceCharge,
      levy,
      charges,
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

  // If already flagged or stored as tax-exclusive, return immediately
  if (item.isPriceTaxExclusive) {
    return roundCalc(item.price, CALC_PRECISION);
  }
  if (item.basePrice !== undefined && item.basePrice !== null && !isNaN(Number(item.basePrice))) {
    return roundCalc(item.basePrice, CALC_PRECISION);
  }
  if (item.exclusivePrice !== undefined && item.exclusivePrice !== null && !isNaN(Number(item.exclusivePrice))) {
    return roundCalc(item.exclusivePrice, CALC_PRECISION);
  }

  const rawPrice = Number(item.price ?? item.product?.price ?? 0);
  if (!rawPrice || isNaN(rawPrice)) return 0;

  // If line math shows price is already tax-exclusive: (lineBase - disc) + vatAmt == netAmt
  if (item.netAmount !== undefined && item.vatAmount !== undefined && Number(item.vatAmount) > 0.001) {
    const qty = Number(item.qty ?? item.quantity ?? 1);
    const lineBase = rawPrice * qty;
    const discAmt = Number(item.discAmount ?? 0);
    const vatAmt = Number(item.vatAmount);
    const netAmt = Number(item.netAmount);
    const remainingBase = lineBase - discAmt;
    if (Math.abs(netAmt - (remainingBase + vatAmt)) < 0.02) {
      return roundCalc(rawPrice, CALC_PRECISION);
    }
  }

  const isVatEnabled = getVatStatus();
  if (!isVatEnabled) return roundCalc(rawPrice, CALC_PRECISION);

  const resolvedConfig = config || getBillingConfig(item.orderType || 'DineIn');
  const rawVatRate = (item.product?.vatValue !== undefined && item.product?.vatValue !== null)
    ? Number(item.product.vatValue)
    : (item.vatValue !== undefined && item.vatValue !== null)
    ? Number(item.vatValue)
    : (item.vatRate !== undefined && item.vatRate !== null)
    ? Number(item.vatRate)
    : (resolvedConfig.vatRate * 100);

  const activeVatRate = rawVatRate / 100;
  if (activeVatRate <= 0) return roundCalc(rawPrice, CALC_PRECISION);

  const isInclusive =
    item.isIncl === true ? true :
    item.isIncl === false ? false :
    item.priceIsIncl === true ? true :
    item.priceIsIncl === false ? false :
    resolvedConfig.vatType === 'Inclusive';

  if (isInclusive) {
    return roundCalc(rawPrice / (1 + activeVatRate), CALC_PRECISION);
  }

  return roundCalc(rawPrice, CALC_PRECISION);
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

