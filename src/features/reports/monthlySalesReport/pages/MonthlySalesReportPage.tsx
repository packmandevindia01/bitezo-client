import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { X, Printer, Download } from "lucide-react";
import { useMonthlySalesReport } from "../hooks/useMonthlySalesReport";
import { formatAmount } from "../../../../utils/currency";
import { exportMonthlySalesReportPDF, exportMonthlySalesReportExcel } from "../utils/exportUtils";
import { MonthlySalesReportPrintPreviewModal } from "../components/MonthlySalesReportPrintPreviewModal";
import {
  PageShell,
  FormInput,
  SearchableSelect,
  ResetButton,
  Button
} from "../../../../components/common";

const MonthlySalesReportPage = () => {
  const navigate = useNavigate();
  const { filters, branches, reportData, isLoading, handleReset } = useMonthlySalesReport();
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const branchOptions = useMemo(() => {
    return [
      { label: "All", value: "0" },
      ...branches
        .filter((b: any) => b.branchName.toLowerCase() !== "all" && String(b.id) !== "0")
        .map((b: any) => ({
          label: b.branchName,
          value: String(b.id)
        }))
    ];
  }, [branches]);

  const columns = reportData?.columns || [];
  const rows = reportData?.rows || [];

  // Calculate totals
  const totals = useMemo(() => {
    const t: Record<string, number> = {};
    columns.forEach((col) => {
      if (col !== "Month") {
        t[col] = rows.reduce((acc, row) => acc + (Number(row[col]) || 0), 0);
      }
    });
    return t;
  }, [columns, rows]);

  const handleExportPDF = () => {
    exportMonthlySalesReportPDF(reportData, {
      branchName: branchOptions.find(o => o.value === filters.branchId)?.label || "All",
      fromPeriod: filters.fromPeriod,
      toPeriod: filters.toPeriod
    });
  };

  const handleExportExcel = () => {
    exportMonthlySalesReportExcel(reportData, {
      branchName: branchOptions.find(o => o.value === filters.branchId)?.label || "All",
      fromPeriod: filters.fromPeriod,
      toPeriod: filters.toPeriod
    });
  };

  return (
    <PageShell title="Monthly Sales Report">
      <div className="flex flex-col h-auto md:h-[calc(100vh-92px)] md:overflow-hidden p-1 gap-3 relative">
        
        {/* ── Filter Panel ────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm shrink-0 relative pr-12">
          
          <button
            onClick={() => navigate("/dashboard")}
            className="absolute top-3 right-3 p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors z-30"
            title="Close"
          >
            <X size={18} />
          </button>

          <ResetButton
            onReset={handleReset}
            className="absolute bottom-3 right-3"
          />

          <div className="px-4 py-3 flex flex-col xl:flex-row gap-3.5 divide-y xl:divide-y-0 xl:divide-x divide-gray-200">
            
            {/* Location */}
            <div className="pb-3 xl:pb-0 xl:pr-4 flex gap-3 items-center shrink-0">
              <div className="flex flex-col gap-0.5 w-48">
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Location</span>
                <SearchableSelect 
                  id="msr-branch" 
                  options={branchOptions} 
                  value={filters.branchId} 
                  onChange={filters.setBranchId} 
                  placeholder="All" 
                />
              </div>
            </div>

            {/* Dates (Month Picker) */}
            <div className="pt-3 xl:pt-0 xl:px-4 flex gap-3 items-center shrink-0">
              <div className="flex flex-col gap-0.5 w-40">
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">From</span>
                <FormInput 
                  id="msr-from-date" 
                  type="month" 
                  value={filters.fromPeriod} 
                  onChange={(e) => filters.setFromPeriod(e.target.value)} 
                />
              </div>
              <div className="flex flex-col gap-0.5 w-40">
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">To</span>
                <FormInput 
                  id="msr-to-date" 
                  type="month" 
                  value={filters.toPeriod} 
                  onChange={(e) => filters.setToPeriod(e.target.value)} 
                />
              </div>
            </div>

          </div>
        </div>

        {/* ── Table Card ─────── */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col flex-1 min-h-0">
          
          {!(isLoading) && rows.length > 0 && (
            <p className="text-center text-[11px] font-semibold text-[#49293e] py-1.5 border-b border-gray-100 shrink-0">
              Monthly Sales Report from {filters.fromPeriod} To {filters.toPeriod}
            </p>
          )}

          <div className="overflow-x-auto overflow-y-auto flex-1 min-h-0">
            <table className="w-full text-xs table-layout-fixed min-w-[600px]">
              <thead className="sticky top-0 z-10 bg-gray-100 shadow-[0_1px_0_rgba(0,0,0,0.05)]">
                <tr>
                  <th className="px-2 py-2 font-semibold text-gray-700 text-[11px] tracking-wide border-r border-gray-200 w-16 text-center">SNo</th>
                  {columns.map((col, idx) => (
                    <th 
                      key={idx} 
                      className={`px-2 py-2 font-semibold text-gray-700 text-[11px] tracking-wide border-r border-gray-200 ${col !== 'Month' ? 'text-right' : 'text-left'}`}
                    >
                      {col.toUpperCase()}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="px-2 py-2 border-r border-gray-100"><div className="h-3 bg-gray-100 rounded" /></td>
                      <td className="px-2 py-2 border-r border-gray-100"><div className="h-3 bg-gray-100 rounded" /></td>
                      {Array.from({ length: Math.max(columns.length - 1, 1) }).map((_, j) => (
                        <td key={j} className="px-2 py-2 border-r border-gray-100"><div className="h-3 bg-gray-100 rounded" /></td>
                      ))}
                    </tr>
                  ))
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length + 1} className="text-center py-20 text-gray-400 text-sm">
                      No records found. Adjust filters.
                    </td>
                  </tr>
                ) : (
                  rows.map((row, idx) => (
                    <tr key={idx} className={`hover:bg-[#49293e]/5 transition-colors ${idx % 2 === 0 ? "bg-white" : "bg-gray-50/60"}`}>
                      <td className="px-2 py-2 text-center text-gray-500 border-r border-gray-100">{idx + 1}</td>
                      {columns.map((col, cIdx) => (
                        <td 
                          key={cIdx} 
                          className={`px-2 py-2 border-r border-gray-100 ${col !== 'Month' ? 'text-right tabular-nums text-[#49293e] font-semibold' : 'text-left font-medium text-gray-800'}`}
                        >
                          {col === 'Month' ? (row[col] || "-") : formatAmount(Number(row[col]) || 0)}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>

              {!(isLoading) && rows.length > 0 && (
                <tfoot className="sticky bottom-0 z-10 bg-gray-100 border-t-2 border-t-[#49293e]/20 shadow-[0_-1px_0_rgba(0,0,0,0.05)]">
                  <tr>
                    <td className="border-r border-gray-200"></td>
                    {columns.map((col, idx) => {
                      if (col === 'Month') {
                        return (
                          <td key={idx} className="px-2 py-2 text-right font-bold text-gray-900 border-r border-gray-200 uppercase text-[10px]">
                            Total
                          </td>
                        );
                      }
                      return (
                        <td key={idx} className="px-2 py-2 text-right font-bold tabular-nums text-[#49293e] text-[13px] border-r border-gray-200">
                          {formatAmount(totals[col] || 0)}
                        </td>
                      );
                    })}
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

        {/* ── Sticky Bottom Summary / Actions Bar ──────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-4 py-2 shrink-0 flex items-center justify-between">
          <div className="flex items-center gap-5 text-xs font-medium text-gray-600">
          </div>

          <div className="flex items-center gap-3">
            {rows.length > 0 && (
              <span className="text-xs text-gray-400">
                {rows.length} record{rows.length !== 1 ? "s" : ""}
              </span>
            )}
            <div className="h-4 w-px bg-gray-200" />
            <Button
              size="sm"
              icon={<Printer size={15} />}
              onClick={() => setIsPreviewOpen(true)}
              disabled={isLoading || rows.length === 0}
            >
              Print Preview
            </Button>
            <Button
              size="sm"
              onClick={handleExportExcel}
              disabled={isLoading || rows.length === 0}
              icon={<Download size={15} />}
              className="!bg-green-600 !border-green-600 hover:!bg-green-700 !text-white"
            >
              XLS
            </Button>
          </div>
        </div>

      </div>

      <MonthlySalesReportPrintPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        onExportPDF={() => {
          handleExportPDF();
          setIsPreviewOpen(false);
        }}
        data={{
          reportData,
          filters,
          companyName: localStorage.getItem("companyName") || "Company Name",
          companyAddress: localStorage.getItem("companyAddress") || "Company Address"
        }}
      />
    </PageShell>
  );
};

export default MonthlySalesReportPage;
