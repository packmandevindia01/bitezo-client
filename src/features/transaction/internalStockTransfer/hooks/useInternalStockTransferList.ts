import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { internalStockTransferApi } from "../services/internalStockTransferApi";
import { getDecimalPart } from "../../../../utils/currency";
import { useBranchScope } from "../../../../hooks/useBranchScope";

export const useInternalStockTransferList = () => {
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

  const { data: branches = [] } = useQuery({
    queryKey: ["internalStockTransferBranches"],
    queryFn: async () => {
      const branchRes = await internalStockTransferApi.getFromBranches();
      return branchRes.map((b: any) => ({ label: b.branchName, value: String(b.branchId) }));
    },
    staleTime: 5 * 60 * 1000,
  });

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
    branches,
    searchTerm,
    setSearchTerm,
  };
};
