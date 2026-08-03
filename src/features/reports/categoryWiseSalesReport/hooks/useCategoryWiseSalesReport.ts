import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  getBranchList,
  getCategoryList,
  getCategoryWiseSalesReport,
} from "../services/categoryWiseSalesReportApi";
import { useAppSelector } from "../../../../app/hooks";
import { selectDecimalPart } from "../../../auth/store/authSlice";
import type { BranchOption, CategoryOption, CategoryWiseSalesRow, CategoryWiseTotalData } from "../types";
import { useBranchScope } from "../../../../hooks/useBranchScope";

export const useCategoryWiseSalesReport = () => {
  const { initialBranchId: currentBranchId, isBranchLocked } = useBranchScope();
  const defaultBranchId = isBranchLocked ? String(currentBranchId) : "0";

  const today = new Date();
  const defaultDate = today.toISOString().split("T")[0];

  const [branchId, setBranchId] = useState<string>(defaultBranchId);
  const [categoryId, setCategoryId] = useState<string>("0");
  const [fromDate, setFromDate] = useState<string>(defaultDate);
  const [toDate, setToDate] = useState<string>(defaultDate);

  const decimalPart = useAppSelector(selectDecimalPart) ?? 3;

  const resetFilters = () => {
    setBranchId(defaultBranchId);
    setCategoryId("0");
    setFromDate(defaultDate);
    setToDate(defaultDate);
  };

  const { data: branches = [], isLoading: isLoadingBranches } = useQuery<BranchOption[]>({
    queryKey: ["branches-list-for-category-wise-sales"],
    queryFn: getBranchList,
    staleTime: 5 * 60 * 1000,
  });

  const { data: categoriesData = [], isLoading: isLoadingCategories } = useQuery<CategoryOption[]>({
    queryKey: ["categories-list-for-category-wise-sales"],
    queryFn: getCategoryList,
    staleTime: 5 * 60 * 1000,
  });

  const categoryOptions = useMemo(() => {
    const opts = categoriesData
      .filter((c) => c && (c.catName || c.name) && String(c.catName || c.name).toLowerCase() !== "all")
      .map((c) => ({ value: String(c.catId ?? c.categoryId ?? 0), label: String(c.catName || c.name || "") }));
    return [{ value: "0", label: "All" }, ...opts];
  }, [categoriesData]);

  const {
    data: reportData,
    isLoading: isLoadingReport,
    isFetching,
    error,
  } = useQuery({
    queryKey: ["category-wise-sales-report", branchId, categoryId, fromDate, toDate, decimalPart],
    queryFn: () =>
      getCategoryWiseSalesReport({
        BranchId: Number(branchId) || 0,
        CategoryId: Number(categoryId) || 0,
        FromDate: fromDate,
        ToDate: toDate,
        Decimals: decimalPart,
      }),
    enabled: !!fromDate && !!toDate,
  });

  const rows: CategoryWiseSalesRow[] = useMemo(() => {
    return reportData?.categoryData || [];
  }, [reportData]);

  const totalData: CategoryWiseTotalData | null = useMemo(() => {
    return reportData?.totalData || null;
  }, [reportData]);

  return {
    filters: {
      branchId,
      setBranchId,
      categoryId,
      setCategoryId,
      fromDate,
      setFromDate,
      toDate,
      setToDate,
      isBranchLocked,
      resetFilters,
    },
    masterData: {
      branches,
      categoryOptions,
      isLoadingBranches,
      isLoadingCategories,
    },
    report: {
      rows,
      totalData,
      isLoading: isLoadingReport || isFetching,
      error,
    },
  };
};
