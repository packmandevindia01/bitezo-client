import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useBranchScope } from "../../../../hooks/useBranchScope";
import { useAppSelector } from "../../../../app/hooks";
import { selectDecimalPart } from "../../../auth/store/authSlice";
import { fetchSupplierStatement } from "../services/supplierStatementApi";
import { getBranchList, getSupplierList } from "../../purchaseReport/services/purchaseReportApi";

export const useSupplierStatement = () => {
  const decimalPart = useAppSelector(selectDecimalPart);
  const { initialBranchId, isBranchLocked } = useBranchScope();

  // 1. Setup our Filter States
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
  });

  // 3. Fetch The Statement Report Data!
  const { data: reportResponse, isLoading: reportLoading, isFetching, refetch } = useQuery({
    queryKey: ["supplierStatement", { fromDate, toDate, branchId, supplierId, decimalPart }],
    queryFn: () => fetchSupplierStatement({
      BranchId: Number(branchId),
      FromDate: fromDate,
      ToDate: toDate,
      SupplierId: Number(supplierId),
      Decimals: decimalPart !== undefined ? decimalPart : 3,
    }),
  });

  // Reset Filters Function
  const resetFilters = () => {
    const today = new Date();
    setFromDate(new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split("T")[0]);
    setToDate(today.toISOString().split("T")[0]);
    setBranchId(initialBranchId);
    setSupplierId("0");
  };

  return {
    filters: {
      fromDate, setFromDate,
      toDate, setToDate,
      branchId, setBranchId, isBranchLocked,
      supplierId, setSupplierId,
      resetFilters,
    },
    masterData: {
      branches, branchesLoading,
      suppliers, suppliersLoading,
    },
    report: {
      // Access the inner "data" array from the SupplierStatementResponse
      statementData: reportResponse?.data || [],
      isLoading: reportLoading || isFetching,
      refetch,
    },
  };
};
