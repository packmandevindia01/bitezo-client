import { useEffect, useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { stockAdjustmentApi } from "../services/stockAdjustmentApi";
import { useBranchScope } from "../../../../hooks/useBranchScope";
import { fetchBranches, fetchBranchNames } from "../../../inventory/branches/services/branchApi";
import { subscribeToBranchUpdates } from "../../../inventory/branches/utils/branchSync";
import { useAppSelector, useAppDispatch } from "../../../../app/hooks";
import { fetchGlobalBranches } from "../../../inventory/shared/store/masterDataSlice";

export const useStockAdjustmentList = () => {
  const queryClient = useQueryClient();
  const dispatch = useAppDispatch();
  const reduxBranches = useAppSelector((state: any) => state.masterData.branches);
  const { isBranchLocked, initialBranchId } = useBranchScope();
  const [filters, setFilters] = useState({
    branchId: initialBranchId ? String(initialBranchId) : "",
    isBranchLocked,
    fromDate: new Date(new Date().setDate(1)).toISOString().split("T")[0], 
    toDate: new Date().toISOString().split("T")[0],
  });

  const { data: branches = [], refetch: refetchBranches } = useQuery({
    queryKey: ["stockAdjustmentBranches"],
    queryFn: async () => {
      const branchMap = new Map<string, string>();

      const [branchMasterRes, directBranchesTrueRes, directBranchesFalseRes, saBranchesRes] = await Promise.allSettled([
        fetchBranches(),
        fetchBranchNames(true),
        fetchBranchNames(false),
        stockAdjustmentApi.getBranchList(),
      ]);

      if (branchMasterRes.status === "fulfilled" && Array.isArray(branchMasterRes.value)) {
        branchMasterRes.value.forEach((b: any) => {
          const id = String(b.id ?? b.branchId ?? b.BranchId ?? b.Id ?? "");
          const name = String(b.branchName ?? b.BranchName ?? b.name ?? b.Name ?? "");
          if (id && id !== "0" && name) {
            branchMap.set(id, name);
          }
        });
      }

      if (directBranchesTrueRes.status === "fulfilled" && Array.isArray(directBranchesTrueRes.value)) {
        directBranchesTrueRes.value.forEach((b: any) => {
          const id = String(b.id ?? b.branchId ?? b.BranchId ?? b.Id ?? "");
          const name = String(b.branchName ?? b.BranchName ?? b.name ?? b.Name ?? "");
          if (id && id !== "0" && name && !branchMap.has(id)) {
            branchMap.set(id, name);
          }
        });
      }

      if (directBranchesFalseRes.status === "fulfilled" && Array.isArray(directBranchesFalseRes.value)) {
        directBranchesFalseRes.value.forEach((b: any) => {
          const id = String(b.id ?? b.branchId ?? b.BranchId ?? b.Id ?? "");
          const name = String(b.branchName ?? b.BranchName ?? b.name ?? b.Name ?? "");
          if (id && id !== "0" && name && !branchMap.has(id)) {
            branchMap.set(id, name);
          }
        });
      }

      if (saBranchesRes.status === "fulfilled" && Array.isArray(saBranchesRes.value)) {
        saBranchesRes.value.forEach((b: any) => {
          const id = String(b.branchId ?? b.BranchId ?? b.id ?? b.Id ?? "");
          const name = String(b.branchName ?? b.BranchName ?? b.name ?? b.Name ?? "");
          if (id && id !== "0" && name && !branchMap.has(id)) {
            branchMap.set(id, name);
          }
        });
      }

      // Merge Redux branches (from addMasterBranch)
      if (Array.isArray(reduxBranches)) {
        reduxBranches.forEach((b: any) => {
          const id = String(b.id ?? b.branchId ?? b.BranchId ?? b.Id ?? "");
          const name = String(b.name ?? b.branchName ?? b.BranchName ?? b.Name ?? "");
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
    initialData: () => {
      if (Array.isArray(reduxBranches) && reduxBranches.length > 0) {
        return reduxBranches
          .map((b: any) => ({
            label: b.name || b.branchName || b.BranchName || "",
            value: String(b.id || b.branchId || b.BranchId || ""),
          }))
          .filter((b: any) => b.value && b.value !== "0");
      }
      return [];
    },
    initialDataUpdatedAt: 0,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });

  const fallbackBranches = useMemo(() => {
    if (Array.isArray(reduxBranches) && reduxBranches.length > 0) {
      return reduxBranches
        .map((b: any) => ({
          label: b.name || b.branchName || b.BranchName || "",
          value: String(b.id || b.branchId || b.BranchId || "")
        }))
        .filter((b: any) => b.value && b.value !== "0");
    }
    return [];
  }, [reduxBranches]);

  const resolvedBranches = useMemo(() => {
    const branchMap = new Map<string, string>();
    (branches || []).forEach((b: any) => {
      const id = String(b.value ?? b.id ?? "");
      const label = String(b.label ?? b.name ?? b.branchName ?? "");
      if (id && id !== "0" && label) {
        branchMap.set(id, label);
      }
    });
    (fallbackBranches || []).forEach((b: any) => {
      const id = String(b.value ?? b.id ?? "");
      const label = String(b.label ?? b.name ?? b.branchName ?? "");
      if (id && id !== "0" && label && !branchMap.has(id)) {
        branchMap.set(id, label);
      }
    });
    return Array.from(branchMap.entries()).map(([value, label]) => ({ value, label }));
  }, [branches, fallbackBranches]);

  // Always re-fetch branches on mount so newly created branches appear immediately
  useEffect(() => {
    void dispatch(fetchGlobalBranches());
    void queryClient.invalidateQueries({ queryKey: ["stockAdjustmentBranches"], refetchType: "all" });
    void refetchBranches();
  }, [dispatch, queryClient, refetchBranches]);

  // Real-time synchronization for branch creation/updates across tabs and same window
  useEffect(() => {
    return subscribeToBranchUpdates(() => {
      void dispatch(fetchGlobalBranches());
      void queryClient.invalidateQueries({ queryKey: ["stockAdjustmentBranches"], refetchType: "all" });
      void refetchBranches();
    });
  }, [dispatch, queryClient, refetchBranches]);

  const { data: records = [], isLoading: loading, error, refetch } = useQuery({
    queryKey: ["stockAdjustmentList", filters.branchId, filters.fromDate, filters.toDate],
    queryFn: async () => {
      const data = await stockAdjustmentApi.getStockAdjustmentDetails({
        BranchId: filters.branchId ? parseInt(filters.branchId, 10) : undefined,
        FromDate: filters.fromDate || undefined,
        ToDate: filters.toDate || undefined,
        Decimals: 3
      });
      return (data || []).sort((a: any, b: any) => {
        const dateA = new Date(a.transDate).getTime();
        const dateB = new Date(b.transDate).getTime();
        if (dateA !== dateB) return dateB - dateA;
        return (b.transId || 0) - (a.transId || 0);
      });
    }
  });

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  return {
    records,
    loading,
    error: error ? error.message : null,
    filters,
    handleFilterChange,
    fetchList: refetch,
    branches: resolvedBranches
  };
};
