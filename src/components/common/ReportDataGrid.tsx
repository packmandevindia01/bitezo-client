import React from "react";

export interface ReportColumn<T> {
  key: string;
  label: React.ReactNode;
  align?: "left" | "center" | "right";
  className?: string;
  render: (row: T, index: number) => React.ReactNode;
}

interface ReportDataGridProps<T> {
  columns: ReportColumn<T>[];
  data: T[];
  isLoading: boolean;
  minWidth?: string;
  emptyMessage?: string;
  footerRow?: React.ReactNode;
  caption?: React.ReactNode;
}

export function ReportDataGrid<T>({
  columns,
  data,
  isLoading,
  minWidth = "min-w-[900px]",
  emptyMessage = "No records found.",
  footerRow,
  caption
}: ReportDataGridProps<T>) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col flex-1 min-h-0 overflow-hidden relative">
      
      {/* Absolute Loading Overlay */}
      {isLoading && data.length > 0 && (
        <div className="absolute inset-0 bg-white/60 z-20 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#49293e]" />
        </div>
      )}

      {/* Caption / Title Area */}
      {caption && !isLoading && data.length > 0 && (
        <div className="text-center text-[11px] font-semibold text-[#49293e] py-1.5 border-b border-gray-100 shrink-0 bg-white">
          {caption}
        </div>
      )}

      <div className="overflow-x-auto overflow-y-auto flex-1 min-h-0 relative">
        <table className={`w-full text-xs ${minWidth} table-fixed`}>
          <thead className="sticky top-0 z-10 bg-gray-100 shadow-[0_1px_0_rgba(0,0,0,0.05)]">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-2 py-2 font-semibold text-gray-700 text-[11px] tracking-wide border-r last:border-r-0 border-gray-200 ${col.className || ""} ${
                    col.align === "left" ? "text-left" : col.align === "right" ? "text-right" : "text-center"
                  }`}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          
          <tbody className="divide-y divide-gray-100">
            {isLoading && data.length === 0 ? (
               Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  {columns.map((col) => (
                    <td key={col.key} className="px-2 py-2 border-r last:border-r-0 border-gray-100">
                      <div className="h-3 bg-gray-100 rounded w-full" />
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="text-center py-20 text-gray-400 text-sm">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row, rIdx) => (
                <tr key={rIdx} className={`hover:bg-[#49293e]/5 transition-colors ${rIdx % 2 === 0 ? "bg-white" : "bg-gray-50/60"}`}>
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`px-2 py-2 border-r last:border-r-0 border-gray-100 ${
                        col.align === "left" ? "text-left" : col.align === "right" ? "text-right" : "text-center"
                      }`}
                    >
                      {col.render(row, rIdx)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>

          {footerRow && data.length > 0 && !isLoading && (
            <tfoot className="sticky bottom-0 bg-gray-100 shadow-[0_-1px_0_rgba(0,0,0,0.05)] z-10 font-bold text-gray-900">
              {footerRow}
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
