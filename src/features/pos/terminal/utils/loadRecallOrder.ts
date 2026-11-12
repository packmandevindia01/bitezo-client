/**
 * Loads one saved order the way the Recall preview shows it (moved out of PosRecallDetailsModal 2026-11-12 so the
 * Dine-In table cards show the very same data): order details in the current price view, alternative / variant
 * names and missing product names filled in. Null when the reply has no order.
 */
import { orderApi } from "../../services/orderApi";
import { menuApi } from "../../services/menuApi";
import { alternativesCache } from "../hooks/usePosProducts";
import { getPriceView } from "./billing";

const orderTypeNameMap: Record<string, number> = {
  DineIn: 1,
  TakeOut: 2,
  DriveThru: 3,
  Delivery: 4,
  Providers: 5,
  Coming: 6,
};

export interface RecallOrderLoadOptions {
  /** Order type parsed from the Recall list text, sent as a hint. */
  orderTypeHint?: string;
  productCache: Record<number, { name?: string; arabicName?: string } | undefined>;
  products?: ReadonlyArray<{ id: number; name?: string; arabicName?: string }>;
}

export const fetchRecallOrderData = async (targetId: number, { orderTypeHint, productCache, products }: RecallOrderLoadOptions) => {
  const currentPriceView = getPriceView();
  const parsedType = orderTypeHint;
  const response = await orderApi.getOrderDetails(targetId, {
    priceView: currentPriceView,
    orderType: parsedType,
  });
  const orderData = response?.data || response;
  const rawMaster = orderData?.masterData || orderData?.master || orderData;
  const master = Array.isArray(rawMaster) ? (rawMaster[0] || {}) : (rawMaster || {});
  const details = orderData?.detailsData || orderData?.details || [];

  if (orderData && ((Array.isArray(details) && details.length > 0) || (master && (master.orderNo || master.orderId || master.ticketNo)))) {
    console.log("ORDER DETAILS RAW RESPONSE:", JSON.stringify(orderData, null, 2));
    const safeOrderTypeId = master.orderTypeId || (master.orderType && orderTypeNameMap[master.orderType]) || 1;

    // Ensure alternatives are fetched and cached for products in this order
    const pIds = Array.from(new Set(details.map((d: any) => d.productId || d.ProductId || d.itemId || d.ItemId).filter(Boolean)));
    await Promise.all(
      pIds.map(async (pId: any) => {
        const key = `${pId}-${safeOrderTypeId}`;
        if (!alternativesCache[key]) {
          try {
            const alts = await menuApi.getAlternatives(Number(pId), safeOrderTypeId);
            if (alts && alts.length > 0) {
              alternativesCache[key] = alts;
            }
          } catch {}
        }
      })
    );

    // Enrich detail rows with accurate alternative / variant names
    details.forEach((d: any) => {
      const pId = d.productId || d.ProductId || d.itemId || d.ItemId;
      const uId = d.unitId ?? d.UnitId;
      const altsKey = `${pId}-${safeOrderTypeId}`;
      const alts = alternativesCache[altsKey] || [];
      const matchedAlt = alts.find((a: any) => Number(a.unitId ?? a.UnitId ?? a.id ?? a.Id) === Number(uId));

      if (matchedAlt) {
        d.altName = matchedAlt.altName;
        d.variantName = matchedAlt.altName;
        d.variantArabic = matchedAlt.altArabic;
        d.unitName = matchedAlt.altName;
      } else if (d.altName || d.variantName) {
        d.variantName = d.altName || d.variantName;
        d.unitName = d.variantName;
      }

      if (!d.productName && !d.ProductName) {
        const numPid = Number(pId);
        const cachedProd = productCache[numPid] || (products && products.find((p: any) => p.id === numPid));
        if (cachedProd) {
          d.productName = cachedProd.name;
          d.arabicName = cachedProd.arabicName;
        }
      }
    });
    return orderData;
  }
  return null;
};
