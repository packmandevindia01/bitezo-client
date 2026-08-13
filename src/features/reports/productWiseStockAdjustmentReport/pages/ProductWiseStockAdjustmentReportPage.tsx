import { useNavigate } from "react-router-dom";
import { useMemo, useState, useCallback } from "react";
import { Printer, X, Download } from "lucide-react";
import {
  useProductWiseStockAdjustmentReport,
  EFFECT_OPTIONS,
} from "../hooks/useProductWiseStockAdjustmentReport";
import {
  exportProductWiseStockAdjustmentPDF,
  exportProductWiseStockAdjustmentExcel,
} from "../utils/exportUtils";
import { formatAmount } from "../../../../utils/currency";
import {
  PageShell,
  FormInput,
  Button,
  SelectInput,
  SearchableSelect,
  SearchBar,
  ResetButton,
} from "../../../../components/common";
import { ProductWiseStockAdjustmentPrintPreviewModal } from "../components/ProductWiseStockAdjustmentPrintPreviewModal";

// ─── Column Definitions ───────────────────────────────────────────────────────
const COLS = [
  { key: "sno",       label: "SNo",        cls: "w-[3%] text-center" },
  { key: "date",      label: "Date",        cls: "w-[10%] text-center" },
  { key: "refNo",     label: "Ref No",      cls: "w-[7%] text-center" },
  { key: "code",      label: "Code",        cls: "w-[7%] text-center" },
  { key: "product",   label: "Product",     cls: "w-[22%] text-left" },
  { key: "qty",       label: "Qty",         cls: "w-[6%] text-right" },
  { key: "unit",      label: "Unit",        cls: "w-[6%] text-center" },
  { key: "price",     label: "Price",       cls: "w-[10%] text-right" },
  { key: "netAmount", label: "Net Amount",  cls: "w-[11%] text-right" },
  { key: "type",      label: "Type",        cls: "w-[10%] text-center" },
  { key: "effect",    label: "Effect",      cls: "w-[8%] text-center" },
];

const formatDate = (dateStr: string): string => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

const ProductWiseStockAdjustmentReportPage = () => {
  const navigate = useNavigate();
  const { filters, masterData, report } = useProductWiseStockAdjustmentReport();
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // ── Dropdown option arrays ─────────────────────────────────────────────────
  const branchOptions = useMemo(
    () =>
      masterData.branches.map((b) => ({
        label: b.branchName,
        value: String(b.branchId),
      })),
    [masterData.branches]
  );

  const productOptions = useMemo(
    () => [
      { label: "All Products", value: "0" },
      ...masterData.products.map((p: any) => ({
        label: p.code ? `[${p.code}] ${p.productName}` : p.productName,
        value: String(p.productId),
      })),
    ],
    [masterData.products]
  );

  const typeOptions = useMemo(
    () => [
      { label: "All Types", value: "0" },
      ...masterData.adjustmentTypes.map((t) => ({
        label: t.typeName,
        value: String(t.typeId),
      })),
    ],
    [masterData.adjustmentTypes]
  );

  // ── Export handlers ────────────────────────────────────────────────────────
  const handleExportPDF = useCallback(() => {
    exportProductWiseStockAdjustmentPDF(report.rows, report.grandTotals, filters);
  }, [report.rows, report.grandTotals, filters]);

  const handleExportExcel = useCallback(() => {
    exportProductWiseStockAdjustmentExcel(report.rows, report.grandTotals, filters);
  }, [report.rows, report.grandTotals, filters]);

  // ── Print preview data ─────────────────────────────────────────────────────
  const previewData = useMemo(
    () => ({
      rows: report.rows,
      grandTotals: report.grandTotals,
      filters,
      companyName: localStorage.getItem("companyName") || "Company Name",
      companyAddress: localStorage.getItem("companyAddress") || "",
    }),
    [report.rows, report.grandTotals, filters]
  );

  return (
    <PageShell title="Product Wise Stock Adjustment Report">
      <div className="flex flex-col h-auto md:h-[calc(100vh-92px)] md:overflow-hidden p-1 gap-3 relative">

        {/* ── Filter Panel ────────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm shrink-0 relative pr-12">

          {/* Close X */}
          <button
            onClick={() => navigate("/dashboard")}
            className="absolute top-3 right-3 p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors z-30"
            title="Close"
          >
            <X size={18} />
          </button>

          {/* Reset */}
          <ResetButton
            onReset={filters.resetFilters}
            className="absolute bottom-3 right-3"
          />

          <div className="px-4 py-3 flex flex-col xl:flex-row gap-3.5 divide-y xl:divide-y-0 xl:divide-x divide-gray-200">

            {/* 1. Branch + Product */}
            <div className="shrink-0 flex flex-col gap-2 pr-4 justify-start">
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-gray-500 w-16 text-left shrink-0">Location</span>
                <div className="w-44">
                  <SearchableSelect
                    id="pwsa-branch"
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
                <span className="text-[11px] text-gray-500 w-16 text-left shrink-0">Product</span>
                <div className="w-64">
                  <SearchableSelect
                    id="pwsa-product"
                    options={productOptions}
                    value={filters.productId}
                    onChange={filters.setProductId}
                    placeholder="All Products"
                  />
                </div>
              </div>
            </div>

            {/* 2. Type + Effect */}
            <div className="pt-3 xl:pt-0 xl:px-3 flex flex-col gap-2 shrink-0 justify-start">
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-gray-500 w-12 text-left shrink-0">Type</span>
                <div className="w-48">
                  <SelectInput
                    id="pwsa-type"
                    options={typeOptions}
                    value={filters.typeId}
                    onChange={(e) => filters.setTypeId(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-gray-500 w-12 text-left shrink-0">Effect</span>
                <div className="w-48">
                  <SelectInput
                    id="pwsa-effect"
                    options={EFFECT_OPTIONS}
                    value={filters.effect}
                    onChange={(e) => filters.setEffect(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* 3. Date range */}
            <div className="pt-3 xl:pt-0 xl:px-3 flex flex-col gap-2 shrink-0 justify-start">
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-gray-500 w-8 text-left shrink-0">From</span>
                <div className="w-36">
                  <FormInput
                    id="pwsa-from-date"
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
                    id="pwsa-to-date"
                    type="date"
                    value={filters.toDate}
                    onChange={(e) => filters.setToDate(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* 4. Search */}
            <div className="pt-3 xl:pt-0 xl:px-3 flex items-center shrink-0">
              <div className="w-56">
                <SearchBar
                  value={filters.searchTerm}
                  onChange={(v) => filters.setSearchTerm(v)}
                  placeholder="Search product, code…"
                />
              </div>
            </div>

          </div>
        </div>

        {/* ── Table Card ──────────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col flex-1 min-h-0">

          {/* Caption */}
          {!report.isLoading && report.rows.length > 0 && (
            <p className="text-center text-[11px] font-semibold text-[#49293e] py-1.5 border-b border-gray-100 shrink-0">
              Product Wise Stock Adjustment from {filters.fromDate} To {filters.toDate}
            </p>
          )}

          {/* Scrollable table */}
          <div className="overflow-x-auto overflow-y-auto flex-1 min-h-0">
            <table className="w-full text-xs min-w-[1000px]">
              {/* thead */}
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

              {/* tbody */}
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
                ) : report.rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={COLS.length}
                      className="text-center py-20 text-gray-400 text-sm"
                    >
                      No records found. Adjust filters.
                    </td>
                  </tr>
                ) : (
                  report.rows.map((row, idx) => (
                    <tr
                      key={row.transId ?? idx}
                      className={`hover:bg-[#49293e]/5 transition-colors ${
                        idx % 2 === 0 ? "bg-white" : "bg-gray-50/60"
                      }`}
                    >
                      <td className="px-2 py-1.5 text-center text-gray-500 border-r border-gray-100">
                        {idx + 1}
                      </td>
                      <td className="px-2 py-1.5 text-center text-gray-800 border-r border-gray-100 tabular-nums whitespace-nowrap">
                        {formatDate(row.transDate)}
                      </td>
                      <td className="px-2 py-1.5 text-center font-mono text-gray-800 border-r border-gray-100">
                        {row.refNo}
                      </td>
                      <td className="px-2 py-1.5 text-center text-gray-500 border-r border-gray-100">
                        {row.code}
                      </td>
                      <td className="px-2 py-1.5 text-left font-medium uppercase text-gray-800 border-r border-gray-100">
                        {row.product}
                      </td>
                      <td className="px-2 py-1.5 text-right tabular-nums text-gray-800 border-r border-gray-100">
                        {row.qty}
                      </td>
                      <td className="px-2 py-1.5 text-center text-gray-600 border-r border-gray-100">
                        {row.unit}
                      </td>
                      <td className="px-2 py-1.5 text-right tabular-nums text-gray-700 border-r border-gray-100">
                        {formatAmount(Number(row.price || 0))}
                      </td>
                      <td className="px-2 py-1.5 text-right tabular-nums font-semibold text-[#49293e] border-r border-gray-100">
                        {formatAmount(Number(row.netAmount || 0))}
                      </td>
                      <td className="px-2 py-1.5 text-center text-gray-600 border-r border-gray-100 text-[10px]">
                        {row.type}
                      </td>
                      <td className="px-2 py-1.5 text-center font-bold">
                        <span
                          className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                            row.effect === "+"
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {row.effect}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>

              {/* tfoot — inside same <table> for perfect column alignment */}
              {!report.isLoading && report.rows.length > 0 && (
                <tfoot className="sticky bottom-0 z-10 bg-gray-100 border-t-2 border-t-[#49293e]/20 shadow-[0_-1px_0_rgba(0,0,0,0.05)]">
                  <tr>
                    <td className="py-1.5 border-r border-gray-200" />
                    <td className="border-r border-gray-200" />
                    <td className="border-r border-gray-200" />
                    <td className="border-r border-gray-200" />
                    <td className="border-r border-gray-200" />
                    <td className="px-2 py-1.5 text-right font-bold tabular-nums text-gray-900 border-r border-gray-200">
                      {report.grandTotals.qty}
                    </td>
                    <td className="border-r border-gray-200" />
                    <td className="border-r border-gray-200" />
                    <td className="px-2 py-1.5 text-right font-bold tabular-nums text-[#49293e] text-sm">
                      {formatAmount(report.grandTotals.netAmount)}
                    </td>
                    <td className="border-r border-gray-200" />
                    <td />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

        {/* ── Bottom Action Bar ────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-4 py-2 shrink-0 flex items-center justify-between">
          {/* Left: KPI summary */}
          <div className="flex items-center gap-5 text-xs font-medium text-gray-600">
            <span>
              Total Qty:{" "}
              <span className="font-bold text-gray-900 tabular-nums ml-1">
                {report.grandTotals.qty}
              </span>
            </span>
            <span>
              Total Amount:{" "}
              <span className="font-bold text-[#49293e] tabular-nums ml-1">
                {formatAmount(report.grandTotals.netAmount)}
              </span>
            </span>
          </div>

          {/* Right: actions */}
          <div className="flex items-center gap-3">
            {report.rows.length > 0 && (
              <span className="text-xs text-gray-400">
                {report.rows.length} record{report.rows.length !== 1 ? "s" : ""}
              </span>
            )}
            <div className="h-4 w-px bg-gray-200" />
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

        {/* Print preview modal */}
        <ProductWiseStockAdjustmentPrintPreviewModal
          isOpen={isPreviewOpen}
          onClose={() => setIsPreviewOpen(false)}
          data={previewData}
          onExportPDF={handleExportPDF}
        />

      </div>
    </PageShell>
  );
};

export default ProductWiseStockAdjustmentReportPage;
