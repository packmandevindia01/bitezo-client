import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  getBranchList,
  getGroupList,
  getGroupWiseSalesReport,
} from "../services/groupWiseSalesReportApi";
import { useAppSelector } from "../../../../app/hooks";
import { selectDecimalPart } from "../../../auth/store/authSlice";
import type { BranchOption, GroupOption, GroupWiseSalesRow, GroupWiseTotalData } from "../types";
import { useBranchScope } from "../../../../hooks/useBranchScope";

export const useGroupWiseSalesReport = () => {
  const { initialBranchId: currentBranchId, isBranchLocked } = useBranchScope();
  const defaultBranchId = isBranchLocked ? String(currentBranchId) : "0";

  const today = new Date();
  const defaultDate = today.toISOString().split("T")[0];

  const [branchId, setBranchId] = useState<string>(defaultBranchId);
  const [groupId, setGroupId] = useState<string>("0");
  const [fromDate, setFromDate] = useState<string>(defaultDate);
  const [toDate, setToDate] = useState<string>(defaultDate);

  const decimalPart = useAppSelector(selectDecimalPart) ?? 3;

  const resetFilters = () => {
    setBranchId(defaultBranchId);
    setGroupId("0");
    setFromDate(defaultDate);
    setToDate(defaultDate);
  };

  const { data: branches = [], isLoading: isLoadingBranches } = useQuery<BranchOption[]>({
    queryKey: ["branches-list-for-group-wise-sales"],
    queryFn: getBranchList,
    staleTime: 5 * 60 * 1000,
  });

  const { data: groupsData = [], isLoading: isLoadingGroups } = useQuery<GroupOption[]>({
    queryKey: ["groups-list-for-group-wise-sales"],
    queryFn: getGroupList,
    staleTime: 5 * 60 * 1000,
  });

  const groupOptions = useMemo(() => {
    const opts = groupsData
      .filter((g) => g && g.name && g.name.toLowerCase() !== "all")
      .map((g) => ({ value: String(g.grpId), label: g.name }));
    return [{ value: "0", label: "All" }, ...opts];
  }, [groupsData]);

  const {
    data: reportData,
    isLoading: isLoadingReport,
    isFetching,
    error,
  } = useQuery({
    queryKey: ["group-wise-sales-report", branchId, groupId, fromDate, toDate, decimalPart],
    queryFn: () =>
      getGroupWiseSalesReport({
        BranchId: Number(branchId) || 0,
        GroupId: Number(groupId) || 0,
        FromDate: fromDate,
        ToDate: toDate,
        Decimals: decimalPart,
      }),
    enabled: !!fromDate && !!toDate,
  });

  const rows: GroupWiseSalesRow[] = useMemo(() => {
    return reportData?.groupData || [];
  }, [reportData]);

  const totalData: GroupWiseTotalData | null = useMemo(() => {
    return reportData?.totalData || null;
  }, [reportData]);

  return {
    filters: {
      branchId,
      setBranchId,
      groupId,
      setGroupId,
      fromDate,
      setFromDate,
      toDate,
      setToDate,
      isBranchLocked,
      resetFilters,
    },
    masterData: {
      branches,
      groupOptions,
      isLoadingBranches,
      isLoadingGroups,
    },
    report: {
      rows,
      totalData,
      isLoading: isLoadingReport || isFetching,
      error,
    },
  };
};
