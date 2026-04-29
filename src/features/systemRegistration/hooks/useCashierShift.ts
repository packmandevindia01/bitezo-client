import { useCallback } from "react";
import { useAppDispatch, useAppSelector } from "../../../app/hooks";
import { startShift, endShift } from "../store/shiftSlice";
import type { CashierShift } from "../types";

export const useCashierShift = () => {
  const dispatch = useAppDispatch();
  const activeShift = useAppSelector((state) => state.shift.activeShift);

  const isShiftOpen = activeShift?.status === "open";

  const openShift = useCallback(
    ({
      openingCash,
      notes,
      cashierId: manualId,
      cashierName: manualName,
    }: {
      openingCash: number;
      notes: string;
      cashierId?: string | number;
      cashierName?: string;
    }) => {
      const cashierId = String(manualId || localStorage.getItem("userId") || "unknown");
      const cashierName = manualName || localStorage.getItem("userName") || "Cashier";


      const shift: CashierShift = {
        shiftId: `shift-${Date.now()}`,
        openedAt: new Date().toISOString(),
        openingCash,
        notes,
        status: "open",
        cashierId,
        cashierName,
      };

      dispatch(startShift(shift));
    },
    [dispatch]
  );

  const closeShift = useCallback(
    ({
      closingCash,
      closingNotes,
    }: {
      closingCash: number;
      closingNotes: string;
    }) => {
      if (!activeShift) return;

      const closed: CashierShift = {
        ...activeShift,
        closedAt: new Date().toISOString(),
        closingCash,
        closingNotes,
        status: "closed",
      };

      dispatch(endShift(closed));
    },
    [activeShift, dispatch]
  );

  return {
    activeShift,
    isShiftOpen,
    openShift,
    closeShift,
  };
};
