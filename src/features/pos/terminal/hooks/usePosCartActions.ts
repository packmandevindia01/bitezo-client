import { useState } from "react";
import { getDecimalPart } from "../../../../utils/currency";
import { useAppDispatch, useAppSelector } from "../../../../app/hooks";
import { useToast } from "../../../../app/providers/useToast";
import { orderApi } from "../../services/orderApi";
import { POS_PRODUCTS } from "../../constants";
import type { MenuOrderRequest, MenuOrderUpdateRequest, PosCartItem } from "../../types";
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
  } = useAppSelector((state) => state.pos);

  const addProduct = (productId: number, variantName?: string, price?: number, isIncl?: boolean) => {
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
      dispatch(addToCart({ uniqueId: existing.uniqueId, productId, variantName, price: targetPrice, isIncl }));
      return existing.uniqueId;
    } else {
      const uniqueId = `${productId}-${variantName || 'main'}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      dispatch(addToCart({ uniqueId, productId, variantName, price: targetPrice, isIncl }));
      return uniqueId;
    }
  };

  const addProductBySku = (sku: string) => {
    const product = POS_PRODUCTS.find((p) => p.sku?.toLowerCase() === sku.toLowerCase());
    if (product) {
      const targetPrice = product.price || 0;
      const existing = cartDetails.find(item => 
        item.productId === product.id && 
        (!item.variantName || item.variantName.toLowerCase().trim() === 'main') &&
        Number(item.product.price) === Number(targetPrice) &&
        (!item.extras || item.extras.length === 0) &&
        (!item.modifiers || item.modifiers.length === 0)
      );

      if (existing) {
        dispatch(addToCart({ uniqueId: existing.uniqueId, productId: product.id, price: targetPrice }));
        return existing.uniqueId;
      } else {
        const uniqueId = `${product.id}-main-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        dispatch(addToCart({ uniqueId, productId: product.id, price: targetPrice }));
        return uniqueId;
      }
    }
    return null;
  };

  const submitOrder = async (session: { dayId: number; shiftId: number; userId: number; employeeId?: number; providerId?: number; providerOrderNo?: string }) => {
    if (cartDetails.length === 0) {
      showToast("Cart is empty", "warning");
      return;
    }

    const isDineIn = (selectedOrderTypeName || "").toLowerCase().replace(/[\s_-]/g, "").includes("dinein");
    const config = getBillingConfig(selectedOrderTypeName || "DineIn");
    
    // Skip table/section validation when editing an existing recalled order —
    // the table is already assigned on the backend and will be preserved in the PUT payload.
    if (isDineIn && !editingOrderId && !session.providerId && (!selectedSectionId || selectedSectionId <= 0)) {
      showToast("Please select a Dine In Section / Table before placing the order.", "warning");
      return;
    }

    setOrderLoading(true);
    setOrderError(null);

    try {
      if (editingOrderId) {
        const updatePayload: MenuOrderUpdateRequest = {
          orderId: editingOrderId,
          customerId: selectedCustomerId,
          employeeId: session.employeeId ?? session.userId,
          discAmount: Number(discount.toFixed(3)),
          discPer: billDiscountType === 'percentage' ? billDiscountValue : 0,
          serviceCharge: Number(totalServiceCharge.toFixed(3)),
          levy: Number(totalLevy.toFixed(3)),
          vatExclAmount: Number(subtotal.toFixed(3)),
          vatAmount: Number(tax.toFixed(3)),
          netAmount: Number(total.toFixed(3)),
          updatedAt: new Date().toISOString(),
          orderTypeId: selectedOrderTypeId,
          sectionId: isDineIn ? (selectedSectionId || 1) : 0,
          tableId: isDineIn ? (selectedTableId || 1) : 0,
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
            const mapId = index + 1;
            
            let mainNetAmount = item.lineTotal;
            let mainVatAmount = item.vatAmount;
            let mainSc = item.sc;
            let mainLevy = item.levy;

            (item.extras || []).forEach(extra => {
               const activeVatRate = (item.product as any).vatValue !== undefined ? (item.product as any).vatValue / 100 : (config.vatRate || 0);
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
              productId: item.productId || item.product?.id,
              unitId: item.product?.unitId || 1,
              qty: item.quantity,
              price: Number(item.product.price.toFixed(3)),
              discPer: item.discountType === 'percentage' ? Number((item.discountValue || 0).toFixed(3)) : 0,
              discAmount: item.discountType === 'amount' ? Number((item.discountValue || 0).toFixed(3)) : 0,
              serviceCharge: Number(mainSc.toFixed(3)),
              levy: Number(mainLevy.toFixed(3)),
              vatId: (item.product as any).sVatId || 1,
              vatAmount: Number(mainVatAmount.toFixed(3)),
              netAmount: Number(mainNetAmount.toFixed(3)),
              mapId: mapId,
              complimentaryStatus: false
            };
          }),
          modifiers: cartDetails.flatMap((item, index) => {
            const mapId = index + 1;
            
            const extrasRows = (item.extras || []).map(extra => ({
              mapId: mapId,
              modifierId: extra.id,
              qty: extra.qty,
              price: Number(extra.price.toFixed(3)),
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
          voidProducts: voidProducts,
          voidModifiers: voidModifiers,
          combinedOrderIds: combinedOrderIds
        };

        const invalidDetail = updatePayload.details.find(d => !d.productId || d.productId === 0);
        if (invalidDetail) {
          throw new Error(`CRITICAL: A cart item is missing a valid productId!`);
        }

        const response = await orderApi.updateOrder(editingOrderId, updatePayload);
        if (response.isSuccess) {
          showToast("Order updated successfully!", "success");
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
        discAmount: Number(discount.toFixed(3)),
        discPer: billDiscountType === 'percentage' ? billDiscountValue : 0,
        serviceCharge: Number(totalServiceCharge.toFixed(3)),
        levy: Number(totalLevy.toFixed(3)),
        vatExclAmount: Number(subtotal.toFixed(3)),
        vatAmount: Number(tax.toFixed(3)),
        netAmount: Number(total.toFixed(3)),
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
             const activeVatRate = (item.product as any).vatValue !== undefined ? (item.product as any).vatValue / 100 : (config.vatRate || 0);
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
            price: Number(item.product.price.toFixed(3)),
            discPer: item.discountType === 'percentage' ? Number((item.discountValue || 0).toFixed(3)) : 0,
            discAmount: item.discountType === 'amount' ? Number((item.discountValue || 0).toFixed(3)) : 0,
            serviceCharge: Number(mainSc.toFixed(3)),
            levy: Number(mainLevy.toFixed(3)),
            vatId: (item.product as any).sVatId || 1,
            vatAmount: Number(mainVatAmount.toFixed(3)),
            netAmount: Number(mainNetAmount.toFixed(3)),
            mapId: mapId,
            complimentaryStatus: false
          };
        }),
        modifiers: cartDetails.flatMap((item, index) => {
          const mapId = index + 1;
          
          const extrasRows = (item.extras || []).map(extra => ({
            mapId: mapId,
            modifierId: extra.id,
            qty: extra.qty,
            price: Number(extra.price.toFixed(3)),
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
    submitOrder,
    incrementItem: (uniqueId: string) => dispatch(incrementItem({ uniqueId })),
    decrementItem: (uniqueId: string) => dispatch(decrementItem({ uniqueId })),
    removeItem: (uniqueId: string) => dispatch(removeFromCart({ uniqueId })),
    addVoidProduct: (payload: { productId: number; unitId: number; qty: number; amount: number; mapId: number }) => 
      dispatch(addVoidProduct(payload)),
    addVoidModifier: (payload: { mapId: number; modifierId: number; qty: number; amount: number }) => 
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
