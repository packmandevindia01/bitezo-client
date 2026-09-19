import { useState, useRef } from "react";
import { useAppDispatch } from "../../../../../app/hooks";
import { cacheProducts } from "../../store/posSlice";
import { menuApi } from "../../../services/menuApi";
import { alternativesCache, productDataCache } from "../usePosProducts";
import { roundCalc } from "../../utils/billing";
import type { PosProduct, PosAlternative, PosProductSearchResult } from "../../../types";

interface UseProductSelectionProps {
  visibleProducts: PosProduct[];
  selectedOrderTypeId: number;
  addProduct: (
    productId: number,
    variantName?: string,
    price?: number,
    isIncl?: boolean,
    discountValue?: number,
    discountType?: "percentage" | "amount",
    unitId?: number,
    variantArabic?: string
  ) => string;
  setSelectedKey: (key: string | null) => void;
  openPriceModal: () => void;
}

export const useProductSelection = ({
  visibleProducts,
  selectedOrderTypeId,
  addProduct,
  setSelectedKey,
  openPriceModal,
}: UseProductSelectionProps) => {
  const dispatch = useAppDispatch();
  const [selectedProduct, setSelectedProduct] = useState<PosProduct | null>(null);
  const [alternatives, setAlternatives] = useState<PosAlternative[]>([]);
  const [fetchingAlts, setFetchingAlts] = useState(false);

  // Ref to debounce rapid double-clicks on zero price items
  const zeroPriceLockRef = useRef<number>(0);

  const resolveProductPricing = async (product: {
    id: number;
    price?: number;
    isIncl?: boolean;
  }) => {
    const safeOrderTypeId = selectedOrderTypeId || 1;
    const cacheKey = `${product.id}-${safeOrderTypeId}`;
    let cachedData = productDataCache[cacheKey];

    if (!cachedData) {
      try {
        cachedData = await menuApi.getProductData(product.id, safeOrderTypeId);
        productDataCache[cacheKey] = cachedData;
      } catch (e) {
        console.warn("Failed to fetch product data:", e);
      }
    }

    let isIncl = product.isIncl;
    let targetPrice = product.price ?? 0;
    let promoPrice: number | undefined = undefined;

    if (cachedData) {
      isIncl = cachedData.isIncl;
      targetPrice = cachedData.price;
      promoPrice = cachedData.promoPrice;
    }

    let discountValue: number | undefined = undefined;
    let discountType: "percentage" | "amount" | undefined = undefined;

    if (promoPrice !== undefined && promoPrice > 0 && targetPrice > 0) {
      const diff = targetPrice - promoPrice;
      if (diff > 0) {
        discountValue = roundCalc((diff / targetPrice) * 100, 7);
        discountType = "percentage";
      }
      if (cachedData && cachedData.promoIsIncl !== undefined) {
        isIncl = cachedData.promoIsIncl;
      }
    }

    return { targetPrice, isIncl, discountValue, discountType };
  };

  const handleProductSelect = async (productId: number) => {
    const product = visibleProducts.find((p) => p.id === productId);
    if (!product) return;

    if (product.price === 0) {
      const now = Date.now();
      if (now - zeroPriceLockRef.current < 1000) return;
      zeroPriceLockRef.current = now;
    }

    if (!product.hasAlternatives) {
      const { targetPrice, isIncl, discountValue, discountType } =
        await resolveProductPricing(product);

      const newKey = addProduct(productId, undefined, targetPrice, isIncl, discountValue, discountType);
      setSelectedKey(newKey);
      if (targetPrice === 0) {
        openPriceModal();
      }
      return;
    }

    const safeOrderTypeId = selectedOrderTypeId || 1;
    const altsCacheKey = `${productId}-${safeOrderTypeId}`;
    const cachedAlts = alternativesCache[altsCacheKey];

    if (cachedAlts && cachedAlts.length > 0) {
      setAlternatives(cachedAlts);
      setSelectedProduct(product);
    } else {
      setFetchingAlts(true);
      try {
        const alts = await menuApi.getAlternatives(productId, safeOrderTypeId);
        if (alts && alts.length > 0) {
          alternativesCache[altsCacheKey] = alts;
          setAlternatives(alts);
          setSelectedProduct(product);
        } else {
          const { targetPrice, isIncl, discountValue, discountType } =
            await resolveProductPricing(product);
          const newKey = addProduct(productId, undefined, targetPrice, isIncl, discountValue, discountType);
          setSelectedKey(newKey);
          if (targetPrice === 0) {
            openPriceModal();
          }
        }
      } catch {
        const { targetPrice, isIncl, discountValue, discountType } =
          await resolveProductPricing(product);
        const newKey = addProduct(productId, undefined, targetPrice, isIncl, discountValue, discountType);
        setSelectedKey(newKey);
        if (targetPrice === 0) {
          openPriceModal();
        }
      } finally {
        setFetchingAlts(false);
      }
    }
  };

  const handleAltSelect = (variant: PosAlternative) => {
    if (variant.price === 0) {
      const now = Date.now();
      if (now - zeroPriceLockRef.current < 1000) return;
      zeroPriceLockRef.current = now;
    }

    if (selectedProduct) {
      let discountValue: number | undefined = undefined;
      let discountType: "percentage" | "amount" | undefined = undefined;
      let isIncl = variant.isIncl;

      if (variant.promoPrice !== undefined && variant.promoPrice > 0 && variant.price > 0) {
        const diff = variant.price - variant.promoPrice;
        if (diff > 0) {
          discountValue = roundCalc((diff / variant.price) * 100, 7);
          discountType = "percentage";
        }
        if (variant.promoIsIncl !== undefined) {
          isIncl = variant.promoIsIncl;
        }
      }

      const newKey = addProduct(
        selectedProduct.id,
        variant.altName,
        variant.price,
        isIncl,
        discountValue,
        discountType,
        variant.unitId,
        variant.altArabic
      );
      setSelectedKey(newKey);
      if (variant.price === 0) {
        openPriceModal();
      }
    }
  };

  const handleSearchProductSelect = async (searchItem: PosProductSearchResult) => {
    const productId = searchItem.productId;

    if (searchItem.price === 0) {
      const now = Date.now();
      if (now - zeroPriceLockRef.current < 1000) return;
      zeroPriceLockRef.current = now;
    }

    const { targetPrice, isIncl, discountValue, discountType } =
      await resolveProductPricing({
        id: productId,
        price: searchItem.price,
        isIncl: searchItem.isIncl,
      });

    dispatch(
      cacheProducts([
        {
          id: searchItem.productId,
          name: searchItem.productName,
          arabicName: searchItem.arabicName,
          categoryId: 0,
          price: targetPrice,
          vatId: searchItem.vatId,
          vatValue: searchItem.vatValue,
          unitId: searchItem.unitId,
          hasAlternatives: searchItem.hasAlternatives,
          isIncl,
          isLocked: searchItem.isLocked,
          imageUrl: searchItem.imageUrl,
        },
      ])
    );

    if (!searchItem.hasAlternatives) {
      const newKey = addProduct(productId, undefined, targetPrice, isIncl, discountValue, discountType);
      setSelectedKey(newKey);
      if (targetPrice === 0) {
        openPriceModal();
      }
      return;
    }

    const safeOrderTypeId = selectedOrderTypeId || 1;
    const altsCacheKey = `${productId}-${safeOrderTypeId}`;
    const cachedAlts = alternativesCache[altsCacheKey];

    const fallbackProduct: PosProduct = {
      id: searchItem.productId,
      name: searchItem.productName,
      arabicName: searchItem.arabicName,
      price: searchItem.price,
      categoryId: 0,
      hasAlternatives: true,
      isIncl: searchItem.isIncl,
      vatId: searchItem.vatId,
      vatValue: searchItem.vatValue,
      unitId: searchItem.unitId,
    };

    if (cachedAlts && cachedAlts.length > 0) {
      setAlternatives(cachedAlts);
      setSelectedProduct(fallbackProduct);
    } else {
      setFetchingAlts(true);
      try {
        const alts = await menuApi.getAlternatives(productId, safeOrderTypeId);
        if (alts && alts.length > 0) {
          alternativesCache[altsCacheKey] = alts;
          setAlternatives(alts);
          setSelectedProduct(fallbackProduct);
        } else {
          const newKey = addProduct(productId, undefined, targetPrice, isIncl, discountValue, discountType);
          setSelectedKey(newKey);
          if (targetPrice === 0) {
            openPriceModal();
          }
        }
      } catch {
        const newKey = addProduct(productId, undefined, targetPrice, isIncl, discountValue, discountType);
        setSelectedKey(newKey);
        if (targetPrice === 0) {
          openPriceModal();
        }
      } finally {
        setFetchingAlts(false);
      }
    }
  };

  const handleSearchAltSelect = (product: PosProductSearchResult, variant: PosAlternative) => {
    if (variant.price === 0) {
      const now = Date.now();
      if (now - zeroPriceLockRef.current < 1000) return;
      zeroPriceLockRef.current = now;
    }

    let discountValue: number | undefined = undefined;
    let discountType: "percentage" | "amount" | undefined = undefined;
    let isIncl = variant.isIncl;

    if (variant.promoPrice !== undefined && variant.promoPrice > 0 && variant.price > 0) {
      const diff = variant.price - variant.promoPrice;
      if (diff > 0) {
        discountValue = roundCalc((diff / variant.price) * 100, 7);
        discountType = "percentage";
      }
      if (variant.promoIsIncl !== undefined) {
        isIncl = variant.promoIsIncl;
      }
    }

    dispatch(
      cacheProducts([
        {
          id: product.productId,
          name: product.productName,
          arabicName: product.arabicName,
          categoryId: 0,
          price: variant.price,
          vatId: product.vatId,
          vatValue: product.vatValue,
          unitId: variant.unitId ?? product.unitId,
          hasAlternatives: product.hasAlternatives,
          isIncl,
          isLocked: product.isLocked,
          imageUrl: product.imageUrl,
        },
      ])
    );

    const newKey = addProduct(
      product.productId,
      variant.altName,
      variant.price,
      isIncl,
      discountValue,
      discountType,
      variant.unitId,
      variant.altArabic
    );
    setSelectedKey(newKey);
    if (variant.price === 0) {
      openPriceModal();
    }
  };

  return {
    selectedProduct,
    setSelectedProduct,
    alternatives,
    setAlternatives,
    fetchingAlts,
    handleProductSelect,
    handleAltSelect,
    handleSearchProductSelect,
    handleSearchAltSelect,
  };
};
