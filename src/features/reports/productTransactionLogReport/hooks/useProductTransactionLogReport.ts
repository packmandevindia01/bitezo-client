import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useBranchScope } from "../../../../hooks/useBranchScope";
import {
  getBranchList,
  getProductList,
  getProductTransactionLogReport,
} from "../services/productTransactionLogReportApi";
import type {
  BranchOption,
  ProductOption,
  ProductTransactionLogRecord,
  ProductTransactionLogTotals,
} from "../types";

export const useProductTransactionLogReport = () => {
  // ── Filter states ────────────────────────────────────────────────────────────
  const [fromDate, setFromDate] = useState<string>(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split("T")[0];
  });
  const [toDate, setToDate] = useState<string>(() =>
    new Date().toISOString().split("T")[0]
  );
  const { initialBranchId, isBranchLocked } = useBranchScope();
  const [branchId, setBranchId] = useState<string>(initialBranchId);
  const [productId, setProductId] = useState<string>("");
  const [transactionType, setTransactionType] = useState<string>("All");
  const [searchTerm, setSearchTerm] = useState("");

  // ── Master data queries ──────────────────────────────────────────────────────
  const { data: branches = [] as BranchOption[], isLoading: branchesLoading } = useQuery({
    queryKey: ["branchList", "all"],
    queryFn: getBranchList,
  });

  const { data: products = [] as ProductOption[], isLoading: productsLoading } = useQuery({
    queryKey: ["productList"],
    queryFn: getProductList,
  });

  // ── Report query ─────────────────────────────────────────────────────────────
  const {
    data: apiData,
    isLoading: reportLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ["productTransactionLogReport", { fromDate, toDate, branchId, productId }],
    queryFn: () =>
      getProductTransactionLogReport({
        BranchId: Number(branchId),
        ProductId: Number(productId),
        FromDate: fromDate,
        ToDate: toDate,
      }),
    enabled: productId !== "0" && productId !== "",
  });

  // ── Parse API response ────────────────────────────────────────────────────────
  const logData: ProductTransactionLogRecord[] = useMemo(() => {
    if (!apiData) return [];
    return apiData.logData ?? [];
  }, [apiData]);

  const totalData: ProductTransactionLogTotals = useMemo(
    () =>
      apiData?.totalData ?? {
        opening: "-",
        received: "-",
        issued: "-",
        balance: "-",
      },
    [apiData]
  );

  // ── Client-side search filter ─────────────────────────────────────────────────
  const filteredLogData = useMemo(() => {
    let result = logData;

    // Filter by Transaction Type
    if (transactionType !== "All") {
      result = result.filter(
        (row) => row.transaction?.toLowerCase() === transactionType.toLowerCase()
      );
    }

    // Filter by Search Term
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (row) =>
          row.transaction?.toLowerCase().includes(term) ||
          row.voucherNo?.toLowerCase().includes(term) ||
          row.account?.toLowerCase().includes(term) ||
          row.branch?.toLowerCase().includes(term)
      );
    }

    return result;
  }, [logData, searchTerm, transactionType]);

  // ── Reset ─────────────────────────────────────────────────────────────────────
  const resetFilters = () => {
    const today = new Date();
    setFromDate(new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split("T")[0]);
    setToDate(today.toISOString().split("T")[0]);
    setBranchId(initialBranchId);
    setProductId("");
    setTransactionType("All");
    setSearchTerm("");
  };

  return {
    filters: {
      fromDate, setFromDate,
      toDate, setToDate,
      branchId, setBranchId, isBranchLocked,
      productId, setProductId,
      transactionType, setTransactionType,
      searchTerm, setSearchTerm,
      resetFilters,
    },
    masterData: { branches, branchesLoading, products, productsLoading },
    report: {
      logData: filteredLogData,
      totalData,
      isLoading: reportLoading || isFetching,
      refetch,
    },
  };
};
