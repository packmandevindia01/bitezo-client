import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { physicalEntryApi } from "../services/physicalEntryApi";
import { useBranchScope } from "../../../../hooks/useBranchScope";

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
  const { isBranchLocked, initialBranchId } = useBranchScope();
  const [filters, setFilters] = useState({
    branchId: initialBranchId ? String(initialBranchId) : "",
    isBranchLocked,
    fromDate: new Date(new Date().setDate(1)).toISOString().split("T")[0], 
    toDate: new Date().toISOString().split("T")[0],
  });

  const { data: branches = [] } = useQuery({
    queryKey: ["physicalEntryBranches"],
    queryFn: async () => {
      const res = await physicalEntryApi.getBranchList();
      return (res || []).map((b: any) => ({ label: b.branchName, value: String(b.branchId) }));
    }
  });

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
