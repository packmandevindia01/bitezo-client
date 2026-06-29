import { useState, useRef, useEffect } from "react";
import { X, Download, Printer } from "lucide-react";
import { Button } from "../../../../components/common";
import { VoucherPrintTemplate } from "./VoucherPrintTemplate";
import type { VoucherPrintData } from "./VoucherPrintTemplate";
import { fetchCompany } from "../../../company/services/companyApi";

interface VoucherPrintPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: Partial<VoucherPrintData>;
}

// Plain CSS for Voucher Print
const VOUCHER_PRINT_STYLES = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #ffffff; font-family: Arial, Helvetica, sans-serif; font-size: 14px; color: #000000; }
  .p-8 { padding: 2rem; }
  .font-sans { font-family: Arial, Helvetica, sans-serif; }
  .text-center { text-align: center; }
  .font-bold { font-weight: bold; }
  .text-2xl { font-size: 1.5rem; line-height: 2rem; }
  .text-xl { font-size: 1.25rem; line-height: 1.75rem; }
  .text-sm { font-size: 0.875rem; }
  .border { border: 1px solid #000000; }
  .border-dashed { border-style: dashed; }
  .border-yellow-700 { border-color: #854d0e; }
  .rounded-lg { border-radius: 0.5rem; }
  .p-2 { padding: 0.5rem; }
  .p-4 { padding: 1rem; }
  .mb-1 { margin-bottom: 0.25rem; }
  .mb-2 { margin-bottom: 0.5rem; }
  .mb-4 { margin-bottom: 1rem; }
  .mb-6 { margin-bottom: 1.5rem; }
  .mb-8 { margin-bottom: 2rem; }
  .mt-2 { margin-top: 0.5rem; }
  .flex { display: flex; }
  .justify-between { justify-content: space-between; }
  .items-end { align-items: flex-end; }
  .items-center { align-items: center; }
  .flex-1 { flex: 1 1 0%; }
  .w-full { width: 100%; }
  .w-16 { width: 4rem; }
  .w-20 { width: 5rem; }
  .w-24 { width: 6rem; }
  .w-32 { width: 8rem; }
  .underline { text-decoration-line: underline; }
  .underline-offset-4 { text-underline-offset: 4px; }
  .mx-auto { margin-left: auto; margin-right: auto; }
  .relative { position: relative; }
  .min-h-\\[160px\\] { min-height: 160px; }
  .ml-4 { margin-left: 1rem; }
`;

export const VoucherPrintPreviewModal = ({ isOpen, onClose, data }: VoucherPrintPreviewModalProps) => {
  const [enrichedData, setEnrichedData] = useState<Partial<VoucherPrintData>>(data);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      const loadCompany = async () => {
        try {
          const res = await fetchCompany();
          if (res?.data) {
            setEnrichedData({
              ...data,
              companyName: res.data.companyName || "AL ASRIYA ADVANCED TRADING LLC",
              companyAddress: res.data.buildingNo || "SULTANATE OF OMAN", // Customize based on company profile fields
              companyPhone: res.data.phone || "",
              companyMobile: res.data.mobile || "94661313",
            });
          } else {
            setEnrichedData(data);
          }
        } catch (error) {
          console.error("Failed to fetch company details for print:", error);
          setEnrichedData(data);
        }
      };
      loadCompany();
    }
  }, [isOpen, data]);

  if (!isOpen) return null;

  const handlePrint = () => {
    if (!containerRef.current) return;
    const content = containerRef.current.innerHTML;

    const printWindow = window.open("", "_blank", "width=800,height=800");
    if (!printWindow) {
      alert("Please allow pop-ups to print.");
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Print ${enrichedData.voucherType === "RECEIPT" ? "Receipt" : "Payment Voucher"}</title>
          <style>
            @media print {
              @page { margin: 10mm; size: auto; }
            }
            ${VOUCHER_PRINT_STYLES}
          </style>
        </head>
        <body>
          ${content}
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

  const handlePdfDownload = async () => {
    if (!containerRef.current) return;
    try {
      const html2pdf = (await import('html2pdf.js')).default;
      const element = document.createElement('div');
      element.innerHTML = `<style>${VOUCHER_PRINT_STYLES}</style>` + containerRef.current.innerHTML;

      const opt = {
        margin: 10,
        filename: `${enrichedData.voucherType}_${enrichedData.voucherNo}.pdf`,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const }
      };

      await html2pdf().from(element).set(opt).save();
    } catch (err) {
      console.error("PDF generation failed:", err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="flex flex-col w-full max-w-4xl max-h-[90vh] bg-white rounded-xl shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Print Preview</h2>
            <p className="text-xs text-gray-500">Preview how the voucher will look when printed</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="secondary" onClick={handlePdfDownload} icon={<Download size={16} />}>
              PDF
            </Button>
            <Button onClick={handlePrint} icon={<Printer size={16} />}>
              Print
            </Button>
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors ml-2">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Scrollable Preview Area */}
        <div className="flex-1 overflow-y-auto p-8 bg-gray-100 flex justify-center">
          <div className="w-full max-w-3xl shadow-lg bg-white">
            <div ref={containerRef}>
              <VoucherPrintTemplate data={enrichedData} />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
