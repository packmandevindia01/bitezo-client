/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { productionApi } from "../services/productionApi";
import { productService } from "../../../inventory/product/services/productService";
import type { SearchableOption } from "../../../../components/common/Searchableselect";
import { useBranchScope } from "../../../../hooks/useBranchScope";
import { getDecimalPart } from "../../../../utils/currency";

export const useProductionList = () => {
  const { isBranchLocked, initialBranchId } = useBranchScope();
  const [filters, setFilters] = useState({
    branchId: initialBranchId ? String(initialBranchId) : "",
    isBranchLocked,
    productId: "",
    unitId: ""
  });

  const { data: branches = [] } = useQuery<SearchableOption[]>({
    queryKey: ["branches"],
    queryFn: async () => {
      const branchRes = await productionApi.getBranchList();
      return branchRes.map((b: any) => ({ label: b.branchName, value: String(b.branchId) }));
    }
  });

  useEffect(() => {
    if (branches.length > 0 && !filters.branchId) {
      if (isBranchLocked && initialBranchId) {
        setFilters(prev => ({ ...prev, branchId: String(initialBranchId) }));
      } else {
        setFilters(prev => ({ ...prev, branchId: branches[0].value }));
      }
    }
  }, [branches, isBranchLocked, initialBranchId, filters.branchId]);

  const { data: products = [] } = useQuery<SearchableOption[]>({
    queryKey: ["finishedProducts"],
    queryFn: async () => {
      const prodRes = await productionApi.getFinishedProductListByName("");
      return prodRes.map((p: any) => ({
        label: p.barcode || p.code ? `[${p.barcode || p.code}] ${p.productName}` : p.productName,
        value: String(p.productId),
        code: p.barcode || p.code || ""
      }));
    }
  });

  const { data: units = [] } = useQuery<SearchableOption[]>({
    queryKey: ["productionUnits", filters.productId],
    queryFn: async () => {
      if (filters.productId) {
        const prod = products.find((p: any) => String(p.value) === String(filters.productId));
        if (prod && prod.code) {
          try {
            const costData = await productionApi.getProductCostData(prod.code);
            if (costData?.unitCategory) {
              const unitsResp = await productionApi.getUnitListByName(costData.unitCategory);
              return (unitsResp || []).map((u: any) => ({
                label: u.name,
                value: String(u.unitId || u.id)
              }));
            }
          } catch (e) {
            console.error("Failed to load product unit category:", e);
          }
        }
      }
      // If no product selected, load master units
      const pm = await productService.loadMasterData().catch(() => null);
      if (pm?.unit) {
        return pm.unit.map((u: any) => ({
          label: u.name,
          value: String(u.id)
        }));
      }
      return [];
    }
  });

  const { data: records = [], isLoading: loading, error, refetch } = useQuery({
    queryKey: ["productionList", filters.branchId, filters.productId, filters.unitId],
    queryFn: async () => {
      const data = await productionApi.getProductionDetails({
        BranchId: filters.branchId ? parseInt(filters.branchId, 10) : undefined,
        ProductId: filters.productId ? parseInt(filters.productId, 10) : undefined,
        UnitId: filters.unitId ? parseInt(filters.unitId, 10) : undefined,
        Decimals: getDecimalPart()
      });
      return (data || []).sort((a: any, b: any) => {
        return (b.transId || b.id || b.productionId || 0) - (a.transId || a.id || a.productionId || 0);
      });
    },
    enabled: !!filters.branchId && !isNaN(Number(filters.branchId))
  });

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => {
      if (key === "productId") {
        return { ...prev, productId: value, unitId: "" };
      }
      return { ...prev, [key]: value };
    });
  };

  return {
    records,
    loading,
    error: error ? (error as Error).message : null,
    filters,
    handleFilterChange,
    branches,
    products,
    units,
    fetchList: refetch
  };
};

