// ─── System Registration Types ─────────────────────────────────────────────

export type SystemType = "pos" | "backoffice";

export interface SystemRegistrationData {
  systemName: string;
  systemType: SystemType;
  branchId: string;
  branchName: string;
  counterId?: string;
  counterName?: string;
  registeredAt: string; // ISO date string
}

// ─── Cashier Shift Types ────────────────────────────────────────────────────

export interface CashierShift {
  shiftId: string;
  openedAt: string;       // ISO date string
  openingCash: number;
  notes: string;
  closedAt?: string;      // ISO date string
  closingCash?: number;
  closingNotes?: string;
  status: "open" | "closed";
  cashierId: string;
  cashierName: string;
}

// ─── Branch & Counter ────────────────────────────────────────────────────────

export interface BranchOption {
  id: number;
  name: string;
}

export interface CounterOption {
  id: number;
  name: string;
}

export interface TerminalOption {
  id: number;
  name: string;
}
