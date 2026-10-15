import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getEmployeeSalesReport, getBranchList } from "../services/employeeSalesReportApi";
import { useAppSelector } from "../../../../app/hooks";
import { selectDecimalPart } from "../../../auth/store/authSlice";
import type { BranchOption } from "../types";
import { useBranchScope } from "../../../../hooks/useBranchScope";

export const useEmployeeSalesReport = () => {
  const decimalPart = useAppSelector(selectDecimalPart) ?? 3;
  const { isBranchLocked, initialBranchId } = useBranchScope();

  const isBackofficeMode =
    typeof sessionStorage !== "undefined" &&
    (sessionStorage.getItem("tempSystemType") === "backoffice" ||
      localStorage.getItem("systemType") === "backoffice");
  const activeBranchId = isBackofficeMode
    ? sessionStorage.getItem("backoffice_activeBranchId")
    : localStorage.getItem("activeBranchId");
  const defaultBranchId =
    activeBranchId && activeBranchId !== "0"
      ? activeBranchId
      : initialBranchId && initialBranchId !== "0"
      ? initialBranchId
      : "1";

  // Filter states
  const [fromDate, setFromDate] = useState<string>(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split("T")[0];
  });
  const [toDate, setToDate] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });
  const [branchId, setBranchId] = useState<string>(defaultBranchId);

  const handleSetBranchId = (val: string) => {
    setBranchId(val || defaultBranchId);
  };

  // Master data queries
  const { data: branches = [] as BranchOption[], isLoading: branchesLoading } = useQuery({
    queryKey: ["branchList", "employeeSalesReport"],
    queryFn: getBranchList,
  });

  // Report query
  const finalBranchId = Number(branchId) || Number(defaultBranchId) || 1;
  const { data: reportData = [], isLoading: reportLoading, isFetching, refetch } = useQuery({
    queryKey: ["employeeSalesReport", { fromDate, toDate, branchId: finalBranchId, decimalPart }],
    queryFn: () =>
      getEmployeeSalesReport({
        BranchId: finalBranchId,
        FromDate: fromDate,
        ToDate: toDate,
        Decimals: decimalPart,
      }),
    staleTime: 0,
    refetchOnMount: true,
  });

  const resetFilters = () => {
    const today = new Date();
    const defaultFrom = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split("T")[0];
    const defaultTo = today.toISOString().split("T")[0];
    
    setFromDate(defaultFrom);
    setToDate(defaultTo);
    setBranchId(defaultBranchId);
    setTimeout(() => {
      refetch();
    }, 0);
  };

  return {
    filters: {
      defaultBranchId,
      fromDate,
      setFromDate,
      toDate,
      setToDate,
      branchId,
      setBranchId: handleSetBranchId,
      resetFilters,
      isBranchLocked,
    },
    masterData: {
      branches: Array.isArray(branches) ? branches : [],
      branchesLoading,
    },
    report: {
      salesData: Array.isArray(reportData)
        ? reportData
        : Array.isArray((reportData as any)?.salesData)
        ? (reportData as any).salesData
        : [],
      isLoading: reportLoading || isFetching,
      refetch,
    },
  };
};
