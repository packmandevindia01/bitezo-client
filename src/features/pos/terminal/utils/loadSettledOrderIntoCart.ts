import { sortOrderDetailsBySequence } from "./orderSort";
import { mapOrderDetailsToCartItems } from "../mappers/orderDetailToCartMapper";
import { getBillingConfig, getVatStatus, roundCalc, getPriceView, getDiscountCalculation } from "./billing";
import { buildUnifiedOrderPricing } from "../../utils/orderPricing";
import { checkOrderHasBillDiscount } from "./orderDiscountCheck";
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
    const isIncl = priceView === "Inclusive";

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

    const billingConfig = getBillingConfig(orderTypeName);
    const enableVat = getVatStatus();
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
    if (enableVat && resolvedVatAmount <= 0 && netAmount > 0) {
      const vatRate = billingConfig.vatRate > 0 ? billingConfig.vatRate : 0.1;
      resolvedVatAmount = roundCalc(netAmount - netAmount / (1 + vatRate));
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

    const hasLineItemDiscounts = lineDiscountsSum > 0;
    const isBillLevelDiscount =
      isBillComplimentary ||
      masterDiscPer > 0 ||
      checkOrderHasBillDiscount(orderData) ||
      checkOrderHasBillDiscount({ master, details }) ||
      (!hasLineItemDiscounts && resolvedDiscount > 0) ||
      (hasLineItemDiscounts && resolvedDiscount > lineDiscountsSum + 0.001);

    const resolvedBillDiscType: "percentage" | "amount" =
      isBillComplimentary || masterDiscPer > 0
        ? "percentage"
        : "amount";

    const mappedCartItems = mapOrderDetailsToCartItems(details, modifiersData, {
      products,
      productCache,
      priceView: priceView,
      masterDiscPer: isBillComplimentary ? 100 : masterDiscPer,
      isOrderBillDiscount: isBillLevelDiscount,
    });

    const unifiedPricing = buildUnifiedOrderPricing(orderData, {
      orderType: orderTypeName,
      priceView,
      isBillDiscount: isBillLevelDiscount,
      products,
      productCache,
    });
    const authSubtotal = isIncl
      ? unifiedPricing.summary.subTotalInclusive
      : unifiedPricing.summary.subTotalExclusive;
    const authDiscount = isBillComplimentary
      ? authSubtotal
      : (isIncl ? unifiedPricing.summary.totalDiscountIncl : unifiedPricing.summary.totalDiscountExcl);
    const authTax = isBillComplimentary ? 0 : unifiedPricing.summary.vatAmount;
    const authNet = isBillComplimentary ? 0 : unifiedPricing.summary.grandTotal;

    let resolvedBillDiscVal = isBillComplimentary
      ? 100
      : masterDiscPer > 0
      ? masterDiscPer
      : isBillLevelDiscount
      ? (getDiscountCalculation() === "Inclusive" ? (unifiedPricing.summary.totalDiscountIncl || 0) : (unifiedPricing.summary.totalDiscountExcl || 0))
      : 0;

    dispatch(
      loadRecalledOrder({
        editingOrderId: orderId,
        editingSaleId: resolvedSaleId,
        isSettledEdit: true,
        cartItems: mappedCartItems,
        orderTypeId: orderTypeId,
        orderTypeName: orderTypeName,
        customerId: master.customerId || 1,
        addressId: master.addressId || 0,
        billDiscountValue: Number(resolvedBillDiscVal || 0),
        billDiscountType: resolvedBillDiscType,
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
