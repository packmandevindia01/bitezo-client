import { useAppDispatch, useAppSelector } from "../../../../../app/hooks";
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
import { productDataCache } from "../usePosProducts";
import { roundCalc } from "../../utils/billing";
import type { PosCartItem } from "../../../types";

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

    const existing = cartDetails.find(
      (item) =>
        item.productId === productId &&
        matchVariant(item.variantName, variantName) &&
        Number(item.product?.price ?? item.price) === Number(targetPrice) &&
        item.isIncl === isIncl &&
        (!item.extras || item.extras.length === 0) &&
        (!item.modifiers || item.modifiers.length === 0)
    );

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

      const existing = cartDetails.find(
        (item) =>
          item.productId === product.id &&
          (!item.variantName || item.variantName.toLowerCase().trim() === "main") &&
          Number(item.product?.price ?? item.price) === Number(targetPrice) &&
          item.isIncl === isIncl &&
          (!item.extras || item.extras.length === 0) &&
          (!item.modifiers || item.modifiers.length === 0)
      );

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
    }) => dispatch(addVoidProduct(payload)),
    addVoidModifier: (payload: {
      mapId: number;
      modifierId: number;
      qty: number;
      amount: number;
      typeId?: number;
    }) => dispatch(addVoidModifier(payload)),
  };
};
