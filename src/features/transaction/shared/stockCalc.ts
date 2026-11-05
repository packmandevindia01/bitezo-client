import { dec, sumDec, toNum } from "../../../utils/money";

/**
 * Stock documents (stock adjustment, physical entry, internal transfer, production lines):
 * exact decimal so payload amounts carry no float noise (0.1 × 3 = 0.30000000000000004).
 */
export const stockLineAmount = (qty: unknown, cost: unknown): number =>
  toNum(dec(Number(qty) || 0).times(Number(cost) || 0));

/** qty in the base unit (qty × unit conversion factor), exact. */
export const stockBaseQty = (qty: unknown, unitFactor: unknown): number =>
  toNum(dec(Number(qty) || 0).times(Number(unitFactor) || 1));

/** Σ amounts, each with its sign (+1 / −1), exact. */
export const stockNetAmount = (lines: { amount: number; sign?: number }[]): number =>
  toNum(sumDec((lines || []).map((l) => dec(l.amount).times(l.sign ?? 1))));
