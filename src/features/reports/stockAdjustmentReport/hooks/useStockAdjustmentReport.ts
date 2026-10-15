import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useBranchScope } from "../../../../hooks/useBranchScope";
import {
  getStockAdjustmentReport,
  getBranchList,
  getEmployeeList,
} from "../services/stockAdjustmentReportApi";

const getTodayString = () => {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const getFirstDayOfMonthString = () => {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  return `${yyyy}-${mm}-01`;
};

export const useStockAdjustmentReport = () => {
  const { initialBranchId, isBranchLocked } = useBranchScope();

  const isBackofficeMode =
    typeof sessionStorage !== "undefined" &&
    (sessionStorage.getItem("tempSystemType") === "backoffice" ||
      localStorage.getItem("systemType") === "backoffice");
  const activeBranchId = isBackofficeMode
    ? sessionStorage.getItem("backoffice_activeBranchId")
    : localStorage.getItem("activeBranchId");
  const defaultBranchId = (activeBranchId && activeBranchId !== "0") ? activeBranchId : (initialBranchId && initialBranchId !== "0" ? initialBranchId : "1");

  const [branchId, setBranchId] = useState<string>(defaultBranchId);
  const [employeeId, setEmployeeId] = useState<string>("");
  const [fromDate, setFromDate] = useState<string>(getFirstDayOfMonthString());
  const [toDate, setToDate] = useState<string>(getTodayString());

  const { data: branches = [] } = useQuery({
    queryKey: ["stockAdjustmentBranchList"],
    queryFn: getBranchList,
  });

  // Employees filtered by the currently selected branch
  const { data: employees = [] } = useQuery({
    queryKey: ["stockAdjustmentEmployeeList", branchId],
    queryFn: () => getEmployeeList(branchId !== "0" && branchId !== "" ? Number(branchId) : undefined),
  });

  const {
    data: reportData = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["stockAdjustmentReport", branchId, employeeId, fromDate, toDate],
    queryFn: () => getStockAdjustmentReport({ branchId, employeeId, fromDate, toDate }),
    staleTime: 0,
    refetchOnMount: true,
  });

  const resetFilters = useCallback(() => {
    const isBackoffice =
      typeof sessionStorage !== "undefined" &&
      (sessionStorage.getItem("tempSystemType") === "backoffice" ||
        localStorage.getItem("systemType") === "backoffice");
    const currentActiveBranchId = isBackoffice
      ? sessionStorage.getItem("backoffice_activeBranchId")
      : localStorage.getItem("activeBranchId");
    const targetBranch = (currentActiveBranchId && currentActiveBranchId !== "0")
      ? currentActiveBranchId
      : (initialBranchId && initialBranchId !== "0" ? initialBranchId : "1");

    setBranchId(targetBranch);
    setEmployeeId("");
    setFromDate(getFirstDayOfMonthString());
    setToDate(getTodayString());
    setTimeout(() => {
      refetch();
    }, 0);
  }, [initialBranchId, refetch]);

  return {
    filters: {
      branchId,
      setBranchId,
      isBranchLocked,
      employeeId,
      setEmployeeId,
      fromDate,
      setFromDate,
      toDate,
      setToDate,
      resetFilters,
    },
    masterData: {
      branches,
      employees,
    },
    report: {
      data: reportData,
      isLoading,
      isError,
      error,
      refetch,
    },
  };
};
