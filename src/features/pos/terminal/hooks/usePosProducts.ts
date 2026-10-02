import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
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
  usePosProductsList,
  POS_QUERY_KEYS
} from "./usePosQueries";
import { POS_MENU_SYNC_CHANNEL, POS_MENU_STORAGE_KEY } from "../../utils/posMenuSync";
import { useCategories } from "../../../inventory/category/hooks/useCategoryQueries";
import { subscribeToCategoryUpdates } from "../../../inventory/category/utils/categorySync";
import type { PosCategory } from "../../types";

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
  const { data: masterCategoryList = [], refetch: refetchMasterCategoryList } = useCategories();
  
  const { data: subCategories = [], isLoading: subsLoading } = usePosSubCategories(activeCategoryId);

  const effectiveSubCategoryId = activeSubCategoryId !== null 
    ? activeSubCategoryId 
    : (subCategories.length > 0 ? subCategories[0].subCategoryId : 0);

  const { data: products = [], isLoading: prodsLoading } = usePosProductsList(activeCategoryId, effectiveSubCategoryId, selectedOrderTypeId);

  const loading = groupsLoading || catsLoading || subsLoading || prodsLoading;
  const error = null;

  const queryClient = useQueryClient();

  // Real-time synchronization listener for cross-tab and local menu updates
  useEffect(() => {
    let lastHandledTimestamp = 0;

    const handleSync = () => {
      clearAllPosCache();
      void queryClient.invalidateQueries({ queryKey: POS_QUERY_KEYS.all, refetchType: "all" });
      void queryClient.invalidateQueries({ queryKey: ["categories"] });
      void queryClient.refetchQueries({ queryKey: POS_QUERY_KEYS.all });
      void queryClient.refetchQueries({ queryKey: ["categories"] });
      void refreshMasterData();
      void refetchMasterCategoryList();
    };

    // 1. Cross-tab BroadcastChannel
    let channel: BroadcastChannel | null = null;
    try {
      if (typeof BroadcastChannel !== "undefined") {
        channel = new BroadcastChannel(POS_MENU_SYNC_CHANNEL);
        channel.onmessage = (event) => {
          if (event.data?.type === "MENU_UPDATED") {
            lastHandledTimestamp = event.data?.timestamp || Date.now();
            handleSync();
          }
        };
      }
    } catch {
      // ignore
    }

    // 2. Cross-tab storage event
    const handleStorage = (e: StorageEvent) => {
      if (e.key === POS_MENU_STORAGE_KEY && e.newValue) {
        const ts = parseInt(e.newValue.split(":")[0], 10);
        if (ts && ts !== lastHandledTimestamp) {
          lastHandledTimestamp = ts;
          handleSync();
        }
      }
    };
    window.addEventListener("storage", handleStorage);

    // 3. Same-tab DOM CustomEvent
    const handleCustomEvent = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      lastHandledTimestamp = detail?.timestamp || Date.now();
      handleSync();
    };
    window.addEventListener("pos_menu_updated", handleCustomEvent);

    // 4. Category Master updates (same-tab and cross-tab sync)
    const unsubCategorySync = subscribeToCategoryUpdates(() => {
      handleSync();
    });

    // 5. Tab visibility / window focus check
    const handleVisibilityOrFocus = () => {
      try {
        if (document.visibilityState === "visible") {
          handleSync();
        }
      } catch {
        // ignore
      }
    };
    window.addEventListener("focus", handleVisibilityOrFocus);
    document.addEventListener("visibilitychange", handleVisibilityOrFocus);

    return () => {
      if (channel) {
        channel.close();
      }
      unsubCategorySync();
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("pos_menu_updated", handleCustomEvent);
      window.removeEventListener("focus", handleVisibilityOrFocus);
      document.removeEventListener("visibilitychange", handleVisibilityOrFocus);
    };
  }, [queryClient, refreshMasterData, refetchMasterCategoryList]);

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

  // Ensure categories remain visible even if no menu time is configured, if unassigned,
  // or if newly created in Category Master (even before products are added)
  const displayCategories = useMemo(() => {
    const masterCats = masterData?.category ?? [];
    const categoryMap = new Map<number, PosCategory>();

    // 1. Prioritize categories explicitly returned for the active menu/group
    (categories || []).forEach((c) => {
      if (c && c.id > 0) {
        categoryMap.set(c.id, c);
      }
    });

    // 2. Include categories from POS master data if not already added
    masterCats.forEach((c) => {
      if (c && c.id > 0 && !categoryMap.has(c.id)) {
        categoryMap.set(c.id, c);
      }
    });

    // 3. Include active, POS-visible categories from category master
    // (guarantees newly created categories appear immediately in the Menu List)
    (masterCategoryList || []).forEach((c) => {
      if (c && c.id > 0 && c.isActive !== false && c.posStatus !== false) {
        if (!categoryMap.has(c.id)) {
          categoryMap.set(c.id, {
            id: c.id,
            name: c.name || "",
            arabicName: c.arabic || "",
            imageUrl: c.imageUrl || null,
            colorCode: c.colorCode || "red",
          });
        }
      }
    });

    return Array.from(categoryMap.values());
  }, [categories, masterData?.category, masterCategoryList]);

  // Auto-select first category ONLY when menu group actively changes
  const prevGroupIdRef = useRef(activeGroupId);
  useEffect(() => {
    if (prevGroupIdRef.current !== activeGroupId) {
      prevGroupIdRef.current = activeGroupId;
      if (categories.length > 0) {
        dispatch(setCategory(categories[0].id));
      }
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
