import { useMemo, useState, Fragment } from "react";
import { useNavigate } from "react-router-dom";
import { X, Printer, Download } from "lucide-react";
import { useAllTransactionReport } from "../hooks/useAllTransactionReport";
import { formatAmount } from "../../../../utils/currency";
import { exportAllTransactionReportPDF, exportAllTransactionReportExcel } from "../utils/exportUtils";
import { AllTransactionReportPrintPreviewModal } from "../components/AllTransactionReportPrintPreviewModal";
import {
  PageShell,
  FormInput,
  SearchableSelect,
  ResetButton,
  Button
} from "../../../../components/common";

const AllTransactionReportPage = () => {
  const navigate = useNavigate();
  const { filters, branches, reportData, isLoading, handleReset } = useAllTransactionReport();
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const branchOptions = useMemo(() => {
    return [
      { label: "All", value: "0" },
      ...branches
        .filter(b => b.branchName.toLowerCase() !== "all" && String(b.id) !== "0")
        .map(b => ({
          label: b.branchName,
          value: String(b.id)
        }))
    ];
  }, [branches]);

  const totalAmount = useMemo(() => {
    return (reportData || []).reduce((acc, row) => acc + (Number(row.amount) || 0), 0);
  }, [reportData]);

  const groupedData = useMemo(() => {
    if (!reportData || reportData.length === 0) return [];
    
    const groups: { voucher: string; items: any[]; total: number }[] = [];
    const balances: { voucher: string; items: any[]; total: number } = { voucher: "Balance", items: [], total: 0 };
    
    reportData.forEach((row) => {
      const v = row.voucher || "Unknown";
      if (v.toLowerCase().includes("balance")) {
        balances.items.push(row);
        balances.total += Number(row.amount) || 0;
      } else {
        let existing = groups.find(g => g.voucher === v);
        if (!existing) {
          existing = { voucher: v, items: [], total: 0 };
          groups.push(existing);
        }
        existing.items.push(row);
        existing.total += Number(row.amount) || 0;
      }
    });

    if (balances.items.length > 0) {
      groups.push(balances);
    }

    return groups;
  }, [reportData]);

  const handleExportPDF = () => {
    exportAllTransactionReportPDF(reportData || [], totalAmount, {
      ...filters,
      branchName: branchOptions.find(o => o.value === filters.branchId)?.label || "All",
    });
  };

  const handleExportExcel = () => {
    exportAllTransactionReportExcel(reportData || [], totalAmount, {
      ...filters,
      branchName: branchOptions.find(o => o.value === filters.branchId)?.label || "All",
    });
  };

  return (
    <PageShell title="All Transaction Report">
      <div className="flex flex-col h-auto md:h-[calc(100vh-92px)] md:overflow-hidden p-1 gap-3 relative">
        
        {/* ── Filter Panel ────────────────── */}
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
            
            {/* Location */}
            <div className="shrink-0 flex flex-col gap-2 justify-center pr-4">
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-gray-500 w-14 text-right shrink-0">Location</span>
                <div className="w-48">
                  <SearchableSelect 
                    id="atr-branch" 
                    options={branchOptions} 
                    value={filters.branchId} 
                    onChange={filters.setBranchId} 
                    placeholder="All" 
                  />
                </div>
              </div>
            </div>

            {/* Dates */}
            <div className="pt-3 xl:pt-0 xl:pl-3 flex flex-col gap-2 shrink-0 justify-start">
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-gray-500 w-8 text-right shrink-0">From</span>
                <div className="w-36">
                  <FormInput 
                    id="atr-from-date" 
                    type="date" 
                    value={filters.fromDate} 
                    onChange={(e) => filters.setFromDate(e.target.value)} 
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-gray-500 w-8 text-right shrink-0">To</span>
                <div className="w-36">
                  <FormInput 
                    id="atr-to-date" 
                    type="date" 
                    value={filters.toDate} 
                    onChange={(e) => filters.setToDate(e.target.value)} 
                  />
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* ── Table Card ─────── */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col flex-1 min-h-0">
          
          {!(isLoading) && (reportData || []).length > 0 && (
            <p className="text-center text-[11px] font-semibold text-[#49293e] py-1.5 border-b border-gray-100 shrink-0">
              All Transaction Report from {filters.fromDate} To {filters.toDate}
            </p>
          )}

          <div className="overflow-x-auto overflow-y-auto flex-1 min-h-0">
            <table className="w-full text-xs table-layout-fixed min-w-[600px]">
              <thead className="sticky top-0 z-10 bg-gray-100 shadow-[0_1px_0_rgba(0,0,0,0.05)]">
                <tr>
                  <th className="px-2 py-2 font-semibold text-gray-700 text-[11px] tracking-wide border-r border-gray-200 w-[10%] text-center">SNo</th>
                  <th className="px-4 py-2 font-semibold text-gray-700 text-[11px] tracking-wide border-r border-gray-200 w-[60%] text-left">Particular</th>
                  <th className="px-4 py-2 font-semibold text-gray-700 text-[11px] tracking-wide w-[30%] text-right">Amount</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="px-2 py-2 border-r border-gray-100"><div className="h-3 bg-gray-100 rounded" /></td>
                      <td className="px-4 py-2 border-r border-gray-100"><div className="h-3 bg-gray-100 rounded" /></td>
                      <td className="px-4 py-2"><div className="h-3 bg-gray-100 rounded" /></td>
                    </tr>
                  ))
                ) : (reportData || []).length === 0 ? (
                  <tr>
                    <td colSpan={3} className="text-center py-20 text-gray-400 text-sm">
                      No records found. Adjust filters.
                    </td>
                  </tr>
                ) : (
                  groupedData.map((group, gIdx) => {
                    const isBalance = group.voucher.toLowerCase().includes("balance");
                    return (
                      <Fragment key={gIdx}>
                        {isBalance && (
                          <tr>
                            <td colSpan={3} className="border-t border-dashed border-gray-400 py-0.5" />
                          </tr>
                        )}
                        {group.items.map((row, iIdx) => (
                          <tr key={`${gIdx}-${iIdx}`} className={`hover:bg-[#49293e]/5 transition-colors bg-white`}>
                            <td className="px-2 py-2 text-center text-gray-700 border-r border-gray-100 font-medium">
                              {iIdx === 0 && !isBalance ? gIdx + 1 : ""}
                            </td>
                            <td className="px-4 py-2 text-left text-gray-700 border-r border-gray-100">{row.particular || "-"}</td>
                            <td className="px-4 py-2 text-right tabular-nums text-[#49293e] font-semibold">{formatAmount(Number(row.amount))}</td>
                          </tr>
                        ))}
                        {!isBalance && (
                          <tr className="bg-[#49293e]/10">
                            <td className="px-2 py-2 border-r border-gray-100" />
                            <td className="px-4 py-2 text-center font-bold text-[#49293e] border-r border-gray-100">Total {group.voucher}</td>
                            <td className="px-4 py-2 text-right font-bold tabular-nums text-[#49293e]">{formatAmount(group.total)}</td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Sticky Bottom Summary / Actions Bar ──────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-4 py-2 shrink-0 flex items-center justify-between">
          <div className="flex items-center gap-5 text-xs font-medium text-gray-600">
            {/* Optional extra summary info can go here */}
          </div>

          <div className="flex items-center gap-3">
            {(reportData || []).length > 0 && (
              <span className="text-xs text-gray-400">
                {(reportData || []).length} record{(reportData || []).length !== 1 ? "s" : ""}
              </span>
            )}
            <div className="h-4 w-px bg-gray-200" />
            <Button
              size="sm"
              icon={<Printer size={15} />}
              onClick={() => setIsPreviewOpen(true)}
              disabled={isLoading || (reportData || []).length === 0}
            >
              Print Preview
            </Button>
            <Button
              size="sm"
              onClick={handleExportExcel}
              disabled={isLoading || (reportData || []).length === 0}
              icon={<Download size={15} />}
              className="!bg-green-600 !border-green-600 hover:!bg-green-700 !text-white"
            >
              XLS
            </Button>
          </div>
        </div>

      </div>

      <AllTransactionReportPrintPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        onExportPDF={() => {
          handleExportPDF();
          setIsPreviewOpen(false);
        }}
        data={{
          reportData: reportData || [],
          totalAmount: totalAmount,
          filters: filters,
          companyName: localStorage.getItem("companyName") || "FEKRA advertising",
          companyAddress: localStorage.getItem("companyAddress") || "NEAR NESTO BESIDE BIN RASHIED SOUQ MABELA BUILDING NO 211 SECOND FLOOR FLAT NO 21"
        }}
      />
    </PageShell>
  );
};

export default AllTransactionReportPage;
