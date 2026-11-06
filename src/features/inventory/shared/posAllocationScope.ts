import { createContext } from "react";

/**
 * Set when the Extras / Modifier pages run inside the POS: categories come from POS master data, the Back
 * Office category and branch lists are not called, and the Branch Allocation tab is hidden.
 */
export interface PosAllocationScope {
  categories: { id: number; name: string }[];
  branchId: number;
}

export const PosAllocationScopeContext = createContext<PosAllocationScope | null>(null);

/**
 * Branches saved from the POS. New record: the logged-in branch. Edited record: its saved branches stay
 * (the update replaces the whole list, so dropping them would remove the item from those branches) and the
 * logged-in branch is added if missing.
 */
export const posBranchIds = (branchId: number, saved: number[] = []): number[] =>
  branchId > 0 && !saved.includes(branchId) ? [...saved, branchId] : saved;
