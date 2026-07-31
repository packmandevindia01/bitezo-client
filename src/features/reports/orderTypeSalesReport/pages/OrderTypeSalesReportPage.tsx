import { useNavigate } from "react-router-dom";
import { useMemo, useState, useCallback } from "react";
import { Printer, X, Download } from "lucide-react";
import { useOrderTypeSalesReport } from "../hooks/useOrderTypeSalesReport";
import {
  exportOrderTypeSalesReportPDF,
  exportOrderTypeSalesReportExcel,
} from "../utils/exportUtils";
import { formatAmount } from "../../../../utils/currency";
import {
  PageShell,
  FormInput,
  Button,
  SearchableSelect,
  ResetButton,
} from "../../../../components/common";
import { OrderTypeSalesReportPrintPreviewModal } from "../components/OrderTypeSalesReportPrintPreviewModal";

const formatDate = (dateStr: string) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

export const OrderTypeSalesReportPage = () => {
  const navigate = useNavigate();
  const { filters, masterData, report } = useOrderTypeSalesReport();
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const branchOptions = useMemo(() => {
    return masterData.branches.map((b) => ({
      label: b.branchName,
      value: String(b.branchId),
    }));
  }, [masterData.branches]);

  // dynamic paymode column list (exclude Date)
  const dynamicPaymodes = useMemo(() => {
    return report.columns.filter((c) => c !== "Date");
  }, [report.columns]);

  // Dynamically calculate column totals for the footer
  const colTotals = useMemo(() => {
    return dynamicPaymodes.map((col) => {
      return report.rows.reduce((sum, row) => sum + Number(row[col] || 0), 0);
    });
  }, [report.rows, dynamicPaymodes]);

  // Extract the grand total from the "Total" column
  const grandTotal = useMemo(() => {
    const totalIndex = dynamicPaymodes.indexOf("Total");
    return totalIndex >= 0 ? (colTotals[totalIndex] || 0) : 0;
  }, [dynamicPaymodes, colTotals]);

  const handleExportPDF = useCallback(() => {
    exportOrderTypeSalesReportPDF(
      { columns: report.columns, rows: report.rows },
      { branchName: filters.branchId === "0" ? "All" : filters.branchId, fromDate: filters.fromDate, toDate: filters.toDate }
    );
  }, [report, filters]);

  const handleExportExcel = useCallback(() => {
    exportOrderTypeSalesReportExcel(
      { columns: report.columns, rows: report.rows },
      { branchName: filters.branchId === "0" ? "All" : filters.branchId, fromDate: filters.fromDate, toDate: filters.toDate }
    );
  }, [report, filters]);

  const previewData = useMemo(() => ({
    reportData: { columns: report.columns, rows: report.rows },
    filters,
    companyName: localStorage.getItem("companyName") || "FEKRA advertising",
    companyAddress: localStorage.getItem("companyAddress") || "NEAR NESTO BESIDE BIN RASHIED SOUQ MABELA BUILDING NO 211 SECOND FLOOR FLAT NO 21",
  }), [report, filters]);

  return (
    <PageShell title="Order Type Sales Report">
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
            {/* 1. Location */}
            <div className="pb-3 xl:pb-0 xl:pr-4 flex flex-col gap-2 shrink-0 justify-start">
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-gray-500 w-16 text-left shrink-0">Location</span>
                <div className="w-40">
                  <SearchableSelect
                    id="otsr-branch"
                    options={branchOptions}
                    value={filters.branchId}
                    onChange={filters.setBranchId}
                    placeholder="All"
                    autoFocus={true}
                    disabled={filters.isBranchLocked}
                  />
                </div>
              </div>
            </div>

            {/* 2. Dates */}
            <div className="pt-3 xl:pt-0 xl:px-3 flex flex-row items-center gap-4 shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-gray-500 w-8 text-left shrink-0">From</span>
                <div className="w-36">
                  <FormInput
                    type="date"
                    value={filters.fromDate}
                    onChange={(e) => filters.setFromDate(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-gray-500 w-5 text-left shrink-0">To</span>
                <div className="w-36">
                  <FormInput
                    type="date"
                    value={filters.toDate}
                    onChange={(e) => filters.setToDate(e.target.value)}
                  />
                </div>
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
                      className={`px-3 py-2 font-bold text-gray-600 text-[11px] text-right border-r border-gray-200/60 ${col === 'Total' ? 'bg-gray-200/50 w-[15%]' : ''}`}
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {report.isLoading ? (
                  <tr>
                    <td colSpan={dynamicPaymodes.length + 1} className="text-center py-12 text-gray-500">
                      Loading order type sales data...
                    </td>
                  </tr>
                ) : report.rows.length === 0 ? (
                  <tr>
                    <td colSpan={dynamicPaymodes.length + 1} className="text-center py-12 text-gray-400 font-medium">
                      No records found.
                    </td>
                  </tr>
                ) : (
                  report.rows.map((row: any, rIdx: number) => {
                    return (
                      <tr key={rIdx} className="hover:bg-gray-50/70 transition-colors odd:bg-white even:bg-gray-50/20">
                        <td className="px-3 py-2 text-center text-gray-800 border-r border-gray-100/60 font-semibold">
                          {row.Date ? formatDate(row.Date) : ""}
                        </td>
                        {dynamicPaymodes.map((col) => {
                          const val = Number(row[col] || 0);
                          return (
                            <td 
                              key={col} 
                              className={`px-3 py-2 text-right border-r border-gray-100/60 font-mono ${col === 'Total' ? 'font-bold text-[#49293e] bg-gray-50/50' : 'text-gray-700'}`}
                            >
                              {formatAmount(val)}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })
                )}
              </tbody>
              {report.rows.length > 0 && (
                <tfoot className="sticky bottom-0 z-10 bg-gray-100 border-t-2 border-gray-300 font-bold shadow-[inset_0_1px_0_rgba(0,0,0,0.1)]">
                  <tr>
                    <td className="px-3 py-2 text-center border-r border-gray-200/60 text-gray-700">Total</td>
                    {colTotals.map((tot, idx) => {
                      const isTotalCol = dynamicPaymodes[idx] === 'Total';
                      return (
                        <td 
                          key={idx} 
                          className={`px-3 py-2 text-right border-r border-gray-200/60 font-mono ${isTotalCol ? 'text-[#49293e] bg-gray-50/70' : 'text-gray-800'}`}
                        >
                          {formatAmount(tot)}
                        </td>
                      );
                    })}
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

      <OrderTypeSalesReportPrintPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        onExportPDF={handleExportPDF}
        data={previewData}
      />
    </PageShell>
  );
};
export default OrderTypeSalesReportPage;
