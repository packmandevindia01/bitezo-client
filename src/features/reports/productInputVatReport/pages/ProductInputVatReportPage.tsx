import { useNavigate } from "react-router-dom";
import { useMemo, useState, useCallback } from "react";
import { Printer, X, Download } from "lucide-react";
import { useProductInputVatReport } from "../hooks/useProductInputVatReport";
import {
  exportProductInputVatReportPDF,
  exportProductInputVatReportExcel,
  getProductName,
  getProductCode,
  getVatPercent,
} from "../utils/exportUtils";
import { formatAmount } from "../../../../utils/currency";
import {
  PageShell,
  FormInput,
  Button,
  SearchableSelect,
  ResetButton,
} from "../../../../components/common";
import { ProductInputVatReportPrintPreviewModal } from "../components/ProductInputVatReportPrintPreviewModal";

export const ProductInputVatReportPage = () => {
  const navigate = useNavigate();
  const { filters, masterData, report } = useProductInputVatReport();
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const selectedBranchName = useMemo(() => {
    if (filters.branchId === "0") return "All";
    return (
      masterData.branches.find((b) => String(b.branchId) === filters.branchId)?.branchName ||
      filters.branchId
    );
  }, [filters.branchId, masterData.branches]);

  const selectedProductName = useMemo(() => {
    return (
      masterData.productOptions.find((p) => p.value === filters.productId)?.label || "All"
    );
  }, [filters.productId, masterData.productOptions]);

  const selectedVatName = useMemo(() => {
    return (
      masterData.vatOptions.find((v) => v.value === filters.vatId)?.label || "All"
    );
  }, [filters.vatId, masterData.vatOptions]);

  const totals = useMemo(() => {
    let sumValue = 0;
    let sumVatAmount = 0;
    let sumNetAmount = 0;

    report.rows.forEach((row) => {
      sumValue += Number(row.value ?? 0);
      sumVatAmount += Number(row.vatAmount ?? 0);
      sumNetAmount += Number(row.netAmount ?? 0);
    });

    return {
      value: report.totalData ? Number(report.totalData.value ?? sumValue) : sumValue,
      vatAmount: report.totalData
        ? Number(report.totalData.vatAmount ?? sumVatAmount)
        : sumVatAmount,
      netAmount: report.totalData
        ? Number(report.totalData.netAmount ?? sumNetAmount)
        : sumNetAmount,
    };
  }, [report.rows, report.totalData]);

  const handleExportPDF = useCallback(() => {
    exportProductInputVatReportPDF(report.rows, report.totalData, {
      branchName: selectedBranchName,
      productName: selectedProductName,
      vatName: selectedVatName,
      fromDate: filters.fromDate,
      toDate: filters.toDate,
    });
  }, [report, filters, selectedBranchName, selectedProductName, selectedVatName]);

  const handleExportExcel = useCallback(() => {
    exportProductInputVatReportExcel(report.rows, report.totalData, {
      branchName: selectedBranchName,
      productName: selectedProductName,
      vatName: selectedVatName,
      fromDate: filters.fromDate,
      toDate: filters.toDate,
    });
  }, [report, filters, selectedBranchName, selectedProductName, selectedVatName]);

  const previewData = useMemo(
    () => ({
      rows: report.rows,
      totalData: report.totalData,
      filters,
      branchName: selectedBranchName,
      productName: selectedProductName,
      vatName: selectedVatName,
      companyName: localStorage.getItem("companyName") || "FEKRA advertising",
      companyAddress:
        localStorage.getItem("companyAddress") ||
        "NEAR NESTO BESIDE BIN RASHIED SOUQ MABELA BUILDING NO 211 SECOND FLOOR FLAT NO 21",
    }),
    [report, filters, selectedBranchName, selectedProductName, selectedVatName]
  );

  return (
    <PageShell title="Product Input VAT Report">
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
                    id="pivr-branch"
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

            {/* 2. Product & VAT */}
            <div className="pt-3 xl:pt-0 xl:px-4 flex flex-col sm:flex-row gap-4 shrink-0 justify-start">
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-gray-500 w-14 text-left shrink-0 font-medium">
                  Product
                </span>
                <div className="w-52">
                  <SearchableSelect
                    id="pivr-product"
                    options={masterData.productOptions}
                    value={filters.productId}
                    onChange={filters.setProductId}
                    placeholder="All"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] text-gray-500 w-8 text-left shrink-0 font-medium">
                  VAT
                </span>
                <div className="w-36">
                  <SearchableSelect
                    id="pivr-vat"
                    options={masterData.vatOptions}
                    value={filters.vatId}
                    onChange={filters.setVatId}
                    placeholder="All"
                  />
                </div>
              </div>
            </div>

            {/* 3. Dates */}
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
                  <th className="px-3 py-2.5 font-bold text-gray-600 text-[11px] text-center w-[14%] border-r border-gray-200/60">
                    Product Code
                  </th>
                  <th className="px-3 py-2.5 font-bold text-gray-600 text-[11px] text-left w-[26%] border-r border-gray-200/60">
                    Product Name
                  </th>
                  <th className="px-3 py-2.5 font-bold text-gray-600 text-[11px] text-center w-[10%] border-r border-gray-200/60">
                    VAT %
                  </th>
                  <th className="px-3 py-2.5 font-bold text-gray-600 text-[11px] text-right w-[14%] border-r border-gray-200/60">
                    Value
                  </th>
                  <th className="px-3 py-2.5 font-bold text-gray-600 text-[11px] text-right w-[14%] border-r border-gray-200/60">
                    VAT Amount
                  </th>
                  <th className="px-3 py-2.5 font-bold text-[#49293e] text-[11px] text-right w-[16%] bg-gray-200/50">
                    Net Amount
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {report.isLoading ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-gray-500">
                      Loading product input VAT data...
                    </td>
                  </tr>
                ) : report.rows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-gray-400 font-medium">
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
                          {getProductCode(row)}
                        </td>
                        <td className="px-3 py-2 text-left text-gray-900 border-r border-gray-100/60 font-medium truncate">
                          {getProductName(row)}
                        </td>
                        <td className="px-3 py-2 text-center text-gray-700 border-r border-gray-100/60 font-mono">
                          {getVatPercent(row)}
                        </td>
                        <td className="px-3 py-2 text-right text-gray-700 border-r border-gray-100/60 font-mono">
                          {formatAmount(Number(row.value || 0))}
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
                      colSpan={2}
                      className="px-3 py-2.5 text-center border-r border-gray-200/60 text-gray-700"
                    >
                      Total
                    </td>
                    <td className="px-3 py-2.5 border-r border-gray-200/60"></td>
                    <td className="px-3 py-2.5 border-r border-gray-200/60"></td>
                    <td className="px-3 py-2.5 text-right border-r border-gray-200/60 text-gray-800 font-mono">
                      {formatAmount(totals.value)}
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
              <span className="text-gray-400 text-[10px] uppercase font-medium">Total Value:</span>
              <span className="text-gray-800 font-mono font-bold">
                {formatAmount(totals.value)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-400 text-[10px] uppercase font-medium">
                Total VAT Amount:
              </span>
              <span className="text-gray-800 font-mono font-bold">
                {formatAmount(totals.vatAmount)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-400 text-[10px] uppercase font-medium">
                Grand Total Net:
              </span>
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

      <ProductInputVatReportPrintPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        onExportPDF={handleExportPDF}
        data={previewData}
      />
    </PageShell>
  );
};

export default ProductInputVatReportPage;
