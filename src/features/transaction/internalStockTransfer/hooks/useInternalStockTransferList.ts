import { useEffect, useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { internalStockTransferApi } from "../services/internalStockTransferApi";
import { getDecimalPart } from "../../../../utils/currency";
import { useBranchScope } from "../../../../hooks/useBranchScope";
import { fetchBranches, fetchBranchNames } from "../../../inventory/branches/services/branchApi";
import { subscribeToBranchUpdates } from "../../../inventory/branches/utils/branchSync";
import { useAppSelector, useAppDispatch } from "../../../../app/hooks";
import { fetchGlobalBranches } from "../../../inventory/shared/store/masterDataSlice";

export const useInternalStockTransferList = () => {
  const queryClient = useQueryClient();
  const dispatch = useAppDispatch();
  const reduxBranches = useAppSelector((state: any) => state.masterData.branches);
  const { isBranchLocked, initialBranchId } = useBranchScope();
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({
    branchId: initialBranchId ? String(initialBranchId) : "",
    isBranchLocked,
    fromDate: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split("T")[0],
    toDate: new Date().toISOString().split("T")[0],
  });

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const { data: branches = [], refetch: refetchBranches } = useQuery({
    queryKey: ["internalStockTransferBranches"],
    queryFn: async () => {
      const branchMap = new Map<string, string>();

      const [branchMasterRes, directBranchesTrueRes, directBranchesFalseRes, istBranchesRes] = await Promise.allSettled([
        fetchBranches(),
        fetchBranchNames(true),
        fetchBranchNames(false),
        internalStockTransferApi.getFromBranches(),
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

      if (istBranchesRes.status === "fulfilled" && Array.isArray(istBranchesRes.value)) {
        istBranchesRes.value.forEach((b: any) => {
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
    void queryClient.invalidateQueries({ queryKey: ["internalStockTransferBranches"], refetchType: "all" });
    void refetchBranches();
  }, [dispatch, queryClient, refetchBranches]);

  // Real-time synchronization for branch creation/updates across tabs and same window
  useEffect(() => {
    return subscribeToBranchUpdates(() => {
      void dispatch(fetchGlobalBranches());
      void queryClient.invalidateQueries({ queryKey: ["internalStockTransferBranches"], refetchType: "all" });
      void refetchBranches();
    });
  }, [dispatch, queryClient, refetchBranches]);

  const { data: rawRecords = [], isLoading: loading, error } = useQuery({
    queryKey: ["internalStockTransferList", filters],
    queryFn: async () => {
      const params: any = {
        Decimals: getDecimalPart(),
      };
      if (filters.branchId) params.FromBranchId = parseInt(filters.branchId, 10);
      if (filters.fromDate) params.FromDate = filters.fromDate;
      if (filters.toDate) params.ToDate = filters.toDate;

      const data = await internalStockTransferApi.getTransferList(params);
      return (data || []).sort((a: any, b: any) => {
        const dateA = new Date(a.transDate).getTime();
        const dateB = new Date(b.transDate).getTime();
        if (dateA !== dateB) return dateB - dateA;
        return (b.transId || 0) - (a.transId || 0);
      });
    },
  });

  const records = rawRecords.filter((record: any) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      (record.refNo && String(record.refNo).toLowerCase().includes(term)) ||
      (record.fromBranch && String(record.fromBranch).toLowerCase().includes(term)) ||
      (record.toBranch && String(record.toBranch).toLowerCase().includes(term))
    );
  });

  return {
    records,
    loading,
    error: error ? (error as Error).message : null,
    filters,
    handleFilterChange,
    branches: resolvedBranches,
    searchTerm,
    setSearchTerm,
  };
};
