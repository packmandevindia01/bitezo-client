/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { productionApi } from "../services/productionApi";
import type { SearchableOption } from "../../../../components/common/Searchableselect";
import { useBranchScope } from "../../../../hooks/useBranchScope";

export const useProductionList = () => {
  const { isBranchLocked, initialBranchId } = useBranchScope();
  const [filters, setFilters] = useState({
    branchId: initialBranchId ? String(initialBranchId) : "",
    isBranchLocked,
    productId: ""
  });

  const { data: branches = [] } = useQuery<SearchableOption[]>({
    queryKey: ["branches"],
    queryFn: async () => {
      const branchRes = await productionApi.getBranchList();
      return branchRes.map((b: any) => ({ label: b.branchName, value: String(b.branchId) }));
    }
  });

  const { data: products = [] } = useQuery<SearchableOption[]>({
    queryKey: ["finishedProducts"],
    queryFn: async () => {
      const prodRes = await productionApi.getFinishedProductListByName("");
      return prodRes.map((p: any) => ({ label: p.productName, value: String(p.productId) }));
    }
  });

  const { data: records = [], isLoading: loading, error, refetch } = useQuery({
    queryKey: ["productionList", filters.branchId, filters.productId],
    queryFn: async () => {
      const data = await productionApi.getProductionDetails({
        BranchId: filters.branchId ? parseInt(filters.branchId, 10) : undefined,
        ProductId: filters.productId ? parseInt(filters.productId, 10) : undefined
      });
      return (data || []).sort((a: any, b: any) => {
        return (b.transId || b.id || b.productionId || 0) - (a.transId || a.id || a.productionId || 0);
      });
    }
  });

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  return {
    records,
    loading,
    error: error ? (error as Error).message : null,
    filters,
    handleFilterChange,
    branches,
    products,
    fetchList: refetch
  };
};
