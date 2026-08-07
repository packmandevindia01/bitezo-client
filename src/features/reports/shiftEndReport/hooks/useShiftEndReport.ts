import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { getShiftEndReport, getBranchList, getUserList, getCounterList } from "../services/shiftEndReportApi";
import { useAppSelector } from "../../../../app/hooks";
import { selectDecimalPart } from "../../../auth/store/authSlice";
import type { BranchOption, UserOption, CounterOption } from "../types";
import { useBranchScope } from "../../../../hooks/useBranchScope";

export const useShiftEndReport = () => {
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
  const [userId, setUserId] = useState<string>("0");
  const [counterId, setCounterId] = useState<string>("0");

  // Master data queries
  const { data: branches = [] as BranchOption[], isLoading: branchesLoading } = useQuery({
    queryKey: ["branchList", "shiftEndReport"],
    queryFn: getBranchList,
  });

  const { data: users = [] as UserOption[], isLoading: usersLoading } = useQuery({
    queryKey: ["userList", "shiftEndReport"],
    queryFn: getUserList,
  });

  const { data: counters = [] as CounterOption[], isLoading: countersLoading } = useQuery({
    queryKey: ["counterList", "shiftEndReport", branchId],
    queryFn: () => getCounterList(Number(branchId)),
    enabled: !!branchId && branchId !== "0", // Only fetch if branch is selected (and not 'All' if 'All' is 0, though Bitezo usually requires a valid branch or '0' returns all for some APIs. The swagger showed /api/counter/2/list-name)
  });

  // Reset counter when branch changes to avoid invalid counter selections
  useEffect(() => {
    setCounterId("0");
  }, [branchId]);

  // Report query
  const { data: reportData, isLoading: reportLoading, isFetching, refetch } = useQuery({
    queryKey: ["shiftEndReport", { fromDate, toDate, branchId, userId, counterId, decimalPart }],
    queryFn: () =>
      getShiftEndReport({
        BranchId: Number(branchId),
        UserId: Number(userId),
        CounterId: Number(counterId),
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
    setUserId("0");
    setCounterId("0");
  };

  return {
    filters: {
      fromDate,
      setFromDate,
      toDate,
      setToDate,
      branchId,
      setBranchId,
      userId,
      setUserId,
      counterId,
      setCounterId,
      resetFilters,
      isBranchLocked,
    },
    masterData: {
      branches,
      branchesLoading,
      users,
      usersLoading,
      counters,
      countersLoading,
    },
    report: {
      columns: reportData?.columns || [],
      rows: reportData?.rows || [],
      isLoading: reportLoading || isFetching,
      refetch,
    },
  };
};
