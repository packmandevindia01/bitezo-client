import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getDayEndReport, getBranchList } from "../services/dayEndReportApi";
import { useAppSelector } from "../../../../app/hooks";
import { selectDecimalPart } from "../../../auth/store/authSlice";
import type { BranchOption } from "../types";
import { useBranchScope } from "../../../../hooks/useBranchScope";

export const useDayEndReport = () => {
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
  const [branchId, setBranchId] = useState<string>(isBranchLocked ? initialBranchId : "");

  // Master data queries
  const { data: branches = [] as BranchOption[], isLoading: branchesLoading } = useQuery({
    queryKey: ["branchList", "dayEndReport"],
    queryFn: getBranchList,
  });

  // Report query
  const { data: reportData, isLoading: reportLoading, isFetching, refetch } = useQuery({
    queryKey: ["dayEndReport", { fromDate, toDate, branchId, decimalPart }],
    queryFn: () =>
      getDayEndReport({
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
    
    setFromDate(defaultFrom);
    setToDate(defaultTo);
    setBranchId(isBranchLocked ? initialBranchId : "");
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
      columns: reportData?.columns || [],
      rows: reportData?.rows || [],
      isLoading: reportLoading || isFetching,
      refetch,
    },
  };
};
