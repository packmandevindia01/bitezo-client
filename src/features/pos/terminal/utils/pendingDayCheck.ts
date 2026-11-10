export type PendingDayCheck = "clear" | "pending" | "failed";

/** Whether a business day can close. A failed check is its own answer: it says nothing about open orders. */
export const checkPendingOrders = async (
  check: (dayId: number) => Promise<{ hasPendingOrder: boolean }>,
  dayId: number
): Promise<PendingDayCheck> => {
  try {
    return (await check(dayId)).hasPendingOrder ? "pending" : "clear";
  } catch {
    return "failed";
  }
};
