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
  const [fromDate, setFromDate] = useState<string>(defaultDate);
  const [toDate, setToDate] = useState<string>(defaultDate);

  const decimalPart = useAppSelector(selectDecimalPart) ?? 3;

  const resetFilters = () => {
    setBranchId(defaultBranchId);
    setFromDate(defaultDate);
    setToDate(defaultDate);
  };

  const { data: branches = [], isLoading: isLoadingBranches } = useQuery<BranchOption[]>({
    queryKey: ["branches-list-for-product-wise-levy"],
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
      "product-wise-levy-report",
      branchId,
      fromDate,
      toDate,
      decimalPart,
    ],
    queryFn: () =>
      getProductWiseLevyReport({
        BranchId: Number(branchId) || 1,
        FromDate: fromDate,
        ToDate: toDate,
        Decimals: decimalPart,
      }),
    enabled: !!fromDate && !!toDate && !!branchId,
  });

  const rows: ProductWiseLevyRow[] = useMemo(() => {
    return reportData?.productData || [];
  }, [reportData]);

  const totalData: ProductWiseLevyTotalData | null = useMemo(() => {
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
