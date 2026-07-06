import React, { useRef } from "react";
import { Printer, X, Download } from "lucide-react";
import { Button } from "../../../../components/common";
import type { ProductTransactionLogRecord, ProductTransactionLogTotals } from "../types";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onExportPDF: () => void;
  data: {
    logData: ProductTransactionLogRecord[];
    totalData: ProductTransactionLogTotals;
    filters: any;
    companyName: string;
    companyAddress: string;
  };
}

const PRINT_STYLES = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #fff; font-family: "Helvetica Neue", Helvetica, Arial, sans-serif; font-size: 10px; color: #1e293b; padding: 20px; }
  .text-center { text-align: center; }
  .text-left { text-align: left; }
  .text-right { text-align: right; }
  .font-bold { font-weight: bold; }
  .company-name { font-size: 16px; font-weight: bold; text-transform: uppercase; text-align: center; margin-bottom: 3px; }
  .company-address { font-size: 8px; color: #475569; text-align: center; margin-bottom: 6px; }
  .report-title { font-size: 11px; font-weight: bold; text-decoration: underline; text-align: center; margin-bottom: 16px; }
  table { width: 100%; border-collapse: collapse; font-size: 9px; }
  th { background-color: #49293e; color: #fff; font-weight: bold; padding: 5px 6px; }
  td { padding: 4px 6px; border-bottom: 0.5px solid #e2e8f0; }
  tr:nth-child(even) td { background: #f8fafc; }
  .footer-row td { border-top: 1.5px solid #cbd5e1; font-weight: bold; background: #f1f5f9; padding: 6px; }
  .totals-box { margin-top: 14px; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 14px; background: #f8fafc; font-size: 9px; }
  .totals-grid { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 10px; }
  .totals-label { font-size: 8px; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 2px; }
  .totals-value { font-weight: bold; color: #1e293b; font-size: 10px; }
  @media print { body { padding: 0; } @page { size: A4 landscape; margin: 12mm; } }
`;

const formatHeaderDate = (dateStr: string) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
};

export const ProductTransactionLogPrintPreviewModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onExportPDF,
  data,
}) => {
  const printAreaRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const handlePrint = () => {
    if (!printAreaRef.current) return;
    const win = window.open("", "_blank", "width=1100,height=800");
    if (!win) { alert("Please allow popups for this site to enable printing."); return; }
    win.document.open();
    win.document.write(`<!DOCTYPE html>
<html>
  <head>
    <title>Product Transaction Log</title>
    <style>${PRINT_STYLES}</style>
  </head>
  <body>
    ${printAreaRef.current.innerHTML}
    <script>
      window.onload = function() {
        setTimeout(function() { window.print(); window.close(); }, 300);
      };
    <\/script>
  </body>
</html>`);
    win.document.close();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div
        className="relative flex flex-col bg-slate-100 rounded-xl shadow-2xl z-10 animate-[fadeIn_0.15s_ease-in-out]"
        style={{ width: "95vw", maxWidth: "1100px", maxHeight: "90vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Toolbar */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-white border-b rounded-t-xl shrink-0">
          <h2 className="text-base font-bold text-[#49293e]">Print Preview</h2>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="secondary" onClick={handlePrint} icon={<Printer size={15} />}>Print</Button>
            <Button size="sm" variant="danger" onClick={onExportPDF} icon={<Download size={15} />}>PDF</Button>
            <div className="w-px h-5 bg-gray-200 mx-1" />
            <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Scrollable Preview */}
        <div className="flex-1 overflow-y-auto p-6 flex justify-center bg-slate-200 rounded-b-xl min-h-0">
          <div
            ref={printAreaRef}
            className="bg-white p-8 w-full max-w-[1000px] shadow-sm font-sans text-slate-800 leading-relaxed mx-auto"
          >
            {/* Header */}
            <div className="company-name">{data.companyName}</div>
            <div className="company-address">{data.companyAddress}</div>
            <div className="report-title">
              Product Transaction Log — {formatHeaderDate(data.filters.fromDate)} to {formatHeaderDate(data.filters.toDate)}
            </div>

            {/* Table */}
            <table className="w-full border-collapse text-[9px]">
              <thead>
                <tr className="bg-[#49293e] text-white">
                  <th className="text-center p-1.5 font-bold w-[5%]">SNo</th>
                  <th className="text-center p-1.5 font-bold w-[10%]">Branch</th>
                  <th className="text-left   p-1.5 font-bold w-[22%]">Transaction</th>
                  <th className="text-center p-1.5 font-bold w-[14%]">Voucher No</th>
                  <th className="text-left   p-1.5 font-bold w-[20%]">Account</th>
                  <th className="text-right  p-1.5 font-bold w-[10%]">Qty In</th>
                  <th className="text-right  p-1.5 font-bold w-[10%]">Qty Out</th>
                  <th className="text-right  p-1.5 font-bold w-[10%]">Balance</th>
                </tr>
              </thead>
              <tbody>
                {data.logData.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-8 text-slate-400">No records found.</td></tr>
                ) : (
                  data.logData.map((row, idx) => (
                    <tr key={idx} className={idx % 2 === 1 ? "bg-slate-50/80" : "bg-white"}>
                      <td className="text-center p-1.5 text-slate-500">{row.sNo}</td>
                      <td className="text-center p-1.5">{row.branch}</td>
                      <td className="text-left   p-1.5 font-medium">{row.transaction}</td>
                      <td className="text-center p-1.5 font-mono">{row.voucherNo}</td>
                      <td className="text-left   p-1.5">{row.account || "—"}</td>
                      <td className="text-right  p-1.5 text-emerald-700 font-medium">{row.qtyIn || "—"}</td>
                      <td className="text-right  p-1.5 text-red-600 font-medium">{row.qtyOut || "—"}</td>
                      <td className="text-right  p-1.5 font-semibold">{row.balance}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {/* Totals summary */}
            <div className="mt-4 grid grid-cols-4 gap-3 text-xs bg-slate-50 border border-slate-200 rounded-lg p-4">
              {[
                { label: "Opening", value: data.totalData.opening },
                { label: "Received", value: data.totalData.received, color: "text-emerald-700" },
                { label: "Issued", value: data.totalData.issued, color: "text-red-600" },
                { label: "Balance", value: data.totalData.balance, color: "text-[#49293e] font-bold" },
              ].map(({ label, value, color = "text-slate-800" }) => (
                <div key={label} className="text-center">
                  <div className="text-[9px] text-slate-400 uppercase tracking-wider mb-1">{label}</div>
                  <div className={`font-semibold text-sm ${color}`}>{value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
