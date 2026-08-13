import { forwardRef, useMemo } from "react";
import { X, Download, Printer } from "lucide-react";
import { Button } from "../../../../components/common";
import { formatAmount } from "../../../../utils/currency";
import { PRINT_STYLES, formatHeaderDate } from "../utils/exportUtils";
import type { ProductWiseStockTransferRow } from "../types";

interface PrintData {
  rows: ProductWiseStockTransferRow[];
  grandTotals: { qty: number; netAmount: number };
  filters: any;
  companyName: string;
  companyAddress: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  data: PrintData;
  onExportPDF: () => void;
}

// ─── Print Template ───────────────────────────────────────────────────────────
const PrintTemplate = forwardRef<HTMLDivElement, { data: PrintData }>(
  ({ data }, ref) => (
    <div
      ref={ref}
      className="bg-white p-8 w-full max-w-[1050px] shadow-sm font-sans text-slate-800 leading-relaxed mx-auto"
    >
      <div className="text-center mb-6">
        <div className="text-lg font-bold uppercase text-black mb-1">{data.companyName}</div>
        {data.companyAddress && (
          <div className="text-[9px] font-bold text-slate-500 mb-2 uppercase">{data.companyAddress}</div>
        )}
        <div className="text-xs font-bold underline text-black mt-2">
          Product Wise Stock Transfer From {formatHeaderDate(data.filters.fromDate)} To{" "}
          {formatHeaderDate(data.filters.toDate)}
        </div>
      </div>

      <table className="w-full border-collapse mt-4 text-[10px]">
        <thead>
          <tr className="bg-[#49293e] text-white">
            <th className="text-center font-bold p-2 w-[10%]">Date</th>
            <th className="text-center font-bold p-2 w-[6%]">Ref No</th>
            <th className="text-left font-bold p-2 w-[14%]">From Branch</th>
            <th className="text-left font-bold p-2 w-[14%]">To Branch</th>
            <th className="text-center font-bold p-2 w-[7%]">Code</th>
            <th className="text-left font-bold p-2 w-[20%]">Product</th>
            <th className="text-center font-bold p-2 w-[5%]">Qty</th>
            <th className="text-center font-bold p-2 w-[6%]">Unit</th>
            <th className="text-right font-bold p-2 w-[9%]">Price</th>
            <th className="text-right font-bold p-2 w-[9%]">Net Amount</th>
          </tr>
        </thead>
        <tbody>
          {data.rows.length === 0 ? (
            <tr>
              <td colSpan={10} className="text-center py-10 text-slate-400">No records found.</td>
            </tr>
          ) : (
            <>
              {data.rows.map((row, idx) => (
                <tr
                  key={idx}
                  className={`border-b border-slate-100 ${idx % 2 === 1 ? "bg-slate-50/80" : "bg-white"}`}
                >
                  <td className="text-center p-2 text-[10px] whitespace-nowrap">{formatHeaderDate(row.transDate)}</td>
                  <td className="text-center p-2 text-[10px] font-mono">{row.refNo}</td>
                  <td className="text-left p-2 text-[10px] font-medium">{row.fromBranch}</td>
                  <td className="text-left p-2 text-[10px] font-medium">{row.toBranch}</td>
                  <td className="text-center p-2 text-[10px] text-slate-600">{row.code}</td>
                  <td className="text-left p-2 text-[10px] font-medium uppercase">{row.product}</td>
                  <td className="text-center p-2 text-[10px] tabular-nums">{row.qty}</td>
                  <td className="text-center p-2 text-[10px] text-slate-600">{row.unit}</td>
                  <td className="text-right p-2 text-[10px] tabular-nums">{formatAmount(Number(row.price || 0))}</td>
                  <td className="text-right p-2 text-[10px] font-semibold tabular-nums">{formatAmount(Number(row.netAmount || 0))}</td>
                </tr>
              ))}
              <tr className="font-bold bg-white border-t border-slate-300">
                <td colSpan={6} className="text-right p-2 text-[10px] font-bold">Total</td>
                <td className="text-center p-2 text-[10px] tabular-nums font-bold">{data.grandTotals.qty}</td>
                <td />
                <td />
                <td className="text-right p-2 text-[11px] text-[#49293e] font-bold tabular-nums">
                  {formatAmount(data.grandTotals.netAmount)}
                </td>
              </tr>
            </>
          )}
        </tbody>
      </table>
    </div>
  )
);
PrintTemplate.displayName = "ProductWiseStockTransferPrintTemplate";

// ─── Modal ────────────────────────────────────────────────────────────────────
export const ProductWiseStockTransferPrintPreviewModal = ({
  isOpen, onClose, data, onExportPDF,
}: Props) => {
  const printTemplateRef = useMemo(() => ({ current: null as HTMLDivElement | null }), []);

  const handlePrint = () => {
    if (!printTemplateRef.current) return;
    const win = window.open("", "_blank", "width=1100,height=750");
    if (!win) { alert("Please allow popups for this site to enable printing."); return; }
    win.document.open();
    win.document.write(`<!DOCTYPE html>
<html><head><title>Product Wise Stock Transfer Report</title><style>${PRINT_STYLES}</style></head>
<body>${printTemplateRef.current.innerHTML}
<script>window.onload=function(){setTimeout(function(){window.print();window.close();},300);};<\/script>
</body></html>`);
    win.document.close();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative flex flex-col bg-slate-100 rounded-xl shadow-2xl z-10 animate-[fadeIn_0.15s_ease-in-out]"
        style={{ width: "95vw", maxWidth: "1100px", maxHeight: "90vh" }}
        onClick={(e) => e.stopPropagation()}
      >
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
        <div className="flex-1 overflow-y-auto p-6 flex justify-center bg-slate-200 rounded-b-xl min-h-0">
          <PrintTemplate ref={printTemplateRef as any} data={data} />
        </div>
      </div>
    </div>
  );
};
