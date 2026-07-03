import { useNavigate } from "react-router-dom";
import { useMemo, useState, useCallback } from "react";
import { Printer, X, Download } from "lucide-react";
import { useStockRegisterReport } from "../hooks/useStockRegisterReport";
import { exportStockRegisterReportPDF, exportStockRegisterReportExcel } from "../utils/stockRegisterExportUtils";
import { formatAmount } from "../../../../utils/currency";
import {
  PageShell,
  FormInput,
  Button,
  SearchableSelect,
  SelectInput,
  Checkbox,
  ResetButton
} from "../../../../components/common";
import { StockRegisterPrintPreviewModal } from "../components/StockRegisterPrintPreviewModal";

type GroupByOption = "All" | "Group" | "Category";

const GROUP_LABEL: Record<GroupByOption, string> = {
  All: "All",
  Group: "Group",
  Category: "Category",
};

// ─── Table Columns (Compliant with Rule 19 Table Data Alignment) ──────────────
const COLS = [
  { key: "sno",         label: "SNo",         cls: "w-[5%] text-center" },
  { key: "productCode", label: "Code",        cls: "w-[8%] text-center" },
  { key: "productName", label: "Product",     cls: "w-[27%] text-left" },
  { key: "group",       label: "Group",       cls: "w-[15%] text-left" },
  { key: "category",    label: "Category",    cls: "w-[15%] text-left" },
  { key: "stock",       label: "Stock",       cls: "w-[12%] text-center" },
  { key: "cost",        label: "Cost",        cls: "w-[9%] text-right" },
  { key: "value",       label: "Value",       cls: "w-[9%] text-right" },
];

const StockRegisterReportPage = () => {
  const navigate = useNavigate();
  const { filters, masterData, report } = useStockRegisterReport();
  const [groupBy, setGroupBy] = useState<GroupByOption>("All");
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const handleReset = () => {
    filters.resetFilters();
    setGroupBy("All");
  };

  // Directly map branch options from backend since it already includes "All"
  const branchOptions = useMemo(() => {
    return masterData.branches.map(b => ({
      label: b.branchName,
      value: String(b.branchId)
    }));
  }, [masterData.branches]);

  const groupOptions = useMemo(() => [
    { label: "All", value: "0" },
    ...masterData.groups.map(g => ({ label: g.name, value: String(g.id) }))
  ], [masterData.groups]);

  const categoryOptions = useMemo(() => [
    { label: "All", value: "0" },
    ...masterData.categories.map(c => ({ label: c.name, value: String(c.id) }))
  ], [masterData.categories]);

  const subcategoryOptions = useMemo(() => [
    { label: "All", value: "0" },
    ...masterData.subcategories.map(s => ({ label: s.name, value: String(s.id) }))
  ], [masterData.subcategories]);

  const productTypeOptions = useMemo(() => [
    { label: "All", value: "0" },
    ...masterData.productTypes.map(t => ({ label: t.productTypeName, value: String(t.productTypeId) }))
  ], [masterData.productTypes]);

  const productOptions = useMemo(() => [
    { label: "All", value: "0" },
    ...masterData.products.map(p => ({
      label: p.code ? `[${p.code}] ${p.productName}` : p.productName,
      value: String(p.productId)
    }))
  ], [masterData.products]);

  // Client-side grouping logic
  const groupedProductData = useMemo(() => {
    const rawData = report.productData;
    if (groupBy === "All") return rawData;

    if (groupBy === "Group") {
      const groups: Record<string, any> = {};
      rawData.forEach((row: any) => {
        const key = row.group || "Unknown";
        if (!groups[key]) {
          groups[key] = {
            productId: row.productId,
            sNo: 0,
            productCode: "",
            productName: "",
            group: row.group || "Unknown Group",
            category: "",
            stock: "",
            cost: "",
            value: 0,
          };
        }
        groups[key].value += Number(row.value || 0);
      });
      return Object.values(groups);
    }

    if (groupBy === "Category") {
      const groups: Record<string, any> = {};
      rawData.forEach((row: any) => {
        const key = row.category || "Unknown";
        if (!groups[key]) {
          groups[key] = {
            productId: row.productId,
            sNo: 0,
            productCode: "",
            productName: "",
            group: "",
            category: row.category || "Unknown Category",
            stock: "",
            cost: "",
            value: 0,
          };
        }
        groups[key].value += Number(row.value || 0);
      });
      return Object.values(groups);
    }

    return rawData;
  }, [report.productData, groupBy]);

  // Calculate total value dynamically from visible rows
  const totalValue = useMemo(() => {
    return groupedProductData.reduce((s, r) => s + Number(r.value || 0), 0);
  }, [groupedProductData]);

  const handleExportPDF = useCallback(() => {
    exportStockRegisterReportPDF(groupedProductData, { totalValue }, {
      ...filters,
      branchName: branchOptions.find(o => o.value === filters.branchId)?.label,
    });
  }, [filters, branchOptions, groupedProductData]);

  const handleExportExcel = useCallback(() => {
    exportStockRegisterReportExcel(groupedProductData, { totalValue }, {
      ...filters,
      branchName: branchOptions.find(o => o.value === filters.branchId)?.label,
    });
  }, [filters, branchOptions, groupedProductData]);

  const previewData = useMemo(() => ({
    productData: groupedProductData,
    purchaseData: groupedProductData, // Compatible fallback if needed
    totalData: {
      totalValue
    },
    filters,
    companyName: localStorage.getItem("companyName") || "FEKRA advertising",
    companyAddress: localStorage.getItem("companyAddress") || "NEAR NESTO BESIDE BIN RASHIED SOUQ MABELA BUILDING NO 211 SECOND FLOOR FLAT NO 21",
  }), [groupedProductData, totalValue, filters]);

  return (
    <PageShell title="Stock Register Report">
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

            {/* 1. Group By Section */}
            <div className="shrink-0 flex flex-col gap-0.5 pr-4 justify-center">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Group By</span>
              {(["All", "Group", "Category"] as GroupByOption[]).map((val) => (
                <div key={val} className="h-7 flex items-center">
                  <Checkbox
                    id={`st-group-${val}`}
                    label={GROUP_LABEL[val]}
                    checked={groupBy === val}
                    onChange={() => setGroupBy(val)}
                  />
                </div>
              ))}
            </div>

            {/* 2. Location + As On Date */}
            <div className="pt-3 xl:pt-0 xl:px-3 flex flex-col gap-2 shrink-0 justify-start">
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-gray-500 w-14 text-right shrink-0">Location</span>
                <div className="w-40">
                  <SearchableSelect id="st-branch" options={branchOptions} value={filters.branchId} onChange={filters.setBranchId} placeholder="All" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-gray-500 w-14 text-right shrink-0">As On Date</span>
                <div className="w-40">
                  <FormInput id="st-as-on-date" type="date" value={filters.asOnDate} onChange={(e) => filters.setAsOnDate(e.target.value)} />
                </div>
              </div>
            </div>

            {/* 3. Group + Category */}
            <div className="pt-3 xl:pt-0 xl:px-3 flex flex-col gap-2 shrink-0 justify-start">
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-gray-500 w-14 text-right shrink-0">Group</span>
                <div className="w-40">
                  <SearchableSelect id="st-group-id" options={groupOptions} value={filters.groupId} onChange={filters.setGroupId} placeholder="All" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-gray-500 w-14 text-right shrink-0">Category</span>
                <div className="w-40">
                  <SearchableSelect id="st-category-id" options={categoryOptions} value={filters.categoryId} onChange={filters.setCategoryId} placeholder="All" />
                </div>
              </div>
            </div>

            {/* 4. Sub Category + Product Type */}
            <div className="pt-3 xl:pt-0 xl:px-3 flex flex-col gap-2 shrink-0 justify-start">
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-gray-500 w-20 text-right shrink-0">Sub Category</span>
                <div className="w-40">
                  <SelectInput id="st-subcategory-id" options={subcategoryOptions} value={filters.subCategoryId} onChange={(e) => filters.setSubCategoryId(e.target.value)} disabled={filters.categoryId === "0"} />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-gray-500 w-20 text-right shrink-0">Product Type</span>
                <div className="w-40">
                  <SelectInput id="st-product-type-id" options={productTypeOptions} value={filters.productTypeId} onChange={(e) => filters.setProductTypeId(e.target.value)} />
                </div>
              </div>
            </div>

            {/* 5. Product */}
            <div className="pt-3 xl:pt-0 xl:pl-3 flex flex-col gap-2 shrink-0 justify-start">
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-gray-500 w-14 text-right shrink-0">Product</span>
                <div className="w-44">
                  <SearchableSelect id="st-product-id" options={productOptions} value={filters.productId} onChange={filters.setProductId} placeholder="All" />
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* ── Table Card ──────────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col flex-1 min-h-0">
          {!report.isLoading && groupedProductData.length > 0 && (
            <p className="text-center text-[11px] font-semibold text-[#49293e] py-1.5 border-b border-gray-100 shrink-0">
              Stock Register Report As On Date: {filters.asOnDate}
            </p>
          )}

          <div className="overflow-x-auto overflow-y-auto flex-1 min-h-0">
            <table className="w-full text-xs min-w-[1000px] table-layout-fixed">
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
                ) : groupedProductData.length === 0 ? (
                  <tr>
                    <td colSpan={COLS.length} className="text-center py-20 text-gray-400 text-sm">
                      No records found. Adjust filters.
                    </td>
                  </tr>
                ) : (
                  groupedProductData.map((row: any, idx: number) => (
                    <tr
                      key={row.productId ?? idx}
                      className={`hover:bg-[#49293e]/5 transition-colors ${idx % 2 === 0 ? "bg-white" : "bg-gray-50/60"}`}
                    >
                      {/* SL */}
                      <td className="px-2 py-1.5 text-center text-gray-500 border-r border-gray-100">{idx + 1}</td>
                      {/* Code */}
                      <td className="px-2 py-1.5 text-center text-gray-800 border-r border-gray-100 font-mono">{row.productCode || ""}</td>
                      {/* Product Name */}
                      <td className="px-2 py-1.5 text-left font-medium uppercase text-gray-800 border-r border-gray-100 truncate">{row.productName || ""}</td>
                      {/* Group */}
                      <td className="px-2 py-1.5 text-left font-medium uppercase text-gray-600 border-r border-gray-100 truncate">{row.group || ""}</td>
                      {/* Category */}
                      <td className="px-2 py-1.5 text-left font-medium uppercase text-gray-600 border-r border-gray-100 truncate">{row.category || ""}</td>
                      {/* Stock */}
                      <td className="px-2 py-1.5 text-center text-gray-800 border-r border-gray-100 font-medium">{row.stock || ""}</td>
                      {/* Cost */}
                      <td className="px-2 py-1.5 text-right tabular-nums text-gray-700 border-r border-gray-100 font-mono">{row.cost ? formatAmount(Number(row.cost)) : ""}</td>
                      {/* Value */}
                      <td className="px-2 py-1.5 text-right tabular-nums font-semibold text-[#49293e] font-mono">{row.value ? formatAmount(Number(row.value)) : ""}</td>
                    </tr>
                  ))
                )}
              </tbody>

              {!report.isLoading && groupedProductData.length > 0 && (
                <tfoot className="sticky bottom-0 z-10 bg-gray-100 border-t-2 border-t-[#49293e]/20 shadow-[0_-1px_0_rgba(0,0,0,0.05)]">
                  <tr>
                    {/* Empty spacer cells up to Value */}
                    <td className="py-1.5 border-r border-gray-200" colSpan={7} />
                    <td className="px-2 py-1.5 text-right font-bold tabular-nums text-[#49293e] text-sm font-mono">{formatAmount(totalValue)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

        {/* ── Sticky Bottom Actions Bar ───────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-4 py-2 shrink-0 flex items-center justify-end gap-3">
          {groupedProductData.length > 0 && (
            <span className="text-xs text-gray-400">
              {groupedProductData.length} record{groupedProductData.length !== 1 ? "s" : ""}
            </span>
          )}
          <div className="h-4 w-px bg-gray-200" />
          <Button
            size="sm"
            icon={<Printer size={15} />}
            onClick={() => setIsPreviewOpen(true)}
            disabled={report.isLoading || groupedProductData.length === 0}
          >
            Print Preview
          </Button>
          <Button
            size="sm"
            onClick={handleExportExcel}
            disabled={report.isLoading || groupedProductData.length === 0}
            icon={<Download size={15} />}
            className="!bg-green-600 !border-green-600 hover:!bg-green-700 !text-white"
          >
            XLS
          </Button>
        </div>

        <StockRegisterPrintPreviewModal
          isOpen={isPreviewOpen}
          onClose={() => setIsPreviewOpen(false)}
          data={previewData}
          onExportPDF={handleExportPDF}
        />

      </div>
    </PageShell>
  );
};

export default StockRegisterReportPage;
