import { dec, round, sumDec, toNum } from "../../../../utils/money";

/**
 * Production (manufacturing) costing — exact decimal (utils/money.ts), no float noise
 * (0.1 × 3 = 0.30000000000000004) in the amounts sent to the backend.
 *   line amount   = qty × unit cost
 *   grand total   = Σ line amounts + other charge (wages)
 *   cost per unit = grand total ÷ finished qty
 */
export const productionLineAmount = (qty: unknown, cost: unknown): number =>
  toNum(dec(Number(qty) || 0).times(Number(cost) || 0));

export const productionTotals = (
  items: { qty?: unknown; cost?: unknown }[],
  otherCharge: unknown,
  finishedQty: unknown,
): { itemTotal: number; grandTotal: number; costPerUnit: number } => {
  const itemTotal = sumDec((items || []).map((i) => productionLineAmount(i.qty, i.cost)));
  const grand = itemTotal.plus(Number(otherCharge) || 0);
  const fq = Number(finishedQty) || 0;
  return {
    itemTotal: toNum(itemTotal),
    grandTotal: toNum(grand),
    costPerUnit: fq > 0 ? round(grand.dividedBy(fq)) : 0,
  };
};
