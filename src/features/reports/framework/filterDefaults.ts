import { toLocalDateString, firstOfMonthLocalString } from "../../../shared/lib/date";
import type { FilterDef, FilterValues } from "./types";

/** Default filter values — LOCAL calendar (toISOString() gave yesterday early morning in GCC / India). */
export const defaultFilterValue = (def: FilterDef, now: Date, initialBranchId: string): string => {
  const pad = (n: number) => String(n).padStart(2, "0");
  switch (def.kind) {
    case "branch":
      return initialBranchId || "1"; // 1 = All
    case "date":
      return def.default === "today" ? toLocalDateString(now) : firstOfMonthLocalString(now);
    case "month":
      if (def.default === "januaryThisYear") return `${now.getFullYear()}-01`;
      if (def.default === "decemberThisYear") return `${now.getFullYear()}-12`;
      return `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
    case "select":
      return def.default ?? def.options[0]?.value ?? "";
    case "lookup":
      return "0"; // All
  }
};

export const defaultFilters = (defs: FilterDef[], now: Date, initialBranchId: string): FilterValues =>
  Object.fromEntries(defs.map((d) => [d.key, defaultFilterValue(d, now, initialBranchId)]));

/** "YYYY-MM" → { year, month } (falls back to the given defaults). */
export const parseMonth = (value: string, fallback: { year: number; month: number }) => {
  const [y, m] = String(value || "").split("-").map((x) => parseInt(x, 10));
  return { year: Number.isFinite(y) ? y : fallback.year, month: Number.isFinite(m) && m >= 1 && m <= 12 ? m : fallback.month };
};
