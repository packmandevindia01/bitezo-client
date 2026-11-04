/**
 * Saved orders are ALWAYS fetched with priceView=Exclusive (stored values, untouched).
 * If the caller wants the Inclusive view, it is produced here from each line's own stored rates.
 * See pricing/storedOrder.ts for why.
 */
import { getBillingConfig, getDiscountCalculation, getPriceView, getVatStatus } from "../terminal/utils/billing";
import { buildFallbackRates, isDineInOrderType, restoreBillDiscount, storedLineToCartPricing, toInclusiveView } from "../pricing";
import type { StoredLineRates } from "../pricing";

/** Query params for every saved-order request. sc/levy are intentionally NOT sent. */
export const STORED_ORDER_PARAMS = { priceView: "Exclusive" } as const;

/** Current-configuration rates — used only for lines whose saved rates cannot be derived. */
const fallbackRatesFor = (orderType?: string): StoredLineRates => {
  const cfg = getBillingConfig(orderType || "TakeOut");
  return buildFallbackRates({
    serviceCharge: isDineInOrderType(orderType) ? (cfg.serviceChargeRate || 0) * 100 : 0,
    levy: (cfg.levyRate || 0) * 100,
    vat: getVatStatus() ? (cfg.vatRate || 0) * 100 : 0,
  });
};

const convertOrderData = (data: any, view: "Inclusive" | "Exclusive") => {
  if (view !== "Inclusive" || !data || !Array.isArray(data.detailsData)) return data;
  const rawMaster = data.masterData || data.master || {};
  const master = Array.isArray(rawMaster) ? rawMaster[0] || {} : rawMaster;
  return toInclusiveView(data, fallbackRatesFor(master.orderType || master.orderTypeName));
};

/**
 * Apply the requested price view to an API body of shape `{ data: { masterData, detailsData, modifiersData } }`
 * (or to the data object itself).
 */
export const applyStoredOrderView = <T = any>(body: T, requestedView?: string): T => {
  const view = getPriceView(requestedView);
  if (!body || typeof body !== "object") return body;
  const b: any = body;
  if (b.data && typeof b.data === "object" && Array.isArray(b.data.detailsData)) {
    return { ...b, data: convertOrderData(b.data, view) };
  }
  if (Array.isArray(b.detailsData)) return convertOrderData(b, view);
  return body;
};

/**
 * Bill discount to load into the cart when editing a saved order.
 * Percentage restores (and 0) are kept as-is; fixed amounts are re-derived from the stored lines
 * so the edited cart reproduces the stored discount exactly (see pricing/restoreBillDiscount).
 */
export const resolveRecalledBillDiscount = (
  orderData: any,
  legacyValue: number,
  legacyType: "percentage" | "amount"
): { billDiscountValue: number; billDiscountType: "percentage" | "amount" } => {
  if (!(legacyValue > 0) || legacyType === "percentage") {
    return { billDiscountValue: legacyValue || 0, billDiscountType: legacyType };
  }
  const restored = restoreBillDiscount(orderData, getPriceView(), getDiscountCalculation());
  return restored
    ? { billDiscountValue: restored.value, billDiscountType: restored.type }
    : { billDiscountValue: legacyValue, billDiscountType: legacyType };
};

/**
 * Overwrite the PRICING fields of cart items loaded from a saved order with values derived exactly
 * from the stored line (see pricing/storedLineToCartPricing). Names, variants, modifiers and the
 * authoritative display values are left untouched.
 */
export const applyStoredPricingToCartItems = <T extends Record<string, any>>(
  order: any,
  cartItems: T[],
  options: { products?: any[]; productCache?: Record<string | number, any>; isBillDiscount: boolean; view?: "Inclusive" | "Exclusive" }
): T[] => {
  const view = options.view ?? getPriceView();
  const details: any[] = order?.detailsData || order?.details || [];
  const raw = order?.masterData || order?.master || {};
  const master = Array.isArray(raw) ? raw[0] || {} : raw;
  const fallbackRates = fallbackRatesFor(master.orderType || master.orderTypeName);
  const discountCalc = getDiscountCalculation();

  return cartItems.map((item, idx) => {
    const mapId = Number(item.mapId);
    const detail = details.find((d) => Number(d.mapId ?? d.MapId) === mapId && mapId > 0) ?? details[idx];
    if (!detail) return item;
    const master_ =
      (options.productCache && options.productCache[item.productId]) ||
      (options.products || []).find((p: any) => Number(p.id) === Number(item.productId));
    const productIsInclusive =
      master_?.isIncl === true || master_?.priceIsIncl === true
        ? true
        : master_?.isIncl === false || master_?.priceIsIncl === false
        ? false
        : item.product?.isIncl === true || item.isIncl === true;

    const p = storedLineToCartPricing(order, detail, view, {
      productIsInclusive,
      discountCalc,
      isBillDiscount: options.isBillDiscount,
      fallbackRates,
    });

    const extras = Array.isArray(item.extras)
      ? item.extras.map((ex: any, k: number) => ({
          ...ex,
          price: p.extraGrossById.get(Number(ex.id ?? ex.modifierId)) ?? p.extraGrossList[k] ?? ex.price,
        }))
      : item.extras;

    return {
      ...item,
      price: p.price,
      isIncl: p.isIncl,
      priceIsIncl: p.isIncl,
      basePrice: p.baseUnitPrice,
      exclusivePrice: p.baseUnitPrice,
      ...(p.savedVatRate !== null ? { savedVatRate: p.savedVatRate } : {}),
      extras,
      discountValue: p.discount ? p.discount.value : 0,
      discountType: p.discount ? p.discount.type : item.discountType,
      product: { ...(item.product || {}), price: p.price, isIncl: p.isIncl, priceIsIncl: p.isIncl },
    } as T;
  });
};
