import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { bomApi } from "../services/bomApi";
import type { SearchableOption } from "../../../../components/common/Searchableselect";

export const useBomList = () => {
  // Filter state
  const [filters, setFilters] = useState({
    branchId: "",
    productId: "",
    unitId: ""
  });

  // 1. Branches Query
  const { data: branches = [] } = useQuery<SearchableOption[]>({
    queryKey: ["branches"],
    queryFn: async () => {
      const branchRes = await bomApi.getBranchList();
      return branchRes.map(b => ({ label: b.branchName, value: String(b.branchId) }));
    }
  });

  // 2. Finished Products Query
  const { data: products = [] } = useQuery<SearchableOption[]>({
    queryKey: ["finishedProducts"],
    queryFn: async () => {
      const prodRes = await bomApi.getFinishedProductListByName("");
      return prodRes.map(p => ({
        label: p.barcode || p.code ? `[${p.barcode || p.code}] ${p.productName}` : p.productName,
        value: String(p.productId),
        code: p.barcode || p.code || ""
      }));
    }
  });

  // 3. Dynamic Units Query based on Branch and Product selections
  const { data: units = [] } = useQuery<SearchableOption[]>({
    queryKey: ["bomListUnits", filters.branchId, filters.productId],
    queryFn: async () => {
      if (!filters.branchId || !filters.productId) return [];
      const pId = parseInt(filters.productId, 10);
      const bId = parseInt(filters.branchId, 10);
      const prods = await bomApi.getFinishedProductListByName("");
      const prod = prods.find(p => p.productId === pId);
      if (prod && (prod.barcode || prod.code)) {
        const u = await bomApi.getProductUnitData(bId, prod.barcode || prod.code);
        if (u) {
          return [{ label: u.unitCategory || "Unit", value: String(u.unitId) }];
        }
      }
      return [];
    },
    enabled: !!filters.branchId && !!filters.productId
  });

  // 4. BOM Records Query - auto-fetches when filters change
  const { data: records = [], isLoading: loading, error, refetch } = useQuery({
    queryKey: ["bomList", filters.branchId, filters.productId, filters.unitId],
    queryFn: async () => {
      const data = await bomApi.getBomDetails({
        BranchId: filters.branchId ? parseInt(filters.branchId, 10) : undefined,
        ProductId: filters.productId ? parseInt(filters.productId, 10) : undefined,
        UnitId: filters.unitId ? parseInt(filters.unitId, 10) : undefined
      });
      return (data || []).sort((a: any, b: any) => {
        const dateA = new Date(a.transDate || a.createdAt || a.date || 0).getTime();
        const dateB = new Date(b.transDate || b.createdAt || b.date || 0).getTime();
        if (dateA !== dateB) return dateB - dateA;
        return (b.transId || b.id || b.bomId || 0) - (a.transId || a.id || a.bomId || 0);
      });
    }
  });

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ 
      ...prev, 
      [key]: value,
      // Reset unit filter if product or branch changes
      ...(key !== "unitId" ? { unitId: "" } : {})
    }));
  };

  return {
    records,
    loading,
    error: error ? (error as Error).message : null,
    filters,
    handleFilterChange,
    branches,
    products,
    units,
    fetchList: refetch
  };
};
