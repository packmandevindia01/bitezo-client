import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { recipeApi } from "../services/recipeApi";

export const useRecipeList = () => {
  const [filters, setFilters] = useState({
    branchId: "",
    productId: "",
  });

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const { data: records = [], isLoading, error, refetch } = useQuery({
    queryKey: ["recipeList", filters],
    queryFn: async () => {
      // In a real app, pass filters to the API
      const data = await recipeApi.getRecipeList();
      return data;
    },
  });

  const { data: branches = [] } = useQuery({
    queryKey: ["branches"],
    queryFn: async () => {
      const bl = await recipeApi.getBranchList();
      return bl.map((b: any) => ({ label: b.branchName, value: String(b.branchId) }));
    }
  });

  const { data: products = [] } = useQuery({
    queryKey: ["finishedProducts"],
    queryFn: async () => {
      const fp = await recipeApi.getFinishedProductListByName("");
      return fp.map((p: any) => ({ label: p.productName, value: String(p.productId) }));
    }
  });

  return {
    records,
    loading: isLoading,
    error: error ? (error as Error).message : null,
    filters,
    branches,
    products,
    handleFilterChange,
    fetchList: refetch,
  };
};
