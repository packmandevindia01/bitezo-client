import { useCallback, useEffect, useMemo, useState } from "react";
import { useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { useBranchScope } from "../../../hooks/useBranchScope";
import { subscribeToTransactionUpdates } from "../../../utils/transactionSync";
import { branchApi } from "../../inventory/branches/services/branchApi";
import { defaultFilters } from "./filterDefaults";
import type { FilterValues, ReportDefinition, ReportRow, ReportTable } from "./types";

/** Readable reason for a failed report load (a 403 used to show as "No records found"). */
export const reportErrorMessage = (err: unknown): string => {
  const e = err as { response?: { status?: number; data?: { message?: string } }; message?: string };
  const status = e?.response?.status;
  const msg = e?.response?.data?.message || e?.message || "Request failed";
  if (status === 403) return `No permission to view this report (403). ${msg}`;
  if (status === 401) return "Session expired (401). Please log in again.";
  return status ? `Could not load the report (${status}): ${msg}` : `Could not load the report: ${msg}`;
};

const EMPTY: ReportTable = { columns: [], rows: [] };

/** Rows matching the search box. Backend totals describe every row, so they are dropped while searching. */
export const applyReportSearch = (table: ReportTable, term: string, match?: (row: ReportRow, term: string) => boolean): ReportTable => {
  const t = term.trim().toLowerCase();
  if (!t || !match) return table;
  return { ...table, rows: table.rows.filter((r) => match(r, t)), totalsOverride: undefined };
};

export const useReport = (def: ReportDefinition) => {
  const queryClient = useQueryClient();
  const { isBranchLocked, initialBranchId } = useBranchScope();
  const initial = useMemo(() => defaultFilters(def.filters, new Date(), initialBranchId), [def.filters, initialBranchId]);
  const [searchParams] = useSearchParams();
  const [filters, setFilters] = useState<FilterValues>(() => {
    const fromUrl = Object.entries(def.urlParams ?? {}).flatMap(([key, param]) => {
      const value = searchParams.get(param);
      return value ? [[key, value]] : [];
    });
    return { ...initial, ...Object.fromEntries(fromUrl) };
  });

  // Changing a filter resets the lookups that depend on it (e.g. Series when the branch changes).
  const setFilter = useCallback((key: string, value: string) => setFilters((f) => {
    const next = { ...f, [key]: value };
    def.filters.forEach((d) => { if (d.kind === "lookup" && d.dependsOn?.includes(key) && f[key] !== value) next[d.key] = "0"; });
    return next;
  }), [def.filters]);

  const hasBranch = def.filters.some((f) => f.kind === "branch");
  const { data: branches = [] } = useQuery({
    queryKey: ["activeBranches"],
    queryFn: () => branchApi.fetchBranchNames(true),
    staleTime: 5 * 60 * 1000,
    enabled: hasBranch,
    meta: { silentError: true }, // a failure here is explained by the report error banner
  });

  // Lookup filters (e.g. Category / Group lists) — options loaded once, "All" (0) first.
  const lookupDefs = def.filters.filter((f): f is Extract<typeof f, { kind: "lookup" }> => f.kind === "lookup");
  const lookupResults = useQueries({
    queries: lookupDefs.map((f) => ({
      queryKey: ["reportLookup", f.queryKey, ...(f.dependsOn ?? []).map((k) => filters[k])],
      queryFn: () => f.load(filters),
      staleTime: 5 * 60 * 1000,
      meta: { silentError: true },
    })),
  });
  const lookups: Record<string, { label: string; value: string }[]> = {};
  lookupDefs.forEach((f, i) => {
    const opts = (lookupResults[i]?.data ?? []).filter((o) => o.value !== "0");
    lookups[f.key] = [{ label: f.allLabel ?? "All", value: "0" }, ...opts];
  });

  // Nothing loads until View is pressed; the table shows the filters applied by the last View.
  // A report opened from a link with filters in the URL (drill-down) loads straight away.
  const [applied, setApplied] = useState<FilterValues | null>(() =>
    Object.values(def.urlParams ?? {}).some((param) => searchParams.get(param)) ? filters : null);
  const requiredValue = def.requires && applied ? applied[def.requires.key] : undefined;
  const waiting = !!def.requires && (!requiredValue || requiredValue === "0");
  const query = useQuery({
    queryKey: [def.id, applied],
    queryFn: () => def.fetch(applied as FilterValues),
    enabled: !!applied && !waiting,
    meta: { silentError: true }, // shown inside the report (error banner), not as a toast
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: "always",
    refetchOnReconnect: "always",
  });

  // Same live refresh the old report pages had: any transaction (POS sale, settlement …) reloads the report.
  useEffect(() => subscribeToTransactionUpdates(() => {
    void queryClient.invalidateQueries({ queryKey: [def.id] });
  }), [queryClient, def.id]);

  const [search, setSearch] = useState("");
  const placeholder = useMemo<ReportTable>(() => (def.columns ? { columns: def.columns, rows: [] } : EMPTY), [def.columns]);
  const loaded = query.data ?? placeholder;
  const table = useMemo(() => applyReportSearch(loaded, search, def.search?.match), [loaded, search, def.search?.match]);

  // View: load the report for the filters on screen. Pressing it again with the same filters reloads.
  const { refetch } = query;
  const view = useCallback(() => {
    if (applied && JSON.stringify(applied) === JSON.stringify(filters)) void refetch();
    else setApplied({ ...filters });
  }, [applied, filters, refetch]);

  return {
    filters,
    /** Filters of the report on screen — use for the subtitle and print header. */
    appliedFilters: applied ?? filters,
    setFilter,
    view,
    branches: branches as { id: number | string; branchName: string }[],
    isBranchLocked,
    lookups,
    table,
    search,
    setSearch,
    isLoading: query.isFetching,
    waitingMessage: !applied ? "Choose the filters and press View to load the report." : waiting ? def.requires?.message ?? "" : "",
    error: query.error ? reportErrorMessage(query.error) : "",
  };
};
