/**
 * Saved order → POS cart. ONE loader for every path that puts a saved order back into the cart
 * (Phase 2a, OPTIMIZATION_PLAN.md):
 *
 *   mode "settledEdit"   — Settled orders → Edit                    (was loadSettledOrderIntoCart)
 *   mode "recallEdit"    — Recall → Edit                            (was PosRecallDetailsModal.handleEditOrder)
 *   mode "recallSettle"  — Recall → Settle                          (was PosRecallDetailsModal.handleSettleOrder)
 *
 * The three copies were ~95 % identical and had drifted: the amount-bill-discount fix had to be made in
 * two of them, and Recall → Edit used a looser bill-discount rule ("any master discount = bill discount").
 * All modes now use the same rule (in practice the results match: checkOrderHasBillDiscount also flags a
 * master that carries the sum of item discounts — saved data cannot tell those apart).
 * The remaining mode differences are kept exactly as they were (sale id, settled flag, extra fields).
 *
 * `buildSavedOrderLoad` is PURE apart from reading the POS settings (price view / VAT / rates) — it can
 * be unit-tested; `dispatchSavedOrderLoad` applies the result to the store.
 */
import { sortOrderDetailsBySequence } from "./orderSort";
import { applyStoredPricingToCartItems, resolveRecalledBillDiscount } from "../../services/storedOrderView";
import { deriveOrderChargeRatesFromMaster, storedOrderFooter } from "../../pricing";
import { mapOrderDetailsToCartItems } from "../mappers/orderDetailToCartMapper";
import { getBillingConfig, getVatStatus, roundCalc, getPriceView } from "./billing";
import { buildPrintPricing } from "../../utils/printPricing";
import { checkOrderHasBillDiscount } from "./orderDiscountCheck";
import { getCachedExtras } from "../../services/menuApi";
import { loadRecalledOrder, setDeliveryDetails, setTableNo, setSelectedCustomer, fallbackOrderTypeByName } from "../store/posSlice";
import type { AppDispatch } from "../../../../app/store";

export type SavedOrderLoadMode = "settledEdit" | "recallEdit" | "recallSettle";

export interface SavedOrderLoadOptions {
  mode: SavedOrderLoadMode;
  orderId: number;
  products?: any[];
  productCache?: Record<string | number, any>;
  /** Modifier types for names (recall screen has them loaded). */
  modifierTypes?: any[];
  /** Extras master (defaults to the cached menu extras). */
  allExtras?: any[];
  /** Extra order-type candidates when the master has none (recall screen: list row, details text). */
  orderTypeHints?: (string | null | undefined)[];
}

export interface SavedOrderLoad {
  /** Payload for `loadRecalledOrder`. */
  payload: Parameters<typeof loadRecalledOrder>[0];
  /** Delivery details to restore (Delivery orders only). */
  deliveryDetails: Parameters<typeof setDeliveryDetails>[0] | null;
  /** Settled edit also restores the table number and the selected customer. */
  tableNo: string | null;
  selectedCustomer: Parameters<typeof setSelectedCustomer>[0] | null;
  orderTypeName: string;
  /** Stored total (what the customer pays) — recall settle opens the payment with it. */
  netAmount: number;
  prevUpdatedAt?: string;
}

const ORDER_TYPE_ID_TO_NAME: Record<number, string> = {
  1: "DineIn", 2: "TakeOut", 3: "DriveThru", 4: "Delivery", 5: "Providers", 6: "Coming",
};

const masterOf = (orderData: any) => {
  const raw = orderData?.masterData || orderData?.master || orderData;
  return Array.isArray(raw) ? raw[0] || {} : raw || {};
};

/** Backend SQL joins can repeat a modifier row once per detail — keep one per (mapId, modifierId). */
const dedupeModifiers = (orderData: any): any[] => {
  const raw = orderData?.modifiersData || orderData?.modifiers || orderData?.ModifiersData || orderData?.Modifiers ||
    orderData?.data?.modifiersData || orderData?.data?.modifiers || [];
  const seen = new Set<string>();
  return raw.filter((m: any) => {
    const key = `${m.mapId ?? m.MapId ?? m.mapID ?? 0}-${m.modifierId ?? m.ModifierId ?? m.id ?? m.Id ?? 0}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const pickDiscountAmount = (master: any): number =>
  Number(
    master.discAmount ?? master.DiscAmount ?? master.discAmt ?? master.DiscAmt ?? master.discount ?? master.Discount ??
    master.discountAmount ?? master.DiscountAmount ?? master.billDiscount ?? master.BillDiscount ?? master.billDiscountValue ?? 0
  );

/** Settled edit: the sale to update (rich lookup, falls back to the order id). */
const resolveSettledSaleId = (master: any, orderData: any, orderId: number): number | null => {
  const rawVoucher = master.saleId || master.voucherNo || master.invoiceNo || master.voucherNumber || master.saleNo ||
    orderData?.saleId || orderData?.voucherNo;
  const parsed = rawVoucher ? parseInt(String(rawVoucher).replace(/\D/g, ""), 10) : NaN;
  let saleId: number | null =
    typeof master.saleId === "number" && master.saleId > 0 ? master.saleId
      : typeof orderData?.saleId === "number" && orderData.saleId > 0 ? orderData.saleId
      : !isNaN(parsed) && parsed > 0 ? parsed
      : null;
  if (!saleId) {
    const detailsStr = orderData?.details || master.details || "";
    if (typeof detailsStr === "string") {
      const m = detailsStr.match(/VchNo\s*:\s*(\d+)/i);
      if (m && m[1]) saleId = parseInt(m[1], 10);
    }
  }
  return saleId || orderId || null;
};

/** Recall: an order already settled carries a voucher number. */
const resolveRecallSaleId = (master: any): number | null => {
  const raw = master.voucherNo ? String(master.voucherNo).replace(/\D/g, "") : "";
  const parsed = raw ? parseInt(raw, 10) : NaN;
  return !isNaN(parsed) ? parsed : null;
};

const callBackOf = (m: any) =>
  m.callBack || m.callback || m.callBackNo || m.callbackNo || m.callBackNumber || m.callbackNumber;

export const buildSavedOrderLoad = (orderData: any, options: SavedOrderLoadOptions): SavedOrderLoad => {
  const { mode, orderId, products = [], productCache = {}, modifierTypes, orderTypeHints = [] } = options;
  const allExtras = options.allExtras ?? getCachedExtras();
  const master = masterOf(orderData);
  const details = sortOrderDetailsBySequence(orderData?.detailsData || orderData?.details || []);
  const modifiersData = dedupeModifiers(orderData);

  // ── Order type ─────────────────────────────────────────────────────────────
  const typeCandidate =
    master.orderType || master.orderTypeName ||
    (master.orderTypeId ? ORDER_TYPE_ID_TO_NAME[Number(master.orderTypeId)] : "") ||
    orderTypeHints.find((h) => !!h) ||
    (mode === "settledEdit" ? "DineIn" : "TakeOut");
  const resolvedType = fallbackOrderTypeByName(String(typeCandidate));
  const orderTypeName = resolvedType.orderType;
  const orderTypeId = master.orderTypeId ? Number(master.orderTypeId) : resolvedType.orderTypeId;

  // ── Sale / settled flag ────────────────────────────────────────────────────
  const saleId = mode === "settledEdit" ? resolveSettledSaleId(master, orderData, orderId) : resolveRecallSaleId(master);
  const isSettledEdit = mode === "settledEdit" ? true : saleId !== null;

  const rawUpdatedAt = master.updatedAt || master.updated_at || master.prevUpdatedAt || master.createdAt || master.created_at || master.voucherDate;
  const prevUpdatedAt = rawUpdatedAt ? String(rawUpdatedAt) : undefined;

  // ── Discounts ──────────────────────────────────────────────────────────────
  const netAmountStored = Number(master.netAmount ?? master.NetAmount ?? orderData?.netAmount ?? orderData?.NetAmount ?? 0);
  const masterDiscPer = Number(master.discPer ?? master.DiscPer ?? 0);
  let lineDiscountsSum = 0;
  details.forEach((d: any) => { lineDiscountsSum += Number(d.discAmount ?? d.DiscAmount ?? 0); });
  const masterDiscAmount = pickDiscountAmount(master);
  const resolvedDiscount = masterDiscAmount > 0 ? masterDiscAmount : lineDiscountsSum > 0 ? roundCalc(lineDiscountsSum) : 0;

  const isBillComplimentary = Boolean(
    master.complimentaryStatus || master.ComplimentaryStatus || masterDiscPer === 100 ||
    (details.length > 0 && details.every((d: any) =>
      Boolean(d.complimentaryStatus || d.ComplimentaryStatus || Number(d.discPer ?? d.DiscPer ?? 0) === 100))) ||
    (netAmountStored === 0 && resolvedDiscount > 0 && details.length > 0)
  );

  // One rule for every mode (Recall → Edit used "any master discount = bill discount").
  const hasLineItemDiscounts = lineDiscountsSum > 0.001;
  const isBillLevelDiscount = Boolean(
    isBillComplimentary ||
    masterDiscPer > 0 ||
    (!hasLineItemDiscounts && masterDiscAmount > 0.001) ||
    (hasLineItemDiscounts && masterDiscAmount > lineDiscountsSum + 0.05) ||
    checkOrderHasBillDiscount(orderData) ||
    checkOrderHasBillDiscount({ master, details })
  );
  const resolvedBillDiscType: "percentage" | "amount" = isBillComplimentary || masterDiscPer > 0 ? "percentage" : "amount";

  // ── Lines ──────────────────────────────────────────────────────────────────
  const priceView = getPriceView();
  const isTaxInclusive = priceView === "Inclusive";

  const unifiedPricing = buildPrintPricing(orderData, {
    dataView: priceView, printPrice: priceView, orderType: orderTypeName, modifierTypes, allExtras, isBillDiscount: isBillLevelDiscount, products, productCache,
  });
  const rawMappedCartItems = mapOrderDetailsToCartItems(details, modifiersData, {
    products, productCache, priceView, allExtras,
    masterDiscPer: isBillComplimentary ? 100 : masterDiscPer,
    isOrderBillDiscount: isBillLevelDiscount,
    orderType: orderTypeName,
  });

  const cfg = getBillingConfig(orderTypeName);
  const rawVatRate = cfg.vatRate > 0 ? (cfg.vatRate > 1 ? cfg.vatRate / 100 : cfg.vatRate) : 0.10;
  const activeVat = getVatStatus() ? rawVatRate : 0;
  const scR = (orderTypeName || "").toLowerCase().includes("dine") ? (cfg.serviceChargeRate ?? 0) : 0;
  const levyR = cfg.levyRate ?? 0;
  const factor = activeVat > 0 || levyR > 0 || scR > 0 ? roundCalc((1 + activeVat) * (1 + levyR) * (1 + scR), 4) : 1;

  const mappedCartItems = rawMappedCartItems.map((cartItem, idx) => {
    const uLine = unifiedPricing.lines[idx] || unifiedPricing.lines.find(
      (l) => (l.mapId !== undefined && cartItem.mapId !== undefined && Number(l.mapId) === Number(cartItem.mapId)) ||
             (l.productId !== undefined && cartItem.productId !== undefined && Number(l.productId) === Number(cartItem.productId))
    );
    const matchedProd = (productCache && productCache[cartItem.productId]) ||
      (products && products.find((p: any) => p.id === cartItem.productId)) || cartItem.product;
    const isProductInclusiveTag = Boolean(
      (matchedProd as any)?.isIncl === true || (matchedProd as any)?.priceIsIncl === true ||
      (matchedProd as any)?.isInclusiveTax === true || (matchedProd as any)?.PriceIsIncl === true ||
      (matchedProd as any)?.IsIncl === true || cartItem.isIncl === true || (cartItem as any).priceIsIncl === true ||
      uLine?.isProductMasterInclusive === true ||
      (uLine && uLine.inclusiveRate > 0 && Math.abs(uLine.inclusiveRate - Number(cartItem.price || 0)) < 0.05)
    );
    const detailItem = details[idx] || details.find((d: any) =>
      (d.mapId !== undefined && cartItem.mapId !== undefined && Number(d.mapId) === Number(cartItem.mapId)) ||
      (d.productId !== undefined && cartItem.productId !== undefined && Number(d.productId || d.ProductId) === Number(cartItem.productId))
    );
    const rawDetailPrice = Number(detailItem?.price ?? detailItem?.Price ?? 0);
    const rawDetailAmount = Number(detailItem?.amount ?? detailItem?.Amount ?? 0);
    const rawDetailDisc = Number(detailItem?.discAmount ?? detailItem?.DiscAmount ?? cartItem.discountValue ?? 0);
    const productBase = {
      ...(cartItem.product || {}),
      id: cartItem.productId,
      name: cartItem.product?.name || (cartItem as any).name || (cartItem as any).productName || `Product #${cartItem.productId}`,
      categoryId: cartItem.product?.categoryId || 1,
    };

    // Inclusive view + inclusive product: the saved line value goes to the cart as-is (exclusive behind the scenes).
    if (isTaxInclusive && isProductInclusiveTag) {
      const recallPrice = rawDetailPrice > 0
        ? roundCalc(rawDetailPrice, 3)
        : (uLine ? uLine.getRate(true) : Number((cartItem as any).catalogPrice ?? cartItem.price ?? 0));
      const exclBasePrice = roundCalc(recallPrice / (factor > 0 ? factor : 1), 4);
      const authOrigTotal = rawDetailAmount > 0 ? roundCalc(rawDetailAmount, 3) : recallPrice * (cartItem.quantity || 1);
      const authDiscount = roundCalc(rawDetailDisc, 3);
      // Bill discount is shown in the footer only (same as the recall / settled screen rows).
      const authLineTotal = isBillLevelDiscount ? authOrigTotal : roundCalc(Math.max(0, authOrigTotal - authDiscount), 3);
      return {
        ...cartItem,
        isIncl: true, priceIsIncl: true, price: recallPrice, basePrice: exclBasePrice, exclusivePrice: exclBasePrice,
        authoritativePrice: recallPrice, authoritativeLineTotal: authLineTotal, authoritativeOriginalLineTotal: authOrigTotal,
        authoritativeDiscount: isBillLevelDiscount ? 0 : authDiscount, authoritativeVatAmount: uLine?.vatAmount,
        lineTotal: authLineTotal, originalLineTotal: authOrigTotal,
        product: { ...productBase, price: recallPrice, isIncl: true, priceIsIncl: true },
      };
    }

    if (uLine) {
      const authRate = isTaxInclusive && rawDetailPrice > 0 ? roundCalc(rawDetailPrice, 3) : uLine.getRate(isTaxInclusive);
      const authOrigTotal = isTaxInclusive && rawDetailAmount > 0
        ? roundCalc(rawDetailAmount, 3)
        : (isTaxInclusive ? uLine.inclusiveGross : uLine.exclusiveGross);
      const authDiscount = isTaxInclusive && rawDetailDisc > 0 ? roundCalc(rawDetailDisc, 3) : uLine.getDiscount(isTaxInclusive);
      const authLineTotal = isBillLevelDiscount ? authOrigTotal : roundCalc(Math.max(0, authOrigTotal - authDiscount), 3);
      const lineIsIncl = isTaxInclusive ? true : (uLine.isProductMasterInclusive !== undefined ? uLine.isProductMasterInclusive : cartItem.isIncl);
      return {
        ...cartItem,
        price: authRate, isIncl: lineIsIncl, priceIsIncl: lineIsIncl,
        authoritativePrice: authRate, authoritativeLineTotal: authLineTotal, authoritativeOriginalLineTotal: authOrigTotal,
        authoritativeDiscount: isBillLevelDiscount ? 0 : authDiscount, authoritativeVatAmount: uLine.vatAmount,
        lineTotal: authLineTotal, originalLineTotal: authOrigTotal,
        product: { ...productBase, price: authRate, isIncl: lineIsIncl, priceIsIncl: lineIsIncl },
      };
    }
    return cartItem;
  });

  // ── Footer = THE stored-order footer (identical to the recall / settled screen) ──
  const footer = storedOrderFooter(orderData, priceView);

  const resolvedBillDiscVal = isBillComplimentary
    ? 100
    : masterDiscPer > 0
    ? masterDiscPer
    : isBillLevelDiscount
    // Amount bill discount: pass the saved value; resolveRecalledBillDiscount rebuilds it from the saved lines.
    ? (masterDiscAmount > 0.001 ? masterDiscAmount : roundCalc(lineDiscountsSum))
    : 0;

  const payload: any = {
    editingOrderRates: deriveOrderChargeRatesFromMaster(orderData, priceView),
    editingOrderId: orderId,
    editingSaleId: saleId,
    isSettledEdit,
    cartItems: applyStoredPricingToCartItems(orderData, mappedCartItems, {
      products, productCache, isBillDiscount: Boolean(isBillLevelDiscount), view: priceView,
    }),
    orderTypeId,
    orderTypeName,
    // Provider of a saved provider order, so the POS shows that provider's own menu (selectMenuOrderTypeId).
    providerId: Number(master.providerId ?? master.ProviderId ?? orderData?.providerId) || null,
    customerId: master.customerId || 1,
    addressId: master.addressId || 0,
    ...resolveRecalledBillDiscount(orderData, Number(resolvedBillDiscVal || 0), resolvedBillDiscType),
    sectionId: master.sectionId || 0,
    tableId: master.tableId || 0,
    tableNo: master.tableNo || master.tableName || (master.tableId ? String(master.tableId) : ""),
    guestNo: master.guestNo || master.guests || 0,
    deliveryCharge: master.deliveryCharge !== undefined ? Number(master.deliveryCharge) : undefined,
    contactNo: master.mobileNo || master.contactNo,
    callBack: callBackOf(master),
    note: master.note,
    change: master.change || master.keepChanges,
    isComing: master.isComing,
    comingTime: master.comingTime,
    vehicleCustomerName: master.vehicleCustomerName,
    vehicleNo: master.vehicleNo,
    isMissedCall: Boolean(master.missedCall ?? master.isMissedCall),
    authoritativeSubtotal: footer.subTotal,
    authoritativeDiscount: footer.discount,
    authoritativeTax: footer.vatAmount,
    authoritativeNetAmount: footer.netAmount,
    authoritativeNetValue: footer.netValue,
    prevUpdatedAt,
  };
  if (mode === "recallSettle") {
    // Recall → Settle opens the payment directly: delivery fields go straight into the order state.
    Object.assign(payload, {
      deliveryCustomerName: master.deliveryCustomerName || master.vehicleCustomerName || master.customerName,
      flatNo: master.flatNo || master.flat || master.flatNumber || "",
      buildingNo: master.buildingNo || master.building || master.buildingNumber || "",
      blockNo: master.blockNo || master.block || master.blockNumber || "",
      roadNo: master.roadNo || master.road || master.roadNumber || master.street || "",
      area: master.area || master.areaName || "",
      isSettling: true,
    });
  } else {
    payload.authoritativeCharges = footer.charges;
  }

  const deliveryDetails = orderTypeName.toLowerCase().includes("delivery")
    ? {
        customerName: master.deliveryCustomerName || master.vehicleCustomerName || master.customerName || "",
        contactNo: master.mobileNo || master.contactNo || "",
        callBack: callBackOf(master) || "",
        flatNo: master.flatNo || master.flat || master.flatNumber || "",
        buildingNo: master.buildingNo || master.building || master.buildingNumber || "",
        roadNo: master.roadNo || master.road || master.roadNumber || master.street || "",
        blockNo: master.blockNo || master.block || master.blockNumber || "",
        area: master.area || master.areaName || "",
        note: master.note || "",
        addressId: master.addressId || 0,
        isMissedCall: Boolean(master.missedCall ?? master.isMissedCall),
        isComing: Boolean(master.isComing),
        change: master.change ?? master.keepChanges ?? orderData?.change ?? orderData?.keepChanges ?? "",
      }
    : null;

  const settled = mode === "settledEdit";
  return {
    payload,
    deliveryDetails,
    tableNo: settled && master.tableNo ? String(master.tableNo) : null,
    selectedCustomer: settled && master.customerName && master.customerId && master.customerId !== 1
      ? { id: master.customerId, name: master.customerName, mobileNo: master.mobileNo || master.contactNo }
      : null,
    orderTypeName,
    netAmount: footer.netAmount,
    prevUpdatedAt,
  };
};

/** Apply a built load to the store (and remember the order's last update time for the update call). */
export const dispatchSavedOrderLoad = (load: SavedOrderLoad, dispatch: AppDispatch, orderId: number): void => {
  if (load.prevUpdatedAt && orderId) {
    sessionStorage.setItem(`order_prevUpdatedAt_${orderId}`, load.prevUpdatedAt);
  }
  dispatch(loadRecalledOrder(load.payload));
  if (load.tableNo) dispatch(setTableNo(load.tableNo));
  if (load.selectedCustomer) dispatch(setSelectedCustomer(load.selectedCustomer as any));
  if (load.deliveryDetails) dispatch(setDeliveryDetails(load.deliveryDetails as any));
};
