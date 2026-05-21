import { useState } from "react";
import { useAppDispatch, useAppSelector } from "../../../../app/hooks";
import { useToast } from "../../../../app/providers/useToast";
import { orderApi } from "../../services/orderApi";
import { POS_PRODUCTS } from "../../constants";
import type { MenuOrderRequest, PosCartItem } from "../../types";
import {
  addToCart,
  incrementItem,
  decrementItem,
  removeFromCart,
  clearCart,
  setOrderType,
  setTenderOption,
  setBillDiscount,
  setItemDiscount,
  updateItemPrice,
  updateItemQty,
  setItemCustomizations,
  setCustomerId,
  setAddressId,
  selectCartDetails,
  selectSubtotal,
  selectDiscount,
  selectTax,
  selectTotal,
  selectCharges,
  selectItemCount,
  selectTotalExtras,
  selectBaseSubtotal,
} from "../store/posSlice";

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
  const total = useAppSelector(selectTotal);
  const itemCount = useAppSelector(selectItemCount);
  const totalExtras = useAppSelector(selectTotalExtras);
  const baseSubtotal = useAppSelector(selectBaseSubtotal);
  const { orderTypes, selectedOrderTypeId, selectedOrderTypeName, selectedTender, selectedCustomerId, selectedAddressId } = useAppSelector((state) => state.pos);

  const addProduct = (productId: number, variantName?: string, price?: number) => {
    dispatch(addToCart({ productId, variantName, price }));
  };

  const addProductBySku = (sku: string) => {
    const product = POS_PRODUCTS.find((p) => p.sku?.toLowerCase() === sku.toLowerCase());
    if (product) {
      dispatch(addToCart({ productId: product.id }));
      return true;
    }
    return false;
  };

  const submitOrder = async (session: { dayId: number; shiftId: number; userId: number; employeeId?: number }) => {
    if (cartDetails.length === 0) {
      showToast("Cart is empty", "warning");
      return;
    }

    setOrderLoading(true);
    setOrderError(null);

    try {
      const payload: MenuOrderRequest = {
        voucherDate: new Date().toISOString(),
        customerId: selectedCustomerId,
        employeeId: session.employeeId ?? session.userId,
        dayId: session.dayId,
        shiftId: session.shiftId,
        discAmount: Number(discount.toFixed(3)),
        discPer: 0,
        serviceCharge: Number(charges.toFixed(3)),
        levy: 0,
        vatExclAmount: Number(subtotal.toFixed(3)),
        vatAmount: Number(tax.toFixed(3)),
        netAmount: Number(total.toFixed(3)),
        createdAt: new Date().toISOString(),
        orderTypeId: selectedOrderTypeId,
        sectionId: selectedOrderTypeName.toLowerCase() === "dinein" ? 1 : 0, // 0 for non-DineIn
        tableId: selectedOrderTypeName.toLowerCase() === "dinein" ? 1 : 0,   // 0 for non-DineIn
        guestNo: 0,
        addressId: selectedAddressId,
        missedCall: false,
        contactNo: "",
        note: "",
        change: "",
        isComing: false,
        comingTime: new Date().toISOString(),
        details: cartDetails.map((item) => ({
          productId: item.productId,
          unitId: item.product.unitId ?? 5, // Use product's own unit, fallback to 5
          qty: item.quantity,
          price: Number(item.product.price.toFixed(3)),
          discPer: item.discountType === 'percentage' ? Number((item.discountValue || 0).toFixed(3)) : 0,
          discAmount: item.discountType === 'amount' ? Number((item.discountValue || 0).toFixed(3)) : 0,
          serviceCharge: 0,
          levy: 0,
          vatId: 1, // Default VAT
          vatAmount: Number(item.vatAmount.toFixed(3)),
          netAmount: Number(item.lineTotal.toFixed(3)),
          modifierId: 0,
          modifierType: 0,
          mapId: 0,
          complimentaryStatus: false
        })),
        vehicleNo: selectedOrderTypeName.toLowerCase().includes("drive")
          ? (localStorage.getItem("driveThruVehicleNo") || "")
          : "",
        vehicleCustomerName: selectedOrderTypeName.toLowerCase().includes("drive")
          ? (localStorage.getItem("driveThruCustomerName") || "")
          : "",
      };

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
    orderLoading,
    orderError,
    addProduct,
    addProductBySku,
    submitOrder,
    incrementItem: (productId: number, variantName?: string) => dispatch(incrementItem({ productId, variantName })),
    decrementItem: (productId: number, variantName?: string) => dispatch(decrementItem({ productId, variantName })),
    removeItem: (productId: number, variantName?: string) => dispatch(removeFromCart({ productId, variantName })),
    clearCart: () => dispatch(clearCart()),
    setSelectedOrderType: (orderTypeId: number, orderType: string) => dispatch(setOrderType({ orderTypeId, orderType })),
    setSelectedTender: (id: string) => dispatch(setTenderOption(id)),
    setCustomerId: (id: number) => dispatch(setCustomerId(id)),
    setAddressId: (id: number) => dispatch(setAddressId(id)),
    setBillDiscount: (value: number, type: 'percentage' | 'amount') => dispatch(setBillDiscount({ value, type })),
    setItemDiscount: (productId: number, variantName: string | undefined, value: number, type: 'percentage' | 'amount') => 
      dispatch(setItemDiscount({ productId, variantName, value, type })),
    updateItemPrice: (productId: number, variantName: string | undefined, price: number) =>
      dispatch(updateItemPrice({ productId, variantName, price })),
    updateItemQty: (productId: number, variantName: string | undefined, quantity: number) =>
      dispatch(updateItemQty({ productId, variantName, quantity })),
    setItemCustomizations: (productId: number, variantName: string | undefined, extras?: PosCartItem["extras"], modifiers?: PosCartItem["modifiers"]) =>
      dispatch(setItemCustomizations({ productId, variantName, extras, modifiers })),
  };
};
