/**
 * Report framework (Phase 4) — a report is a DEFINITION; the framework provides filters, loading,
 * error state, table, exact totals, print and Excel / PDF export.
 */

export type ColumnKind = "text" | "money" | "number" | "qty" | "date";

export interface ReportColumn {
  key: string;
  label: string;
  kind: ColumnKind;
  /** Include in the totals row (default: true for money / number / qty). */
  total?: boolean;
  align?: "left" | "right" | "center";
}

export type ReportRow = Record<string, unknown>;

export interface ReportTable {
  columns: ReportColumn[];
  rows: ReportRow[];
  /** Totals sent by the backend (e.g. totalData) — they win over the computed sum, like the old pages. */
  totalsOverride?: Record<string, number>;
}

/** Filter values are kept as strings (form inputs); definitions convert them in `fetch`. */
export type FilterValues = Record<string, string>;

export type FilterDef =
  | { kind: "branch"; key: string; label?: string }
  | { kind: "date"; key: string; label: string; default: "today" | "firstOfMonth" }
  | { kind: "month"; key: string; label: string; default: "januaryThisYear" | "decemberThisYear" | "thisMonth" }
  | { kind: "select"; key: string; label: string; options: { label: string; value: string }[]; default?: string }
  /** Options loaded from the server; an "All" option (value "0") is added first. */
  | { kind: "lookup"; key: string; label: string; queryKey: string; load: () => Promise<{ label: string; value: string }[]>; allLabel?: string };

export interface ReportDefinition {
  /** Unique id — also the React Query key. */
  id: string;
  title: string;
  filters: FilterDef[];
  /** Load the table for the given filters (convert strings → API params here). */
  fetch: (filters: FilterValues) => Promise<ReportTable>;
  /** Line under the title, e.g. "from 2026-01 To 2026-12". */
  subtitle?: (filters: FilterValues) => string;
  /** Label shown in the first text column of the totals row (default "Total"). */
  totalLabel?: string;
}
