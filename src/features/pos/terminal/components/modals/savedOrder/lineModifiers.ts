/** Modifier rows of a saved order line, as the saved-order windows (Recall / Settled details) show them. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = any;

/** Backend SQL joins can repeat a modifier row once per detail — keep one per (mapId, modifierId). */
export const dedupeModifierRows = (rows: Row[]): Row[] => {
  const seen = new Set<string>();
  return (rows || []).filter((m: Row) => {
    const key = `${m.mapId ?? m.MapId ?? m.mapID ?? 0}-${m.modifierId ?? m.ModifierId ?? m.id ?? m.Id ?? 0}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

/** The modifier rows of one order line (by mapId). */
export const modifierRowsOfLine = (rows: Row[], mapId: unknown): Row[] =>
  mapId !== undefined ? (rows || []).filter((m: Row) => Number(m.mapId ?? m.MapId) === Number(mapId)) : [];

/** Split a line's rows into extras (priced / typed extra), plain modifiers and kitchen messages. */
export const classifyLineModifiers = (rows: Row[]): { extras: Row[]; standardMods: Row[]; messages: Row[] } => {
  const status = (m: Row) => String(m.status || "").toLowerCase();
  return {
    extras: rows.filter((m: Row) => {
      const s = status(m);
      return s === "extras" || s === "extra" || Number(m.typeId || 0) === 2 || Number(m.price ?? 0) > 0;
    }),
    standardMods: rows.filter((m: Row) => {
      const s = status(m);
      return s !== "message" && s !== "extras" && s !== "extra" && Number(m.typeId || 0) !== 2 && Number(m.price ?? 0) <= 0;
    }),
    messages: rows.filter((m: Row) => {
      const s = status(m);
      return s === "message" || s === "messages";
    }),
  };
};
