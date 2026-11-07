import { formatDateOnly } from "@shared/lib/date";

/** Pure helpers shared by the Purchase Invoice and Purchase Return forms. */
export const toNumber = (value: string | number | undefined) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export { formatDateOnly };

/** Closing stock arrives as a number, a string or an object with one of several field names. */
export const parseStockValue = (res: unknown, formatAmount: (n: number) => string): string => {
  if (res === null || res === undefined) return "0.000";
  if (typeof res === "number") return formatAmount(res);
  if (typeof res === "string") {
    const num = Number(res);
    return isNaN(num) ? res : formatAmount(num);
  }
  if (typeof res === "object") {
    const r = res as Record<string, unknown>;
    const val = r.stock ?? r.closingStock ?? r.currentStock ?? r.balance ?? r.availableStock ?? r.qty;
    if (val !== undefined && val !== null) {
      const num = Number(val);
      return isNaN(num) ? String(val) : formatAmount(num);
    }
  }
  return "0.000";
};

export interface StoredPaymode { paymodeId: number; amount?: number | null }
export interface FormPayment { mode: string; amount: string; paymodeId: number }

/** The payment lines of a saved document, as the form holds them. */
export const mapStoredPayments = (args: {
  rootPaymodeId: number;
  multiPayId: number;
  netAmount: number | null | undefined;
  stored: StoredPaymode[] | null | undefined;
  paymodes: { paymodeId: number; paymodeName: string }[] | undefined;
  decimalPart: number;
}): FormPayment[] => {
  const { rootPaymodeId, multiPayId, netAmount, stored, paymodes, decimalPart } = args;
  const modeOf = (pid: number): string => {
    const found = paymodes?.find((pm) => pm.paymodeId === pid);
    if (found) return found.paymodeName.toLowerCase();
    return pid === 1 ? "cash" : pid === 2 ? "card" : "credit";
  };
  const lines = (list: StoredPaymode[]) => list.map((p) => ({ mode: modeOf(p.paymodeId), amount: p.amount?.toString() || "0", paymodeId: p.paymodeId }));

  if (rootPaymodeId === (multiPayId || 3) && stored && stored.length > 0) {
    // Documents from an old save bug stored only part of the split: the remainder is shown as Cash.
    const storedTotal = stored.reduce((sum, p) => sum + (p.amount || 0), 0);
    const remainder = Number(((netAmount || 0) - storedTotal).toFixed(decimalPart));
    return remainder > 0 ? [{ mode: "cash", amount: remainder.toString(), paymodeId: 1 }, ...lines(stored)] : lines(stored);
  }
  if (stored && stored.length > 0) return lines(stored);
  if (rootPaymodeId && rootPaymodeId !== (multiPayId || 3)) {
    return [{ mode: modeOf(rootPaymodeId), amount: (netAmount || 0).toString(), paymodeId: rootPaymodeId }];
  }
  return [];
};

/** `paymodes` of the save payload: one entry per paymode for a split payment, otherwise empty. */
export const paymodesForSave = (args: {
  rootPaymodeId: number;
  multiPayId: number;
  payments: { paymodeId?: number | string; amount?: string | number }[] | null | undefined;
  fallbackPaymodeId: number;
  decimalPart: number;
}): { paymodeId: number; amount: number }[] => {
  const { rootPaymodeId, multiPayId, payments, fallbackPaymodeId, decimalPart } = args;
  if (rootPaymodeId !== (multiPayId || 3) || !payments || payments.length === 0) return [];
  const map = new Map<number, number>();
  for (const p of payments) {
    const pid = Number(p.paymodeId) || fallbackPaymodeId;
    map.set(pid, (map.get(pid) || 0) + toNumber(p.amount));
  }
  return Array.from(map.entries()).map(([paymodeId, amount]) => ({ paymodeId, amount: Number(amount.toFixed(decimalPart)) }));
};
