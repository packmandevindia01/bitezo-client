import { useNavigate } from "react-router-dom";
import { useMemo, useState, useCallback } from "react";
import { Printer, X, Download } from "lucide-react";
import { useEmployeeSalesReport } from "../hooks/useEmployeeSalesReport";
import { exportEmployeeSalesReportPDF, exportEmployeeSalesReportExcel } from "../utils/exportUtils";
import { formatAmount } from "../../../../utils/currency";
import {
  PageShell,
  FormInput,
  Button,
  SearchableSelect,
  ResetButton
} from "../../../../components/common";
import { EmployeeSalesReportPrintPreviewModal } from "../components/EmployeeSalesReportPrintPreviewModal";

const COLS = [
  { key: "sno",      label: "SNo",       cls: "w-[5%] text-center" },
  { key: "code",     label: "Code",      cls: "w-[10%] text-center" },
  { key: "employee", label: "Employee",  cls: "w-[40%] text-left" },
  { key: "netValue", label: "Net Value", cls: "w-[15%] text-right" },
  { key: "vatAmnt",  label: "Vat Amnt",  cls: "w-[15%] text-right" },
  { key: "amount",   label: "Amount",    cls: "w-[15%] text-right" },
];

const EmployeeSalesReportPage = () => {
  const navigate = useNavigate();
  const { filters, masterData, report } = useEmployeeSalesReport();
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const handleReset = () => {
    filters.resetFilters();
  };

  const branchOptions = useMemo(() => {
    return masterData.branches.map(b => ({
      label: b.branchName,
      value: String(b.branchId)
    }));
  }, [masterData.branches]);

  const salesData = report.salesData || [];

  const handleExportPDF = useCallback(() => {
    exportEmployeeSalesReportPDF(salesData, {
      ...filters,
      branchName: branchOptions.find(o => o.value === filters.branchId)?.label,
    });
  }, [filters, branchOptions, salesData]);

  const handleExportExcel = useCallback(() => {
    exportEmployeeSalesReportExcel(salesData, {
      ...filters,
      branchName: branchOptions.find(o => o.value === filters.branchId)?.label,
    });
  }, [filters, branchOptions, salesData]);

  // ─── Grand totals ──────────────────────────────────────────────────────────
  const grandTotals = useMemo(() => ({
    netValue:  salesData.reduce((s, r) => s + Number(r.netValue || 0), 0),
    vatAmount: salesData.reduce((s, r) => s + Number(r.vatAmount || 0), 0),
    netAmount: salesData.reduce((s, r) => s + Number(r.netAmount || 0), 0),
  }), [salesData]);

  const previewData = useMemo(() => ({
    salesData: salesData,
    grandTotal: grandTotals.netAmount,
    filters,
    companyName: localStorage.getItem("companyName") || "FEKRA advertising",
    companyAddress: localStorage.getItem("companyAddress") || "NEAR NESTO BESIDE BIN RASHIED SOUQ MABELA BUILDING NO 211 SECOND FLOOR FLAT NO 21",
  }), [salesData, grandTotals.netAmount, filters]);

  return (
    <PageShell title="Employee Sales Report">
      {/* Container to fill remaining viewport height */}
      <div className="flex flex-col h-auto md:h-[calc(100vh-92px)] md:overflow-hidden p-1 gap-3 relative">

        {/* ── Filter Panel (Fixed Height, compact padding) ────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm shrink-0 relative pr-28">
          
          <button
            onClick={() => navigate("/dashboard")}
            className="absolute top-1/2 -translate-y-1/2 right-3 p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors z-30"
            title="Close"
          >
            <X size={18} />
          </button>

          <ResetButton
            onReset={handleReset}
            className="absolute top-1/2 -translate-y-1/2 right-12"
          />

          <div className="px-4 py-3 flex flex-col xl:flex-row gap-3.5 divide-y xl:divide-y-0 xl:divide-x divide-gray-200">
            
            {/* 1. Location */}
            <div className="pb-3 xl:pb-0 xl:pr-4 flex flex-col gap-2 shrink-0 justify-start">
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-gray-500 w-16 text-left shrink-0">Location</span>
                <div className="w-40">
                  <SearchableSelect 
                    id="esr-branch" 
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
                  <FormInput id="esr-from-date" type="date" value={filters.fromDate} onChange={(e) => filters.setFromDate(e.target.value)} />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-gray-500 w-5 text-left shrink-0">To</span>
                <div className="w-36">
                  <FormInput id="esr-to-date" type="date" value={filters.toDate} onChange={(e) => filters.setToDate(e.target.value)} />
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* ── Table Card (Expands to fill remaining viewport space) ─────── */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col flex-1 min-h-0">
          
          {!report.isLoading && salesData.length > 0 && (
            <p className="text-center text-[11px] font-semibold text-[#49293e] py-1.5 border-b border-gray-100 shrink-0">
              Employee Sales Report from {filters.fromDate} To {filters.toDate}
            </p>
          )}

          <div className="overflow-x-auto overflow-y-auto flex-1 min-h-0">
            <table className="w-full text-xs min-w-[800px] table-layout-fixed">
              <thead className="sticky top-0 z-10 bg-gray-100 shadow-[0_1px_0_rgba(0,0,0,0.05)]">
                <tr>
                  {COLS.map(col => (
                    <th
                      key={col.key}
                      className={`px-2 py-2 font-semibold text-gray-700 text-[11px] tracking-wide border-r last:border-r-0 border-gray-200 ${col.cls}`}
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {report.isLoading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      {COLS.map(col => (
                        <td key={col.key} className="px-2 py-2">
                          <div className="h-3 bg-gray-100 rounded" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : salesData.length === 0 ? (
                  <tr>
                    <td colSpan={COLS.length} className="text-center py-20 text-gray-400 text-sm">
                      No records found. Adjust filters.
                    </td>
                  </tr>
                ) : (
                  salesData.map((row: any, idx: number) => (
                    <tr
                      key={row.employeeId ?? idx}
                      className={`hover:bg-[#49293e]/5 transition-colors ${idx % 2 === 0 ? "bg-white" : "bg-gray-50/60"}`}
                    >
                      <td className="px-2 py-1.5 text-center text-gray-500 border-r border-gray-100">{idx + 1}</td>
                      <td className="px-2 py-1.5 text-center font-mono text-gray-800 border-r border-gray-100">{row.code || ""}</td>
                      <td className="px-2 py-1.5 text-left font-medium uppercase text-gray-800 border-r border-gray-100">{row.employee || ""}</td>
                      <td className="px-2 py-1.5 text-right tabular-nums text-gray-800 border-r border-gray-100">{formatAmount(Number(row.netValue || 0))}</td>
                      <td className="px-2 py-1.5 text-right tabular-nums text-gray-700 border-r border-gray-100">{formatAmount(Number(row.vatAmount || 0))}</td>
                      <td className="px-2 py-1.5 text-right tabular-nums font-semibold text-[#49293e]">{formatAmount(Number(row.netAmount || 0))}</td>
                    </tr>
                  ))
                )}
              </tbody>

              {!report.isLoading && salesData.length > 0 && (
                <tfoot className="sticky bottom-0 z-10 bg-gray-100 border-t-2 border-t-[#49293e]/20 shadow-[0_-1px_0_rgba(0,0,0,0.05)]">
                  <tr>
                    <td className="py-1.5 border-r border-gray-200" />
                    <td className="border-r border-gray-200" />
                    <td className="border-r border-gray-200 text-right font-bold pr-4">Totals:</td>
                    <td className="px-2 py-1.5 text-right font-bold tabular-nums text-gray-900 border-r border-gray-200">{formatAmount(grandTotals.netValue)}</td>
                    <td className="px-2 py-1.5 text-right font-bold tabular-nums text-gray-900 border-r border-gray-200">{formatAmount(grandTotals.vatAmount)}</td>
                    <td className="px-2 py-1.5 text-right font-bold tabular-nums text-[#49293e] text-sm">{formatAmount(grandTotals.netAmount)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

        {/* ── Sticky Bottom Summary / Actions Bar (Shrink-0) ──────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-4 py-2 shrink-0 flex items-center justify-between">
          <div className="flex items-center gap-5 text-xs font-medium text-gray-600">
             {/* Left intentionally blank or for future summaries */}
          </div>

          <div className="flex items-center gap-3">
            {salesData.length > 0 && (
              <span className="text-xs text-gray-400">
                {salesData.length} record{salesData.length !== 1 ? "s" : ""}
              </span>
            )}
            <div className="h-4 w-px bg-gray-200" />
            <Button
              size="sm"
              icon={<Printer size={15} />}
              onClick={() => setIsPreviewOpen(true)}
              disabled={report.isLoading || salesData.length === 0}
            >
              Print Preview
            </Button>
            <Button
              size="sm"
              onClick={handleExportExcel}
              disabled={report.isLoading || salesData.length === 0}
              icon={<Download size={15} />}
              className="!bg-green-600 !border-green-600 hover:!bg-green-700 !text-white"
            >
              XLS
            </Button>
          </div>
        </div>

        <EmployeeSalesReportPrintPreviewModal
          isOpen={isPreviewOpen}
          onClose={() => setIsPreviewOpen(false)}
          data={previewData}
          onExportPDF={handleExportPDF}
        />

      </div>
    </PageShell>
  );
};

export default EmployeeSalesReportPage;
