import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getBranchList, getDailySalesReport } from "../services/dailySalesReportApi";
import { useAppSelector } from "../../../../app/hooks";
import { selectDecimalPart } from "../../../auth/store/authSlice";
import type { BranchOption, DailySalesReportData } from "../types";

export const useDailySalesReport = () => {
  const decimalPart = useAppSelector(selectDecimalPart);

  // Filter states
  const [fromDate, setFromDate] = useState<string>(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split("T")[0];
  });
  const [toDate, setToDate] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });
  const [branchId, setBranchId] = useState<string>(() => {
    const isBackofficeMode = sessionStorage.getItem("tempSystemType") === "backoffice" || localStorage.getItem("systemType") === "backoffice";
    const activeBranchId = isBackofficeMode 
      ? sessionStorage.getItem("backoffice_activeBranchId") 
      : localStorage.getItem("activeBranchId");
    return activeBranchId || "1";
  });

  // Master data queries
  const { data: branches = [] as BranchOption[], isLoading: branchesLoading } = useQuery({
    queryKey: ["branchList", "all"],
    queryFn: getBranchList,
  });

  // Report query
  const { data: reportData, isLoading: reportLoading, isFetching, refetch } = useQuery({
    queryKey: ["dailySalesReport", { fromDate, toDate, branchId, decimalPart }],
    queryFn: () =>
      getDailySalesReport({
        BranchId: Number(branchId),
        FromDate: fromDate,
        ToDate: toDate,
        Decimals: decimalPart,
      }),
  });

  const resetFilters = () => {
    const today = new Date();
    const defaultFrom = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split("T")[0];
    const defaultTo = today.toISOString().split("T")[0];
    
    const isBackofficeMode = sessionStorage.getItem("tempSystemType") === "backoffice" || localStorage.getItem("systemType") === "backoffice";
    const activeBranchId = isBackofficeMode 
      ? sessionStorage.getItem("backoffice_activeBranchId") 
      : localStorage.getItem("activeBranchId");
    const defaultBranch = activeBranchId || "1";

    setFromDate(defaultFrom);
    setToDate(defaultTo);
    setBranchId(defaultBranch);
  };

  const parsedReportData: DailySalesReportData = reportData || {
    columns: ["VoucherDate", "Cash", "Credit"],
    rows: []
  };

  return {
    filters: {
      fromDate,
      setFromDate,
      toDate,
      setToDate,
      branchId,
      setBranchId,
      resetFilters,
    },
    masterData: {
      branches,
      branchesLoading,
    },
    report: {
      columns: parsedReportData.columns,
      rows: parsedReportData.rows,
      isLoading: reportLoading || isFetching,
      refetch,
    },
  };
};
