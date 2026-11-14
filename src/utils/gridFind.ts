/**
 * Find a product in a line grid (Provider Settings, Purchase, Purchase Return, Stock Adjustment, Stock Transfer,
 * Physical Entry): which rows match what the user typed.
 * Matches product name, alt name or code, case-insensitive, anywhere in the text ("biri" finds "Chicken Biriyani").
 * Empty rows (no product yet) never match.
 */
export interface SearchableGridRow {
  /** Empty / 0 = a blank line, never matched. */
  productId: number | string;
  productName?: string;
  altName?: string;
  productCode?: string;
}

const normalize = (value: unknown) => String(value ?? "").toLowerCase().replace(/\s+/g, " ").trim();

/** Indexes of the rows matching `query`, in grid order; [] for an empty query. */
export const findMatchingRows = (rows: SearchableGridRow[], query: string): number[] => {
  const q = normalize(query);
  if (!q) return [];
  const out: number[] = [];
  rows.forEach((row, index) => {
    if (!row.productId) return;
    const text = [row.productName, row.altName, row.productCode].map(normalize);
    if (text.some((t) => t.includes(q))) out.push(index);
  });
  return out;
};

/** The next match position after `current` (wraps); `step` -1 for the previous one. */
export const stepMatch = (current: number, count: number, step: 1 | -1): number => {
  if (count <= 0) return -1;
  if (current < 0) return step === 1 ? 0 : count - 1;
  return (current + step + count) % count;
};

/** A document line as the find box reads it (form values). */
export type GridFindLine = { product?: string | number; code?: string; productName?: string } | undefined;
/** A product option as the find box reads it. */
export type GridFindOption = { value: string | number; label: string };
