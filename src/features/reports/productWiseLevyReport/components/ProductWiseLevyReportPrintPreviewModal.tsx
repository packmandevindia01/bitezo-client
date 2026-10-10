import { useRef } from "react";
import { Printer, Download } from "lucide-react";
import { Button, Modal } from "../../../../components/common";
import { formatAmount } from "../../../../utils/currency";
import { formatDate, getProductName, getProductCode } from "../utils/exportUtils";
import type { ProductWiseLevyRow, ProductWiseLevyTotalData } from "../types";

interface ProductWiseLevyReportPrintPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExportPDF: () => void;
  data: {
    rows: ProductWiseLevyRow[];
    totalData: ProductWiseLevyTotalData | null;
    filters: any;
    branchName: string;
    companyName: string;
    companyAddress: string;
  };
}

export const ProductWiseLevyReportPrintPreviewModal = ({
  isOpen,
  onClose,
  onExportPDF,
  data,
}: ProductWiseLevyReportPrintPreviewModalProps) => {
  const printRef = useRef<HTMLDivElement>(null);

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

  const rows = data.rows || [];

  let sumNetValue = 0;
  let sumServiceCharge = 0;
  let sumLevy = 0;
  let sumVatAmount = 0;
  let sumNetAmount = 0;

  rows.forEach((row) => {
    sumNetValue += Number(row.netValue ?? 0);
    sumServiceCharge += Number(row.serviceCharge ?? 0);
    sumLevy += Number(row.levy ?? 0);
    sumVatAmount += Number(row.vatAmount ?? 0);
    sumNetAmount += Number(row.netAmount ?? 0);
  });

  const finalNetValue = data.totalData
    ? Number(data.totalData.netValue ?? sumNetValue)
    : sumNetValue;
  const finalServiceCharge = data.totalData
    ? Number(data.totalData.serviceCharge ?? sumServiceCharge)
    : sumServiceCharge;
  const finalLevy = data.totalData ? Number(data.totalData.levy ?? sumLevy) : sumLevy;
  const finalVatAmount = data.totalData
    ? Number(data.totalData.vatAmount ?? sumVatAmount)
    : sumVatAmount;
  const finalNetAmount = data.totalData
    ? Number(data.totalData.netAmount ?? sumNetAmount)
    : sumNetAmount;

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

        {/* Printable Area */}
        <div className="flex-1 overflow-auto bg-gray-100 rounded-lg p-2 flex justify-center border border-gray-200">
          <div
            ref={printRef}
            className="bg-white shadow-sm print:shadow-none print:w-full"
            style={{ width: "297mm", minHeight: "210mm", padding: "15mm" }}
          >
            <style type="text/css" media="print">
              {`
                @page { size: landscape; margin: 10mm; }
                body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background-color: white !important; }
                .print-table th { background-color: #f3f4f6 !important; color: #111827 !important; border: 1px solid #e5e7eb !important; }
                .print-table td { border: 1px solid #e5e7eb !important; }
              `}
            </style>

            {/* Header section */}
            <div className="text-center mb-6">
              <h1 className="text-xl font-bold text-gray-900 uppercase tracking-wider">
                {data.companyName}
              </h1>
              <p className="text-sm text-gray-600 mt-1 max-w-lg mx-auto">{data.companyAddress}</p>
              <h2 className="text-lg font-bold text-[#49293e] mt-4 uppercase">
                Product Wise Levy Report
              </h2>
            </div>

            <div className="flex justify-between items-end mb-4 text-sm border-b pb-3 border-gray-200">
              <div>
                <p>
                  <span className="text-gray-500 w-20 inline-block font-medium">Period:</span>
                  <span className="font-semibold text-gray-800">
                    {formatDate(data.filters.fromDate)} To {formatDate(data.filters.toDate)}
                  </span>
                </p>
                <p>
                  <span className="text-gray-500 w-20 inline-block font-medium">Branch:</span>
                  <span className="font-semibold text-gray-800">{data.branchName}</span>
                </p>
              </div>
            </div>

            {/* Data Table */}
            <table className="w-full text-xs border-collapse print-table mb-6">
              <thead>
                <tr className="bg-gray-100 text-gray-800 font-bold border border-gray-300">
                  <th className="py-2 px-2.5 text-center border border-gray-300 w-12">S.No</th>
                  <th className="py-2 px-2.5 text-center border border-gray-300 w-28">Product Code</th>
                  <th className="py-2 px-2.5 text-left border border-gray-300">Product Name</th>
                  <th className="py-2 px-2.5 text-right border border-gray-300 w-32">Net Value</th>
                  <th className="py-2 px-2.5 text-right border border-gray-300 w-32">Service Charge</th>
                  <th className="py-2 px-2.5 text-right border border-gray-300 w-32">Levy</th>
                  <th className="py-2 px-2.5 text-right border border-gray-300 w-32">VAT Amount</th>
                  <th className="py-2 px-2.5 text-right border border-gray-300 w-36">Net Amount</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-6 text-gray-500 border border-gray-300">
                      No records available.
                    </td>
                  </tr>
                ) : (
                  rows.map((row, idx) => (
                    <tr key={idx} className="border border-gray-300">
                      <td className="py-1.5 px-2.5 text-center border border-gray-300">
                        {row.sNo ?? idx + 1}
                      </td>
                      <td className="py-1.5 px-2.5 text-center border border-gray-300 font-mono">
                        {getProductCode(row)}
                      </td>
                      <td className="py-1.5 px-2.5 text-left border border-gray-300 font-medium text-gray-900">
                        {getProductName(row)}
                      </td>
                      <td className="py-1.5 px-2.5 text-right border border-gray-300 font-mono">
                        {formatAmount(Number(row.netValue || 0))}
                      </td>
                      <td className="py-1.5 px-2.5 text-right border border-gray-300 font-mono">
                        {formatAmount(Number(row.serviceCharge || 0))}
                      </td>
                      <td className="py-1.5 px-2.5 text-right border border-gray-300 font-mono">
                        {formatAmount(Number(row.levy || 0))}
                      </td>
                      <td className="py-1.5 px-2.5 text-right border border-gray-300 font-mono">
                        {formatAmount(Number(row.vatAmount || 0))}
                      </td>
                      <td className="py-1.5 px-2.5 text-right border border-gray-300 font-mono font-semibold text-gray-900">
                        {formatAmount(Number(row.netAmount || 0))}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {rows.length > 0 && (
                <tfoot>
                  <tr className="bg-gray-100 font-bold border-t-2 border-gray-400">
                    <td colSpan={3} className="py-2 px-2.5 border border-gray-300 text-center">
                      TOTAL
                    </td>
                    <td className="py-2 px-2.5 text-right border border-gray-300 font-mono">
                      {formatAmount(finalNetValue)}
                    </td>
                    <td className="py-2 px-2.5 text-right border border-gray-300 font-mono">
                      {formatAmount(finalServiceCharge)}
                    </td>
                    <td className="py-2 px-2.5 text-right border border-gray-300 font-mono">
                      {formatAmount(finalLevy)}
                    </td>
                    <td className="py-2 px-2.5 text-right border border-gray-300 font-mono">
                      {formatAmount(finalVatAmount)}
                    </td>
                    <td className="py-2 px-2.5 text-right border border-gray-300 font-mono text-[#49293e] text-sm font-bold">
                      {formatAmount(finalNetAmount)}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </div>
    </Modal>
  );
};
