import { useNavigate } from "react-router-dom";
import { useMemo, useState, useCallback } from "react";
import { Printer, X, Download } from "lucide-react";
import { useGroupWiseSalesReport } from "../hooks/useGroupWiseSalesReport";
import {
  exportGroupWiseSalesReportPDF,
  exportGroupWiseSalesReportExcel,
} from "../utils/exportUtils";
import { formatAmount } from "../../../../utils/currency";
import {
  PageShell,
  FormInput,
  Button,
  SearchableSelect,
  ResetButton,
} from "../../../../components/common";
import { GroupWiseSalesReportPrintPreviewModal } from "../components/GroupWiseSalesReportPrintPreviewModal";

export const GroupWiseSalesReportPage = () => {
  const navigate = useNavigate();
  const { filters, masterData, report } = useGroupWiseSalesReport();
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const branchOptions = useMemo(() => {
    return masterData.branches.map((b) => ({
      label: b.branchName,
      value: String(b.branchId),
    }));
  }, [masterData.branches]);

  const selectedBranchName = useMemo(() => {
    if (filters.branchId === "0") return "All";
    return (
      masterData.branches.find((b) => String(b.branchId) === filters.branchId)?.branchName ||
      filters.branchId
    );
  }, [filters.branchId, masterData.branches]);

  const selectedGroupName = useMemo(() => {
    return (
      masterData.groupOptions.find((g) => g.value === filters.groupId)?.label || "All"
    );
  }, [filters.groupId, masterData.groupOptions]);

  const totals = useMemo(() => {
    let sumQty = 0;
    let sumAmount = 0;
    let sumDiscount = 0;
    let sumNetValue = 0;
    let sumVatAmount = 0;
    let sumNetAmount = 0;

    report.rows.forEach((row) => {
      sumQty += Number(row.qty ?? row.quantity ?? row.totalQty ?? 0);
      sumAmount += Number(row.amount ?? 0);
      sumDiscount += Number(row.discount ?? 0);
      sumNetValue += Number(row.netValue ?? 0);
      sumVatAmount += Number(row.vatAmount ?? 0);
      sumNetAmount += Number(row.netAmount ?? 0);
    });

    return {
      qty: sumQty,
      amount: report.totalData ? Number(report.totalData.amount ?? sumAmount) : sumAmount,
      discount: report.totalData ? Number(report.totalData.discount ?? sumDiscount) : sumDiscount,
      netValue: report.totalData ? Number(report.totalData.netValue ?? sumNetValue) : sumNetValue,
      vatAmount: report.totalData ? Number(report.totalData.vatAmount ?? sumVatAmount) : sumVatAmount,
      netAmount: report.totalData ? Number(report.totalData.netAmount ?? sumNetAmount) : sumNetAmount,
    };
  }, [report.rows, report.totalData]);

  const handleExportPDF = useCallback(() => {
    exportGroupWiseSalesReportPDF(report.rows, report.totalData, {
      branchName: selectedBranchName,
      groupName: selectedGroupName,
      fromDate: filters.fromDate,
      toDate: filters.toDate,
    });
  }, [report, filters, selectedBranchName, selectedGroupName]);

  const handleExportExcel = useCallback(() => {
    exportGroupWiseSalesReportExcel(report.rows, report.totalData, {
      branchName: selectedBranchName,
      groupName: selectedGroupName,
      fromDate: filters.fromDate,
      toDate: filters.toDate,
    });
  }, [report, filters, selectedBranchName, selectedGroupName]);

  const previewData = useMemo(
    () => ({
      rows: report.rows,
      totalData: report.totalData,
      filters,
      branchName: selectedBranchName,
      groupName: selectedGroupName,
      companyName: localStorage.getItem("companyName") || "FEKRA advertising",
      companyAddress:
        localStorage.getItem("companyAddress") ||
        "NEAR NESTO BESIDE BIN RASHIED SOUQ MABELA BUILDING NO 211 SECOND FLOOR FLAT NO 21",
    }),
    [report, filters, selectedBranchName, selectedGroupName]
  );

  return (
    <PageShell title="Group Wise Sales Report">
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
            className="absolute top-1/2 -translate-y-1/2 right-12"
          />

          <div className="px-4 py-3 flex flex-col xl:flex-row gap-3.5 divide-y xl:divide-y-0 xl:divide-x divide-gray-200">
            {/* 1. Location & Group */}
            <div className="pb-3 xl:pb-0 xl:pr-4 flex flex-col sm:flex-row gap-4 shrink-0 justify-start">
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-gray-500 w-14 text-left shrink-0 font-medium">
                  Location
                </span>
                <div className="w-44">
                  <SearchableSelect
                    id="gwsr-branch"
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
                <span className="text-[11px] text-gray-500 w-12 text-left shrink-0 font-medium">
                  Group
                </span>
                <div className="w-48">
                  <SearchableSelect
                    id="gwsr-group"
                    options={masterData.groupOptions}
                    value={filters.groupId}
                    onChange={filters.setGroupId}
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
                  <th className="px-3 py-2.5 font-bold text-gray-600 text-[11px] text-center w-[5%] border-r border-gray-200/60">
                    S.No
                  </th>
                  <th className="px-3 py-2.5 font-bold text-gray-600 text-[11px] text-center w-[12%] border-r border-gray-200/60">
                    Group Code
                  </th>
                  <th className="px-3 py-2.5 font-bold text-gray-600 text-[11px] text-left w-[20%] border-r border-gray-200/60">
                    Group Name
                  </th>
                  <th className="px-3 py-2.5 font-bold text-gray-600 text-[11px] text-right w-[9%] border-r border-gray-200/60">
                    Qty
                  </th>
                  <th className="px-3 py-2.5 font-bold text-gray-600 text-[11px] text-right w-[11%] border-r border-gray-200/60">
                    Amount
                  </th>
                  <th className="px-3 py-2.5 font-bold text-gray-600 text-[11px] text-right w-[11%] border-r border-gray-200/60">
                    Discount
                  </th>
                  <th className="px-3 py-2.5 font-bold text-gray-600 text-[11px] text-right w-[11%] border-r border-gray-200/60">
                    Net Value
                  </th>
                  <th className="px-3 py-2.5 font-bold text-gray-600 text-[11px] text-right w-[10%] border-r border-gray-200/60">
                    VAT Amount
                  </th>
                  <th className="px-3 py-2.5 font-bold text-[#49293e] text-[11px] text-right w-[11%] bg-gray-200/50">
                    Net Amount
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {report.isLoading ? (
                  <tr>
                    <td colSpan={9} className="text-center py-12 text-gray-500">
                      Loading group wise sales data...
                    </td>
                  </tr>
                ) : report.rows.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-12 text-gray-400 font-medium">
                      No records found.
                    </td>
                  </tr>
                ) : (
                  report.rows.map((row: any, rIdx: number) => {
                    const qty = Number(row.qty ?? row.quantity ?? row.totalQty ?? 0);
                    return (
                      <tr
                        key={rIdx}
                        className="hover:bg-gray-50/70 transition-colors odd:bg-white even:bg-gray-50/20"
                      >
                        <td className="px-3 py-2 text-center text-gray-600 border-r border-gray-100/60 font-medium">
                          {rIdx + 1}
                        </td>
                        <td className="px-3 py-2 text-center text-gray-700 border-r border-gray-100/60 font-mono">
                          {String(row.groupCode || row.code || row.groupId || row.grpId || "-")}
                        </td>
                        <td className="px-3 py-2 text-left text-gray-900 border-r border-gray-100/60 font-medium truncate">
                          {String(row.groupName || row.name || row.group || "-")}
                        </td>
                        <td className="px-3 py-2 text-right text-gray-700 border-r border-gray-100/60 font-mono">
                          {qty}
                        </td>
                        <td className="px-3 py-2 text-right text-gray-700 border-r border-gray-100/60 font-mono">
                          {formatAmount(Number(row.amount || 0))}
                        </td>
                        <td className="px-3 py-2 text-right text-gray-700 border-r border-gray-100/60 font-mono">
                          {formatAmount(Number(row.discount || 0))}
                        </td>
                        <td className="px-3 py-2 text-right text-gray-700 border-r border-gray-100/60 font-mono">
                          {formatAmount(Number(row.netValue || 0))}
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
                    <td colSpan={2} className="px-3 py-2.5 text-center border-r border-gray-200/60 text-gray-700">
                      Total
                    </td>
                    <td className="px-3 py-2.5 border-r border-gray-200/60"></td>
                    <td className="px-3 py-2.5 text-right border-r border-gray-200/60 text-gray-800 font-mono">
                      {totals.qty}
                    </td>
                    <td className="px-3 py-2.5 text-right border-r border-gray-200/60 text-gray-800 font-mono">
                      {formatAmount(totals.amount)}
                    </td>
                    <td className="px-3 py-2.5 text-right border-r border-gray-200/60 text-gray-800 font-mono">
                      {formatAmount(totals.discount)}
                    </td>
                    <td className="px-3 py-2.5 text-right border-r border-gray-200/60 text-gray-800 font-mono">
                      {formatAmount(totals.netValue)}
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
          <div className="flex gap-6 font-semibold items-center">
            <div className="flex items-center gap-2">
              <span className="text-gray-400 text-[10px] uppercase font-medium">Total Qty:</span>
              <span className="text-gray-800 font-mono font-bold">{totals.qty}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-400 text-[10px] uppercase font-medium">Total Discount:</span>
              <span className="text-gray-800 font-mono font-bold">{formatAmount(totals.discount)}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-400 text-[10px] uppercase font-medium">Grand Total Net:</span>
              <span className="text-[#49293e] text-sm font-mono font-bold">
                {formatAmount(totals.netAmount)}
              </span>
            </div>
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

      <GroupWiseSalesReportPrintPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        onExportPDF={handleExportPDF}
        data={previewData}
      />
    </PageShell>
  );
};
export default GroupWiseSalesReportPage;
