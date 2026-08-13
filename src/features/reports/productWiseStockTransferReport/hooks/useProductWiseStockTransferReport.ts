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
import type { BranchOption, ProductOption } from "../types";

export const useProductWiseStockTransferReport = () => {
  const decimalPart = useAppSelector(selectDecimalPart);
  const { isBranchLocked, initialBranchId } = useBranchScope();

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
  const [fromBranchId, setFromBranchId] = useState<string>(initialBranchId);
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
  const {
    data: reportRows = [],
    isLoading: reportLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: [
      "productWiseStockTransferReport",
      { fromDate, toDate, fromBranchId, toBranchId, productId, decimalPart },
    ],
    queryFn: () =>
      getProductWiseStockTransferReport({
        FromBranchId: Number(fromBranchId),
        ToBranchId: Number(toBranchId),
        ProductId: Number(productId),
        FromDate: fromDate,
        ToDate: toDate,
        Decimals: decimalPart,
      }),
  });

  // ── Client-side search ──────────────────────────────────────────────────────
  const filteredRows = useMemo(() => {
    if (!searchTerm.trim()) return reportRows;
    const term = searchTerm.toLowerCase();
    return reportRows.filter(
      (row) =>
        row.product?.toLowerCase().includes(term) ||
        row.code?.toLowerCase().includes(term) ||
        row.fromBranch?.toLowerCase().includes(term) ||
        row.toBranch?.toLowerCase().includes(term) ||
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
    const isBackofficeMode =
      sessionStorage.getItem("tempSystemType") === "backoffice" ||
      localStorage.getItem("systemType") === "backoffice";
    const activeBranchId = isBackofficeMode
      ? sessionStorage.getItem("backoffice_activeBranchId")
      : localStorage.getItem("activeBranchId");

    setFromDate(defaultFrom);
    setToDate(today.toISOString().split("T")[0]);
    setFromBranchId(activeBranchId || "1");
    setToBranchId("0");
    setProductId("0");
    setSearchTerm("");
  };

  return {
    filters: {
      fromDate, setFromDate,
      toDate, setToDate,
      fromBranchId, setFromBranchId,
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
