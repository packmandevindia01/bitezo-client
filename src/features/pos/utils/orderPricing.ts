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
import { getModifierTypeNameById, getCachedExtras } from "../services/menuApi";

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
  mapId?: number;
  isProductMasterInclusive?: boolean;
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
  [key: string]: any;
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
  printPrice?: string;
  priceView?: string;
  isTaxInclusive?: boolean;

  // Helper to get subtotal and discount matching tax setting
  getSubTotal: (isInclusive: boolean) => number;
  getTotalDiscount: (isInclusive: boolean) => number;
  [key: string]: any;
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
  const effectivePriceView: "Inclusive" | "Exclusive" =
    options?.printPrice
      ? (String(options.printPrice).toLowerCase() === "inclusive" ? "Inclusive" : "Exclusive")
      : (options?.priceView
          ? (String(options.priceView).toLowerCase() === "inclusive" ? "Inclusive" : "Exclusive")
          : getPriceView());

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
    return sum + Number(
      d.baseDiscount ||
      d.itemDiscount ||
      d.itemDiscountAmount ||
      d.itemDiscountExcl ||
      d.discountValue ||
      d.discAmount ||
      d.DiscAmount ||
      d.lineDiscount ||
      d.discount ||
      0
    );
  }, 0);
  const hasLineDiscounts = rawLineDiscountsSum > 0.001;

  const isOrderBillDiscount = options?.isBillDiscount !== undefined
    ? Boolean(options.isBillDiscount)
    : master.isBillDiscount !== undefined
    ? Boolean(master.isBillDiscount)
    : Boolean(
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
    let lineExSum = 0;
    if (Array.isArray(it.extras) && it.extras.length > 0) {
      lineExSum = it.extras.reduce((es: number, ex: any) => es + Number(ex.price ?? 0) * Number(ex.qty ?? 1), 0);
    } else {
      const itMapId = it.mapId ?? it.MapId ?? it.mapID;
      if (itMapId !== undefined) {
        const itemMods = dedupedModifiers.filter((m: any) => Number(m.mapId ?? m.MapId ?? m.mapID) === Number(itMapId));
        lineExSum = itemMods
          .filter((m: any) => (m.status || "").toLowerCase() === "extras" || ((m.status || "") === "" && (m.price || 0) > 0))
          .reduce((es: number, m: any) => es + Number(m.price ?? 0) * Number(m.qty ?? 1), 0);
      }
    }
    return sum + (p * q) + lineExSum;
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

  const isDineInOrder = (orderType || "").toLowerCase().includes("dine");
  const rawCharges = Number(master.charges ?? options?.charges ?? 0);
  const masterSc = Number(master.serviceCharge ?? master.ServiceCharge ?? (isDineInOrder && rawCharges > 0 && !master.levy && !master.levyAmt ? rawCharges : 0));
  const masterLevy = Number(
    master.levyAmt ??
    master.levy ??
    master.Levy ??
    options?.levy ??
    (!isDineInOrder && rawCharges > 0 ? rawCharges : 0)
  );
  const detailsHaveSc = rawDetails.some((d: any) => Number(d.serviceCharge ?? d.ServiceCharge ?? 0) > 0);
  const detailsHaveLevy = rawDetails.some((d: any) => Number(d.levy ?? d.Levy ?? 0) > 0);
  const effectiveScRate = isBackendSavedOrder
    ? (masterSc > 0 || detailsHaveSc ? (billingConfig.serviceChargeRate || 0.10) : 0)
    : (isDineInOrder && billingConfig.serviceChargeRate > 0 ? billingConfig.serviceChargeRate : 0);
  const effectiveLevyRate = isBackendSavedOrder
    ? (masterLevy > 0 || detailsHaveLevy ? (billingConfig.levyRate || 0.05) : 0)
    : (billingConfig.levyRate > 0 ? billingConfig.levyRate : 0);
  const hasOrderCharges = effectiveScRate > 0 || effectiveLevyRate > 0 || masterSc > 0 || masterLevy > 0 || detailsHaveSc || detailsHaveLevy;
  const scFactor = effectiveScRate > 0 ? (1 + effectiveScRate) : 1;
  const levyFactor = effectiveLevyRate > 0 ? (1 + effectiveLevyRate) : 1;
  const vatFactor = (isVatActive && defaultVatRate > 0) ? (1 + defaultVatRate) : 1;
  const orderCombinedFactor = roundCalc(vatFactor * levyFactor * scFactor, 4);

  // Mathematical deduction of detail pricing inclusivity:
  // If sum(price * qty) * (1 + vatRate) - rawMasterDisc == rawMasterNet,
  // or sum(price * qty) matches vatExclAmount, the backend detail prices are strictly tax-exclusive!
  const isDetailsTaxExclusiveOrder = Boolean(
    defaultVatRate > 0 && detailsRawGrossSum > 0 &&
    !(rawMasterNet > 0 && Math.abs(detailsRawGrossSum - rawMasterNet) < 0.05 && rawMasterVatAmt > 0) && (
      (rawMasterNet > 0 && Math.abs(roundCalc(detailsRawGrossSum * orderCombinedFactor, 2) - rawMasterDisc - rawMasterNet) < 0.15) ||
      (rawMasterNet > 0 && Math.abs(roundCalc(detailsRawGrossSum * orderCombinedFactor, 2) - rawMasterNet) < 0.15) ||
      (rawMasterNet > 0 && Math.abs(roundCalc(detailsRawGrossSum * (1 + defaultVatRate), 2) - rawMasterDisc - rawMasterNet) < 0.15) ||
      (rawMasterNet > 0 && Math.abs(roundCalc(detailsRawGrossSum * (1 + defaultVatRate), 2) - rawMasterNet) < 0.15) ||
      (rawMasterVatExcl > 0 && Math.abs(detailsRawGrossSum - rawMasterVatExcl - rawMasterDisc) < 0.15) ||
      (rawMasterVatExcl > 0 && Math.abs(detailsRawGrossSum - rawMasterVatExcl - roundCalc(rawMasterDisc / (1 + defaultVatRate), 2)) < 0.15) ||
      (rawMasterVatExcl > 0 && Math.abs(detailsRawGrossSum - rawMasterVatExcl) < 0.15) ||
      (rawMasterSubTotal > 0 && Math.abs(detailsRawGrossSum - rawMasterSubTotal) < 0.05 && rawMasterNet > detailsRawGrossSum) ||
      (isBackendSavedOrder && rawMasterVatAmt > 0 && rawMasterNet > detailsRawGrossSum)
    )
  );

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
    const knownExtras = (options as any)?.allExtras || getCachedExtras();
    const handledExtraIds = new Set<number>();
    const handledExtraKeys = new Set<string>();

    if (itemMods.length > 0) {
      itemMods.forEach((m: any) => {
        const modId = Number(m.modifierId ?? m.ModifierId ?? m.id ?? m.Id ?? 0);
        const mName = String(m.modifierName || m.ModifierName || m.name || m.Name || "").trim();
        const modKey = `${modId}-${mName.toLowerCase()}`;
        const statusStr = (m.status || m.Status || "").toLowerCase().trim();
        const rawPrice = Number(m.price ?? m.Price ?? m.amount ?? m.Amount ?? 0);
        const typeId = Number(m.typeId ?? m.TypeId ?? 0);
        const matchedExtra = knownExtras?.find((ex: any) => {
          const exId = Number(ex.id ?? ex.extrasId ?? ex.extraId ?? 0);
          const exName = String(ex.name ?? ex.extraName ?? "").trim().toLowerCase();
          return (modId > 0 && exId === modId) || (mName && exName && exName === mName.toLowerCase());
        });

        const isExtra =
          statusStr === "extras" ||
          statusStr === "extra" ||
          typeId === 2 ||
          Boolean(matchedExtra) ||
          (statusStr !== "message" && rawPrice > 0);

        if (isExtra) {
          if (modId > 0) handledExtraIds.add(modId);
          if (modKey) handledExtraKeys.add(modKey);
          const resolvedPrice = rawPrice > 0 ? rawPrice : (matchedExtra ? Number(matchedExtra.price || 0) : 0);
          extras.push({
            id: modId,
            name: String(mName || matchedExtra?.name || "EXTRA").trim(),
            arabicName: m.arabicName || m.ArabicName || m.arabic || m.Arabic || "",
            price: resolvedPrice,
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
        const modId = Number(m.modifierId ?? m.ModifierId ?? m.id ?? m.Id ?? 0);
        const mName = String(m.modifierName || m.ModifierName || m.name || m.Name || "").trim();
        const modKey = `${modId}-${mName.toLowerCase()}`;
        if (handledExtraIds.has(modId) || (modKey && handledExtraKeys.has(modKey))) return;

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
            id: modId,
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
      : Number(
          d.baseDiscount ||
          d.itemDiscount ||
          d.itemDiscountAmount ||
          d.itemDiscountExcl ||
          d.discountValue ||
          d.discAmount ||
          d.DiscAmount ||
          d.discount ||
          0
        );

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

    const isProductMasterIncl = Boolean(
      matchedProduct?.isIncl === true ||
      (matchedProduct as any)?.priceIsIncl === true ||
      (matchedProduct as any)?.PriceIsIncl === true ||
      (matchedProduct as any)?.IsIncl === true ||
      d.isIncl === true ||
      (d as any)?.priceIsIncl === true ||
      (d as any)?.PriceIsIncl === true ||
      (d as any)?.IsIncl === true ||
      (d.basePrice !== undefined && Number(d.basePrice) > 0 && catalogPrice !== undefined && catalogPrice > 0 && Math.abs(roundCalc(Number(d.basePrice) * orderCombinedFactor, CALC_PRECISION) - catalogPrice) < 0.05)
    );

    const isExplicitlyExclusiveView = effectivePriceView === "Exclusive";
    const lineEffectiveDiscount = isOrderBillDiscount ? (rawDiscAmount + rawMasterDisc) : rawDiscAmount;
    const isLineBaseRequiringCombinedFactor = hasOrderCharges &&
      orderCombinedFactor > 1.01 &&
      rawMasterNet > 0 &&
      (
        Math.abs((rawPrice * qty - lineEffectiveDiscount) * orderCombinedFactor - rawMasterNet) < 0.05 ||
        Math.abs((rawPrice * qty + extrasSum - lineEffectiveDiscount) * orderCombinedFactor - rawMasterNet) < 0.05
      );

    const isPriceProvenInclusiveByExcl = !isLineBaseRequiringCombinedFactor &&
      rawMasterVatExcl > 0 &&
      ((rawPrice * qty) > (rawMasterVatExcl + 0.05));

    const isPriceMatchesGrossCatalog = catalogPrice !== undefined && catalogPrice > 0 && !isProductMasterIncl && orderCombinedFactor > 1 &&
      (Math.abs(rawPrice - roundCalc(catalogPrice * orderCombinedFactor, CALC_PRECISION)) < 0.05 ||
       (qty > 0 && Math.abs(rawPrice * qty - roundCalc(catalogPrice * orderCombinedFactor * qty, CALC_PRECISION)) < 0.05));

    const rawAlreadyExclusive = !isPriceMatchesGrossCatalog && Boolean(
      d.isPriceTaxExclusive === true ||
      d.isIncl === false ||
      (d as any).taxType === "Exclusive" ||
      isLineBaseRequiringCombinedFactor ||
      (matchedProduct?.isIncl === false && !isExplicitlyExclusiveView && Math.abs(rawPrice - (catalogPrice ?? 0)) < 0.05) ||
      (isExplicitlyExclusiveView && d.isIncl !== true && d.isPriceTaxInclusive !== true && (d as any).taxType !== "Inclusive" && !isPriceProvenInclusiveByExcl)
    );

    const isPriceDefinitelyExclusive = Boolean(
      d.isPriceTaxExclusive === true ||
      d.isIncl === false ||
      isLineBaseRequiringCombinedFactor ||
      (matchedProduct?.isIncl === false && effectivePriceView !== "Inclusive") ||
      (d.basePrice !== undefined && Number(d.basePrice) > 0 && Math.abs(rawPrice - Number(d.basePrice)) < 0.001) ||
      (rawNetAmount > 0 && Math.max(0, rawNetAmount - extrasSum) > (rawPrice * qty + 0.05))
    );

    const isBackendDetail = Boolean(
      isDetailsTaxExclusiveOrder ||
      isBackendSavedOrder ||
      d.mapId !== undefined ||
      d.orderId !== undefined ||
      d.OrderId !== undefined
    );

    const rawAlreadyInclusive = Boolean(
      d.isPriceTaxInclusive === true ||
      d.isIncl === true ||
      (d as any).taxType === "Inclusive" ||
      (!rawAlreadyExclusive && matchedProduct?.isIncl === true && !isDetailsTaxExclusiveOrder) ||
      (!rawAlreadyExclusive && !isDetailsTaxExclusiveOrder && !isPriceDefinitelyExclusive && effectivePriceView === "Inclusive")
    );

    const discValuesToTest = [
      rawDiscAmount,
      Number((d as any).itemDiscountIncl || 0),
      Number((d as any).itemDiscountGross || 0),
      Number((d as any).discountValue || 0),
      activeVatRate > 0 ? roundCalc(rawDiscAmount * orderCombinedFactor, CALC_PRECISION) : rawDiscAmount,
    ].filter(v => v > 0);

    const lineNetRaw = (rawPrice * qty) - rawDiscAmount;
    const isLineMatchesGrossNet = !isOrderBillDiscount && (
      (rawDiscAmount > 0 && rawMasterNet > 0 && Math.abs(lineNetRaw - rawMasterNet) < 0.15) ||
      discValuesToTest.some(dv => rawMasterNet > 0 && Math.abs(((rawPrice * qty) - dv) - rawMasterNet) < 0.15)
    );

    // Check if rawPrice matches combined inclusive price from catalog + extras
    const baseExclCatalogEst = (catalogPrice !== undefined && catalogPrice > 0)
      ? (isProductMasterIncl && orderCombinedFactor > 1 ? roundCalc(catalogPrice / orderCombinedFactor, CALC_PRECISION) : catalogPrice)
      : 0;
    const extraPerUnitExclEst = (extrasSum > 0 && qty > 0)
      ? (orderCombinedFactor > 1.01 && extras.some((ex: any) => ex.isPriceTaxExclusive !== true)
          ? roundCalc(extrasSum / (qty * orderCombinedFactor), CALC_PRECISION)
          : roundCalc(extrasSum / qty, CALC_PRECISION))
      : 0;
    const combinedExclEst = baseExclCatalogEst > 0 ? (baseExclCatalogEst + extraPerUnitExclEst) : 0;
    const combinedInclEst = combinedExclEst > 0 ? roundCalc(combinedExclEst * orderCombinedFactor, CALC_PRECISION) : 0;

    const isPriceMatchesCombinedIncl = Boolean(
      combinedInclEst > 0 && (
        Math.abs(rawPrice - combinedInclEst) < 0.02 ||
        Math.abs(rawPrice * qty - roundCalc(combinedInclEst * qty, CALC_PRECISION)) < 0.02
      )
    );

    if (isBackendDetail) {
      const rawLineExcl = Number(d.vatExclAmount ?? d.VatExclAmount ?? d.basePrice ?? 0);
      const isPriceMatchesNet = !isLineBaseRequiringCombinedFactor && rawDiscAmount === 0 && rawNetAmount > 0 && Math.abs(rawPrice * qty - rawNetAmount) < 0.05;
      const isPriceMatchesExcl = (rawLineExcl > 0 && Math.abs(rawPrice * qty - rawLineExcl) < 0.05) ||
        (rawMasterSubTotal > 0 && Math.abs(rawPrice * qty - rawMasterSubTotal) < 0.05 && rawMasterNet > rawPrice * qty);
      const isPriceMatchesGrossMaster = !isLineBaseRequiringCombinedFactor && (rawMasterNet > 0 || rawMasterDisc > 0) &&
        (rawMasterVatAmt > 0 || isVatActive) &&
        (
          (rawDiscAmount === 0 && Math.abs(rawPrice * qty - (rawMasterNet + rawMasterDisc)) < 0.05) ||
          discValuesToTest.some(dv => Math.abs(rawPrice * qty - (rawMasterNet + dv)) < 0.05)
        );

      const isCatalogPriceMatchesExcl = catalogPrice !== undefined && catalogPrice > 0 && (
        Math.abs(rawPrice - catalogPrice) < 0.01 || (qty > 0 && Math.abs(rawPrice - catalogPrice) < 0.01)
      );
      const isCatalogPriceMatchesIncl = catalogPrice !== undefined && catalogPrice > 0 && !isProductMasterIncl && orderCombinedFactor > 1 && (
        Math.abs(rawPrice - roundCalc(catalogPrice * orderCombinedFactor, CALC_PRECISION)) < 0.05 ||
        (qty > 0 && Math.abs(rawPrice * qty - roundCalc(catalogPrice * orderCombinedFactor * qty, CALC_PRECISION)) < 0.05)
      );

      if (isPriceMatchesCombinedIncl) {
        inclusiveBaseUnit = rawPrice;
        exclusiveBaseUnit = combinedExclEst > 0
          ? combinedExclEst
          : (activeVatRate > 0 ? roundCalc(rawPrice / orderCombinedFactor, CALC_PRECISION) : rawPrice);
      } else if (isCatalogPriceMatchesIncl) {
        inclusiveBaseUnit = rawPrice;
        exclusiveBaseUnit = catalogPrice!;
      } else if (isProductMasterIncl && isCatalogPriceMatchesExcl) {
        inclusiveBaseUnit = catalogPrice!;
        exclusiveBaseUnit = orderCombinedFactor > 1 ? roundCalc(catalogPrice! / orderCombinedFactor, CALC_PRECISION) : catalogPrice!;
      } else if (!isProductMasterIncl && isCatalogPriceMatchesExcl) {
        exclusiveBaseUnit = catalogPrice!;
        inclusiveBaseUnit = activeVatRate > 0 ? roundCalc(catalogPrice! * orderCombinedFactor, CALC_PRECISION) : catalogPrice!;
      } else if ((isPriceDefinitelyExclusive || d.isPriceTaxExclusive === true || isPriceMatchesExcl || rawAlreadyExclusive) && !isLineMatchesGrossNet && !isPriceMatchesGrossMaster) {
        exclusiveBaseUnit = rawPrice;
        if (!hasOrderCharges && rawNetAmount > 0 && Math.abs(rawPrice * qty * (1 + activeVatRate) - rawNetAmount) < 0.01) {
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
    } else if (isPriceMatchesCombinedIncl) {
      inclusiveBaseUnit = rawPrice;
      exclusiveBaseUnit = combinedExclEst > 0
        ? combinedExclEst
        : (activeVatRate > 0 ? roundCalc(rawPrice / orderCombinedFactor, CALC_PRECISION) : rawPrice);
    } else if (catalogPrice !== undefined && catalogPrice > 0 && !isProductMasterIncl && orderCombinedFactor > 1 && (
      Math.abs(rawPrice - roundCalc(catalogPrice * orderCombinedFactor, CALC_PRECISION)) < 0.05 ||
      (qty > 0 && Math.abs(rawPrice * qty - roundCalc(catalogPrice * orderCombinedFactor * qty, CALC_PRECISION)) < 0.05)
    )) {
      inclusiveBaseUnit = rawPrice;
      exclusiveBaseUnit = catalogPrice;
    } else if (catalogPrice !== undefined && catalogPrice > 0 && isProductMasterIncl && (Math.abs(rawPrice - catalogPrice) < 0.01 || (qty > 0 && Math.abs(rawPrice - catalogPrice) < 0.01))) {
      inclusiveBaseUnit = catalogPrice;
      exclusiveBaseUnit = orderCombinedFactor > 1 ? roundCalc(catalogPrice / orderCombinedFactor, CALC_PRECISION) : catalogPrice;
    } else if (catalogPrice !== undefined && catalogPrice > 0 && !isProductMasterIncl && (Math.abs(rawPrice - catalogPrice) < 0.01 || (qty > 0 && Math.abs(rawPrice - catalogPrice) < 0.01))) {
      exclusiveBaseUnit = catalogPrice;
      inclusiveBaseUnit = activeVatRate > 0 ? roundCalc(catalogPrice * orderCombinedFactor, CALC_PRECISION) : catalogPrice;
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
      } else if (Math.abs(catalogPrice - rawPrice) < 0.005) {
        const isBackendDetail = Boolean(
          isDetailsTaxExclusiveOrder ||
          isBackendSavedOrder ||
          d.mapId !== undefined ||
          d.orderId !== undefined ||
          d.OrderId !== undefined
        );
        const isInclusiveContext = effectivePriceView === "Inclusive";
        const isProductMasterInclusive = matchedProduct?.isIncl === true || d.isIncl === true;
        if (!isProductMasterInclusive && (rawAlreadyExclusive || (isBackendDetail && !rawAlreadyInclusive && !isInclusiveContext))) {
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
    const lineNetToCompare = rawNetAmount > 0 ? rawNetAmount : (rawDetails.length === 1 ? rawMasterNet : 0);

    // Combined Product + Extras Detection:
    // When a customer buys an item with extras, detail.price stores the combined exclusive price.
    // Detect if rawPrice already contains the extras so they are NOT added twice:
    const isProductMasterInclusive = matchedProduct?.isIncl === true || d.isIncl === true;
    const baseExclFromCatalog = (catalogPrice !== undefined && catalogPrice > 0)
      ? (isProductMasterInclusive && orderCombinedFactor > 1 ? roundCalc(catalogPrice / orderCombinedFactor, CALC_PRECISION) : catalogPrice)
      : 0;
    const extraPerUnitExclEstimate = (extrasSum > 0 && qty > 0)
      ? (orderCombinedFactor > 1.01 && extras.some((ex: any) => ex.isPriceTaxExclusive !== true)
          ? roundCalc(extrasSum / (qty * orderCombinedFactor), CALC_PRECISION)
          : roundCalc(extrasSum / qty, CALC_PRECISION))
      : 0;
    const combinedExcl = baseExclFromCatalog > 0 ? (baseExclFromCatalog + extraPerUnitExclEstimate) : 0;
    const combinedIncl = combinedExcl > 0 ? roundCalc(combinedExcl * orderCombinedFactor, CALC_PRECISION) : 0;

    const combinedMatchesCatalog = Boolean(
      extrasSum > 0 && baseExclFromCatalog > 0 && (
        Math.abs(rawPrice - combinedExcl) < 0.02 ||
        Math.abs(rawPrice - combinedIncl) < 0.02 ||
        Math.abs(exclusiveBaseUnit - combinedExcl) < 0.02 ||
        Math.abs(inclusiveBaseUnit - combinedIncl) < 0.02
      )
    );

    const isCartLineWithExtras = Boolean(
      extrasSum > 0 && (d as any).originalLineTotal !== undefined &&
      Math.abs(rawPrice * qty - Number((d as any).originalLineTotal)) < 0.005
    );

    const inclusiveBaseMatchesNet = Boolean(
      extrasSum > 0 && isBackendSavedOrder && (
        (rawMasterNet > 0 && rawDetails.length === 1 && Math.abs(inclusiveBaseUnit * qty - rawMasterNet) < 0.02) ||
        (lineNetToCompare > 0 && Math.abs(inclusiveBaseUnit * qty - lineNetToCompare) < 0.02)
      )
    );

    const combinedPriceMatchesMasterNet = Boolean(
      extrasSum > 0 && isBackendSavedOrder && rawMasterNet > 0 && orderCombinedFactor > 1.01 &&
      Math.abs(rawPrice * qty * orderCombinedFactor - rawMasterNet) < 0.02 &&
      Math.abs((rawPrice * qty - extrasSum - lineEffectiveDiscount) * orderCombinedFactor - rawMasterNet) > 0.03
    );

    const backendPriceAlreadyIncludesExtras = Boolean(
      extrasSum > 0 && isBackendSavedOrder && (
        combinedMatchesCatalog ||
        inclusiveBaseMatchesNet ||
        combinedPriceMatchesMasterNet ||
        (lineNetToCompare > 0 &&
          Math.abs(rawPrice * orderCombinedFactor * qty - (lineNetToCompare + lineEffectiveDiscount * orderCombinedFactor)) < 0.02 &&
          Math.abs((rawPrice * qty + extrasSum - lineEffectiveDiscount) * orderCombinedFactor - lineNetToCompare) > 0.03)
      )
    );

    const isPriceAlreadyIncludesExtras = Boolean(
      extrasSum > 0 && (
        backendPriceAlreadyIncludesExtras ||
        combinedMatchesCatalog ||
        isPriceMatchesCombinedIncl ||
        isCartLineWithExtras ||
        (!isBackendSavedOrder && catalogPrice !== undefined && catalogPrice > 0 && Math.abs(rawPrice - (catalogPrice + extrasSum)) < 0.02)
      )
    );

    const rawAlreadyIncludesExtras = Boolean(
      (d as any).isUnifiedPricingLine ||
      (d as any).extrasIncluded ||
      isPriceAlreadyIncludesExtras
    );

    const effectiveExtrasSum = rawAlreadyIncludesExtras ? 0 : extrasSum;

    // Extras rolled into unit rates:
    const e = qty > 0 ? effectiveExtrasSum / qty : 0;
    let extrasPerUnitExcl: number;
    let extrasPerUnitIncl: number;
    const lineNetMatchesScaledExclusiveSum = hasOrderCharges &&
      orderCombinedFactor > 1.01 &&
      lineNetToCompare > 0 &&
      effectiveExtrasSum > 0 &&
      Math.abs((rawPrice * qty + effectiveExtrasSum - lineEffectiveDiscount) * orderCombinedFactor - lineNetToCompare) < 0.005;

    const isSumTaxExclusive = hasOrderCharges &&
      orderCombinedFactor > 1.01 &&
      rawMasterNet > 0 &&
      effectiveExtrasSum > 0 &&
      Math.abs((rawPrice * qty + effectiveExtrasSum - lineEffectiveDiscount) * orderCombinedFactor - rawMasterNet) < 0.005 &&
      Math.abs((rawPrice * qty + effectiveExtrasSum) - rawMasterNet) > 0.05;

    const areExtrasTaxExclusive = Boolean(
      lineNetMatchesScaledExclusiveSum ||
      isSumTaxExclusive ||
      (d as any).areExtrasTaxExclusive === true ||
      (extras.length > 0 && extras.every((ex: any) => ex.isPriceTaxExclusive === true)) ||
      (rawModifiers.length > 0 && isBackendSavedOrder && isDetailsTaxExclusiveOrder) ||
      (rawModifiers.length > 0 && isBackendSavedOrder && Math.abs(exclusiveBaseUnit - rawPrice) < 0.001)
    );

    if (areExtrasTaxExclusive) {
      extrasPerUnitExcl = e;
      extrasPerUnitIncl = activeVatRate > 0
        ? roundCalc(e * orderCombinedFactor, CALC_PRECISION)
        : e;
    } else if (activeVatRate > 0 && e > 0) {
      extrasPerUnitIncl = e;
      extrasPerUnitExcl = orderCombinedFactor > 0
        ? roundCalc(e / orderCombinedFactor, CALC_PRECISION)
        : e;
    } else {
      extrasPerUnitExcl = e;
      extrasPerUnitIncl = e;
    }

    const exclusiveRate = roundCalc(exclusiveBaseUnit + extrasPerUnitExcl, CALC_PRECISION);
    const inclusiveRate = roundCalc(inclusiveBaseUnit + extrasPerUnitIncl, CALC_PRECISION);

    const exclusiveGross = ((d as any).amount !== undefined && Math.abs(Number((d as any).amount) - roundCalc(exclusiveRate * qty, CALC_PRECISION)) < 0.02)
      ? Number((d as any).amount)
      : roundCalc(exclusiveRate * qty, CALC_PRECISION);
    const inclusiveGross = ((d as any).originalLineTotal !== undefined && Math.abs(Number((d as any).originalLineTotal) - roundCalc(inclusiveRate * qty, CALC_PRECISION)) < 0.02)
      ? Number((d as any).originalLineTotal)
      : roundCalc(inclusiveRate * qty, CALC_PRECISION);

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

      if (d.itemDiscountIncl !== undefined && Number(d.itemDiscountIncl) > 0 && d.itemDiscountExcl !== undefined && Number(d.itemDiscountExcl) > 0 && Number(d.itemDiscountIncl) > Number(d.itemDiscountExcl)) {
        lineDiscountIncl = Math.min(inclusiveGross, Number(d.itemDiscountIncl));
        lineDiscountExcl = Math.min(exclusiveGross, Number(d.itemDiscountExcl));
      } else if (d.discIsIncl === true || d.discountIsIncl === true) {
        lineDiscountIncl = Math.min(inclusiveGross, rawDiscAmount);
        lineDiscountExcl = activeVatRate > 0
          ? roundCalc(lineDiscountIncl / factorForDiscount, CALC_PRECISION)
          : lineDiscountIncl;
      } else if (d.discIsIncl === false || d.discountIsIncl === false) {
        lineDiscountExcl = Math.min(exclusiveGross, rawDiscAmount);
        lineDiscountIncl = (activeVatRate > 0 || factorForDiscount > 1)
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
        lineDiscountIncl = (activeVatRate > 0 || factorForDiscount > 1)
          ? roundCalc(lineDiscountExcl * factorForDiscount, CALC_PRECISION)
          : lineDiscountExcl;
      } else if (
        isPriceDefinitelyExclusive ||
        isDetailsTaxExclusiveOrder ||
        rawAlreadyExclusive ||
        (d.baseDiscount !== undefined && Math.abs(rawDiscAmount - Number(d.baseDiscount)) < 0.001) ||
        (d.itemDiscountExcl !== undefined && Math.abs(rawDiscAmount - Number(d.itemDiscountExcl)) < 0.001)
      ) {
        lineDiscountExcl = Math.min(exclusiveGross, rawDiscAmount);
        lineDiscountIncl = (activeVatRate > 0 || factorForDiscount > 1)
          ? roundCalc(lineDiscountExcl * factorForDiscount, CALC_PRECISION)
          : lineDiscountExcl;
      } else {
        const isInputPriceViewExclusive = options?.priceView === "Exclusive" || (options?.priceView === undefined && getPriceView() === "Exclusive");
        const isDiscInclusive = Boolean(
          effectivePriceView === "Inclusive" && !rawAlreadyExclusive && !isInputPriceViewExclusive
        );
        if (isDiscInclusive) {
          lineDiscountIncl = Math.min(inclusiveGross, rawDiscAmount);
          lineDiscountExcl = (activeVatRate > 0 || factorForDiscount > 1)
            ? roundCalc(lineDiscountIncl / factorForDiscount, CALC_PRECISION)
            : lineDiscountIncl;
        } else {
          lineDiscountExcl = Math.min(exclusiveGross, rawDiscAmount);
          lineDiscountIncl = (activeVatRate > 0 || factorForDiscount > 1)
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
      isProductMasterInclusive,
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
        if (areExtrasTaxExclusive) {
          exExcl = exPrice;
          exIncl = activeVatRate > 0 ? roundCalc(exPrice * orderCombinedFactor, CALC_PRECISION) : exPrice;
        } else if (activeVatRate > 0 && exPrice > 0) {
          exIncl = exPrice;
          exExcl = orderCombinedFactor > 0
            ? roundCalc(exPrice / orderCombinedFactor, CALC_PRECISION)
            : exPrice;
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
  let serviceCharge = Number(master.serviceCharge ?? options?.serviceCharge ?? 0);
  let levy = Number(master.levyAmt ?? master.levy ?? options?.levy ?? 0);
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
      if (isDiscMatchingExcl || (!isDiscMatchingIncl && effectivePriceView === 'Exclusive')) {
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

  if (serviceCharge === 0 && detailsHaveSc) {
    serviceCharge = roundCalc(rawDetails.reduce((sum: number, d: any) => sum + Number(d.serviceCharge ?? d.ServiceCharge ?? 0), 0), CALC_PRECISION);
  } else if (serviceCharge === 0 && !detailsHaveSc && effectiveScRate > 0 && !isBackendSavedOrder) {
    const taxablePreCharge = Math.max(0, subTotalExclusive - totalDiscountExcl);
    serviceCharge = roundCalc(taxablePreCharge * effectiveScRate, CALC_PRECISION);
  }

  if (levy === 0 && detailsHaveLevy) {
    levy = roundCalc(rawDetails.reduce((sum: number, d: any) => sum + Number(d.levy ?? d.Levy ?? 0), 0), CALC_PRECISION);
  } else if (levy === 0 && !detailsHaveLevy && effectiveLevyRate > 0 && !isBackendSavedOrder) {
    const taxablePreCharge = Math.max(0, subTotalExclusive - totalDiscountExcl);
    levy = roundCalc((taxablePreCharge + serviceCharge) * effectiveLevyRate, CALC_PRECISION);
  }

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
      printPrice: effectivePriceView,
      priceView: effectivePriceView,
      isTaxInclusive: effectivePriceView === "Inclusive",
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
