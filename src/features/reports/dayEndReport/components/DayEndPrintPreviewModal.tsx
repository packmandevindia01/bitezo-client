import { forwardRef, useMemo } from "react";
import { X, Download, Printer } from "lucide-react";
import { Button } from "../../../../components/common";
import { formatAmount } from "../../../../utils/currency";

interface PrintData {
  dynamicColumns: string[];
  rows: any[];
  grandTotal: number;
  filters: any;
  companyName: string;
  companyAddress: string;
}

interface DayEndPrintPreviewModalProps {
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
    @page { size: A4 landscape; margin: 15mm; }
  }
`;

const formatDateTime = (dateStr: string) => {
  if (!dateStr || dateStr.startsWith("1900")) return "-";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
};

// ─── Print HTML Template ──────────────────────────────────────────────────────
const DayEndPrintTemplate = forwardRef<HTMLDivElement, { data: PrintData }>(
  ({ data }, ref) => {
    
    // Dynamically calculate totals for the footer
    const colTotals = useMemo(() => {
      return data.dynamicColumns.map((col) => {
        return data.rows.reduce((sum, row) => sum + Number(row[col] || 0), 0);
      });
    }, [data.rows, data.dynamicColumns]);

    return (
      <div ref={ref} className="bg-white p-8 w-full max-w-[1000px] shadow-sm font-sans text-slate-800 leading-relaxed mx-auto">
        {/* Header */}
        <div className="header-container text-center mb-6">
          <div className="company-name text-lg font-bold uppercase text-black mb-1">{data.companyName}</div>
          <div className="company-address text-[9px] font-bold text-slate-500 mb-2 uppercase">{data.companyAddress}</div>
          <div className="report-title text-xs font-bold underline text-black mt-2">
            Day End Report From {data.filters.fromDate || "-"} To {data.filters.toDate || "-"}
          </div>
        </div>

        {/* Table */}
        <table className="w-full border-collapse mt-4 text-[10px]">
          <thead>
            <tr className="bg-[#49293e] text-white">
              <th className="text-center font-bold p-2 text-[10px] bg-[#49293e] text-white border-none w-[5%]">SNo</th>
              <th className="text-left font-bold p-2 text-[10px] bg-[#49293e] text-white border-none w-[15%]">Start Date</th>
              <th className="text-left font-bold p-2 text-[10px] bg-[#49293e] text-white border-none w-[15%]">End Date</th>
              {data.dynamicColumns.map(col => (
                <th key={col} className={`text-right font-bold p-2 text-[10px] bg-[#49293e] text-white border-none ${col === 'Total' ? 'w-[10%]' : ''}`}>
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.rows.length === 0 ? (
              <tr>
                <td colSpan={data.dynamicColumns.length + 3} className="text-center py-10 text-slate-400">
                  No records found.
                </td>
              </tr>
            ) : (
              data.rows.map((row, idx) => (
                <tr key={idx} className={`border-b border-slate-100 ${idx % 2 === 1 ? "bg-slate-50/80" : "bg-white"}`}>
                  <td className="text-center p-2 text-[10px] text-slate-800">{row.SNo || idx + 1}</td>
                  <td className="text-left p-2 text-[10px] text-slate-800 font-medium">{formatDateTime(row.StartDate)}</td>
                  <td className="text-left p-2 text-[10px] text-slate-800 font-medium">{formatDateTime(row.EndDate)}</td>
                  {data.dynamicColumns.map((col) => {
                    const val = Number(row[col] || 0);
                    return (
                      <td key={col} className={`text-right p-2 text-[10px] tabular-nums ${col === 'Total' ? 'font-bold text-slate-900 bg-slate-50/50' : 'text-slate-800'}`}>
                        {formatAmount(val)}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
            {/* Footer Summary Row */}
            {data.rows.length > 0 && (
              <tr className="footer-row font-bold bg-white">
                <td className="text-center p-2 bg-white border-t border-slate-200"></td>
                <td className="text-left p-2 bg-white border-t border-slate-200"></td>
                <td className="text-right uppercase p-2 text-[9px] tracking-wider text-slate-500 font-bold bg-white border-t border-slate-200">
                  Totals:
                </td>
                {colTotals.map((tot, idx) => (
                  <td key={idx} className={`text-right text-slate-900 text-[11px] font-bold tabular-nums p-2 bg-white border-t border-slate-200`}>
                    {formatAmount(tot)}
                  </td>
                ))}
              </tr>
            )}
          </tbody>
        </table>
      </div>
    );
  }
);

DayEndPrintTemplate.displayName = "DayEndPrintTemplate";

// ─── Modal Container ──────────────────────────────────────────────────────────
export const DayEndPrintPreviewModal = ({
  isOpen,
  onClose,
  data,
  onExportPDF,
}: DayEndPrintPreviewModalProps) => {
  const printTemplateRef = useMemo(() => {
    return { current: null as HTMLDivElement | null };
  }, []);

  const handlePrint = () => {
    if (!printTemplateRef.current) return;
    const win = window.open("", "_blank", "width=1000,height=750");
    if (!win) {
      alert("Please allow popups for this site to enable printing.");
      return;
    }
    win.document.open();
    win.document.write(`<!DOCTYPE html>
<html>
  <head>
    <title>Day End Report Print</title>
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
        style={{ width: "95vw", maxWidth: "1100px", maxHeight: "90vh" }}
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
          <DayEndPrintTemplate ref={printTemplateRef as any} data={data} />
        </div>
      </div>
    </div>
  );
};
