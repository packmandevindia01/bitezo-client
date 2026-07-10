import { useRef } from "react";
import { Printer, Download } from "lucide-react";
import { Modal, Button } from "../../../../components/common";
import { formatAmount } from "../../../../utils/currency";
import type { BillWiseMarginSalesData, BillWiseMarginTotalData } from "../types";

interface PrintPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExportPDF: () => void;
  data: {
    reportData: BillWiseMarginSalesData[];
    totals: BillWiseMarginTotalData;
    filters: any;
  };
}

export const BillWiseMarginReportPrintPreviewModal = ({
  isOpen,
  onClose,
  onExportPDF,
  data,
}: PrintPreviewModalProps) => {
  const componentRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    if (componentRef.current) {
      const printContents = componentRef.current.innerHTML;
      const originalContents = document.body.innerHTML;

      document.body.innerHTML = printContents;
      window.print();
      document.body.innerHTML = originalContents;
      window.location.reload(); 
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Print Preview" size="2xl">
      <div className="flex flex-col h-[80vh]">
        {/* Action Bar */}
        <div className="flex justify-end gap-3 mb-4 shrink-0">
          <Button onClick={onExportPDF} variant="secondary" icon={<Download size={16} />}>
            Export PDF
          </Button>
          <Button onClick={handlePrint} icon={<Printer size={16} />}>
            Print Report
          </Button>
        </div>

        {/* Scrollable Preview Area */}
        <div className="flex-1 overflow-y-auto bg-gray-100 p-8 rounded-lg">
          {/* A4 Paper Container */}
          <div
            ref={componentRef}
            className="bg-white mx-auto shadow-sm"
            style={{
              width: "297mm", // A4 Landscape width
              minHeight: "210mm", // A4 Landscape height
              padding: "20mm",
            }}
          >
            {/* Report Header */}
            <div className="text-center mb-8 border-b-2 border-gray-800 pb-4">
              <h2 className="text-2xl font-bold text-gray-900 mb-2 uppercase tracking-wider">
                Bill Wise Margin Report
              </h2>
              <div className="text-sm text-gray-600 flex justify-center gap-6">
                <span>From: {data.filters.fromDate}</span>
                <span>To: {data.filters.toDate}</span>
              </div>
            </div>

            {/* Data Table */}
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-gray-100 border-b border-gray-800">
                  <th className="px-2 py-2 text-center text-gray-800">SNo</th>
                  <th className="px-2 py-2 text-center text-gray-800">Invoice Date</th>
                  <th className="px-2 py-2 text-center text-gray-800">Invoice No</th>
                  <th className="px-2 py-2 text-center text-gray-800">Customer Code</th>
                  <th className="px-2 py-2 text-center text-gray-800">Customer Name</th>
                  <th className="px-2 py-2 text-right text-gray-800">Net Value</th>
                  <th className="px-2 py-2 text-right text-gray-800">Cost</th>
                  <th className="px-2 py-2 text-right text-gray-800">Margin</th>
                  <th className="px-2 py-2 text-right text-gray-800">Margin %</th>
                </tr>
              </thead>
              <tbody>
                {data.reportData.map((row, i) => (
                  <tr key={i} className="border-b border-gray-200">
                    <td className="px-2 py-1.5 text-center">{row.sNo}</td>
                    <td className="px-2 py-1.5 text-center">{row.invoiceDate.split('T')[0]}</td>
                    <td className="px-2 py-1.5 text-center">{row.invoiceNo}</td>
                    <td className="px-2 py-1.5 text-center">{row.customerCode}</td>
                    <td className="px-2 py-1.5 text-center">{row.customerName}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums">{formatAmount(Number(row.netValue))}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums">{formatAmount(Number(row.cost))}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums">{formatAmount(Number(row.margin))}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums">{formatAmount(Number(row.marginper))}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 border-t-2 border-gray-800 font-bold">
                  <td colSpan={5} className="px-2 py-2 text-center">Total</td>
                  <td className="px-2 py-2 text-right tabular-nums">{formatAmount(data.totals.netValue)}</td>
                  <td className="px-2 py-2 text-right tabular-nums">{formatAmount(data.totals.cost)}</td>
                  <td className="px-2 py-2 text-right tabular-nums">{formatAmount(data.totals.margin)}</td>
                  <td className="px-2 py-2 text-right tabular-nums">{formatAmount(data.totals.marginper)}</td>
                </tr>
              </tfoot>
            </table>
            
            <div className="mt-8 text-[10px] text-gray-400 text-center">
              Generated by Bitezo
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};
