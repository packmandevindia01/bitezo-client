import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useBranchScope } from "../../../../hooks/useBranchScope";
import { useAppSelector } from "../../../../app/hooks";
import { selectDecimalPart } from "../../../auth/store/authSlice";
import { fetchSupplierBalance } from "../services/supplierBalanceApi";
import { getBranchList, getSupplierList } from "../../purchaseReport/services/purchaseReportApi";
import { subscribeToSupplierUpdates } from "../../../general/supplier/utils/supplierSync";

export const useSupplierBalance = () => {
  const queryClient = useQueryClient();
  const decimalPart = useAppSelector(selectDecimalPart);
  const { initialBranchId, isBranchLocked } = useBranchScope();

  // 1. Setup Filter States
  const [fromDate, setFromDate] = useState<string>(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split("T")[0];
  });
  const [toDate, setToDate] = useState<string>(() => {
    return new Date().toISOString().split("T")[0];
  });
  const [branchId, setBranchId] = useState<string>(initialBranchId);
  const [supplierId, setSupplierId] = useState<string>("0");

  // 2. Fetch Dropdown Options (Master Data)
  const { data: branches = [], isLoading: branchesLoading } = useQuery({
    queryKey: ["branchList", "all"],
    queryFn: getBranchList,
  });

  const { data: suppliers = [], isLoading: suppliersLoading } = useQuery({
    queryKey: ["supplierList", "all"],
    queryFn: getSupplierList,
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });

  // Real-time synchronization: sync supplier options when suppliers are created/updated
  useEffect(() => {
    return subscribeToSupplierUpdates(() => {
      void queryClient.invalidateQueries({ queryKey: ["supplierList"] });
      void queryClient.refetchQueries({ queryKey: ["supplierList"] });
    });
  }, [queryClient]);

  // 3. Fetch Supplier Balance Report Data
  const { data: reportResponse, isLoading: reportLoading, isFetching, refetch } = useQuery({
    queryKey: ["supplierBalance", { fromDate, toDate, branchId, supplierId, decimalPart }],
    queryFn: () => fetchSupplierBalance({
      BranchId: Number(branchId),
      FromDate: fromDate,
      ToDate: toDate,
      SupplierId: Number(supplierId),
      Decimals: decimalPart !== undefined ? decimalPart : 3,
    }),
    staleTime: 0,
    refetchOnMount: true,
  });

  // Reset Filters Function
  const resetFilters = () => {
    const today = new Date();
    setFromDate(new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split("T")[0]);
    setToDate(today.toISOString().split("T")[0]);
    setBranchId(initialBranchId);
    setSupplierId("0");
    setTimeout(() => {
      refetch();
    }, 0);
  };

  return {
    filters: {
      fromDate,
      setFromDate,
      toDate,
      setToDate,
      branchId,
      setBranchId,
      isBranchLocked,
      supplierId,
      setSupplierId,
      resetFilters,
    },
    masterData: {
      branches,
      branchesLoading,
      suppliers,
      suppliersLoading,
    },
    report: {
      summaryData: reportResponse?.data?.summaryData || [],
      totalData: reportResponse?.data?.totalData || { total: "0" },
      isLoading: reportLoading || isFetching,
      refetch,
    },
  };
};
