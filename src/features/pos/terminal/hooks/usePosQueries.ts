import { useQuery } from '@tanstack/react-query';
import { menuApi } from '../../services/menuApi';

// ============================================================================
// POS Terminal React Query Engine
// ============================================================================
// This completely replaces the manual caching in `usePosProducts.ts` and
// removes Server State from Redux in accordance with the Golden Architecture Rule.
// 
// Configuration:
// - staleTime: Infinity -> Data is fetched exactly once per POS session (mimics old cache).
// - gcTime: 24h -> Prevents garbage collection during a cashier's shift.
// - refetchOnWindowFocus: false -> Prevents aggressive refetching when switching browser tabs.
// ============================================================================

const CACHE_CONFIG = {
  staleTime: Infinity,
  gcTime: 24 * 60 * 60 * 1000, 
  refetchOnWindowFocus: false,
};

export const POS_QUERY_KEYS = {
  all: ['pos'] as const,
  masterData: () => [...POS_QUERY_KEYS.all, 'masterData'] as const,
  categories: (groupId: number, orderTypeId: number) => [...POS_QUERY_KEYS.all, 'categories', groupId, orderTypeId] as const,
  subCategories: (categoryId: number) => [...POS_QUERY_KEYS.all, 'subCategories', categoryId] as const,
  products: (categoryId: number, subCategoryId: number, orderTypeId: number) => 
    [...POS_QUERY_KEYS.all, 'products', categoryId, subCategoryId, orderTypeId] as const,
};

/**
 * 1. Fetches initial master data (Groups and Order Types)
 */
export const usePosMasterData = () => {
  return useQuery({
    queryKey: POS_QUERY_KEYS.masterData(),
    queryFn: () => menuApi.getMasterData(),
    ...CACHE_CONFIG,
  });
};

/**
 * 2. Fetches Categories based on active Group and Order Type
 */
export const usePosCategories = (groupId: number | null | undefined, orderTypeId: number | undefined) => {
  return useQuery({
    queryKey: POS_QUERY_KEYS.categories(groupId!, orderTypeId || 1),
    queryFn: () => menuApi.getGroupCategories(groupId!, orderTypeId || 1),
    enabled: !!groupId, // Only fetch if a group is actually selected
    ...CACHE_CONFIG,
  });
};

/**
 * 3. Fetches SubCategories based on active Category
 */
export const usePosSubCategories = (categoryId: number | null | undefined) => {
  return useQuery({
    queryKey: POS_QUERY_KEYS.subCategories(categoryId!),
    queryFn: () => menuApi.getSubCategories(categoryId!),
    enabled: !!categoryId,
    ...CACHE_CONFIG,
  });
};

/**
 * 4. Fetches Products based on Category, SubCategory, and Order Type
 */
export const usePosProductsList = (
  categoryId: number | null | undefined, 
  subCategoryId: number | null | undefined, 
  orderTypeId: number | undefined
) => {
  return useQuery({
    // If subCategoryId is null, we pass 0 to the API as per previous logic
    queryKey: POS_QUERY_KEYS.products(categoryId!, subCategoryId ?? 0, orderTypeId || 1),
    queryFn: () => menuApi.getProducts(categoryId!, subCategoryId ?? 0, orderTypeId || 1),
    enabled: !!categoryId, // Must have a category to fetch products
    ...CACHE_CONFIG,
  });
};
