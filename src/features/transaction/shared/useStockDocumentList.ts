import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { formatDateOnly } from "@shared/lib/date";
import { toReportBranchId, useBranchScope } from "../../../hooks/useBranchScope";
import type { StockDocumentBranch, StockDocumentListParams, StockDocumentRow } from "./stockDocumentApi";
import { useStockBranches } from "./useStockBranches";

export interface StockDocumentListConfig {
  /** Prefix of the query keys, e.g. stockAdjustment */
  queryPrefix: string;
  getDetails: (params: StockDocumentListParams) => Promise<StockDocumentRow[]>;
  getBranchList: () => Promise<StockDocumentBranch[]>;
  /** Start of the date filter. Default: the first of this month. */
  defaultFromDate?: () => string;
}

const newestFirst = (a: StockDocumentRow, b: StockDocumentRow) => {
  const dateA = new Date(a.transDate ?? "").getTime();
  const dateB = new Date(b.transDate ?? "").getTime();
  if (dateA !== dateB) return dateB - dateA;
  return (b.transId || 0) - (a.transId || 0);
};

/** Filters, branch list and rows of the saved stock document lists. */
export const useStockDocumentList = ({ queryPrefix, getDetails, getBranchList, defaultFromDate }: StockDocumentListConfig) => {
  const { isBranchLocked, initialBranchId } = useBranchScope();
  const [filters, setFilters] = useState({
    branchId: initialBranchId ? String(initialBranchId) : "",
    isBranchLocked,
    fromDate: defaultFromDate ? defaultFromDate() : formatDateOnly(new Date(new Date().setDate(1))),
    toDate: formatDateOnly(new Date()),
  });

  const { branches } = useStockBranches({ queryPrefix, getBranchList, navbarFirst: true });

  const { data: records = [], isLoading: loading, error } = useQuery({
    queryKey: [`${queryPrefix}List`, filters.branchId, filters.fromDate, filters.toDate],
    queryFn: async () => {
      const data: unknown = await getDetails({
        BranchId: toReportBranchId(filters.branchId),
        FromDate: formatDateOnly(filters.fromDate),
        ToDate: formatDateOnly(filters.toDate),
        Decimals: 3,
      });
      const list = Array.isArray(data) ? (data as StockDocumentRow[]) : ((data as { data?: StockDocumentRow[] } | null)?.data ?? []);
      return [...list].sort(newestFirst);
    },
  });

  const handleFilterChange = (key: "branchId" | "fromDate" | "toDate", value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  return { records, loading, error: error ? error.message : null, filters, handleFilterChange, branches };
};
