import React, { useRef } from "react";
import { Printer, X, Download } from "lucide-react";
import { Button } from "../../../../components/common";
import { formatAmount } from "../../../../utils/currency";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onExportPDF: () => void;
  data: {
    columns: string[];
    rows: Record<string, string | number>[];
    filters: any;
    companyName: string;
    companyAddress: string;
  };
}

export const DailySalesPrintPreviewModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onExportPDF,
  data
}) => {
  const printAreaRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const handlePrint = () => {
    const printContent = printAreaRef.current?.innerHTML;
    const originalContent = document.body.innerHTML;

    if (printContent) {
      document.body.innerHTML = printContent;
      window.print();
      document.body.innerHTML = originalContent;
      window.location.reload(); // Reload to restore React bindings
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  };

  const dynamicPaymodes = data.columns.filter(c => c !== "VoucherDate");

  // Sum column calculations
  const colTotals = dynamicPaymodes.map((col) => {
    return data.rows.reduce((sum, r) => sum + Number(r[col] || 0), 0);
  });
  const grandTotal = colTotals.reduce((sum, val) => sum + val, 0);

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
            >
              Print
            </Button>
            <Button
              size="sm"
              variant="danger"
              onClick={onExportPDF}
              icon={<Download size={15} />}
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
          <div
            ref={printAreaRef}
            className="bg-white p-8 w-full max-w-[850px] shadow-sm font-sans text-slate-800 leading-relaxed mx-auto"
          >
            {/* Header Details */}
            <div className="text-center mb-6">
              <h1 className="text-xl font-bold text-gray-900 uppercase">{data.companyName}</h1>
              <p className="text-xs text-gray-600 mt-1">{data.companyAddress}</p>
              <h2 className="text-sm font-bold text-gray-900 mt-3 border-b border-gray-300 pb-1 inline-block">
                Daily Sales Report From {formatDate(data.filters.fromDate)} To {formatDate(data.filters.toDate)}
              </h2>
            </div>

            {/* Table */}
            <table className="w-full text-xs border-collapse border border-gray-300">
              <thead>
                <tr className="bg-[#49293e] text-white">
                  <th className="border border-gray-300 px-3 py-2 text-center">Date</th>
                  {dynamicPaymodes.map((col) => (
                    <th key={col} className="border border-gray-300 px-3 py-2 text-right">{col}</th>
                  ))}
                  <th className="border border-gray-300 px-3 py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((row, rIdx) => {
                  let rowSum = 0;
                  return (
                    <tr key={rIdx} className="hover:bg-gray-50 odd:bg-white even:bg-gray-50/50">
                      <td className="border border-gray-200 px-3 py-2 text-center">
                        {row.VoucherDate ? formatDate(String(row.VoucherDate)) : ""}
                      </td>
                      {dynamicPaymodes.map((col) => {
                        const val = Number(row[col] || 0);
                        rowSum += val;
                        return (
                          <td key={col} className="border border-gray-200 px-3 py-2 text-right">
                            {formatAmount(val)}
                          </td>
                        );
                      })}
                      <td className="border border-gray-200 px-3 py-2 text-right font-semibold">
                        {formatAmount(rowSum)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-gray-100 font-bold border-t-2 border-gray-400">
                  <td className="border border-gray-300 px-3 py-2 text-center">Total</td>
                  {colTotals.map((tot, idx) => (
                    <td key={idx} className="border border-gray-300 px-3 py-2 text-right">
                      {formatAmount(tot)}
                    </td>
                  ))}
                  <td className="border border-gray-300 px-3 py-2 text-right text-[#49293e]">
                    {formatAmount(grandTotal)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
