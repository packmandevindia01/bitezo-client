import { useState } from "react";
import { getDecimalPart } from "../../../../utils/currency";
import { useAppDispatch, useAppSelector } from "../../../../app/hooks";
import { useToast } from "../../../../app/providers/useToast";
import { orderApi } from "../../services/orderApi";
import { POS_PRODUCTS } from "../../constants";
import type { MenuOrderRequest, MenuOrderUpdateRequest, PosCartItem } from "../../types";
import { menuApi } from "../../services/menuApi";
import { productDataCache } from "../hooks/usePosProducts";
import {
  addToCart,
  incrementItem,
  decrementItem,
  removeFromCart,
  clearCart,
  addVoidProduct,
  addVoidModifier,
  setOrderType,
  setTenderOption,
  setBillDiscount,
  setItemDiscount,
  setAllItemsDiscount,
  updateItemPrice,
  updateItemQty,
  setItemCustomizations,
  setCustomerId,
  setAddressId,
  setChange,
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
} from "../store/posSlice";
import { getBillingConfig } from "../utils/billing";

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
  const itemCount = useAppSelector(selectItemCount);
  const totalExtras = useAppSelector(selectTotalExtras);
  const baseSubtotal = useAppSelector(selectBaseSubtotal);
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
    productCache,
  } = useAppSelector((state) => state.pos);

  const addProduct = (
    productId: number, 
    variantName?: string, 
    price?: number, 
    isIncl?: boolean,
    discountValue?: number,
    discountType?: 'percentage' | 'amount'
  ) => {
    const targetPrice = price ?? 0;
    
    const matchVariant = (a?: string, b?: string) => {
      const getNormalizedVariant = (name?: string) => {
        const n = (name || '').toLowerCase().trim();
        if (!n || n === 'main' || n === 'variation') return 'main';
        return n;
      };
      return getNormalizedVariant(a) === getNormalizedVariant(b);
    };

    const existing = cartDetails.find(item => 
      item.productId === productId && 
      matchVariant(item.variantName, variantName) &&
      Number(item.product.price) === Number(targetPrice) &&
      item.isIncl === isIncl &&
      (!item.extras || item.extras.length === 0) &&
      (!item.modifiers || item.modifiers.length === 0)
    );

    if (existing) {
      dispatch(addToCart({ uniqueId: existing.uniqueId, productId, variantName, price: targetPrice, isIncl, discountValue, discountType }));
      return existing.uniqueId;
    } else {
      const uniqueId = `${productId}-${variantName || 'main'}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      dispatch(addToCart({ uniqueId, productId, variantName, price: targetPrice, isIncl, discountValue, discountType }));
      return uniqueId;
    }
  };

  const addProductBySku = async (sku: string, orderTypeId?: number) => {
    const cachedProducts = Object.values(productCache || {});
    const product = cachedProducts.find((p) => p.sku?.toLowerCase() === sku.toLowerCase())
      || POS_PRODUCTS.find((p) => p.sku?.toLowerCase() === sku.toLowerCase());

    if (product) {
      const safeOrderTypeId = orderTypeId || 1;
      const cacheKey = `${product.id}-${safeOrderTypeId}`;
      let cachedData = productDataCache[cacheKey];

      if (!product.hasAlternatives) {
        if (!cachedData) {
          try {
            cachedData = await menuApi.getProductData(product.id, safeOrderTypeId);
            productDataCache[cacheKey] = cachedData;
          } catch (err) {
            console.error("Failed to fetch product data for barcode scan", err);
          }
        }
      }

      let isIncl = product.isIncl;
      let targetPrice = product.price || 0;
      let promoPrice: number | undefined = undefined;
      let promoIsIncl: boolean | undefined = undefined;

      if (cachedData) {
        isIncl = cachedData.isIncl;
        targetPrice = cachedData.price;
        promoPrice = cachedData.promoPrice;
        promoIsIncl = cachedData.promoIsIncl;
      }

      let discountValue: number | undefined = undefined;
      let discountType: 'percentage' | 'amount' | undefined = undefined;

      if (promoPrice !== undefined && promoPrice > 0 && targetPrice > 0) {
        const diff = targetPrice - promoPrice;
        if (diff > 0) {
          discountValue = Number(((diff / targetPrice) * 100).toFixed(4));
          discountType = 'percentage';
        }
        if (promoIsIncl !== undefined) {
          isIncl = promoIsIncl;
        }
      }

      const existing = cartDetails.find(item => 
        item.productId === product.id && 
        (!item.variantName || item.variantName.toLowerCase().trim() === 'main') &&
        Number(item.product.price) === Number(targetPrice) &&
        item.isIncl === isIncl &&
        (!item.extras || item.extras.length === 0) &&
        (!item.modifiers || item.modifiers.length === 0)
      );

      if (existing) {
        dispatch(addToCart({ uniqueId: existing.uniqueId, productId: product.id, price: targetPrice, isIncl, discountValue, discountType }));
        return existing.uniqueId;
      } else {
        const uniqueId = `${product.id}-main-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        dispatch(addToCart({ uniqueId, productId: product.id, price: targetPrice, isIncl, discountValue, discountType }));
        return uniqueId;
      }
    }
    return null;
  };
  const getDirectSettleOrderPayload = (session: { employeeId?: number; userId?: number; providerOrderNo?: string }) => {
    const isDineIn = (selectedOrderTypeName || "").toLowerCase().replace(/[\s_-]/g, "").includes("dinein");
    const config = getBillingConfig(selectedOrderTypeName || "DineIn");

    return {
      orderId: editingOrderId || 0,
      customerId: selectedCustomerId,
      employeeId: session.employeeId ?? session.userId ?? 1,
      discAmount: Number(discount.toFixed(getDecimalPart())),
      discPer: billDiscountType === 'percentage' ? billDiscountValue : 0,
      serviceCharge: Number(totalServiceCharge.toFixed(getDecimalPart())),
      levy: Number(totalLevy.toFixed(getDecimalPart())),
      vatExclAmount: Number(subtotal.toFixed(getDecimalPart())),
      vatAmount: Number(tax.toFixed(getDecimalPart())),
      netAmount: Number(total.toFixed(getDecimalPart())),
      updatedAt: new Date().toISOString(),
      orderTypeId: selectedOrderTypeId,
      sectionId: isDineIn ? selectedSectionId : 0,
      tableId: isDineIn ? selectedTableId : 0,
      tableNo: isDineIn ? selectedTableNo : "",
      guestNo: guestNo || 0,
      vehicleCustomerName: selectedOrderTypeName.toLowerCase().includes("drive")
        ? vehicleCustomerName || localStorage.getItem("driveThruCustomerName") || ""
        : "",
      vehicleNo: selectedOrderTypeName.toLowerCase().includes("drive")
        ? vehicleNo || localStorage.getItem("driveThruVehicleNo") || ""
        : "",
      addressId: selectedAddressId,
      missedCall,
      contactNo,
      note,
      change,
      isComing,
      comingTime,
      providerNo: session.providerOrderNo || "",
      details: cartDetails.map((item, index) => {
        const mapId = item.mapId || (Math.max(0, ...cartDetails.map(i => i.mapId || 0), ...voidProducts.map(v => v.mapId || 0)) + index + 1);
        
        let mainNetAmount = item.lineTotal;
        let mainVatAmount = item.vatAmount;
        let mainSc = item.sc;
        let mainLevy = item.levy;

        (item.extras || []).forEach(extra => {
           const activeVatRate = (item.product as any).vatValue !== undefined ? (item.product as any).vatValue / 100 : (config.vatRate || 0);
           const actualExtraPrice = extra.price / (1 + activeVatRate);
           const extraBase = actualExtraPrice * extra.qty;
           const proportion = item.amount > 0 ? (extraBase / item.amount) : 0;
           const extraVat = item.vatAmount * proportion;
           const extraSc = item.sc * proportion;
           const extraLevy = item.levy * proportion;
           const extraNet = item.lineTotal * proportion;

           mainNetAmount -= extraNet;
           mainVatAmount -= extraVat;
           mainSc -= extraSc;
           mainLevy -= extraLevy;
        });

        return {
          productId: item.productId || item.product?.id,
          unitId: item.product?.unitId || 1,
          qty: item.quantity,
          price: Number(item.product.price.toFixed(getDecimalPart())),
          discPer: item.discountType === 'percentage' ? Number((item.discountValue || 0).toFixed(getDecimalPart())) : 0,
          discAmount: item.discountType === 'amount' ? Number((item.discountValue || 0).toFixed(getDecimalPart())) : 0,
          serviceCharge: Number(mainSc.toFixed(getDecimalPart())),
          levy: Number(mainLevy.toFixed(getDecimalPart())),
          vatId: (item.product as any).sVatId || 1,
          vatAmount: Number(mainVatAmount.toFixed(getDecimalPart())),
          netAmount: Number(mainNetAmount.toFixed(getDecimalPart())),
          mapId: mapId,
          complimentaryStatus: false,
          baseQty: item.quantity
        };
      }),
      modifiers: cartDetails.flatMap((item, index) => {
        const mapId = item.mapId || (Math.max(0, ...cartDetails.map(i => i.mapId || 0), ...voidProducts.map(v => v.mapId || 0)) + index + 1);
        
        const extrasRows = (item.extras || []).map(extra => ({
          mapId: mapId,
          modifierId: extra.id,
          qty: extra.qty,
          price: Number(extra.price.toFixed(getDecimalPart())),
          amount: Number((extra.price * extra.qty).toFixed(getDecimalPart())),
          typeId: extra.typeId
        }));

        const modifierRows = (item.modifiers || []).map(mod => ({
          mapId: mapId,
          modifierId: mod.id,
          qty: mod.qty,
          price: 0,
          amount: 0,
          typeId: mod.typeId
        }));

        return [...extrasRows, ...modifierRows];
      }),
      voidProducts: voidProducts.map(vp => ({
        productId: vp.productId,
        unitId: vp.unitId,
        qty: vp.qty,
        amount: vp.amount,
        mapId: vp.mapId
      })),
      voidModifiers: voidModifiers.filter(vm => !voidProducts.some(vp => vp.mapId === vm.mapId)),
      combinedOrderIds: combinedOrderIds
    };
  };

  const submitOrder = async (
    session: { dayId: number; shiftId: number; userId: number; employeeId?: number; providerId?: number; providerOrderNo?: string },
    shouldPrint: boolean = true
  ) => {
    if (cartDetails.length === 0) {
      showToast("Cart is empty", "warning");
      return;
    }

    const normalizedTypeName = (selectedOrderTypeName || "").toLowerCase().replace(/[\s_-]/g, "");
    const isTakeOut = selectedOrderTypeId === 2 || normalizedTypeName.includes("takeout") || normalizedTypeName.includes("takeaway") || normalizedTypeName.includes("drive") || normalizedTypeName.includes("delivery");
    const isDineIn = !isTakeOut && (selectedOrderTypeId === 1 || normalizedTypeName.includes("dinein"));
    
    // Skip table/section validation when editing an existing recalled order —
    // the table is already assigned on the backend and will be preserved in the PUT payload.
    if (isDineIn && !editingOrderId && !session.providerId && (!selectedSectionId || selectedSectionId <= 0 || !selectedTableId || selectedTableId <= 0)) {
      showToast("Please select a Dine In Section / Table before placing the order.", "warning");
      return;
    }

    setOrderLoading(true);
    setOrderError(null);

    try {
      const basePayload = getDirectSettleOrderPayload(session);
      
      if (editingOrderId) {
        const updatePayload = basePayload;
        const invalidDetail = updatePayload.details.find(d => !d.productId || d.productId === 0);
        if (invalidDetail) {
          throw new Error(`CRITICAL: A cart item is missing a valid productId!`);
        }

        const response = await orderApi.updateOrder(editingOrderId, updatePayload as MenuOrderUpdateRequest);
        if (response.isSuccess) {
          showToast("Order updated successfully!", "success");

              if (shouldPrint) {
                try {
                  const { printerSettingsApi } = await import("../../services/printerSettingsApi");
                  const { printHtmlReceipt } = await import("../../services/qzService");
                  const { generateKotHtml } = await import("../../utils/kotTemplate");
                  const { executeKotRouting } = await import("../../utils/printerRouting");
    
                  const employeeName = localStorage.getItem("employeeName") || "Cashier";
                  const orderTypeStr = selectedOrderTypeName || "DINE IN";
                  
                  const commonPrintData = {
                    orderNo: String(editingOrderId),
                    ticketNo: String(editingOrderId),
                    waiter: employeeName,
                    counter: "Main",
                    section: selectedSectionId ? String(selectedSectionId) : "Main",
                    table: selectedTableId ? String(selectedTableId) : "T1",
                    orderType: orderTypeStr
                  };
    
                  const reorderItems = cartDetails
                    .filter(item => !item.isExisting || item.quantity > (item.originalQty || 0))
                    .map(item => {
                      const diffQty = item.isExisting ? item.quantity - (item.originalQty || 0) : item.quantity;
                      const ratio = item.quantity > 0 ? diffQty / item.quantity : 0;
                  
                  return {
                    ...item,
                    quantity: diffQty,
                    lineTotal: item.lineTotal * ratio,
                    extras: (item.extras || []).map(ex => ({
                      ...ex,
                      qty: (ex.qty || 1) * ratio
                    })),
                    modifiers: (item.modifiers || []).map(mod => ({
                      ...mod,
                      qty: (mod.qty || 1) * ratio
                    }))
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
                  price: vp.amount > 0 ? Number((vp.amount / vp.qty).toFixed(getDecimalPart())) : 0,
                  lineTotal: vp.amount,
                  product: { 
                    name: vp.productName || `Product #${vp.productId}`, 
                    price: vp.amount > 0 ? Number((vp.amount / vp.qty).toFixed(getDecimalPart())) : 0 
                  },
                  extras: voidModifiers
                            .filter(vm => vm.mapId === vp.mapId && vm.amount > 0)
                            .map(vm => ({ 
                              id: vm.modifierId, 
                              qty: vm.qty, 
                              price: vm.amount > 0 ? Number((vm.amount / vm.qty).toFixed(getDecimalPart())) : 0, 
                              name: "Extra" 
                            })),
                  modifiers: []
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
            } catch (printErr: any) {
              console.error("[KOT Print Error]", printErr);
              showToast(`Order updated, but printing failed: ${printErr?.message || printErr?.toString()}`, "warning");
            }
          }

          dispatch(clearCart());
          localStorage.removeItem("driveThruVehicleNo");
          localStorage.removeItem("driveThruCustomerName");
          return response.data.id;
        } else {
          throw new Error(response.message || "Failed to update order");
        }
      }

      const payload: MenuOrderRequest = {
        voucherDate: new Date().toISOString(),
        customerId: selectedCustomerId,
        employeeId: session.employeeId ?? session.userId,
        dayId: session.dayId,
        shiftId: session.shiftId,
        discAmount: Number(discount.toFixed(getDecimalPart())),
        discPer: billDiscountType === 'percentage' ? billDiscountValue : 0,
        serviceCharge: Number(totalServiceCharge.toFixed(getDecimalPart())),
        levy: Number(totalLevy.toFixed(getDecimalPart())),
        vatExclAmount: Number(subtotal.toFixed(getDecimalPart())),
        vatAmount: Number(tax.toFixed(getDecimalPart())),
        netAmount: Number(total.toFixed(getDecimalPart())),
        createdAt: new Date().toISOString(),
        orderTypeId: selectedOrderTypeId,
        sectionId: isDineIn ? selectedSectionId : 0,
        tableId: isDineIn ? selectedTableId : 0,
        guestNo,
        addressId: selectedAddressId,
        missedCall,
        contactNo,
        note,
        change,
        isComing,
        comingTime,
        details: cartDetails.map((item, index) => {
          const mapId = index + 1;
          
          let mainNetAmount = item.lineTotal;
          let mainVatAmount = item.vatAmount;
          let mainSc = item.sc;
          let mainLevy = item.levy;

          (item.extras || []).forEach(extra => {
             const storedConfigStr = localStorage.getItem('posConfig');
             const storedConfig = storedConfigStr ? JSON.parse(storedConfigStr) : null;
             const activeVatRate = (item.product as any).vatValue !== undefined ? (item.product as any).vatValue / 100 : (storedConfig?.vatRate || 0);
             const actualExtraPrice = item.isIncl ? extra.price / (1 + activeVatRate) : extra.price;
             const extraBase = actualExtraPrice * extra.qty;
             const proportion = item.amount > 0 ? (extraBase / item.amount) : 0;
             const extraVat = item.vatAmount * proportion;
             const extraSc = item.sc * proportion;
             const extraLevy = item.levy * proportion;
             const extraNet = item.lineTotal * proportion;

             mainNetAmount -= extraNet;
             mainVatAmount -= extraVat;
             mainSc -= extraSc;
             mainLevy -= extraLevy;
          });

          return {
            productId: item.productId,
            unitId: item.product.unitId || 1,
            qty: item.quantity,
            price: Number((item.product.price || 0).toFixed(getDecimalPart())),
            discPer: item.discountType === 'percentage' ? Number((item.discountValue || 0).toFixed(getDecimalPart())) : 0,
            discAmount: item.discountType === 'amount' ? Number((item.discountValue || 0).toFixed(getDecimalPart())) : 0,
            serviceCharge: Number(mainSc.toFixed(getDecimalPart())),
            levy: Number(mainLevy.toFixed(getDecimalPart())),
            vatId: (item.product as any).sVatId || 1,
            vatAmount: Number(mainVatAmount.toFixed(getDecimalPart())),
            netAmount: Number(mainNetAmount.toFixed(getDecimalPart())),
            mapId: mapId,
            complimentaryStatus: false,
            baseQty: 1
          };
        }),
        modifiers: cartDetails.flatMap((item, index) => {
          const mapId = index + 1;
          
          const extrasRows = (item.extras || []).map(extra => ({
            mapId: mapId,
            modifierId: extra.id,
            qty: extra.qty,
            price: Number(extra.price.toFixed(getDecimalPart())),
            amount: Number((extra.price * extra.qty).toFixed(getDecimalPart())),
            typeId: extra.typeId
          }));

          const modifierRows = (item.modifiers || []).map(mod => ({
            mapId: mapId,
            modifierId: mod.id,
            qty: mod.qty || 1,
            price: 0,
            amount: 0,
            typeId: mod.typeId
          }));

          return [...extrasRows, ...modifierRows];
        }),
        vehicleNo: selectedOrderTypeName.toLowerCase().includes("drive")
          ? vehicleNo || localStorage.getItem("driveThruVehicleNo") || ""
          : "",
        vehicleCustomerName: selectedOrderTypeName.toLowerCase().includes("drive")
          ? vehicleCustomerName || localStorage.getItem("driveThruCustomerName") || ""
          : "",
        providerNo: session.providerOrderNo || "",
      };

      console.log('--- KOT ORDER PUNCH PAYLOAD ---', JSON.stringify(payload, null, 2));
      const response = await orderApi.submitOrder(payload);
      if (response.isSuccess) {
        showToast("Order submitted successfully!", "success");

        if (shouldPrint) {
          try {
            const { printerSettingsApi } = await import("../../services/printerSettingsApi");
            const { printHtmlReceipt } = await import("../../services/qzService");
            const { generateKotHtml } = await import("../../utils/kotTemplate");
            const { executeKotRouting } = await import("../../utils/printerRouting");

            const employeeName = localStorage.getItem("employeeName") || "Cashier";
            const orderTypeStr = selectedOrderTypeName || "DINE IN";
            
            const basePrintOptions = {
               orderNo: String(response.data.id),
               ticketNo: String(response.data.id),
               waiter: employeeName,
               counter: "Main",
               section: selectedSectionId ? String(selectedSectionId) : "Main",
               table: selectedTableId ? String(selectedTableId) : "T1",
               orderType: orderTypeStr
            };
            
            await executeKotRouting(
              cartDetails,
              basePrintOptions,
              selectedSectionId,
              printerSettingsApi,
              printHtmlReceipt,
              generateKotHtml,
              false // isUpdate
            );
          } catch (printErr: any) {
            console.error("[KOT Print Error]", printErr);
            const errMsg = printErr?.message || printErr?.toString() || "Unknown error";
            showToast(`Order placed, but printing failed: ${errMsg}`, "warning");
          }
        }

        dispatch(clearCart());
        localStorage.removeItem("driveThruVehicleNo");
        localStorage.removeItem("driveThruCustomerName");
        return response.data.id;
      } else {
        throw new Error(response.message || "Failed to submit order");
      }
    } catch (err: any) {
      // Extract the actual backend error — handles .NET validation ProblemDetails
      const responseData = err?.response?.data;
      console.error("[ORDER ERROR]", JSON.stringify(responseData, null, 2));

      let msg = responseData?.message;
      if (!msg && responseData?.errors) {
        try {
          const fieldErrors = Object.entries(responseData.errors).map(([field, val]) => {
            if (Array.isArray(val)) return `${field}: ${val.join(", ")}`;
            if (typeof val === "string") return `${field}: ${val}`;
            return `${field}: ${JSON.stringify(val)}`;
          });
          msg = fieldErrors.join(" | ");
        } catch {
          msg = responseData?.title;
        }
      }
      msg = msg || responseData?.title || err?.message || "Order submission failed";
      setOrderError(msg);
      showToast(msg, "error");



    } finally {
      setOrderLoading(false);
    }
  };

  return {
    cartDetails,
    subtotal,
    discount,
    tax,
    charges,
    total,
    itemCount,
    totalExtras,
    baseSubtotal,
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
    orderLoading,
    orderError,
    editingOrderId,
    voidProducts,
    voidModifiers,
    addProduct,
    addProductBySku,
    isSettling,
    getDirectSettleOrderPayload,
    submitOrder,
    incrementItem: (uniqueId: string) => dispatch(incrementItem({ uniqueId })),
    decrementItem: (uniqueId: string) => dispatch(decrementItem({ uniqueId })),
    removeItem: (uniqueId: string) => dispatch(removeFromCart({ uniqueId })),
    addVoidProduct: (payload: { productId: number; productName?: string; unitId: number; qty: number; amount: number; mapId: number }) => 
      dispatch(addVoidProduct(payload)),
    addVoidModifier: (payload: { mapId: number; modifierId: number; qty: number; amount: number; typeId?: number }) => 
      dispatch(addVoidModifier(payload)),
    clearCart: () => dispatch(clearCart()),
    setSelectedOrderType: (orderTypeId: number, orderType: string) => dispatch(setOrderType({ orderTypeId, orderType })),
    setSelectedTender: (id: string) => dispatch(setTenderOption(id)),
    setCustomerId: (id: number) => dispatch(setCustomerId(id)),
    setAddressId: (id: number) => dispatch(setAddressId(id)),
    setBillDiscount: (value: number, type: 'percentage' | 'amount') => dispatch(setBillDiscount({ value, type })),
    setAllItemsDiscount: (value: number, type: 'percentage' | 'amount') => dispatch(setAllItemsDiscount({ value, type })),
    setItemDiscount: (uniqueId: string, value: number, type: 'percentage' | 'amount') => 
      dispatch(setItemDiscount({ uniqueId, value, type })),
    updateItemPrice: (uniqueId: string, price: number) =>
      dispatch(updateItemPrice({ uniqueId, price })),
    updateItemQty: (uniqueId: string, quantity: number) =>
      dispatch(updateItemQty({ uniqueId, quantity })),
    setItemCustomizations: (uniqueId: string, extras?: PosCartItem["extras"], modifiers?: PosCartItem["modifiers"]) =>
      dispatch(setItemCustomizations({ uniqueId, extras, modifiers })),
    setChange: (value: string) => dispatch(setChange(value)),
  };
};
