import { useState } from "react";
import { useNavigate } from "react-router-dom";
import PageShell from "../../../../components/common/PageShell";
import { SearchableSelect, ReportDataGrid } from "../../../../components/common";
import FormInput from "../../../../components/common/FormInput";
import Button from "../../../../components/common/Button";
import ResetButton from "../../../../components/common/ResetButton";
import { Printer, Download, X } from "lucide-react";
import { formatAmount } from "../../../../utils/currency";
import { useProductWiseMarginReport } from "../hooks/useProductWiseMarginReport";
import { exportProductWiseMarginReportXLS } from "../utils/exportUtils";
import ProductWiseMarginReportPrintPreviewModal from "../components/ProductWiseMarginReportPrintPreviewModal";

const ProductWiseMarginReportPage = () => {
  const navigate = useNavigate();
  const { filters, options, data, isLoading, handleReset } = useProductWiseMarginReport();
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const handleExportXLS = () => {
    exportProductWiseMarginReportXLS(data.rows, data.totals, {
      fromDate: filters.fromDate,
      toDate: filters.toDate,
    });
  };

  return (
    <PageShell title="Product Wise Margin Report">
      <div className="flex flex-col h-auto md:h-[calc(100vh-92px)] md:overflow-hidden p-1 gap-3 relative">
        
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
            {/* 1. Location + Product */}
            <div className="pb-3 xl:pb-0 xl:pr-4 flex flex-col gap-2 shrink-0 justify-start">
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-gray-500 w-16 text-left shrink-0">Location</span>
                <div className="w-40">
                  <SearchableSelect 
                    id="pwm-branch" 
                    options={options.branchOptions} 
                    value={filters.branchId} 
                    onChange={filters.setBranchId}
                    disabled={filters.isBranchLocked}
                    placeholder="All" 
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-gray-500 w-16 text-left shrink-0">Product</span>
                <div className="w-56">
                  <SearchableSelect 
                    id="pwm-product" 
                    options={options.productOptions} 
                    value={filters.productId} 
                    onChange={filters.setProductId} 
                    placeholder="All" 
                  />
                </div>
              </div>
            </div>

            {/* 2. Group, Category, Sub Category */}
            <div className="pt-3 xl:pt-0 xl:px-3 flex flex-col gap-2 shrink-0 justify-start">
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-gray-500 w-16 text-left shrink-0">Group</span>
                <div className="w-40">
                  <SearchableSelect 
                    id="pwm-group" 
                    options={options.groupOptions} 
                    value={filters.groupId} 
                    onChange={filters.setGroupId} 
                    placeholder="All" 
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-gray-500 w-16 text-left shrink-0">Category</span>
                <div className="w-40">
                  <SearchableSelect 
                    id="pwm-category" 
                    options={options.categoryOptions} 
                    value={filters.categoryId} 
                    onChange={filters.setCategoryId} 
                    placeholder="All" 
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-gray-500 w-16 text-left shrink-0">Sub Cat.</span>
                <div className="w-40">
                  <SearchableSelect 
                    id="pwm-subcategory" 
                    options={options.subcategoryOptions} 
                    value={filters.subcategoryId} 
                    onChange={filters.setSubcategoryId} 
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
                    id="pwm-from-date" 
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
                    id="pwm-to-date" 
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
        <ReportDataGrid
          columns={[
            { key: 'sNo', label: 'SNo', align: 'center', className: 'w-16', render: (row) => row.sNo },
            { key: 'code', label: 'Product Code', align: 'center', className: 'w-32', render: (row) => row.productCode },
            { key: 'name', label: 'Product Name', align: 'left', className: 'w-48', render: (row) => row.productName },
            { key: 'group', label: 'Group', align: 'center', className: 'w-32', render: (row) => row.group },
            { key: 'category', label: 'Category', align: 'center', className: 'w-32', render: (row) => row.category },
            { key: 'subCategory', label: 'Sub Category', align: 'center', className: 'w-32', render: (row) => row.subCategory },
            { key: 'netValue', label: 'Net Value', align: 'right', className: 'w-32', render: (row) => <span className="tabular-nums font-medium text-[#0066cc]">{formatAmount(Number(row.netValue))}</span> },
            { key: 'cost', label: 'Cost', align: 'right', className: 'w-32', render: (row) => <span className="tabular-nums text-gray-900">{formatAmount(Number(row.cost))}</span> },
            { key: 'margin', label: 'Margin', align: 'right', className: 'w-32', render: (row) => <span className="tabular-nums font-medium text-green-600">{formatAmount(Number(row.margin))}</span> },
            { key: 'marginPer', label: 'Margin %', align: 'right', className: 'w-32', render: (row) => <span className="tabular-nums font-medium text-[#49293e]">{formatAmount(Number(row.marginPer))}</span> },
          ]}
          data={data.rows}
          isLoading={isLoading}
          minWidth="min-w-[900px]"
          emptyMessage="No records found for the selected period"
          footerRow={
            data.totals ? (
              <tr>
                <td colSpan={6} className="px-2 py-2 text-center text-[11px] font-bold text-gray-700 border-r border-gray-200">TOTAL</td>
                <td className="px-2 py-2 text-right font-bold tabular-nums text-gray-900 border-r border-gray-200">{formatAmount(Number(data.totals.netValue))}</td>
                <td className="px-2 py-2 text-right font-bold tabular-nums text-gray-900 border-r border-gray-200">{formatAmount(Number(data.totals.cost))}</td>
                <td className="px-2 py-2 text-right font-bold tabular-nums text-green-700 border-r border-gray-200">{formatAmount(Number(data.totals.margin))}</td>
                <td className="px-2 py-2 text-right font-bold tabular-nums text-[#49293e]">{formatAmount(Number(data.totals.marginper))}</td>
              </tr>
            ) : null
          }
        />

        {/* ── Sticky Bottom Actions Bar ───────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-4 py-2 shrink-0 flex items-center justify-between">
          <div className="flex items-center gap-5 text-xs font-medium text-gray-600">
            {/* Any extra footer info can go here */}
          </div>

          <div className="flex items-center gap-3">
            {data.rows.length > 0 && (
              <span className="text-xs text-gray-400">
                {data.rows.length} record{data.rows.length !== 1 ? "s" : ""}
              </span>
            )}
            <div className="h-4 w-px bg-gray-200" />
            <Button
              size="sm"
              icon={<Printer size={15} />}
              onClick={() => setIsPreviewOpen(true)}
              disabled={isLoading || data.rows.length === 0}
            >
              Print Preview
            </Button>
            <Button
              size="sm"
              onClick={handleExportXLS}
              disabled={isLoading || data.rows.length === 0}
              icon={<Download size={15} />}
              className="!bg-green-600 !border-green-600 hover:!bg-green-700 !text-white"
            >
              XLS
            </Button>
          </div>
        </div>

      </div>

      <ProductWiseMarginReportPrintPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        rows={data.rows}
        totals={data.totals}
        filters={{
          fromDate: filters.fromDate,
          toDate: filters.toDate,
        }}
      />
    </PageShell>
  );
};

export default ProductWiseMarginReportPage;
