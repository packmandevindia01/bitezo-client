import { useState, useCallback } from "react";
import type { CashierShift } from "../types";

const SHIFT_KEY = "activeShift";

const loadShift = (): CashierShift | null => {
  try {
    const raw = localStorage.getItem(SHIFT_KEY);
    return raw ? (JSON.parse(raw) as CashierShift) : null;
  } catch {
    return null;
  }
};

const saveShift = (shift: CashierShift | null) => {
  if (shift) {
    localStorage.setItem(SHIFT_KEY, JSON.stringify(shift));
  } else {
    localStorage.removeItem(SHIFT_KEY);
  }
};

// ── Public hook ─────────────────────────────────────────────────────────────

export const useCashierShift = () => {
  const [activeShift, setActiveShift] = useState<CashierShift | null>(loadShift);

  const isShiftOpen = activeShift?.status === "open";

  const openShift = useCallback(
    ({
      openingCash,
      notes,
    }: {
      openingCash: number;
      notes: string;
    }) => {
      const cashierId = localStorage.getItem("userId") ?? "unknown";
      const cashierName = localStorage.getItem("userName") ?? "Cashier";

      const shift: CashierShift = {
        shiftId: `shift-${Date.now()}`,
        openedAt: new Date().toISOString(),
        openingCash,
        notes,
        status: "open",
        cashierId,
        cashierName,
      };

      saveShift(shift);
      setActiveShift(shift);
    },
    []
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

      saveShift(null); // clear active shift
      setActiveShift(null);

      // Store last closed shift history (optional — for reference)
      const history: CashierShift[] = JSON.parse(
        localStorage.getItem("shiftHistory") ?? "[]"
      );
      history.unshift(closed);
      localStorage.setItem("shiftHistory", JSON.stringify(history.slice(0, 20)));
    },
    [activeShift]
  );

  return {
    activeShift,
    isShiftOpen,
    openShift,
    closeShift,
  };
};
