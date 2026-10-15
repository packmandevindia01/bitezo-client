import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  getBranchList,
  getProductWiseLevyReport,
} from "../services/productWiseLevyReportApi";
import { useAppSelector } from "../../../../app/hooks";
import { selectDecimalPart } from "../../../auth/store/authSlice";
import type {
  BranchOption,
  ProductWiseLevyRow,
  ProductWiseLevyTotalData,
} from "../types";
import { useBranchScope } from "../../../../hooks/useBranchScope";

export const useProductWiseLevyReport = () => {
  const { initialBranchId, isBranchLocked } = useBranchScope();
  const defaultBranchId = initialBranchId || "1";

  const today = new Date();
  const defaultDate = today.toISOString().split("T")[0];

  const [branchId, setBranchId] = useState<string>(defaultBranchId);
  const handleSetBranchId = (val: string) => {
    setBranchId(val || defaultBranchId);
  };
  const [fromDate, setFromDate] = useState<string>(defaultDate);
  const [toDate, setToDate] = useState<string>(defaultDate);

  const decimalPart = useAppSelector(selectDecimalPart) ?? 3;

  const { data: branches = [], isLoading: isLoadingBranches } = useQuery<BranchOption[]>({
    queryKey: ["branches-list-for-product-wise-levy"],
    queryFn: getBranchList,
    staleTime: 5 * 60 * 1000,
  });

  const branchOptions = useMemo(() => {
    const list = Array.isArray(branches) ? branches : [];
    return list.map((b) => ({
      value: String(b?.branchId ?? ""),
      label: b?.branchName || "",
    }));
  }, [branches]);

  const finalBranchId = Number(branchId) || Number(defaultBranchId) || 1;
  const {
    data: reportData,
    isLoading: isLoadingReport,
    isFetching,
    error,
    refetch,
  } = useQuery({
    queryKey: [
      "product-wise-levy-report",
      finalBranchId,
      fromDate,
      toDate,
      decimalPart,
    ],
    queryFn: () =>
      getProductWiseLevyReport({
        BranchId: finalBranchId,
        FromDate: fromDate,
        ToDate: toDate,
        Decimals: decimalPart,
      }),
    enabled: !!fromDate && !!toDate,
    staleTime: 0,
    refetchOnMount: true,
  });

  const resetFilters = () => {
    setBranchId(defaultBranchId);
    setFromDate(defaultDate);
    setToDate(defaultDate);
    setTimeout(() => {
      refetch();
    }, 0);
  };

  const rows: ProductWiseLevyRow[] = useMemo(() => {
    const rawList = reportData?.productData || (Array.isArray(reportData) ? reportData : []);
    return Array.isArray(rawList) ? rawList : [];
  }, [reportData]);

  const totalData: ProductWiseLevyTotalData | null = useMemo(() => {
    return reportData?.totalData || null;
  }, [reportData]);

  return {
    filters: {
      defaultBranchId,
      branchId,
      setBranchId: handleSetBranchId,
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
