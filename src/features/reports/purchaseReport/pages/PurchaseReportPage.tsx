import { useNavigate } from "react-router-dom";
import { useMemo, useState, useCallback } from "react";
import { Printer, X, Download } from "lucide-react";
import { usePurchaseReport } from "../hooks/usePurchaseReport";
import { exportPurchaseReportPDF, exportPurchaseReportExcel } from "../utils/purchaseExportUtils";
import { formatAmount } from "../../../../utils/currency";
import {
  PageShell,
  FormInput,
  Button,
  SelectInput,
  SearchableSelect,
  Checkbox,
  ResetButton
} from "../../../../components/common";
import { PurchaseReportPrintPreviewModal } from "../components/PurchaseReportPrintPreviewModal";

// ─── Group-by options ──────────────────────────────────────────────────────────
type GroupByOption = "All" | "Supplier" | "Paymode" | "Series";

const GROUP_LABEL: Record<GroupByOption, string> = {
  All: "All",
  Supplier: "Supplier",
  Paymode: "Paymode",
  Series: "Series",
};

// ─── Table Columns (Percentage Widths to Ensure Perfect Alignment) ─────────────
const COLS = [
  { key: "sno",        label: "SNo",        cls: "w-[3%] text-center" },
  { key: "billDate",   label: "BillDate",   cls: "w-[12%] text-left" },
  { key: "billNo",     label: "BillNo",     cls: "w-[6%] text-center" },
  { key: "refNo",      label: "Ref No",     cls: "w-[6%] text-center" },
  { key: "supplier",   label: "Supplier",   cls: "w-[20%] text-left" },
  { key: "code",       label: "Code",       cls: "w-[6%] text-center" },
  { key: "employee",   label: "Employee",   cls: "w-[8%] text-center" },
  { key: "paymode",    label: "Paymode",    cls: "w-[7%] text-center" },
  { key: "netValue",   label: "Net Value",  cls: "w-[8%] text-right" },
  { key: "vatAmnt",    label: "Vat Amnt",   cls: "w-[7%] text-right" },
  { key: "billsundry", label: "Billsundry", cls: "w-[5%] text-right" },
  { key: "roundOff",   label: "RoundOff",   cls: "w-[4%] text-right" },
  { key: "amount",     label: "Amount",     cls: "w-[8%] text-right" },
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

const PurchaseReportPage = () => {
  const navigate = useNavigate();
  const { filters, masterData, report } = usePurchaseReport();
  const [groupBy, setGroupBy] = useState<GroupByOption>("All");
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const handleReset = () => {
    filters.resetFilters();
    setGroupBy("All");
  };

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

  const paymodeOptions = useMemo(() => [
    { label: "All", value: "0" },
    ...masterData.paymodes.map(p => ({ label: p.paymodeName, value: String(p.paymodeId) })),
  ], [masterData.paymodes]);

  const seriesOptions = useMemo(() => [
    { label: "All", value: "0" },
    ...masterData.series.map((s: any) => ({ label: s.seriesName, value: String(s.seriesId) })),
  ], [masterData.series]);

  // ─── Client-side grouping ──────────────────────────────────────────────────
  const groupedPurchaseData = useMemo(() => {
    const rawData = report.purchaseData;
    if (groupBy === "All") return rawData;

    if (groupBy === "Supplier") {
      const groups: Record<string, any> = {};
      rawData.forEach((row: any) => {
        const key = row.supplierName || "Unknown";
        if (!groups[key]) {
          groups[key] = {
            invoiceDate: "",
            invoiceNo: "",
            refNo: "",
            supplierName: row.supplierName || "Unknown Supplier",
            supplierCode: row.supplierCode || "",
            employee: "",
            paymode: "",
            netValue: 0,
            vatAmount: 0,
            billsundry: 0,
            roundOff: 0,
            netAmount: 0,
          };
        }
        groups[key].netValue += Number(row.netValue || 0);
        groups[key].vatAmount += Number(row.vatAmount || 0);
        groups[key].billsundry += Number(row.billsundry || 0);
        groups[key].roundOff += Number(row.roundOff || 0);
        groups[key].netAmount += Number(row.netAmount || 0);
      });
      return Object.values(groups);
    }

    if (groupBy === "Paymode") {
      const groups: Record<string, any> = {};
      rawData.forEach((row: any) => {
        const key = row.paymode || "Unknown";
        if (!groups[key]) {
          groups[key] = {
            invoiceDate: "",
            invoiceNo: "",
            refNo: "",
            supplierName: "",
            supplierCode: "",
            employee: "",
            paymode: row.paymode || "Unknown",
            netValue: 0,
            vatAmount: 0,
            billsundry: 0,
            roundOff: 0,
            netAmount: 0,
          };
        }
        groups[key].netValue += Number(row.netValue || 0);
        groups[key].vatAmount += Number(row.vatAmount || 0);
        groups[key].billsundry += Number(row.billsundry || 0);
        groups[key].roundOff += Number(row.roundOff || 0);
        groups[key].netAmount += Number(row.netAmount || 0);
      });
      return Object.values(groups);
    }

    if (groupBy === "Series") {
      const groups: Record<string, any> = {};
      rawData.forEach((row: any) => {
        const prefixMatch = row.invoiceNo?.match(/^([a-zA-Z\s_-]+)/);
        const key = prefixMatch ? prefixMatch[1].trim() : "Main";
        if (!groups[key]) {
          groups[key] = {
            invoiceDate: "",
            invoiceNo: key,
            refNo: "",
            supplierName: "",
            supplierCode: "",
            employee: "",
            paymode: "",
            netValue: 0,
            vatAmount: 0,
            billsundry: 0,
            roundOff: 0,
            netAmount: 0,
          };
        }
        groups[key].netValue += Number(row.netValue || 0);
        groups[key].vatAmount += Number(row.vatAmount || 0);
        groups[key].billsundry += Number(row.billsundry || 0);
        groups[key].roundOff += Number(row.roundOff || 0);
        groups[key].netAmount += Number(row.netAmount || 0);
      });
      return Object.values(groups);
    }

    return rawData;
  }, [report.purchaseData, groupBy]);

  const handleExportPDF = useCallback(() => {
    exportPurchaseReportPDF(groupedPurchaseData, report.paymodeData, report.totalData, {
      ...filters,
      branchName:   branchOptions.find(o => o.value === filters.branchId)?.label,
      supplierName: supplierOptions.find(o => o.value === filters.supplierId)?.label,
      paymodeName:  paymodeOptions.find(o => o.value === filters.paymodeId)?.label,
    });
  }, [filters, branchOptions, supplierOptions, paymodeOptions, report, groupedPurchaseData]);

  const handleExportExcel = useCallback(() => {
    exportPurchaseReportExcel(groupedPurchaseData, report.paymodeData, report.totalData, {
      ...filters,
      branchName:   branchOptions.find(o => o.value === filters.branchId)?.label,
      supplierName: supplierOptions.find(o => o.value === filters.supplierId)?.label,
      paymodeName:  paymodeOptions.find(o => o.value === filters.paymodeId)?.label,
    });
  }, [filters, branchOptions, supplierOptions, paymodeOptions, report, groupedPurchaseData]);

  // ─── Grand totals ──────────────────────────────────────────────────────────
  const grandTotals = useMemo(() => ({
    netValue:   groupedPurchaseData.reduce((s, r) => s + Number(r.netValue  || 0), 0),
    vatAmount:  groupedPurchaseData.reduce((s, r) => s + Number(r.vatAmount || 0), 0),
    netAmount:  groupedPurchaseData.reduce((s, r) => s + Number(r.netAmount || 0), 0),
    billsundry: groupedPurchaseData.reduce((s, r) => s + Number(r.billsundry || 0), 0),
    roundOff:   groupedPurchaseData.reduce((s, r) => s + Number(r.roundOff   || 0), 0),
  }), [groupedPurchaseData]);

  const cashTotal   = useMemo(() => report.purchaseData.filter(r =>  r.paymode?.toLowerCase().includes("cash")).reduce((s, r) => s + Number(r.netAmount || 0), 0), [report.purchaseData]);
  const creditTotal = useMemo(() => report.purchaseData.filter(r => r.paymode && !r.paymode.toLowerCase().includes("cash")).reduce((s, r) => s + Number(r.netAmount || 0), 0), [report.purchaseData]);

  const previewData = useMemo(() => ({
    purchaseData: groupedPurchaseData,
    cashTotal,
    creditTotal,
    grandTotal: grandTotals.netAmount,
    filters,
    companyName: localStorage.getItem("companyName") || "FEKRA advertising",
    companyAddress: localStorage.getItem("companyAddress") || "NEAR NESTO BESIDE BIN RASHIED SOUQ MABELA BUILDING NO 211 SECOND FLOOR FLAT NO 21",
  }), [groupedPurchaseData, cashTotal, creditTotal, grandTotals.netAmount, filters]);

  return (
    <PageShell title="Purchase Report">
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

            {/* 1. Group-By Filter */}
            <div className="shrink-0 flex flex-col gap-0.5 pr-4 justify-center">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Group By</span>
              {(["All", "Supplier", "Paymode", "Series"] as GroupByOption[]).map((val) => (
                <div key={val} className="h-7 flex items-center">
                  <Checkbox
                    id={`pr-group-${val}`}
                    label={GROUP_LABEL[val]}
                    checked={groupBy === val}
                    onChange={() => setGroupBy(val)}
                  />
                </div>
              ))}
            </div>

            {/* 2. Location + Series */}
            <div className="pt-3 xl:pt-0 xl:px-3 flex flex-col gap-2 shrink-0 justify-start">
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-gray-500 w-14 text-right shrink-0">Location</span>
                <div className="w-40">
                  <SearchableSelect id="pr-branch" options={branchOptions} value={filters.branchId} onChange={filters.setBranchId} disabled={filters.isBranchLocked} placeholder="All" autoFocus={true} />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-gray-500 w-14 text-right shrink-0">Series</span>
                <div className="w-40">
                  <SelectInput id="pr-series" options={seriesOptions} value={filters.seriesId} onChange={(e) => filters.setSeriesId(e.target.value)} />
                </div>
              </div>
            </div>

            {/* 3. Supplier + Paymode */}
            <div className="pt-3 xl:pt-0 xl:px-3 flex flex-col gap-2 shrink-0 justify-start">
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-gray-500 w-14 text-right shrink-0">Supplier</span>
                <div className="w-44">
                  <SearchableSelect id="pr-supplier" options={supplierOptions} value={filters.supplierId} onChange={filters.setSupplierId} placeholder="All" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-gray-500 w-14 text-right shrink-0">Paymode</span>
                <div className="w-44">
                  <SelectInput id="pr-paymode" options={paymodeOptions} value={filters.paymodeId} onChange={(e) => filters.setPaymodeId(e.target.value)} />
                </div>
              </div>
            </div>

            {/* 4. Dates */}
            <div className="pt-3 xl:pt-0 xl:pl-3 flex flex-col gap-2 shrink-0 justify-start">
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-gray-500 w-8 text-right shrink-0">From</span>
                <div className="w-36">
                  <FormInput id="pr-from-date" type="date" value={filters.fromDate} onChange={(e) => filters.setFromDate(e.target.value)} />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-gray-500 w-8 text-right shrink-0">To</span>
                <div className="w-36">
                  <FormInput id="pr-to-date" type="date" value={filters.toDate} onChange={(e) => filters.setToDate(e.target.value)} />
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* ── Table Card ──────────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col flex-1 min-h-0">
          {!report.isLoading && groupedPurchaseData.length > 0 && (
            <p className="text-center text-[11px] font-semibold text-[#49293e] py-1.5 border-b border-gray-100 shrink-0">
              Purchase Report from {filters.fromDate} To {filters.toDate}
            </p>
          )}

          <div className="overflow-x-auto overflow-y-auto flex-1 min-h-0">
            <table className="w-full text-xs min-w-[1100px] table-layout-fixed">
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
                      <td className="px-2 py-1.5 text-center text-gray-500 border-r border-gray-100">{idx + 1}</td>
                      <td className="px-2 py-1.5 text-left text-gray-800 border-r border-gray-100 tabular-nums whitespace-nowrap">
                        {row.invoiceDate ? formatDate(row.invoiceDate) : ""}
                      </td>
                      <td className="px-2 py-1.5 text-center font-mono text-gray-800 border-r border-gray-100">{row.invoiceNo}</td>
                      <td className="px-2 py-1.5 text-center text-gray-500 border-r border-gray-100">{row.refNo || ""}</td>
                      <td className="px-2 py-1.5 text-left font-medium uppercase text-gray-800 border-r border-gray-100">{row.supplierName || ""}</td>
                      <td className="px-2 py-1.5 text-center text-gray-500 border-r border-gray-100">{row.supplierCode || ""}</td>
                      <td className="px-2 py-1.5 text-center text-gray-500 border-r border-gray-100">{row.employee || ""}</td>
                      <td className="px-2 py-1.5 text-center font-medium uppercase text-gray-700 border-r border-gray-100">{row.paymode || ""}</td>
                      <td className="px-2 py-1.5 text-right tabular-nums text-gray-800 border-r border-gray-100">{formatAmount(Number(row.netValue || 0))}</td>
                      <td className="px-2 py-1.5 text-right tabular-nums text-gray-700 border-r border-gray-100">{formatAmount(Number(row.vatAmount || 0))}</td>
                      <td className="px-2 py-1.5 text-right tabular-nums text-gray-700 border-r border-gray-100">{formatAmount(Number(row.billsundry || 0))}</td>
                      <td className="px-2 py-1.5 text-right tabular-nums text-gray-700 border-r border-gray-100">{formatAmount(Number(row.roundOff || 0))}</td>
                      <td className="px-2 py-1.5 text-right tabular-nums font-semibold text-[#49293e]">{formatAmount(Number(row.netAmount || 0))}</td>
                    </tr>
                  ))
                )}
              </tbody>

              {!report.isLoading && groupedPurchaseData.length > 0 && (
                <tfoot className="sticky bottom-0 z-10 bg-gray-100 border-t-2 border-t-[#49293e]/20 shadow-[0_-1px_0_rgba(0,0,0,0.05)]">
                  <tr>
                    <td className="py-1.5 border-r border-gray-200" />
                    <td className="border-r border-gray-200" />
                    <td className="border-r border-gray-200" />
                    <td className="border-r border-gray-200" />
                    <td className="border-r border-gray-200" />
                    <td className="border-r border-gray-200" />
                    <td className="border-r border-gray-200" />
                    <td className="border-r border-gray-200" />
                    <td className="px-2 py-1.5 text-right font-bold tabular-nums text-gray-900 border-r border-gray-200">{formatAmount(grandTotals.netValue)}</td>
                    <td className="px-2 py-1.5 text-right font-bold tabular-nums text-gray-900 border-r border-gray-200">{formatAmount(grandTotals.vatAmount)}</td>
                    <td className="px-2 py-1.5 text-right font-bold tabular-nums text-gray-900 border-r border-gray-200">{formatAmount(grandTotals.billsundry)}</td>
                    <td className="px-2 py-1.5 text-right font-bold tabular-nums text-gray-900 border-r border-gray-200">{formatAmount(grandTotals.roundOff)}</td>
                    <td className="px-2 py-1.5 text-right font-bold tabular-nums text-[#49293e] text-sm">{formatAmount(grandTotals.netAmount)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

        {/* ── Sticky Bottom Summary / Actions Bar ─────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-4 py-2 shrink-0 flex items-center justify-between">
          <div className="flex items-center gap-5 text-xs font-medium text-gray-600">
            <span>
              Cash:{" "}
              <span className="font-bold text-green-700 tabular-nums ml-1">{formatAmount(cashTotal)}</span>
            </span>
            <span>
              Credit:{" "}
              <span className="font-bold text-[#49293e] tabular-nums ml-1">{formatAmount(creditTotal)}</span>
            </span>
          </div>

          <div className="flex items-center gap-3">
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
        </div>

        <PurchaseReportPrintPreviewModal
          isOpen={isPreviewOpen}
          onClose={() => setIsPreviewOpen(false)}
          data={previewData}
          onExportPDF={handleExportPDF}
        />

      </div>
    </PageShell>
  );
};

export default PurchaseReportPage;
