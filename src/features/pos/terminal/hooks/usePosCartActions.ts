import { useState } from "react";
import { useAppDispatch, useAppSelector } from "../../../../app/hooks";
import { useToast } from "../../../../app/providers/useToast";
import { orderApi } from "../../services/orderApi";
import { deliveryApi } from "../../customer/services/deliveryApi";
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
  const waiterId = useAppSelector((state: any) => state.pos.waiterId);

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
    callBack,
    deliveryDetails,
    note,
    change,
    isComing,
    comingTime,
    vehicleCustomerName,
    vehicleNo,
    deliveryCustomerName,
    flatNo,
    buildingNo,
    roadNo,
    blockNo,
    area,
    billDiscountType,
    billDiscountValue,
    editingOrderId,
    voidProducts,
    voidModifiers,
    combinedOrderIds,
    isSettling,
    prevUpdatedAt,
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
    callBack: callBack || deliveryDetails?.callBack || "",
    note,
    change: change || deliveryDetails?.change || "",
    isComing,
    comingTime,
    vehicleCustomerName,
    vehicleNo,
    deliveryCustomerName,
    flatNo,
    buildingNo,
    roadNo,
    blockNo,
    area,
    billDiscountType,
    billDiscountValue,
    editingOrderId,
    voidProducts,
    voidModifiers,
    combinedOrderIds,
    prevUpdatedAt,
  });

  const getDirectSettleOrderPayload = (session: OrderSessionParams) => {
    return buildDirectSettleOrderPayload(getFormContext(), session);
  };

  const submitOrder = async (session: OrderSessionParams, shouldPrint: boolean = false) => {
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
        let effectivePrevUpdatedAt =
          context.prevUpdatedAt ||
          sessionStorage.getItem(`order_prevUpdatedAt_${editingOrderId}`) ||
          undefined;

        if (!effectivePrevUpdatedAt) {
          try {
            const detailsRes = await orderApi.getOrderDetails(editingOrderId);
            const m = detailsRes?.data?.masterData || detailsRes?.data;
            if (m?.updatedAt) {
              effectivePrevUpdatedAt = String(m.updatedAt);
              sessionStorage.setItem(`order_prevUpdatedAt_${editingOrderId}`, effectivePrevUpdatedAt);
            }
          } catch (e) {
            console.warn("Could not fetch order updatedAt for concurrency check:", e);
          }
        }
        context.prevUpdatedAt = effectivePrevUpdatedAt;

        const updatePayload = buildUpdateOrderPayload(editingOrderId, context, session);
        const invalidDetail = updatePayload.details.find((d) => !d.productId || d.productId === 0);
        if (invalidDetail) {
          throw new Error("CRITICAL: A cart item is missing a valid productId!");
        }

        console.log("[UPDATE ORDER PAYLOAD]:", updatePayload);
        const response = await orderApi.updateOrder(editingOrderId, updatePayload as MenuOrderUpdateRequest);

        if (response.isSuccess) {
          showToast("Order updated successfully!", "success");

          const shouldPrintKot = Boolean(shouldPrint);
          if (shouldPrintKot) {
            await handleOrderPrinting(editingOrderId, session, true, shouldPrint);
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

        const shouldPrintKot = Boolean(shouldPrint);
        if (shouldPrintKot) {
          await handleOrderPrinting(response.data.id, session, false, shouldPrint);
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

  const handleOrderPrinting = async (
    orderId: number, 
    session: OrderSessionParams, 
    isUpdate: boolean, 
    forcedPrint: boolean = false
  ) => {
    try {
      let orderNoStr = String(orderId);
      let ticketNoStr = String(orderId);
      let orderTypeStr = selectedOrderTypeName || "DINE IN";
      const resolveEmployeeName = async (empId?: number | string | null): Promise<string | null> => {
        if (!empId) return null;
        const idStr = String(empId).trim();
        if (!idStr || idStr === "0" || idStr === "NaN") return null;

        try {
          const mapRaw = localStorage.getItem("posEmpNameMap");
          if (mapRaw) {
            const map = JSON.parse(mapRaw);
            if (map[idStr]) return map[idStr];
          }
        } catch {}

        if (idStr === localStorage.getItem("authorizedEmployeeId")) {
          const authName = localStorage.getItem("authorizedEmployeeName");
          if (authName) return authName;
        }

        try {
          const branchId =
            Number(localStorage.getItem("systemBranchId")) ||
            Number(localStorage.getItem("activeBranchId")) ||
            Number(localStorage.getItem("branchId")) ||
            0;
          const { getEmployeeNames } = await import("../../../general/employee/services/employeeService");
          const list = await getEmployeeNames(branchId);
          if (Array.isArray(list) && list.length > 0) {
            const map: Record<string, string> = {};
            try {
              const existing = localStorage.getItem("posEmpNameMap");
              if (existing) Object.assign(map, JSON.parse(existing));
            } catch {}
            list.forEach((e: any) => {
              const id = e.empId ?? e.id;
              const name = e.empName ?? e.name;
              if (id && name) map[String(id)] = name;
            });
            localStorage.setItem("posEmpNameMap", JSON.stringify(map));
            if (map[idStr]) return map[idStr];
          }
        } catch {}

        return null;
      };

      const targetEmpId = session.employeeId || waiterId;
      let waiterStr = (await resolveEmployeeName(targetEmpId))
        || waiterName
        || localStorage.getItem("defaultEmployeeName")
        || localStorage.getItem("authorizedEmployeeName")
        || localStorage.getItem("employeeName")
        || "Waiter";

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
          const masterEmp = masterData.employeeName || (await resolveEmployeeName(masterData.employeeId ?? masterData.empId ?? masterData.waiterId));
          if (masterEmp) {
            waiterStr = masterEmp;
          }
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

      let resolvedContactNo = (masterData as any)?.mobileNo || (masterData as any)?.contactNo || contactNo || "";
      let resolvedCallBack = (masterData as any)?.callBack || (masterData as any)?.callback || callBack || deliveryDetails?.callBack || "";
      let resolvedChange = (masterData as any)?.change || (masterData as any)?.keepChanges || change || (deliveryDetails as any)?.change || "";
      let resolvedCustomerName = (masterData as any)?.deliveryCustomerName || (masterData as any)?.vehicleCustomerName || (masterData as any)?.customerName || customerNameStr || "";
      let resolvedFlatNo = (masterData as any)?.flatNo || (masterData as any)?.flat || (masterData as any)?.flatNumber || flatNo || "";
      let resolvedBuildingNo = (masterData as any)?.buildingNo || (masterData as any)?.building || (masterData as any)?.buildingNumber || buildingNo || "";
      let resolvedBlockNo = (masterData as any)?.blockNo || (masterData as any)?.block || (masterData as any)?.blockNumber || blockNo || "";
      let resolvedRoadNo = (masterData as any)?.roadNo || (masterData as any)?.road || (masterData as any)?.roadNumber || (masterData as any)?.street || roadNo || "";
      let resolvedArea = (masterData as any)?.area || (masterData as any)?.areaName || area || "";
      let resolvedAddress = (masterData as any)?.address || (masterData as any)?.customerAddress || (masterData as any)?.deliveryAddress || "";

      const isDeliveryOrder = orderTypeStr.toLowerCase().includes("delivery");
      if (isDeliveryOrder && !resolvedFlatNo && !resolvedBuildingNo && !resolvedBlockNo && !resolvedRoadNo && !resolvedArea && resolvedContactNo) {
        try {
          const addrRes = await deliveryApi.getDeliveryAddress(resolvedContactNo);
          const addrData = Array.isArray(addrRes?.data) ? addrRes.data[0] : (addrRes?.data || addrRes);
          if (addrData) {
            resolvedFlatNo = addrData.flatNo || resolvedFlatNo;
            resolvedBuildingNo = addrData.buildingNo || resolvedBuildingNo;
            resolvedBlockNo = addrData.blockNo || resolvedBlockNo;
            resolvedRoadNo = addrData.roadNo || resolvedRoadNo;
            resolvedArea = addrData.area || resolvedArea;
            if (!resolvedCustomerName || resolvedCustomerName === "CASH CUSTOMER") {
              resolvedCustomerName = addrData.customerName || resolvedCustomerName;
            }
          }
        } catch (fetchAddrErr) {
          console.warn("[usePosCartActions] Could not fetch delivery address fallback:", fetchAddrErr);
        }
      }

      const hasValidKeepChange = isDeliveryOrder && resolvedChange !== undefined && resolvedChange !== null &&
        String(resolvedChange).trim() !== "" &&
        String(resolvedChange).trim() !== "0" &&
        String(resolvedChange).trim() !== "0.00" &&
        String(resolvedChange).trim() !== "0.000";

      let resolvedDriver =
        (masterData as any)?.driverName ||
        (masterData as any)?.allocatedDriverName ||
        (masterData as any)?.driver ||
        (masterData as any)?.driverEmployeeName ||
        "";

      if (!resolvedDriver && (masterData as any)?.details && typeof (masterData as any).details === "string") {
        const match = (masterData as any).details.match(/\(Driver:\s*([^)]+)\)/i) || (masterData as any).details.match(/Driver:\s*([A-Za-z0-9_\s]+)/i);
        if (match && match[1]) {
          resolvedDriver = match[1].trim();
        }
      }

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
        customerName: resolvedCustomerName,
        driver: isDeliveryOrder ? (resolvedDriver || undefined) : undefined,
        driverName: isDeliveryOrder ? (resolvedDriver || undefined) : undefined,
        contactNo: isDeliveryOrder ? (resolvedContactNo || undefined) : undefined,
        callBack: isDeliveryOrder ? (resolvedCallBack || undefined) : undefined,
        change: hasValidKeepChange ? String(resolvedChange) : undefined,
        keepChanges: hasValidKeepChange ? String(resolvedChange) : undefined,
        flatNo: isDeliveryOrder ? (resolvedFlatNo || undefined) : undefined,
        buildingNo: isDeliveryOrder ? (resolvedBuildingNo || undefined) : undefined,
        blockNo: isDeliveryOrder ? (resolvedBlockNo || undefined) : undefined,
        roadNo: isDeliveryOrder ? (resolvedRoadNo || undefined) : undefined,
        area: isDeliveryOrder ? (resolvedArea || undefined) : undefined,
        address: isDeliveryOrder ? (resolvedAddress || undefined) : undefined,
        providerNo: (masterData as any)?.providerOrderNo || session.providerOrderNo || "",
        kotArabic: isKotArabicEnabled(),
        billArabic: isBillArabicEnabled(),
        forcedPrint,
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
    waiterId,
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
