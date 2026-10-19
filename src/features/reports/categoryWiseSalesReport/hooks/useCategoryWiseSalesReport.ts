import { useState, useMemo, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getBranchList,
  getCategoryList,
  getCategoryWiseSalesReport,
} from "../services/categoryWiseSalesReportApi";
import { useAppSelector } from "../../../../app/hooks";
import { selectDecimalPart } from "../../../auth/store/authSlice";
import type { BranchOption, CategoryOption, CategoryWiseSalesRow, CategoryWiseTotalData } from "../types";
import { useBranchScope } from "../../../../hooks/useBranchScope";
import { subscribeToTransactionUpdates } from "../../../../utils/transactionSync";
import { subscribeToCategoryUpdates } from "../../../inventory/category/utils/categorySync";

export const useCategoryWiseSalesReport = () => {
  const queryClient = useQueryClient();
  const { initialBranchId: currentBranchId, isBranchLocked } = useBranchScope();
  const defaultBranchId = isBranchLocked ? String(currentBranchId) : "0";

  const today = new Date();
  const defaultDate = today.toISOString().split("T")[0];

  const [branchId, setBranchId] = useState<string>(defaultBranchId);
  const [categoryId, setCategoryId] = useState<string>("0");
  const [fromDate, setFromDate] = useState<string>(defaultDate);
  const [toDate, setToDate] = useState<string>(defaultDate);

  const decimalPart = useAppSelector(selectDecimalPart) ?? 3;

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

  // Bidirectional master data lookup maps for category code, name, and id
  const { categoryByIdMap, categoryByNameMap, categoryByCodeMap } = useMemo(() => {
    const byId = new Map<number, { id: number; code: string; name: string }>();
    const byName = new Map<string, { id: number; code: string; name: string }>();
    const byCode = new Map<string, { id: number; code: string; name: string }>();

    const safeCategories = Array.isArray(categoriesData)
      ? categoriesData
      : Array.isArray((categoriesData as any)?.data)
      ? (categoriesData as any).data
      : [];

    safeCategories.forEach((c: any) => {
      if (!c) return;
      const id = Number(c.catId ?? c.categoryId ?? c.id ?? 0);
      const code = String(c.catCode ?? c.code ?? c.categoryCode ?? "").trim();
      const name = String(c.catName ?? c.name ?? c.categoryName ?? c.catgeory ?? c.category ?? "").trim();
      const entry = { id, code, name };

      if (id > 0) {
        byId.set(id, entry);
      }
      if (name) {
        byName.set(name.toLowerCase(), entry);
      }
      if (code) {
        byCode.set(code.toLowerCase(), entry);
      }
    });

    return { categoryByIdMap: byId, categoryByNameMap: byName, categoryByCodeMap: byCode };
  }, [categoriesData]);

  const categoryOptions = useMemo(() => {
    const safeCategories = Array.isArray(categoriesData)
      ? categoriesData
      : Array.isArray((categoriesData as any)?.data)
      ? (categoriesData as any).data
      : [];
    const opts = safeCategories
      .filter((c: any) => c && (c.catName || c.name) && String(c.catName || c.name).toLowerCase() !== "all")
      .map((c: any) => ({ value: String(c.catId ?? c.categoryId ?? c.id ?? 0), label: String(c.catName || c.name || "") }));
    return [{ value: "0", label: "All" }, ...opts];
  }, [categoriesData]);

  const {
    data: reportData,
    isLoading: isLoadingReport,
    isFetching,
    error,
    refetch,
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
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: "always",
    refetchOnReconnect: "always",
  });

  // Real-time synchronization: refresh report whenever any transaction entry occurs
  useEffect(() => {
    const unsubTrans = subscribeToTransactionUpdates(() => {
      void queryClient.invalidateQueries({ queryKey: ["category-wise-sales-report"] });
      void queryClient.refetchQueries({ queryKey: ["category-wise-sales-report"] });
    });
    const unsubCat = subscribeToCategoryUpdates(() => {
      void queryClient.invalidateQueries({ queryKey: ["categories-list-for-category-wise-sales"] });
    });
    return () => {
      unsubTrans();
      unsubCat();
    };
  }, [queryClient]);

  // Auto-refresh when user returns to this tab or window gains focus
  useEffect(() => {
    const handleFocus = () => {
      void queryClient.invalidateQueries({ queryKey: ["category-wise-sales-report"] });
      void refetch();
    };
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [queryClient, refetch]);

  const resetFilters = () => {
    setBranchId(defaultBranchId);
    setCategoryId("0");
    setFromDate(defaultDate);
    setToDate(defaultDate);
    setTimeout(() => {
      refetch();
    }, 0);
  };

  const rawRows: CategoryWiseSalesRow[] = useMemo(() => {
    if (!reportData) return [];
    if (Array.isArray(reportData)) return reportData;
    if (Array.isArray(reportData.categoryData)) return reportData.categoryData;
    if (Array.isArray((reportData as any).data)) return (reportData as any).data;
    if (Array.isArray((reportData as any).rows)) return (reportData as any).rows;
    return [];
  }, [reportData]);

  const rows: CategoryWiseSalesRow[] = useMemo(() => {
    return rawRows.map((row: any, index: number) => {
      // 1. Extract raw identifiers from row
      const rawId =
        row.categoryId ??
        row.catId ??
        row.category_id ??
        row.cat_id ??
        row.id ??
        row.Id ??
        (typeof row.category === "number" ? row.category : undefined);

      const rawCode = (
        row.categoryCode ??
        row.catCode ??
        row.category_code ??
        row.cat_code ??
        row.code ??
        row.CategoryCode ??
        row.CatCode ??
        row.Code ??
        row.categorycode ??
        ""
      )?.toString().trim();

      const rawName = (
        row.categoryName ??
        row.catName ??
        row.category_name ??
        row.cat_name ??
        row.catgeory ??
        row.category ??
        row.Catgeory ??
        row.Category ??
        row.CategoryName ??
        row.CatName ??
        row.name ??
        row.Name ??
        row.categoryname ??
        ""
      )?.toString().trim();

      // 2. Resolve matching category from master list
      let match: { id: number; code: string; name: string } | undefined;

      if (rawId && categoryByIdMap.has(Number(rawId))) {
        match = categoryByIdMap.get(Number(rawId));
      } else if (rawCode && categoryByCodeMap.has(rawCode.toLowerCase())) {
        match = categoryByCodeMap.get(rawCode.toLowerCase());
      } else if (rawName && categoryByNameMap.has(rawName.toLowerCase())) {
        match = categoryByNameMap.get(rawName.toLowerCase());
      } else if (rawCode && !isNaN(Number(rawCode)) && categoryByIdMap.has(Number(rawCode))) {
        match = categoryByIdMap.get(Number(rawCode));
      } else if (categoryId && categoryId !== "0" && rawRows.length === 1 && categoryByIdMap.has(Number(categoryId))) {
        match = categoryByIdMap.get(Number(categoryId));
      }

      // 3. Determine final Category Code and Category Name
      const finalCode =
        match?.code ||
        (rawCode && rawCode !== "-" ? rawCode : "") ||
        (rawId ? String(rawId) : "-");

      const finalName =
        (rawName && rawName !== "-" && rawName !== "null" && rawName !== "undefined" ? rawName : "") ||
        match?.name ||
        (categoryId && categoryId !== "0" && categoryByIdMap.get(Number(categoryId))?.name ? categoryByIdMap.get(Number(categoryId))!.name : "") ||
        "Uncategorized";

      return {
        ...row,
        sNo: row.sNo ?? (index + 1),
        categoryId: match?.id ?? (rawId ? Number(rawId) : row.categoryId),
        categoryCode: finalCode,
        catCode: finalCode,
        code: finalCode,
        categoryName: finalName,
        catName: finalName,
        catgeory: finalName,
        category: finalName,
        Catgeory: finalName,
        Category: finalName,
      };
    });
  }, [rawRows, categoryByIdMap, categoryByNameMap, categoryByCodeMap, categoryId]);

  const totalData: CategoryWiseTotalData | null = useMemo(() => {
    if (!reportData) return null;
    if (Array.isArray(reportData.totalData)) {
      return reportData.totalData[0] || null;
    }
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
      refetch,
    },
  };
};
