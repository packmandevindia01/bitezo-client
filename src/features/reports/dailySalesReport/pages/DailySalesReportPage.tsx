import { useNavigate } from "react-router-dom";
import { useMemo, useState, useCallback } from "react";
import { Printer, X, Download } from "lucide-react";
import { useDailySalesReport } from "../hooks/useDailySalesReport";
import {
  exportDailySalesReportPDF,
  exportDailySalesReportExcel,
} from "../utils/dailySalesExportUtils";
import { formatAmount } from "../../../../utils/currency";
import {
  PageShell,
  FormInput,
  Button,
  SearchableSelect,
  ResetButton,
} from "../../../../components/common";
import { DailySalesPrintPreviewModal } from "../components/DailySalesPrintPreviewModal";

const formatDate = (dateStr: string) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

export const DailySalesReportPage = () => {
  const navigate = useNavigate();
  const { filters, masterData, report } = useDailySalesReport();
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const branchOptions = useMemo(() => {
    return masterData.branches.map((b) => ({
      label: b.branchName,
      value: String(b.branchId),
    }));
  }, [masterData.branches]);

  // dynamic paymode column list (exclude VoucherDate)
  const dynamicPaymodes = useMemo(() => {
    return report.columns.filter((c) => c !== "VoucherDate");
  }, [report.columns]);

  // Dynamically calculate column totals for the footer
  const colTotals = useMemo(() => {
    return dynamicPaymodes.map((col) => {
      return report.rows.reduce((sum, row) => sum + Number(row[col] || 0), 0);
    });
  }, [report.rows, dynamicPaymodes]);

  // Dynamically calculate grand total sum
  const grandTotal = useMemo(() => {
    return colTotals.reduce((sum, val) => sum + val, 0);
  }, [colTotals]);



  const handleExportPDF = useCallback(() => {
    exportDailySalesReportPDF(report.columns, report.rows, filters);
  }, [report, filters]);

  const handleExportExcel = useCallback(() => {
    exportDailySalesReportExcel(report.columns, report.rows, filters);
  }, [report, filters]);

  const previewData = useMemo(() => ({
    columns: report.columns,
    rows: report.rows,
    filters,
    companyName: localStorage.getItem("companyName") || "FEKRA advertising",
    companyAddress: localStorage.getItem("companyAddress") || "NEAR NESTO BESIDE BIN RASHIED SOUQ MABELA BUILDING NO 211 SECOND FLOOR FLAT NO 21",
  }), [report, filters]);

  return (
    <PageShell title="Daily Sales Report">
      <div className="flex flex-col h-auto md:h-[calc(100vh-92px)] md:overflow-hidden p-1 gap-3 relative">
        {/* ── Filter Panel ────────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm shrink-0 relative pr-12">
          <button
            onClick={() => navigate("/dashboard")}
            className="absolute top-3 right-3 p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors z-30"
            title="Close"
          >
            <X size={18} />
          </button>

          <ResetButton
            onReset={filters.resetFilters}
            className="absolute bottom-3 right-3"
          />

          <div className="px-4 py-3 flex flex-col xl:flex-row gap-3.5 divide-y xl:divide-y-0 xl:divide-x divide-gray-200">
            {/* 1. Date Range */}
            <div className="pb-3 xl:pb-0 xl:pr-4 flex gap-3 items-center shrink-0">
              <div className="flex flex-col gap-0.5 w-32">
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">From Date</span>
                <FormInput
                  type="date"
                  value={filters.fromDate}
                  onChange={(e) => filters.setFromDate(e.target.value)}
                  className="h-7 !px-2 text-xs"
                />
              </div>
              <div className="flex flex-col gap-0.5 w-32">
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">To Date</span>
                <FormInput
                  type="date"
                  value={filters.toDate}
                  onChange={(e) => filters.setToDate(e.target.value)}
                  className="h-7 !px-2 text-xs"
                />
              </div>
            </div>

            {/* 2. Location */}
            <div className="pt-3 xl:pt-0 xl:px-4 flex gap-3 items-center shrink-0">
              <div className="flex flex-col gap-0.5 w-52">
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Location</span>
                <SearchableSelect
                  id="dsr-branch"
                  options={branchOptions}
                  value={filters.branchId}
                  onChange={filters.setBranchId}
                  placeholder="Select branch"
                  autoFocus={true}
                  disabled={filters.isBranchLocked}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── Data Grid Section ───────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex-1 min-h-0 flex flex-col overflow-hidden">
          <div className="overflow-x-auto overflow-y-auto flex-1 min-h-0">
            <table className="w-full min-w-[700px] text-xs border-collapse table-fixed">
              <thead className="sticky top-0 z-10 bg-gray-100 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)]">
                <tr>
                  <th className="px-3 py-2 font-bold text-gray-600 text-[11px] text-center w-[15%] border-r border-gray-200/60">
                    Date
                  </th>
                  {dynamicPaymodes.map((col) => (
                    <th
                      key={col}
                      className="px-3 py-2 font-bold text-gray-600 text-[11px] text-right border-r border-gray-200/60"
                    >
                      {col}
                    </th>
                  ))}
                  <th className="px-3 py-2 font-bold text-gray-600 text-[11px] text-right w-[15%]">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {report.isLoading ? (
                  <tr>
                    <td colSpan={dynamicPaymodes.length + 2} className="text-center py-12 text-gray-500">
                      Loading daily sales data...
                    </td>
                  </tr>
                ) : report.rows.length === 0 ? (
                  <tr>
                    <td colSpan={dynamicPaymodes.length + 2} className="text-center py-12 text-gray-400 font-medium">
                      No records found.
                    </td>
                  </tr>
                ) : (
                  report.rows.map((row: any, rIdx: number) => {
                    let rowSum = 0;
                    return (
                      <tr key={rIdx} className="hover:bg-gray-50/70 transition-colors odd:bg-white even:bg-gray-50/20">
                        <td className="px-3 py-2 text-center text-gray-800 border-r border-gray-100/60 font-semibold">
                          {row.VoucherDate ? formatDate(row.VoucherDate) : ""}
                        </td>
                        {dynamicPaymodes.map((col) => {
                          const val = Number(row[col] || 0);
                          rowSum += val;
                          return (
                            <td key={col} className="px-3 py-2 text-right text-gray-700 border-r border-gray-100/60 font-mono">
                              {formatAmount(val)}
                            </td>
                          );
                        })}
                        <td className="px-3 py-2 text-right font-mono font-bold text-[#49293e] bg-gray-50/50">
                          {formatAmount(rowSum)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              {report.rows.length > 0 && (
                <tfoot className="sticky bottom-0 z-10 bg-gray-100 border-t-2 border-gray-300 font-bold shadow-[inset_0_1px_0_rgba(0,0,0,0.1)]">
                  <tr>
                    <td className="px-3 py-2 text-center border-r border-gray-200/60 text-gray-700">Total</td>
                    {colTotals.map((tot, idx) => (
                      <td key={idx} className="px-3 py-2 text-right border-r border-gray-200/60 font-mono text-gray-800">
                        {formatAmount(tot)}
                      </td>
                    ))}
                    <td className="px-3 py-2 text-right font-mono text-[#49293e] bg-gray-50/70">
                      {formatAmount(grandTotal)}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

        {/* ── Summary & Export Bar ────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-4 py-2.5 shrink-0 flex items-center justify-between gap-3 text-xs">
          <div className="flex gap-4 font-semibold items-center">
            <span className="text-gray-400 text-[10px] uppercase">Grand Total Sales:</span>
            <span className="text-[#49293e] text-sm font-mono font-bold">{formatAmount(grandTotal)}</span>
          </div>

          <div className="flex items-center gap-3">
            <Button
              size="sm"
              icon={<Printer size={15} />}
              onClick={() => setIsPreviewOpen(true)}
              disabled={report.isLoading || report.rows.length === 0}
            >
              Print Preview
            </Button>
            <Button
              size="sm"
              onClick={handleExportExcel}
              disabled={report.isLoading || report.rows.length === 0}
              icon={<Download size={15} />}
              className="!bg-green-600 !border-green-600 hover:!bg-green-700 !text-white"
            >
              XLS
            </Button>
          </div>
        </div>
      </div>

      <DailySalesPrintPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        onExportPDF={handleExportPDF}
        data={previewData}
      />
    </PageShell>
  );
};
export default DailySalesReportPage;
