import { useCallback, useEffect, useMemo, useState } from "react";
import { useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { useBranchScope } from "../../../hooks/useBranchScope";
import { subscribeToTransactionUpdates } from "../../../utils/transactionSync";
import { branchApi } from "../../inventory/branches/services/branchApi";
import { defaultFilters } from "./filterDefaults";
import type { FilterValues, ReportDefinition, ReportTable } from "./types";

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

export const useReport = (def: ReportDefinition) => {
  const queryClient = useQueryClient();
  const { isBranchLocked, initialBranchId } = useBranchScope();
  const initial = useMemo(() => defaultFilters(def.filters, new Date(), initialBranchId), [def.filters, initialBranchId]);
  const [filters, setFilters] = useState<FilterValues>(initial);

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

  const queryKey = [def.id, filters];
  const query = useQuery({
    queryKey,
    queryFn: () => def.fetch(filters),
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

  const reset = useCallback(() => {
    setFilters((f) => {
      const next = { ...initial };
      // A branch locked by the user's scope stays as it is.
      if (isBranchLocked) def.filters.filter((d) => d.kind === "branch").forEach((d) => { next[d.key] = f[d.key]; });
      return next;
    });
  }, [initial, isBranchLocked, def.filters]);

  return {
    filters,
    setFilter,
    reset,
    branches: branches as { id: number | string; branchName: string }[],
    isBranchLocked,
    lookups,
    table: query.data ?? EMPTY,
    isLoading: query.isLoading || query.isFetching,
    error: query.error ? reportErrorMessage(query.error) : "",
    refetch: query.refetch,
  };
};
