import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { X, Printer, Download } from "lucide-react";
import { useBillWiseMarginReport } from "../hooks/useBillWiseMarginReport";
import { formatAmount } from "../../../../utils/currency";
import {
  PageShell,
  ResetButton,
  Button,
  SearchableSelect,
  FormInput,
} from "../../../../components/common";
import { BillWiseMarginReportPrintPreviewModal } from "../components/BillWiseMarginReportPrintPreviewModal";
import { exportBillWiseMarginReportXLS, exportBillWiseMarginReportPDF } from "../utils/exportUtils";


const BillWiseMarginReportPage = () => {
  const navigate = useNavigate();
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const { filters, options, data, isLoading, handleReset } = useBillWiseMarginReport();
  const { rows, totals } = data;

  const handleExportExcel = () => {
    exportBillWiseMarginReportXLS(rows, totals);
  };

  const handleExportPDF = () => {
    exportBillWiseMarginReportPDF(rows, totals);
  };

  return (
    <PageShell title="Bill Wise Margin Report">
      <div className="flex flex-col h-[calc(100vh-80px)] overflow-hidden bg-slate-50 p-3 gap-3">
        
        {/* ── Top Header Bar ─────────────────────────────────────────── */}
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
            
            {/* 1. Location + Series */}
            <div className="pb-3 xl:pb-0 xl:pr-4 flex flex-col gap-2 shrink-0 justify-start">
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-gray-500 w-16 text-left shrink-0">Location</span>
                <div className="w-40">
                  <SearchableSelect 
                    id="bwm-branch" 
                    options={options.branchOptions} 
                    value={filters.branchId} 
                    onChange={filters.setBranchId} 
                    disabled={filters.isBranchLocked}
                    placeholder="All" 
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-gray-500 w-16 text-left shrink-0">Series</span>
                <div className="w-40">
                  <SearchableSelect 
                    id="bwm-series" 
                    options={options.seriesOptions} 
                    value={filters.seriesId} 
                    onChange={filters.setSeriesId} 
                    placeholder="All" 
                  />
                </div>
              </div>
            </div>

            {/* 2. Customer */}
            <div className="pt-3 xl:pt-0 xl:px-3 flex flex-col gap-2 shrink-0 justify-start">
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-gray-500 w-16 text-left shrink-0">Customer</span>
                <div className="w-64">
                  <SearchableSelect 
                    id="bwm-customer" 
                    options={options.customerOptions} 
                    value={filters.customerId} 
                    onChange={filters.setCustomerId} 
                    placeholder="All" 
                  />
                </div>
              </div>
            </div>

            {/* 3. Dates */}
            <div className="pt-3 xl:pt-0 xl:px-3 flex flex-col gap-2 shrink-0 justify-start">
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-gray-500 w-8 text-left shrink-0">From</span>
                <div className="w-36">
                  <FormInput 
                    id="bwm-from-date" 
                    type="date" 
                    value={filters.fromDate} 
                    onChange={(e) => filters.setFromDate(e.target.value)} 
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-gray-500 w-8 text-left shrink-0">To</span>
                <div className="w-36">
                  <FormInput 
                    id="bwm-to-date" 
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
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex-1 min-h-0 flex flex-col overflow-hidden relative">
          
          {isLoading && (
            <div className="absolute inset-0 bg-white/70 z-20 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#49293e]" />
            </div>
          )}

          <div className="overflow-x-auto overflow-y-auto flex-1 min-h-0">
            <table className="w-full min-w-[900px] text-xs border-collapse table-fixed">
              <thead className="sticky top-0 z-10 bg-gray-100 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)]">
                <tr>
                  <th className="w-16 px-2 py-2 text-center font-bold text-gray-600 border-r border-gray-200">SNo</th>
                  <th className="w-32 px-2 py-2 text-center font-bold text-gray-600 border-r border-gray-200">Date</th>
                  <th className="w-32 px-2 py-2 text-center font-bold text-gray-600 border-r border-gray-200">Invoice No</th>
                  <th className="w-32 px-2 py-2 text-center font-bold text-gray-600 border-r border-gray-200">Cust Code</th>
                  <th className="w-48 px-2 py-2 text-left font-bold text-gray-600 border-r border-gray-200">Customer Name</th>
                  <th className="w-32 px-2 py-2 text-right font-bold text-gray-600 border-r border-gray-200">Net Value</th>
                  <th className="w-32 px-2 py-2 text-right font-bold text-gray-600 border-r border-gray-200">Cost</th>
                  <th className="w-32 px-2 py-2 text-right font-bold text-gray-600 border-r border-gray-200">Margin</th>
                  <th className="w-32 px-2 py-2 text-right font-bold text-gray-600">Margin %</th>
                </tr>
              </thead>
              <tbody>
                {!isLoading && rows.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                      No records found for the selected period
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr 
                      key={row.salesId} 
                      className="border-b border-gray-100 hover:bg-[#49293e]/5 transition-colors group"
                    >
                      <td className="px-2 py-1.5 text-center text-gray-500 border-r border-gray-100">{row.sNo}</td>
                      <td className="px-2 py-1.5 text-center text-gray-700 border-r border-gray-100">{row.invoiceDate.split('T')[0]}</td>
                      <td className="px-2 py-1.5 text-center font-mono text-gray-700 border-r border-gray-100">{row.invoiceNo}</td>
                      <td className="px-2 py-1.5 text-center font-mono text-gray-700 border-r border-gray-100">{row.customerCode}</td>
                      <td className="px-2 py-1.5 text-left text-gray-800 border-r border-gray-100 truncate" title={row.customerName}>{row.customerName}</td>
                      <td className="px-2 py-1.5 text-right tabular-nums font-medium text-gray-800 border-r border-gray-100">{formatAmount(Number(row.netValue))}</td>
                      <td className="px-2 py-1.5 text-right tabular-nums text-gray-700 border-r border-gray-100">{formatAmount(Number(row.cost))}</td>
                      <td className="px-2 py-1.5 text-right tabular-nums font-medium text-green-700 border-r border-gray-100">{formatAmount(Number(row.margin))}</td>
                      <td className="px-2 py-1.5 text-right tabular-nums text-[#49293e]">{formatAmount(Number(row.marginper))}</td>
                    </tr>
                  ))
                )}
              </tbody>
              
            </table>
          </div>

          {!isLoading && rows.length > 0 && (
            <div className="overflow-x-auto shrink-0 bg-gray-100 border-t-2 border-t-[#49293e]/30 shadow-[0_-2px_6px_rgba(0,0,0,0.08)] z-20">
              <table className="w-full min-w-[900px] text-xs border-collapse table-fixed">
                <tbody>
                  <tr className="font-bold">
                    <td className="w-16 px-2 py-2 text-center text-gray-700 border-r border-gray-200">Total</td>
                    <td className="w-32 border-r border-gray-200" />
                    <td className="w-32 border-r border-gray-200" />
                    <td className="w-32 border-r border-gray-200" />
                    <td className="w-48 border-r border-gray-200" />
                    <td className="w-32 px-2 py-2 text-right tabular-nums text-gray-900 border-r border-gray-200">{formatAmount(totals.netValue)}</td>
                    <td className="w-32 px-2 py-2 text-right tabular-nums text-gray-900 border-r border-gray-200">{formatAmount(totals.cost)}</td>
                    <td className="w-32 px-2 py-2 text-right tabular-nums text-green-700 border-r border-gray-200">{formatAmount(totals.margin)}</td>
                    <td className="w-32 px-2 py-2 text-right tabular-nums text-[#49293e]">{formatAmount(totals.marginper)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Sticky Bottom Actions Bar ───────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-4 py-2 shrink-0 flex items-center justify-between">
          <div className="flex items-center gap-5 text-xs font-medium text-gray-600">
            {/* Any extra footer info can go here */}
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

      <BillWiseMarginReportPrintPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        onExportPDF={() => {
          handleExportPDF();
          setIsPreviewOpen(false);
        }}
        data={{
          reportData: rows,
          totals,
          filters
        }}
      />
    </PageShell>
  );
};

export default BillWiseMarginReportPage;
