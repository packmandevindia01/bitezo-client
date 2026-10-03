import { useState, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { recipeApi } from "../services/recipeApi";
import { productService } from "../../../inventory/product/services/productService";
import { subscribeToProductUpdates } from "../../../inventory/product/utils/productSync";
import { subscribeToBranchUpdates } from "../../../inventory/branches/utils/branchSync";
import { fetchBranchNames, fetchBranches } from "../../../inventory/branches/services/branchApi";
import { useAppDispatch, useAppSelector } from "../../../../app/hooks";
import { fetchGlobalBranches } from "../../../inventory/shared/store/masterDataSlice";

export const useRecipeList = () => {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const reduxBranches = useAppSelector((state) => state.masterData.branches);

  const [filters, setFilters] = useState({
    branchId: "",
    productId: "",
  });

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const { data: rawRecords = [], isLoading, error, refetch } = useQuery<any[]>({
    queryKey: ["recipeList", filters],
    queryFn: async (): Promise<any[]> => {
      const params: any = {};
      if (filters.branchId && filters.branchId !== "0") {
        params.BranchId = Number(filters.branchId);
      }
      if (filters.productId && filters.productId !== "0") {
        params.ProductId = Number(filters.productId);
      }
      const data = await recipeApi.getRecipeList(Object.keys(params).length > 0 ? params : undefined);
      return (data as any[]) || [];
    },
  });

  const records = useMemo(() => {
    return (rawRecords || []).map((r: any, idx: number) => ({
      ...r,
      sNo: r.sNo || idx + 1,
    }));
  }, [rawRecords]);

  const { data: queryBranches = [], refetch: refetchBranches } = useQuery({
    queryKey: ["recipeBranches"],
    queryFn: async () => {
      const branchMap = new Map<string, string>();

      const [branchMasterRes, directBranchesRes, recipeBranchesRes] = await Promise.allSettled([
        fetchBranches(),
        fetchBranchNames(true),
        recipeApi.getBranchList(),
      ]);

      if (branchMasterRes.status === "fulfilled" && Array.isArray(branchMasterRes.value)) {
        branchMasterRes.value.forEach((b: any) => {
          const id = String(b.id ?? b.branchId ?? "");
          const name = String(b.branchName ?? b.name ?? "");
          if (id && id !== "0" && name) {
            branchMap.set(id, name);
          }
        });
      }

      if (directBranchesRes.status === "fulfilled" && Array.isArray(directBranchesRes.value)) {
        directBranchesRes.value.forEach((b: any) => {
          const id = String(b.id ?? b.branchId ?? "");
          const name = String(b.branchName ?? b.name ?? "");
          if (id && id !== "0" && name && !branchMap.has(id)) {
            branchMap.set(id, name);
          }
        });
      }

      if (recipeBranchesRes.status === "fulfilled" && Array.isArray(recipeBranchesRes.value)) {
        recipeBranchesRes.value.forEach((b: any) => {
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
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });

  // Real-time synchronization for branch updates
  useEffect(() => {
    const unsubscribe = subscribeToBranchUpdates(() => {
      queryClient.removeQueries({ queryKey: ["recipeBranches"] });
      queryClient.invalidateQueries({ queryKey: ["recipeBranches"], refetchType: "all" });
      queryClient.invalidateQueries({ queryKey: ["branches"], refetchType: "all" });
      queryClient.invalidateQueries({ queryKey: ["branchNames"], refetchType: "all" });
      queryClient.invalidateQueries({ queryKey: ["allBranchesList"], refetchType: "all" });
      void refetchBranches();
      void dispatch(fetchGlobalBranches());
    });
    return () => unsubscribe();
  }, [queryClient, refetchBranches, dispatch]);

  // Ensure fresh branch data on mount
  useEffect(() => {
    queryClient.removeQueries({ queryKey: ["recipeBranches"] });
    queryClient.invalidateQueries({ queryKey: ["recipeBranches"], refetchType: "all" });
    queryClient.invalidateQueries({ queryKey: ["branches"], refetchType: "all" });
    void refetchBranches();
    void dispatch(fetchGlobalBranches());
  }, [queryClient, refetchBranches, dispatch]);

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

  const { data: products = [], refetch: refetchProducts } = useQuery({
    queryKey: ["recipeListProducts"],
    queryFn: async () => {
      const prodMap = new Map<string, string>();

      const [recipeFinishedRes, generalProductsRes, productListRes] = await Promise.allSettled([
        recipeApi.getFinishedProductListByName(""),
        productService.listName(""),
        productService.list({ branchId: 0 }),
      ]);

      if (recipeFinishedRes.status === "fulfilled" && Array.isArray(recipeFinishedRes.value)) {
        recipeFinishedRes.value.forEach((p: any) => {
          const id = String(p.productId ?? p.id ?? "");
          if (id && id !== "0") {
            const code = p.barcode || p.code || "";
            const name = p.productName || p.name || "";
            const label = code ? `[${code}] ${name}` : name;
            prodMap.set(id, label);
          }
        });
      }

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
      queryClient.invalidateQueries({ queryKey: ["recipeListProducts"] });
      queryClient.invalidateQueries({ queryKey: ["recipeFinishedProducts"] });
      queryClient.invalidateQueries({ queryKey: ["finishedProducts"] });
      void refetchProducts();
    });
    return () => unsubscribe();
  }, [queryClient, refetchProducts]);

  // Ensure fresh product data on mount
  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ["recipeListProducts"] });
    queryClient.invalidateQueries({ queryKey: ["recipeFinishedProducts"] });
    queryClient.invalidateQueries({ queryKey: ["finishedProducts"] });
    void refetchProducts();
  }, [queryClient, refetchProducts]);

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
