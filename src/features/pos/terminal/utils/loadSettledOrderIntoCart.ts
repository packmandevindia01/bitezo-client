import { sortOrderDetailsBySequence } from "./orderSort";
import { mapOrderDetailsToCartItems } from "../mappers/orderDetailToCartMapper";
import { getBillingConfig, getVatStatus, roundCalc } from "./billing";
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
    const master = orderData.masterData || orderData;
    const details = sortOrderDetailsBySequence(
      orderData.detailsData || orderData.details || []
    );

    const rawModifiers = orderData.modifiersData || orderData.modifiers || [];
    const seen = new Set<string>();
    const modifiersData = rawModifiers.filter((m: any) => {
      const key = `${m.mapId}-${m.modifierId}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    const priceView = (() => {
      try {
        const saved = localStorage.getItem("posConfigs");
        const full = saved ? JSON.parse(saved) : {};
        return full?.configs?.priceView === "Inclusive" ? "Inclusive" : "Exclusive";
      } catch {
        return "Exclusive";
      }
    })();
    const isIncl = priceView === "Inclusive";

    const orderTypeNameMap: Record<string, number> = {
      DineIn: 1,
      TakeOut: 2,
      DriveThru: 3,
      Delivery: 4,
      Providers: 5,
      Coming: 6,
    };

    const orderTypeName = master.orderType || master.orderTypeName || "DineIn";
    const orderTypeId = master.orderTypeId || orderTypeNameMap[orderTypeName] || 1;

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
    const resolvedSaleId =
      typeof master.saleId === "number" && master.saleId > 0
        ? master.saleId
        : typeof orderData.saleId === "number" && orderData.saleId > 0
        ? orderData.saleId
        : !isNaN(parsedVoucher) && parsedVoucher > 0
        ? parsedVoucher
        : orderId || null;

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
    const netAmount = Number(master.netAmount ?? orderData?.netAmount ?? 0);
    const masterDiscPer = Number(master.discPer || 0);

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

    let resolvedDiscount = Number(master.discAmount ?? master.DiscAmount ?? master.discount ?? 0);
    if (resolvedDiscount <= 0 && lineDiscountsSum > 0) {
      resolvedDiscount = roundCalc(lineDiscountsSum);
    }

    const hasLineItemDiscounts = lineDiscountsSum > 0;
    const isBillLevelDiscount =
      Boolean(master.complimentaryStatus || master.ComplimentaryStatus) ||
      masterDiscPer > 0 ||
      (!hasLineItemDiscounts && resolvedDiscount > 0);

    const resolvedBillDiscType: "percentage" | "amount" =
      master.complimentaryStatus ||
      master.ComplimentaryStatus ||
      (masterDiscPer === 100) ||
      masterDiscPer > 0
        ? "percentage"
        : "amount";

    let resolvedBillDiscVal =
      master.complimentaryStatus ||
      master.ComplimentaryStatus ||
      (masterDiscPer === 100)
        ? 100
        : masterDiscPer > 0
        ? masterDiscPer
        : isBillLevelDiscount
        ? resolvedDiscount
        : 0;

    if (
      isBillLevelDiscount &&
      resolvedBillDiscType === "amount" &&
      isIncl &&
      resolvedBillDiscVal > 0
    ) {
      const vatRate = billingConfig.vatRate > 0 ? billingConfig.vatRate : 0.1;
      resolvedBillDiscVal = roundCalc(resolvedBillDiscVal * (1 + vatRate), 4);
    }

    const mappedCartItems = mapOrderDetailsToCartItems(details, modifiersData, {
      products,
      productCache,
      priceView,
      masterDiscPer,
      isOrderBillDiscount: isBillLevelDiscount,
    });

    const serviceCharge = Number(master.serviceCharge || 0);
    const levy = Number(master.levyAmt || master.levy || 0);
    const deliveryCharge = Number(master.deliveryCharge || 0);
    const netTaxableBase = roundCalc(
      netAmount - resolvedVatAmount - serviceCharge - levy - deliveryCharge
    );
    let resolvedSubTotal = Number(
      master.vatExclAmount ?? master.VatExclAmount ?? master.subTotal ?? master.SubTotal ?? 0
    );
    if (
      resolvedSubTotal <= 0 ||
      (enableVat && Math.abs(resolvedSubTotal - netAmount) < 0.001 && resolvedVatAmount > 0)
    ) {
      resolvedSubTotal = roundCalc(netTaxableBase + resolvedDiscount);
    }

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
        billDiscountValue: resolvedBillDiscVal,
        billDiscountType: resolvedBillDiscType,
        sectionId: master.sectionId || 0,
        tableId: master.tableId || 0,
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
        authoritativeSubtotal: resolvedSubTotal,
        authoritativeDiscount: resolvedDiscount,
        authoritativeTax: resolvedVatAmount,
        authoritativeNetAmount: netAmount,
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
