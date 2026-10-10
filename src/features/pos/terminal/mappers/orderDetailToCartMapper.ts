import { roundCalc } from "../utils/billing";
import type { PosCartItem } from "../../types";
import { getModifierTypeNameById } from "../../services/menuApi";

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
    const targetName = detail.productName || detail.ProductName;
    if (productCache) {
      matchedProduct = Object.values(productCache).find((p: any) => p.name === targetName);
    }
    if (!matchedProduct && Array.isArray(products)) {
      matchedProduct = products.find((p: any) => p.name === targetName);
    }
    if (matchedProduct && !pId) {
      pId = matchedProduct.id;
    }
  }
  const realProduct = matchedProduct || {};

  // 2. Resolve Price View (Inclusive vs Exclusive)
  const resolvedPriceView: "Inclusive" | "Exclusive" =
    priceView ||
    (() => {
      try {
        const saved = localStorage.getItem("posConfigs");
        const full = saved ? JSON.parse(saved) : {};
        return full?.configs?.priceView === "Inclusive" ? "Inclusive" : "Exclusive";
      } catch {
        return "Exclusive";
      }
    })();

  // 3. Resolve Line Item Modifiers, Extras, and Messages
  const itemModifiers = modifiersData.filter((m: any) => {
    if (m.orderId && detail.orderId) {
      return m.mapId === detail.mapId && m.orderId === detail.orderId;
    }
    return m.mapId === detail.mapId;
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

  const resolvedVatValue =
    detailVatValue !== undefined && detailVatValue !== null
      ? Number(detailVatValue)
      : calculatedVatRatePercent !== undefined && calculatedVatRatePercent !== null
      ? Number(calculatedVatRatePercent)
      : realProduct.vatValue !== undefined && realProduct.vatValue !== null
      ? Number(realProduct.vatValue)
      : undefined;

  const activeVatFraction =
    resolvedVatValue !== undefined && resolvedVatValue > 0 ? resolvedVatValue / 100 : 0;

  // 5. Determine if this line should be VAT-inclusive
  const explicitDetailIsIncl =
    detail.isIncl ??
    detail.PriceIsIncl ??
    detail.priceIsIncl ??
    detail.isincl;

  let itemIsIncl: boolean;
  if (explicitDetailIsIncl !== undefined && explicitDetailIsIncl !== null) {
    itemIsIncl = Boolean(explicitDetailIsIncl);
  } else if (realProduct.isIncl !== undefined && realProduct.isIncl !== null) {
    itemIsIncl = Boolean(realProduct.isIncl);
  } else {
    itemIsIncl = resolvedPriceView === "Inclusive";
  }

  // 6. Restore Unit Price
  const lineBase = rawPrice * qty;
  const remainingBase = lineBase - rawDiscAmount;
  const isStoredTaxExclusive =
    rawVatAmt > 0.001 && Math.abs(rawNetAmt - (remainingBase + rawVatAmt)) < 0.02;
  const isStoredTaxInclusive =
    rawVatAmt > 0.001 && Math.abs(rawNetAmt - remainingBase) < 0.02;

  let restoredPrice = rawPrice;
  if (itemIsIncl) {
    // POS expects VAT-inclusive unit price
    if (isStoredTaxExclusive && activeVatFraction > 0) {
      if (rawNetAmt > 0 && qty > 0) {
        restoredPrice = roundCalc((rawNetAmt + rawDiscAmount) / qty, 4);
      } else {
        restoredPrice = roundCalc(rawPrice * (1 + activeVatFraction), 4);
      }
      // Snap to realProduct.price if catalog price is within 0.02 to avoid precision artifacts
      if (realProduct.price && Math.abs(realProduct.price - restoredPrice) < 0.02) {
        restoredPrice = realProduct.price;
      }
    } else if (!isStoredTaxInclusive && activeVatFraction > 0 && rawNetAmt > 0) {
      // Fallback check against net amount per unit
      const netPerUnit = (rawNetAmt + rawDiscAmount) / qty;
      if (Math.abs(netPerUnit - rawPrice * (1 + activeVatFraction)) < 0.02) {
        restoredPrice = roundCalc(netPerUnit, 4);
      }
    }
  } else {
    // POS expects tax-exclusive unit price
    if (isStoredTaxInclusive && activeVatFraction > 0) {
      restoredPrice = roundCalc(rawPrice / (1 + activeVatFraction), 4);
    }
  }

  // 7. Modifiers and Extras Mapping
  const extras = itemModifiers
    .filter(
      (m: any) =>
        (m.status || "").toLowerCase() === "extras" ||
        ((m.status || "") === "" && (m.price || 0) > 0)
    )
    .map((m: any) => {
      const rawExtraPrice = Number(m.price || m.amount || 0);
      let restoredExtraPrice = rawExtraPrice;
      if (itemIsIncl && activeVatFraction > 0) {
        // Extras saved via orderPayloadMapper are tax-exclusive
        restoredExtraPrice = roundCalc(rawExtraPrice * (1 + activeVatFraction), 4);
      }
      return {
        id: m.modifierId ?? m.id,
        name: m.modifierName || m.name || "",
        price: restoredExtraPrice,
        qty: m.qty || 1,
        typeId: m.typeId || 0,
      };
    });

  const modifiers = itemModifiers
    .filter(
      (m: any) =>
        (m.status || "").toLowerCase() === "modifier" ||
        ((m.status || "") === "" && (m.price || 0) <= 0)
    )
    .map((m: any) => ({
      id: m.modifierId ?? m.id,
      name: m.modifierName || m.name || "",
      qty: m.qty || 1,
      typeId: m.typeId || 0,
      typeName: m.typeName || m.modifierTypeName || m.typeNameEn || getModifierTypeNameById(m.typeId) || "",
      arabicName: m.arabicName || m.arabic || "",
    }));

  const messages = itemModifiers
    .filter((m: any) => (m.status || "").toLowerCase() === "message")
    .map((m: any) => ({
      id: m.modifierId ?? m.id,
      name: m.modifierName || m.name || "",
    }));

  // 8. Complimentary & Discount
  const isDetailComplimentary = Boolean(
    detail.complimentaryStatus ||
    detail.ComplimentaryStatus ||
    (detail.discPer && Number(detail.discPer) === 100)
  );

  const detailDiscPer =
    detail.discPer !== undefined && detail.discPer !== null
      ? Number(detail.discPer)
      : 0;

  // Determine if this detail's discount was purely inherited from an order-level bill discount
  const isFromBillDiscount = Boolean(
    (masterDiscPer !== undefined && masterDiscPer > 0 && Math.abs(detailDiscPer - masterDiscPer) < 0.01) ||
    (isOrderBillDiscount && (!masterDiscPer || masterDiscPer === 0))
  );

  let discountValue = 0;
  let discountType: "percentage" | "amount" = "percentage";

  if (isDetailComplimentary) {
    discountValue = 100;
    discountType = "percentage";
  } else if (!isFromBillDiscount) {
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

  const rawAlt =
    detail.variantName ||
    detail.altName ||
    detail.VariantName ||
    detail.AltName;

  const rawAltArabic =
    detail.variantArabic ||
    detail.altArabic ||
    detail.VariantArabic ||
    detail.AltArabic;

  return {
    uniqueId: `${pId}-variant-${Date.now()}-${idx}`,
    productId: pId,
    quantity: qty,
    price: restoredPrice,
    isIncl: itemIsIncl,
    discountValue,
    discountType,
    extras,
    modifiers,
    messages,
    isExisting: true,
    mapId: detail.mapId,
    originalQty: qty,
    variantName: rawAlt,
    variantArabic: rawAltArabic,
    vatValue: resolvedVatValue,
    product: {
      id: pId,
      name: detail.productName || detail.ProductName || realProduct.name || `Product #${pId}`,
      arabicName: detail.arabicName || detail.ArabicName || realProduct.arabicName,
      price: restoredPrice,
      categoryId: realProduct.categoryId || 1,
      unitId: detail.unitId || realProduct.unitId || 1,
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
