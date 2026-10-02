import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { bomApi } from "../services/bomApi";
import type { SearchableOption } from "../../../../components/common/Searchableselect";
import { subscribeToBranchUpdates } from "../../../inventory/branches/utils/branchSync";
import { fetchBranchNames, fetchBranches } from "../../../inventory/branches/services/branchApi";

export const useBomList = () => {
  const queryClient = useQueryClient();

  // Filter state
  const [filters, setFilters] = useState({
    branchId: "",
    productId: "",
    unitId: ""
  });

  // 1. Branches Query
  const { data: branches = [], refetch: refetchBranches } = useQuery<SearchableOption[]>({
    queryKey: ["branches"],
    queryFn: async () => {
      const branchMap = new Map<string, string>();

      // 1. Try bomApi.getBranchList()
      try {
        const branchRes = await bomApi.getBranchList();
        if (Array.isArray(branchRes)) {
          branchRes.forEach((b: any) => {
            const id = String(b.branchId ?? b.id ?? "");
            const name = String(b.branchName ?? b.name ?? "");
            if (id && id !== "0" && name) {
              branchMap.set(id, name);
            }
          });
        }
      } catch (err) {
        console.warn("Failed to fetch branches from bomApi.getBranchList:", err);
      }

      // 2. Resiliently merge from direct Branch Master list
      try {
        const directBranches = await fetchBranchNames(true);
        if (Array.isArray(directBranches)) {
          directBranches.forEach((b: any) => {
            const id = String(b.id ?? b.branchId ?? "");
            const name = String(b.branchName ?? b.name ?? "");
            if (id && id !== "0" && name && !branchMap.has(id)) {
              branchMap.set(id, name);
            }
          });
        }
      } catch (err) {
        console.warn("Failed to fetch branches from fetchBranchNames:", err);
      }

      // 3. Fallback to fetchBranches() if empty
      if (branchMap.size === 0) {
        try {
          const fallback = await fetchBranches();
          if (Array.isArray(fallback)) {
            fallback.forEach((b: any) => {
              const id = String(b.id ?? b.branchId ?? "");
              const name = String(b.branchName ?? b.name ?? "");
              if (id && id !== "0" && name && !branchMap.has(id)) {
                branchMap.set(id, name);
              }
            });
          }
        } catch (err) {
          console.warn("Failed to fetch branches from fetchBranches:", err);
        }
      }

      return Array.from(branchMap.entries()).map(([value, label]) => ({
        label,
        value,
      }));
    },
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });

  // Real-time synchronization for branch updates
  useEffect(() => {
    const unsubscribe = subscribeToBranchUpdates(() => {
      queryClient.invalidateQueries({ queryKey: ["branches"] });
      queryClient.invalidateQueries({ queryKey: ["branchNames"] });
      queryClient.invalidateQueries({ queryKey: ["allBranchesList"] });
      void refetchBranches();
    });
    return () => unsubscribe();
  }, [queryClient, refetchBranches]);

  // Ensure fresh branch data on mount
  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ["branches"] });
    void refetchBranches();
  }, [queryClient, refetchBranches]);

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
