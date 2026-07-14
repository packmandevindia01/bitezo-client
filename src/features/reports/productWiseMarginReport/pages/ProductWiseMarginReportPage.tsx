import { useState } from "react";
import { useNavigate } from "react-router-dom";
import PageShell from "../../../../components/common/PageShell";
import Searchableselect from "../../../../components/common/Searchableselect";
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
      <div className="flex flex-col h-full bg-slate-50 p-4 gap-4">
        
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

          <div className="px-4 py-3 flex flex-col gap-3">
            
            {/* Top Row: Master Data Filters */}
            <div className="flex flex-wrap gap-4 items-center pr-8">
              <div className="flex flex-col gap-0.5 w-48 shrink-0">
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Location</span>
                <Searchableselect 
                  id="pwm-branch" 
                  options={options.branchOptions} 
                  value={filters.branchId} 
                  onChange={filters.setBranchId}
                  disabled={filters.isBranchLocked}
                  placeholder="All" 
                />
              </div>
              <div className="flex flex-col gap-0.5 w-56 shrink-0">
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Product</span>
                <Searchableselect 
                  id="pwm-product" 
                  options={options.productOptions} 
                  value={filters.productId} 
                  onChange={filters.setProductId} 
                  placeholder="All" 
                />
              </div>
              <div className="flex flex-col gap-0.5 w-44 shrink-0">
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Group</span>
                <Searchableselect 
                  id="pwm-group" 
                  options={options.groupOptions} 
                  value={filters.groupId} 
                  onChange={filters.setGroupId} 
                  placeholder="All" 
                />
              </div>
              <div className="flex flex-col gap-0.5 w-44 shrink-0">
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Category</span>
                <Searchableselect 
                  id="pwm-category" 
                  options={options.categoryOptions} 
                  value={filters.categoryId} 
                  onChange={filters.setCategoryId} 
                  placeholder="All" 
                />
              </div>
              <div className="flex flex-col gap-0.5 w-44 shrink-0">
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Sub Category</span>
                <Searchableselect 
                  id="pwm-subcategory" 
                  options={options.subcategoryOptions} 
                  value={filters.subcategoryId} 
                  onChange={filters.setSubcategoryId} 
                  placeholder="All" 
                />
              </div>
            </div>

            {/* Bottom Row: Dates */}
            <div className="pt-3 border-t border-gray-100 flex gap-4 items-center">
              <div className="flex flex-col gap-0.5 w-40 shrink-0">
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">From Date</span>
                <FormInput 
                  id="pwm-from-date" 
                  type="date" 
                  value={filters.fromDate} 
                  onChange={(e) => filters.setFromDate(e.target.value)} 
                />
              </div>
              <div className="flex flex-col gap-0.5 w-40 shrink-0">
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">To Date</span>
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

        {/* ── Data Grid Section ───────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex-1 min-h-0 flex flex-col overflow-hidden relative">
          
          {isLoading && (
            <div className="absolute inset-0 bg-white/70 z-20 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#49293e]" />
            </div>
          )}

          <div className="overflow-x-auto overflow-y-auto flex-1 min-h-0">
              <table className="w-full min-w-[900px] text-xs border-collapse table-fixed">
                <thead className="sticky top-0 z-10 bg-gray-100 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)]">
                  <tr>
                    <th className="w-16 px-2 py-2 text-center font-bold text-gray-600 border-r border-gray-200">SNo</th>
                    <th className="w-32 px-2 py-2 text-center font-bold text-gray-600 border-r border-gray-200">Product Code</th>
                    <th className="w-48 px-2 py-2 text-left font-bold text-gray-600 border-r border-gray-200">Product Name</th>
                    <th className="w-32 px-2 py-2 text-center font-bold text-gray-600 border-r border-gray-200">Group</th>
                    <th className="w-32 px-2 py-2 text-center font-bold text-gray-600 border-r border-gray-200">Category</th>
                    <th className="w-32 px-2 py-2 text-center font-bold text-gray-600 border-r border-gray-200">Sub Category</th>
                    <th className="w-32 px-2 py-2 text-right font-bold text-gray-600 border-r border-gray-200">Net Value</th>
                    <th className="w-32 px-2 py-2 text-right font-bold text-gray-600 border-r border-gray-200">Cost</th>
                    <th className="w-32 px-2 py-2 text-right font-bold text-gray-600 border-r border-gray-200">Margin</th>
                    <th className="w-32 px-2 py-2 text-right font-bold text-gray-600">Margin %</th>
                  </tr>
                </thead>
                
                <tbody className="divide-y divide-gray-100">
                  {isLoading ? (
                    <tr>
                      <td colSpan={10} className="px-4 py-8 text-center text-gray-500">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-4 h-4 border-2 border-[#49293e] border-t-transparent rounded-full animate-spin" />
                          <span>Loading...</span>
                        </div>
                      </td>
                    </tr>
                  ) : data.rows.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="px-4 py-8 text-center text-gray-500">
                        No records found for the selected period
                      </td>
                    </tr>
                  ) : (
                    data.rows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-gray-50 transition-colors">
                        <td className="px-2 py-2 text-center text-gray-700 border-r border-gray-200 border-b">{row.sNo}</td>
                        <td className="px-2 py-2 text-center text-gray-900 border-r border-gray-200 border-b">{row.productCode}</td>
                        <td className="px-2 py-2 text-left text-gray-900 border-r border-gray-200 border-b">{row.productName}</td>
                        <td className="px-2 py-2 text-center text-gray-600 border-r border-gray-200 border-b">{row.group}</td>
                        <td className="px-2 py-2 text-center text-gray-600 border-r border-gray-200 border-b">{row.category}</td>
                        <td className="px-2 py-2 text-center text-gray-600 border-r border-gray-200 border-b">{row.subCategory}</td>
                        <td className="px-2 py-2 text-right text-[#0066cc] font-medium border-r border-gray-200 border-b">{formatAmount(Number(row.netValue))}</td>
                        <td className="px-2 py-2 text-right text-gray-900 border-r border-gray-200 border-b">{formatAmount(Number(row.cost))}</td>
                        <td className="px-2 py-2 text-right text-green-600 font-medium border-r border-gray-200 border-b">{formatAmount(Number(row.margin))}</td>
                        <td className="px-2 py-2 text-right text-[#49293e] font-medium border-b">{formatAmount(Number(row.marginPer))}</td>
                      </tr>
                    ))
                  )}
                </tbody>

                {data.totals && data.rows.length > 0 && (
                  <tfoot className="sticky bottom-0 bg-gray-100 shadow-[inset_0_1px_0_rgba(0,0,0,0.06)] z-10">
                    <tr>
                      <td colSpan={6} className="px-2 py-2 text-center font-bold text-gray-700 border-r border-gray-200">TOTAL</td>
                      <td className="px-2 py-2 text-right font-bold tabular-nums text-gray-900 border-r border-gray-200">{formatAmount(Number(data.totals.netValue))}</td>
                      <td className="px-2 py-2 text-right font-bold tabular-nums text-gray-900 border-r border-gray-200">{formatAmount(Number(data.totals.cost))}</td>
                      <td className="px-2 py-2 text-right font-bold tabular-nums text-green-700 border-r border-gray-200">{formatAmount(Number(data.totals.margin))}</td>
                      <td className="px-2 py-2 text-right font-bold tabular-nums text-[#49293e]">{formatAmount(Number(data.totals.marginper))}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
        </div>

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
