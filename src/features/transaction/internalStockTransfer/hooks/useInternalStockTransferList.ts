import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { internalStockTransferApi, formatDateOnly } from "../services/internalStockTransferApi";
import { getDecimalPart } from "../../../../utils/currency";
import { useBranchScope } from "../../../../hooks/useBranchScope";
import { useStockBranches } from "../../shared/useStockBranches";

export const useInternalStockTransferList = () => {
  const { isBranchLocked, initialBranchId } = useBranchScope();
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({
    branchId: initialBranchId ? String(initialBranchId) : "",
    isBranchLocked,
    fromDate: formatDateOnly(new Date(new Date().setDate(new Date().getDate() - 30))),
    toDate: formatDateOnly(new Date()),
  });

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const { branches } = useStockBranches({
    queryPrefix: "internalStockTransfer",
    getBranchList: internalStockTransferApi.getFromBranches,
  });

  const { data: rawRecords = [], isLoading: loading, error } = useQuery({
    queryKey: ["internalStockTransferList", filters],
    queryFn: async () => {
      const params: any = {
        Decimals: getDecimalPart(),
      };
      if (filters.branchId) params.FromBranchId = parseInt(filters.branchId, 10);
      if (filters.fromDate) params.FromDate = formatDateOnly(filters.fromDate);
      if (filters.toDate) params.ToDate = formatDateOnly(filters.toDate);

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
