import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { X, Printer, Download, FileText, Eye } from "lucide-react";
import { PageShell, FormInput, SearchableSelect, Button } from "../../../components/common";
import { formatAmount } from "../../../shared/lib/currency";
import { useReport } from "./useReport";
import { toMatrix, isNumericColumn, isTotalled, formatCell, isSubtotalRow, type Formatter } from "./reportMath";
import { printReport, exportReportExcel, exportReportPdf, type ReportMeta } from "./reportOutput";
import type { FilterDef, ReportColumn, ReportDefinition } from "./types";

/**
 * One page for every report (Phase 4). Same look as the hand-built report pages it replaces:
 * filter panel (close + View — nothing loads until View is pressed), table with sticky header / totals row, record count, Print / PDF / XLS.
 * Adds what most old pages lacked: a visible error banner (403 / network) instead of "No records found".
 */
const summaryText = (v: number | string) => (typeof v === "number" ? formatAmount(v) : v);

const alignClass = (c: ReportColumn) => {
  const align = c.align ?? (isNumericColumn(c) ? "right" : "left");
  return align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left";
};

const fmt: Formatter = {
  money: (n) => formatAmount(n),
  number: (n) => (Number.isInteger(n) ? String(n) : formatAmount(n)),
};

export const ReportPage = ({ definition }: { definition: ReportDefinition }) => {
  const navigate = useNavigate();
  const r = useReport(definition);
  const { table } = r;

  // "All" (id 1) is always offered, also when the branch list could not be loaded.
  const branchOptions = useMemo(() => {
    const opts = r.branches.map((b) => ({ label: b.branchName, value: String(b.id) }));
    return opts.some((o) => o.value === "1") ? opts : [{ label: "All", value: "1" }, ...opts];
  }, [r.branches]);
  const matrix = useMemo(() => toMatrix(table, fmt, definition.totalLabel), [table, definition.totalLabel]);
  const subtitle = definition.subtitle?.(r.appliedFilters) ?? "";
  const hasRows = table.rows.length > 0;
  const idPrefix = `rpt-${definition.id}`;

  const meta = (): ReportMeta => {
    const lines: [string, string][] = [];
    const company = localStorage.getItem("companyName");
    if (company) lines.push(["Company", company]);
    definition.filters.forEach((f) => {
      const v = r.appliedFilters[f.key];
      if (f.kind === "branch") lines.push([f.label ?? "Location", branchOptions.find((o) => o.value === v)?.label || "All"]);
      if (f.kind === "lookup") lines.push([f.label, r.lookups[f.key]?.find((o) => o.value === v)?.label || "All"]);
      if (f.kind === "select") lines.push([f.label, f.options.find((o) => o.value === v)?.label || v]);
    });
    table.summary?.forEach((x) => lines.push([x.label, summaryText(x.value)]));
    return { title: definition.title, subtitle, lines };
  };

  const renderFilter = (f: FilterDef) => {
    const id = `${idPrefix}-${f.key}`;
    const value = r.filters[f.key] ?? "";
    if (f.kind === "branch") {
      return (
        <div key={f.key} className="flex items-center gap-2">
          <span className="text-[11px] text-gray-500 w-16 text-left shrink-0">{f.label ?? "Location"}</span>
          <div className="w-40">
            <SearchableSelect id={id} options={branchOptions} value={value} onChange={(v: string) => r.setFilter(f.key, v)} placeholder="All" disabled={r.isBranchLocked} />
          </div>
        </div>
      );
    }
    if (f.kind === "lookup") {
      return (
        <div key={f.key} className="flex items-center gap-2">
          <span className="text-[11px] text-gray-500 text-left shrink-0">{f.label}</span>
          <div className="w-44">
            <SearchableSelect id={id} options={r.lookups[f.key] ?? []} value={value} onChange={(v: string) => r.setFilter(f.key, v || "0")} placeholder={f.allLabel ?? "All"} />
          </div>
        </div>
      );
    }
    if (f.kind === "select") {
      return (
        <div key={f.key} className="flex items-center gap-2">
          <span className="text-[11px] text-gray-500 text-left shrink-0">{f.label}</span>
          <div className="w-40">
            <SearchableSelect id={id} options={f.options} value={value} onChange={(v: string) => r.setFilter(f.key, v)} />
          </div>
        </div>
      );
    }
    return (
      <div key={f.key} className="flex items-center gap-2">
        <span className="text-[11px] text-gray-500 text-left shrink-0">{f.label}</span>
        <div className="w-36">
          <FormInput id={id} type={f.kind === "month" ? "month" : "date"} value={value} onChange={(e: React.ChangeEvent<HTMLInputElement>) => r.setFilter(f.key, e.target.value)} />
        </div>
      </div>
    );
  };

  return (
    <PageShell title={definition.title}>
      <div className="flex flex-col h-auto md:h-[calc(100vh-92px)] md:overflow-hidden p-1 gap-3 relative">
        {/* Filter panel */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm shrink-0 relative pr-28">
          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className="absolute top-1/2 -translate-y-1/2 right-3 p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors z-30"
            title="Close"
          >
            <X size={18} />
          </button>
          <Button
            type="button"
            size="sm"
            icon={<Eye size={14} />}
            onClick={r.view}
            disabled={r.isLoading}
            title="Load the report for these filters"
            className="absolute top-1/2 -translate-y-1/2 right-12 font-semibold !bg-blue-600 !border-blue-600 hover:!bg-blue-700 !text-white"
          >
            View
          </Button>
          <div className="px-4 py-3 flex flex-col xl:flex-row xl:flex-wrap xl:items-center gap-3.5">
            {definition.filters.map(renderFilter)}
            {definition.search && (
              <div className="w-56">
                <FormInput id={`${idPrefix}-search`} type="text" value={r.search} placeholder={definition.search.placeholder} onChange={(e: React.ChangeEvent<HTMLInputElement>) => r.setSearch(e.target.value)} />
              </div>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col flex-1 min-h-0">
          {r.error && (
            <div role="alert" className="px-4 py-2 text-xs font-semibold text-red-700 bg-red-50 border-b border-red-100 shrink-0">
              {r.error}
            </div>
          )}
          {!r.isLoading && hasRows && subtitle && (
            <p className="text-center text-[11px] font-semibold text-[#49293e] py-1.5 border-b border-gray-100 shrink-0">{subtitle}</p>
          )}
          <div className="overflow-x-auto overflow-y-auto flex-1 min-h-0">
            <table className="w-full text-xs min-w-[600px]">
              <thead className="sticky top-0 z-10 bg-gray-100 shadow-[0_1px_0_rgba(0,0,0,0.05)]">
                <tr>
                  <th className="px-2 py-2 font-semibold text-gray-700 text-[11px] tracking-wide border-r border-gray-200 w-16 text-center">SNo</th>
                  {table.columns.map((c) => (
                    <th key={c.key} className={`px-2 py-2 font-semibold text-gray-700 text-[11px] tracking-wide border-r border-gray-200 ${alignClass(c)}`}>
                      {c.label.toUpperCase()}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {r.isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      {Array.from({ length: Math.max(table.columns.length + 1, 3) }).map((__, j) => (
                        <td key={j} className="px-2 py-2 border-r border-gray-100"><div className="h-3 bg-gray-100 rounded" /></td>
                      ))}
                    </tr>
                  ))
                ) : !hasRows ? (
                  <tr>
                    <td colSpan={table.columns.length + 1} className="text-center py-20 text-gray-400 text-sm">
                      {r.error ? "The report could not be loaded — see the message above." : r.waitingMessage || table.emptyMessage || "No records found. Adjust filters."}
                    </td>
                  </tr>
                ) : (
                  table.rows.map((row, idx) => {
                    const link = definition.rowLink?.(row) ?? null;
                    return (
                    <tr key={idx} onClick={link ? () => navigate(link) : undefined} className={`hover:bg-[#49293e]/5 transition-colors ${link ? "cursor-pointer" : ""} ${isSubtotalRow(row) ? "font-bold bg-gray-100" : idx % 2 === 0 ? "bg-white" : "bg-gray-50/60"}`}>
                      <td className="px-2 py-2 text-center text-gray-500 border-r border-gray-100">{matrix.body[idx]?.[0]}</td>
                      {table.columns.map((c) => (
                        <td key={c.key} className={`px-2 py-2 border-r border-gray-100 ${alignClass(c)} ${isNumericColumn(c) ? "tabular-nums text-[#49293e] font-semibold" : "font-medium text-gray-800"}`}>
                          {formatCell(c, row[c.key], fmt)}
                        </td>
                      ))}
                    </tr>
                    );
                  })
                )}
              </tbody>
              {!r.isLoading && hasRows && matrix.footer && (
                <tfoot className="sticky bottom-0 z-10 bg-gray-100 border-t-2 border-t-[#49293e]/20">
                  <tr>
                    <td className="border-r border-gray-200" />
                    {table.columns.map((c, i) => (
                      <td key={c.key} className={`px-2 py-2 border-r border-gray-200 ${isTotalled(c) ? "text-right font-bold tabular-nums text-[#49293e] text-[13px]" : "text-right font-bold text-gray-900 uppercase text-[10px]"}`}>
                        {matrix.footer?.[i + 1] ?? ""}
                      </td>
                    ))}
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

        {/* Actions */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-4 py-2 shrink-0 flex items-center justify-end gap-3">
          {hasRows && table.summary?.map((x) => (
            <span key={x.label} className="text-xs text-gray-500">
              {x.label}: <span className="font-bold text-[#49293e] tabular-nums ml-1">{summaryText(x.value)}</span>
            </span>
          ))}
          {hasRows && <span className="text-xs text-gray-400">{table.rows.length} record{table.rows.length !== 1 ? "s" : ""}</span>}
          <div className="h-4 w-px bg-gray-200" />
          <Button size="sm" icon={<Printer size={15} />} onClick={() => printReport(matrix, meta())} disabled={r.isLoading || !hasRows}>Print</Button>
          <Button size="sm" icon={<FileText size={15} />} onClick={() => void exportReportPdf(matrix, meta())} disabled={r.isLoading || !hasRows}>PDF</Button>
          <Button size="sm" icon={<Download size={15} />} onClick={() => void exportReportExcel(matrix, meta())} disabled={r.isLoading || !hasRows} className="!bg-green-600 !border-green-600 hover:!bg-green-700 !text-white">XLS</Button>
        </div>
      </div>
    </PageShell>
  );
};

export default ReportPage;
