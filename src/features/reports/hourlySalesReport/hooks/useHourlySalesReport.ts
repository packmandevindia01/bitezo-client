import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getBranchList, getHourlySalesReport } from "../services/hourlySalesReportApi";
import { useAppSelector } from "../../../../app/hooks";
import { selectDecimalPart } from "../../../auth/store/authSlice";
import type { BranchOption, HourlySalesReportData } from "../types";
import { useBranchScope } from "../../../../hooks/useBranchScope";

export const useHourlySalesReport = () => {
  const decimalPart = useAppSelector(selectDecimalPart);
  const { isBranchLocked, initialBranchId } = useBranchScope();

  // Filter states
  const [fromDate, setFromDate] = useState<string>(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split("T")[0];
  });
  const [toDate, setToDate] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });
  const [branchId, setBranchId] = useState<string>(initialBranchId);

  // Master data queries
  const { data: branches = [] as BranchOption[], isLoading: branchesLoading } = useQuery({
    queryKey: ["branchList", "all"],
    queryFn: getBranchList,
  });

  // Report query
  const { data: reportData, isLoading: reportLoading, isFetching, refetch } = useQuery({
    queryKey: ["hourlySalesReport", { fromDate, toDate, branchId, decimalPart }],
    queryFn: () =>
      getHourlySalesReport({
        BranchId: Number(branchId),
        FromDate: fromDate,
        ToDate: toDate,
        Decimals: decimalPart,
      }),
    select: (data) => {
      if (!data?.columns || !data?.rows) return data;
      
      // If backend already added it, don't duplicate
      if (data.columns.includes("Total")) return data;

      const newColumns = [...data.columns, "Total"];
      
      // The backend response for Hourly Sales Report already includes the "Total" property in rows
      return {
        columns: newColumns,
        rows: data.rows
      };
    },
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

  const parsedReportData: HourlySalesReportData = reportData || {
    columns: ["Time", "Cash", "Credit", "Total"],
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
      isBranchLocked,
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
