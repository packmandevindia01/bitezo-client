import { useDeferredValue, useEffect, useMemo, useRef } from "react";
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
import { useLockedProducts } from "./useLockedProducts";
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
import { usePermissions } from "../../../../hooks/usePermissions";
import { isBackofficeMode } from "../../../../utils/authUtils";
import type { PosCategory } from "../../types";
import { selectMenuOrderTypeId } from "../store/posSelectors";
import { clearProviderPriceCache, getProviderOwnStatus, isProviderMenuOrderType } from "../../services/menuApi";

export const alternativesCache: Record<string, any[]> = {}; // key: `${productId}-${orderTypeId}`
export const productDataCache: Record<string, any> = {}; // key: `${productId}-${orderTypeId}`

/** Call this on New Order to force-refresh all alt data from the API */
export const clearAllPosCache = () => {
  Object.keys(alternativesCache).forEach(k => delete alternativesCache[k]);
  Object.keys(productDataCache).forEach(k => delete productDataCache[k]);
  clearProviderPriceCache();
};

export const usePosProducts = () => {
  const dispatch = useAppDispatch();
  const { hasPermission } = usePermissions();
  const canViewCategoryMaster = isBackofficeMode() && hasPermission("Category Master", "View");

  const { 
    activeGroupId,
    activeCategoryId,
    activeSubCategoryId,
    search,
  } = useAppSelector((state) => state.pos);
  // Provider orders: the provider's own menu (selectMenuOrderTypeId).
  const menuOrderTypeId = useAppSelector(selectMenuOrderTypeId);

  const { data: masterData, isLoading: groupsLoading, refetch: refreshMasterData } = usePosMasterData();
  const menuTimes = masterData?.menu ?? [];
  const groups = masterData?.group ?? [];
  const paymodes = masterData?.paymodes ?? [];

  const { data: categories = [], isLoading: catsLoading } = usePosCategories(activeGroupId, menuOrderTypeId);
  const { data: masterCategoryList = [], refetch: refetchMasterCategoryList } = useCategories(
    undefined,
    undefined,
    canViewCategoryMaster
  );
  
  const { data: subCategories = [], isLoading: subsLoading } = usePosSubCategories(activeCategoryId);

  // In folder drill-down mode:
  // - If user clicked a specific subcategory, use activeSubCategoryId.
  // - If subcategories finished loading and there are none, fetch category products directly (subCategoryId: 0).
  // - Otherwise (viewing subcategories folder level, or subs still loading), effectiveSubCategoryId is null so products are not queried.
  const effectiveSubCategoryId = activeSubCategoryId !== null 
    ? activeSubCategoryId 
    : (!subsLoading && subCategories.length === 0 ? 0 : null);

  const { data: products = [], isLoading: prodsLoading } = usePosProductsList(activeCategoryId, effectiveSubCategoryId, menuOrderTypeId);

  const loading = groupsLoading || catsLoading || subsLoading || prodsLoading;
  const error = null;

  const queryClient = useQueryClient();

  // Real-time synchronization listener for cross-tab and local menu updates
  useEffect(() => {
    let lastHandledTimestamp = 0;

    const handleSync = () => {
      clearAllPosCache();
      void queryClient.invalidateQueries({ queryKey: POS_QUERY_KEYS.all, refetchType: "all" });
      void queryClient.refetchQueries({ queryKey: POS_QUERY_KEYS.all });
      void refreshMasterData();
      if (canViewCategoryMaster) {
        void queryClient.invalidateQueries({ queryKey: ["categories"] });
        void queryClient.refetchQueries({ queryKey: ["categories"] });
        void refetchMasterCategoryList();
      }
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
  }, [queryClient, refreshMasterData, refetchMasterCategoryList, canViewCategoryMaster]);

  // Sync masterData orderTypes to redux
  useEffect(() => {
    if (masterData?.orderTypes && masterData.orderTypes.length > 0) {
      dispatch(setOrderTypes(masterData.orderTypes));
    }
  }, [masterData?.orderTypes, dispatch]);

  // Menu session (menu time settings): the server lists only the sessions running now (master data, refreshed every
  // 30 s). Keep the selected one while it runs; when it ends or none is selected, move to the first running session;
  // when none is running, menu 0 (every category), as before for shops without sessions.
  useEffect(() => {
    if (menuTimes.length > 0) {
      if (!activeGroupId || !menuTimes.some((m) => m.menuId === activeGroupId)) {
        dispatch(setGroup(menuTimes[0].menuId));
      }
    } else if (groups.length > 0) {
      if (!activeGroupId || !groups.some((g) => g.groupId === activeGroupId)) {
        dispatch(setGroup(groups[0].groupId));
      }
    } else if (masterData && activeGroupId !== 0) {
      dispatch(setGroup(0));
    }
  }, [menuTimes, groups, activeGroupId, masterData, dispatch]);

  // Ensure categories remain visible even if no menu time is configured, if unassigned,
  // or if newly created in Category Master (even before products are added)
  // A provider order with the provider's own menu on shows ONLY the categories the server returns for that provider
  // (the ones with its products). The padding below (master data + Category Master) would put every category back.
  const providerOwnMenu = isProviderMenuOrderType(menuOrderTypeId) && getProviderOwnStatus(menuOrderTypeId);
  // A running menu session shows ONLY the categories allocated to it (Category Master → Menu), as the server returns
  // them for that session. The padding below is only for shops without menu sessions.
  const menuSessionActive = (activeGroupId ?? 0) > 0 && menuTimes.some((m) => m.menuId === activeGroupId);

  const displayCategories = useMemo(() => {
    if (providerOwnMenu || menuSessionActive) return (categories || []).filter((c) => c && c.id > 0);
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
  }, [categories, masterData?.category, masterCategoryList, providerOwnMenu, menuSessionActive]);

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


  // Keep productCache updated for the cart calculation selectors
  useEffect(() => {
    if (products.length > 0) {
      dispatch(cacheProducts(products));
    }
  }, [products, dispatch]);

  // ─── Search & Filtering ────────────────────────────────────────────────────

  const deferredSearch = useDeferredValue(search);
  
  const { lockedIds, refreshLockedProducts } = useLockedProducts();

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
    refreshLockedProducts,
  };
};
