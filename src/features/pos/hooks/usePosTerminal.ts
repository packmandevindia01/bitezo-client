import { useDeferredValue, useMemo } from "react";
import { useAppDispatch, useAppSelector } from "../../../app/hooks";
import {
  POS_CATEGORIES,
  POS_PRODUCTS,
  POS_TENDER_OPTIONS,
  POS_ORDER_TYPES,
} from "../constants";
import {
  addToCart,
  incrementItem,
  decrementItem,
  clearCart,
  setCategory,
  setSearch,
  setOrderType,
  setTenderOption,
  selectCartDetails,
  selectSubtotal,
  selectDiscount,
  selectTax,
  selectTotal,
  selectItemCount,
} from "../store/posSlice";

export const usePosTerminal = () => {
  const dispatch = useAppDispatch();
  
  // ── State from Redux ──────────────────────────────────────────────────────
  const { 
    activeCategoryId, 
    search, 
    selectedOrderType, 
    selectedTender 
  } = useAppSelector((state) => state.pos);

  const cartDetails = useAppSelector(selectCartDetails);
  const subtotal = useAppSelector(selectSubtotal);
  const discount = useAppSelector(selectDiscount);
  const tax = useAppSelector(selectTax);
  const total = useAppSelector(selectTotal);
  const itemCount = useAppSelector(selectItemCount);

  // ── Local Search logic (keep as Deferred for performance) ────────────────
  const deferredSearch = useDeferredValue(search);
  
  const visibleProducts = useMemo(() => {
    const normalizedSearch = deferredSearch.trim().toLowerCase();
    return POS_PRODUCTS.filter((product) => {
      const matchesCategory = product.categoryId === activeCategoryId;
      const matchesSearch =
        normalizedSearch.length === 0 || product.name.toLowerCase().includes(normalizedSearch);
      return matchesCategory && matchesSearch;
    });
  }, [activeCategoryId, deferredSearch]);

  const activeCategory = POS_CATEGORIES.find((category) => category.id === activeCategoryId);

  // ── Actions ──────────────────────────────────────────────────────────────
  const handleAddProduct = (productId: number) => {
    dispatch(addToCart(productId));
  };

  const handleAddProductBySku = (sku: string) => {
    const product = POS_PRODUCTS.find((p) => p.sku.toLowerCase() === sku.toLowerCase());
    if (product) {
      dispatch(addToCart(product.id));
      return true;
    }
    return false;
  };

  const handleIncrement = (productId: number) => {
    dispatch(incrementItem(productId));
  };

  const handleDecrement = (productId: number) => {
    dispatch(decrementItem(productId));
  };

  const handleClearCart = () => {
    dispatch(clearCart());
  };

  const handleSetCategory = (id: string) => {
    dispatch(setCategory(id));
  };

  const handleSetSearch = (val: string) => {
    dispatch(setSearch(val));
  };

  const handleSetOrderType = (id: string) => {
    dispatch(setOrderType(id));
  };

  const handleSetTender = (id: string) => {
    dispatch(setTenderOption(id));
  };

  return {
    categories: POS_CATEGORIES,
    orderTypes: POS_ORDER_TYPES,
    tenderOptions: POS_TENDER_OPTIONS,
    activeCategory,
    activeCategoryId,
    cartDetails,
    discount,
    itemCount,
    search,
    selectedOrderType,
    selectedTender,
    subtotal,
    tax,
    total,
    visibleProducts,
    setActiveCategoryId: handleSetCategory,
    setSearch: handleSetSearch,
    setSelectedOrderType: handleSetOrderType,
    setSelectedTender: handleSetTender,
    addProduct: handleAddProduct,
    addProductBySku: handleAddProductBySku,
    clearCart: handleClearCart,
    decrementItem: handleDecrement,
    incrementItem: handleIncrement,
  };
};
