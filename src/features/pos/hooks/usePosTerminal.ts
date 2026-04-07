import { useDeferredValue, useState } from "react";
import {
  POS_CATEGORIES,
  POS_INITIAL_CART,
  POS_ORDER_TYPES,
  POS_PRODUCTS,
  POS_TENDER_OPTIONS,
} from "../constants";
import type { PosCartItem } from "../types";

const TAX_RATE = 0.05;
const DISCOUNT_RATE = 0.08;

interface PosCartDetail extends PosCartItem {
  product: (typeof POS_PRODUCTS)[number];
  lineTotal: number;
}

const isCartDetail = (value: PosCartDetail | null): value is PosCartDetail => value !== null;

export const usePosTerminal = () => {
  const [activeCategoryId, setActiveCategoryId] = useState(POS_CATEGORIES[0]?.id ?? "");
  const [search, setSearch] = useState("");
  const [selectedOrderType, setSelectedOrderType] = useState(POS_ORDER_TYPES[0]?.id ?? "");
  const [selectedTender, setSelectedTender] = useState(POS_TENDER_OPTIONS[0]?.id ?? "");
  const [cartItems, setCartItems] = useState<PosCartItem[]>(POS_INITIAL_CART);

  const deferredSearch = useDeferredValue(search);
  const normalizedSearch = deferredSearch.trim().toLowerCase();

  const visibleProducts = POS_PRODUCTS.filter((product) => {
    const matchesCategory = product.categoryId === activeCategoryId;
    const matchesSearch =
      normalizedSearch.length === 0 || product.name.toLowerCase().includes(normalizedSearch);

    return matchesCategory && matchesSearch;
  });

  const cartDetails = cartItems
    .map((item) => {
      const product = POS_PRODUCTS.find((entry) => entry.id === item.productId);
      if (!product) {
        return null;
      }

      return {
        ...item,
        product,
        lineTotal: product.price * item.quantity,
      };
    })
    .filter(isCartDetail);

  const subtotal = cartDetails.reduce((sum, item) => sum + item.lineTotal, 0);
  const discount = Math.round(subtotal * DISCOUNT_RATE);
  const taxableAmount = subtotal - discount;
  const tax = Math.round(taxableAmount * TAX_RATE);
  const total = taxableAmount + tax;

  const activeCategory = POS_CATEGORIES.find((category) => category.id === activeCategoryId);
  const itemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  const addProduct = (productId: number) => {
    setCartItems((current) => {
      const existingItem = current.find((item) => item.productId === productId);

      if (existingItem) {
        return current.map((item) =>
          item.productId === productId ? { ...item, quantity: item.quantity + 1 } : item
        );
      }

      return [...current, { productId, quantity: 1 }];
    });
  };

  const incrementItem = (productId: number) => {
    setCartItems((current) =>
      current.map((item) =>
        item.productId === productId ? { ...item, quantity: item.quantity + 1 } : item
      )
    );
  };

  const decrementItem = (productId: number) => {
    setCartItems((current) =>
      current
        .map((item) =>
          item.productId === productId ? { ...item, quantity: item.quantity - 1 } : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const clearCart = () => {
    setCartItems([]);
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
    setActiveCategoryId,
    setSearch,
    setSelectedOrderType,
    setSelectedTender,
    addProduct,
    clearCart,
    decrementItem,
    incrementItem,
  };
};
