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
  const rawVatAmt = Number(detail.vatAmount ?? detail.VatAmount ?? 0);
  const rawNetAmt = Number(detail.netAmount ?? detail.NetAmount ?? 0);
  const rawDiscAmount = Number(detail.discAmount ?? detail.DiscAmount ?? 0);
  const qty = Number(detail.qty ?? detail.Qty ?? detail.quantity ?? 1);
  const rawPrice = Number(detail.price ?? detail.Price ?? realProduct.price ?? 0);

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

  const fallbackBillingConfig = getBillingConfig("DineIn");
  const isVatEnabled = getVatStatus();

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
  const isStoredTaxExclusive =
    Boolean(detail.isPriceTaxExclusive) ||
    Boolean(detail.exclusivePrice) ||
    Boolean(detail.isExclusive) ||
    (rawVatAmt > 0.001 && Math.abs(rawNetAmt - (remainingBase + rawVatAmt)) < 0.02);
  const isStoredTaxInclusive =
    !isStoredTaxExclusive &&
    ((rawVatAmt > 0.001 && Math.abs(rawNetAmt - remainingBase) < 0.02) ||
     Boolean(detail.isPriceTaxInclusive));

  // Determine true base (tax-exclusive) and true gross (tax-inclusive) unit prices
  let trueBasePrice: number;
  let trueGrossPrice: number;

  if (isStoredTaxExclusive) {
    trueBasePrice = rawPrice;
    trueGrossPrice = activeVatFraction > 0 ? roundCalc(rawPrice * (1 + activeVatFraction), 4) : rawPrice;
  } else if (isStoredTaxInclusive) {
    trueGrossPrice = rawPrice;
    trueBasePrice = activeVatFraction > 0 ? roundCalc(rawPrice / (1 + activeVatFraction), 4) : rawPrice;
  } else if (rawNetAmt > 0 && qty > 0) {
    if (rawVatAmt > 0 && Math.abs(rawNetAmt - remainingBase) < 0.02) {
      trueGrossPrice = rawPrice;
      trueBasePrice = activeVatFraction > 0 ? roundCalc(rawPrice / (1 + activeVatFraction), 4) : rawPrice;
    } else if (rawVatAmt > 0 && Math.abs(rawNetAmt - (remainingBase + rawVatAmt)) < 0.02) {
      trueBasePrice = rawPrice;
      trueGrossPrice = activeVatFraction > 0 ? roundCalc(rawPrice * (1 + activeVatFraction), 4) : rawPrice;
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
    } else if (Math.abs(catalogPrice - trueBasePrice) < 0.05) {
      trueBasePrice = catalogPrice;
      trueGrossPrice = roundCalc(catalogPrice * (1 + activeVatFraction), 4);
    }
  }

  let restoredPrice: number;
  let itemIsIncl: boolean;

  if (resolvedPriceView === "Exclusive") {
    // In Exclusive View: item is always tax-exclusive base
    restoredPrice = trueBasePrice;
    itemIsIncl = false;
  } else {
    // In Inclusive View:
    // If product is inherently tax-exclusive (e.g. INCL unchecked in catalog or stored exclusive)
    if (realProduct.isIncl === false) {
      restoredPrice = trueBasePrice;
      itemIsIncl = false;
    } else {
      restoredPrice = trueGrossPrice;
      itemIsIncl = true;
    }
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
      if (itemIsIncl && activeVatFraction > 0) {
        // Extras saved via orderPayloadMapper are tax-exclusive
        restoredExtraPrice = roundCalc(rawExtraPrice * (1 + activeVatFraction), 4);
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

  // When prices are inclusive, detail.discAmount stored via orderPayloadMapper is tax-exclusive base.
  // Restore discountValue to gross inclusive so calculateLineItem does not divide by (1 + vatRate) a second time.
  if (discountType === "amount" && itemIsIncl && activeVatFraction > 0 && (isStoredTaxExclusive || restoredPrice > rawPrice) && discountValue > 0) {
    discountValue = roundCalc(discountValue * (1 + activeVatFraction), 4);
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
    })
  );
};
