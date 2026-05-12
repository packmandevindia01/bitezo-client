import { useCallback, useDeferredValue, useEffect, useMemo } from "react";
import { useAppDispatch, useAppSelector } from "../../../../app/hooks";
import {
  setCategory,
  setSearch,
  setGroups,
  setGroup,
  setCategories,
  setSubCategories,
  setSubCategory,
  setProducts,
  setLoading,
  setError
} from "../store/posSlice";
import { menuApi } from "../../services/menuApi";

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
    dispatch(setLoading(true));
    try {
      const data = await menuApi.getGroupCategories(groupId);
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
    dispatch(setProducts(data));
  }, [dispatch]);

  const fetchSubCategories = useCallback(async (categoryId: number) => {
    dispatch(setLoading(true));
    try {
      const data = await menuApi.getSubCategories(categoryId);
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
    dispatch(setLoading(true));
    try {
      const data = await menuApi.getProducts(catId, subCatId);
      dispatch(setProducts(data));
    } catch (err: any) {
      console.error(err);
    } finally {
      dispatch(setLoading(false));
    }
  }, [dispatch]);

  // ─── Effects ───────────────────────────────────────────────────────────────

  useEffect(() => {
    if (groups.length === 0) {
      fetchMasterData();
    }
  }, [fetchMasterData, groups.length]);

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
