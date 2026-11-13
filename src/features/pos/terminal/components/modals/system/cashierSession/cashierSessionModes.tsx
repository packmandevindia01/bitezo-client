import React from "react";
import { LogIn, LogOut, Sun, Moon } from "lucide-react";

/** What the cashier session window does now (moved out of PosCashierSessionModal, 2026-11-13). */
export type Mode = "OPEN_DAY" | "OPEN_SHIFT" | "CLOSE_SHIFT" | "CLOSE_DAY";
export type CloseTab = "SHIFT" | "DAY";
export type EntryMode = "DENOM" | "MANUAL";

export const MODE_CONFIG: Record<Mode, { label: string; buttonLabel: string; balLabel: string; color: string; bgColor: string; icon: React.ReactNode }> = {
  OPEN_DAY:    { label: "Open Business Day",   buttonLabel: "Confirm & Open Day",    balLabel: "Opening Balance", color: "#10b981", bgColor: "#d1fae5", icon: <Sun size={20} /> },
  OPEN_SHIFT:  { label: "Open Shift",           buttonLabel: "Confirm & Open Shift",  balLabel: "Opening Balance", color: "#3b82f6", bgColor: "#dbeafe", icon: <LogIn size={20} /> },
  CLOSE_SHIFT: { label: "Close Shift",          buttonLabel: "Confirm Close Shift",   balLabel: "Closing Balance", color: "#3b82f6", bgColor: "#dbeafe", icon: <Moon size={20} /> },
  CLOSE_DAY:   { label: "Close Business Day",  buttonLabel: "Confirm Close Day",     balLabel: "Closing Balance", color: "#10b981", bgColor: "#d1fae5", icon: <LogOut size={20} /> },
};

/** Opening a day or shift (as opposed to closing one). */
export const isOpeningMode = (mode: Mode | null) => mode === "OPEN_DAY" || mode === "OPEN_SHIFT";
