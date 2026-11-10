import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAppDispatch, useAppSelector } from "../../../app/hooks";
import { isAllBranch } from "../../../hooks/useBranchScope";
import { fetchBranches, fetchBranchNames } from "../../inventory/branches/services/branchApi";
import { subscribeToBranchUpdates } from "../../inventory/branches/utils/branchSync";
import { fetchGlobalBranches } from "../../inventory/shared/store/masterDataSlice";
import type { StockDocumentBranch } from "./stockDocumentApi";

export interface StockBranchesConfig {
  /** Prefix of the query key, e.g. stockAdjustment */
  queryPrefix: string;
  getBranchList: () => Promise<StockDocumentBranch[]>;
  /** True: the order the navbar shows, with the API's All first. False: the branch master first, for form defaults. */
  navbarFirst?: boolean;
  /** False: only what the requests returned. Physical Entry derives its branch from the list before it has loaded. */
  seedFromStore?: boolean;
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

export interface BranchOption {
  label: string;
  value: string;
}

/** Shared so that "nothing yet" keeps one identity across renders. */
const NO_BRANCHES: BranchOption[] = [];

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

/** A stock document belongs to one branch, so a new one never starts on the API's All row. */
export const firstRealBranch = (branches: readonly BranchOption[]): BranchOption | undefined =>
  branches.find((b) => !isAllBranch({ id: b.value, name: b.label }));

/** A form's branch list: no All row, unless an old document is already saved under it, so its branch still shows. */
export const formBranchOptions = (branches: readonly BranchOption[], currentValue: unknown): BranchOption[] =>
  branches.filter((b) => !isAllBranch({ id: b.value, name: b.label }) || b.value === String(currentValue ?? ""));

/** The branch list of the stock documents, from every source that knows branches, kept up to date. */
export const useStockBranches = ({ queryPrefix, getBranchList, navbarFirst = false, seedFromStore = true }: StockBranchesConfig) => {
  const dispatch = useAppDispatch();
  const storeBranches = useAppSelector((state) => state.masterData.branches) as readonly RawBranch[];

  const { data: fetched = NO_BRANCHES, isLoading: loadingBranches, refetch } = useQuery({
    queryKey: [`${queryPrefix}Branches`, navbarFirst ? "navbar" : "master"],
    queryFn: async () => {
      const results = await Promise.allSettled(
        navbarFirst
          ? [fetchBranchNames(true), fetchBranches(), fetchBranchNames(false), getBranchList()]
          : [fetchBranches(), fetchBranchNames(true), fetchBranchNames(false), getBranchList()]
      );
      const lists = results.flatMap((r) => (r.status === "fulfilled" && Array.isArray(r.value) ? (r.value as readonly RawBranch[]) : []));
      return toBranchOptions([...lists, ...storeBranches]);
    },
    initialData: seedFromStore ? () => toBranchOptions(storeBranches) : undefined,
    initialDataUpdatedAt: seedFromStore ? 0 : undefined,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    void dispatch(fetchGlobalBranches());
  }, [dispatch]);

  useEffect(
    () =>
      subscribeToBranchUpdates(() => {
        void dispatch(fetchGlobalBranches());
        void refetch();
      }),
    [dispatch, refetch]
  );

  // A branch added elsewhere can reach the store after the query has run.
  const branches = useMemo(() => {
    if (!seedFromStore) return fetched;
    const seen = new Set(fetched.map((b) => b.value));
    return [...fetched, ...toBranchOptions(storeBranches).filter((b) => !seen.has(b.value))];
  }, [fetched, storeBranches, seedFromStore]);

  return { branches, loadingBranches };
};
