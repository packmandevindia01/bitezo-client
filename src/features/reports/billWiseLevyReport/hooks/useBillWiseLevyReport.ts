import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  getBranchList,
  getBillWiseLevyReport,
} from "../services/billWiseLevyReportApi";
import { useAppSelector } from "../../../../app/hooks";
import { selectDecimalPart } from "../../../auth/store/authSlice";
import type {
  BranchOption,
  BillWiseLevyRow,
  BillWiseLevyTotalData,
} from "../types";
import { useBranchScope } from "../../../../hooks/useBranchScope";

export const useBillWiseLevyReport = () => {
  const { initialBranchId, isBranchLocked } = useBranchScope();
  const defaultBranchId = initialBranchId || "1";

  const today = new Date();
  const defaultDate = today.toISOString().split("T")[0];

  const [branchId, setBranchId] = useState<string>(defaultBranchId);
  const [fromDate, setFromDate] = useState<string>(defaultDate);
  const [toDate, setToDate] = useState<string>(defaultDate);

  const decimalPart = useAppSelector(selectDecimalPart) ?? 3;

  const resetFilters = () => {
    setBranchId(defaultBranchId);
    setFromDate(defaultDate);
    setToDate(defaultDate);
  };

  const { data: branches = [], isLoading: isLoadingBranches } = useQuery<BranchOption[]>({
    queryKey: ["branches-list-for-bill-wise-levy"],
    queryFn: getBranchList,
    staleTime: 5 * 60 * 1000,
  });

  const branchOptions = useMemo(() => {
    const list = Array.isArray(branches) ? branches : [];
    return list.map((b) => ({
      value: String(b.branchId),
      label: b.branchName,
    }));
  }, [branches]);

  const {
    data: reportData,
    isLoading: isLoadingReport,
    isFetching,
    error,
    refetch,
  } = useQuery({
    queryKey: [
      "bill-wise-levy-report",
      branchId,
      fromDate,
      toDate,
      decimalPart,
    ],
    queryFn: () =>
      getBillWiseLevyReport({
        BranchId: Number(branchId) || 1,
        FromDate: fromDate,
        ToDate: toDate,
        Decimals: decimalPart,
      }),
    enabled: !!fromDate && !!toDate && !!branchId,
  });

  const rows: BillWiseLevyRow[] = useMemo(() => {
    return reportData?.billData || [];
  }, [reportData]);

  const totalData: BillWiseLevyTotalData | null = useMemo(() => {
    return reportData?.totalData || null;
  }, [reportData]);

  return {
    filters: {
      branchId,
      setBranchId,
      fromDate,
      setFromDate,
      toDate,
      setToDate,
      isBranchLocked,
      resetFilters,
    },
    masterData: {
      branches,
      branchOptions,
      isLoadingBranches,
    },
    report: {
      rows,
      totalData,
      isLoading: isLoadingReport || isFetching,
      error,
      refetch,
    },
  };
};
