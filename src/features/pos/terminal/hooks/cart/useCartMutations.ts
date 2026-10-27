import { useAppDispatch, useAppSelector } from "../../../../../app/hooks";
import { store } from "../../../../../app/store";
import {
  addToCart,
  incrementItem,
  decrementItem,
  removeFromCart,
  clearCart,
  addVoidProduct,
  addVoidModifier,
  updateItemPrice,
  updateItemQty,
  setItemCustomizations,
} from "../../store/posSlice";
import { selectCartDetails } from "../../store/posSelectors";
import { POS_PRODUCTS } from "../../../constants";
import { menuApi } from "../../../services/menuApi";
import { isItemSeperationEnabled } from "../../../services/posConfigApi";
import { productDataCache } from "../usePosProducts";
import { roundCalc } from "../../utils/billing";
import type { PosCartItem } from "../../../types";

const hasCustomizations = (item: any): boolean => {
  const hasExtras = Array.isArray(item.extras) && item.extras.length > 0;
  const hasModifiers = Array.isArray(item.modifiers) && item.modifiers.length > 0;
  const hasMessages = Array.isArray(item.messages) && item.messages.length > 0;
  const hasNote = Boolean(item.note || item.notes);
  return hasExtras || hasModifiers || hasMessages || hasNote;
};

const isMatchingPrice = (item: any, target: number): boolean => {
  if (Math.abs(Number(item.price ?? 0) - target) < 0.001) return true;
  if (Math.abs(Number(item.product?.price ?? 0) - target) < 0.001) return true;

  const catalogPrice = Number(item.catalogPrice ?? item.product?.catalogPrice);
  if (!isNaN(catalogPrice) && catalogPrice > 0 && Math.abs(catalogPrice - target) < 0.001) {
    return true;
  }

  const basePrice = Number(item.basePrice ?? item.exclusivePrice ?? 0);
  if (basePrice > 0 && Math.abs(basePrice - target) < 0.001) {
    return true;
  }

  if (target > 0) {
    const vatRate = Number(item.product?.vatValue ?? item.vatRate ?? 10) / 100;
    const taxExclusiveTarget = target / (1 + vatRate);
    const itemPrice = Number(item.price ?? item.product?.price ?? 0);
    if (
      Math.abs(itemPrice - taxExclusiveTarget) < 0.005 ||
      (basePrice > 0 && Math.abs(basePrice - taxExclusiveTarget) < 0.005)
    ) {
      return true;
    }
    const taxInclusiveTarget = target * (1 + vatRate);
    if (Math.abs(itemPrice - taxInclusiveTarget) < 0.005) {
      return true;
    }
  }

  return false;
};

export const useCartMutations = () => {
  const dispatch = useAppDispatch();
  const cartDetails = useAppSelector(selectCartDetails);
  const productCache = useAppSelector((state) => state.pos.productCache);

  const addProduct = (
    productId: number,
    variantName?: string,
    price?: number,
    isIncl?: boolean,
    discountValue?: number,
    discountType?: "percentage" | "amount",
    unitId?: number,
    variantArabic?: string
  ) => {
    const targetPrice = price ?? 0;

    const matchVariant = (a?: string, b?: string) => {
      const getNormalizedVariant = (name?: string) => {
        const n = (name || "").toLowerCase().trim();
        if (!n || n === "main" || n === "variation") return "main";
        return n;
      };
      return getNormalizedVariant(a) === getNormalizedVariant(b);
    };

    const isSeparation = isItemSeperationEnabled();

    // Use synchronous Redux store cart to prevent race conditions during rapid fast clicks
    const currentCart = store.getState().pos.cartItems;

    // When disabled: merge only if unplaced (!isExisting && !mapId), matches product/variant/price/unit, discount, and has no modifiers/extras/messages
    const existing = !isSeparation
      ? currentCart.find(
          (item) =>
            !item.isExisting &&
            !item.mapId &&
            item.productId === productId &&
            matchVariant(item.variantName, variantName) &&
            isMatchingPrice(item, targetPrice) &&
            (item.isIncl === undefined || isIncl === undefined || Boolean(item.isIncl) === Boolean(isIncl)) &&
            (item.unitId === undefined || unitId === undefined || item.unitId === unitId) &&
            (item.discountValue || 0) === (discountValue || 0) &&
            item.discountType === discountType &&
            !hasCustomizations(item)
        )
      : undefined;

    if (existing) {
      dispatch(
        addToCart({
          uniqueId: existing.uniqueId,
          productId,
          variantName,
          variantArabic,
          price: targetPrice,
          isIncl,
          discountValue,
          discountType,
          unitId,
        })
      );
      return existing.uniqueId;
    } else {
      const uniqueId = `${productId}-${variantName || "main"}-${Date.now()}-${Math.random()
        .toString(36)
        .substring(2, 9)}`;
      dispatch(
        addToCart({
          uniqueId,
          productId,
          variantName,
          variantArabic,
          price: targetPrice,
          isIncl,
          discountValue,
          discountType,
          unitId,
        })
      );
      return uniqueId;
    }
  };

  const addProductBySku = async (sku: string, orderTypeId?: number) => {
    const cachedProducts = Object.values(productCache || {});
    const product =
      cachedProducts.find((p: any) => p.sku?.toLowerCase() === sku.toLowerCase()) ||
      POS_PRODUCTS.find((p) => p.sku?.toLowerCase() === sku.toLowerCase());

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
      let discountType: "percentage" | "amount" | undefined = undefined;

      if (promoPrice !== undefined && promoPrice > 0 && targetPrice > 0) {
        const diff = targetPrice - promoPrice;
        if (diff > 0) {
          discountValue = roundCalc((diff / targetPrice) * 100, 7);
          discountType = "percentage";
        }
        if (promoIsIncl !== undefined) {
          isIncl = promoIsIncl;
        }
      }

      const isSeparation = isItemSeperationEnabled();
      const currentCart = store.getState().pos.cartItems;

      const existing = !isSeparation
        ? currentCart.find(
            (item) =>
              !item.isExisting &&
              !item.mapId &&
              item.productId === product.id &&
              (!item.variantName || item.variantName.toLowerCase().trim() === "main") &&
              isMatchingPrice(item, targetPrice) &&
              (item.isIncl === undefined || isIncl === undefined || Boolean(item.isIncl) === Boolean(isIncl)) &&
              (item.unitId === undefined || product.unitId === undefined || item.unitId === product.unitId) &&
              (item.discountValue || 0) === (discountValue || 0) &&
              item.discountType === discountType &&
              !hasCustomizations(item)
          )
        : undefined;

      if (existing) {
        dispatch(
          addToCart({
            uniqueId: existing.uniqueId,
            productId: product.id,
            price: targetPrice,
            isIncl,
            discountValue,
            discountType,
            unitId: product.unitId,
          })
        );
        return existing.uniqueId;
      } else {
        const uniqueId = `${product.id}-main-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        dispatch(
          addToCart({
            uniqueId,
            productId: product.id,
            price: targetPrice,
            isIncl,
            discountValue,
            discountType,
            unitId: product.unitId,
          })
        );
        return uniqueId;
      }
    }
    return null;
  };

  return {
    cartDetails,
    addProduct,
    addProductBySku,
    incrementItem: (uniqueId: string) => dispatch(incrementItem({ uniqueId })),
    decrementItem: (uniqueId: string) => dispatch(decrementItem({ uniqueId })),
    removeItem: (uniqueId: string) => dispatch(removeFromCart({ uniqueId })),
    clearCart: () => dispatch(clearCart()),
    updateItemPrice: (uniqueId: string, price: number) =>
      dispatch(updateItemPrice({ uniqueId, price })),
    updateItemQty: (uniqueId: string, quantity: number) =>
      dispatch(updateItemQty({ uniqueId, quantity })),
    setItemCustomizations: (
      uniqueId: string,
      extras?: PosCartItem["extras"],
      modifiers?: PosCartItem["modifiers"],
      messages?: PosCartItem["messages"]
    ) => dispatch(setItemCustomizations({ uniqueId, extras, modifiers, messages })),
    addVoidProduct: (payload: {
      productId: number;
      productName?: string;
      unitId: number;
      qty: number;
      amount: number;
      mapId: number;
      variantName?: string;
      variantArabic?: string;
      categoryId?: number;
      extras?: any[];
      modifiers?: any[];
      messages?: any[];
      note?: string;
    }) => dispatch(addVoidProduct(payload)),
    addVoidModifier: (payload: {
      mapId: number;
      modifierId: number;
      qty: number;
      amount: number;
      typeId?: number;
      name?: string;
      arabicName?: string;
      typeName?: string;
    }) => dispatch(addVoidModifier(payload)),
  };
};
