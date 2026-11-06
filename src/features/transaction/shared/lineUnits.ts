export interface LineUnitOption {
  label: string;
  value: string;
  currentValue?: number;
  category?: string;
}

export type CategoryUnits = Record<string, LineUnitOption[]>;

const sameCategory = (a: string, b: string) => a.toLowerCase().trim() === b.toLowerCase().trim();

const validValue = (unit: LineUnitOption | undefined): number | null => {
  const value = Number(unit?.currentValue);
  return Number.isFinite(value) && value > 0 ? value : null;
};

/**
 * Conversion value of a unit, for baseQty (qty x value).
 * Looks in every loaded category list, then the product master units. Base unit (1) only if neither has it.
 */
export const getLineUnitValue = (
  unitId: string | number,
  categoryUnits: CategoryUnits,
  masterUnits: LineUnitOption[] | undefined,
): number => {
  const id = String(unitId);
  for (const units of Object.values(categoryUnits)) {
    const value = validValue(units.find((u) => u.value === id));
    if (value !== null) return value;
  }
  return validValue(masterUnits?.find((u) => u.value === id)) ?? 1;
};

/**
 * Units a line may switch to: only the product's unit category, so stock cannot be converted through an
 * unrelated unit (Kg → Dozen). While the category list loads, or if it failed, the master units are filtered
 * by the same category. A line with no known category offers all master units.
 */
export const getLineUnitOptions = (
  line: { unit?: string; unitCategory?: string },
  categoryUnits: CategoryUnits,
  masterUnits: LineUnitOption[] | undefined,
): LineUnitOption[] => {
  const master = masterUnits ?? [];
  const category = line.unitCategory || master.find((u) => u.value === String(line.unit))?.category;
  if (!category) return master;
  if (categoryUnits[category]) return categoryUnits[category];
  return master.filter((u) => !u.category || sameCategory(u.category, category));
};

/** Unit-cost API body ({ cost } or a plain number). An unusable body is an error, never a NaN or 0 cost. */
export const parseUnitCost = (data: unknown): number => {
  const raw = data !== null && typeof data === "object" ? (data as { cost?: unknown }).cost : data;
  const cost = raw === undefined || raw === null || raw === "" ? NaN : Number(raw);
  if (!Number.isFinite(cost)) throw new Error("Invalid unit cost response");
  return cost;
};
