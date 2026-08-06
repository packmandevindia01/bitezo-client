import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { physicalEntryApi } from "../services/physicalEntryApi";
import { useBranchScope } from "../../../../hooks/useBranchScope";

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
      return res.map(b => ({ label: b.branchName, value: String(b.branchId) }));
    }
  });

  const { data: records = [], isLoading: loading, error, refetch } = useQuery({
    queryKey: ["physicalEntryList", filters.branchId, filters.fromDate, filters.toDate],
    queryFn: async () => {
      const data = await physicalEntryApi.getPhysicalEntryDetails({
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
    branches
  };
};
