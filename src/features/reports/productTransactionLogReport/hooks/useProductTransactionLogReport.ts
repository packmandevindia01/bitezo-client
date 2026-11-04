import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { useBranchScope, toReportBranchId } from "../../../../hooks/useBranchScope";
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
import { firstOfMonthLocal, localDateString, hasQty } from "../utils/normalizeTransactionLog";

const reportErrorMessage = (err: unknown): string => {
  const e = err as { response?: { status?: number; data?: { message?: string } }; message?: string };
  const status = e?.response?.status;
  const msg = e?.response?.data?.message || e?.message || "Request failed";
  if (status === 403) return `No permission to view this report (403): ${msg} Log in to the Back Office with a user that has access to Inventory reports.`;
  if (status === 401) return "Session expired (401). Please log in again.";
  return status ? `Could not load the report (${status}): ${msg}` : `Could not load the report: ${msg}`;
};

export const useProductTransactionLogReport = () => {
  const [searchParams] = useSearchParams();
  // ── Filter states ────────────────────────────────────────────────────────────
  // local dates (toISOString() is UTC → early morning in GCC / India it gave yesterday as "To Date")
  const [fromDate, setFromDate] = useState<string>(() => firstOfMonthLocal());
  const [toDate, setToDate] = useState<string>(() => localDateString());
  const { initialBranchId, isBranchLocked } = useBranchScope();
  const [branchId, setBranchId] = useState<string>(initialBranchId);
  const [productId, setProductId] = useState<string>(searchParams.get("product") || "");
  const initialProductName = searchParams.get("productName") || "";
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
    error: reportError,
    refetch,
  } = useQuery({
    queryKey: ["productTransactionLogReport", { fromDate, toDate, branchId, productId }],
    queryFn: () =>
      getProductTransactionLogReport({
        // cleared Branch box ("") used to send BranchId=0 — backend: 1 = All, 2 = Main …
        BranchId: toReportBranchId(branchId),
        ProductId: Number(productId),
        FromDate: fromDate,
        ToDate: toDate,
      }),
    enabled: productId !== "0" && productId !== "",
    staleTime: 0,
    refetchOnMount: true,
    // 403 / 401 will not change by retrying — show the reason at once
    retry: (count, err) => ![401, 403].includes(Number((err as { response?: { status?: number } })?.response?.status)) && count < 2,
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
    setFromDate(firstOfMonthLocal());
    setToDate(localDateString());
    setBranchId(initialBranchId);
    setProductId("");
    setTransactionType("All");
    setSearchTerm("");
    setTimeout(() => {
      refetch();
    }, 0);
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
    masterData: { branches, branchesLoading, products, productsLoading, initialProductName },
    report: {
      logData: filteredLogData,
      totalData,
      // totals (opening stock …) exist even when the period has no movements
      // a failed request (403 no permission, 500 …) must not look like "no records"
      errorMessage: reportError ? reportErrorMessage(reportError) : "",
      hasTotals: Boolean(apiData) && Object.values(totalData).some(hasQty),
      isLoading: reportLoading || isFetching,
      refetch,
    },
  };
};
