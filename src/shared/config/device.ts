/**
 * Device / session context of this terminal (Phase 2b).
 *
 * The POS read the same values straight from localStorage in dozens of places, with the fallback
 * chain written out each time. Each getter here reproduces EXACTLY one existing chain, so swapping a
 * call site for the getter does not change behaviour. Call sites keep their own final fallback
 * (`getTerminalBranchId() || 1` …), because those differ on purpose (1 = "All branches").
 *
 * Keys:  systemBranchId  — branch this terminal was registered to (system registration)
 *        activeBranchId  — branch chosen at login
 *        branchId        — the logged-in user's branch
 */
type Store = Pick<Storage, "getItem">;
const defaultStore = (): Store | null => (typeof localStorage !== "undefined" ? localStorage : null);

/** `Number(value) || 0` — same as the inline `Number(localStorage.getItem(k)) || …` (NaN / null → 0). */
const num = (key: string, store: Store | null): number => Number(store?.getItem(key)) || 0;

/** Terminal branch: registered branch → login branch → user branch → 0. */
export const getTerminalBranchId = (store: Store | null = defaultStore()): number =>
  num("systemBranchId", store) || num("activeBranchId", store) || num("branchId", store);

/** Branch the terminal was registered to (0 when not registered). */
export const getSystemBranchId = (store: Store | null = defaultStore()): number => num("systemBranchId", store);

/** Login branch → user branch → 0. */
export const getUserBranchId = (store: Store | null = defaultStore()): number =>
  num("activeBranchId", store) || num("branchId", store);

export const getSystemCounterId = (store: Store | null = defaultStore()): number => num("systemCounterId", store);
export const getTerminalId = (store: Store | null = defaultStore()): string => store?.getItem("terminalId") || "";
