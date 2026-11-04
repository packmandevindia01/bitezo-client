import { sortOrderDetailsBySequence } from "./orderSort";
import { applyStoredPricingToCartItems } from "../../services/storedOrderView";
import { deriveOrderChargeRatesFromMaster } from "../../pricing";
import { storedOrderFooter } from "../../pricing";
import { resolveRecalledBillDiscount } from "../../services/storedOrderView";
import { mapOrderDetailsToCartItems } from "../mappers/orderDetailToCartMapper";
import { getBillingConfig, getVatStatus, roundCalc, getPriceView } from "./billing";
import { buildUnifiedOrderPricing } from "../../utils/orderPricing";
import { checkOrderHasBillDiscount } from "./orderDiscountCheck";
import { getCachedExtras } from "../../services/menuApi";
import {
  loadRecalledOrder,
  setDeliveryDetails,
  setTableNo,
  setSelectedCustomer,
} from "../store/posSlice";
import type { AppDispatch } from "../../../../app/store";

export interface LoadSettledOrderIntoCartParams {
  orderId: number;
  orderData: any;
  dispatch: AppDispatch;
  products?: any[];
  productCache?: Record<string | number, any>;
  showToast: (msg: string, type?: "success" | "error" | "warning" | "info") => void;
  onEditSuccess?: () => void;
}

/**
 * Loads a settled order's details into the active POS cart and Redux state.
 * Marks the session as `isSettledEdit: true` and restores the editing saleId
 * so any updates or re-settlement will target the existing transaction.
 */
export const loadSettledOrderIntoCart = ({
  orderId,
  orderData,
  dispatch,
  products = [],
  productCache = {},
  showToast,
  onEditSuccess,
}: LoadSettledOrderIntoCartParams): boolean => {
  if (!orderData) {
    showToast("No order data available to edit", "error");
    return false;
  }

  try {
    const rawMaster = orderData.masterData || orderData.master || orderData;
    const master = Array.isArray(rawMaster) ? (rawMaster[0] || {}) : (rawMaster || {});
    const details = sortOrderDetailsBySequence(
      orderData.detailsData || orderData.details || []
    );

    const rawModifiers = orderData.modifiersData || orderData.modifiers || orderData.ModifiersData || orderData.Modifiers || [];
    const seen = new Set<string>();
    const modifiersData = rawModifiers.filter((m: any) => {
      const mMapId = m.mapId ?? m.MapId ?? m.mapID ?? 0;
      const mModId = m.modifierId ?? m.ModifierId ?? m.id ?? m.Id ?? 0;
      const key = `${mMapId}-${mModId}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    const priceView = getPriceView();

    const orderTypeNameMap: Record<string, number> = {
      DineIn: 1,
      TakeOut: 2,
      DriveThru: 3,
      Delivery: 4,
      Providers: 5,
      Coming: 6,
    };

    const orderTypeIdToNameMap: Record<number, string> = {
      1: "DineIn",
      2: "TakeOut",
      3: "DriveThru",
      4: "Delivery",
      5: "Providers",
      6: "Coming",
    };

    const orderTypeName =
      master.orderType ||
      master.orderTypeName ||
      (master.orderTypeId ? orderTypeIdToNameMap[Number(master.orderTypeId)] : "") ||
      "DineIn";
    const orderTypeId =
      master.orderTypeId ||
      orderTypeNameMap[orderTypeName] ||
      1;

    // Resolve saleId
    const rawVoucher =
      master.saleId ||
      master.voucherNo ||
      master.invoiceNo ||
      master.voucherNumber ||
      master.saleNo ||
      orderData.saleId ||
      orderData.voucherNo;
    const parsedVoucher = rawVoucher
      ? parseInt(String(rawVoucher).replace(/\D/g, ""), 10)
      : NaN;
    let finalSaleId =
      typeof master.saleId === "number" && master.saleId > 0
        ? master.saleId
        : typeof orderData.saleId === "number" && orderData.saleId > 0
        ? orderData.saleId
        : !isNaN(parsedVoucher) && parsedVoucher > 0
        ? parsedVoucher
        : null;

    if (!finalSaleId) {
      const detailsStr = orderData.details || master.details || "";
      if (typeof detailsStr === "string") {
        const vchMatch = detailsStr.match(/VchNo\s*:\s*(\d+)/i);
        if (vchMatch && vchMatch[1]) {
          finalSaleId = parseInt(vchMatch[1], 10);
        }
      }
    }

    const resolvedSaleId = finalSaleId || orderId || null;

    const rawUpdatedAt =
      master.updatedAt ||
      master.updated_at ||
      master.prevUpdatedAt ||
      master.createdAt ||
      master.created_at ||
      master.voucherDate;
    const prevUpdatedAt = rawUpdatedAt ? String(rawUpdatedAt) : undefined;
    if (prevUpdatedAt && orderId) {
      sessionStorage.setItem(`order_prevUpdatedAt_${orderId}`, prevUpdatedAt);
    }

    const netAmount = Number(master.netAmount ?? master.NetAmount ?? orderData?.netAmount ?? orderData?.NetAmount ?? 0);
    const masterDiscPer = Number(master.discPer ?? master.DiscPer ?? 0);

    let detailsVatSum = 0;
    let lineDiscountsSum = 0;
    details.forEach((d: any) => {
      detailsVatSum += Number(d.vatAmount ?? d.VatAmount ?? 0);
      lineDiscountsSum += Number(d.discAmount ?? d.DiscAmount ?? 0);
    });

    let resolvedVatAmount = Number(
      master.vatAmount ?? master.VatAmount ?? master.vatAmt ?? master.taxAmount ?? 0
    );
    if (resolvedVatAmount <= 0 && detailsVatSum > 0) {
      resolvedVatAmount = detailsVatSum;
    }

    let resolvedDiscount = Number(
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
      0
    );
    if (resolvedDiscount <= 0 && lineDiscountsSum > 0) {
      resolvedDiscount = roundCalc(lineDiscountsSum);
    }

    const isBillComplimentary = Boolean(
      master.complimentaryStatus ||
      master.ComplimentaryStatus ||
      masterDiscPer === 100 ||
      (details.length > 0 && details.every((d: any) =>
        Boolean(d.complimentaryStatus || d.ComplimentaryStatus || Number(d.discPer ?? d.DiscPer ?? 0) === 100)
      )) ||
      (netAmount === 0 && resolvedDiscount > 0 && details.length > 0)
    );

    const masterDiscAmount = Number(
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
      0
    );

    const hasLineItemDiscounts = lineDiscountsSum > 0.001;
    const isBillLevelDiscount =
      isBillComplimentary ||
      masterDiscPer > 0 ||
      (!hasLineItemDiscounts && masterDiscAmount > 0.001) ||
      (hasLineItemDiscounts && masterDiscAmount > lineDiscountsSum + 0.05) ||
      checkOrderHasBillDiscount(orderData) ||
      checkOrderHasBillDiscount({ master, details });

    const resolvedBillDiscType: "percentage" | "amount" =
      isBillComplimentary || masterDiscPer > 0
        ? "percentage"
        : "amount";

    const allExtras = getCachedExtras();
    const isTaxInclusive = priceView === "Inclusive";

    const unifiedPricing = buildUnifiedOrderPricing(orderData, {
      orderType: orderTypeName,
      priceView,
      allExtras,
      isBillDiscount: isBillLevelDiscount,
      products,
      productCache,
    });

    const rawMappedCartItems = mapOrderDetailsToCartItems(details, modifiersData, {
      products,
      productCache,
      priceView: priceView,
      allExtras,
      masterDiscPer: isBillComplimentary ? 100 : masterDiscPer,
      isOrderBillDiscount: isBillLevelDiscount,
      orderType: orderTypeName,
    });

    const orderTypeBillingConfig = getBillingConfig(orderTypeName);
    const isVatActive = getVatStatus();
    const rawVatRate = orderTypeBillingConfig.vatRate > 0 ? (orderTypeBillingConfig.vatRate > 1 ? orderTypeBillingConfig.vatRate / 100 : orderTypeBillingConfig.vatRate) : 0.10;
    const activeVat = isVatActive ? rawVatRate : 0;
    const isDine = (orderTypeName || "").toLowerCase().includes("dine");
    const scR = isDine ? (orderTypeBillingConfig.serviceChargeRate ?? 0) : 0;
    const levyR = orderTypeBillingConfig.levyRate ?? 0;
    const factor = (activeVat > 0 || levyR > 0 || scR > 0)
      ? roundCalc((1 + activeVat) * (1 + levyR) * (1 + scR), 4)
      : 1;

    const mappedCartItems = rawMappedCartItems.map((cartItem, idx) => {
      const uLine = unifiedPricing.lines[idx] || unifiedPricing.lines.find(
        (l) => (l.mapId !== undefined && cartItem.mapId !== undefined && Number(l.mapId) === Number(cartItem.mapId)) ||
               (l.productId !== undefined && cartItem.productId !== undefined && Number(l.productId) === Number(cartItem.productId))
      );

      // Condition 1: Check price view is inclusive
      const isPriceViewInclusive = priceView === "Inclusive";

      // Condition 2: Check product is inclusive tag in Product Master
      const matchedProd = (productCache && productCache[cartItem.productId]) ||
        (products && products.find((p: any) => p.id === cartItem.productId)) ||
        cartItem.product;

      const isProductInclusiveTag = Boolean(
        (matchedProd as any)?.isIncl === true ||
        (matchedProd as any)?.priceIsIncl === true ||
        (matchedProd as any)?.isInclusiveTax === true ||
        (matchedProd as any)?.PriceIsIncl === true ||
        (matchedProd as any)?.IsIncl === true ||
        cartItem.isIncl === true ||
        (cartItem as any).priceIsIncl === true ||
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

      // If both conditions are correct: whatever the value in the product field in settled data that must go to the cart,
      // and behind the scenes exclusive.
      if (isPriceViewInclusive && isProductInclusiveTag) {
        const recallPrice = rawDetailPrice > 0 
          ? roundCalc(rawDetailPrice, 3) 
          : (uLine ? uLine.getRate(true) : Number((cartItem as any).catalogPrice ?? cartItem.price ?? 0));
        const combinedFactor = factor > 0 ? factor : 1;
        const exclBasePrice = roundCalc(recallPrice / combinedFactor, 4);

        const authOrigTotal = rawDetailAmount > 0 ? roundCalc(rawDetailAmount, 3) : (recallPrice * (cartItem.quantity || 1));
        const authDiscount = roundCalc(rawDetailDisc, 3);
        // Bill discount is shown in the footer only (same as the recall/settled screen rows).
          const authLineTotal = isBillLevelDiscount ? authOrigTotal : roundCalc(Math.max(0, authOrigTotal - authDiscount), 3);

        return {
          ...cartItem,
          isIncl: true,
          priceIsIncl: true,
          price: recallPrice,
          basePrice: exclBasePrice,
          exclusivePrice: exclBasePrice,
          authoritativePrice: recallPrice,
          authoritativeLineTotal: authLineTotal,
          authoritativeOriginalLineTotal: authOrigTotal,
          authoritativeDiscount: isBillLevelDiscount ? 0 : authDiscount,
          authoritativeVatAmount: uLine?.vatAmount,
          lineTotal: authLineTotal,
          originalLineTotal: authOrigTotal,
          product: {
            ...(cartItem.product || {}),
            id: cartItem.productId,
            name: cartItem.product?.name || (cartItem as any).name || (cartItem as any).productName || `Product #${cartItem.productId}`,
            categoryId: cartItem.product?.categoryId || 1,
            price: recallPrice,
            isIncl: true,
            priceIsIncl: true,
          },
        };
      }

      if (uLine) {
        const authRate = (isTaxInclusive && rawDetailPrice > 0)
          ? roundCalc(rawDetailPrice, 3)
          : uLine.getRate(isTaxInclusive);
        const authOrigTotal = (isTaxInclusive && rawDetailAmount > 0)
          ? roundCalc(rawDetailAmount, 3)
          : (isTaxInclusive ? uLine.inclusiveGross : uLine.exclusiveGross);
        const authDiscount = (isTaxInclusive && rawDetailDisc > 0)
          ? roundCalc(rawDetailDisc, 3)
          : uLine.getDiscount(isTaxInclusive);
        // Bill discount is shown in the footer only (same as the recall/settled screen rows).
          const authLineTotal = isBillLevelDiscount ? authOrigTotal : roundCalc(Math.max(0, authOrigTotal - authDiscount), 3);
        const lineIsIncl = isTaxInclusive ? true : (uLine.isProductMasterInclusive !== undefined ? uLine.isProductMasterInclusive : cartItem.isIncl);
        return {
          ...cartItem,
          price: authRate,
          isIncl: lineIsIncl,
          priceIsIncl: lineIsIncl,
          authoritativePrice: authRate,
          authoritativeLineTotal: authLineTotal,
          authoritativeOriginalLineTotal: authOrigTotal,
          authoritativeDiscount: isBillLevelDiscount ? 0 : authDiscount,
          authoritativeVatAmount: uLine.vatAmount,
          lineTotal: authLineTotal,
          originalLineTotal: authOrigTotal,
          product: {
            ...(cartItem.product || {}),
            id: cartItem.productId,
            name: cartItem.product?.name || (cartItem as any).name || (cartItem as any).productName || `Product #${cartItem.productId}`,
            categoryId: cartItem.product?.categoryId || 1,
            price: authRate,
            isIncl: lineIsIncl,
            priceIsIncl: lineIsIncl,
          },
        };
      }
      return cartItem;
    });
    // Footer = THE stored-order footer — identical to the settled details screen.
    const editFooter = storedOrderFooter(orderData, priceView);
    const authCharges = editFooter.charges;
    const authSubtotal = editFooter.subTotal;
    const authDiscount = editFooter.discount;
    const authTax = editFooter.vatAmount; // stored VAT (0 for complimentary)
    const authNet = editFooter.netAmount; // stored total — a complimentary delivery order still charges its delivery charge
    const authNetValue = editFooter.netValue;

    let resolvedBillDiscVal = isBillComplimentary
      ? 100
      : masterDiscPer > 0
      ? masterDiscPer
      : (!hasLineItemDiscounts && masterDiscAmount > 0.001)
      ? masterDiscAmount
      : (hasLineItemDiscounts && masterDiscAmount > lineDiscountsSum + 0.05)
      ? roundCalc(masterDiscAmount - lineDiscountsSum)
      : 0;

    dispatch(
      loadRecalledOrder({
        editingOrderRates: deriveOrderChargeRatesFromMaster(orderData, priceView),
        editingOrderId: orderId,
        editingSaleId: resolvedSaleId,
        isSettledEdit: true,
        cartItems: applyStoredPricingToCartItems(orderData, mappedCartItems, { products, productCache, isBillDiscount: Boolean(isBillLevelDiscount), view: priceView }),
        orderTypeId: orderTypeId,
        orderTypeName: orderTypeName,
        customerId: master.customerId || 1,
        addressId: master.addressId || 0,
        ...resolveRecalledBillDiscount(orderData, Number(resolvedBillDiscVal || 0), resolvedBillDiscType),
        sectionId: master.sectionId || 0,
        tableId: master.tableId || 0,
        tableNo: master.tableNo || master.tableName || (master.tableId ? String(master.tableId) : ""),
        guestNo: master.guestNo || master.guests || 0,
        deliveryCharge:
          master.deliveryCharge !== undefined
            ? Number(master.deliveryCharge)
            : undefined,
        contactNo: master.mobileNo || master.contactNo,
        callBack:
          master.callBack ||
          master.callback ||
          master.callBackNo ||
          master.callbackNo ||
          master.callBackNumber ||
          master.callbackNumber,
        note: master.note,
        change: master.change || master.keepChanges,
        isComing: master.isComing,
        comingTime: master.comingTime,
        vehicleCustomerName: master.vehicleCustomerName,
        vehicleNo: master.vehicleNo,
        isMissedCall: Boolean(master.missedCall ?? master.isMissedCall),
        authoritativeSubtotal: authSubtotal,
        authoritativeDiscount: authDiscount,
        authoritativeTax: authTax,
        authoritativeNetAmount: authNet,
        authoritativeCharges: authCharges,
        authoritativeNetValue: authNetValue,
        prevUpdatedAt,
      })
    );

    if (master.tableNo) {
      dispatch(setTableNo(String(master.tableNo)));
    }

    if (master.customerName && master.customerId && master.customerId !== 1) {
      dispatch(
        setSelectedCustomer({
          id: master.customerId,
          name: master.customerName,
          mobileNo: master.mobileNo || master.contactNo,
        })
      );
    }

    if (orderTypeName.toLowerCase().includes("delivery")) {
      const resolvedChangeVal =
        master.change ??
        master.keepChanges ??
        orderData?.change ??
        orderData?.keepChanges ??
        "";
      const resolvedCallBackVal =
        master.callBack ||
        master.callback ||
        master.callBackNo ||
        master.callbackNo ||
        master.callBackNumber ||
        master.callbackNumber ||
        "";
      dispatch(
        setDeliveryDetails({
          customerName:
            master.deliveryCustomerName ||
            master.vehicleCustomerName ||
            master.customerName ||
            "",
          contactNo: master.mobileNo || master.contactNo || "",
          callBack: resolvedCallBackVal,
          flatNo: master.flatNo || master.flat || master.flatNumber || "",
          buildingNo:
            master.buildingNo || master.building || master.buildingNumber || "",
          roadNo:
            master.roadNo || master.road || master.roadNumber || master.street || "",
          blockNo: master.blockNo || master.block || master.blockNumber || "",
          area: master.area || master.areaName || "",
          note: master.note || "",
          addressId: master.addressId || 0,
          isMissedCall: Boolean(master.missedCall ?? master.isMissedCall),
          isComing: Boolean(master.isComing),
          change: resolvedChangeVal,
        })
      );
    }

    showToast(`Settled Order #${orderId} loaded for editing`, "success");
    onEditSuccess?.();
    return true;
  } catch (err: any) {
    console.error("[loadSettledOrderIntoCart] Error:", err);
    showToast(err?.message || "Failed to load settled order into cart", "error");
    return false;
  }
};
