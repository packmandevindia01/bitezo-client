// No imports needed

/** Backend branch ids: 1 = "All" (every branch), 2+ = real branches (2 = Main). */
export const ALL_BRANCH_ID = 1;

/** True for the "All" pseudo-branch (by id, or by name when the id is missing). */
export const isAllBranch = (b: { id?: number | string; branchId?: number | string; name?: string; branchName?: string } | null | undefined): boolean =>
  !!b && (Number(b.id ?? b.branchId) === ALL_BRANCH_ID || String(b.name ?? b.branchName ?? "").trim().toLowerCase() === "all");

/** Report filter → backend BranchId: empty / 0 / invalid means "All" (1), never 0. */
export const toReportBranchId = (value: string | number | null | undefined): number => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : ALL_BRANCH_ID;
};

export const useBranchScope = () => {
  const isBackofficeMode = sessionStorage.getItem("tempSystemType") === "backoffice" || localStorage.getItem("systemType") === "backoffice";
  const globalBranchId = isBackofficeMode 
    ? sessionStorage.getItem("backoffice_activeBranchId") 
    : localStorage.getItem("activeBranchId");
  
  // The API returns 'All' branch with an ID of 1.
  // Any branch ID other than 1 means the scope is locked to a specific branch.
  const isBranchLocked = globalBranchId !== null && Number(globalBranchId) !== 1;
  const initialBranchId = globalBranchId !== null ? globalBranchId : "1";

  return { isBranchLocked, initialBranchId };
};
