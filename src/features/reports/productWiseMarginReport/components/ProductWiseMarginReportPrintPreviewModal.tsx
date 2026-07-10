import React from "react";
import Modal from "../../../../components/common/Modal";
import Button from "../../../../components/common/Button";
import { Printer } from "lucide-react";
import { formatAmount } from "../../../../utils/currency";
import type { ProductWiseMarginProductsData, ProductWiseMarginTotalData } from "../types";

interface ProductWiseMarginReportPrintPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  rows: ProductWiseMarginProductsData[];
  totals: ProductWiseMarginTotalData | null;
  filters: { fromDate: string; toDate: string };
}

const ProductWiseMarginReportPrintPreviewModal: React.FC<ProductWiseMarginReportPrintPreviewModalProps> = ({
  isOpen,
  onClose,
  rows,
  totals,
  filters,
}) => {
  const companyName = localStorage.getItem("companyName") || "Bitezo";
  
  const handlePrint = () => {
    const printContent = document.getElementById("pwm-print-area");
    if (printContent) {
      const originalContents = document.body.innerHTML;
      document.body.innerHTML = printContent.innerHTML;
      window.print();
      document.body.innerHTML = originalContents;
      window.location.reload();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Print Preview" size="2xl">
      <div className="flex flex-col gap-4 max-h-[70vh] overflow-hidden">
        <div className="flex-1 overflow-auto border border-gray-200 rounded p-4" id="pwm-print-area">
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold">{companyName}</h2>
            <h3 className="text-lg font-semibold mt-1">Product Wise Margin Report</h3>
            <p className="text-sm text-gray-500 mt-1">
              Period: {filters.fromDate} to {filters.toDate}
            </p>
          </div>

          <table className="w-full text-sm text-left">
            <thead className="border-y-2 border-black">
              <tr>
                <th className="py-2 text-center">SNo</th>
                <th className="py-2 text-center">Product Code</th>
                <th className="py-2 text-center">Product Name</th>
                <th className="py-2 text-center">Group</th>
                <th className="py-2 text-center">Category</th>
                <th className="py-2 text-center">Sub Category</th>
                <th className="py-2 text-right">Net Value</th>
                <th className="py-2 text-right">Cost</th>
                <th className="py-2 text-right">Margin</th>
                <th className="py-2 text-right">Margin %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {rows.map((r, idx) => (
                <tr key={idx}>
                  <td className="py-1.5 text-center">{r.sNo}</td>
                  <td className="py-1.5 text-center">{r.productCode}</td>
                  <td className="py-1.5 text-center">{r.productName}</td>
                  <td className="py-1.5 text-center">{r.group}</td>
                  <td className="py-1.5 text-center">{r.category}</td>
                  <td className="py-1.5 text-center">{r.subCategory}</td>
                  <td className="py-1.5 text-right">{formatAmount(Number(r.netValue))}</td>
                  <td className="py-1.5 text-right">{formatAmount(Number(r.cost))}</td>
                  <td className="py-1.5 text-right">{formatAmount(Number(r.margin))}</td>
                  <td className="py-1.5 text-right">{formatAmount(Number(r.marginPer))}</td>
                </tr>
              ))}
            </tbody>
            {totals && (
              <tfoot className="border-t-2 border-black font-bold">
                <tr>
                  <td colSpan={6} className="py-2 text-center">TOTAL</td>
                  <td className="py-2 text-right">{formatAmount(Number(totals.netValue))}</td>
                  <td className="py-2 text-right">{formatAmount(Number(totals.cost))}</td>
                  <td className="py-2 text-right">{formatAmount(Number(totals.margin))}</td>
                  <td className="py-2 text-right">{formatAmount(Number(totals.marginper))}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 shrink-0">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button icon={<Printer size={18} />} onClick={handlePrint}>
            Print Report
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default ProductWiseMarginReportPrintPreviewModal;
