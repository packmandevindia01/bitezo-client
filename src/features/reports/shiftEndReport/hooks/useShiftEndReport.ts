import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { getShiftEndReport, getUserList, getCounterList, getShiftEndCashierLogDetail } from "../services/shiftEndReportApi";
import { branchApi } from "../../../inventory/branches/services/branchApi";
import { useAppSelector } from "../../../../app/hooks";
import { selectDecimalPart } from "../../../auth/store/authSlice";
import type { BranchOption, UserOption, CounterOption } from "../types";
import { ALL_BRANCH_ID, toReportBranchId, useBranchScope } from "../../../../hooks/useBranchScope";

import { toLocalDateString } from "../../../../utils/date";
export const useShiftEndReport = () => {
  const decimalPart = useAppSelector(selectDecimalPart);
  const { isBranchLocked, initialBranchId } = useBranchScope();

  // Filter states
  const [fromDate, setFromDate] = useState<string>(() => {
    const today = new Date();
    return toLocalDateString(new Date(today.getFullYear(), today.getMonth(), 1));
  });
  const [toDate, setToDate] = useState<string>(() => {
    const today = new Date();
    return toLocalDateString(today);
  });
  // initialBranchId is the locked branch, or "1" = All. BranchId is never sent as 0 (toReportBranchId).
  const [branchId, setBranchId] = useState<string>(initialBranchId);
  const [userId, setUserId] = useState<string>("0");
  const [counterId, setCounterId] = useState<string>("0");

  // Master data queries
  // Same API as the top navbar branch selector: the server's own list, "All" included.
  const { data: branches = [] as BranchOption[], isLoading: branchesLoading } = useQuery({
    queryKey: ["activeBranches"],
    queryFn: () => branchApi.fetchBranchNames(true),
    select: (list): BranchOption[] => list.map((b) => ({ branchId: Number(b.id), branchName: b.branchName })),
  });

  const { data: users = [] as UserOption[], isLoading: usersLoading } = useQuery({
    queryKey: ["userList", "shiftEndReport"],
    queryFn: getUserList,
  });

  const { data: counters = [] as CounterOption[], isLoading: countersLoading } = useQuery({
    queryKey: ["counterList", "shiftEndReport", branchId],
    queryFn: () => getCounterList(Number(branchId)),
    enabled: toReportBranchId(branchId) !== ALL_BRANCH_ID, // Counters belong to a real branch, not "All".
  });

  // Reset counter when branch changes to avoid invalid counter selections
  useEffect(() => {
    setCounterId("0");
  }, [branchId]);

  // Report query
  const { data: reportData, isLoading: reportLoading, isFetching, refetch } = useQuery({
    queryKey: ["shiftEndReport", { fromDate, toDate, branchId, userId, counterId, decimalPart }],
    queryFn: async () => {
      const res = await getShiftEndReport({
        BranchId: toReportBranchId(branchId),
        UserId: Number(userId),
        CounterId: Number(counterId),
        FromDate: fromDate,
        ToDate: toDate,
        Decimals: decimalPart,
      });

      const rawRows = res?.rows || [];
      const enrichedRows = await Promise.all(
        rawRows.map(async (row) => {
          // If already in row, return with normalized fields
          if (row["Pay In"] !== undefined || row["PayIn"] !== undefined || row.payIn !== undefined) {
            return {
              ...row,
              "Opening Balance": Number(row["Opening Balance"] ?? row["OpeningBal"] ?? row.openingBal ?? 0),
              "Pay In": Number(row["Pay In"] ?? row["PayIn"] ?? row.payIn ?? 0),
              "Pay Out": Number(row["Pay Out"] ?? row["PayOut"] ?? row.payOut ?? 0),
            };
          }

          // Fetch from cashier log if DayId and ShiftId are available
          if (row.DayId && row.ShiftId) {
            const detail = await getShiftEndCashierLogDetail(row.DayId, row.ShiftId);
            const cf = detail?.cashFlow || detail?.data?.cashFlow || detail || {};
            return {
              ...row,
              "Opening Balance": Number(cf.openingBal ?? detail?.openingBal ?? 0),
              "Pay In": Number(cf.payIn ?? detail?.payIn ?? 0),
              "Pay Out": Number(cf.payOut ?? detail?.payOut ?? 0),
            };
          }

          return {
            ...row,
            "Opening Balance": 0,
            "Pay In": 0,
            "Pay Out": 0,
          };
        })
      );

      return {
        columns: res?.columns || [],
        rows: enrichedRows,
      };
    },
    staleTime: 0,
    refetchOnMount: true,
  });

  const resetFilters = () => {
    const today = new Date();
    const defaultFrom = toLocalDateString(new Date(today.getFullYear(), today.getMonth(), 1));
    const defaultTo = toLocalDateString(today);
    
    setFromDate(defaultFrom);
    setToDate(defaultTo);
    setBranchId(initialBranchId);
    setUserId("0");
    setCounterId("0");
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
