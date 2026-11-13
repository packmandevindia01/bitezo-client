/**
 * Which employee an Order or Settle from the terminal runs under (moved out of PosTerminalPage, 2026-11-13).
 * Same order of checks as before:
 * 1. A waiter picked with the Waiter button, if that employee is in this branch's cache.
 * 2. The default employee from the POS configuration, if it is enabled and in this branch's cache.
 * 3. Otherwise the cashier is asked for an employee code.
 * The caller decides what each "not in branch" / "invalid" result does (messages differ for Order and Settle).
 */
export type ActionEmployee =
  | { kind: "waiter"; employeeId: number }
  | { kind: "waiterNotInBranch" }
  | { kind: "default"; employeeId: number }
  | { kind: "defaultNotInBranch" }
  /** Default employee is enabled but its id is 0, negative or not a number. */
  | { kind: "defaultInvalid" }
  | { kind: "ask" };

export const resolveActionEmployee = (
  waiterId: number | null | undefined,
  config: { defaultEmployee?: string; employeeId?: unknown } | null | undefined,
  isInBranch: (employeeId: number) => boolean,
): ActionEmployee => {
  if (waiterId && waiterId > 0) {
    return isInBranch(waiterId) ? { kind: "waiter", employeeId: waiterId } : { kind: "waiterNotInBranch" };
  }
  const defaultEmployeeEnabled = config?.defaultEmployee === "Enable";
  const defaultEmployeeId = Number(config?.employeeId ?? 0);
  if (defaultEmployeeEnabled && defaultEmployeeId > 0) {
    return isInBranch(defaultEmployeeId) ? { kind: "default", employeeId: defaultEmployeeId } : { kind: "defaultNotInBranch" };
  }
  if (defaultEmployeeEnabled) return { kind: "defaultInvalid" };
  return { kind: "ask" };
};
