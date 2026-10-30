import { getDecimalPart } from "../../../utils/currency";
import {
  getVatStatus,
  getBillingConfig,
  getPriceView,
  roundCalc,
  CALC_PRECISION,
} from "../terminal/utils/billing";
import {
  formatItemDisplayName,
  cleanProductName,
} from "./alternativeHelpers";
import { checkOrderHasBillDiscount } from "../terminal/utils/orderDiscountCheck";
import { getModifierTypeNameById } from "../services/menuApi";

export interface UnifiedExtraModifier {
  id: number;
  name: string;
  arabicName?: string;
  price: number;
  qty: number;
  typeId?: number;
  exclusivePrice?: number;
  inclusivePrice?: number;
  getPrice?: (isInclusive: boolean) => number;
  [key: string]: any;
}

export interface UnifiedStandardModifier {
  id: number;
  name: string;
  arabicName?: string;
  qty: number;
  typeId?: number;
  typeName?: string;
  [key: string]: any;
}

export interface UnifiedMessageModifier {
  id?: number;
  name: string;
  [key: string]: any;
}

export interface UnifiedOrderLine {
  isUnifiedPricingLine?: boolean;
  productId: number;
  unitId?: number;
  categoryId?: number;
  productName: string;
  productArabicName?: string;
  variantName?: string;
  variantArabic?: string;
  quantity: number;

  // Base unit rates (excluding extras)
  baseExclusiveRate?: number;
  baseInclusiveRate?: number;

  // Dual pre-computed unit rates (including extras)
  exclusiveRate: number;
  inclusiveRate: number;

  // Dual pre-computed gross totals (rate * quantity, before line discount)
  exclusiveGross: number;
  inclusiveGross: number;

  // Dual pre-computed net amounts (rate * quantity - line discount)
  exclusiveAmount: number;
  inclusiveAmount: number;

  // Tax and discount details
  vatRate: number; // percentage (e.g. 10)
  vatAmount: number; // line VAT amount
  lineDiscount: number; // line discount amount
  lineDiscountExcl: number;
  lineDiscountIncl: number;

  // Modifiers
  extras: UnifiedExtraModifier[];
  modifiers: UnifiedStandardModifier[];
  messages: UnifiedMessageModifier[];

  // Convenience helper to get display rate and amount based on tax setting
  getRate: (isInclusive: boolean) => number;
  getAmount: (isInclusive: boolean, isOrderBillDiscount?: boolean) => number;
  getDiscount: (isInclusive: boolean) => number;

  // Original reference item
  rawItem: any;
}

export interface UnifiedOrderSummary {
  subTotalExclusive: number;
  subTotalInclusive: number;
  lineDiscountsTotal: number;
  lineDiscountsTotalExcl?: number;
  lineDiscountsTotalIncl?: number;
  billDiscountTotal: number;
  billDiscountTotalExcl?: number;
  billDiscountTotalIncl?: number;
  totalDiscount: number;
  totalDiscountExcl?: number;
  totalDiscountIncl?: number;
  taxableBase?: number;
  serviceCharge: number;
  levy: number;
  deliveryCharge: number;
  vatAmount: number;
  grandTotal: number;
  netAmount: number;
  isBillDiscount: boolean;
  isVatActive: boolean;

  charges?: number;
  netValue?: number;
  vatExclAmount?: number;

  // Helper to get subtotal and discount matching tax setting
  getSubTotal: (isInclusive: boolean) => number;
  getTotalDiscount: (isInclusive: boolean) => number;
}

export interface UnifiedOrderPricingResult {
  lines: UnifiedOrderLine[];
  summary: UnifiedOrderSummary;
}

export interface BuildUnifiedPricingOptions {
  orderType?: string;
  subTotal?: number;
  netAmount?: number;
  vatAmount?: number;
  discount?: number;
  serviceCharge?: number;
  levy?: number;
  deliveryCharge?: number;
  isBillDiscount?: boolean;
  isVatActive?: boolean;
  printPrice?: "Inclusive" | "Exclusive" | string;
  priceView?: "Inclusive" | "Exclusive" | string;
  modifierTypes?: any[];
  products?: any[];
  productCache?: Record<string | number, any>;
  [key: string]: any;
}

/**
 * Format helper using dynamic currency decimal places
 */
export const formatOrderAmount = (
  val: number | string | undefined | null,
  decimals?: number
): string => {
  const d = decimals !== undefined ? decimals : getDecimalPart();
  const n = typeof val === "string" ? parseFloat(val) : Number(val || 0);
  return (Number.isFinite(n) ? n : 0).toFixed(d);
};

/**
 * Single Source of Truth Builder for Unified Order Pricing.
 * Converts any order (live Cart lines, recalled order, settled invoice)
 * into a deterministic, dual pre-computed pricing model with zero arithmetic drift.
 */
export const buildUnifiedOrderPricing = (
  orderInput: any,
  options?: BuildUnifiedPricingOptions
): UnifiedOrderPricingResult => {
  // If orderInput is already a completed UnifiedOrderPricingResult, return directly to avoid re-calculation
  if (orderInput && Array.isArray(orderInput.lines) && orderInput.summary) {
    return orderInput as UnifiedOrderPricingResult;
  }

  let master: any = {};
  let rawDetails: any[] = [];
  let rawModifiers: any[] = [];

  if (Array.isArray(orderInput)) {
    rawDetails = orderInput;
    master = options || {};
  } else if (orderInput && typeof orderInput === "object") {
    const rawMaster = orderInput.masterData || orderInput.master || orderInput;
    master = Array.isArray(rawMaster) ? (rawMaster[0] || {}) : (rawMaster || {});
    rawDetails = orderInput.detailsData || orderInput.details || [];
    rawModifiers = orderInput.modifiersData || orderInput.modifiers || [];
  }

  const orderType =
    master.orderType ||
    master.orderTypeName ||
    options?.orderType ||
    "DineIn";
  const billingConfig = getBillingConfig(orderType);

  const rawMasterVatAmt = Number(
    master.vatAmount ??
      master.VatAmount ??
      master.vatAmt ??
      master.taxAmount ??
      options?.vatAmount ??
      0
  );
  const rawDetailsHaveVat = rawDetails.some(
    (d: any) =>
      Number(d.vatAmount ?? d.VatAmount ?? 0) > 0 ||
      Number(d.vatRate ?? d.VatRate ?? d.vatValue ?? d.VatValue ?? 0) > 0
  );
  const masterNet = Number(master.netAmount ?? master.NetAmount ?? options?.netAmount ?? 0);
  const masterExcl = Number(master.vatExclAmount ?? master.VatExclAmount ?? 0);
  const masterHasVatDiff = masterNet > 0 && masterExcl > 0 && (masterNet - masterExcl) > 0.05;

  const isVatActive = Boolean(
    options?.isVatActive ??
      (getVatStatus() ||
        rawMasterVatAmt > 0 ||
        rawDetailsHaveVat ||
        masterHasVatDiff)
  );

  // Deduplicate modifiersData if provided (guards against SQL Cartesian join duplicates)
  const dedupedModifiers = ReactDedupModifiers(rawModifiers);

  // Check bill discount status
  const masterDiscPer = Number(master.discPer ?? master.DiscPer ?? master.billDiscountPer ?? 0);
  const masterDiscountAmount = Number(
    master.discAmount ??
    master.DiscAmount ??
    master.discAmt ??
    master.DiscAmt ??
    master.discount ??
    master.Discount ??
    master.discountAmount ??
    master.DiscountAmount ??
    master.billDiscount ??
    master.BillDiscount ??
    master.billDiscountValue ??
    options?.discount ??
    0
  );
  const isBillComplimentary = Boolean(
    master.complimentaryStatus ||
      master.ComplimentaryStatus ||
      masterDiscPer === 100 ||
      (rawDetails.length > 0 &&
        rawDetails.every((d: any) =>
          Boolean(d.complimentaryStatus || d.ComplimentaryStatus || Number(d.discPer ?? d.DiscPer ?? 0) === 100)
        )) ||
      (Number(master.netAmount ?? options?.netAmount ?? 0) === 0 &&
        masterDiscountAmount > 0 &&
        rawDetails.length > 0)
  );

  const rawLineDiscountsSum = rawDetails.reduce((sum: number, d: any) => {
    return sum + Number(d.discAmount ?? d.DiscAmount ?? d.itemDiscount ?? d.discountValue ?? d.lineDiscount ?? d.discount ?? 0);
  }, 0);
  const hasLineDiscounts = rawLineDiscountsSum > 0.001;

  const isOrderBillDiscount = Boolean(
    options?.isBillDiscount ||
      master.isBillDiscount ||
      isBillComplimentary ||
      masterDiscPer > 0 ||
      (rawDetails.length > 0 &&
        rawDetails.some((it: any) => it.billDiscountAmount && it.billDiscountAmount > 0)) ||
      (!hasLineDiscounts && masterDiscountAmount > 0.001) ||
      (hasLineDiscounts && masterDiscountAmount > rawLineDiscountsSum + 0.001) ||
      checkOrderHasBillDiscount({ master, details: rawDetails })
  );

  let detailsVatSum = 0;
  let lineDiscountsSum = 0;

  const rawMasterNet = masterNet;
  const rawMasterVatExcl = masterExcl;
  const rawMasterSubTotal = Number(master.subTotal ?? master.SubTotal ?? 0);
  const rawMasterDisc = Number(
    master.billDiscountValue ?? master.billDiscount ?? master.discAmount ?? master.DiscAmt ?? 0
  );

  const detailsRawGrossSum = rawDetails.reduce((sum: number, it: any) => {
    const p = Number(it.price ?? it.Price ?? it.catalogPrice ?? 0);
    const q = Math.max(1, Number(it.qty ?? it.quantity ?? it.Qty ?? it.orderQty ?? it.OrderQty ?? 1));
    return sum + (p * q);
  }, 0);

  const defaultVatRate = isVatActive ? (billingConfig.vatRate > 0 ? billingConfig.vatRate : 0.10) : 0;
  const isBackendSavedOrder = Boolean(
    master.orderId ||
    master.orderNo ||
    master.voucherNo ||
    master.id ||
    (orderInput as any)?.orderDetails ||
    (orderInput as any)?.detailsData ||
    (orderInput as any)?.masterData
  );

  // Mathematical deduction of detail pricing inclusivity:
  // If sum(price * qty) * (1 + vatRate) - rawMasterDisc == rawMasterNet,
  // or sum(price * qty) matches vatExclAmount, the backend detail prices are strictly tax-exclusive!
  const isDetailsTaxExclusiveOrder = Boolean(
    defaultVatRate > 0 && detailsRawGrossSum > 0 &&
    !(rawMasterNet > 0 && Math.abs(detailsRawGrossSum - rawMasterNet) < 0.05 && rawMasterVatAmt > 0) && (
      (rawMasterNet > 0 && Math.abs(roundCalc(detailsRawGrossSum * (1 + defaultVatRate), 2) - rawMasterDisc - rawMasterNet) < 0.15) ||
      (rawMasterNet > 0 && Math.abs(roundCalc(detailsRawGrossSum * (1 + defaultVatRate), 2) - rawMasterNet) < 0.15) ||
      (rawMasterVatExcl > 0 && Math.abs(detailsRawGrossSum - rawMasterVatExcl - rawMasterDisc) < 0.15) ||
      (rawMasterVatExcl > 0 && Math.abs(detailsRawGrossSum - rawMasterVatExcl - roundCalc(rawMasterDisc / (1 + defaultVatRate), 2)) < 0.15) ||
      (rawMasterVatExcl > 0 && Math.abs(detailsRawGrossSum - rawMasterVatExcl) < 0.15) ||
      (rawMasterSubTotal > 0 && Math.abs(detailsRawGrossSum - rawMasterSubTotal) < 0.05 && rawMasterNet > detailsRawGrossSum) ||
      (isBackendSavedOrder && rawMasterVatAmt > 0 && rawMasterNet > detailsRawGrossSum)
    )
  );

  const isDineInOrder = (orderType || "").toLowerCase().includes("dine");
  const masterSc = Number(master.serviceCharge ?? master.ServiceCharge ?? 0);
  const masterLevy = Number(master.levyAmt ?? master.levy ?? master.Levy ?? 0);
  const detailsHaveSc = rawDetails.some((d: any) => Number(d.serviceCharge ?? d.ServiceCharge ?? 0) > 0);
  const detailsHaveLevy = rawDetails.some((d: any) => Number(d.levy ?? d.Levy ?? 0) > 0);
  const hasOrderCharges = masterSc > 0 || masterLevy > 0 || detailsHaveSc || detailsHaveLevy || (isDineInOrder && (billingConfig.serviceChargeRate > 0 || billingConfig.levyRate > 0));
  const effectiveScRate = isDineInOrder ? (billingConfig.serviceChargeRate || 0.10) : 0;
  const effectiveLevyRate = billingConfig.levyRate || 0.05;
  const orderCombinedFactor = (hasOrderCharges && defaultVatRate > 0)
    ? roundCalc((1 + defaultVatRate) * (1 + effectiveLevyRate) * (1 + effectiveScRate), 4)
    : (defaultVatRate > 0 ? (1 + defaultVatRate) : 1);

  const lines: UnifiedOrderLine[] = rawDetails.map((d: any) => {
    // If d is already a completed UnifiedOrderLine, preserve it directly with zero re-calculation
    if (d && (d as any).isUnifiedPricingLine === true) {
      detailsVatSum += Number(d.vatAmount || 0);
      lineDiscountsSum += Number(d.lineDiscount || 0);
      return d as UnifiedOrderLine;
    }

    const dMapId = d.mapId ?? d.MapId ?? d.mapID;
    const itemMods = dMapId !== undefined
      ? dedupedModifiers.filter((m: any) => Number(m.mapId ?? m.MapId ?? m.mapID) === Number(dMapId))
      : [];

    // ── Extract Extras ──
    const extras: UnifiedExtraModifier[] = [];
    if (itemMods.length > 0) {
      itemMods.forEach((m: any) => {
        const statusStr = (m.status || m.Status || "").toLowerCase().trim();
        const price = Number(m.price ?? m.Price ?? m.amount ?? m.Amount ?? 0);
        const typeId = Number(m.typeId ?? m.TypeId ?? 0);
        if (
          statusStr === "extras" ||
          statusStr === "extra" ||
          typeId === 2 ||
          (statusStr !== "message" && statusStr !== "modifier" && price > 0)
        ) {
          extras.push({
            id: Number(m.modifierId ?? m.ModifierId ?? m.id ?? m.Id ?? 0),
            name: String(m.modifierName || m.ModifierName || m.name || m.Name || "EXTRA").trim(),
            arabicName: m.arabicName || m.ArabicName || m.arabic || m.Arabic || "",
            price,
            qty: Number(m.qty ?? m.Qty ?? 1),
            typeId: 2,
          });
        }
      });
    } else if (d.extras && Array.isArray(d.extras)) {
      d.extras.forEach((ex: any) => {
        extras.push({
          id: Number(ex.id || ex.modifierId || 0),
          name: String(ex.name || ex.modifierName || "EXTRA").trim(),
          arabicName: ex.arabicName || ex.arabic || "",
          price: Number(ex.price || 0),
          qty: Number(ex.qty || 1),
          typeId: 2,
        });
      });
    }

    // ── Extract Modifiers ──
    const modifiers: UnifiedStandardModifier[] = [];
    if (itemMods.length > 0) {
      itemMods.forEach((m: any) => {
        const statusStr = (m.status || m.Status || "").toLowerCase().trim();
        const price = Number(m.price ?? m.Price ?? m.amount ?? m.Amount ?? 0);
        const typeId = Number(m.typeId ?? m.TypeId ?? 0);
        if (
          statusStr === "modifier" ||
          statusStr === "modifiers" ||
          typeId === 1 ||
          (statusStr !== "message" && statusStr !== "extras" && statusStr !== "extra" && price <= 0)
        ) {
          const resolvedTypeName =
            m.typeName ||
            m.TypeName ||
            m.modifierTypeName ||
            m.ModifierTypeName ||
            (options?.modifierTypes && options.modifierTypes.find((t: any) => Number(t.typeId || t.id) === typeId)?.name) ||
            getModifierTypeNameById(typeId) ||
            "";
          modifiers.push({
            id: Number(m.modifierId ?? m.ModifierId ?? m.id ?? m.Id ?? 0),
            name: String(m.modifierName || m.ModifierName || m.name || m.Name || "").trim(),
            arabicName: m.arabicName || m.ArabicName || m.arabic || m.Arabic || "",
            qty: Number(m.qty ?? m.Qty ?? 1),
            typeId: typeId || 1,
            typeName: resolvedTypeName,
          });
        }
      });
    } else if (d.modifiers && Array.isArray(d.modifiers)) {
      d.modifiers.forEach((mod: any) => {
        modifiers.push({
          id: Number(mod.id || mod.modifierId || 0),
          name: String(mod.name || mod.modifierName || "").trim(),
          arabicName: mod.arabicName || mod.arabic || "",
          qty: Number(mod.qty || 1),
          typeId: Number(mod.typeId || 1),
          typeName: mod.typeName || mod.modifierTypeName || "",
        });
      });
    }

    // ── Extract Messages ──
    const messages: UnifiedMessageModifier[] = [];
    if (itemMods.length > 0) {
      itemMods.forEach((m: any) => {
        const statusStr = (m.status || m.Status || "").toLowerCase().trim();
        if (statusStr === "message" || statusStr === "messages") {
          messages.push({
            id: Number(m.modifierId ?? m.ModifierId ?? m.id ?? m.Id ?? 0),
            name: String(m.modifierName || m.ModifierName || m.name || m.Name || "").trim(),
          });
        }
      });
    } else if (d.messages && Array.isArray(d.messages)) {
      d.messages.forEach((msg: any) => {
        messages.push({
          id: Number(msg.id || msg.modifierId || 0),
          name: String(msg.name || "").trim(),
        });
      });
    }

    const qty = Math.max(1, Number(d.qty ?? d.quantity ?? d.Qty ?? d.orderQty ?? d.OrderQty ?? 1));
    const pId = Number(d.productId || d.itemId || d.id || 0);

    let rawVatRate = Number(
      d.vatValue ??
        d.VatValue ??
        d.vatRate ??
        d.VatRate ??
        d.product?.vatValue ??
        (billingConfig.vatRate > 0 ? billingConfig.vatRate * 100 : 0)
    );
    if (rawVatRate <= 0 && isVatActive) {
      const lineNet = Number(d.netAmount ?? d.NetAmount ?? 0);
      const lineVat = Number(d.vatAmount ?? d.VatAmount ?? 0);
      if (lineVat > 0 && lineNet > lineVat) {
        rawVatRate = (lineVat / (lineNet - lineVat)) * 100;
      } else {
        rawVatRate = billingConfig.vatRate > 0 ? billingConfig.vatRate * 100 : 10;
      }
    }
    const activeVatRate = isVatActive ? (rawVatRate > 1 ? rawVatRate / 100 : rawVatRate) : 0;
    const vatRatePercent = activeVatRate * 100;

    // Extras sum
    const extrasSum = extras.reduce(
      (sum, ex) => sum + (Number(ex.price || 0) * (Number(ex.qty) || 1)),
      0
    );

    // Raw fields from backend detail or cart item
    let rawPrice = Number(d.price ?? d.Price ?? d.catalogPrice ?? 0);
    const rawNetAmount = Number(d.netAmount ?? d.NetAmount ?? d.lineNetAmount ?? d.amount ?? d.Amount ?? 0);
    const rawVatAmt = Number(d.vatAmount ?? d.VatAmount ?? 0);
    let rawDiscAmount = isOrderBillDiscount
      ? 0
      : Number(d.discAmount ?? d.DiscAmount ?? d.discount ?? d.itemDiscount ?? 0);

    // Self-healing: if order is not DineIn (SC is 0), but backend detail was queried with phantom serviceCharge=10
    const isPhantomScInflated = !isDineInOrder && masterSc === 0 && !detailsHaveSc && rawMasterNet > 0 &&
      Math.abs(roundCalc(((rawPrice * qty) - rawDiscAmount) / 1.10, 2) - rawMasterNet) < 0.05 &&
      Math.abs(((rawPrice * qty) - rawDiscAmount) - rawMasterNet) > 0.10;

    if (isPhantomScInflated) {
      rawPrice = roundCalc(rawPrice / 1.10, 4);
      rawDiscAmount = roundCalc(rawDiscAmount / 1.10, 4);
    }

    // ── Deduce Exclusive and Inclusive Unit Rates ──
    let exclusiveBaseUnit: number;
    let inclusiveBaseUnit: number;

    const matchedProduct =
      (pId && options?.productCache && options.productCache[pId]) ||
      (pId && Array.isArray(options?.products) && options.products.find((p: any) => p.id === pId)) ||
      d.product ||
      d.Product ||
      null;

    const catalogPrice = (matchedProduct && matchedProduct.price !== undefined && Number(matchedProduct.price) > 0)
      ? Number(matchedProduct.price)
      : (d.catalogPrice !== undefined && Number(d.catalogPrice) > 0 ? Number(d.catalogPrice) : undefined);

    const isExplicitlyExclusiveView = (options?.priceView || getPriceView()) === "Exclusive";
    const lineEffectiveDiscount = isOrderBillDiscount ? (rawDiscAmount + rawMasterDisc) : rawDiscAmount;
    const isLineBaseRequiringCombinedFactor = hasOrderCharges &&
      orderCombinedFactor > 1.01 &&
      rawMasterNet > 0 &&
      Math.abs((rawPrice * qty - lineEffectiveDiscount) * orderCombinedFactor - rawMasterNet) < 0.05;

    const isPriceProvenInclusiveByExcl = !isLineBaseRequiringCombinedFactor &&
      rawMasterVatExcl > 0 &&
      ((rawPrice * qty) > (rawMasterVatExcl + 0.05));

    const rawAlreadyExclusive = Boolean(
      d.isPriceTaxExclusive === true ||
      d.isIncl === false ||
      (d as any).taxType === "Exclusive" ||
      isLineBaseRequiringCombinedFactor ||
      (matchedProduct?.isIncl === false && !isExplicitlyExclusiveView) ||
      (isExplicitlyExclusiveView && d.isPriceTaxInclusive !== true && d.isIncl !== true && (d as any).taxType !== "Inclusive" && matchedProduct?.isIncl !== true && !isPriceProvenInclusiveByExcl)
    );

    const isPriceDefinitelyExclusive = Boolean(
      d.isPriceTaxExclusive === true ||
      d.isIncl === false ||
      isLineBaseRequiringCombinedFactor ||
      (matchedProduct?.isIncl === false && (options?.priceView || getPriceView()) !== "Inclusive") ||
      (d.basePrice !== undefined && Number(d.basePrice) > 0 && Math.abs(rawPrice - Number(d.basePrice)) < 0.001) ||
      (rawNetAmount > 0 && rawNetAmount > (rawPrice * qty + 0.05))
    );

    const isBackendDetail = Boolean(
      isDetailsTaxExclusiveOrder ||
      isBackendSavedOrder ||
      d.mapId !== undefined ||
      d.orderId !== undefined ||
      d.OrderId !== undefined ||
      (d.price !== undefined && (rawMasterNet > 0 || rawMasterVatAmt > 0 || isBackendSavedOrder))
    );

    const rawAlreadyInclusive = Boolean(
      d.isPriceTaxInclusive === true ||
      d.isIncl === true ||
      (d as any).taxType === "Inclusive" ||
      matchedProduct?.isIncl === true ||
      (!rawAlreadyExclusive && !isDetailsTaxExclusiveOrder && !isPriceDefinitelyExclusive && (options?.priceView || getPriceView()) === "Inclusive")
    );

    const lineNetRaw = (rawPrice * qty) - rawDiscAmount;
    const isLineMatchesGrossNet = !isOrderBillDiscount && rawDiscAmount > 0 && rawMasterNet > 0 && Math.abs(lineNetRaw - rawMasterNet) < 0.15;

    if (isBackendDetail) {
      const rawLineExcl = Number(d.vatExclAmount ?? d.VatExclAmount ?? d.basePrice ?? 0);
      const isPriceMatchesNet = !isLineBaseRequiringCombinedFactor && rawDiscAmount === 0 && rawNetAmount > 0 && Math.abs(rawPrice * qty - rawNetAmount) < 0.05;
      const isPriceMatchesExcl = (rawLineExcl > 0 && Math.abs(rawPrice * qty - rawLineExcl) < 0.05) ||
        (rawMasterSubTotal > 0 && Math.abs(rawPrice * qty - rawMasterSubTotal) < 0.05 && rawMasterNet > rawPrice * qty);
      const isPriceMatchesGrossMaster = !isLineBaseRequiringCombinedFactor && (rawMasterNet > 0 || rawMasterDisc > 0) &&
        (rawMasterVatAmt > 0 || isVatActive) &&
        rawDiscAmount === 0 &&
        Math.abs(rawPrice * qty - (rawMasterNet + rawMasterDisc)) < 0.05;

      if ((isPriceDefinitelyExclusive || d.isPriceTaxExclusive === true || isPriceMatchesExcl || rawAlreadyExclusive) && !isLineMatchesGrossNet && !isPriceMatchesGrossMaster) {
        exclusiveBaseUnit = rawPrice;
        if (rawNetAmount > 0 && Math.abs(rawPrice * qty * (1 + activeVatRate) - rawNetAmount) < 0.05) {
          inclusiveBaseUnit = roundCalc(rawPrice * (1 + activeVatRate), CALC_PRECISION);
        } else {
          inclusiveBaseUnit = activeVatRate > 0
            ? roundCalc(rawPrice * orderCombinedFactor, CALC_PRECISION)
            : rawPrice;
        }
      } else if (d.isPriceTaxInclusive === true || isLineMatchesGrossNet || (isPriceMatchesNet && rawVatAmt > 0) || isPriceMatchesGrossMaster || rawAlreadyInclusive) {
        inclusiveBaseUnit = rawPrice;
        exclusiveBaseUnit = activeVatRate > 0
          ? roundCalc(rawPrice / orderCombinedFactor, CALC_PRECISION)
          : rawPrice;
      } else {
        exclusiveBaseUnit = rawPrice;
        inclusiveBaseUnit = activeVatRate > 0
          ? roundCalc(rawPrice * orderCombinedFactor, CALC_PRECISION)
          : rawPrice;
      }
    } else if (d.basePrice !== undefined && Number(d.basePrice) > 0 && Number(d.basePrice) < rawPrice) {
      exclusiveBaseUnit = Number(d.basePrice);
      inclusiveBaseUnit = activeVatRate > 0
        ? roundCalc(exclusiveBaseUnit * orderCombinedFactor, CALC_PRECISION)
        : exclusiveBaseUnit;
    } else if (d.exclusivePrice !== undefined && Number(d.exclusivePrice) > 0 && Number(d.exclusivePrice) < rawPrice) {
      exclusiveBaseUnit = Number(d.exclusivePrice);
      inclusiveBaseUnit = activeVatRate > 0
        ? roundCalc(exclusiveBaseUnit * orderCombinedFactor, CALC_PRECISION)
        : exclusiveBaseUnit;
    } else if (catalogPrice !== undefined && catalogPrice > 0) {
      if (Math.abs(roundCalc(rawPrice * orderCombinedFactor, CALC_PRECISION) - catalogPrice) < 0.05 ||
          Math.abs(roundCalc(catalogPrice / orderCombinedFactor, CALC_PRECISION) - rawPrice) < 0.05) {
        // rawPrice is the base tax-exclusive rate, catalogPrice is the gross inclusive rate
        exclusiveBaseUnit = rawPrice;
        inclusiveBaseUnit = catalogPrice;
      } else if (Math.abs(catalogPrice - rawPrice) < 0.05) {
        const isBackendDetail = Boolean(
          isDetailsTaxExclusiveOrder ||
          isBackendSavedOrder ||
          d.mapId !== undefined ||
          d.orderId !== undefined ||
          d.OrderId !== undefined ||
          (d.price !== undefined && (rawMasterNet > 0 || rawMasterVatAmt > 0))
        );
        if (rawAlreadyExclusive || (isBackendDetail && !rawAlreadyInclusive)) {
          exclusiveBaseUnit = catalogPrice;
          inclusiveBaseUnit = activeVatRate > 0 ? roundCalc(catalogPrice * orderCombinedFactor, CALC_PRECISION) : catalogPrice;
        } else {
          inclusiveBaseUnit = catalogPrice;
          exclusiveBaseUnit = activeVatRate > 0 ? roundCalc(catalogPrice / orderCombinedFactor, CALC_PRECISION) : catalogPrice;
        }
      } else if (rawPrice > catalogPrice) {
        inclusiveBaseUnit = rawPrice;
        exclusiveBaseUnit = activeVatRate > 0 ? roundCalc(rawPrice / orderCombinedFactor, CALC_PRECISION) : rawPrice;
      } else {
        exclusiveBaseUnit = rawPrice;
        inclusiveBaseUnit = activeVatRate > 0 ? roundCalc(rawPrice * orderCombinedFactor, CALC_PRECISION) : rawPrice;
      }
    } else if (
      rawAlreadyExclusive ||
      ((isDetailsTaxExclusiveOrder || isBackendSavedOrder || d.mapId !== undefined || d.orderId !== undefined || d.OrderId !== undefined) &&
        activeVatRate > 0 &&
        !rawAlreadyInclusive)
    ) {
      exclusiveBaseUnit = rawPrice;
      inclusiveBaseUnit = activeVatRate > 0
        ? roundCalc(rawPrice * orderCombinedFactor, CALC_PRECISION)
        : rawPrice;
    } else if (rawAlreadyInclusive) {
      inclusiveBaseUnit = rawPrice;
      exclusiveBaseUnit = activeVatRate > 0
        ? roundCalc(rawPrice / orderCombinedFactor, CALC_PRECISION)
        : rawPrice;
    } else {
      // In POS menu/catalog, prices are gross/inclusive by default unless mathematically proven exclusive
      const expectedNetIfInclusive = Math.max(0, rawPrice * qty - rawDiscAmount);
      const expectedNetIfExclusive = activeVatRate > 0
        ? Math.max(0, (rawPrice * qty - rawDiscAmount) * orderCombinedFactor)
        : expectedNetIfInclusive;

      const netToCompare = rawNetAmount > 0 ? rawNetAmount : (rawDetails.length === 1 ? rawMasterNet : 0);
      if (netToCompare > 0 && Math.abs(expectedNetIfExclusive - netToCompare) < 0.05 && Math.abs(expectedNetIfInclusive - netToCompare) > 0.05) {
        // rawPrice is EXCLUSIVE
        exclusiveBaseUnit = rawPrice;
        inclusiveBaseUnit = activeVatRate > 0
          ? roundCalc(rawPrice * orderCombinedFactor, CALC_PRECISION)
          : rawPrice;
      } else if (rawVatAmt > 0 && activeVatRate > 0 && Math.abs(rawPrice * qty - rawNetAmount) < 0.05) {
        // In backend order details tables, rawPrice is stored as tax-exclusive base
        exclusiveBaseUnit = rawPrice;
        inclusiveBaseUnit = roundCalc(rawPrice * orderCombinedFactor, CALC_PRECISION);
      } else {
        // rawPrice is INCLUSIVE
        inclusiveBaseUnit = rawPrice;
        exclusiveBaseUnit = activeVatRate > 0
          ? roundCalc(rawPrice / orderCombinedFactor, CALC_PRECISION)
          : rawPrice;
      }
    }

    // ── Deduce Extras Inclusivity & Add to Parent Unit Rate ──
    const rawAlreadyIncludesExtras = Boolean(
      (d as any).isUnifiedPricingLine || (d as any).extrasIncluded
    );

    const effectiveExtrasSum = rawAlreadyIncludesExtras ? 0 : extrasSum;

    // Extras rolled into unit rates:
    const e = qty > 0 ? effectiveExtrasSum / qty : 0;
    let extrasPerUnitExcl: number;
    let extrasPerUnitIncl: number;
    let isExtrasAlreadyInclusive = false;

    if (activeVatRate > 0 && e > 0) {
      const asInclIfAlreadyInclTotal = (inclusiveBaseUnit + e) * qty;
      const asExclTotal = (exclusiveBaseUnit + e) * qty;
      const masterNet = Number(master.netAmount ?? master.NetAmount ?? 0);

      isExtrasAlreadyInclusive = Boolean(
        d.isIncl === true ||
        (d as any).isPriceTaxInclusive === true ||
        (d.extras && Array.isArray(d.extras) && d.extras.some((ex: any) => ex.isIncl === true || ex.isPriceTaxInclusive === true)) ||
        (rawNetAmount > 0 && Math.abs(asInclIfAlreadyInclTotal - rawNetAmount) < 0.05) ||
        (masterNet > 0 && Math.abs(asInclIfAlreadyInclTotal - masterNet) < 0.05) ||
        (rawNetAmount > 0 && asExclTotal > rawNetAmount + 0.01) ||
        (masterNet > 0 && asExclTotal > masterNet + 0.01)
      );

      if (isExtrasAlreadyInclusive) {
        extrasPerUnitIncl = e;
        extrasPerUnitExcl = roundCalc(e / (1 + activeVatRate), CALC_PRECISION);
      } else {
        extrasPerUnitExcl = e;
        extrasPerUnitIncl = roundCalc(e * (1 + activeVatRate), CALC_PRECISION);
      }
    } else {
      extrasPerUnitExcl = e;
      extrasPerUnitIncl = e;
    }

    const exclusiveRate = roundCalc(exclusiveBaseUnit + extrasPerUnitExcl, CALC_PRECISION);
    const inclusiveRate = roundCalc(inclusiveBaseUnit + extrasPerUnitIncl, CALC_PRECISION);

    const exclusiveGross = roundCalc(exclusiveRate * qty, CALC_PRECISION);
    const inclusiveGross = roundCalc(inclusiveRate * qty, CALC_PRECISION);

    // Line discount
    let lineDiscountExcl = 0;
    let lineDiscountIncl = 0;

    if (rawDiscAmount > 0) {
      const masterBaseExcl = rawMasterVatExcl > 0 ? (rawMasterVatExcl - masterSc - masterLevy) : 0;
      const factorForDiscount = orderCombinedFactor > 1 ? orderCombinedFactor : (1 + activeVatRate);
      const netToCompare = rawNetAmount > 0 ? rawNetAmount : (rawDetails.length === 1 ? rawMasterNet : 0);
      const isInclusiveDiscountDeduction =
        (netToCompare > 0 && (Math.abs(inclusiveGross - rawDiscAmount - netToCompare) < 0.05 || Math.abs(inclusiveGross - rawDiscAmount - rawMasterNet) < 0.05)) ||
        (rawDetails.length === 1 && masterBaseExcl > 0 && Math.abs(roundCalc(exclusiveGross - (rawDiscAmount / factorForDiscount), 2) - roundCalc(masterBaseExcl, 2)) < 0.05);

      if (d.discIsIncl === true || d.discountIsIncl === true) {
        lineDiscountIncl = Math.min(inclusiveGross, rawDiscAmount);
        lineDiscountExcl = activeVatRate > 0
          ? roundCalc(lineDiscountIncl / factorForDiscount, CALC_PRECISION)
          : lineDiscountIncl;
      } else if (d.discIsIncl === false || d.discountIsIncl === false) {
        lineDiscountExcl = Math.min(exclusiveGross, rawDiscAmount);
        lineDiscountIncl = activeVatRate > 0
          ? roundCalc(lineDiscountExcl * factorForDiscount, CALC_PRECISION)
          : lineDiscountExcl;
      } else if (isInclusiveDiscountDeduction) {
        // Mathematically proves rawDiscAmount is inclusive
        lineDiscountIncl = Math.min(inclusiveGross, rawDiscAmount);
        lineDiscountExcl = factorForDiscount > 0
          ? roundCalc(lineDiscountIncl / factorForDiscount, CALC_PRECISION)
          : lineDiscountIncl;
      } else if (netToCompare > 0 && Math.abs(roundCalc(inclusiveGross - rawDiscAmount * (1 + activeVatRate), CALC_PRECISION) - netToCompare) < 0.05) {
        // Mathematically proves rawDiscAmount is exclusive
        lineDiscountExcl = Math.min(exclusiveGross, rawDiscAmount);
        lineDiscountIncl = activeVatRate > 0
          ? roundCalc(lineDiscountExcl * factorForDiscount, CALC_PRECISION)
          : lineDiscountExcl;
      } else if (
        isPriceDefinitelyExclusive ||
        isDetailsTaxExclusiveOrder ||
        rawAlreadyExclusive
      ) {
        lineDiscountExcl = Math.min(exclusiveGross, rawDiscAmount);
        lineDiscountIncl = activeVatRate > 0
          ? roundCalc(lineDiscountExcl * (1 + activeVatRate), CALC_PRECISION)
          : lineDiscountExcl;
      } else {
        const isDiscInclusive = Boolean(
          (options?.priceView || getPriceView()) === "Inclusive" && !rawAlreadyExclusive
        );
        if (isDiscInclusive) {
          lineDiscountIncl = Math.min(inclusiveGross, rawDiscAmount);
          lineDiscountExcl = activeVatRate > 0
            ? roundCalc(lineDiscountIncl / factorForDiscount, CALC_PRECISION)
            : lineDiscountIncl;
        } else {
          lineDiscountExcl = Math.min(exclusiveGross, rawDiscAmount);
          lineDiscountIncl = activeVatRate > 0
            ? roundCalc(lineDiscountExcl * factorForDiscount, CALC_PRECISION)
            : lineDiscountExcl;
        }
      }
    }

    const exclusiveAmount = Math.max(0, roundCalc(exclusiveGross - lineDiscountExcl, CALC_PRECISION));
    const inclusiveAmount = Math.max(0, roundCalc(inclusiveGross - lineDiscountIncl, CALC_PRECISION));

    // Self-healing VAT amount for line
    let lineVatAmount = 0;
    if (activeVatRate > 0) {
      lineVatAmount = roundCalc(Math.max(0, inclusiveAmount - exclusiveAmount), CALC_PRECISION);
    }

    detailsVatSum += lineVatAmount;
    lineDiscountsSum += lineDiscountExcl;

    // Names
    const rawProdName =
      d.productName ||
      d.ProductName ||
      d.product?.name ||
      d.itemName ||
      d.ItemName ||
      d.name ||
      `Item #${pId}`;
    const variantName = d.altName || d.variantName || d.AltName || d.VariantName || "";
    const variantArabic = d.altArabic || d.variantArabic || d.AltArabic || d.VariantArabic || "";
    const cleanedName = cleanProductName(rawProdName, variantName);
    const displayName = formatItemDisplayName(cleanedName, variantName);
    const arabicName = d.productArabicName || d.productNameAr || d.ProductNameAr || d.arabicName || d.ArabicName || d.product?.arabicName || "";

    return {
      isUnifiedPricingLine: true,
      productId: pId,
      unitId: Number(d.unitId ?? d.UnitId ?? d.product?.unitId ?? 1),
      categoryId: Number(d.categoryId ?? d.CategoryId ?? d.product?.categoryId ?? 0),
      productName: displayName,
      productArabicName: arabicName,
      variantName,
      variantArabic,
      quantity: qty,

      baseExclusiveRate: exclusiveBaseUnit,
      baseInclusiveRate: inclusiveBaseUnit,
      exclusiveRate,
      inclusiveRate,

      exclusiveGross,
      inclusiveGross,

      exclusiveAmount,
      inclusiveAmount,

      vatRate: vatRatePercent,
      vatAmount: lineVatAmount,
      lineDiscount: lineDiscountExcl,
      lineDiscountExcl,
      lineDiscountIncl,

      extras: extras.map((ex) => {
        const exPrice = Number(ex.price || 0);
        let exExcl = exPrice;
        let exIncl = exPrice;
        if (activeVatRate > 0) {
          if (isExtrasAlreadyInclusive) {
            exIncl = exPrice;
            exExcl = roundCalc(exPrice / (1 + activeVatRate), CALC_PRECISION);
          } else {
            exExcl = exPrice;
            exIncl = roundCalc(exPrice * (1 + activeVatRate), CALC_PRECISION);
          }
        }
        return {
          ...ex,
          price: exExcl,
          exclusivePrice: exExcl,
          inclusivePrice: exIncl,
          getPrice: (isIncl: boolean) => (isIncl ? exIncl : exExcl),
        };
      }),
      modifiers,
      messages,

      getRate: (isIncl: boolean) => (isIncl ? inclusiveRate : exclusiveRate),
      getAmount: (isIncl: boolean, isBillDisc?: boolean) => {
        const useBillDisc = isBillDisc !== undefined ? isBillDisc : isOrderBillDiscount;
        if (useBillDisc) {
          return isIncl ? inclusiveGross : exclusiveGross;
        }
        return isIncl ? inclusiveAmount : exclusiveAmount;
      },
      getDiscount: (isIncl?: boolean) => (isIncl ? lineDiscountIncl : lineDiscountExcl),

      rawItem: d,
    };
  });

  // ── Master Totals & Summary ──
  const serviceCharge = Number(master.serviceCharge ?? options?.serviceCharge ?? 0);
  const levy = Number(master.levyAmt ?? master.levy ?? options?.levy ?? 0);
  const deliveryCharge = Number(master.deliveryCharge ?? options?.deliveryCharge ?? 0);

  // Gross Subtotals (strictly BEFORE any line/bill discounts):
  const subTotalExclusive = roundCalc(
    lines.reduce((sum, l) => sum + l.exclusiveGross, 0),
    CALC_PRECISION
  );
  const subTotalInclusive = roundCalc(
    lines.reduce((sum, l) => sum + l.inclusiveGross, 0),
    CALC_PRECISION
  );

  const lineDiscountsInclSum = roundCalc(
    lines.reduce((sum, l) => sum + l.lineDiscountIncl, 0),
    CALC_PRECISION
  );

  const masterVatRate = isVatActive
    ? (Number(master.vatRate ?? master.VatRate ?? master.vatValue ?? master.VatValue ?? 0) > 0
        ? (Number(master.vatRate ?? master.VatRate ?? master.vatValue ?? master.VatValue) > 1
            ? Number(master.vatRate ?? master.VatRate ?? master.vatValue ?? master.VatValue) / 100
            : Number(master.vatRate ?? master.VatRate ?? master.vatValue ?? master.VatValue))
        : (lines.length > 0 && lines[0].vatRate > 0
            ? lines[0].vatRate / 100
            : (billingConfig.vatRate > 0 ? billingConfig.vatRate : 0.10)))
    : 0;

  const effectiveMasterDiscAmount = masterDiscountAmount > 0 ? masterDiscountAmount : rawLineDiscountsSum;

  let billDiscountExcl = 0;
  let billDiscountIncl = 0;

  if (isOrderBillDiscount) {
    if (isBillComplimentary) {
      billDiscountIncl = subTotalInclusive;
      billDiscountExcl = subTotalExclusive;
    } else if (masterDiscPer > 0) {
      billDiscountIncl = roundCalc(subTotalInclusive * (masterDiscPer / 100), CALC_PRECISION);
      billDiscountExcl = roundCalc(subTotalExclusive * (masterDiscPer / 100), CALC_PRECISION);
    } else if (Number(master.billDiscountValue || master.billDiscount || 0) > 0) {
      const dbBillDisc = Number(master.billDiscountValue || master.billDiscount);
      billDiscountIncl = roundCalc(dbBillDisc, CALC_PRECISION);
      billDiscountExcl = masterVatRate > 0
        ? roundCalc(billDiscountIncl / (1 + masterVatRate), CALC_PRECISION)
        : billDiscountIncl;
    } else if (effectiveMasterDiscAmount > 0) {
      const isDiscMatchingExcl = (rawMasterVatExcl > 0 && Math.abs((rawMasterVatExcl + effectiveMasterDiscAmount) - subTotalExclusive) < 0.05) ||
        (rawMasterVatExcl > 0 && Math.abs((rawMasterVatExcl - (serviceCharge + levy) + effectiveMasterDiscAmount) - subTotalExclusive) < 0.05);
      const isDiscMatchingIncl = rawMasterNet > 0 && Math.abs((rawMasterNet + effectiveMasterDiscAmount) - (subTotalInclusive + serviceCharge + levy + deliveryCharge)) < 0.05;

      const factorToUse = (isDineInOrder && (masterSc > 0 || detailsHaveSc || effectiveScRate > 0) && orderCombinedFactor > 1)
        ? orderCombinedFactor
        : (1 + masterVatRate);
      if (isDiscMatchingExcl || (!isDiscMatchingIncl && (options?.priceView || getPriceView()) === 'Exclusive')) {
        billDiscountExcl = roundCalc(effectiveMasterDiscAmount, CALC_PRECISION);
        billDiscountIncl = masterVatRate > 0
          ? roundCalc(billDiscountExcl * factorToUse, CALC_PRECISION)
          : billDiscountExcl;
      } else {
        billDiscountIncl = roundCalc(effectiveMasterDiscAmount, CALC_PRECISION);
        billDiscountExcl = masterVatRate > 0
          ? roundCalc(billDiscountIncl / factorToUse, CALC_PRECISION)
          : billDiscountIncl;
      }
    } else if (rawMasterNet > 0) {
      // Order was saved in backend with authoritative rawMasterNet and no explicit discAmount
      const grossPreDiscount = subTotalInclusive + serviceCharge + levy + deliveryCharge;
      if (grossPreDiscount > rawMasterNet) {
        billDiscountIncl = roundCalc(grossPreDiscount - rawMasterNet, CALC_PRECISION);
        billDiscountExcl = masterVatRate > 0
          ? roundCalc(billDiscountIncl / (1 + masterVatRate), CALC_PRECISION)
          : billDiscountIncl;
      }
    }
  }

  const totalDiscountExcl = isOrderBillDiscount ? billDiscountExcl : roundCalc(lineDiscountsSum, CALC_PRECISION);
  const totalDiscountIncl = isOrderBillDiscount ? billDiscountIncl : roundCalc(lineDiscountsInclSum, CALC_PRECISION);
  const totalDiscount = totalDiscountExcl;

  const taxableBase = Math.max(0, subTotalExclusive - totalDiscountExcl + serviceCharge + levy);
  const scLevyVat = (serviceCharge > 0 || levy > 0) && masterVatRate > 0
    ? roundCalc((serviceCharge + levy) * masterVatRate, CALC_PRECISION)
    : 0;
  const expectedTaxableVat = isVatActive && masterVatRate > 0
    ? roundCalc(taxableBase * masterVatRate, CALC_PRECISION)
    : 0;

  let vatAmount = Number(
    master.vatAmount ?? master.VatAmount ?? master.vatAmt ?? master.taxAmount ?? options?.vatAmount ?? 0
  );

  // When order has a bill discount, VAT is strictly based on the discounted taxable base
  if (isOrderBillDiscount && isVatActive && masterVatRate > 0) {
    if (rawMasterVatAmt > 0 && Math.abs(rawMasterVatAmt - expectedTaxableVat) < 0.15) {
      vatAmount = roundCalc(rawMasterVatAmt, CALC_PRECISION);
    } else {
      vatAmount = expectedTaxableVat;
    }
  } else if (isVatActive && masterVatRate > 0) {
    if (rawMasterVatAmt > 0 && Math.abs(rawMasterVatAmt - expectedTaxableVat) < 0.05) {
      vatAmount = roundCalc(rawMasterVatAmt, CALC_PRECISION);
    } else if (detailsVatSum > 0) {
      // Option B: Stack VAT on food items + VAT on serviceCharge and levy
      const combinedVat = roundCalc(detailsVatSum + scLevyVat, CALC_PRECISION);
      vatAmount = Math.max(combinedVat, expectedTaxableVat);
    } else {
      vatAmount = expectedTaxableVat;
    }
  } else if (detailsVatSum > 0) {
    vatAmount = detailsVatSum;
  }
  if (vatAmount <= 0 && isVatActive && rawMasterNet > subTotalExclusive) {
    const rawDiff = rawMasterNet - (subTotalExclusive - totalDiscount + serviceCharge + levy + deliveryCharge);
    if (rawDiff > 0.001) {
      vatAmount = roundCalc(rawDiff, CALC_PRECISION);
    }
  }

  const calculatedGrandTotal = roundCalc(
    taxableBase + deliveryCharge + vatAmount,
    CALC_PRECISION
  );

  const grandTotal = (isBackendSavedOrder && rawMasterNet > 0)
    ? roundCalc(rawMasterNet, CALC_PRECISION)
    : ((rawMasterNet > 0 && Math.abs(rawMasterNet - calculatedGrandTotal) < 0.05)
        ? roundCalc(rawMasterNet, CALC_PRECISION)
        : calculatedGrandTotal);

  return {
    lines,
    summary: {
      subTotalExclusive,
      subTotalInclusive,
      lineDiscountsTotal: lineDiscountsSum,
      lineDiscountsTotalExcl: lineDiscountsSum,
      lineDiscountsTotalIncl: lineDiscountsInclSum,
      billDiscountTotal: isOrderBillDiscount ? masterDiscountAmount : 0,
      totalDiscount,
      totalDiscountExcl,
      totalDiscountIncl,
      taxableBase: roundCalc(taxableBase, CALC_PRECISION),
      serviceCharge,
      levy,
      charges: roundCalc(serviceCharge + levy),
      netValue: roundCalc(Math.max(0, subTotalExclusive - totalDiscountExcl) + serviceCharge + levy),
      vatExclAmount: roundCalc(Math.max(0, subTotalExclusive - totalDiscountExcl) + serviceCharge + levy),
      deliveryCharge,
      vatAmount,
      grandTotal,
      netAmount: grandTotal,
      isBillDiscount: isOrderBillDiscount,
      isVatActive,
      getSubTotal: (isIncl: boolean) =>
        isIncl ? subTotalInclusive : subTotalExclusive,
      getTotalDiscount: (isIncl: boolean) =>
        isIncl ? totalDiscountIncl : totalDiscountExcl,
    },
  };
};

/**
 * Deduplicate raw modifiersData from SQL Cartesian joins
 */
function ReactDedupModifiers(rawModifiers: any[]): any[] {
  if (!Array.isArray(rawModifiers) || rawModifiers.length === 0) return [];
  const seen = new Set<string>();
  return rawModifiers.filter((m: any) => {
    const mMapId = m.mapId ?? m.MapId ?? m.mapID ?? 0;
    const mModId = m.modifierId ?? m.ModifierId ?? m.id ?? m.Id ?? 0;
    const mTypeId = m.typeId ?? m.TypeId ?? 0;
    const mName = String(m.modifierName || m.name || "").trim().toLowerCase();
    const key = `${mMapId}-${mModId}-${mTypeId}-${mName}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
