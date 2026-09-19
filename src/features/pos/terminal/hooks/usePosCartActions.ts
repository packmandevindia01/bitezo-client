import { useState } from "react";
import { useAppDispatch, useAppSelector } from "../../../../app/hooks";
import { useToast } from "../../../../app/providers/useToast";
import { orderApi } from "../../services/orderApi";
import type { MenuOrderRequest, MenuOrderUpdateRequest } from "../../types";
import {
  clearCart,
  setOrderType,
  setTenderOption,
  setBillDiscount,
  setItemDiscount,
  setAllItemsDiscount,
  setCustomerId,
  setAddressId,
  setChange,
} from "../store/posSlice";
import {
  selectCartDetails,
  selectSubtotal,
  selectDiscount,
  selectTax,
  selectTotal,
  selectCharges,
  selectTotalServiceCharge,
  selectTotalLevy,
  selectItemCount,
  selectTotalExtras,
  selectBaseSubtotal,
  selectDeliveryCharge,
} from "../store/posSelectors";
import { getVatStatus, roundCalc } from "../utils/billing";
import { useCartMutations } from "./cart/useCartMutations";
import {
  buildDirectSettleOrderPayload,
  buildNewOrderPayload,
  buildUpdateOrderPayload,
  type OrderFormContext,
  type OrderSessionParams,
} from "../mappers/orderPayloadMapper";

export const usePosCartActions = () => {
  const dispatch = useAppDispatch();
  const { showToast } = useToast();

  const [orderLoading, setOrderLoading] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);

  const cartDetails = useAppSelector(selectCartDetails);
  const subtotal = useAppSelector(selectSubtotal);
  const discount = useAppSelector(selectDiscount);
  const tax = useAppSelector(selectTax);
  const charges = useAppSelector(selectCharges);
  const totalServiceCharge = useAppSelector(selectTotalServiceCharge);
  const totalLevy = useAppSelector(selectTotalLevy);
  const total = useAppSelector(selectTotal);
  const deliveryCharge = useAppSelector(selectDeliveryCharge);
  const itemCount = useAppSelector(selectItemCount);
  const totalExtras = useAppSelector(selectTotalExtras);
  const baseSubtotal = useAppSelector(selectBaseSubtotal);
  const waiterName = useAppSelector((state: any) => state.pos.waiterName);

  const {
    orderTypes,
    selectedOrderTypeId,
    selectedOrderTypeName,
    selectedTender,
    selectedCustomerId,
    selectedAddressId,
    selectedSectionId,
    selectedTableId,
    selectedTableNo,
    guestNo,
    missedCall,
    contactNo,
    note,
    change,
    isComing,
    comingTime,
    vehicleCustomerName,
    vehicleNo,
    billDiscountType,
    billDiscountValue,
    editingOrderId,
    voidProducts,
    voidModifiers,
    combinedOrderIds,
    isSettling,
  } = useAppSelector((state) => state.pos);

  const cartMutations = useCartMutations();

  const getPackagerPrintConfig = () => {
    try {
      for (const key of ["posConfigs", "posConfig", "pos_configs"]) {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        const parsed = JSON.parse(raw);
        const configs = parsed?.configs || parsed;
        const val =
          configs?.packagerPrint ??
          configs?.packagerprint ??
          configs?.PackagerPrint ??
          parsed?.packagerPrint ??
          parsed?.packagerprint ??
          parsed?.PackagerPrint;

        if (val !== undefined && val !== null) {
          const isEnabled =
            val === true ||
            String(val).toLowerCase() === "enable" ||
            String(val).toLowerCase() === "true" ||
            String(val).toLowerCase() === "1";

          const headerVal =
            configs?.packagerHeader ??
            configs?.packagerheader ??
            configs?.PackagerHeader ??
            parsed?.packagerHeader ??
            parsed?.packagerheader ??
            parsed?.PackagerHeader;

          const showHeader =
            headerVal === undefined ||
            headerVal === null ||
            (headerVal !== false &&
              String(headerVal).toLowerCase() !== "disable" &&
              String(headerVal).toLowerCase() !== "false" &&
              String(headerVal).toLowerCase() !== "0");

          const enableVat = getVatStatus();
          return { enabled: isEnabled, showHeader, enableVat };
        }
      }

      const directPrint = localStorage.getItem("packagerPrint") || localStorage.getItem("cachedPackagerPrint");
      const isEnabled = directPrint === "Enable" || directPrint === "true" || directPrint === "1";
      return { enabled: isEnabled, showHeader: true, enableVat: false };
    } catch (e) {
      console.error("[getPackagerPrintConfig] Error:", e);
      return { enabled: false, showHeader: true, enableVat: false };
    }
  };

  const getFormContext = (): OrderFormContext => ({
    cartDetails,
    subtotal,
    discount,
    tax,
    charges,
    totalServiceCharge,
    totalLevy,
    total,
    deliveryCharge,
    selectedOrderTypeId,
    selectedOrderTypeName,
    selectedCustomerId,
    selectedAddressId,
    selectedSectionId,
    selectedTableId,
    selectedTableNo,
    guestNo,
    missedCall,
    contactNo,
    note,
    change,
    isComing,
    comingTime,
    vehicleCustomerName,
    vehicleNo,
    billDiscountType,
    billDiscountValue,
    editingOrderId,
    voidProducts,
    voidModifiers,
    combinedOrderIds,
  });

  const getDirectSettleOrderPayload = (session: OrderSessionParams) => {
    return buildDirectSettleOrderPayload(getFormContext(), session);
  };

  const submitOrder = async (session: OrderSessionParams, shouldPrint: boolean = true) => {
    if (cartDetails.length === 0) {
      showToast("Cart is empty", "warning");
      return;
    }

    const normalizedTypeName = (selectedOrderTypeName || "").toLowerCase().replace(/[\s_-]/g, "");
    const isTakeOut =
      selectedOrderTypeId === 2 ||
      normalizedTypeName.includes("takeout") ||
      normalizedTypeName.includes("takeaway") ||
      normalizedTypeName.includes("drive") ||
      normalizedTypeName.includes("delivery");
    const isDineIn = !isTakeOut && (selectedOrderTypeId === 1 || normalizedTypeName.includes("dinein"));

    if (
      isDineIn &&
      !editingOrderId &&
      !session.providerId &&
      (!selectedSectionId || selectedSectionId <= 0 || !selectedTableId || selectedTableId <= 0)
    ) {
      showToast("Please select a Dine In Section / Table before placing the order.", "warning");
      return;
    }

    setOrderLoading(true);
    setOrderError(null);

    try {
      const context = getFormContext();

      if (editingOrderId) {
        const updatePayload = buildUpdateOrderPayload(editingOrderId, context, session);
        const invalidDetail = updatePayload.details.find((d) => !d.productId || d.productId === 0);
        if (invalidDetail) {
          throw new Error("CRITICAL: A cart item is missing a valid productId!");
        }

        console.log("[UPDATE ORDER PAYLOAD]:", updatePayload);
        const response = await orderApi.updateOrder(editingOrderId, updatePayload as MenuOrderUpdateRequest);

        if (response.isSuccess) {
          showToast("Order updated successfully!", "success");

          if (shouldPrint) {
            await handleOrderPrinting(editingOrderId, session, true);
          }

          dispatch(clearCart());
          localStorage.removeItem("driveThruVehicleNo");
          localStorage.removeItem("driveThruCustomerName");
          return response.data.id;
        } else {
          throw new Error(response.message || "Failed to update order");
        }
      }

      const payload: MenuOrderRequest = buildNewOrderPayload(context, session);
      console.log("[SUBMIT ORDER PAYLOAD]:", payload);
      const response = await orderApi.submitOrder(payload);

      if (response.isSuccess) {
        showToast("Order submitted successfully!", "success");

        if (shouldPrint) {
          await handleOrderPrinting(response.data.id, session, false);
        }

        dispatch(clearCart());
        localStorage.removeItem("driveThruVehicleNo");
        localStorage.removeItem("driveThruCustomerName");
        return response.data.id;
      } else {
        throw new Error(response.message || "Failed to submit order");
      }
    } catch (err: any) {
      const responseData = err?.response?.data;
      console.error("[ORDER ERROR]", responseData ? JSON.stringify(responseData, null, 2) : err?.message || err);

      let msg = responseData?.message || "";
      if (responseData?.errors) {
        try {
          const fieldErrors = Object.entries(responseData.errors).map(([field, val]) => {
            if (Array.isArray(val)) return `${field}: ${val.join(", ")}`;
            if (typeof val === "string") return `${field}: ${val}`;
            return `${field}: ${JSON.stringify(val)}`;
          });
          const detailedErrors = fieldErrors.join(" | ");
          msg = msg ? `${msg} - Details: ${detailedErrors}` : detailedErrors;
        } catch {
          if (!msg) msg = responseData?.title || "Validation errors occurred";
        }
      }

      msg = msg || responseData?.title || err?.message || "Order submission failed";
      setOrderError(msg);
      showToast(msg, "error");
    } finally {
      setOrderLoading(false);
    }
  };

  const handleOrderPrinting = async (orderId: number, session: OrderSessionParams, isUpdate: boolean) => {
    try {
      let orderNoStr = String(orderId);
      let ticketNoStr = String(orderId);
      let orderTypeStr = selectedOrderTypeName || "DINE IN";
      let waiterStr = localStorage.getItem("defaultEmployeeName") || localStorage.getItem("employeeName") || "Cashier";
      let sectionStr = selectedSectionId ? String(selectedSectionId) : "Main";
      let tableStr = selectedTableId ? String(selectedTableId) : "T1";
      let vehicleNoStr = vehicleNo || localStorage.getItem("driveThruVehicleNo") || "";
      let customerNameStr = vehicleCustomerName || localStorage.getItem("driveThruCustomerName") || "";

      let masterData: any = null;
      try {
        const detailsRes = await orderApi.getOrderDetails(orderId);
        masterData =
          detailsRes?.data?.masterData ||
          detailsRes?.masterData ||
          detailsRes?.data?.master ||
          detailsRes?.master;
        if (masterData) {
          orderNoStr = masterData.orderNo ? String(masterData.orderNo) : orderNoStr;
          ticketNoStr = masterData.ticketNo ? String(masterData.ticketNo) : ticketNoStr;
          orderTypeStr = masterData.orderType || masterData.orderTypeName || orderTypeStr;
          waiterStr = masterData.employeeName || waiterStr;
          sectionStr = masterData.sectionName || sectionStr;
          tableStr = masterData.tableNo || tableStr;
          vehicleNoStr = masterData.vehicleNo || vehicleNoStr;
          customerNameStr =
            masterData.deliveryCustomerName ||
            masterData.vehicleCustomerName ||
            masterData.customerName ||
            customerNameStr;
        }
      } catch (e) {
        console.error("Failed to fetch order details for KOT printing:", e);
      }

      const { printerSettingsApi } = await import("../../services/printerSettingsApi");
      const { printHtmlReceipt } = await import("../../services/qzService");
      const { generateKotHtml } = await import("../../utils/kotTemplate");
      const { executeKotRouting } = await import("../../utils/printerRouting");
      const { isKotArabicEnabled, isBillArabicEnabled } = await import("../../utils/alternativeHelpers");

      const commonPrintData = {
        orderNo: orderNoStr,
        ticketNo: ticketNoStr,
        waiter: waiterStr,
        counter: "Main",
        section: sectionStr,
        table: tableStr,
        orderType: orderTypeStr,
        orderTypeId: selectedOrderTypeId,
        vehicleNo: vehicleNoStr,
        customerName: customerNameStr,
        contactNo: (masterData as any)?.mobileNo || (masterData as any)?.contactNo || contactNo || "",
        flatNo: (masterData as any)?.flatNo || "",
        buildingNo: (masterData as any)?.buildingNo || "",
        blockNo: (masterData as any)?.blockNo || "",
        roadNo: (masterData as any)?.roadNo || "",
        area: (masterData as any)?.area || "",
        providerNo: (masterData as any)?.providerOrderNo || session.providerOrderNo || "",
        kotArabic: isKotArabicEnabled(),
        billArabic: isBillArabicEnabled(),
      };

      if (isUpdate) {
        const reorderItems = cartDetails
          .filter((item) => !item.isExisting || item.quantity > (item.originalQty || 0))
          .map((item) => {
            const diffQty = item.isExisting ? item.quantity - (item.originalQty || 0) : item.quantity;
            const ratio = item.quantity > 0 ? diffQty / item.quantity : 0;
            return {
              ...item,
              quantity: diffQty,
              lineTotal: (item.lineTotal || 0) * ratio,
              extras: (item.extras || []).map((ex) => ({
                ...ex,
                qty: (ex.qty || 1) * ratio,
              })),
              modifiers: (item.modifiers || []).map((mod) => ({
                ...mod,
                qty: (mod.qty || 1) * ratio,
              })),
            };
          });

        if (reorderItems.length > 0) {
          await executeKotRouting(
            reorderItems,
            { ...commonPrintData, headerTitle: "RE-ORDER" },
            selectedSectionId,
            printerSettingsApi,
            printHtmlReceipt,
            generateKotHtml,
            true
          );
        }

        if (voidProducts.length > 0) {
          const voidCartItems = voidProducts.map((vp: any) => ({
            productId: vp.productId,
            quantity: vp.qty,
            price: vp.amount > 0 ? roundCalc(vp.amount / vp.qty) : 0,
            lineTotal: vp.amount,
            product: {
              name: vp.productName || `Product #${vp.productId}`,
              price: vp.amount > 0 ? roundCalc(vp.amount / vp.qty) : 0,
              categoryId: vp.categoryId || 0,
            },
            vatAmount: vp.vatAmount || 0,
            netAmount: vp.netAmount || vp.amount + (vp.vatAmount || 0),
            extras: voidModifiers
              .filter((vm) => vm.mapId === vp.mapId && vm.amount > 0)
              .map((vm) => ({
                id: vm.modifierId,
                qty: vm.qty,
                price: vm.amount > 0 ? roundCalc(vm.amount / vm.qty) : 0,
                name: "Extra",
              })),
            modifiers: [],
          })) as any;

          await executeKotRouting(
            voidCartItems,
            { ...commonPrintData, headerTitle: "VOID ITEMS" },
            selectedSectionId,
            printerSettingsApi,
            printHtmlReceipt,
            generateKotHtml,
            true
          );
        }
      } else {
        await executeKotRouting(
          cartDetails,
          commonPrintData,
          selectedSectionId,
          printerSettingsApi,
          printHtmlReceipt,
          generateKotHtml,
          false
        );
      }

      // Packager print check
      const packagerConfig = getPackagerPrintConfig();
      if (packagerConfig.enabled) {
        try {
          await new Promise((r) => setTimeout(r, 250));
          const { generateGuestPrintHtml } = await import("../../utils/guestPrintTemplate");
          const { executePackagerPrint } = await import("../../utils/printerRouting");

          const packagerPrintData = {
            ...commonPrintData,
            subTotal: subtotal,
            discount: discount || 0,
            serviceCharge: totalServiceCharge,
            levy: totalLevy,
            vatAmount: tax,
            netAmount: total,
            deliveryCharge,
            enableVat: packagerConfig.enableVat,
            isPackager: true,
            showCompanyHeader: packagerConfig.showHeader,
          };

          await executePackagerPrint(
            cartDetails,
            packagerPrintData,
            printerSettingsApi,
            printHtmlReceipt,
            generateGuestPrintHtml
          );
        } catch (packErr) {
          console.error("[Packager Print Error]", packErr);
        }
      }
    } catch (printErr: any) {
      console.error("[KOT Print Error]", printErr);
      const errMsg = printErr?.message || printErr?.toString() || "Unknown error";
      showToast(`Order placed, but printing failed: ${errMsg}`, "warning");
    }
  };

  return {
    cartDetails,
    subtotal,
    discount,
    tax,
    charges,
    total,
    deliveryCharge,
    itemCount,
    totalExtras,
    baseSubtotal,
    totalServiceCharge,
    totalLevy,
    orderTypes,
    selectedOrderTypeId,
    selectedOrderTypeName,
    selectedTender,
    selectedCustomerId,
    selectedAddressId,
    selectedSectionId,
    selectedTableId,
    guestNo,
    missedCall,
    contactNo,
    note,
    change,
    isComing,
    comingTime,
    vehicleCustomerName,
    vehicleNo,
    billDiscountType,
    billDiscountValue,
    waiterName,
    orderLoading,
    orderError,
    editingOrderId,
    voidProducts,
    voidModifiers,
    isSettling,
    getDirectSettleOrderPayload,
    submitOrder,

    // Delegated to useCartMutations
    addProduct: cartMutations.addProduct,
    addProductBySku: cartMutations.addProductBySku,
    incrementItem: cartMutations.incrementItem,
    decrementItem: cartMutations.decrementItem,
    removeItem: cartMutations.removeItem,
    clearCart: cartMutations.clearCart,
    updateItemPrice: cartMutations.updateItemPrice,
    updateItemQty: cartMutations.updateItemQty,
    setItemCustomizations: cartMutations.setItemCustomizations,
    addVoidProduct: cartMutations.addVoidProduct,
    addVoidModifier: cartMutations.addVoidModifier,

    // Form state dispatches
    setSelectedOrderType: (orderTypeId: number, orderType: string) =>
      dispatch(setOrderType({ orderTypeId, orderType })),
    setSelectedTender: (id: string) => dispatch(setTenderOption(id)),
    setCustomerId: (id: number) => dispatch(setCustomerId(id)),
    setAddressId: (id: number) => dispatch(setAddressId(id)),
    setBillDiscount: (value: number, type: "percentage" | "amount") =>
      dispatch(setBillDiscount({ value, type })),
    setAllItemsDiscount: (value: number, type: "percentage" | "amount") =>
      dispatch(setAllItemsDiscount({ value, type })),
    setItemDiscount: (uniqueId: string, value: number, type: "percentage" | "amount") =>
      dispatch(setItemDiscount({ uniqueId, value, type })),
    setChange: (value: string) => dispatch(setChange(value)),
  };
};
