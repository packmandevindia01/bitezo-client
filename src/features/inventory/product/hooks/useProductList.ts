import { useCallback, useEffect, useMemo, useState } from "react";
import { productService } from "../services/productService";
import type { ProductListItem } from "../types";

export const useProductList = () => {
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const fetchProducts = useCallback(async () => {
    setListLoading(true);
    setListError(null);
    try {
      const data = await productService.list();
      setProducts(data);
    } catch (err) {
      setListError(err instanceof Error ? err.message : "Failed to load products.");
    } finally {
      setListLoading(false);
    }
  }, []);

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    
    const filtered = query
      ? products.filter((p) =>
          [p.name, p.code, p.category, p.group].some((v) =>
            v?.toLowerCase().includes(query)
          )
        )
      : [...products];

    return filtered
      .sort((a, b) => b.productId - a.productId)
      .map((p, index) => ({
        ...p,
        sNo: index + 1,
      }));
  }, [products, search]);

  return {
    products,
    listLoading,
    listError,
    search,
    setSearch,
    fetchProducts,
    filteredProducts,
  };
};
