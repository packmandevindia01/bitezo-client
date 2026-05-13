import { useAppDispatch, useAppSelector } from "../../../../app/hooks";
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
  
  const cartDetails = useAppSelector(selectCartDetails);
  const subtotal = useAppSelector(selectSubtotal);
  const discount = useAppSelector(selectDiscount);
  const tax = useAppSelector(selectTax);
  const charges = useAppSelector(selectCharges);
  const total = useAppSelector(selectTotal);
  const itemCount = useAppSelector(selectItemCount);
  const totalExtras = useAppSelector(selectTotalExtras);
  const baseSubtotal = useAppSelector(selectBaseSubtotal);
  const { selectedOrderType, selectedTender } = useAppSelector((state) => state.pos);

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
    addProduct,
    addProductBySku,
    incrementItem: (productId: number, variantName?: string) => dispatch(incrementItem({ productId, variantName })),
    decrementItem: (productId: number, variantName?: string) => dispatch(decrementItem({ productId, variantName })),
    removeItem: (productId: number, variantName?: string) => dispatch(removeFromCart({ productId, variantName })),
    clearCart: () => dispatch(clearCart()),
    setSelectedOrderType: (id: string) => dispatch(setOrderType(id)),
    setSelectedTender: (id: string) => dispatch(setTenderOption(id)),
    setBillDiscount: (value: number, type: 'percentage' | 'amount') => dispatch(setBillDiscount({ value, type })),
    setItemDiscount: (productId: number, variantName: string | undefined, value: number, type: 'percentage' | 'amount') => 
      dispatch(setItemDiscount({ productId, variantName, value, type })),
    updateItemPrice: (productId: number, variantName: string | undefined, price: number) =>
      dispatch(updateItemPrice({ productId, variantName, price })),
    setItemCustomizations: (productId: number, variantName: string | undefined, extras?: any[], modifiers?: any[]) =>
      dispatch(setItemCustomizations({ productId, variantName, extras, modifiers })),
  };
};
