import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  getProductWiseStockTransferReport,
  getBranchList,
  getProductList,
} from "../services/productWiseStockTransferReportApi";
import { useAppSelector } from "../../../../app/hooks";
import { selectDecimalPart } from "../../../auth/store/authSlice";
import { useBranchScope } from "../../../../hooks/useBranchScope";
import type { BranchOption, ProductOption, ProductWiseStockTransferRow } from "../types";

export const useProductWiseStockTransferReport = () => {
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
  const [toDate, setToDate] = useState<string>(() =>
    new Date().toISOString().split("T")[0]
  );
  const [fromBranchId, setFromBranchId] = useState<string>(defaultBranchId);

  const handleSetFromBranchId = (val: string) => {
    setFromBranchId(val || defaultBranchId);
  };

  const [toBranchId, setToBranchId] = useState<string>("0");
  const [productId, setProductId] = useState<string>("0");
  const [searchTerm, setSearchTerm] = useState("");

  // ── Master data ─────────────────────────────────────────────────────────────
  const { data: branches = [] as BranchOption[], isLoading: branchesLoading } = useQuery({
    queryKey: ["branchList", "all"],
    queryFn: getBranchList,
  });

  const { data: products = [] as ProductOption[], isLoading: productsLoading } = useQuery({
    queryKey: ["productList", "all"],
    queryFn: getProductList,
  });

  // ── Report query ─────────────────────────────────────────────────────────────
  const finalFromBranchId = Number(fromBranchId) || Number(defaultBranchId) || 1;
  const {
    data: rawReportRows = [],
    isLoading: reportLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: [
      "productWiseStockTransferReport",
      { fromDate, toDate, fromBranchId: finalFromBranchId, toBranchId, productId, decimalPart },
    ],
    queryFn: () =>
      getProductWiseStockTransferReport({
        FromBranchId: finalFromBranchId,
        ToBranchId: Number(toBranchId) || 0,
        ProductId: Number(productId) || 0,
        FromDate: fromDate,
        ToDate: toDate,
        Decimals: decimalPart,
      }),
    staleTime: 0,
    refetchOnMount: "always",
  });

  const reportRows: ProductWiseStockTransferRow[] = useMemo(() => {
    return Array.isArray(rawReportRows) ? rawReportRows : [];
  }, [rawReportRows]);

  // ── Client-side search ──────────────────────────────────────────────────────
  const filteredRows = useMemo(() => {
    if (!searchTerm.trim()) return reportRows;
    const term = searchTerm.toLowerCase();
    return reportRows.filter(
      (row) =>
        row?.product?.toLowerCase().includes(term) ||
        row?.code?.toLowerCase().includes(term) ||
        row?.fromBranch?.toLowerCase().includes(term) ||
        row?.toBranch?.toLowerCase().includes(term) ||
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

    setFromDate(defaultFrom);
    setToDate(today.toISOString().split("T")[0]);
    setFromBranchId(defaultBranchId);
    setToBranchId("0");
    setProductId("0");
    setSearchTerm("");
    setTimeout(() => {
      refetch();
    }, 0);
  };

  return {
    filters: {
      defaultBranchId,
      fromDate, setFromDate,
      toDate, setToDate,
      fromBranchId, setFromBranchId: handleSetFromBranchId,
      toBranchId, setToBranchId,
      productId, setProductId,
      searchTerm, setSearchTerm,
      resetFilters,
      isBranchLocked,
    },
    masterData: {
      branches, branchesLoading,
      products, productsLoading,
    },
    report: {
      rows: filteredRows,
      grandTotals,
      isLoading: reportLoading || isFetching,
      refetch,
    },
  };
};
