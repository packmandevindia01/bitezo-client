import { useCallback, useDeferredValue, useEffect, useMemo } from "react";
import { useAppDispatch, useAppSelector } from "../../../../app/hooks";
import {
  setCategory,
  setSearch,
  setGroups,
  setOrderTypes,
  setGroup,
  setCategories,
  setSubCategories,
  setSubCategory,
  setProducts,
  setLoading,
  setError
} from "../store/posSlice";
import { menuApi } from "../../services/menuApi";
import type { PosCategory, MenuSubCategory, PosProduct } from "../../types";

// Module-level caches for premium instantaneous SWR (Stale-While-Revalidate) performance
export const groupCategoriesCache: Record<number, PosCategory[]> = {};
export const subCategoriesCache: Record<number, MenuSubCategory[]> = {};
export const productsCache: Record<string, PosProduct[]> = {}; // key: `${catId}-${subCatId}`
export const alternativesCache: Record<string, any[]> = {}; // key: `${productId}-${orderTypeId}`
export const productDataCache: Record<string, any> = {}; // key: `${productId}-${orderTypeId}`

/** Call this on New Order to force-refresh all product/alt data from the API */
export const clearAllPosCache = () => {
  Object.keys(groupCategoriesCache).forEach(k => delete groupCategoriesCache[Number(k)]);
  Object.keys(subCategoriesCache).forEach(k => delete subCategoriesCache[Number(k)]);
  Object.keys(productsCache).forEach(k => delete productsCache[k]);
  Object.keys(alternativesCache).forEach(k => delete alternativesCache[k]);
  Object.keys(productDataCache).forEach(k => delete productDataCache[k]);
};

export const usePosProducts = () => {
  const dispatch = useAppDispatch();
  const { 
    groups, 
    categories, 
    subCategories, 
    products,
    activeGroupId,
    activeCategoryId,
    activeSubCategoryId,
    search,
    loading,
    error,
    selectedOrderTypeId
  } = useAppSelector((state) => state.pos);

  // ─── Fetching Logic ─────────────────────────────────────────────────────────

  const fetchMasterData = useCallback(async () => {
    dispatch(setLoading(true));
    try {
      const data = await menuApi.getMasterData();
      dispatch(setGroups(data.group));
      dispatch(setOrderTypes(data.orderTypes));
      if (data.group.length > 0 && !activeGroupId) {
        dispatch(setGroup(data.group[0].groupId));
      }
    } catch (err: any) {
      dispatch(setError(err.message));
    } finally {
      dispatch(setLoading(false));
    }
  }, [dispatch, activeGroupId]);

  const fetchGroupCategories = useCallback(async (groupId: number, orderTypeId?: number) => {
    const safeOrderTypeId = orderTypeId || 1;
    
    // Check cache first to avoid long loading spinner
    const cached = groupCategoriesCache[groupId];
    if (cached && cached.length > 0) {
      dispatch(setCategories(cached));
      if (!activeCategoryId) {
        dispatch(setCategory(cached[0].id));
      }
      return;
    }
    
    dispatch(setLoading(true));
    try {
      const data = await menuApi.getGroupCategories(groupId, safeOrderTypeId);
      groupCategoriesCache[groupId] = data; 
      dispatch(setCategories(data));
      if (data.length > 0 && !activeCategoryId) {
        dispatch(setCategory(data[0].id));
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      dispatch(setLoading(false));
    }
  }, [dispatch, activeCategoryId]);

  // Internal: fetches products WITHOUT touching the loading flag.
  // Used inside fetchSubCategories so only one loading cycle occurs.
  const _fetchProductsRaw = useCallback(async (catId: number, subCatId: number, orderTypeId?: number) => {
    const safeOrderTypeId = orderTypeId || 1;
    const data = await menuApi.getProducts(catId, subCatId, safeOrderTypeId);
    productsCache[`${catId}-${subCatId}-${safeOrderTypeId}`] = data;
    dispatch(setProducts(data));
  }, [dispatch]);

  const fetchSubCategories = useCallback(async (categoryId: number, orderTypeId?: number) => {
    const safeOrderTypeId = orderTypeId || 1;
    const cachedSubs = subCategoriesCache[categoryId];
    if (cachedSubs) {
      dispatch(setSubCategories(cachedSubs));

      if (cachedSubs.length === 0) {
        const cacheKey = `${categoryId}-0-${safeOrderTypeId}`;
        const cachedProds = productsCache[cacheKey];
        if (cachedProds) {
          dispatch(setProducts(cachedProds));
        } else {
          await _fetchProductsRaw(categoryId, 0, safeOrderTypeId);
        }
      } else {
        dispatch(setSubCategory(null));
        dispatch(setProducts([]));
      }

      return;
    }

    dispatch(setLoading(true));
    try {
      const data = await menuApi.getSubCategories(categoryId);
      subCategoriesCache[categoryId] = data;
      dispatch(setSubCategories(data));

      if (data.length === 0) {
        // No subcategories — fetch products directly (no second loading cycle)
        await _fetchProductsRaw(categoryId, 0, safeOrderTypeId);
      } else {
        dispatch(setSubCategory(null));
        dispatch(setProducts([]));
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      dispatch(setLoading(false));
    }
  }, [dispatch, _fetchProductsRaw]);

  // Public: fetches products when user explicitly selects a subcategory.
  const fetchProducts = useCallback(async (catId: number, subCatId: number, orderTypeId?: number) => {
    const safeOrderTypeId = orderTypeId || 1;
    const cacheKey = `${catId}-${subCatId}-${safeOrderTypeId}`;
    const cachedProds = productsCache[cacheKey];

    if (cachedProds) {
      dispatch(setProducts(cachedProds));
      return;
    }

    dispatch(setLoading(true));
    try {
      const data = await menuApi.getProducts(catId, subCatId, safeOrderTypeId);
      productsCache[cacheKey] = data;
      dispatch(setProducts(data));
    } catch (err: any) {
      console.error(err);
    } finally {
      dispatch(setLoading(false));
    }
  }, [dispatch]);

  // ─── Preloader ─────────────────────────────────────────────────────────────

  const preloadEverything = useCallback(async (orderTypeId?: number) => {
    const safeOrderTypeId = orderTypeId || 1;
    try {
      for (const g of groups) {
        if (!groupCategoriesCache[g.groupId]) {
          const cats = await menuApi.getGroupCategories(g.groupId, safeOrderTypeId);
          groupCategoriesCache[g.groupId] = cats;
        }
        
        const cats = groupCategoriesCache[g.groupId] || [];
        for (const c of cats) {
          if (!subCategoriesCache[c.id]) {
            const subs = await menuApi.getSubCategories(c.id);
            subCategoriesCache[c.id] = subs;

            if (subs.length === 0) {
              const cacheKey = `${c.id}-0-${safeOrderTypeId}`;
              if (!productsCache[cacheKey]) {
                const prods = await menuApi.getProducts(c.id, 0, safeOrderTypeId);
                productsCache[cacheKey] = prods;
              }
            } else {
              for (const sub of subs) {
                const cacheKey = `${c.id}-${sub.subCategoryId}-${safeOrderTypeId}`;
                if (!productsCache[cacheKey]) {
                  const prods = await menuApi.getProducts(c.id, sub.subCategoryId, safeOrderTypeId);
                  productsCache[cacheKey] = prods;
                }
              }
            }
          }
        }
      }
    } catch (err) {
      console.error("Background preloading failed:", err);
    }
  }, [groups]);

  // ─── Effects ───────────────────────────────────────────────────────────────

  useEffect(() => {
    if (groups.length === 0) {
      fetchMasterData();
    }
  }, [fetchMasterData, groups.length]);

  useEffect(() => {
    if (groups.length > 0) {
      const timer = setTimeout(() => {
        preloadEverything(selectedOrderTypeId);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [groups, preloadEverything, selectedOrderTypeId]);

  useEffect(() => {
    if (activeGroupId) {
      fetchGroupCategories(activeGroupId, selectedOrderTypeId);
    }
  }, [activeGroupId, selectedOrderTypeId, fetchGroupCategories]);

  useEffect(() => {
    if (activeCategoryId) {
      fetchSubCategories(activeCategoryId, selectedOrderTypeId);
    }
  }, [activeCategoryId, selectedOrderTypeId, fetchSubCategories]);

  // Only fires when user explicitly picks a subcategory (activeSubCategoryId changes)
  useEffect(() => {
    if (activeCategoryId && activeSubCategoryId) {
      fetchProducts(activeCategoryId, activeSubCategoryId, selectedOrderTypeId);
    }
  }, [activeCategoryId, activeSubCategoryId, selectedOrderTypeId, fetchProducts]);

  // ─── Search & Filtering ────────────────────────────────────────────────────

  const deferredSearch = useDeferredValue(search);
  
  const visibleProducts = useMemo(() => {
    const normalizedSearch = deferredSearch.trim().toLowerCase();
    return products.filter((product) => {
      return normalizedSearch.length === 0 || 
             product.name.toLowerCase().includes(normalizedSearch);
    });
  }, [products, deferredSearch]);

  const activeCategory = categories.find((c) => c.id === activeCategoryId);
  const activeGroup = groups.find((g) => g.groupId === activeGroupId);

  return {
    groups,
    categories,
    subCategories,
    activeGroup,
    activeGroupId,
    activeCategory,
    activeCategoryId,
    activeSubCategoryId,
    search,
    visibleProducts,
    loading,
    error,
    
    setGroup: (id: number) => dispatch(setGroup(id)),
    setCategory: (id: number) => dispatch(setCategory(id)),
    setSubCategory: (id: number | null) => dispatch(setSubCategory(id)),
    setSearch: (val: string) => dispatch(setSearch(val)),
    refresh: fetchMasterData,
  };
};
