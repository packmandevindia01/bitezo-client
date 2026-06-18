import { useState, useEffect } from "react";
import { stockAdjustmentApi } from "../services/stockAdjustmentApi";
import type { SearchableOption } from "../../../../components/common/Searchableselect";

export const useStockAdjustmentList = () => {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [branches, setBranches] = useState<SearchableOption[]>([]);

  // Filter state
  const [filters, setFilters] = useState({
    branchId: "",
    fromDate: new Date(new Date().setDate(1)).toISOString().split("T")[0], 
    toDate: new Date().toISOString().split("T")[0],
    refNo: ""
  });

  useEffect(() => {
    stockAdjustmentApi.getBranchList()
      .then(res => setBranches(res.map(b => ({ label: b.branchName, value: String(b.branchId) }))))
      .catch(console.error);
  }, []);

  const fetchList = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await stockAdjustmentApi.getStockAdjustmentDetails({
        BranchId: filters.branchId ? parseInt(filters.branchId, 10) : undefined,
        FromDate: filters.fromDate || undefined,
        ToDate: filters.toDate || undefined,
        RefNo: filters.refNo || undefined,
        Decimals: 3
      });
      setRecords(data || []);
    } catch (err: any) {
      setError(err.message || "Failed to fetch stock adjustments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
  }, []);

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

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
