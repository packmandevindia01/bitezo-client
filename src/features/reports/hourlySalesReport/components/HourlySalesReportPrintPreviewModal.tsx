import { useRef } from "react";
import { Printer, Download } from "lucide-react";
import { Button, Modal } from "../../../../components/common";
import { formatAmount } from "../../../../utils/currency";
import type { HourlySalesReportResponse } from "../types";

const formatHeaderDate = (dateStr: string) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

interface HourlySalesReportPrintPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExportPDF: () => void;
  data: {
    reportData: HourlySalesReportResponse["data"] | undefined;
    filters: any;
    companyName: string;
    companyAddress: string;
  };
}

export const HourlySalesReportPrintPreviewModal = ({
  isOpen,
  onClose,
  onExportPDF,
  data
}: HourlySalesReportPrintPreviewModalProps) => {
  const printRef = useRef<HTMLDivElement>(null);
  const reportData = data.reportData;

  const handlePrint = () => {
    if (printRef.current) {
      const printContents = printRef.current.innerHTML;
      const originalContents = document.body.innerHTML;

      document.body.innerHTML = printContents;
      window.print();
      document.body.innerHTML = originalContents;
      window.location.reload(); 
    }
  };

  const columns = reportData?.columns || [];
  const rows = reportData?.rows || [];

  // Calculate totals
  const totals: Record<string, number> = {};
  columns.forEach((col) => {
    if (col !== "Time") {
      totals[col] = rows.reduce((acc, row) => acc + (Number(row[col]) || 0), 0);
    }
  });

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Print Preview" size="xl">
      <div className="flex flex-col h-[80vh]">
        {/* Actions Bar */}
        <div className="flex justify-end items-center gap-3 mb-4 shrink-0">
          <Button icon={<Download size={16} />} onClick={onExportPDF} variant="secondary">
            Save as PDF
          </Button>
          <Button icon={<Printer size={16} />} onClick={handlePrint}>
            Print Document
          </Button>
        </div>

        {/* Printable Area - A4 Paper styled container */}
        <div className="flex-1 overflow-auto bg-gray-100 rounded-lg p-2 flex justify-center border border-gray-200">
          <div 
            ref={printRef}
            className="bg-white shadow-sm print:shadow-none print:w-full"
            style={{ width: "210mm", minHeight: "297mm", padding: "15mm" }} // Standard A4 padding
          >
            <style type="text/css" media="print">
              {`
                @page { size: auto; margin: 10mm; }
                body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background-color: white !important; }
                .print-table th { background-color: #f3f4f6 !important; color: #111827 !important; border: 1px solid #e5e7eb !important; }
                .print-table td { border: 1px solid #e5e7eb !important; }
              `}
            </style>

            {/* Header section */}
            <div className="text-center mb-6">
              <h1 className="text-xl font-bold text-gray-900 uppercase tracking-wider">{data.companyName}</h1>
              <p className="text-sm text-gray-600 mt-1 max-w-sm mx-auto">{data.companyAddress}</p>
              <h2 className="text-lg font-bold text-[#49293e] mt-4 uppercase">Hourly Sales Report</h2>
            </div>

            <div className="flex justify-between items-end mb-4 text-sm">
              <div>
                <p><span className="text-gray-500 w-16 inline-block">Period:</span> <span className="font-semibold text-gray-800">{formatHeaderDate(data.filters.fromDate)} To {formatHeaderDate(data.filters.toDate)}</span></p>
                <p><span className="text-gray-500 w-16 inline-block">Branch:</span> <span className="font-semibold text-gray-800">{data.filters.branchId === "0" ? "All" : (data.filters.branchId || "All")}</span></p>
              </div>
              <div className="text-right">
                <p><span className="text-gray-500">Printed:</span> {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}</p>
              </div>
            </div>

            {/* Dynamic Table */}
            <table className="w-full text-sm text-left border-collapse print-table">
              <thead>
                <tr>
                  <th className="px-3 py-2 border font-bold text-gray-900 bg-gray-50 text-center w-12">SNo</th>
                  {columns.map((col, idx) => (
                    <th 
                      key={idx} 
                      className={`px-3 py-2 border font-bold text-gray-900 bg-gray-50 ${col !== 'Time' ? 'text-right' : 'text-left'}`}
                    >
                      {col.toUpperCase()}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => (
                  <tr key={idx}>
                    <td className="px-3 py-1.5 border text-center text-gray-600">{idx + 1}</td>
                    {columns.map((col, cIdx) => (
                      <td 
                        key={cIdx} 
                        className={`px-3 py-1.5 border text-gray-800 ${col !== 'Time' ? 'text-right font-medium' : 'text-left'}`}
                      >
                        {col === 'Time' ? (row[col] || "-") : formatAmount(Number(row[col]) || 0)}
                      </td>
                    ))}
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={columns.length + 1} className="px-3 py-6 text-center text-gray-400 border">No data available for this period</td>
                  </tr>
                )}
              </tbody>
              {rows.length > 0 && (
                <tfoot>
                  <tr>
                    <td className="px-3 py-2 border bg-gray-50"></td>
                    {columns.map((col, idx) => {
                      if (col === 'Time') {
                        return (
                          <td key={idx} className="px-3 py-2 border font-bold text-gray-900 text-right bg-gray-50">
                            TOTAL
                          </td>
                        );
                      }
                      return (
                        <td key={idx} className="px-3 py-2 border font-bold text-gray-900 text-right bg-gray-50">
                          {formatAmount(totals[col] || 0)}
                        </td>
                      );
                    })}
                  </tr>
                </tfoot>
              )}
            </table>
            
            <div className="mt-12 text-center text-xs text-gray-400">
              <p>*** End of Report ***</p>
            </div>
            
          </div>
        </div>
      </div>
    </Modal>
  );
};
