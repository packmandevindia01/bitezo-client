/**
 * Quantity of an extra or modifier on one cart line. A line holds ONE entry per extra / modifier id; adding the same
 * one again raises that entry's qty. The order payload sends that entry as one row with its qty.
 */
export interface QtyEntry {
  id: number;
  qty?: number;
}

const sameId = (a: QtyEntry, id: number) => Number(a.id) === Number(id);

const qtyValue = (entry: QtyEntry) => {
  const qty = Number(entry.qty);
  return qty > 0 ? qty : 1;
};

/** How many of this extra / modifier the line has (0 when it has none). */
export const customizationQty = (list: QtyEntry[], id: number): number => {
  const entry = list.find((x) => sameId(x, id));
  return entry ? qtyValue(entry) : 0;
};

/** Adds one: a new entry with qty 1, or one more on the entry already there (which keeps its saved price). */
export const addCustomization = <T extends QtyEntry>(list: T[], entry: T): T[] =>
  list.some((x) => sameId(x, entry.id))
    ? list.map((x) => (sameId(x, entry.id) ? { ...x, qty: qtyValue(x) + 1 } : x))
    : [...list, { ...entry, qty: 1 }];

/** Changes the qty by `delta`; the entry is removed when the qty reaches 0. */
export const changeCustomizationQty = <T extends QtyEntry>(list: T[], id: number, delta: number): T[] =>
  list.flatMap((x) => {
    if (!sameId(x, id)) return [x];
    const qty = qtyValue(x) + delta;
    return qty > 0 ? [{ ...x, qty }] : [];
  });

export const removeCustomization = <T extends QtyEntry>(list: T[], id: number): T[] =>
  list.filter((x) => !sameId(x, id));
