import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { physicalEntryApi } from "../services/physicalEntryApi";
import { useBranchScope } from "../../../../hooks/useBranchScope";
import { fetchBranches, fetchBranchNames } from "../../../inventory/branches/services/branchApi";
import { subscribeToBranchUpdates } from "../../../inventory/branches/utils/branchSync";
import { useAppSelector, useAppDispatch } from "../../../../app/hooks";
import { fetchGlobalBranches } from "../../../inventory/shared/store/masterDataSlice";

const toYYYYMMDD = (val?: string): string | undefined => {
  if (!val) return undefined;
  if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
  const parts = val.split(/[-/]/);
  if (parts.length === 3 && parts[0].length === 2 && parts[2].length === 4) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  try {
    const d = new Date(val);
    if (!isNaN(d.getTime())) return d.toISOString().split("T")[0];
  } catch {}
  return val;
};

export const usePhysicalEntryList = () => {
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
    queryKey: ["physicalEntryBranches"],
    queryFn: async () => {
      const branchMap = new Map<string, string>();

      const [branchMasterRes, directBranchesTrueRes, directBranchesFalseRes, peBranchesRes] = await Promise.allSettled([
        fetchBranches(),
        fetchBranchNames(true),
        fetchBranchNames(false),
        physicalEntryApi.getBranchList(),
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

      if (directBranchesTrueRes.status === "fulfilled" && Array.isArray(directBranchesTrueRes.value)) {
        directBranchesTrueRes.value.forEach((b: any) => {
          const id = String(b.id ?? b.branchId ?? "");
          const name = String(b.branchName ?? b.name ?? "");
          if (id && id !== "0" && name && !branchMap.has(id)) {
            branchMap.set(id, name);
          }
        });
      }

      if (directBranchesFalseRes.status === "fulfilled" && Array.isArray(directBranchesFalseRes.value)) {
        directBranchesFalseRes.value.forEach((b: any) => {
          const id = String(b.id ?? b.branchId ?? "");
          const name = String(b.branchName ?? b.name ?? "");
          if (id && id !== "0" && name && !branchMap.has(id)) {
            branchMap.set(id, name);
          }
        });
      }

      if (peBranchesRes.status === "fulfilled" && Array.isArray(peBranchesRes.value)) {
        peBranchesRes.value.forEach((b: any) => {
          const id = String(b.branchId ?? b.id ?? "");
          const name = String(b.branchName ?? b.name ?? "");
          if (id && id !== "0" && name && !branchMap.has(id)) {
            branchMap.set(id, name);
          }
        });
      }

      // Merge Redux branches (from addMasterBranch)
      if (Array.isArray(reduxBranches)) {
        reduxBranches.forEach((b: any) => {
          const id = String(b.id ?? b.branchId ?? "");
          const name = String(b.name ?? b.branchName ?? "");
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

  // Always re-fetch branches on mount so newly created branches appear immediately
  useEffect(() => {
    void dispatch(fetchGlobalBranches());
    queryClient.removeQueries({ queryKey: ["physicalEntryBranches"] });
    void refetchBranches();
  }, [dispatch, queryClient, refetchBranches]);

  // Real-time synchronization for branch creation/updates across tabs and same window
  useEffect(() => {
    return subscribeToBranchUpdates(() => {
      void dispatch(fetchGlobalBranches());
      queryClient.removeQueries({ queryKey: ["physicalEntryBranches"] });
      void refetchBranches();
    });
  }, [dispatch, queryClient, refetchBranches]);

  const { data: records = [], isLoading: loading, error, refetch } = useQuery({
    queryKey: ["physicalEntryList", filters.branchId, filters.fromDate, filters.toDate],
    queryFn: async () => {
      const data = await physicalEntryApi.getPhysicalEntryDetails({
        BranchId: filters.branchId ? parseInt(filters.branchId, 10) : undefined,
        FromDate: toYYYYMMDD(filters.fromDate),
        ToDate: toYYYYMMDD(filters.toDate),
        Decimals: 3
      });
      const list: any[] = Array.isArray(data) ? data : ((data as any)?.data || []);
      return [...list].sort((a: any, b: any) => {
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
    branches
  };
};
