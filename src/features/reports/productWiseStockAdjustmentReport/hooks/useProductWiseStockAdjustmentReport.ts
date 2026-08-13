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
import type { BranchOption, ProductOption, AdjustmentTypeOption } from "../types";

export const EFFECT_OPTIONS = [
  { label: "All", value: "" },
  { label: "In (+)", value: "+" },
  { label: "Out (-)", value: "-" },
];

export const useProductWiseStockAdjustmentReport = () => {
  const decimalPart = useAppSelector(selectDecimalPart);
  const { isBranchLocked, initialBranchId } = useBranchScope();

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
  const [branchId, setBranchId] = useState<string>(initialBranchId);
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
  const {
    data: reportRows = [],
    isLoading: reportLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: [
      "productWiseStockAdjustmentReport",
      { fromDate, toDate, branchId, productId, typeId, effect, decimalPart },
    ],
    queryFn: () =>
      getProductWiseStockAdjustmentReport({
        BranchId: Number(branchId),
        ProductId: Number(productId),
        TypeId: Number(typeId),
        Effect: effect,
        FromDate: fromDate,
        ToDate: toDate,
        Decimals: decimalPart,
      }),
  });

  // ── Client-side search filter ───────────────────────────────────────────────
  const filteredRows = useMemo(() => {
    if (!searchTerm.trim()) return reportRows;
    const term = searchTerm.toLowerCase();
    return reportRows.filter(
      (row) =>
        row.product?.toLowerCase().includes(term) ||
        row.code?.toLowerCase().includes(term) ||
        row.type?.toLowerCase().includes(term) ||
        String(row.refNo).includes(term)
    );
  }, [reportRows, searchTerm]);

  // ── Grand totals ────────────────────────────────────────────────────────────
  const grandTotals = useMemo(
    () => ({
      qty: filteredRows.reduce((s, r) => s + Number(r.qty || 0), 0),
      netAmount: filteredRows.reduce((s, r) => s + Number(r.netAmount || 0), 0),
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

    const isBackofficeMode =
      sessionStorage.getItem("tempSystemType") === "backoffice" ||
      localStorage.getItem("systemType") === "backoffice";
    const activeBranchId = isBackofficeMode
      ? sessionStorage.getItem("backoffice_activeBranchId")
      : localStorage.getItem("activeBranchId");

    setFromDate(defaultFrom);
    setToDate(defaultTo);
    setBranchId(activeBranchId || "1");
    setProductId("0");
    setTypeId("0");
    setEffect("");
    setSearchTerm("");
  };

  return {
    filters: {
      fromDate,
      setFromDate,
      toDate,
      setToDate,
      branchId,
      setBranchId,
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
