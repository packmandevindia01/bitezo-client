import { useNavigate } from "react-router-dom";
import { useMemo, useState, useCallback } from "react";
import { Printer, X, Download } from "lucide-react";
import { useSupplierStatement } from "../hooks/useSupplierStatement";
import { exportSupplierStatementPDF, exportSupplierStatementExcel } from "../utils/supplierStatementExportUtils";
import { formatAmount } from "../../../../utils/currency";
import {
  PageShell,
  FormInput,
  Button,
  SearchableSelect,
  ResetButton
} from "../../../../components/common";
import { SupplierStatementPrintPreviewModal } from "../components/SupplierStatementPrintPreviewModal";

const COLS = [
  { key: "sno",           label: "SNo",            cls: "w-[5%] text-center" },
  { key: "invoiceDate",   label: "Date",           cls: "w-[15%] text-left" },
  { key: "invoiceNo",     label: "Invoice No",     cls: "w-[15%] text-left" },
  { key: "voucherType",   label: "Voucher Type",   cls: "w-[25%] text-left" },
  { key: "invoiceAmount", label: "Invoice Amount", cls: "w-[20%] text-right" },
  { key: "balance",       label: "Balance",        cls: "w-[20%] text-right" },
];

const formatDate = (dateStr: string) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const dd   = String(d.getDate()).padStart(2, "0");
  const mm   = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

const SupplierStatementPage = () => {
  const navigate = useNavigate();
  const { filters, masterData, report } = useSupplierStatement();
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const handleReset = () => {
    filters.resetFilters();
  };

  const branchOptions = useMemo(() => {
    return masterData.branches.map((b: any) => ({
      label: b.branchName,
      value: String(b.branchId)
    }));
  }, [masterData.branches]);

  const supplierOptions = useMemo(() => [
    { label: "All", value: "0" },
    ...masterData.suppliers.map((s: any) => ({
      label: s.code ? `[${s.code}] ${s.supplierName}` : s.supplierName,
      value: String(s.supplierId)
    })),
  ], [masterData.suppliers]);

  const statementData = report.statementData;

  const handleExportPDF = useCallback(() => {
    exportSupplierStatementPDF(statementData, filters);
  }, [filters, statementData]);

  const handleExportExcel = useCallback(() => {
    exportSupplierStatementExcel(statementData, filters);
  }, [filters, statementData]);

  const totalInvoiceAmount = useMemo(() => statementData.reduce((s: number, r: any) => s + Number(r.invoiceAmount || 0), 0), [statementData]);
  const totalBalance = useMemo(() => statementData.reduce((s: number, r: any) => s + Number(r.balance || 0), 0), [statementData]);

  const previewData = useMemo(() => ({
    statementData,
    totalInvoiceAmount,
    totalBalance,
    filters,
    companyName: localStorage.getItem("companyName") || "FEKRA advertising",
    companyAddress: localStorage.getItem("companyAddress") || "NEAR NESTO BESIDE BIN RASHIED SOUQ MABELA BUILDING NO 211 SECOND FLOOR FLAT NO 21",
  }), [statementData, totalInvoiceAmount, totalBalance, filters]);

  return (
    <PageShell title="Supplier Statement">
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
            onReset={handleReset}
            className="absolute bottom-3 right-3"
          />

          <div className="px-4 py-3 flex flex-col xl:flex-row gap-3.5 divide-y xl:divide-y-0 xl:divide-x divide-gray-200">

            {/* 1. Location */}
            <div className="pb-3 xl:pb-0 xl:pr-4 flex flex-col gap-2 shrink-0 justify-start">
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-gray-500 w-16 text-left shrink-0">Location</span>
                <div className="w-40">
                  <SearchableSelect id="ss-branch" options={branchOptions} value={filters.branchId} onChange={filters.setBranchId} disabled={filters.isBranchLocked} placeholder="All" autoFocus={true} />
                </div>
              </div>
            </div>

            {/* 2. Supplier */}
            <div className="pb-3 xl:pb-0 xl:pr-4 flex flex-col gap-2 shrink-0 justify-start">
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-gray-500 w-16 text-left shrink-0">Supplier</span>
                <div className="w-44">
                  <SearchableSelect id="ss-supplier" options={supplierOptions} value={filters.supplierId} onChange={filters.setSupplierId} placeholder="All" />
                </div>
              </div>
            </div>

            {/* 3. Dates */}
            <div className="pt-3 xl:pt-0 xl:px-3 flex flex-row items-center gap-4 shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-gray-500 w-8 text-left shrink-0">From</span>
                <div className="w-36">
                  <FormInput id="ss-from-date" type="date" value={filters.fromDate} onChange={(e) => filters.setFromDate(e.target.value)} />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-gray-500 w-5 text-left shrink-0">To</span>
                <div className="w-36">
                  <FormInput id="ss-to-date" type="date" value={filters.toDate} onChange={(e) => filters.setToDate(e.target.value)} />
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* ── Table Card ──────────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col flex-1 min-h-0">
          {!report.isLoading && statementData.length > 0 && (
            <p className="text-center text-[11px] font-semibold text-[#49293e] py-1.5 border-b border-gray-100 shrink-0">
              Supplier Statement from {filters.fromDate} To {filters.toDate}
            </p>
          )}

          <div className="overflow-x-auto overflow-y-auto flex-1 min-h-0">
            <table className="w-full text-xs min-w-[700px] table-layout-fixed">
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
                ) : statementData.length === 0 ? (
                  <tr>
                    <td colSpan={COLS.length} className="text-center py-20 text-gray-400 text-sm">
                      No records found. Adjust filters.
                    </td>
                  </tr>
                ) : (
                  statementData.map((row: any, idx: number) => (
                    <tr
                      key={row.invoiceId ?? idx}
                      className={`hover:bg-[#49293e]/5 transition-colors ${idx % 2 === 0 ? "bg-white" : "bg-gray-50/60"}`}
                    >
                      <td className="px-2 py-1.5 text-center text-gray-500 border-r border-gray-100">{idx + 1}</td>
                      <td className="px-2 py-1.5 text-left text-gray-800 border-r border-gray-100 tabular-nums whitespace-nowrap">
                        {row.invoiceDate ? formatDate(row.invoiceDate) : ""}
                      </td>
                      <td className="px-2 py-1.5 text-left font-mono text-gray-800 border-r border-gray-100">{row.invoiceNo}</td>
                      <td className="px-2 py-1.5 text-left text-gray-800 border-r border-gray-100">{row.voucherType || ""}</td>
                      <td className="px-2 py-1.5 text-right tabular-nums text-gray-800 border-r border-gray-100">{formatAmount(Number(row.invoiceAmount || 0))}</td>
                      <td className="px-2 py-1.5 text-right tabular-nums font-semibold text-[#49293e]">{formatAmount(Number(row.balance || 0))}</td>
                    </tr>
                  ))
                )}
              </tbody>

              {!report.isLoading && statementData.length > 0 && (
                <tfoot className="sticky bottom-0 z-10 bg-gray-100 border-t-2 border-t-[#49293e]/20 shadow-[0_-1px_0_rgba(0,0,0,0.05)]">
                  <tr>
                    <td className="py-1.5 border-r border-gray-200" />
                    <td className="border-r border-gray-200" />
                    <td className="border-r border-gray-200" />
                    <td className="px-2 py-1.5 text-right font-bold tabular-nums text-gray-900 border-r border-gray-200">
                      Total
                    </td>
                    <td className="px-2 py-1.5 text-right font-bold tabular-nums text-gray-900 border-r border-gray-200">{formatAmount(totalInvoiceAmount)}</td>
                    <td className="px-2 py-1.5 text-right font-bold tabular-nums text-[#49293e] text-sm">{formatAmount(totalBalance)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

        {/* ── Sticky Bottom Summary / Actions Bar ─────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-4 py-2 shrink-0 flex items-center justify-between">
          <div className="flex items-center gap-5 text-xs font-medium text-gray-600">
             {/* No Extra Bottom Totals needed here since we put it in tfoot */}
          </div>

          <div className="flex items-center gap-3">
            {statementData.length > 0 && (
              <span className="text-xs text-gray-400">
                {statementData.length} record{statementData.length !== 1 ? "s" : ""}
              </span>
            )}
            <div className="h-4 w-px bg-gray-200" />
            <Button
              size="sm"
              icon={<Printer size={15} />}
              onClick={() => setIsPreviewOpen(true)}
              disabled={report.isLoading || statementData.length === 0}
            >
              Print Preview
            </Button>
            <Button
              size="sm"
              onClick={handleExportExcel}
              disabled={report.isLoading || statementData.length === 0}
              icon={<Download size={15} />}
              className="!bg-green-600 !border-green-600 hover:!bg-green-700 !text-white"
            >
              XLS
            </Button>
          </div>
        </div>

        <SupplierStatementPrintPreviewModal
          isOpen={isPreviewOpen}
          onClose={() => setIsPreviewOpen(false)}
          data={previewData}
          onExportPDF={handleExportPDF}
        />

      </div>
    </PageShell>
  );
};

export default SupplierStatementPage;
