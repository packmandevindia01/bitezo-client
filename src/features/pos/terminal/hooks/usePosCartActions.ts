import { useAppDispatch, useAppSelector } from "../../../../app/hooks";
import { POS_PRODUCTS } from "../../constants";
import {
  addToCart,
  incrementItem,
  decrementItem,
  clearCart,
  setOrderType,
  setTenderOption,
  selectCartDetails,
  selectSubtotal,
  selectDiscount,
  selectTax,
  selectTotal,
  selectItemCount,
} from "../store/posSlice";

export const usePosCartActions = () => {
  const dispatch = useAppDispatch();
  
  const cartDetails = useAppSelector(selectCartDetails);
  const subtotal = useAppSelector(selectSubtotal);
  const discount = useAppSelector(selectDiscount);
  const tax = useAppSelector(selectTax);
  const total = useAppSelector(selectTotal);
  const itemCount = useAppSelector(selectItemCount);
  const { selectedOrderType, selectedTender } = useAppSelector((state) => state.pos);

  const addProduct = (productId: number) => {
    dispatch(addToCart(productId));
  };

  const addProductBySku = (sku: string) => {
    const product = POS_PRODUCTS.find((p) => p.sku.toLowerCase() === sku.toLowerCase());
    if (product) {
      dispatch(addToCart(product.id));
      return true;
    }
    return false;
  };

  return {
    cartDetails,
    subtotal,
    discount,
    tax,
    total,
    itemCount,
    selectedOrderType,
    selectedTender,
    addProduct,
    addProductBySku,
    incrementItem: (id: number) => dispatch(incrementItem(id)),
    decrementItem: (id: number) => dispatch(decrementItem(id)),
    clearCart: () => dispatch(clearCart()),
    setSelectedOrderType: (id: string) => dispatch(setOrderType(id)),
    setSelectedTender: (id: string) => dispatch(setTenderOption(id)),
  };
};
