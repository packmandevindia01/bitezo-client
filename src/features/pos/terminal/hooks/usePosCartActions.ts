import { useState } from "react";
import { useAppDispatch, useAppSelector } from "../../../../app/hooks";
import { useToast } from "../../../../app/providers/useToast";
import { orderApi } from "../../services/orderApi";
import { POS_PRODUCTS } from "../../constants";
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
  const { selectedOrderType, selectedTender, selectedCustomerId, selectedAddressId } = useAppSelector((state) => state.pos);

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

  const submitOrder = async (session: { dayId: number; shiftId: number; userId: number }) => {
    if (cartDetails.length === 0) {
      showToast("Cart is empty", "warning");
      return;
    }

    setOrderLoading(true);
    setOrderError(null);

    try {
      const payload = {
        voucherDate: new Date().toISOString(),
        customerId: selectedCustomerId,
        employeeId: session.userId,
        dayId: session.dayId,
        shiftId: session.shiftId,
        discAmount: discount,
        discPer: 0,
        serviceCharge: charges,
        levy: 0,
        vatExclAmount: subtotal,
        vatAmount: tax,
        netAmount: total,
        createdAt: new Date().toISOString(),
        orderType: selectedOrderType,
        sectionId: 0, // Dynamic later
        tableId: 0,   // Dynamic later
        guestNo: 0,
        addressId: selectedAddressId,
        status: "Pending",
        details: cartDetails.map((item) => ({
          productId: item.productId,
          unitId: 5, // Default unit
          qty: item.quantity,
          price: item.product.price,
          discPer: item.discountType === 'percentage' ? (item.discountValue || 0) : 0,
          discAmount: item.discountType === 'amount' ? (item.discountValue || 0) : 0,
          serviceCharge: 0,
          levy: 0,
          vatId: 1, // Default VAT
          vatAmount: item.vatAmount,
          netAmount: item.lineTotal,
          modifierId: 0,
          modifierType: 0,
          mapId: 0,
          complimentaryStatus: false
        }))
      };

      const response = await orderApi.submitOrder(payload);
      if (response.isSuccess) {
        showToast("Order submitted successfully!", "success");
        dispatch(clearCart());
        return response.data.id;
      } else {
        throw new Error(response.message || "Failed to submit order");
      }
    } catch (err: any) {
      const msg = err.message || "Order submission failed";
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
    selectedOrderType,
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
    setSelectedOrderType: (id: string) => dispatch(setOrderType(id)),
    setSelectedTender: (id: string) => dispatch(setTenderOption(id)),
    setCustomerId: (id: number) => dispatch(setCustomerId(id)),
    setAddressId: (id: number) => dispatch(setAddressId(id)),
    setBillDiscount: (value: number, type: 'percentage' | 'amount') => dispatch(setBillDiscount({ value, type })),
    setItemDiscount: (productId: number, variantName: string | undefined, value: number, type: 'percentage' | 'amount') => 
      dispatch(setItemDiscount({ productId, variantName, value, type })),
    updateItemPrice: (productId: number, variantName: string | undefined, price: number) =>
      dispatch(updateItemPrice({ productId, variantName, price })),
    setItemCustomizations: (productId: number, variantName: string | undefined, extras?: any[], modifiers?: any[]) =>
      dispatch(setItemCustomizations({ productId, variantName, extras, modifiers })),
  };
};
