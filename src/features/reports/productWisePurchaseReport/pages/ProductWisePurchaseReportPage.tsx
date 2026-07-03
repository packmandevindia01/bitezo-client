import { useNavigate } from "react-router-dom";
import { useMemo, useState, useCallback } from "react";
import { Printer, X, Download } from "lucide-react";
import { useProductWisePurchaseReport } from "../hooks/useProductWisePurchaseReport";
import { exportProductWisePurchaseReportPDF, exportProductWisePurchaseReportExcel } from "../utils/productWiseExportUtils";
import { formatAmount } from "../../../../utils/currency";
import {
  PageShell,
  FormInput,
  Button,
  SearchableSelect,
  Checkbox,
  ResetButton
} from "../../../../components/common";
import { ProductWisePrintPreviewModal } from "../components/ProductWisePrintPreviewModal";

type GroupByOption = "All" | "Product" | "Supplier";

const GROUP_LABEL: Record<GroupByOption, string> = {
  All: "All",
  Product: "Product",
  Supplier: "Supplier",
};

// ─── Table Columns (Compliant with Rule 19 Table Data Alignment) ──────────────
const COLS = [
  { key: "sno",         label: "SNo",         cls: "w-[3%] text-center" },
  { key: "billDate",    label: "Date",        cls: "w-[9%] text-left" },
  { key: "prNo",        label: "P/R No",      cls: "w-[6%] text-center" },
  { key: "billNo",      label: "Inv No",      cls: "w-[6%] text-center" },
  { key: "supplier",    label: "Supplier",    cls: "w-[15%] text-left" },
  { key: "code",        label: "Code",        cls: "w-[6%] text-center" },
  { key: "product",     label: "Product",     cls: "w-[15%] text-left" },
  { key: "qty",         label: "Qty",         cls: "w-[6%] text-right" },
  { key: "unit",        label: "Unit",        cls: "w-[5%] text-center" },
  { key: "price",       label: "Price",       cls: "w-[7%] text-right" },
  { key: "discount",    label: "Discount",    cls: "w-[6%] text-right" },
  { key: "netValue",    label: "Net Value",   cls: "w-[8%] text-right" },
  { key: "vatAmnt",     label: "Vat Amt",     cls: "w-[8%] text-right" },
  { key: "amount",      label: "Net Amount",  cls: "w-[10%] text-right" },
];

const formatDate = (dateStr: string) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const dd   = String(d.getDate()).padStart(2, "0");
  const mm   = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  const hh   = String(d.getHours()).padStart(2, "0");
  const min  = String(d.getMinutes()).padStart(2, "0");
  return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
};

const ProductWisePurchaseReportPage = () => {
  const navigate = useNavigate();
  const { filters, masterData, report } = useProductWisePurchaseReport();
  const [groupBy, setGroupBy] = useState<GroupByOption>("All");
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const handleReset = () => {
    filters.resetFilters();
    setGroupBy("All");
  };

  // Directly map the branches from backend since it already includes "All"
  const branchOptions = useMemo(() => {
    return masterData.branches.map(b => ({
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

  const productOptions = useMemo(() => [
    { label: "All", value: "0" },
    ...masterData.products.map((p: any) => ({
      label: p.code ? `[${p.code}] ${p.productName}` : p.productName,
      value: String(p.productId)
    })),
  ], [masterData.products]);

  // Client-side grouping logic
  const groupedPurchaseData = useMemo(() => {
    const rawData = report.purchaseData;
    if (groupBy === "All") return rawData;

    if (groupBy === "Product") {
      const groups: Record<string, any> = {};
      rawData.forEach((row: any) => {
        const key = row.productCode || row.productnName || "Unknown";
        if (!groups[key]) {
          groups[key] = {
            purchaseId: row.purchaseId,
            invoiceDate: "",
            "p/R Number": "",
            invoiceNo: "",
            supplierName: "",
            productCode: row.productCode || "",
            productnName: row.productnName || "Unknown Product",
            qty: 0,
            unit: row.unit || "",
            price: "",
            discount: 0,
            netValue: 0,
            vatAmount: 0,
            netAmount: 0,
          };
        }
        groups[key].qty += Number(row.qty || 0);
        groups[key].discount += Number(row.discount || 0);
        groups[key].netValue += Number(row.netValue || 0);
        groups[key].vatAmount += Number(row.vatAmount || 0);
        groups[key].netAmount += Number(row.netAmount || 0);
      });
      return Object.values(groups);
    }

    if (groupBy === "Supplier") {
      const groups: Record<string, any> = {};
      rawData.forEach((row: any) => {
        const key = row.supplierName || "Unknown";
        if (!groups[key]) {
          groups[key] = {
            purchaseId: row.purchaseId,
            invoiceDate: "",
            "p/R Number": "",
            invoiceNo: "",
            supplierName: row.supplierName || "Unknown Supplier",
            productCode: "",
            productnName: "",
            qty: 0,
            unit: "",
            price: "",
            discount: 0,
            netValue: 0,
            vatAmount: 0,
            netAmount: 0,
          };
        }
        groups[key].qty += Number(row.qty || 0);
        groups[key].discount += Number(row.discount || 0);
        groups[key].netValue += Number(row.netValue || 0);
        groups[key].vatAmount += Number(row.vatAmount || 0);
        groups[key].netAmount += Number(row.netAmount || 0);
      });
      return Object.values(groups);
    }

    return rawData;
  }, [report.purchaseData, groupBy]);

  // Calculate totals dynamically from grouped data (Rule 12 compliant)
  const totalQty = useMemo(() => 
    groupedPurchaseData.reduce((s, r) => s + Number(r.qty || 0), 0)
  , [groupedPurchaseData]);

  const totalDiscount = useMemo(() => 
    report.totalData && groupBy === "All" ? Number(report.totalData.discount) : groupedPurchaseData.reduce((s, r) => s + Number(r.discount || 0), 0)
  , [groupedPurchaseData, report.totalData, groupBy]);

  const totalNetValue = useMemo(() => 
    report.totalData && groupBy === "All" ? Number(report.totalData.netValue) : groupedPurchaseData.reduce((s, r) => s + Number(r.netValue || 0), 0)
  , [groupedPurchaseData, report.totalData, groupBy]);

  const totalVatAmount = useMemo(() => 
    report.totalData && groupBy === "All" ? Number(report.totalData.vatAmount) : groupedPurchaseData.reduce((s, r) => s + Number(r.vatAmount || 0), 0)
  , [groupedPurchaseData, report.totalData, groupBy]);

  const grandTotal = useMemo(() => 
    report.totalData && groupBy === "All" ? Number(report.totalData.netAmount) : groupedPurchaseData.reduce((s, r) => s + Number(r.netAmount || 0), 0)
  , [groupedPurchaseData, report.totalData, groupBy]);

  const handleExportPDF = useCallback(() => {
    exportProductWisePurchaseReportPDF(groupedPurchaseData, report.totalData, {
      ...filters,
      branchName:   branchOptions.find(o => o.value === filters.branchId)?.label,
      supplierName: supplierOptions.find(o => o.value === filters.supplierId)?.label,
      productName:  productOptions.find(o => o.value === filters.productId)?.label,
    });
  }, [filters, branchOptions, supplierOptions, productOptions, report, groupedPurchaseData]);

  const handleExportExcel = useCallback(() => {
    exportProductWisePurchaseReportExcel(groupedPurchaseData, report.totalData, {
      ...filters,
      branchName:   branchOptions.find(o => o.value === filters.branchId)?.label,
      supplierName: supplierOptions.find(o => o.value === filters.supplierId)?.label,
      productName:  productOptions.find(o => o.value === filters.productId)?.label,
    });
  }, [filters, branchOptions, supplierOptions, productOptions, report, groupedPurchaseData]);

  const previewData = useMemo(() => ({
    purchaseData: groupedPurchaseData,
    totalData: {
      discount: totalDiscount,
      netValue: totalNetValue,
      vatAmount: totalVatAmount,
      netAmount: grandTotal,
    },
    filters,
    companyName: localStorage.getItem("companyName") || "FEKRA advertising",
    companyAddress: localStorage.getItem("companyAddress") || "NEAR NESTO BESIDE BIN RASHIED SOUQ MABELA BUILDING NO 211 SECOND FLOOR FLAT NO 21",
  }), [groupedPurchaseData, totalDiscount, totalNetValue, totalVatAmount, grandTotal, filters]);

  return (
    <PageShell title="Product Wise Purchase Report">
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

          <div className="px-4 py-3 flex flex-col xl:flex-row gap-5 divide-y xl:divide-y-0 xl:divide-x divide-gray-200">

            {/* 1. Group By Section */}
            <div className="shrink-0 flex flex-col gap-0.5 pr-4 justify-center">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Group By</span>
              {(["All", "Product", "Supplier"] as GroupByOption[]).map((val) => (
                <div key={val} className="h-7 flex items-center">
                  <Checkbox
                    id={`pw-group-${val}`}
                    label={GROUP_LABEL[val]}
                    checked={groupBy === val}
                    onChange={() => setGroupBy(val)}
                  />
                </div>
              ))}
            </div>

            {/* 2. Location + Supplier */}
            <div className="pt-3 xl:pt-0 xl:px-5 flex flex-col gap-2 shrink-0 justify-start">
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-gray-500 w-14 text-right shrink-0">Location</span>
                <div className="w-44">
                  <SearchableSelect id="pw-branch" options={branchOptions} value={filters.branchId} onChange={filters.setBranchId} placeholder="All" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-gray-500 w-14 text-right shrink-0">Supplier</span>
                <div className="w-44">
                  <SearchableSelect id="pw-supplier" options={supplierOptions} value={filters.supplierId} onChange={filters.setSupplierId} placeholder="All" />
                </div>
              </div>
            </div>

            {/* 3. Product */}
            <div className="pt-3 xl:pt-0 xl:px-5 flex flex-col gap-2 shrink-0 justify-start">
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-gray-500 w-14 text-right shrink-0">Product</span>
                <div className="w-56">
                  <SearchableSelect id="pw-product" options={productOptions} value={filters.productId} onChange={filters.setProductId} placeholder="All" />
                </div>
              </div>
            </div>

            {/* 4. Dates */}
            <div className="pt-3 xl:pt-0 xl:pl-5 flex flex-col gap-2 shrink-0 justify-start">
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-gray-500 w-8 text-right shrink-0">From</span>
                <div className="w-36">
                  <FormInput id="pw-from-date" type="date" value={filters.fromDate} onChange={(e) => filters.setFromDate(e.target.value)} />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-gray-500 w-8 text-right shrink-0">To</span>
                <div className="w-36">
                  <FormInput id="pw-to-date" type="date" value={filters.toDate} onChange={(e) => filters.setToDate(e.target.value)} />
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* ── Table Card ──────────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col flex-1 min-h-0">
          {!report.isLoading && groupedPurchaseData.length > 0 && (
            <p className="text-center text-[11px] font-semibold text-[#49293e] py-1.5 border-b border-gray-100 shrink-0">
              Product Wise Purchase Report from {filters.fromDate} To {filters.toDate}
            </p>
          )}

          <div className="overflow-x-auto overflow-y-auto flex-1 min-h-0">
            <table className="w-full text-xs min-w-[1250px] table-layout-fixed">
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
                ) : groupedPurchaseData.length === 0 ? (
                  <tr>
                    <td colSpan={COLS.length} className="text-center py-20 text-gray-400 text-sm">
                      No records found. Adjust filters.
                    </td>
                  </tr>
                ) : (
                  groupedPurchaseData.map((row: any, idx: number) => (
                    <tr
                      key={row.purchaseId ?? idx}
                      className={`hover:bg-[#49293e]/5 transition-colors ${idx % 2 === 0 ? "bg-white" : "bg-gray-50/60"}`}
                    >
                      {/* SL */}
                      <td className="px-2 py-1.5 text-center text-gray-500 border-r border-gray-100">{idx + 1}</td>
                      {/* Date (Left) */}
                      <td className="px-2 py-1.5 text-left text-gray-800 border-r border-gray-100 tabular-nums whitespace-nowrap">
                        {row.invoiceDate ? formatDate(row.invoiceDate) : ""}
                      </td>
                      {/* P/R No (Center) */}
                      <td className="px-2 py-1.5 text-center font-mono text-gray-800 border-r border-gray-100">{row["p/R Number"]}</td>
                      {/* Inv No (Center) */}
                      <td className="px-2 py-1.5 text-center font-mono text-gray-800 border-r border-gray-100">{row.invoiceNo || ""}</td>
                      {/* Supplier (Left) */}
                      <td className="px-2 py-1.5 text-left font-medium uppercase text-gray-800 border-r border-gray-100 truncate">{row.supplierName || ""}</td>
                      {/* Code (Center) */}
                      <td className="px-2 py-1.5 text-center text-gray-500 border-r border-gray-100">{row.productCode || ""}</td>
                      {/* Product Name (Left) */}
                      <td className="px-2 py-1.5 text-left font-medium uppercase text-gray-800 border-r border-gray-100 truncate">{row.productnName || ""}</td>
                      {/* Qty (Right) */}
                      <td className="px-2 py-1.5 text-right tabular-nums text-gray-800 border-r border-gray-100 font-mono">{row.qty ? formatAmount(Number(row.qty)) : ""}</td>
                      {/* Unit (Center) */}
                      <td className="px-2 py-1.5 text-center text-gray-500 border-r border-gray-100 font-medium">{row.unit || ""}</td>
                      {/* Price (Right) */}
                      <td className="px-2 py-1.5 text-right tabular-nums text-gray-700 border-r border-gray-100 font-mono">{row.price ? formatAmount(Number(row.price)) : ""}</td>
                      {/* Discount (Right) */}
                      <td className="px-2 py-1.5 text-right tabular-nums text-gray-700 border-r border-gray-100 font-mono">{formatAmount(Number(row.discount || 0))}</td>
                      {/* Net Value (Right) */}
                      <td className="px-2 py-1.5 text-right tabular-nums text-gray-700 border-r border-gray-100 font-mono">{formatAmount(Number(row.netValue || 0))}</td>
                      {/* Vat Amt (Right) */}
                      <td className="px-2 py-1.5 text-right tabular-nums text-gray-700 border-r border-gray-100 font-mono">{formatAmount(Number(row.vatAmount || 0))}</td>
                      {/* Net Amount (Right) */}
                      <td className="px-2 py-1.5 text-right tabular-nums font-semibold text-[#49293e] font-mono">{formatAmount(Number(row.netAmount || 0))}</td>
                    </tr>
                  ))
                )}
              </tbody>

              {!report.isLoading && groupedPurchaseData.length > 0 && (
                <tfoot className="sticky bottom-0 z-10 bg-gray-100 border-t-2 border-t-[#49293e]/20 shadow-[0_-1px_0_rgba(0,0,0,0.05)]">
                  <tr>
                    {/* Empty spacer cells up to Qty */}
                    <td className="py-1.5 border-r border-gray-200" colSpan={7} />
                    <td className="px-2 py-1.5 text-right font-bold tabular-nums text-gray-900 border-r border-gray-200 font-mono">{formatAmount(totalQty)}</td>
                    <td className="border-r border-gray-200" />
                    <td className="border-r border-gray-200" />
                    {/* Totals under Discount, Net Value, Vat Amt, Net Amount */}
                    <td className="px-2 py-1.5 text-right font-bold tabular-nums text-gray-900 border-r border-gray-200 font-mono">{formatAmount(totalDiscount)}</td>
                    <td className="px-2 py-1.5 text-right font-bold tabular-nums text-gray-900 border-r border-gray-200 font-mono">{formatAmount(totalNetValue)}</td>
                    <td className="px-2 py-1.5 text-right font-bold tabular-nums text-gray-900 border-r border-gray-200 font-mono">{formatAmount(totalVatAmount)}</td>
                    <td className="px-2 py-1.5 text-right font-bold tabular-nums text-[#49293e] text-sm font-mono">{formatAmount(grandTotal)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

        {/* ── Sticky Bottom Actions Bar ───────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-4 py-2 shrink-0 flex items-center justify-end gap-3">
          {groupedPurchaseData.length > 0 && (
            <span className="text-xs text-gray-400">
              {groupedPurchaseData.length} record{groupedPurchaseData.length !== 1 ? "s" : ""}
            </span>
          )}
          <div className="h-4 w-px bg-gray-200" />
          <Button
            size="sm"
            icon={<Printer size={15} />}
            onClick={() => setIsPreviewOpen(true)}
            disabled={report.isLoading || groupedPurchaseData.length === 0}
          >
            Print Preview
          </Button>
          <Button
            size="sm"
            onClick={handleExportExcel}
            disabled={report.isLoading || groupedPurchaseData.length === 0}
            icon={<Download size={15} />}
            className="!bg-green-600 !border-green-600 hover:!bg-green-700 !text-white"
          >
            XLS
          </Button>
        </div>

        <ProductWisePrintPreviewModal
          isOpen={isPreviewOpen}
          onClose={() => setIsPreviewOpen(false)}
          data={previewData}
          onExportPDF={handleExportPDF}
        />

      </div>
    </PageShell>
  );
};

export default ProductWisePurchaseReportPage;
