/**
 * Table Master floor layout. `position` is a 1-based slot number; gaps are real empty spots.
 * POS (DineInSelectionPage.buildGrid) reads the same numbers, and shows a plain list when two tables
 * share a position, so a layout save must never produce duplicates.
 */

/** Same minimum as the POS floor plan. */
export const MIN_TABLE_SLOTS = 25;
/** Free spots always offered after the last table, so a full floor can still grow. */
const TRAILING_FREE_SLOTS = 8;

interface PositionedTable {
  position: number;
}

const hasValidPosition = (position: unknown): position is number =>
  typeof position === "number" && Number.isInteger(position) && position > 0;

/**
 * Tables by slot (index = position - 1). A table with a missing or duplicate position takes the first free
 * spot, so every table is visible and can be moved.
 */
export const buildTableSlots = <T extends PositionedTable>(tables: T[]): Array<T | null> => {
  const placed = new Map<number, T>();
  const unplaced: T[] = [];

  tables.forEach((table) => {
    if (hasValidPosition(table.position) && !placed.has(table.position)) placed.set(table.position, table);
    else unplaced.push(table);
  });

  let freePosition = 1;
  unplaced.forEach((table) => {
    while (placed.has(freePosition)) freePosition += 1;
    placed.set(freePosition, table);
  });

  const last = placed.size > 0 ? Math.max(...placed.keys()) : 0;
  const total = Math.max(MIN_TABLE_SLOTS, last + TRAILING_FREE_SLOTS);
  return Array.from({ length: total }, (_, index) => placed.get(index + 1) ?? null);
};

/** Move to an empty spot, or swap with the table already there. No other table moves. */
export const moveTableToSlot = <T>(slots: Array<T | null>, fromIndex: number, toIndex: number): Array<T | null> => {
  if (fromIndex === toIndex || !slots[fromIndex] || toIndex < 0 || toIndex >= slots.length) return slots;
  const next = [...slots];
  next[toIndex] = slots[fromIndex];
  next[fromIndex] = slots[toIndex];
  return next;
};

/** Tables whose saved position differs from their slot, with the position to save. */
export const getLayoutChanges = <T extends PositionedTable>(slots: Array<T | null>): T[] =>
  slots.flatMap((table, index) =>
    table && table.position !== index + 1 ? [{ ...table, position: index + 1 }] : [],
  );

/** True when saved positions are duplicated or missing, so POS may not show this arrangement. */
export const hasLayoutProblem = (tables: PositionedTable[]): boolean => {
  const seen = new Set<number>();
  return tables.some((table) => {
    if (!hasValidPosition(table.position) || seen.has(table.position)) return true;
    seen.add(table.position);
    return false;
  });
};

/** First free position after `afterPosition`. */
export const nextFreePosition = (tables: PositionedTable[], afterPosition: number): number => {
  const taken = new Set(tables.map((table) => table.position));
  let position = afterPosition + 1;
  while (taken.has(position)) position += 1;
  return position;
};

/**
 * Suggested name for the next table: T1 → T2, A09 → A10. Names in use are skipped.
 * Returns "" when the name has no trailing number or the result would not fit.
 */
export const suggestNextTableName = (name: string, usedNames: string[], maxLength = 15): string => {
  const match = name.trim().match(/^(.*?)(\d+)$/);
  if (!match) return "";
  const [, prefix, digits] = match;
  const used = new Set(usedNames.map((used) => used.trim().toUpperCase()));

  let number = Number(digits);
  let candidate: string;
  do {
    number += 1;
    candidate = `${prefix}${String(number).padStart(digits.length, "0")}`;
  } while (used.has(candidate.toUpperCase()));

  return candidate.length <= maxLength ? candidate : "";
};
