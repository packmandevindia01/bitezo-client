import { useEffect, useMemo, useState } from "react";
import { findMatchingRows, stepMatch, type SearchableGridRow } from "../utils/gridFind";

export type GridFindRowState = "current" | "match" | undefined;

/**
 * Find a product in a line grid: every matching row is marked, the current one is scrolled into view.
 * Rows must carry the id `${rowIdPrefix}-${index}` for the scroll. Used with `GridFindBar`.
 */
export const useGridFind = (rows: SearchableGridRow[], rowIdPrefix: string) => {
  const [query, setQuery] = useState("");
  const [pos, setPos] = useState(-1);
  const matches = useMemo(() => findMatchingRows(rows, query), [rows, query]);
  const matchSet = useMemo(() => new Set(matches), [matches]);
  const currentRow = pos >= 0 && pos < matches.length ? matches[pos] : -1;

  // New search text: start at the first match. Rows added / removed: keep the position in range.
  useEffect(() => {
    setPos(matches.length > 0 ? 0 : -1);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when the text changes
  }, [query]);
  useEffect(() => {
    setPos((p) => (matches.length === 0 ? -1 : Math.min(Math.max(p, 0), matches.length - 1)));
  }, [matches.length]);

  useEffect(() => {
    if (currentRow < 0) return;
    document.getElementById(`${rowIdPrefix}-${currentRow}`)?.scrollIntoView?.({ block: "center", behavior: "smooth" });
  }, [currentRow, rowIdPrefix]);

  const goTo = (step: 1 | -1) => setPos((p) => stepMatch(p, matches.length, step));
  const rowState = (index: number): GridFindRowState =>
    currentRow === index ? "current" : matchSet.has(index) ? "match" : undefined;

  return { query, setQuery, matchCount: matches.length, position: pos, goTo, rowState };
};

export type GridFind = ReturnType<typeof useGridFind>;

/** Row highlight classes: current match amber + outline, other matches light amber; "" when not a match. */
export const gridFindRowClass = (state: GridFindRowState) =>
  state === "current"
    ? "[&>td]:!bg-amber-200 outline outline-2 outline-amber-400 -outline-offset-2"
    : state === "match"
    ? "[&>td]:!bg-amber-50"
    : "";

const toLabels = (options: { value: string | number; label: string }[]) =>
  Object.fromEntries(options.map((o) => [String(o.value), o.label]));

/**
 * Every product name seen in `options`, by value. A grid whose options are replaced by each product search
 * (Purchase / Purchase Return) still knows the name its product box shows.
 */
export const useRememberedLabels = (options: { value: string | number; label: string }[]) => {
  const [labels, setLabels] = useState<Record<string, string>>(() => toLabels(options));
  const [seen, setSeen] = useState(options);
  if (seen !== options) {
    // React's "adjust state when a prop changes" pattern (no effect, no ref)
    setSeen(options);
    setLabels((prev) => ({ ...prev, ...toLabels(options) }));
  }
  return labels;
};
