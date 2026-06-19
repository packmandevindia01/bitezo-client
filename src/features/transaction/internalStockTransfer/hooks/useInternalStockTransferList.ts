import { useState, useEffect, useCallback } from "react";
import { internalStockTransferApi } from "../services/internalStockTransferApi";
import type { SearchableOption } from "../../../../components/common/Searchableselect";

export const useInternalStockTransferList = () => {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [branches, setBranches] = useState<SearchableOption[]>([]);

  const [filters, setFilters] = useState({
    branchId: "",
    fromDate: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split("T")[0],
    toDate: new Date().toISOString().split("T")[0],
    refNo: ""
  });

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const fetchList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: any = {
        Decimals: 3 // Should dynamically fetch this ideally, but 3 is a safe default for Bitezo backend based on rules
      };
      if (filters.branchId) params.FromBranchId = parseInt(filters.branchId, 10);
      if (filters.fromDate) params.FromDate = filters.fromDate;
      if (filters.toDate) params.ToDate = filters.toDate;
      if (filters.refNo) params.RefNo = filters.refNo;

      const data = await internalStockTransferApi.getTransferList(params);
      const sortedData = (data || []).sort((a: any, b: any) => {
        const dateA = new Date(a.transDate).getTime();
        const dateB = new Date(b.transDate).getTime();
        if (dateA !== dateB) return dateB - dateA;
        return (b.transId || 0) - (a.transId || 0);
      });
      setRecords(sortedData);
      setLoading(false);
    } catch (err: any) {
      setError(err.message || "Failed to fetch internal stock transfers");
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    const loadMasterData = async () => {
      try {
        const branchRes = await internalStockTransferApi.getFromBranches();
        setBranches(branchRes.map((b: any) => ({ label: b.branchName, value: String(b.branchId) })));
      } catch (err: any) {
        console.error("Failed to load branches", err);
      }
    };
    loadMasterData();
    fetchList();
  }, [fetchList]);

  return {
    records,
    loading,
    error,
    setError,
    filters,
    handleFilterChange,
    fetchList,
    branches
  };
};
