import { useNavigate } from "react-router-dom";
import { useMemo, useState, useCallback } from "react";
import { Printer, X, Download } from "lucide-react";
import { useProductTransactionLogReport } from "../hooks/useProductTransactionLogReport";
import {
  exportProductTransactionLogReportPDF,
  exportProductTransactionLogReportExcel,
} from "../utils/productTransactionLogExportUtils";

import {
  PageShell,
  FormInput,
  Button,
  SearchableSelect,
  ResetButton,
} from "../../../../components/common";
import { ProductTransactionLogPrintPreviewModal } from "../components/ProductTransactionLogPrintPreviewModal";

const COLS = [
  { key: "sNo",         label: "SNo",           cls: "w-[5%]  text-center" },
  { key: "branch",      label: "Branch",        cls: "w-[12%] text-center" },
  { key: "transaction", label: "Transaction",   cls: "w-[18%] text-left"   },
  { key: "voucherNo",   label: "Voucher No",    cls: "w-[12%] text-center" },
  { key: "account",     label: "Account",       cls: "w-[18%] text-left"   },
  { key: "qtyIn",       label: "Qty In",        cls: "w-[10%] text-right"  },
  { key: "qtyOut",      label: "Qty Out",       cls: "w-[10%] text-right"  },
  { key: "balance",     label: "Balance",       cls: "w-[15%] text-right"  },
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

export const ProductTransactionLogReportPage = () => {
  const navigate = useNavigate();
  const { filters, masterData, report } = useProductTransactionLogReport();
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const branchOptions = useMemo(
    () => masterData.branches.map((b) => ({ label: b.branchName, value: String(b.branchId) })),
    [masterData.branches]
  );

  const productOptions = useMemo(
    () =>
      masterData.products.map((p) => ({
        label: p.code ? `[${p.code}] ${p.productName}` : p.productName,
        value: String(p.productId),
      })),
    [masterData.products]
  );

  const transactionTypeOptions = useMemo(() => [
    { label: "All", value: "All" },
    { label: "Purchase", value: "Purchase" },
    { label: "Purchase Return", value: "Purchase Return" },
    { label: "Sales", value: "Sales" },
    { label: "Sales Return", value: "Sales Return" },
    { label: "Stock Adjustment", value: "Stock Adjustment" },
    { label: "Stock Transfer", value: "Stock Transfer" },
    { label: "Production", value: "Production" },
    { label: "Raw Material", value: "Raw Material" },
  ], []);

  const handleExportPDF = useCallback(() => {
    exportProductTransactionLogReportPDF(report.logData, report.totalData, filters);
  }, [report, filters]);

  const handleExportExcel = useCallback(() => {
    exportProductTransactionLogReportExcel(report.logData, report.totalData, filters);
  }, [report, filters]);

  const previewData = useMemo(
    () => ({
      logData: report.logData,
      totalData: report.totalData,
      filters,
      companyName: localStorage.getItem("companyName") || "Company",
      companyAddress: localStorage.getItem("companyAddress") || "",
    }),
    [report, filters]
  );

  return (
    <PageShell title="Product Transaction Log">
      <div className="flex flex-col h-auto md:h-[calc(100vh-92px)] md:overflow-hidden p-1 gap-3 relative">

        {/* ── Filter Panel ───────────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm shrink-0 relative pr-12">
          <button
            onClick={() => navigate("/dashboard/reports")}
            className="absolute top-4 right-3 p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
            title="Close"
          >
            <X size={18} />
          </button>

          <div className="p-4">
            <div className="flex flex-wrap gap-3 items-end">
              <div className="w-36">
                <FormInput label="From Date" type="date" value={filters.fromDate} onChange={(e) => filters.setFromDate(e.target.value)} autoFocus />
              </div>
              <div className="w-36">
                <FormInput label="To Date" type="date" value={filters.toDate} onChange={(e) => filters.setToDate(e.target.value)} />
              </div>
              <div className="w-44">
                <SearchableSelect label="Branch" options={branchOptions} value={filters.branchId} onChange={filters.setBranchId} disabled={filters.isBranchLocked} placeholder="Select Branch" />
              </div>
              <div className="w-44">
                <SearchableSelect label="Transaction Type" options={transactionTypeOptions} value={filters.transactionType} onChange={filters.setTransactionType} placeholder="Select Type" />
              </div>
              <div className="w-64">
                <SearchableSelect label="Product *" options={productOptions} value={filters.productId} onChange={filters.setProductId} placeholder="Select Product" />
              </div>
            </div>
          </div>
          <ResetButton onReset={filters.resetFilters} className="absolute bottom-3 right-3" />
        </div>

        {/* ── Table Card ──────────────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col flex-1 min-h-0">
          
          {/* Report Caption */}
          {!report.isLoading && filters.productId !== "" && report.logData.length > 0 && (
            <p className="text-center text-[11px] font-semibold text-[#49293e] py-1.5 border-b border-gray-100 shrink-0">
              Product Transaction Log from {formatDate(filters.fromDate)} To {formatDate(filters.toDate)}
            </p>
          )}

          <div className="overflow-x-auto overflow-y-auto flex-1 min-h-0">
            {filters.productId === "" && !report.isLoading ? (
              <div className="flex flex-col items-center justify-center h-40 text-gray-400 gap-2">
                <span className="text-sm">Please select a product to load the transaction log.</span>
              </div>
            ) : (
              <table className="w-full text-xs min-w-[900px] table-layout-fixed">
                <thead className="sticky top-0 z-10 bg-gray-100 shadow-[0_1px_0_rgba(0,0,0,0.05)]">
                  <tr>
                    {COLS.map((col) => (
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
                  ) : report.logData.length === 0 ? (
                    <tr>
                      <td colSpan={COLS.length} className="text-center py-20 text-gray-400 text-sm">
                        No transaction records found matching filters.
                      </td>
                    </tr>
                  ) : (
                    report.logData.map((row: any, idx: number) => (
                      <tr
                        key={idx}
                        className={`hover:bg-[#49293e]/5 transition-colors ${idx % 2 === 0 ? "bg-white" : "bg-gray-50/60"}`}
                      >
                        <td className={`px-2 py-1.5 text-center text-gray-500 border-r border-gray-100 ${COLS[0].cls}`}>{row.sNo}</td>
                        <td className={`px-2 py-1.5 text-center text-gray-800 border-r border-gray-100 ${COLS[1].cls}`}>{row.branch}</td>
                        <td className={`px-2 py-1.5 text-left font-medium text-gray-800 border-r border-gray-100 ${COLS[2].cls}`}>{row.transaction}</td>
                        <td className={`px-2 py-1.5 text-center font-mono text-gray-800 border-r border-gray-100 ${COLS[3].cls}`}>{row.voucherNo}</td>
                        <td className={`px-2 py-1.5 text-left text-gray-700 border-r border-gray-100 uppercase ${COLS[4].cls}`}>{row.account || "—"}</td>
                        <td className={`px-2 py-1.5 text-right font-medium text-gray-800 border-r border-gray-100 ${COLS[5].cls}`}>{row.qtyIn || "—"}</td>
                        <td className={`px-2 py-1.5 text-right font-medium text-gray-800 border-r border-gray-100 ${COLS[6].cls}`}>{row.qtyOut || "—"}</td>
                        <td className={`px-2 py-1.5 text-right font-semibold text-[#49293e] border-r border-gray-100 ${COLS[7].cls}`}>{row.balance}</td>
                      </tr>
                    ))
                  )}
                </tbody>

                {/* Footer Totals */}
                {!report.isLoading && report.logData.length > 0 && (
                  <tfoot className="sticky bottom-0 z-10 bg-gray-100 border-t-2 border-t-[#49293e]/20 shadow-[0_-1px_0_rgba(0,0,0,0.05)]">
                    <tr>
                      <td colSpan={5} className="px-4 py-2 text-left font-semibold text-gray-700 border-r border-gray-200">
                        <div className="flex gap-6">
                          <span><span className="text-gray-500 font-normal">Opening:</span> {report.totalData.opening}</span>
                          <span><span className="text-gray-500 font-normal">Received:</span> {report.totalData.received}</span>
                          <span><span className="text-gray-500 font-normal">Issued:</span> {report.totalData.issued}</span>
                        </div>
                      </td>
                      <td colSpan={3} className="px-4 py-2 text-right font-bold text-[#49293e] text-sm">
                        <span className="text-gray-500 font-semibold text-xs mr-2">Closing Balance:</span> {report.totalData.balance}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            )}
          </div>
        </div>

        {/* ── Sticky Bottom Summary / Actions Bar ────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-4 py-2 shrink-0 flex items-center justify-between">
          <div className="flex items-center gap-5 text-xs font-medium text-gray-600">
            <span className="text-gray-400 font-semibold uppercase tracking-wider text-[10px]">
              {masterData.products.find(p => p.productId === Number(filters.productId))?.productName || "Product Transaction Log"}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {report.logData.length > 0 && (
              <span className="text-xs text-gray-400">
                {report.logData.length} record{report.logData.length !== 1 ? "s" : ""}
              </span>
            )}
            <div className="h-4 w-px bg-gray-200" />
            <Button
              size="sm"
              icon={<Printer size={15} />}
              onClick={() => setIsPreviewOpen(true)}
              disabled={report.isLoading || report.logData.length === 0}
              variant="secondary"
            >
              Print Preview
            </Button>
            <Button
              size="sm"
              onClick={handleExportExcel}
              disabled={report.isLoading || report.logData.length === 0}
              icon={<Download size={15} />}
              className="!bg-green-600 !border-green-600 hover:!bg-green-700 !text-white"
            >
              XLS
            </Button>
          </div>
        </div>
      </div>

      <ProductTransactionLogPrintPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        onExportPDF={handleExportPDF}
        data={previewData}
      />
    </PageShell>
  );
};

export default ProductTransactionLogReportPage;
