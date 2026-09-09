import { useRef } from "react";
import { Button, Modal } from "../../../../components/common";
import { Printer, Download, X } from "lucide-react";
import { formatAmount } from "../../../../utils/currency";

interface MenuSessionSalesReportPrintPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExportPDF: () => void;
  data: {
    reportData: {
      columns: string[];
      rows: Record<string, string | number>[];
    };
    filters: {
      branchId: string;
      fromDate: string;
      toDate: string;
    };
    companyName: string;
    companyAddress: string;
  };
}

const formatDate = (dateStr: string) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

export const MenuSessionSalesReportPrintPreviewModal = ({
  isOpen,
  onClose,
  onExportPDF,
  data,
}: MenuSessionSalesReportPrintPreviewModalProps) => {
  const printRef = useRef<HTMLDivElement>(null);

  const dynamicPaymodes = data.reportData.columns.filter((c) => c !== "Date");

  // Calculate totals
  const colTotals = dynamicPaymodes.map((col) => {
    return data.reportData.rows.reduce((sum, row) => sum + Number(row[col] || 0), 0);
  });

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Menu Session Sales Report</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 10mm;
            }
            body {
              font-family: Arial, sans-serif;
              font-size: 11px;
              color: #000;
              margin: 0;
              padding: 0;
            }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .font-bold { font-weight: bold; }
            .uppercase { text-transform: uppercase; }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 15px;
            }
            th, td {
              border: 1px solid #ccc;
              padding: 5px 8px;
              font-size: 10px;
            }
            th {
              background-color: #f2f2f2;
            }
            tfoot td {
              font-weight: bold;
              background-color: #e6e6e6;
            }
            .header-title {
              font-size: 16px;
              font-weight: bold;
              margin-bottom: 4px;
            }
            .header-sub {
              font-size: 10px;
              color: #444;
              margin-bottom: 12px;
            }
            .report-title {
              font-size: 13px;
              font-weight: bold;
              margin-top: 10px;
            }
          </style>
        </head>
        <body>
          ${content.innerHTML}
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();

    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Print Preview" size="xl">
      <div className="flex flex-col h-[75vh]">
        {/* Actions bar */}
        <div className="flex justify-between items-center pb-3 border-b border-gray-200 shrink-0">
          <div className="flex gap-2">
            <Button size="sm" icon={<Printer size={15} />} onClick={handlePrint}>
              Print
            </Button>
            <Button size="sm" variant="secondary" icon={<Download size={15} />} onClick={onExportPDF}>
              Export PDF
            </Button>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Preview Document */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50 flex justify-center">
          <div
            ref={printRef}
            className="bg-white p-8 border border-gray-300 shadow-md w-full max-w-[210mm] min-h-[297mm] text-gray-800 flex flex-col"
          >
            {/* Header */}
            <div className="text-center border-b pb-4 mb-4">
              <div className="header-title uppercase">{data.companyName}</div>
              <div className="header-sub">{data.companyAddress}</div>
              <h2 className="text-lg font-bold text-[#49293e] mt-4 uppercase">Menu Session Sales Report</h2>
              <div className="text-xs text-gray-600 font-medium mt-1">
                <span>From: {formatDate(data.filters.fromDate)}</span>
                <span className="mx-2">|</span>
                <span>To: {formatDate(data.filters.toDate)}</span>
                <span className="mx-2">|</span>
                <span>Branch: {data.filters.branchId === "0" ? "All Branches" : data.filters.branchId}</span>
              </div>
            </div>

            {/* Table */}
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-gray-100 border-b border-gray-300">
                  <th className="p-2 border text-center font-bold">Date</th>
                  {dynamicPaymodes.map((col) => (
                    <th key={col} className="p-2 border text-right font-bold">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.reportData.rows.map((row, idx) => (
                  <tr key={idx} className="border-b border-gray-200">
                    <td className="p-2 border text-center font-semibold">{row.Date ? formatDate(String(row.Date)) : ""}</td>
                    {dynamicPaymodes.map((col) => (
                      <td key={col} className="p-2 border text-right font-mono">
                        {formatAmount(Number(row[col] || 0))}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-100 font-bold border-t-2 border-gray-400">
                  <td className="p-2 border text-center">TOTAL</td>
                  {colTotals.map((tot, idx) => (
                    <td key={idx} className="p-2 border text-right font-mono">
                      {formatAmount(tot)}
                    </td>
                  ))}
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </Modal>
  );
};
