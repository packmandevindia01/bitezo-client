import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  getProductWiseStockAdjustmentReport,
  getBranchList,
  getProductList,
  getAdjustmentTypeList,
} from "../services/productWiseStockAdjustmentReportApi";
import { useAppSelector } from "../../../../app/hooks";
import { selectDecimalPart } from "../../../auth/store/authSlice";
import { useBranchScope } from "../../../../hooks/useBranchScope";
import type { BranchOption, ProductOption, AdjustmentTypeOption, ProductWiseStockAdjustmentRow } from "../types";

export const EFFECT_OPTIONS = [
  { label: "All", value: "" },
  { label: "In (+)", value: "+" },
  { label: "Out (-)", value: "-" },
];

export const useProductWiseStockAdjustmentReport = () => {
  const decimalPart = useAppSelector(selectDecimalPart);
  const { isBranchLocked, initialBranchId } = useBranchScope();
  const defaultBranchId = initialBranchId || "1";

  // ── Filter states ───────────────────────────────────────────────────────────
  const [fromDate, setFromDate] = useState<string>(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1)
      .toISOString()
      .split("T")[0];
  });
  const [toDate, setToDate] = useState<string>(() => {
    return new Date().toISOString().split("T")[0];
  });
  const [branchId, setBranchId] = useState<string>(defaultBranchId);

  const handleSetBranchId = (val: string) => {
    setBranchId(val || defaultBranchId);
  };

  const [productId, setProductId] = useState<string>("0");
  const [typeId, setTypeId] = useState<string>("0");
  const [effect, setEffect] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");

  // ── Master data queries ─────────────────────────────────────────────────────
  const { data: branches = [] as BranchOption[], isLoading: branchesLoading } = useQuery({
    queryKey: ["branchList", "all"],
    queryFn: getBranchList,
  });

  const { data: products = [] as ProductOption[], isLoading: productsLoading } = useQuery({
    queryKey: ["productList", "all"],
    queryFn: getProductList,
  });

  const { data: adjustmentTypes = [] as AdjustmentTypeOption[], isLoading: typesLoading } = useQuery({
    queryKey: ["adjustmentTypeList"],
    queryFn: getAdjustmentTypeList,
  });

  // ── Report query (auto-refetches when any filter changes) ───────────────────
  const finalBranchId = Number(branchId) || Number(defaultBranchId) || 1;
  const {
    data: rawReportRows = [],
    isLoading: reportLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: [
      "productWiseStockAdjustmentReport",
      { fromDate, toDate, branchId: finalBranchId, productId, typeId, effect, decimalPart },
    ],
    queryFn: () =>
      getProductWiseStockAdjustmentReport({
        BranchId: finalBranchId,
        ProductId: Number(productId),
        TypeId: Number(typeId),
        Effect: effect,
        FromDate: fromDate,
        ToDate: toDate,
        Decimals: decimalPart,
      }),
    refetchOnMount: "always",
    staleTime: 0,
  });

  const reportRows: ProductWiseStockAdjustmentRow[] = useMemo(() => {
    return Array.isArray(rawReportRows) ? rawReportRows : [];
  }, [rawReportRows]);

  // ── Client-side search filter ───────────────────────────────────────────────
  const filteredRows = useMemo(() => {
    if (!searchTerm.trim()) return reportRows;
    const term = searchTerm.toLowerCase();
    return reportRows.filter(
      (row) =>
        row?.product?.toLowerCase().includes(term) ||
        row?.code?.toLowerCase().includes(term) ||
        row?.type?.toLowerCase().includes(term) ||
        String(row?.refNo || "").includes(term)
    );
  }, [reportRows, searchTerm]);

  // ── Grand totals ────────────────────────────────────────────────────────────
  const grandTotals = useMemo(
    () => ({
      qty: filteredRows.reduce((s, r) => s + Number(r?.qty || 0), 0),
      netAmount: filteredRows.reduce((s, r) => s + Number(r?.netAmount || 0), 0),
    }),
    [filteredRows]
  );

  // ── Reset ───────────────────────────────────────────────────────────────────
  const resetFilters = () => {
    const today = new Date();
    const defaultFrom = new Date(today.getFullYear(), today.getMonth(), 1)
      .toISOString()
      .split("T")[0];
    const defaultTo = today.toISOString().split("T")[0];

    setFromDate(defaultFrom);
    setToDate(defaultTo);
    setBranchId(defaultBranchId);
    setProductId("0");
    setTypeId("0");
    setEffect("");
    setSearchTerm("");
    setTimeout(() => {
      refetch();
    }, 0);
  };

  return {
    filters: {
      defaultBranchId,
      fromDate,
      setFromDate,
      toDate,
      setToDate,
      branchId,
      setBranchId: handleSetBranchId,
      productId,
      setProductId,
      typeId,
      setTypeId,
      effect,
      setEffect,
      searchTerm,
      setSearchTerm,
      resetFilters,
      isBranchLocked,
    },
    masterData: {
      branches,
      branchesLoading,
      products,
      productsLoading,
      adjustmentTypes,
      typesLoading,
    },
    report: {
      rows: filteredRows,
      grandTotals,
      isLoading: reportLoading || isFetching,
      refetch,
    },
  };
};
