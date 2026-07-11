import { forwardRef, useMemo, Fragment } from "react";
import { X, Download, Printer } from "lucide-react";
import { Button } from "../../../../components/common";
import { formatAmount } from "../../../../utils/currency";
import type { AllTransactionReportData } from "../types";

interface PrintData {
  reportData: AllTransactionReportData[];
  totalAmount: number;
  filters: any;
  companyName: string;
  companyAddress: string;
}

interface AllTransactionReportPrintPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: PrintData;
  onExportPDF: () => void;
}

const PRINT_STYLES = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #ffffff; font-family: "Helvetica Neue", Helvetica, Arial, sans-serif; font-size: 11px; color: #1e293b; padding: 20px; }
  .text-center { text-align: center; }
  .text-left { text-align: left; }
  .text-right { text-align: right; }
  .font-bold { font-weight: bold; }
  .header-container { text-align: center; margin-bottom: 25px; line-height: 1.4; }
  .company-name { font-size: 18px; font-weight: bold; text-transform: uppercase; color: #000000; margin-bottom: 4px; }
  .company-address { font-size: 9px; color: #475569; margin-bottom: 8px; font-weight: bold; }
  .report-title { font-size: 12px; font-weight: bold; text-decoration: underline; margin-top: 10px; color: #000000; }
  table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 10px; }
  th, td { padding: 6px 8px; border: none; }
  th { background-color: #49293e; color: #ffffff; font-weight: bold; font-size: 10px; }
  tr { border-bottom: 0.5px solid #e2e8f0; }
  tr:last-child { border-bottom: none; }
  .bg-zebra { background-color: #f8fafc; }
  .footer-row td { border-top: 1.5px solid #cbd5e1; border-bottom: none; font-weight: bold; background-color: #ffffff; padding: 8px; }
  @media print {
    body { padding: 0; }
    @page { size: A4 portrait; margin: 15mm; }
  }
`;

const formatHeaderDate = (dateStr: string) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

// ─── Print HTML Template ──────────────────────────────────────────────────────
const AllTransactionReportPrintTemplate = forwardRef<HTMLDivElement, { data: PrintData }>(
  ({ data }, ref) => {
    
    const groupedData = useMemo(() => {
      if (!data.reportData || data.reportData.length === 0) return [];
      const groups: { voucher: string; items: any[]; total: number }[] = [];
      const balances: { voucher: string; items: any[]; total: number } = { voucher: "Balance", items: [], total: 0 };
      
      data.reportData.forEach((row) => {
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
      if (balances.items.length > 0) groups.push(balances);
      return groups;
    }, [data.reportData]);

    return (
      <div ref={ref} className="bg-white p-8 w-full max-w-[850px] shadow-sm font-sans text-slate-800 leading-relaxed mx-auto">
        {/* Header */}
        <div className="header-container text-center mb-6">
          <div className="company-name text-lg font-bold uppercase text-black mb-1">{data.companyName}</div>
          <div className="company-address text-[9px] font-bold text-slate-500 mb-2 uppercase">{data.companyAddress}</div>
          <div className="report-title text-xs font-bold underline text-black mt-2">
            All Transaction Report From {formatHeaderDate(data.filters.fromDate)} To {formatHeaderDate(data.filters.toDate)}
          </div>
        </div>

        {/* Table */}
        <table className="w-full border-collapse mt-4 text-[10px]">
          <thead>
            <tr className="bg-[#49293e] text-white">
              <th className="text-center font-bold p-2 text-[10px] bg-[#49293e] text-white border-none w-[10%]">SNo</th>
              <th className="text-left font-bold p-2 text-[10px] bg-[#49293e] text-white border-none w-[60%]">Particular</th>
              <th className="text-right font-bold p-2 text-[10px] bg-[#49293e] text-white border-none w-[30%]">Amount</th>
            </tr>
          </thead>
          <tbody>
            {data.reportData.length === 0 ? (
              <tr>
                <td colSpan={3} className="text-center py-10 text-slate-400">
                  No records found.
                </td>
              </tr>
            ) : (
              groupedData.map((group, gIdx) => {
                const isBalance = group.voucher.toLowerCase().includes("balance");
                return (
                  <Fragment key={gIdx}>
                    {isBalance && (
                      <tr>
                        <td colSpan={3} className="border-t border-dashed border-slate-400 py-1" />
                      </tr>
                    )}
                    {group.items.map((row, iIdx) => (
                      <tr key={`${gIdx}-${iIdx}`} className="border-b border-slate-100 bg-white">
                        <td className="text-center p-2 text-[10px] text-slate-800 tabular-nums">
                          {iIdx === 0 && !isBalance ? gIdx + 1 : ""}
                        </td>
                        <td className="text-left p-2 text-[10px] text-slate-700">{row.particular || "-"}</td>
                        <td className="text-right p-2 text-[10px] text-slate-900 font-semibold tabular-nums">
                          {formatAmount(Number(row.amount || 0))}
                        </td>
                      </tr>
                    ))}
                    {!isBalance && (
                      <tr className="font-bold bg-[#f3e8ff]">
                        <td className="p-2 border-none"></td>
                        <td className="text-center p-2 text-[10px] text-[#49293e] border-none font-bold">Total {group.voucher}</td>
                        <td className="text-right p-2 text-[11px] text-[#49293e] font-bold tabular-nums border-none">
                          {formatAmount(group.total)}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    );
  }
);

AllTransactionReportPrintTemplate.displayName = "AllTransactionReportPrintTemplate";

// ─── Modal Container ──────────────────────────────────────────────────────────
export const AllTransactionReportPrintPreviewModal = ({
  isOpen,
  onClose,
  data,
  onExportPDF,
}: AllTransactionReportPrintPreviewModalProps) => {
  const printTemplateRef = useMemo(() => {
    return { current: null as HTMLDivElement | null };
  }, []);

  const handlePrint = () => {
    if (!printTemplateRef.current) return;
    const win = window.open("", "_blank", "width=900,height=750");
    if (!win) {
      alert("Please allow popups for this site to enable printing.");
      return;
    }
    win.document.open();
    win.document.write(`<!DOCTYPE html>
<html>
  <head>
    <title>All Transaction Report Print</title>
    <style>${PRINT_STYLES}</style>
  </head>
  <body>
    ${printTemplateRef.current.innerHTML}
    <script>
      window.onload = function() {
        setTimeout(function() { 
          window.print(); 
          window.close();
        }, 300);
      };
    </script>
  </body>
</html>`);
    win.document.close();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Box */}
      <div
        className="relative flex flex-col bg-slate-100 rounded-xl shadow-2xl z-10 animate-[fadeIn_0.15s_ease-in-out]"
        style={{ width: "95vw", maxWidth: "1000px", maxHeight: "90vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Toolbar */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-white border-b rounded-t-xl shrink-0">
          <h2 className="text-base font-bold text-[#49293e]">Print Preview</h2>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={handlePrint}
              icon={<Printer size={15} />}
              className="flex items-center gap-1.5"
            >
              Print
            </Button>
            <Button
              size="sm"
              variant="danger"
              onClick={onExportPDF}
              icon={<Download size={15} />}
              className="flex items-center gap-1.5"
            >
              PDF
            </Button>
            <div className="w-px h-5 bg-gray-200 mx-1" />
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-slate-100 rounded-full text-slate-500 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Scrollable Preview Wrapper */}
        <div className="flex-1 overflow-y-auto p-6 flex justify-center bg-slate-200 rounded-b-xl min-h-0">
          <AllTransactionReportPrintTemplate ref={printTemplateRef as any} data={data} />
        </div>
      </div>
    </div>
  );
};
