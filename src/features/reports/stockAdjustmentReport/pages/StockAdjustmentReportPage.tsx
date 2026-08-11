import { useNavigate } from "react-router-dom";
import { useMemo, useState } from "react";
import { Printer, X, Download } from "lucide-react";
import { useStockAdjustmentReport } from "../hooks/useStockAdjustmentReport";
import {
  exportStockAdjustmentPDF,
  exportStockAdjustmentExcel,
} from "../utils/stockAdjustmentExportUtils";
import { formatAmount } from "../../../../utils/currency";
import {
  PageShell,
  FormInput,
  Button,
  SearchableSelect,
  ResetButton,
} from "../../../../components/common";
import { StockAdjustmentPrintPreviewModal } from "../components/StockAdjustmentPrintPreviewModal";

const COLS = [
  { key: "sno", label: "SNo", cls: "w-[6%] text-center" },
  { key: "transDate", label: "Trans Date", cls: "w-[14%] text-center" },
  { key: "refNo", label: "Ref No", cls: "w-[10%] text-center" },
  { key: "branch", label: "Branch", cls: "w-[25%] text-left" },
  { key: "employee", label: "Employee", cls: "w-[25%] text-left" },
  { key: "netAmount", label: "Net Amount", cls: "w-[20%] text-right" },
];

const formatDate = (dateStr: string) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

const StockAdjustmentReportPage = () => {
  const navigate = useNavigate();
  const { filters, masterData, report } = useStockAdjustmentReport();
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const handleReset = () => {
    filters.resetFilters();
  };

  const branchOptions = useMemo(() => [
    { label: "All", value: "0" },
    ...masterData.branches.map(b => ({
      label: b.branchName,
      value: String(b.branchId),
    })),
  ], [masterData.branches]);

  const employeeOptions = useMemo(() => [
    { label: "All", value: "0" },
    ...masterData.employees.map(e => ({
      label: e.empName,
      value: String(e.empId),
    })),
  ], [masterData.employees]);

  const totalNetAmount = useMemo(() => {
    return report.data.reduce((sum, item) => sum + Number(item.netAmount || 0), 0);
  }, [report.data]);

  const printData = useMemo(() => ({
    data: report.data,
    totalNetAmount,
    filters: {
      fromDate: filters.fromDate,
      toDate: filters.toDate,
    },
    companyName: localStorage.getItem("companyName") || "FEKRA advertising",
    companyAddress: localStorage.getItem("companyAddress") || "NEAR NESTO BESIDE BIN RASHIED SOUQ MABELA BUILDING NO 211 SECOND FLOOR FLAT NO 21",
  }), [report.data, totalNetAmount, filters.fromDate, filters.toDate]);

  return (
    <PageShell title="Stock Adjustment Report">
      <div className="flex flex-col h-auto md:h-[calc(100vh-92px)] md:overflow-hidden p-1 gap-3 relative">
        {/* ── Filter Panel ────────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm shrink-0 relative pr-28">
          <button
            onClick={() => navigate("/dashboard/reports")}
            className="absolute top-1/2 -translate-y-1/2 right-3 p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors z-30"
            title="Close"
          >
            <X size={18} />
          </button>

          <ResetButton
            onReset={handleReset}
            className="absolute top-1/2 -translate-y-1/2 right-12 z-30"
          />

          <div className="px-4 py-3 flex flex-col xl:flex-row gap-3.5 divide-y xl:divide-y-0 xl:divide-x divide-gray-200">
            {/* 1. Branch & Employee */}
            <div className="pb-3 xl:pb-0 xl:pr-4 flex flex-col sm:flex-row gap-4 shrink-0 justify-start">
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-gray-500 w-14 text-left shrink-0 font-medium">
                  Branch
                </span>
                <div className="w-44">
                  <SearchableSelect
                    id="sar-branch"
                    options={branchOptions}
                    value={filters.branchId}
                    onChange={filters.setBranchId}
                    placeholder="All"
                    autoFocus={true}
                    disabled={filters.isBranchLocked}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] text-gray-500 w-14 text-left shrink-0 font-medium">
                  Employee
                </span>
                <div className="w-48">
                  <SearchableSelect
                    id="sar-employee"
                    options={employeeOptions}
                    value={filters.employeeId}
                    onChange={filters.setEmployeeId}
                    placeholder="All"
                  />
                </div>
              </div>
            </div>

            {/* 2. Dates */}
            <div className="pt-3 xl:pt-0 xl:px-3 flex flex-row items-center gap-4 shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-gray-500 w-8 text-left shrink-0 font-medium">
                  From
                </span>
                <div className="w-36">
                  <FormInput
                    type="date"
                    value={filters.fromDate}
                    onChange={(e) => filters.setFromDate(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-gray-500 w-5 text-left shrink-0 font-medium">
                  To
                </span>
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
            <table className="w-full min-w-[950px] text-xs border-collapse table-fixed">
              <thead className="sticky top-0 z-10 bg-gray-100 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)]">
                <tr>
                  <th className="px-3 py-2.5 font-bold text-gray-600 text-[11px] text-center w-[6%] border-r border-gray-200/60">SNO</th>
                  <th className="px-3 py-2.5 font-bold text-gray-600 text-[11px] text-center w-[14%] border-r border-gray-200/60">TRANS DATE</th>
                  <th className="px-3 py-2.5 font-bold text-gray-600 text-[11px] text-center w-[10%] border-r border-gray-200/60">REF NO</th>
                  <th className="px-3 py-2.5 font-bold text-gray-600 text-[11px] text-left w-[25%] border-r border-gray-200/60">BRANCH</th>
                  <th className="px-3 py-2.5 font-bold text-gray-600 text-[11px] text-left w-[25%] border-r border-gray-200/60">EMPLOYEE</th>
                  <th className="px-3 py-2.5 font-bold text-[#49293e] text-[11px] text-right w-[20%] bg-gray-200/50">NET AMOUNT</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {report.isLoading ? (
                  <tr>
                    <td colSpan={COLS.length} className="text-center py-12 text-gray-500">
                      Loading stock adjustment data...
                    </td>
                  </tr>
                ) : report.isError ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-gray-500">
                      Failed to load report data.
                    </td>
                  </tr>
                ) : report.data.length === 0 ? (
                  <tr>
                    <td colSpan={COLS.length} className="text-center py-12 text-gray-400 font-medium">
                      No records found.
                    </td>
                  </tr>
                ) : (
                  report.data.map((row, idx) => (
                    <tr key={row.transId || idx} className="hover:bg-gray-50/70 transition-colors odd:bg-white even:bg-gray-50/20">
                      <td className="px-3 py-2 text-center text-gray-600 border-r border-gray-100/60 font-medium">{row.sNo || idx + 1}</td>
                      <td className="px-3 py-2 text-center text-gray-700 border-r border-gray-100/60 font-mono whitespace-nowrap">{row.transDate ? formatDate(row.transDate) : ""}</td>
                      <td className="px-3 py-2 text-center text-gray-700 border-r border-gray-100/60 font-mono">{row.refNo || ""}</td>
                      <td className="px-3 py-2 text-left text-gray-900 border-r border-gray-100/60 font-medium truncate" title={row.branch || ""}>{row.branch || "-"}</td>
                      <td className="px-3 py-2 text-left text-gray-900 border-r border-gray-100/60 truncate" title={row.employee || ""}>{row.employee || "-"}</td>
                      <td className="px-3 py-2 text-right font-mono font-bold text-[#49293e] bg-gray-50/50 tabular-nums">{formatAmount(Number(row.netAmount || 0))}</td>
                    </tr>
                  ))
                )}
              </tbody>
              {report.data.length > 0 && (
                <tfoot className="sticky bottom-0 z-10 bg-gray-100 border-t-2 border-gray-300 font-bold shadow-[inset_0_1px_0_rgba(0,0,0,0.1)]">
                  <tr>
                    <td colSpan={5} className="px-3 py-2.5 text-center border-r border-gray-200/60 text-gray-700">
                      Total
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-[#49293e] text-[11px] bg-gray-50/70">
                      {formatAmount(totalNetAmount)}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

        {/* ── Summary & Export Bar ────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-4 py-2.5 shrink-0 flex items-center justify-between gap-3 text-xs">
          <div className="flex gap-6 font-semibold items-center">
            <div className="flex items-center gap-2">
              <span className="text-gray-400 text-[10px] uppercase font-medium">Total Records:</span>
              <span className="text-gray-800 font-mono font-bold">{report.data.length}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-400 text-[10px] uppercase font-medium">Total Net Amount:</span>
              <span className="text-[#49293e] text-sm font-mono font-bold">
                {formatAmount(totalNetAmount)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              size="sm"
              icon={<Printer size={15} />}
              onClick={() => setIsPreviewOpen(true)}
              disabled={report.isLoading || report.data.length === 0}
            >
              Print Preview
            </Button>
            <Button
              size="sm"
              onClick={() => exportStockAdjustmentExcel(report.data, filters)}
              disabled={report.isLoading || report.data.length === 0}
              icon={<Download size={15} />}
              className="!bg-green-600 !border-green-600 hover:!bg-green-700 !text-white"
            >
              XLS
            </Button>
          </div>
        </div>

      </div>

      <StockAdjustmentPrintPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        data={printData}
        onExportPDF={() => {
          setIsPreviewOpen(false);
          exportStockAdjustmentPDF(report.data, filters);
        }}
      />
    </PageShell>
  );
};

export default StockAdjustmentReportPage;
