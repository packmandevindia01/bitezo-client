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

  const [branchId, setBranchId] = useState<string>(initialBranchId);
  const [employeeId, setEmployeeId] = useState<string>("0");
  const [fromDate, setFromDate] = useState<string>(getFirstDayOfMonthString());
  const [toDate, setToDate] = useState<string>(getTodayString());

  const resetFilters = useCallback(() => {
    setBranchId(initialBranchId);
    setEmployeeId("0");
    setFromDate(getFirstDayOfMonthString());
    setToDate(getTodayString());
  }, [initialBranchId]);

  const { data: branches = [] } = useQuery({
    queryKey: ["stockAdjustmentBranchList"],
    queryFn: getBranchList,
  });

  // Employees filtered by the currently selected branch
  const { data: employees = [] } = useQuery({
    queryKey: ["stockAdjustmentEmployeeList", branchId],
    queryFn: () => getEmployeeList(branchId !== "0" ? Number(branchId) : undefined),
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
  });

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
