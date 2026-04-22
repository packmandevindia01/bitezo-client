import { useDeferredValue, useMemo } from "react";
import { useAppDispatch, useAppSelector } from "../../../app/hooks";
import {
  POS_CATEGORIES,
  POS_PRODUCTS,
} from "../constants";
import {
  setCategory,
  setSearch,
} from "../store/posSlice";

export const usePosProducts = () => {
  const dispatch = useAppDispatch();
  const { activeCategoryId, search } = useAppSelector((state) => state.pos);

  // Deferred search for smooth typing in high-density grids
  const deferredSearch = useDeferredValue(search);
  
  const visibleProducts = useMemo(() => {
    const normalizedSearch = deferredSearch.trim().toLowerCase();
    return POS_PRODUCTS.filter((product) => {
      const matchesCategory = product.categoryId === activeCategoryId;
      const matchesSearch =
        normalizedSearch.length === 0 || product.name.toLowerCase().includes(normalizedSearch);
      return matchesCategory && matchesSearch;
    });
  }, [activeCategoryId, deferredSearch]);

  const activeCategory = POS_CATEGORIES.find((category) => category.id === activeCategoryId);

  return {
    categories: POS_CATEGORIES,
    activeCategory,
    activeCategoryId,
    search,
    visibleProducts,
    setActiveCategoryId: (id: string) => dispatch(setCategory(id)),
    setSearch: (val: string) => dispatch(setSearch(val)),
  };
};
