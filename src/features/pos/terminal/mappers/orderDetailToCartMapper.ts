import { roundCalc, getPriceView, getBillingConfig, getVatStatus } from "../utils/billing";
import type { PosCartItem } from "../../types";
import { getModifierTypeNameById } from "../../services/menuApi";
import { alternativesCache } from "../hooks/usePosProducts";
import { cleanProductName } from "../../utils/alternativeHelpers";

export interface MapOrderDetailOptions {
  detail: any;
  idx: number;
  modifiersData?: any[];
  products?: any[];
  productCache?: Record<string | number, any>;
  priceView?: "Inclusive" | "Exclusive";
  masterDiscPer?: number;
  isOrderBillDiscount?: boolean;
  orderType?: string;
}

/**
 * Maps a saved backend order detail row (and its modifiers) into a PosCartItem.
 * Correctly restores unit price, applicable VAT, and tax inclusivity so that
 * reopening an order in Edit mode accurately computes line totals, VAT amounts, and grand totals.
 */
export const mapOrderDetailToCartItem = ({
  detail,
  idx,
  modifiersData = [],
  products = [],
  productCache = {},
  priceView,
  masterDiscPer,
  isOrderBillDiscount,
  orderType,
}: MapOrderDetailOptions): PosCartItem => {
  // 1. Resolve product ID and catalog match
  let pId =
    detail.productId ??
    detail.ProductId ??
    detail.itemId ??
    detail.ItemId ??
    detail.product?.id ??
    detail.Product?.id ??
    0;

  let matchedProduct: any = null;
  if (pId && productCache && productCache[pId]) {
    matchedProduct = productCache[pId];
  }
  if (!matchedProduct && pId && Array.isArray(products)) {
    matchedProduct = products.find((p: any) => p.id === pId);
  }
  if (!matchedProduct && (detail.productName || detail.ProductName)) {
    const targetName = String(detail.productName || detail.ProductName || "").toLowerCase().trim();
    if (productCache) {
      matchedProduct = Object.values(productCache).find(
        (p: any) => String(p.name || "").toLowerCase().trim() === targetName
      );
    }
    if (!matchedProduct && Array.isArray(products)) {
      matchedProduct = products.find(
        (p: any) => String(p.name || "").toLowerCase().trim() === targetName
      );
    }
    if (matchedProduct && !pId) {
      pId = matchedProduct.id;
    }
  }
  const realProduct = matchedProduct || {};

  // 2. Resolve Price View (Inclusive vs Exclusive)
  const resolvedPriceView: "Inclusive" | "Exclusive" = getPriceView(priceView);

  // Resolve Alternative/Variant and Unit ID early
  const effectiveUnitId = detail.unitId ?? detail.UnitId ?? realProduct.unitId ?? 1;

  let rawAlt =
    detail.variantName ||
    detail.altName ||
    detail.VariantName ||
    detail.AltName;

  let rawAltArabic =
    detail.variantArabic ||
    detail.altArabic ||
    detail.VariantArabic ||
    detail.AltArabic;

  let matchedAlt: any = null;
  if (effectiveUnitId && pId) {
    const allCachedAlts = Object.entries(alternativesCache)
      .filter(([k]) => k.startsWith(`${pId}-`))
      .flatMap(([, alts]) => alts);
    matchedAlt = allCachedAlts.find(
      (a: any) => Number(a.unitId ?? a.UnitId ?? a.id ?? a.Id) === Number(effectiveUnitId)
    );
    if (!rawAlt && matchedAlt) {
      rawAlt = matchedAlt.altName;
      rawAltArabic = matchedAlt.altArabic;
    }
  }

  // 3. Resolve Line Item Modifiers, Extras, and Messages
  const dMapId = detail.mapId ?? detail.MapId ?? detail.mapID ?? detail.sNo ?? detail.SNo;
  const dOrderId = detail.orderId ?? detail.OrderId;

  const itemModifiers = modifiersData.filter((m: any) => {
    const mMapId = m.mapId ?? m.MapId ?? m.mapID;
    const mOrderId = m.orderId ?? m.OrderId;

    if (mOrderId !== undefined && dOrderId !== undefined && Number(mOrderId) !== Number(dOrderId)) {
      return false;
    }
    if (mMapId === undefined || dMapId === undefined) return false;
    return Number(mMapId) === Number(dMapId);
  });

  // 4. Resolve VAT Rate
  const fallbackBillingConfig = getBillingConfig(orderType || "DineIn");
  const isVatEnabled = getVatStatus();
  const rawVatAmt = Number(detail.vatAmount ?? detail.VatAmount ?? 0);
  let rawDiscAmount = Number(detail.discAmount ?? detail.DiscAmount ?? 0);
  const qty = Number(detail.qty ?? detail.Qty ?? detail.quantity ?? detail.orderQty ?? detail.OrderQty ?? 1);
  let rawPrice = Number(detail.price ?? detail.Price ?? realProduct.price ?? 0);

  // Self-healing: if order is not DineIn (SC is 0), but backend detail was queried with phantom serviceCharge=10
  const isDineIn = (orderType || "").toLowerCase().includes("dine");
  const rawLineNet = (rawPrice * qty) - rawDiscAmount;

  const activeFraction = fallbackBillingConfig.vatRate > 0 ? fallbackBillingConfig.vatRate : 0.10;
  const expectedNetFromVat = rawVatAmt > 0 ? (rawVatAmt * (1 + 1 / activeFraction)) : 0;

  const isPhantomScInflated = !isDineIn && (
    (expectedNetFromVat > 0 && Math.abs(roundCalc(rawLineNet / 1.10, 2) - roundCalc(expectedNetFromVat, 2)) < 0.15) ||
    (rawPrice > 0 && matchedAlt?.price !== undefined && Math.abs(rawPrice - Number(matchedAlt.price) * 1.2705) < 0.05) ||
    (rawPrice > 0 && realProduct.price !== undefined && Math.abs(rawPrice - Number(realProduct.price) * 1.2705) < 0.05)
  );

  if (isPhantomScInflated) {
    rawPrice = roundCalc(rawPrice / 1.10, 4);
    rawDiscAmount = roundCalc(rawDiscAmount / 1.10, 4);
  }

  const rawNetAmt = Number(
    detail.netAmount ??
    detail.NetAmount ??
    (detail.amount !== undefined
      ? (detail.discAmount !== undefined ? (Number(detail.amount) - Number(detail.discAmount)) / (isPhantomScInflated ? 1.10 : 1) : Number(detail.amount) / (isPhantomScInflated ? 1.10 : 1))
      : ((rawPrice * qty) - rawDiscAmount))
  );

  let calculatedVatRatePercent: number | undefined = undefined;
  if (rawVatAmt > 0 && rawNetAmt > 0) {
    const vatBase = rawNetAmt - rawVatAmt;
    if (vatBase > 0) {
      calculatedVatRatePercent = Number(((rawVatAmt / vatBase) * 100).toFixed(2));
    }
  }

  const detailVatValue =
    detail.vatValue ??
    detail.VatValue ??
    detail.vatPer ??
    detail.VatPer ??
    detail.taxPer ??
    detail.TaxPer;

  let resolvedVatValue =
    detailVatValue !== undefined && detailVatValue !== null
      ? Number(detailVatValue)
      : calculatedVatRatePercent !== undefined && calculatedVatRatePercent !== null
      ? Number(calculatedVatRatePercent)
      : realProduct.vatValue !== undefined && realProduct.vatValue !== null
      ? Number(realProduct.vatValue)
      : undefined;

  if ((resolvedVatValue === undefined || resolvedVatValue === 0) && isVatEnabled && fallbackBillingConfig.vatRate > 0) {
    resolvedVatValue = fallbackBillingConfig.vatRate * 100;
  }

  const activeVatFraction =
    resolvedVatValue !== undefined && resolvedVatValue > 0 ? resolvedVatValue / 100 : 0;

  const levyRate = fallbackBillingConfig.levyRate || 0.05;
  const scRate = isDineIn ? (fallbackBillingConfig.serviceChargeRate || 0.10) : 0;
  const orderCombinedFactor = (activeVatFraction > 0 || levyRate > 0 || scRate > 0)
    ? roundCalc((1 + activeVatFraction) * (1 + levyRate) * (1 + scRate), 4)
    : 1;

  // Determine early if detail is complimentary
  const isDetailComplimentary = Boolean(
    detail.complimentaryStatus ||
    detail.ComplimentaryStatus ||
    (detail.discPer && Number(detail.discPer) === 100) ||
    (detail.DiscPer && Number(detail.DiscPer) === 100)
  );

  const catalogPrice =
    matchedAlt?.price !== undefined
      ? Number(matchedAlt.price)
      : realProduct.price !== undefined
      ? Number(realProduct.price)
      : undefined;

  // 6. Restore Unit Price & Tax Inclusivity with Strict Mathematical Invariants
  const lineBase = rawPrice * qty;
  const remainingBase = lineBase - rawDiscAmount;

  const isBackendSavedDetail = Boolean(
    detail.mapId !== undefined ||
    detail.orderId !== undefined ||
    detail.OrderId !== undefined ||
    detail.detailId !== undefined ||
    detail.transDate !== undefined
  );

  const rawLineExcl = Number(detail.vatExclAmount ?? detail.VatExclAmount ?? detail.basePrice ?? 0);
  const isPriceMatchesNet = rawNetAmt > 0 && Math.abs(rawPrice * qty - rawNetAmt) < 0.05;
  const isPriceMatchesExcl = rawLineExcl > 0 && Math.abs(rawPrice * qty - rawLineExcl) < 0.05;

  let isStoredTaxInclusive = false;
  let isStoredTaxExclusive = false;

  if (isPriceMatchesNet && rawVatAmt > 0) {
    // Net Amount matches rawPrice * qty: Price was returned as TAX-INCLUSIVE!
    isStoredTaxInclusive = true;
  } else if (isPriceMatchesExcl) {
    // vatExclAmount matches rawPrice * qty: Price was returned as TAX-EXCLUSIVE!
    isStoredTaxExclusive = true;
  } else if (rawVatAmt > 0.001) {
    if (Math.abs(rawNetAmt - remainingBase) < 0.05) {
      // Net Amount matches rawPrice * qty: Price was stored as TAX-INCLUSIVE!
      isStoredTaxInclusive = true;
    } else if (Math.abs(rawNetAmt - (remainingBase + rawVatAmt)) < 0.05) {
      // Net Amount matches (rawPrice * qty) + VAT: Price was stored as TAX-EXCLUSIVE!
      isStoredTaxExclusive = true;
    }
  }

  if (!isStoredTaxInclusive && !isStoredTaxExclusive) {
    if (
      detail.isPriceTaxInclusive === true ||
      detail.isIncl === true ||
      (detail as any).taxType === "Inclusive" ||
      realProduct.isIncl === true
    ) {
      isStoredTaxInclusive = true;
    } else if (
      detail.isPriceTaxExclusive === true ||
      detail.isIncl === false ||
      (detail as any).taxType === "Exclusive" ||
      realProduct.isIncl === false ||
      Boolean(detail.exclusivePrice) ||
      Boolean(detail.isExclusive) ||
      Boolean(detail.basePrice && Number(detail.basePrice) > 0 && Math.abs(Number(detail.basePrice) - rawPrice) < 0.01)
    ) {
      isStoredTaxExclusive = true;
    } else if (isBackendSavedDetail) {
      if (resolvedPriceView === "Inclusive" && rawNetAmt > 0 && rawPrice > 0 && Math.abs(rawPrice * qty - rawNetAmt) < 0.15) {
        isStoredTaxInclusive = true;
      } else {
        isStoredTaxExclusive = true;
      }
    }
  }

  // Determine true base (tax-exclusive) and true gross (tax-inclusive) unit prices
  let trueBasePrice: number;
  let trueGrossPrice: number;

  if (isStoredTaxInclusive) {
    trueGrossPrice = rawPrice;
    trueBasePrice = (rawLineExcl > 0 && qty > 0)
      ? roundCalc(rawLineExcl / qty, 4)
      : (catalogPrice !== undefined && realProduct.isIncl === false && (
          Math.abs(roundCalc(catalogPrice * (1 + activeVatFraction), 4) - rawPrice) < 0.05 ||
          Math.abs(roundCalc(catalogPrice * orderCombinedFactor, 4) - rawPrice) < 0.05
        ))
      ? catalogPrice
      : (orderCombinedFactor > 1 && Math.abs(roundCalc(rawPrice / orderCombinedFactor, 4) - (catalogPrice || 0)) < 0.05)
      ? catalogPrice!
      : (orderCombinedFactor > 1 ? roundCalc(rawPrice / orderCombinedFactor, 4) : (activeVatFraction > 0 ? roundCalc(rawPrice / (1 + activeVatFraction), 4) : rawPrice));
  } else if (isStoredTaxExclusive) {
    trueBasePrice = rawPrice;
    trueGrossPrice = (rawPrice > 0)
      ? (activeVatFraction > 0 ? roundCalc(rawPrice * (1 + activeVatFraction), 4) : rawPrice)
      : (rawVatAmt > 0 && qty > 0 && Math.abs(rawNetAmt - (remainingBase + rawVatAmt)) < 0.05 ? roundCalc(rawNetAmt / qty, 4) : rawPrice);
  } else if (rawNetAmt > 0 && qty > 0) {
    if (rawVatAmt > 0 && Math.abs(rawNetAmt - remainingBase) < 0.05) {
      trueGrossPrice = rawPrice;
      trueBasePrice = (rawLineExcl > 0 && qty > 0)
        ? roundCalc(rawLineExcl / qty, 4)
        : (activeVatFraction > 0 ? roundCalc(rawPrice / (1 + activeVatFraction), 4) : rawPrice);
    } else if (rawVatAmt > 0 && Math.abs(rawNetAmt - (remainingBase + rawVatAmt)) < 0.05) {
      trueBasePrice = rawPrice;
      trueGrossPrice = (rawPrice > 0)
        ? (activeVatFraction > 0 ? roundCalc(rawPrice * (1 + activeVatFraction), 4) : rawPrice)
        : roundCalc(rawNetAmt / qty, 4);
    } else if (rawPrice > 0) {
      if (resolvedPriceView === "Inclusive") {
        trueGrossPrice = rawPrice;
        trueBasePrice = (rawLineExcl > 0 && qty > 0)
          ? roundCalc(rawLineExcl / qty, 4)
          : (activeVatFraction > 0 ? roundCalc(rawPrice / (1 + activeVatFraction), 4) : rawPrice);
      } else {
        trueBasePrice = rawPrice;
        trueGrossPrice = activeVatFraction > 0 ? roundCalc(rawPrice * (1 + activeVatFraction), 4) : rawPrice;
      }
    } else {
      const grossTotal = rawNetAmt + rawDiscAmount;
      trueGrossPrice = roundCalc(grossTotal / qty, 4);
      trueBasePrice = activeVatFraction > 0 ? roundCalc(trueGrossPrice / (1 + activeVatFraction), 4) : trueGrossPrice;
    }
  } else if (catalogPrice !== undefined && catalogPrice > 0) {
    if (realProduct.isIncl === false) {
      trueBasePrice = catalogPrice;
      trueGrossPrice = activeVatFraction > 0 ? roundCalc(catalogPrice * (1 + activeVatFraction), 4) : catalogPrice;
    } else if (realProduct.isIncl === true) {
      trueGrossPrice = catalogPrice;
      trueBasePrice = activeVatFraction > 0 ? roundCalc(catalogPrice / (1 + activeVatFraction), 4) : catalogPrice;
    } else if (activeVatFraction > 0 && Math.abs(roundCalc(catalogPrice * (1 + activeVatFraction), 4) - rawPrice) < 0.05) {
      trueGrossPrice = rawPrice;
      trueBasePrice = catalogPrice;
    } else if (activeVatFraction > 0 && Math.abs(roundCalc(catalogPrice / (1 + activeVatFraction), 4) - rawPrice) < 0.05) {
      trueBasePrice = rawPrice;
      trueGrossPrice = catalogPrice;
    } else if (Math.abs(catalogPrice - rawPrice) < 0.05) {
      if (resolvedPriceView === "Inclusive") {
        trueGrossPrice = catalogPrice;
        trueBasePrice = activeVatFraction > 0 ? roundCalc(catalogPrice / (1 + activeVatFraction), 4) : catalogPrice;
      } else {
        trueBasePrice = catalogPrice;
        trueGrossPrice = activeVatFraction > 0 ? roundCalc(catalogPrice * (1 + activeVatFraction), 4) : catalogPrice;
      }
    } else {
      if (resolvedPriceView === "Inclusive") {
        trueGrossPrice = rawPrice;
        trueBasePrice = activeVatFraction > 0 ? roundCalc(rawPrice / (1 + activeVatFraction), 4) : rawPrice;
      } else {
        trueBasePrice = rawPrice;
        trueGrossPrice = activeVatFraction > 0 ? roundCalc(rawPrice * (1 + activeVatFraction), 4) : rawPrice;
      }
    }
  } else {
    if (resolvedPriceView === "Inclusive") {
      trueGrossPrice = rawPrice;
      trueBasePrice = activeVatFraction > 0 ? roundCalc(rawPrice / (1 + activeVatFraction), 4) : rawPrice;
    } else {
      trueBasePrice = rawPrice;
      trueGrossPrice = activeVatFraction > 0 ? roundCalc(rawPrice * (1 + activeVatFraction), 4) : rawPrice;
    }
  }

  // Harmonize with catalog price if available
  if (catalogPrice !== undefined && catalogPrice > 0 && activeVatFraction > 0) {
    if (Math.abs(roundCalc(catalogPrice * (1 + activeVatFraction), 4) - trueGrossPrice) < 0.05) {
      trueGrossPrice = roundCalc(catalogPrice * (1 + activeVatFraction), 4);
      trueBasePrice = catalogPrice;
    } else if (Math.abs(roundCalc(catalogPrice * orderCombinedFactor, 4) - trueGrossPrice) < 0.05) {
      trueGrossPrice = roundCalc(catalogPrice * orderCombinedFactor, 4);
      trueBasePrice = catalogPrice;
    } else if (Math.abs(catalogPrice - trueBasePrice) < 0.05) {
      trueBasePrice = catalogPrice;
      trueGrossPrice = roundCalc(catalogPrice * orderCombinedFactor, 4);
    }
  }

  let restoredPrice: number;
  let itemIsIncl: boolean;

  if (realProduct.isIncl === true) {
    restoredPrice = (catalogPrice && Math.abs(catalogPrice - trueGrossPrice) < 0.05) ? catalogPrice : trueGrossPrice;
    itemIsIncl = true;
  } else if (realProduct.isIncl === false) {
    restoredPrice = (catalogPrice && Math.abs(catalogPrice - trueBasePrice) < 0.05) ? catalogPrice : trueBasePrice;
    itemIsIncl = false;
  } else if (resolvedPriceView === "Exclusive") {
    // In Exclusive View: item is always tax-exclusive base
    restoredPrice = trueBasePrice;
    itemIsIncl = false;
  } else {
    // In Inclusive View: all items in the POS cart use gross tax-inclusive prices
    restoredPrice = trueGrossPrice;
    itemIsIncl = true;
  }

  // Strict Invariant Enforcement:
  // Under NO condition can an item have isIncl === false while its price is the gross price
  if (!itemIsIncl && activeVatFraction > 0 && trueGrossPrice > trueBasePrice) {
    if (Math.abs(restoredPrice - trueGrossPrice) < 0.02) {
      restoredPrice = trueBasePrice;
    }
  }
  // And under NO condition can an item have isIncl === true while its price is the exclusive base
  if (itemIsIncl && activeVatFraction > 0 && trueGrossPrice > trueBasePrice) {
    if (Math.abs(restoredPrice - trueBasePrice) < 0.02) {
      restoredPrice = trueGrossPrice;
    }
  }

  // 7. Modifiers and Extras Mapping
  const rawExtras = itemModifiers
    .filter((m: any) => {
      const statusStr = (m.status || m.Status || "").toLowerCase().trim();
      const price = Number(m.price ?? m.Price ?? m.amount ?? m.Amount ?? 0);
      const typeId = Number(m.typeId ?? m.TypeId ?? 0);
      return statusStr === "extras" || statusStr === "extra" || typeId === 2 || (statusStr === "" && price > 0);
    })
    .map((m: any) => {
      const rawExtraPrice = Number(m.price ?? m.Price ?? m.amount ?? m.Amount ?? 0);
      let restoredExtraPrice = rawExtraPrice;

      const extraIsAlreadyInclusive = Boolean(
        m.isIncl ||
        m.isPriceTaxInclusive ||
        (activeVatFraction > 0 &&
          rawNetAmt > 0 &&
          Math.abs((trueGrossPrice + rawExtraPrice) * qty - (rawNetAmt + rawDiscAmount)) < 0.05)
      );

      if (itemIsIncl) {
        if (!extraIsAlreadyInclusive && activeVatFraction > 0) {
          // Extra was saved as tax-exclusive, convert to inclusive for cart
          restoredExtraPrice = roundCalc(rawExtraPrice * (1 + activeVatFraction), 4);
        } else {
          restoredExtraPrice = rawExtraPrice;
        }
      } else {
        if (extraIsAlreadyInclusive && activeVatFraction > 0) {
          // Extra was saved as tax-inclusive, convert to exclusive base for cart
          restoredExtraPrice = roundCalc(rawExtraPrice / (1 + activeVatFraction), 4);
        } else {
          restoredExtraPrice = rawExtraPrice;
        }
      }

      return {
        id: m.modifierId ?? m.ModifierId ?? m.id ?? m.Id ?? 0,
        name: m.modifierName || m.ModifierName || m.name || m.Name || "Extra",
        price: restoredExtraPrice,
        qty: Number(m.qty ?? m.Qty ?? 1),
        typeId: Number(m.typeId ?? m.TypeId ?? 2),
      };
    });

  const dedupedExtrasMap = new Map<string, any>();
  rawExtras.forEach((ex: any) => {
    const exId = ex.id || 0;
    const exName = String(ex.name || "").trim().toLowerCase();
    const typeId = ex.typeId || 0;
    if (!exName) return;
    const key = exId > 0 ? `${exId}-${typeId}` : `${typeId}-${exName}`;
    if (dedupedExtrasMap.has(key)) {
      const existing = dedupedExtrasMap.get(key);
      existing.qty = (existing.qty || 1) + (ex.qty || 1);
    } else {
      dedupedExtrasMap.set(key, { ...ex, qty: ex.qty || 1 });
    }
  });
  const extras = Array.from(dedupedExtrasMap.values());

  const rawModifiers = itemModifiers
    .filter((m: any) => {
      const statusStr = (m.status || m.Status || "").toLowerCase().trim();
      const price = Number(m.price ?? m.Price ?? m.amount ?? m.Amount ?? 0);
      const typeId = Number(m.typeId ?? m.TypeId ?? 0);
      return statusStr === "modifier" || statusStr === "modifiers" || typeId === 1 || (statusStr === "" && price <= 0);
    })
    .map((m: any) => {
      const typeId = Number(m.typeId ?? m.TypeId ?? 0);
      const typeName = m.typeName || m.TypeName || m.modifierTypeName || m.ModifierTypeName || m.typeNameEn || getModifierTypeNameById(typeId) || "";
      return {
        id: m.modifierId ?? m.ModifierId ?? m.id ?? m.Id ?? 0,
        name: m.modifierName || m.ModifierName || m.name || m.Name || "",
        qty: Number(m.qty ?? m.Qty ?? 1),
        typeId,
        typeName,
        arabicName: m.arabicName || m.ArabicName || m.arabic || m.Arabic || "",
      };
    });

  const dedupedModsMap = new Map<string, any>();
  rawModifiers.forEach((mod: any) => {
    const modId = mod.id || 0;
    const modName = String(mod.name || "").trim().toLowerCase();
    const typeId = mod.typeId || 0;
    if (!modName) return;
    const key = modId > 0 ? `${modId}-${typeId}` : `${typeId}-${modName}`;
    if (dedupedModsMap.has(key)) {
      const existing = dedupedModsMap.get(key);
      existing.qty = (existing.qty || 1) + (mod.qty || 1);
    } else {
      dedupedModsMap.set(key, { ...mod, qty: mod.qty || 1 });
    }
  });
  const modifiers = Array.from(dedupedModsMap.values());

  const rawMessages = itemModifiers
    .filter((m: any) => {
      const statusStr = (m.status || m.Status || "").toLowerCase().trim();
      return statusStr === "message" || statusStr === "messages";
    })
    .map((m: any) => ({
      id: m.modifierId ?? m.ModifierId ?? m.id ?? m.Id,
      name: m.modifierName || m.ModifierName || m.name || m.Name || "",
    }));

  const seenMsgs = new Set<string>();
  const messages = rawMessages.filter((msg: any) => {
    const k = String(msg.name || "").trim().toLowerCase();
    if (!k || seenMsgs.has(k)) return false;
    seenMsgs.add(k);
    return true;
  });

  // 8. Complimentary & Discount

  const detailDiscPer =
    detail.discPer !== undefined && detail.discPer !== null
      ? Number(detail.discPer)
      : detail.DiscPer !== undefined && detail.DiscPer !== null
      ? Number(detail.DiscPer)
      : 0;

  // Determine if this detail's discount was purely inherited from an order-level bill discount
  const isFromBillDiscount = Boolean(
    isOrderBillDiscount ||
    (masterDiscPer !== undefined && masterDiscPer > 0 && Math.abs(detailDiscPer - masterDiscPer) < 0.01) ||
    (isOrderBillDiscount && (!masterDiscPer || masterDiscPer === 0 || Math.abs(detailDiscPer - masterDiscPer) < 0.01)) ||
    (isOrderBillDiscount && (masterDiscPer === 100 || detailDiscPer === 100 || isDetailComplimentary))
  );

  let discountValue = 0;
  let discountType: "percentage" | "amount" = "percentage";

  if (isFromBillDiscount) {
    // Discount is applied at the bill level (e.g. 100% complimentary bill discount),
    // so individual line items do not carry conflicting line discounts.
    discountValue = 0;
    discountType = "percentage";
  } else if (isDetailComplimentary) {
    discountValue = 100;
    discountType = "percentage";
  } else {
    if (detailDiscPer > 0) {
      discountValue = detailDiscPer;
      discountType = "percentage";
    } else if (rawDiscAmount > 0) {
      discountValue = rawDiscAmount;
      discountType = "amount";
    }
  }

  return {
    uniqueId: `${pId}-variant-${Date.now()}-${idx}`,
    productId: pId,
    unitId: effectiveUnitId,
    quantity: qty,
    price: restoredPrice,
    isIncl: itemIsIncl,
    discountValue,
    discountType,
    complimentaryStatus: isDetailComplimentary,
    extras,
    modifiers,
    messages,
    isExisting: true,
    mapId: dMapId !== undefined ? Number(dMapId) : undefined,
    originalQty: qty,
    variantName: rawAlt,
    variantArabic: rawAltArabic,
    vatValue: resolvedVatValue,
    product: {
      id: pId,
      name: rawAlt
        ? cleanProductName(realProduct.name || detail.productName || detail.ProductName, rawAlt) || `Product #${pId}`
        : (detail.productName || detail.ProductName || realProduct.name || `Product #${pId}`),
      arabicName: (rawAltArabic || rawAlt)
        ? cleanProductName(realProduct.arabicName || detail.arabicName || detail.ArabicName, rawAltArabic || rawAlt)
        : (detail.arabicName || detail.ArabicName || realProduct.arabicName),
      price: restoredPrice,
      isIncl: itemIsIncl,
      categoryId: realProduct.categoryId || 1,
      unitId: effectiveUnitId,
      vatValue: resolvedVatValue,
      sVatId: detail.vatId ?? detail.sVatId ?? realProduct.sVatId ?? undefined,
    },
  };
};

/**
 * Maps an array of backend order details and modifiers into an array of PosCartItems.
 */
export const mapOrderDetailsToCartItems = (
  details: any[],
  modifiersData: any[] = [],
  options: {
    products?: any[];
    productCache?: Record<string | number, any>;
    priceView?: "Inclusive" | "Exclusive";
    masterDiscPer?: number;
    isOrderBillDiscount?: boolean;
    orderType?: string;
  } = {}
): PosCartItem[] => {
  return details.map((detail, idx) =>
    mapOrderDetailToCartItem({
      detail,
      idx,
      modifiersData,
      products: options.products,
      productCache: options.productCache,
      priceView: options.priceView,
      masterDiscPer: options.masterDiscPer,
      isOrderBillDiscount: options.isOrderBillDiscount,
      orderType: options.orderType,
    })
  );
};
