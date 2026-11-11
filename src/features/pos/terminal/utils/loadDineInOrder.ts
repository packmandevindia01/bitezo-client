/**
 * Dine-In table screen: load one saved order and map its lines to cart items (also caches the product
 * alternatives the cart needs). Moved out of DineInTableOrdersModal (2026-11-11, split of the window).
 */
import { orderApi } from "../../services/orderApi";
import { menuApi } from "../../services/menuApi";
import { alternativesCache } from "../hooks/usePosProducts";
import { getPriceView } from "./billing";
import { sortOrderDetailsBySequence } from "./orderSort";
import { checkOrderHasBillDiscount } from "./orderDiscountCheck";
import { mapOrderDetailsToCartItems } from "../mappers/orderDetailToCartMapper";
import { dedupeModifierRows } from "../components/modals/savedOrder/lineModifiers";

// Saved-order data from the API is untyped.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Loose = any;

export const loadDineInOrderForCart = async (
  orderId: number,
  { productCache, products }: { productCache: Record<number, Loose>; products?: Loose[] }
) => {
  const res = await orderApi.getOrderDetails(orderId, { orderType: "DineIn" });
  if (!res?.isSuccess || !res.data) throw new Error("Failed to fetch full order details");
  
  const fullOrder = res.data;
  const master = fullOrder.masterData || fullOrder;
  const details = sortOrderDetailsBySequence(fullOrder.detailsData || fullOrder.details || []);
  const modifiersData = fullOrder.modifiersData || fullOrder.modifiers || fullOrder.ModifiersData || fullOrder.Modifiers || [];

  // Ensure alternatives are fetched and cached for products in this order
  const safeOrderTypeId = master.orderTypeId || 1;
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

  // Backend SQL joins can repeat a modifier row — keep one per (line, modifier).
  const dedupedModifiers = dedupeModifierRows(modifiersData);

  const priceView = getPriceView();

  const masterDiscPer = Number(master.discPer ?? master.DiscPer ?? 0);
  const lineDiscountsSum = details.reduce((sum: number, d: any) => sum + Number(d.discAmount ?? d.DiscAmount ?? 0), 0);
  const resolvedDiscount = Number(master.discAmount ?? master.DiscAmount ?? master.discount ?? lineDiscountsSum);
  const netAmount = Number(master.netAmount ?? master.NetAmount ?? 0);

  const isBillComplimentary = Boolean(
    master.complimentaryStatus ||
    master.ComplimentaryStatus ||
    masterDiscPer === 100 ||
    (details.length > 0 && details.every((d: any) =>
      Boolean(d.complimentaryStatus || d.ComplimentaryStatus || Number(d.discPer ?? d.DiscPer ?? 0) === 100)
    )) ||
    (netAmount === 0 && resolvedDiscount > 0 && details.length > 0)
  );

  const hasLineItemDiscounts = lineDiscountsSum > 0;
  const isBillLevelDiscount =
    isBillComplimentary ||
    masterDiscPer > 0 ||
    (!hasLineItemDiscounts && resolvedDiscount > 0) ||
    (hasLineItemDiscounts && resolvedDiscount > lineDiscountsSum + 0.001) ||
    checkOrderHasBillDiscount({ master, details });

  const mappedItems = mapOrderDetailsToCartItems(details, dedupedModifiers, {
    productCache,
    priceView,
    masterDiscPer: isBillComplimentary ? 100 : masterDiscPer,
    isOrderBillDiscount: isBillLevelDiscount,
    orderType: 'DineIn',
    products,
  });

  return { master, mappedItems, fullOrder, isBillComplimentary, isBillLevelDiscount, masterDiscPer, resolvedDiscount, lineDiscountsSum };
};
