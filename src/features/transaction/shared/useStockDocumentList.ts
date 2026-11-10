import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { formatDateOnly } from "@shared/lib/date";
import { toReportBranchId, useBranchScope } from "../../../hooks/useBranchScope";
import { useAppDispatch, useAppSelector } from "../../../app/hooks";
import { fetchBranches, fetchBranchNames } from "../../inventory/branches/services/branchApi";
import { subscribeToBranchUpdates } from "../../inventory/branches/utils/branchSync";
import { fetchGlobalBranches } from "../../inventory/shared/store/masterDataSlice";
import type { StockDocumentBranch, StockDocumentListParams, StockDocumentRow } from "./stockDocumentApi";

export interface StockDocumentListConfig {
  /** Prefix of the query keys, e.g. stockAdjustment */
  queryPrefix: string;
  getDetails: (params: StockDocumentListParams) => Promise<StockDocumentRow[]>;
  getBranchList: () => Promise<StockDocumentBranch[]>;
}

interface RawBranch {
  id?: number | string;
  branchId?: number | string;
  BranchId?: number | string;
  Id?: number | string;
  branchName?: string;
  BranchName?: string;
  name?: string;
  Name?: string;
}

interface BranchOption {
  label: string;
  value: string;
}

/** Keeps the first name seen for each id and ignores rows without an id or a name. */
const toBranchOptions = (branches: readonly RawBranch[]): BranchOption[] => {
  const byId = new Map<string, string>();
  branches.forEach((b) => {
    const id = String(b.id ?? b.branchId ?? b.BranchId ?? b.Id ?? "");
    const name = String(b.branchName ?? b.BranchName ?? b.name ?? b.Name ?? "");
    if (id && id !== "0" && name && !byId.has(id)) byId.set(id, name);
  });
  return Array.from(byId, ([value, label]) => ({ label, value }));
};

const newestFirst = (a: StockDocumentRow, b: StockDocumentRow) => {
  const dateA = new Date(a.transDate ?? "").getTime();
  const dateB = new Date(b.transDate ?? "").getTime();
  if (dateA !== dateB) return dateB - dateA;
  return (b.transId || 0) - (a.transId || 0);
};

/** Filters, branch list and rows of the saved Stock Adjustment and Physical Entry lists. */
export const useStockDocumentList = ({ queryPrefix, getDetails, getBranchList }: StockDocumentListConfig) => {
  const dispatch = useAppDispatch();
  const reduxBranches = useAppSelector((state) => state.masterData.branches) as readonly RawBranch[];
  const { isBranchLocked, initialBranchId } = useBranchScope();
  const [filters, setFilters] = useState({
    branchId: initialBranchId ? String(initialBranchId) : "",
    isBranchLocked,
    fromDate: formatDateOnly(new Date(new Date().setDate(1))),
    toDate: formatDateOnly(new Date()),
  });

  const { data: fetchedBranches = [], refetch: refetchBranches } = useQuery({
    queryKey: [`${queryPrefix}Branches`],
    queryFn: async () => {
      const results = await Promise.allSettled([fetchBranchNames(true), fetchBranches(), fetchBranchNames(false), getBranchList()]);
      const fetched = results.flatMap((r) => (r.status === "fulfilled" && Array.isArray(r.value) ? (r.value as readonly RawBranch[]) : []));
      return toBranchOptions([...fetched, ...reduxBranches]);
    },
    initialData: () => toBranchOptions(reduxBranches),
    initialDataUpdatedAt: 0,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });

  // A branch added elsewhere can reach Redux after the query has run.
  const branches = useMemo(() => {
    const seen = new Set(fetchedBranches.map((b) => b.value));
    return [...fetchedBranches, ...toBranchOptions(reduxBranches).filter((b) => !seen.has(b.value))];
  }, [fetchedBranches, reduxBranches]);

  useEffect(() => {
    void dispatch(fetchGlobalBranches());
  }, [dispatch]);

  useEffect(
    () =>
      subscribeToBranchUpdates(() => {
        void dispatch(fetchGlobalBranches());
        void refetchBranches();
      }),
    [dispatch, refetchBranches]
  );

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
