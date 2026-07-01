import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { productService } from "../services/productService";

export const useProductList = () => {
  const [search, setSearch] = useState("");

  const { data: products = [], isLoading: listLoading, error, refetch: fetchProducts } = useQuery({
    queryKey: ["productsList"],
    queryFn: () => productService.list(),
  });

  const listError = error ? (error instanceof Error ? error.message : "Failed to load products.") : null;

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
