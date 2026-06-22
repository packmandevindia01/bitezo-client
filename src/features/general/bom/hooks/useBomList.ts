import { useState, useEffect } from "react";
import { bomApi } from "../services/bomApi";
import type { SearchableOption } from "../../../../components/common/Searchableselect";

export const useBomList = () => {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [branches, setBranches] = useState<SearchableOption[]>([]);
  const [products, setProducts] = useState<SearchableOption[]>([]);
  const [units, setUnits] = useState<SearchableOption[]>([]);

  // Filter state
  const [filters, setFilters] = useState({
    branchId: "",
    productId: "",
    unitId: ""
  });

  useEffect(() => {
    Promise.all([
      bomApi.getBranchList(),
      bomApi.getFinishedProductListByName("")
    ])
      .then(([branchRes, prodRes]) => {
        setBranches(branchRes.map(b => ({ label: b.branchName, value: String(b.branchId) })));
        setProducts(prodRes.map(p => ({ label: p.productName, value: String(p.productId) })));
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (filters.branchId && filters.productId) {
      const pId = parseInt(filters.productId, 10);
      const bId = parseInt(filters.branchId, 10);
      bomApi.getFinishedProductListByName("").then(prods => {
        const prod = prods.find(p => p.productId === pId);
        if (prod && (prod.barcode || prod.code)) {
          bomApi.getProductUnitData(bId, prod.barcode || prod.code).then(u => {
            if (u) {
              setUnits([{ label: u.unitCategory || "Unit", value: String(u.unitId) }]);
            }
          }).catch(console.error);
        }
      });
    } else {
      setUnits([]);
    }
  }, [filters.branchId, filters.productId]);

  const fetchList = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await bomApi.getBomDetails({
        BranchId: filters.branchId ? parseInt(filters.branchId, 10) : undefined,
        ProductId: filters.productId ? parseInt(filters.productId, 10) : undefined,
        UnitId: filters.unitId ? parseInt(filters.unitId, 10) : undefined
      });
      const sortedData = (data || []).sort((a: any, b: any) => {
        const dateA = new Date(a.transDate || a.createdAt || a.date || 0).getTime();
        const dateB = new Date(b.transDate || b.createdAt || b.date || 0).getTime();
        if (dateA !== dateB) return dateB - dateA;
        return (b.transId || b.id || b.bomId || 0) - (a.transId || a.id || a.bomId || 0);
      });
      setRecords(sortedData);
    } catch (err: any) {
      setError(err.message || "Failed to fetch BOMs");
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
    branches,
    products,
    units,
    fetchList
  };
};
