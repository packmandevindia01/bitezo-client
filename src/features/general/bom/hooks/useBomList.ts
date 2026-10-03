import { useState, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { bomApi } from "../services/bomApi";
import type { SearchableOption } from "../../../../components/common/Searchableselect";
import { subscribeToBranchUpdates } from "../../../inventory/branches/utils/branchSync";
import { fetchBranchNames, fetchBranches } from "../../../inventory/branches/services/branchApi";
import { subscribeToProductUpdates } from "../../../inventory/product/utils/productSync";
import { productService } from "../../../inventory/product/services/productService";
import { useAppDispatch, useAppSelector } from "../../../../app/hooks";
import { fetchGlobalBranches } from "../../../inventory/shared/store/masterDataSlice";

export const useBomList = () => {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const reduxBranches = useAppSelector((state) => state.masterData.branches);

  // Filter state
  const [filters, setFilters] = useState({
    branchId: "",
    productId: "",
    unitId: ""
  });

  // 1. Branches Query
  const { data: queryBranches = [] } = useQuery<SearchableOption[]>({
    queryKey: ["bomBranches"],
    queryFn: async () => {
      const branchMap = new Map<string, string>();

      // Concurrently query all available branch endpoints to ensure newly created branches are always present
      const [branchMasterRes, directBranchesRes, bomBranchesRes] = await Promise.allSettled([
        fetchBranches(),
        fetchBranchNames(true),
        bomApi.getBranchList(),
      ]);

      // 1. Process fetchBranches() (direct Branch Master list - contains all newly created branches)
      if (branchMasterRes.status === "fulfilled" && Array.isArray(branchMasterRes.value)) {
        branchMasterRes.value.forEach((b: any) => {
          const id = String(b.id ?? b.branchId ?? "");
          const name = String(b.branchName ?? b.name ?? "");
          if (id && id !== "0" && name) {
            branchMap.set(id, name);
          }
        });
      }

      // 2. Process directBranches (/Branch/true/list-name)
      if (directBranchesRes.status === "fulfilled" && Array.isArray(directBranchesRes.value)) {
        directBranchesRes.value.forEach((b: any) => {
          const id = String(b.id ?? b.branchId ?? "");
          const name = String(b.branchName ?? b.name ?? "");
          if (id && id !== "0" && name && !branchMap.has(id)) {
            branchMap.set(id, name);
          }
        });
      }

      // 3. Process bomApi.getBranchList()
      if (bomBranchesRes.status === "fulfilled" && Array.isArray(bomBranchesRes.value)) {
        bomBranchesRes.value.forEach((b: any) => {
          const id = String(b.branchId ?? b.id ?? "");
          const name = String(b.branchName ?? b.name ?? "");
          if (id && id !== "0" && name && !branchMap.has(id)) {
            branchMap.set(id, name);
          }
        });
      }

      return Array.from(branchMap.entries()).map(([value, label]) => ({
        label,
        value,
      }));
    },
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });

  // Real-time synchronization for branch updates (same-tab CustomEvent + cross-tab BroadcastChannel/storage)
  useEffect(() => {
    const unsubscribe = subscribeToBranchUpdates(() => {
      // resetQueries atomically clears cached data and re-fetches for any active subscriber
      void queryClient.resetQueries({ queryKey: ["bomBranches"] });
      queryClient.invalidateQueries({ queryKey: ["branches"], refetchType: "all" });
      queryClient.invalidateQueries({ queryKey: ["branchNames"], refetchType: "all" });
      queryClient.invalidateQueries({ queryKey: ["allBranchesList"], refetchType: "all" });
      void dispatch(fetchGlobalBranches());
    });
    return () => unsubscribe();
  }, [queryClient, dispatch]);

  // Ensure fresh branch data on every mount.
  // Covers the timing gap where: branch is created → notifyBranchesUpdated fires →
  // user navigates to BOM list (BomListPage not yet mounted, so event was missed) →
  // on-mount reset guarantees a fresh fetch regardless of any cached state.
  useEffect(() => {
    void queryClient.resetQueries({ queryKey: ["bomBranches"] });
    queryClient.invalidateQueries({ queryKey: ["branches"], refetchType: "all" });
    void dispatch(fetchGlobalBranches());
  }, [queryClient, dispatch]);

  // Merge query branches with live Redux masterData branches
  const branches = useMemo(() => {
    const branchMap = new Map<string, string>();

    (queryBranches || []).forEach((b: any) => {
      const id = String(b.value ?? b.id ?? b.branchId ?? "");
      const name = String(b.label ?? b.branchName ?? b.name ?? "");
      if (id && id !== "0" && name) {
        branchMap.set(id, name);
      }
    });

    (reduxBranches || []).forEach((b: any) => {
      const id = String(b.id ?? b.branchId ?? "");
      const name = String(b.name ?? b.branchName ?? "");
      if (id && id !== "0" && name && !branchMap.has(id)) {
        branchMap.set(id, name);
      }
    });

    return Array.from(branchMap.entries()).map(([value, label]) => ({
      label,
      value,
    }));
  }, [queryBranches, reduxBranches]);

  // 2. Finished Products Query
  const { data: products = [], refetch: refetchProducts } = useQuery<SearchableOption[]>({
    queryKey: ["bomFinishedProducts"],
    queryFn: async () => {
      const prodMap = new Map<string, string>();

      // Concurrently query BOM finished products, general product master list, and product list
      const [bomFinishedRes, generalProductsRes, productListRes] = await Promise.allSettled([
        bomApi.getFinishedProductListByName(""),
        productService.listName(""),
        productService.list({ branchId: 0 }),
      ]);

      // 1. Process bomApi.getFinishedProductListByName("")
      if (bomFinishedRes.status === "fulfilled" && Array.isArray(bomFinishedRes.value)) {
        bomFinishedRes.value.forEach((p: any) => {
          const id = String(p.productId ?? p.id ?? "");
          if (id && id !== "0") {
            const code = p.barcode || p.code || "";
            const name = p.productName || p.name || "";
            const label = code ? `[${code}] ${name}` : name;
            prodMap.set(id, label);
          }
        });
      }

      // 2. Process product list from productService.list()
      if (productListRes.status === "fulfilled" && Array.isArray(productListRes.value)) {
        productListRes.value.forEach((p: any) => {
          const id = String(p.productId ?? p.id ?? "");
          if (id && id !== "0") {
            const code = p.barcode || p.code || "";
            const name = p.name || p.productName || "";
            const label = code ? `[${code}] ${name}` : name;
            if (!prodMap.has(id)) {
              prodMap.set(id, label);
            } else if (code) {
              prodMap.set(id, label);
            }
          }
        });
      }

      // 3. Process general products from productService.listName()
      if (generalProductsRes.status === "fulfilled" && Array.isArray(generalProductsRes.value)) {
        generalProductsRes.value.forEach((p: any) => {
          const id = String(p.productId ?? p.id ?? "");
          if (id && id !== "0" && !prodMap.has(id)) {
            const name = p.productName || p.name || "";
            prodMap.set(id, name);
          }
        });
      }

      return Array.from(prodMap.entries()).map(([value, label]) => ({
        label,
        value,
      }));
    },
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });

  // Real-time synchronization for product updates
  useEffect(() => {
    const unsubscribe = subscribeToProductUpdates(() => {
      queryClient.invalidateQueries({ queryKey: ["bomFinishedProducts"] });
      queryClient.invalidateQueries({ queryKey: ["finishedProducts"] });
      void refetchProducts();
    });
    return () => unsubscribe();
  }, [queryClient, refetchProducts]);

  // Ensure fresh product data on mount
  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ["bomFinishedProducts"] });
    queryClient.invalidateQueries({ queryKey: ["finishedProducts"] });
    void refetchProducts();
  }, [queryClient, refetchProducts]);

  // 3. Dynamic Units Query based on Branch and Product selections
  const { data: units = [] } = useQuery<SearchableOption[]>({
    queryKey: ["bomListUnits", filters.branchId, filters.productId],
    queryFn: async () => {
      if (!filters.branchId || !filters.productId) return [];
      const pId = parseInt(filters.productId, 10);
      const bId = parseInt(filters.branchId, 10);
      const prods = await bomApi.getFinishedProductListByName("").catch(() => []);
      const prod = (prods || []).find(p => p.productId === pId);
      let bc = prod?.barcode || prod?.code || "";
      if (!bc) {
        try {
          const costData = await bomApi.getProductCostDataById(pId);
          bc = costData?.productCode || "";
        } catch {}
      }
      if (bc) {
        const u = await bomApi.getProductUnitData(bId, bc).catch(() => null);
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
