import { dec } from "../../../../shared/lib/money";

/** Master unit row. The API spelling of the conversion value varies, so both are read. */
export interface UnitValueSource {
  id: number | string;
  currentvalue?: unknown;
  currentValue?: unknown;
}

export interface OpeningStockCostInput {
  units: UnitValueSource[] | undefined | null;
  /** Unit the product master Cost is entered in. */
  mainUnitId: string | number | undefined | null;
  /** Product master Cost, per main unit. */
  productCost: unknown;
  /** Newly selected unit on the row. */
  unitId: string | number | undefined | null;
  /** Row values before the change: used only when the product has no master cost. */
  previousUnitId?: string | number | null;
  previousCost?: unknown;
}

const toPositive = (value: unknown): number | null => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
};

const unitValue = (units: UnitValueSource[] | undefined | null, unitId: unknown): number | null => {
  if (unitId === undefined || unitId === null || unitId === "") return null;
  const unit = units?.find((u) => String(u.id) === String(unitId));
  return unit ? toPositive(unit.currentvalue ?? unit.currentValue) : null;
};

/**
 * Cost per selected unit: cost x selected unit value / source unit value.
 * Example: Cost 10 per PCS (1), Dozen (12) selected → 120.
 *
 * The source is the product master Cost. With no master cost, the row's own cost is converted from
 * its previous unit, so a typed cost is not lost.
 *
 * Returns the unrounded cost, or null when it cannot be worked out (the caller keeps the current cost).
 */
export const calcOpeningStockCost = ({
  units,
  mainUnitId,
  productCost,
  unitId,
  previousUnitId,
  previousCost,
}: OpeningStockCostInput): number | null => {
  const selected = unitValue(units, unitId);
  if (selected === null) return null;

  const master = toPositive(productCost);
  const mainValue = unitValue(units, mainUnitId);
  if (master !== null && mainValue !== null) {
    return dec(master).times(selected).dividedBy(mainValue).toNumber();
  }

  const rowCost = toPositive(previousCost);
  const previousValue = unitValue(units, previousUnitId);
  if (rowCost !== null && previousValue !== null) {
    return dec(rowCost).times(selected).dividedBy(previousValue).toNumber();
  }

  return null;
};
