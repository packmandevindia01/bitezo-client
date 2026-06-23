import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import { useAppDispatch, useAppSelector } from "../../../../app/hooks";
import {
  setCategory,
  setSearch,
  setGroup,
  setSubCategory,
  cacheProducts
} from "../store/posSlice";
import { lockProductService } from "../../lockItem/services/lockProductService";
import { 
  usePosMasterData, 
  usePosCategories, 
  usePosSubCategories, 
  usePosProductsList 
} from "./usePosQueries";

export const alternativesCache: Record<string, any[]> = {}; // key: `${productId}-${orderTypeId}`
export const productDataCache: Record<string, any> = {}; // key: `${productId}-${orderTypeId}`

/** Call this on New Order to force-refresh all alt data from the API */
export const clearAllPosCache = () => {
  Object.keys(alternativesCache).forEach(k => delete alternativesCache[k]);
  Object.keys(productDataCache).forEach(k => delete productDataCache[k]);
};

export const usePosProducts = () => {
  const dispatch = useAppDispatch();
  const { 
    activeGroupId,
    activeCategoryId,
    activeSubCategoryId,
    search,
    selectedOrderTypeId
  } = useAppSelector((state) => state.pos);

  const { data: masterData, isLoading: groupsLoading, refetch: refreshMasterData } = usePosMasterData();
  const groups = masterData?.group ?? [];

  const { data: categories = [], isLoading: catsLoading } = usePosCategories(activeGroupId, selectedOrderTypeId);
  
  const { data: subCategories = [], isLoading: subsLoading } = usePosSubCategories(activeCategoryId);

  const { data: products = [], isLoading: prodsLoading } = usePosProductsList(activeCategoryId, activeSubCategoryId, selectedOrderTypeId);

  const loading = groupsLoading || catsLoading || subsLoading || prodsLoading;
  const error = null;

  // Auto-select first group if none active
  useEffect(() => {
    if (groups.length > 0 && !activeGroupId) {
      dispatch(setGroup(groups[0].groupId));
    }
  }, [groups, activeGroupId, dispatch]);

  // Auto-select first category if none active
  useEffect(() => {
    if (categories.length > 0 && !activeCategoryId && activeGroupId) {
      dispatch(setCategory(categories[0].id));
    }
  }, [categories, activeCategoryId, activeGroupId, dispatch]);

  // Keep productCache updated for the cart calculation selectors
  useEffect(() => {
    if (products.length > 0) {
      dispatch(cacheProducts(products));
    }
  }, [products, dispatch]);

  // ─── Search & Filtering ────────────────────────────────────────────────────

  const deferredSearch = useDeferredValue(search);
  
  const [lockedIds, setLockedIds] = useState<Set<number>>(new Set());

  const fetchLockedProducts = useCallback(async () => {
    try {
      const locked = await lockProductService.list();
      setLockedIds(new Set(locked.map(l => l.productId)));
    } catch (err) {
      // ignore silently
    }
  }, []);

  useEffect(() => {
    fetchLockedProducts();
  }, [fetchLockedProducts]);

  const visibleProducts = useMemo(() => {
    const normalizedSearch = deferredSearch.trim().toLowerCase();
    return products.filter((product) => {
      return normalizedSearch.length === 0 || 
             product.name.toLowerCase().includes(normalizedSearch);
    }).map(p => ({
      ...p,
      isLocked: lockedIds.has(p.id)
    }));
  }, [products, deferredSearch, lockedIds]);

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
    products,
    loading,
    error,
    
    setGroup: (id: number) => dispatch(setGroup(id)),
    setCategory: (id: number) => dispatch(setCategory(id)),
    setSubCategory: (id: number | null) => dispatch(setSubCategory(id)),
    setSearch: (val: string) => dispatch(setSearch(val)),
    refresh: () => refreshMasterData(),
    refreshLockedProducts: fetchLockedProducts,
  };
};
