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

/** Adds `count` units at once (one per plate picked on the unit rail): a new entry with that qty, or more on the one there. */
export const addCustomizationUnits = <T extends QtyEntry>(list: T[], entry: T, count: number): T[] => {
  const units = Math.max(1, Math.floor(count));
  return list.some((x) => sameId(x, entry.id))
    ? list.map((x) => (sameId(x, entry.id) ? { ...x, qty: qtyValue(x) + units } : x))
    : [...list, { ...entry, qty: units }];
};

/**
 * Splits one line's extras / modifiers when `splitQty` of its `lineQty` units become their own line.
 * An entry whose qty divides evenly over the units (one per plate, two per plate…) moves pro-rata; any other entry
 * stays on the remaining line, so the extras charged in total never change. Messages are notes for every plate: both
 * lines keep them.
 */
export const splitCustomizations = <E extends QtyEntry, M extends QtyEntry, N>(
  custom: { extras: E[]; modifiers: M[]; messages: N[] },
  lineQty: number,
  splitQty: number,
) => {
  const share = <T extends QtyEntry>(list: T[]) => {
    const stay: T[] = [];
    const move: T[] = [];
    list.forEach((x) => {
      const qty = qtyValue(x);
      const moved = (qty * splitQty) / lineQty;
      if (!Number.isInteger(moved) || moved <= 0) { stay.push(x); return; }
      move.push({ ...x, qty: moved });
      if (qty - moved > 0) stay.push({ ...x, qty: qty - moved });
    });
    return { stay, move };
  };
  const extras = share(custom.extras);
  const modifiers = share(custom.modifiers);
  return {
    remaining: { extras: extras.stay, modifiers: modifiers.stay, messages: [...custom.messages] },
    split: { extras: extras.move, modifiers: modifiers.move, messages: [...custom.messages] },
  };
};

/** Lines already sent to the kitchen are never split (owner's rule, 2026-11-12): the unit rail is only for new lines. */
export const canSplitLine = (line: { quantity?: number; isExisting?: boolean; mapId?: number }) => {
  const qty = Number(line.quantity ?? 1);
  return !line.isExisting && !line.mapId && Number.isInteger(qty) && qty >= 2;
};
