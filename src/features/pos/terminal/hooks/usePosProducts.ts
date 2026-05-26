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
const groupCategoriesCache: Record<number, PosCategory[]> = {};
const subCategoriesCache: Record<number, MenuSubCategory[]> = {};
const productsCache: Record<string, PosProduct[]> = {}; // key: `${catId}-${subCatId}`
export const productDetailsCache: Record<number, { price?: number; isIncl?: boolean; hasAlts?: boolean; alts?: import("../../types").PosAlternative[] }> = {};

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
    error
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

  const fetchGroupCategories = useCallback(async (groupId: number) => {
    const cachedCats = groupCategoriesCache[groupId];
    if (cachedCats) {
      dispatch(setCategories(cachedCats));
      if (cachedCats.length > 0 && !activeCategoryId) {
        dispatch(setCategory(cachedCats[0].id));
      }
      return;
    }

    dispatch(setLoading(true));
    try {
      const data = await menuApi.getGroupCategories(groupId);
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
  const _fetchProductsRaw = useCallback(async (catId: number, subCatId: number) => {
    const data = await menuApi.getProducts(catId, subCatId);
    productsCache[`${catId}-${subCatId}`] = data;
    dispatch(setProducts(data));
  }, [dispatch]);

  const fetchSubCategories = useCallback(async (categoryId: number) => {
    const cachedSubs = subCategoriesCache[categoryId];
    if (cachedSubs) {
      dispatch(setSubCategories(cachedSubs));

      if (cachedSubs.length === 0) {
        const cacheKey = `${categoryId}-0`;
        const cachedProds = productsCache[cacheKey];
        if (cachedProds) {
          dispatch(setProducts(cachedProds));
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
        await _fetchProductsRaw(categoryId, 0);
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
  const fetchProducts = useCallback(async (catId: number, subCatId: number) => {
    const cacheKey = `${catId}-${subCatId}`;
    const cachedProds = productsCache[cacheKey];

    if (cachedProds) {
      dispatch(setProducts(cachedProds));
      return;
    }

    dispatch(setLoading(true));
    try {
      const data = await menuApi.getProducts(catId, subCatId);
      productsCache[cacheKey] = data;
      dispatch(setProducts(data));
    } catch (err: any) {
      console.error(err);
    } finally {
      dispatch(setLoading(false));
    }
  }, [dispatch]);

  // ─── Preloader ─────────────────────────────────────────────────────────────

  const preloadEverything = useCallback(async () => {
    try {
      for (const g of groups) {
        if (!groupCategoriesCache[g.groupId]) {
          const cats = await menuApi.getGroupCategories(g.groupId);
          groupCategoriesCache[g.groupId] = cats;
        }
        
        const cats = groupCategoriesCache[g.groupId] || [];
        for (const c of cats) {
          if (!subCategoriesCache[c.id]) {
            const subs = await menuApi.getSubCategories(c.id);
            subCategoriesCache[c.id] = subs;

            if (subs.length === 0) {
              if (!productsCache[`${c.id}-0`]) {
                const prods = await menuApi.getProducts(c.id, 0);
                productsCache[`${c.id}-0`] = prods;
                for (const p of prods) {
                  if (!productDetailsCache[p.id]) {
                    try {
                      const alts = await menuApi.getAlternatives(p.id);
                      if (alts && alts.length > 0) {
                        productDetailsCache[p.id] = { hasAlts: true, alts };
                      } else {
                        const data = await menuApi.getProductData(p.id);
                        productDetailsCache[p.id] = { hasAlts: false, price: data.price, isIncl: data.isIncl };
                      }
                    } catch (e) {
                      // ignore background errors
                    }
                  }
                }
              }
            } else {
              for (const sub of subs) {
                if (!productsCache[`${c.id}-${sub.subCategoryId}`]) {
                  const prods = await menuApi.getProducts(c.id, sub.subCategoryId);
                  productsCache[`${c.id}-${sub.subCategoryId}`] = prods;
                  for (const p of prods) {
                    if (!productDetailsCache[p.id]) {
                      try {
                        const alts = await menuApi.getAlternatives(p.id);
                        if (alts && alts.length > 0) {
                          productDetailsCache[p.id] = { hasAlts: true, alts };
                        } else {
                          const data = await menuApi.getProductData(p.id);
                          productDetailsCache[p.id] = { hasAlts: false, price: data.price, isIncl: data.isIncl };
                        }
                      } catch (e) {
                        // ignore background errors
                      }
                    }
                  }
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
        preloadEverything();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [groups, preloadEverything]);

  useEffect(() => {
    if (activeGroupId) {
      fetchGroupCategories(activeGroupId);
    }
  }, [activeGroupId, fetchGroupCategories]);

  useEffect(() => {
    if (activeCategoryId) {
      fetchSubCategories(activeCategoryId);
    }
  }, [activeCategoryId, fetchSubCategories]);

  // Only fires when user explicitly picks a subcategory (activeSubCategoryId changes)
  useEffect(() => {
    if (activeCategoryId && activeSubCategoryId) {
      fetchProducts(activeCategoryId, activeSubCategoryId);
    }
  }, [activeCategoryId, activeSubCategoryId, fetchProducts]);

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
