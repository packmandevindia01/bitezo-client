import { useNavigate } from "react-router-dom";
import { useMemo, useState, useCallback } from "react";
import { Printer, X, Download } from "lucide-react";
import { useCustomerBalance } from "../hooks/useCustomerBalance";
import { exportCustomerBalancePDF, exportCustomerBalanceExcel } from "../utils/customerBalanceExportUtils";
import { formatAmount } from "../../../../utils/currency";
import {
  PageShell,
  FormInput,
  Button,
  SearchableSelect,
  ResetButton,
} from "../../../../components/common";
import { CustomerBalancePrintPreviewModal } from "../components/CustomerBalancePrintPreviewModal";

const COLS = [
  { key: "sno",     label: "SNo",           cls: "w-[5%] text-center" },
  { key: "code",    label: "Code",          cls: "w-[12%] text-center" },
  { key: "name",    label: "Customer Name", cls: "w-[29%] text-left" },
  { key: "opening", label: "Opening",       cls: "w-[13%] text-right" },
  { key: "issued",  label: "Issued",        cls: "w-[13%] text-right" },
  { key: "paid",    label: "Paid",          cls: "w-[13%] text-right" },
  { key: "balance", label: "Balance",       cls: "w-[15%] text-right" },
];

const CustomerBalancePage = () => {
  const navigate = useNavigate();
  const { filters, masterData, report } = useCustomerBalance();
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const handleReset = () => {
    filters.resetFilters();
  };

  const branchOptions = useMemo(() => {
    return (masterData.branches as any[]).map((b: any) => ({
      label: b.branchName,
      value: String(b.branchId),
    }));
  }, [masterData.branches]);

  const customerOptions = useMemo(() => [
    { label: "All", value: "0" },
    ...(masterData.customers as any[]).map((c: any) => ({
      label: c.code ? `[${c.code}] ${c.customerName}` : c.customerName,
      value: String(c.customerId),
    })),
  ], [masterData.customers]);

  const summaryData = report.summaryData;

  const handleExportPDF = useCallback(() => {
    exportCustomerBalancePDF(summaryData, filters);
  }, [filters, summaryData]);

  const handleExportExcel = useCallback(() => {
    exportCustomerBalanceExcel(summaryData, filters);
  }, [filters, summaryData]);

  const totalOpening = useMemo(() => summaryData.reduce((s, r) => s + Number(r.opening || 0), 0), [summaryData]);
  const totalIssued = useMemo(() => summaryData.reduce((s, r) => s + Number(r.issued || 0), 0), [summaryData]);
  const totalPaid = useMemo(() => summaryData.reduce((s, r) => s + Number(r.paid || 0), 0), [summaryData]);
  const totalBalance = useMemo(() => {
    if (report.totalData?.total !== undefined && report.totalData?.total !== null) {
      return Number(report.totalData.total);
    }
    return summaryData.reduce((s, r) => s + Number(r.balance || 0), 0);
  }, [report.totalData, summaryData]);

  const previewData = useMemo(() => ({
    summaryData,
    totalOpening,
    totalIssued,
    totalPaid,
    totalBalance,
    filters,
    companyName: localStorage.getItem("companyName") || "FEKRA advertising",
    companyAddress: localStorage.getItem("companyAddress") || "NEAR NESTO BESIDE BIN RASHIED SOUQ MABELA BUILDING NO 211 SECOND FLOOR FLAT NO 21",
  }), [summaryData, totalOpening, totalIssued, totalPaid, totalBalance, filters]);

  return (
    <PageShell title="Customer Balance">
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
            onReset={handleReset}
            className="absolute top-1/2 -translate-y-1/2 right-12 !bg-blue-600 !border-blue-600 hover:!bg-blue-700 !text-white"
          />

          <div className="px-4 py-3 flex flex-col xl:flex-row gap-3.5 divide-y xl:divide-y-0 xl:divide-x divide-gray-200">

            {/* 1. Location */}
            <div className="pb-3 xl:pb-0 xl:pr-4 flex flex-col gap-2 shrink-0 justify-start">
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-gray-500 w-16 text-left shrink-0">Location</span>
                <div className="w-40">
                  <SearchableSelect
                    id="cb-branch"
                    options={branchOptions}
                    value={filters.branchId}
                    onChange={filters.setBranchId}
                    disabled={filters.isBranchLocked}
                    placeholder="All"
                    autoFocus={true}
                  />
                </div>
              </div>
            </div>

            {/* 2. Customer */}
            <div className="pb-3 xl:pb-0 xl:pr-4 flex flex-col gap-2 shrink-0 justify-start">
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-gray-500 w-16 text-left shrink-0">Customer</span>
                <div className="w-52">
                  <SearchableSelect
                    id="cb-customer"
                    options={customerOptions}
                    value={filters.customerId}
                    onChange={filters.setCustomerId}
                    placeholder="All"
                  />
                </div>
              </div>
            </div>

            {/* 3. Dates */}
            <div className="pt-3 xl:pt-0 xl:px-3 flex flex-row items-center gap-4 shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-gray-500 w-8 text-left shrink-0">From</span>
                <div className="w-36">
                  <FormInput
                    id="cb-from-date"
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
                    id="cb-to-date"
                    type="date"
                    value={filters.toDate}
                    onChange={(e) => filters.setToDate(e.target.value)}
                  />
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* ── Table Card ──────────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col flex-1 min-h-0">
          {!report.isLoading && summaryData.length > 0 && (
            <p className="text-center text-[11px] font-semibold text-[#49293e] py-1.5 border-b border-gray-100 shrink-0">
              Customer Balance Report from {filters.fromDate} To {filters.toDate}
            </p>
          )}

          <div className="overflow-x-auto overflow-y-auto flex-1 min-h-0">
            <table className="w-full text-xs min-w-[750px] table-layout-fixed">
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
                      {COLS.map((col) => (
                        <td key={col.key} className="px-2 py-2">
                          <div className="h-3 bg-gray-100 rounded" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : summaryData.length === 0 ? (
                  <tr>
                    <td colSpan={COLS.length} className="text-center py-20 text-gray-400 text-sm">
                      No records found. Adjust filters.
                    </td>
                  </tr>
                ) : (
                  summaryData.map((row: any, idx: number) => (
                    <tr
                      key={row.customerId ?? row.code ?? idx}
                      className={`hover:bg-[#49293e]/5 transition-colors ${idx % 2 === 0 ? "bg-white" : "bg-gray-50/60"}`}
                    >
                      <td className="px-2 py-1.5 text-center text-gray-500 border-r border-gray-100">{idx + 1}</td>
                      <td className="px-2 py-1.5 text-center font-mono text-gray-800 border-r border-gray-100">{row.code || ""}</td>
                      <td className="px-2 py-1.5 text-left text-gray-800 border-r border-gray-100">{row.name || ""}</td>
                      <td className="px-2 py-1.5 text-right tabular-nums text-gray-800 border-r border-gray-100">
                        {formatAmount(Number(row.opening || 0))}
                      </td>
                      <td className="px-2 py-1.5 text-right tabular-nums text-gray-800 border-r border-gray-100">
                        {formatAmount(Number(row.issued || 0))}
                      </td>
                      <td className="px-2 py-1.5 text-right tabular-nums text-gray-800 border-r border-gray-100">
                        {formatAmount(Number(row.paid || 0))}
                      </td>
                      <td className="px-2 py-1.5 text-right tabular-nums font-semibold text-[#49293e]">
                        {formatAmount(Number(row.balance || 0))}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>

              {!report.isLoading && summaryData.length > 0 && (
                <tfoot className="sticky bottom-0 z-10 bg-gray-100 border-t-2 border-t-[#49293e]/20 shadow-[0_-1px_0_rgba(0,0,0,0.05)]">
                  <tr>
                    <td className="py-1.5 border-r border-gray-200 text-center" />
                    <td className="border-r border-gray-200 text-center" />
                    <td className="px-2 py-1.5 text-right font-bold tabular-nums text-gray-900 border-r border-gray-200">
                      Total
                    </td>
                    <td className="px-2 py-1.5 text-right font-bold tabular-nums text-gray-900 border-r border-gray-200">
                      {formatAmount(totalOpening)}
                    </td>
                    <td className="px-2 py-1.5 text-right font-bold tabular-nums text-gray-900 border-r border-gray-200">
                      {formatAmount(totalIssued)}
                    </td>
                    <td className="px-2 py-1.5 text-right font-bold tabular-nums text-gray-900 border-r border-gray-200">
                      {formatAmount(totalPaid)}
                    </td>
                    <td className="px-2 py-1.5 text-right font-bold tabular-nums text-[#49293e] text-sm">
                      {formatAmount(totalBalance)}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

        {/* ── Sticky Bottom Summary / Actions Bar ─────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-4 py-2 shrink-0 flex items-center justify-between">
          <div className="flex items-center gap-5 text-xs font-medium text-gray-600">
            {/* Totals already cleanly shown in sticky tfoot */}
          </div>

          <div className="flex items-center gap-3">
            {summaryData.length > 0 && (
              <span className="text-xs text-gray-400">
                {summaryData.length} record{summaryData.length !== 1 ? "s" : ""}
              </span>
            )}
            <div className="h-4 w-px bg-gray-200" />
            <Button
              size="sm"
              icon={<Printer size={15} />}
              onClick={() => setIsPreviewOpen(true)}
              disabled={report.isLoading || summaryData.length === 0}
            >
              Print Preview
            </Button>
            <Button
              size="sm"
              onClick={handleExportExcel}
              disabled={report.isLoading || summaryData.length === 0}
              icon={<Download size={15} />}
              className="!bg-green-600 !border-green-600 hover:!bg-green-700 !text-white"
            >
              XLS
            </Button>
          </div>
        </div>

        <CustomerBalancePrintPreviewModal
          isOpen={isPreviewOpen}
          onClose={() => setIsPreviewOpen(false)}
          data={previewData}
          onExportPDF={handleExportPDF}
        />

      </div>
    </PageShell>
  );
};

export default CustomerBalancePage;
