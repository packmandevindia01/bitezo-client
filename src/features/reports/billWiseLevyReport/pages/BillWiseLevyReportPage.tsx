import { useNavigate } from "react-router-dom";
import { useMemo, useState, useCallback } from "react";
import { Printer, X, Download } from "lucide-react";
import { useBillWiseLevyReport } from "../hooks/useBillWiseLevyReport";
import {
  exportBillWiseLevyReportPDF,
  exportBillWiseLevyReportExcel,
  formatDate,
  getBillNo,
} from "../utils/exportUtils";
import { formatAmount } from "../../../../utils/currency";
import {
  PageShell,
  FormInput,
  Button,
  SearchableSelect,
  ResetButton,
} from "../../../../components/common";
import { BillWiseLevyReportPrintPreviewModal } from "../components/BillWiseLevyReportPrintPreviewModal";

export const BillWiseLevyReportPage = () => {
  const navigate = useNavigate();
  const { filters, masterData, report } = useBillWiseLevyReport();
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const selectedBranchName = useMemo(() => {
    if (filters.branchId === "0") return "All";
    return (
      masterData.branches.find((b) => String(b.branchId) === filters.branchId)?.branchName ||
      filters.branchId
    );
  }, [filters.branchId, masterData.branches]);

  const totals = useMemo(() => {
    let sumNetValue = 0;
    let sumServiceCharge = 0;
    let sumLevy = 0;
    let sumVatAmount = 0;
    let sumNetAmount = 0;

    report.rows.forEach((row) => {
      sumNetValue += Number(row.netValue ?? 0);
      sumServiceCharge += Number(row.serviceCharge ?? 0);
      sumLevy += Number(row.levy ?? 0);
      sumVatAmount += Number(row.vatAmount ?? 0);
      sumNetAmount += Number(row.netAmount ?? 0);
    });

    return {
      netValue: report.totalData
        ? Number(report.totalData.netValue ?? sumNetValue)
        : sumNetValue,
      serviceCharge: report.totalData
        ? Number(report.totalData.serviceCharge ?? sumServiceCharge)
        : sumServiceCharge,
      levy: report.totalData ? Number(report.totalData.levy ?? sumLevy) : sumLevy,
      vatAmount: report.totalData
        ? Number(report.totalData.vatAmount ?? sumVatAmount)
        : sumVatAmount,
      netAmount: report.totalData
        ? Number(report.totalData.netAmount ?? sumNetAmount)
        : sumNetAmount,
    };
  }, [report.rows, report.totalData]);

  const handleExportPDF = useCallback(() => {
    exportBillWiseLevyReportPDF(report.rows, report.totalData, {
      branchName: selectedBranchName,
      fromDate: filters.fromDate,
      toDate: filters.toDate,
    });
  }, [report, filters, selectedBranchName]);

  const handleExportExcel = useCallback(() => {
    exportBillWiseLevyReportExcel(report.rows, report.totalData, {
      branchName: selectedBranchName,
      fromDate: filters.fromDate,
      toDate: filters.toDate,
    });
  }, [report, filters, selectedBranchName]);

  const previewData = useMemo(
    () => ({
      rows: report.rows,
      totalData: report.totalData,
      filters,
      branchName: selectedBranchName,
      companyName: localStorage.getItem("companyName") || "FEKRA advertising",
      companyAddress:
        localStorage.getItem("companyAddress") ||
        "NEAR NESTO BESIDE BIN RASHIED SOUQ MABELA BUILDING NO 211 SECOND FLOOR FLAT NO 21",
    }),
    [report, filters, selectedBranchName]
  );

  return (
    <PageShell title="Bill Wise Levy Report">
      <div className="flex flex-col h-auto md:h-[calc(100vh-92px)] md:overflow-hidden p-1 gap-3 relative">
        {/* ── Filter Panel ────────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm shrink-0 relative pr-28">
          <button
            onClick={() => navigate("/dashboard")}
            className="absolute top-1/2 -translate-y-1/2 right-3 p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors z-30"
            title="Close"
          >
            <X size={18} />
          </button>

          <ResetButton
            onReset={filters.resetFilters}
            className="absolute top-1/2 -translate-y-1/2 right-12 z-30"
          />

          <div className="px-4 py-3 flex flex-col xl:flex-row gap-3.5 divide-y xl:divide-y-0 xl:divide-x divide-gray-200">
            {/* 1. Location */}
            <div className="pb-3 xl:pb-0 xl:pr-4 flex flex-col sm:flex-row gap-4 shrink-0 justify-start">
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-gray-500 w-14 text-left shrink-0 font-medium">
                  Location
                </span>
                <div className="w-44">
                  <SearchableSelect
                    id="bwlr-branch"
                    options={masterData.branchOptions}
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
                  <th className="px-3 py-2.5 font-bold text-gray-600 text-[11px] text-center w-[6%] border-r border-gray-200/60">
                    S.No
                  </th>
                  <th className="px-3 py-2.5 font-bold text-gray-600 text-[11px] text-center w-[12%] border-r border-gray-200/60">
                    Bill Date
                  </th>
                  <th className="px-3 py-2.5 font-bold text-gray-600 text-[11px] text-center w-[12%] border-r border-gray-200/60">
                    Bill No
                  </th>
                  <th className="px-3 py-2.5 font-bold text-gray-600 text-[11px] text-right w-[14%] border-r border-gray-200/60">
                    Net Value
                  </th>
                  <th className="px-3 py-2.5 font-bold text-gray-600 text-[11px] text-right w-[14%] border-r border-gray-200/60">
                    Service Charge
                  </th>
                  <th className="px-3 py-2.5 font-bold text-gray-600 text-[11px] text-right w-[14%] border-r border-gray-200/60">
                    Levy
                  </th>
                  <th className="px-3 py-2.5 font-bold text-gray-600 text-[11px] text-right w-[14%] border-r border-gray-200/60">
                    VAT Amount
                  </th>
                  <th className="px-3 py-2.5 font-bold text-[#49293e] text-[11px] text-right w-[14%] bg-gray-200/50">
                    Net Amount
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {report.isLoading ? (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-gray-500">
                      Loading bill wise levy data...
                    </td>
                  </tr>
                ) : report.rows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-gray-400 font-medium">
                      No records found.
                    </td>
                  </tr>
                ) : (
                  report.rows.map((row: any, rIdx: number) => {
                    return (
                      <tr
                        key={rIdx}
                        className="hover:bg-gray-50/70 transition-colors odd:bg-white even:bg-gray-50/20"
                      >
                        <td className="px-3 py-2 text-center text-gray-600 border-r border-gray-100/60 font-medium">
                          {row.sNo ?? rIdx + 1}
                        </td>
                        <td className="px-3 py-2 text-center text-gray-700 border-r border-gray-100/60 font-mono">
                          {formatDate(row.invDate)}
                        </td>
                        <td className="px-3 py-2 text-center text-gray-700 border-r border-gray-100/60 font-mono">
                          {getBillNo(row)}
                        </td>
                        <td className="px-3 py-2 text-right text-gray-700 border-r border-gray-100/60 font-mono">
                          {formatAmount(Number(row.netValue || 0))}
                        </td>
                        <td className="px-3 py-2 text-right text-gray-700 border-r border-gray-100/60 font-mono">
                          {formatAmount(Number(row.serviceCharge || 0))}
                        </td>
                        <td className="px-3 py-2 text-right text-gray-700 border-r border-gray-100/60 font-mono">
                          {formatAmount(Number(row.levy || 0))}
                        </td>
                        <td className="px-3 py-2 text-right text-gray-700 border-r border-gray-100/60 font-mono">
                          {formatAmount(Number(row.vatAmount || 0))}
                        </td>
                        <td className="px-3 py-2 text-right font-mono font-bold text-[#49293e] bg-gray-50/50">
                          {formatAmount(Number(row.netAmount || 0))}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              {report.rows.length > 0 && (
                <tfoot className="sticky bottom-0 z-10 bg-gray-100 border-t-2 border-gray-300 font-bold shadow-[inset_0_1px_0_rgba(0,0,0,0.1)]">
                  <tr>
                    <td
                      colSpan={3}
                      className="px-3 py-2.5 text-center border-r border-gray-200/60 text-gray-700"
                    >
                      Total
                    </td>
                    <td className="px-3 py-2.5 text-right border-r border-gray-200/60 text-gray-800 font-mono">
                      {formatAmount(totals.netValue)}
                    </td>
                    <td className="px-3 py-2.5 text-right border-r border-gray-200/60 text-gray-800 font-mono">
                      {formatAmount(totals.serviceCharge)}
                    </td>
                    <td className="px-3 py-2.5 text-right border-r border-gray-200/60 text-gray-800 font-mono">
                      {formatAmount(totals.levy)}
                    </td>
                    <td className="px-3 py-2.5 text-right border-r border-gray-200/60 text-gray-800 font-mono">
                      {formatAmount(totals.vatAmount)}
                    </td>
                    <td className="px-3 py-2.5 text-right text-[#49293e] font-mono text-sm bg-gray-50/70">
                      {formatAmount(totals.netAmount)}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

        {/* ── Summary & Export Bar ────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-4 py-2.5 shrink-0 flex items-center justify-between gap-3 text-xs">
          <div className="flex gap-5 font-semibold items-center overflow-x-auto">
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-gray-400 text-[10px] uppercase font-medium">Net Value:</span>
              <span className="text-gray-800 font-mono font-bold">
                {formatAmount(totals.netValue)}
              </span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-gray-400 text-[10px] uppercase font-medium">Service Charge:</span>
              <span className="text-gray-800 font-mono font-bold">
                {formatAmount(totals.serviceCharge)}
              </span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-gray-400 text-[10px] uppercase font-medium">Levy:</span>
              <span className="text-gray-800 font-mono font-bold">
                {formatAmount(totals.levy)}
              </span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-gray-400 text-[10px] uppercase font-medium">VAT Amount:</span>
              <span className="text-gray-800 font-mono font-bold">
                {formatAmount(totals.vatAmount)}
              </span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-gray-400 text-[10px] uppercase font-medium">Grand Total:</span>
              <span className="text-[#49293e] text-sm font-mono font-bold">
                {formatAmount(totals.netAmount)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
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

      <BillWiseLevyReportPrintPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        onExportPDF={handleExportPDF}
        data={previewData}
      />
    </PageShell>
  );
};

export default BillWiseLevyReportPage;
