import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import { useAppDispatch, useAppSelector } from "../../../../app/hooks";
import {
  setCategory,
  setSearch,
  setGroup,
  setSubCategory,
  cacheProducts,
  setOrderTypes
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
  const menuTimes = masterData?.menu ?? [];
  const groups = masterData?.group ?? [];
  const paymodes = masterData?.paymodes ?? [];

  const { data: categories = [], isLoading: catsLoading } = usePosCategories(activeGroupId, selectedOrderTypeId);
  
  const { data: subCategories = [], isLoading: subsLoading } = usePosSubCategories(activeCategoryId);

  const effectiveSubCategoryId = activeSubCategoryId !== null 
    ? activeSubCategoryId 
    : (subCategories.length > 0 ? subCategories[0].subCategoryId : 0);

  const { data: products = [], isLoading: prodsLoading } = usePosProductsList(activeCategoryId, effectiveSubCategoryId, selectedOrderTypeId);

  const loading = groupsLoading || catsLoading || subsLoading || prodsLoading;
  const error = null;

  // Sync masterData orderTypes to redux
  useEffect(() => {
    if (masterData?.orderTypes && masterData.orderTypes.length > 0) {
      dispatch(setOrderTypes(masterData.orderTypes));
    }
  }, [masterData?.orderTypes, dispatch]);

  // Auto-select first menu item if none active
  useEffect(() => {
    if (menuTimes.length > 0 && !activeGroupId) {
      dispatch(setGroup(menuTimes[0].menuId));
    } else if (groups.length > 0 && !activeGroupId) {
      dispatch(setGroup(groups[0].groupId));
    }
  }, [menuTimes, groups, activeGroupId, dispatch]);

  // Ensure categories remain visible even if no menu time is configured or if they are unassigned to menu times
  const displayCategories = useMemo(() => {
    const masterCats = masterData?.category ?? [];
    if (!categories || categories.length === 0) {
      return masterCats;
    }
    const groupCatIds = new Set(categories.map(c => c.id));
    const unassignedMasterCats = masterCats.filter(c => !groupCatIds.has(c.id));
    return [...categories, ...unassignedMasterCats];
  }, [categories, masterData?.category]);

  // Auto-select first category when menu group changes
  useEffect(() => {
    if (categories.length > 0) {
      dispatch(setCategory(categories[0].id));
    }
  }, [activeGroupId, categories, dispatch]);

  // Auto-select first category if none active or activeCategoryId is invalid
  useEffect(() => {
    if (displayCategories.length > 0 && (!activeCategoryId || !displayCategories.some(c => c.id === activeCategoryId))) {
      dispatch(setCategory(displayCategories[0].id));
    }
  }, [displayCategories, activeCategoryId, dispatch]);

  // Auto-select first subcategory if only 1 subcategory exists
  useEffect(() => {
    if (subCategories.length === 1 && !activeSubCategoryId) {
      dispatch(setSubCategory(subCategories[0].subCategoryId));
    }
  }, [subCategories, activeSubCategoryId, dispatch]);

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
    // Auto-poll locks every 15 seconds so changes from backoffice sync quickly
    const interval = setInterval(fetchLockedProducts, 15000);
    return () => clearInterval(interval);
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

  const activeCategory = displayCategories.find((c) => c.id === activeCategoryId);
  const activeGroup = groups.find((g) => g.groupId === activeGroupId);

  return {
    menuTimes,
    groups,
    categories: displayCategories,
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
    paymodes,
    setGroup: (id: number) => dispatch(setGroup(id)),
    setCategory: (id: number) => dispatch(setCategory(id)),
    setSubCategory: (id: number | null) => dispatch(setSubCategory(id)),
    setSearch: (val: string) => dispatch(setSearch(val)),
    refresh: () => refreshMasterData(),
    refreshLockedProducts: fetchLockedProducts,
  };
};
