import { forwardRef, useMemo } from "react";
import { X, Download, Printer } from "lucide-react";
import { Button } from "../../../../components/common";
import { formatAmount } from "../../../../utils/currency";

interface PrintData {
  purchaseData: any[];
  cashTotal: number;
  creditTotal: number;
  grandTotal: number;
  filters: any;
  companyName: string;
  companyAddress: string;
}

interface PurchaseReportPrintPreviewModalProps {
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
const PurchaseReportPrintTemplate = forwardRef<HTMLDivElement, { data: PrintData }>(
  ({ data }, ref) => {
    return (
      <div ref={ref} className="bg-white p-8 w-full max-w-[850px] shadow-sm font-sans text-slate-800 leading-relaxed mx-auto">
        {/* Header */}
        <div className="header-container text-center mb-6">
          <div className="company-name text-lg font-bold uppercase text-black mb-1">{data.companyName}</div>
          <div className="company-address text-[9px] font-bold text-slate-500 mb-2 uppercase">{data.companyAddress}</div>
          <div className="report-title text-xs font-bold underline text-black mt-2">
            Purchase Report From {formatHeaderDate(data.filters.fromDate)} To {formatHeaderDate(data.filters.toDate)}
          </div>
        </div>

        {/* Table */}
        <table className="w-full border-collapse mt-4 text-[10px]">
          <thead>
            <tr className="bg-[#49293e] text-white">
              <th className="text-left font-bold p-2 text-[10px] bg-[#49293e] text-white border-none w-[14%]">BillDate</th>
              <th className="text-center font-bold p-2 text-[10px] bg-[#49293e] text-white border-none w-[8%]">BillNo</th>
              <th className="text-center font-bold p-2 text-[10px] bg-[#49293e] text-white border-none w-[8%]">Ref No</th>
              <th className="text-left font-bold p-2 text-[10px] bg-[#49293e] text-white border-none w-[28%]">Supplier</th>
              <th className="text-center font-bold p-2 text-[10px] bg-[#49293e] text-white border-none w-[10%]">Paymode</th>
              <th className="text-right font-bold p-2 text-[10px] bg-[#49293e] text-white border-none w-[10%]">Net Value</th>
              <th className="text-right font-bold p-2 text-[10px] bg-[#49293e] text-white border-none w-[10%]">Vat Amount</th>
              <th className="text-right font-bold p-2 text-[10px] bg-[#49293e] text-white border-none w-[12%]">Amount</th>
            </tr>
          </thead>
          <tbody>
            {data.purchaseData.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-10 text-slate-400">
                  No records found.
                </td>
              </tr>
            ) : (
              data.purchaseData.map((row, idx) => (
                <tr key={idx} className={`border-b border-slate-100 ${idx % 2 === 1 ? "bg-slate-50/80" : "bg-white"}`}>
                  <td className="text-left p-2 text-[10px] text-slate-800 whitespace-nowrap">
                    {row.invoiceDate ? formatHeaderDate(row.invoiceDate) : ""}
                  </td>
                  <td className="text-center p-2 text-[10px] text-slate-800 font-mono">{row.invoiceNo || ""}</td>
                  <td className="text-center p-2 text-[10px] text-slate-500">{row.refNo || ""}</td>
                  <td className="text-left p-2 text-[10px] text-slate-800 font-medium uppercase">{row.supplierName || ""}</td>
                  <td className="text-center p-2 text-[10px] text-slate-800 font-medium uppercase">{row.paymode || ""}</td>
                  <td className="text-right p-2 text-[10px] text-slate-800 tabular-nums">{formatAmount(Number(row.netValue || 0))}</td>
                  <td className="text-right p-2 text-[10px] text-slate-800 tabular-nums">{formatAmount(Number(row.vatAmount || 0))}</td>
                  <td className="text-right p-2 text-[10px] text-slate-900 font-semibold tabular-nums">{formatAmount(Number(row.netAmount || 0))}</td>
                </tr>
              ))
            )}
            {/* Footer Summary Row */}
            {data.purchaseData.length > 0 && (
              <tr className="footer-row font-bold bg-white">
                <td colSpan={6} className="text-left p-2 text-[10px] text-slate-900 font-bold bg-white border-t border-slate-200">
                  Cash: <span className="text-slate-900">{formatAmount(data.cashTotal)}</span>
                  <span className="mx-3 text-slate-300">|</span>
                  Credit: <span className="text-slate-900">{formatAmount(data.creditTotal)}</span>
                </td>
                <td className="text-right uppercase p-2 text-[9px] tracking-wider text-slate-500 font-bold bg-white border-t border-slate-200">
                  Total
                </td>
                <td className="text-right text-slate-900 text-[11px] font-bold tabular-nums p-2 bg-white border-t border-slate-200">
                  {formatAmount(data.grandTotal)}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    );
  }
);

PurchaseReportPrintTemplate.displayName = "PurchaseReportPrintTemplate";

// ─── Modal Container ──────────────────────────────────────────────────────────
export const PurchaseReportPrintPreviewModal = ({
  isOpen,
  onClose,
  data,
  onExportPDF,
}: PurchaseReportPrintPreviewModalProps) => {
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
    <title>Purchase Report Print</title>
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
    <\/script>
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
          <PurchaseReportPrintTemplate ref={printTemplateRef as any} data={data} />
        </div>
      </div>
    </div>
  );
};
