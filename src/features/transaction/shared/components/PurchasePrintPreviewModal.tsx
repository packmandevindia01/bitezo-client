import { useState, useRef, useEffect } from "react";
import { X, Download, Printer } from "lucide-react";
import { Button } from "../../../../components/common";
import { useToast } from "../../../../app/providers/useToast";
import { PurchasePrintTemplate, type PurchasePrintData } from "./PurchasePrintTemplate";
import { fetchCompany } from "../../../company/services/companyApi";
import axiosInstance from "../../../../api/axiosInstance";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatAmount } from "../../../../utils/formatters";
import { numberToWords } from "../../../../utils/numberToWords";

interface PurchasePrintPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: Partial<PurchasePrintData>;
}

// Plain CSS only — no Tailwind, no CSS variables, no oklch. Safe for any PDF library.
const PRINT_STYLES = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #ffffff; font-family: Arial, Helvetica, sans-serif; font-size: 12px; color: #000000; }
  .p-8 { padding: 2rem; }
  .font-sans { font-family: Arial, Helvetica, sans-serif; }
  .text-center { text-align: center; }
  .font-bold { font-weight: bold; }
  .font-normal { font-weight: normal; }
  .font-semibold { font-weight: 600; }
  .text-lg { font-size: 1.125rem; line-height: 1.75rem; }
  .text-xl { font-size: 1.25rem; line-height: 1.75rem; }
  .text-sm { font-size: 0.875rem; }
  .text-xs { font-size: 0.75rem; }
  .border-y { border-top: 1px solid #000000; border-bottom: 1px solid #000000; }
  .border-t { border-top: 1px solid #000000; }
  .border-b { border-bottom: 1px solid #000000; }
  .border-l { border-left: 1px solid #000000; }
  .border-r { border-right: 1px solid #000000; }
  .border { border: 1px solid #000000; }
  .border-collapse { border-collapse: collapse; }
  .py-1 { padding-top: 0.25rem; padding-bottom: 0.25rem; }
  .p-1 { padding: 0.25rem; }
  .pl-8 { padding-left: 2rem; }
  .pr-8 { padding-right: 2rem; }
  .pr-4 { padding-right: 1rem; }
  .pt-10 { padding-top: 2.5rem; }
  .pt-12 { padding-top: 3rem; }
  .mb-1 { margin-bottom: 0.25rem; }
  .mb-2 { margin-bottom: 0.5rem; }
  .mb-4 { margin-bottom: 1rem; }
  .mt-1 { margin-top: 0.25rem; }
  .mt-2 { margin-top: 0.5rem; }
  .mt-4 { margin-top: 1rem; }
  .mt-12 { margin-top: 3rem; }
  .mr-2 { margin-right: 0.5rem; }
  .uppercase { text-transform: uppercase; }
  .w-full { width: 100%; }
  .w-20 { width: 5rem; }
  .w-24 { width: 6rem; }
  .w-32 { width: 8rem; }
  .w-64 { width: 16rem; }
  .w-1\\/2 { width: 50%; }
  .w-3\\/4 { width: 75%; }
  .leading-relaxed { line-height: 1.625; }
  .leading-loose { line-height: 2; }
  .flex { display: flex; }
  .flex-1 { flex: 1 1 0%; }
  .justify-between { justify-content: space-between; }
  .items-start { align-items: flex-start; }
  .items-center { align-items: center; }
  .align-top { vertical-align: top; }
  .text-left { text-align: left; }
  .text-right { text-align: right; }
  table { border-collapse: collapse; }
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    @page { size: A4 portrait; margin: 15mm; }
  }
`;

/** Opens a clean new window with the invoice HTML and the browser print dialog. */
const openPrintWindow = (html: string, title: string) => {
  const win = window.open("", "_blank", "width=900,height=750");
  if (!win) {
    alert("Please allow popups for this site to enable printing.");
    return;
  }
  win.document.open();
  win.document.write(`<!DOCTYPE html>
<html>
  <head>
    <title>${title}</title>
    <style>${PRINT_STYLES}</style>
  </head>
  <body style="background:#ffffff;color:#000000;font-family:Arial,Helvetica,sans-serif;font-size:12px;">
    ${html}
    <script>
      setTimeout(function() { window.print(); }, 500);
    </script>
  </body>
</html>`);
  win.document.close();
};

export const PurchasePrintPreviewModal = ({
  isOpen,
  onClose,
  data,
}: PurchasePrintPreviewModalProps) => {
  const { showToast } = useToast();
  const [templateVariant, setTemplateVariant] = useState<"With Tax" | "Without Tax">("With Tax");
  const [mergedData, setMergedData] = useState<PurchasePrintData | null>(null);
  const [loading, setLoading] = useState(true);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadCompanyData = async () => {
      if (!isOpen || !data) return;
      setLoading(true);
      try {
        const companyRes = await fetchCompany();
        const comp = companyRes || {};
        setMergedData({
          ...data,
          companyName: comp.name || "DEMO COMPANY",
          companyAddress: `${comp.block || ""} ${comp.road || ""} ${comp.building || ""} Manama Bahrain`,
          companyTrn: comp.taxRegNo || "N/A",
        } as PurchasePrintData);

        // Fetch backoffice configurations for vatStatus
        try {
          const configRes = await axiosInstance.get<any>("/Branch/load-backoffice-master-data");
          const resBody = configRes.data;
          const configs = resBody?.configs || resBody?.data?.configs || [];
          const config = configs[0] || {};
          if (config.vatStatus === true) {
            setTemplateVariant("With Tax");
          } else if (config.vatStatus === false) {
            setTemplateVariant("Without Tax");
          }
        } catch (configErr) {
          console.error("Failed to fetch backoffice master data for vatStatus:", configErr);
        }
      } catch (err) {
        console.error("Failed to fetch company for print:", err);
        setMergedData({
          ...data,
          companyName: "DEMO COMPANY",
          companyAddress: "Manama, Bahrain",
          companyTrn: "N/A",
        } as PurchasePrintData);
      } finally {
        setLoading(false);
      }
    };
    loadCompanyData();
  }, [isOpen, data]);

  /** Export PDF — Native jsPDF implementation bypassing html2canvas to avoid oklch crash */
  const handleExportPDF = () => {
    if (!mergedData) return;
    showToast("Generating PDF, please wait...", "info");
    
    try {
      const doc = new jsPDF('p', 'mm', 'a4');
      const title = `${mergedData.docTitle}_${mergedData.purchaseNo || mergedData.voucherNo || "Export"}.pdf`;
      const isReturn = mergedData.docTitle.toLowerCase().includes("return");
      const isWithTax = templateVariant === "With Tax";
      
      const currencySymbol = localStorage.getItem("currencySymbol") || "BHD";
      const decimalPart = parseInt(localStorage.getItem("decimalPart") || "3", 10);
      
      let startY = 15;
      
      // Header
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text(mergedData.companyName, 105, startY, { align: 'center' });
      startY += 6;
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      mergedData.companyAddress.split(',').forEach(line => {
        doc.text(line.trim(), 105, startY, { align: 'center' });
        startY += 5;
      });
      doc.setFont("helvetica", "bold");
      doc.text(`TRN No : ${mergedData.companyTrn}`, 105, startY, { align: 'center' });
      startY += 10;
      
      // Title
      doc.setFontSize(12);
      doc.text(mergedData.docTitle.toUpperCase(), 105, startY, { align: 'center' });
      doc.line(15, startY - 4, 195, startY - 4);
      doc.line(15, startY + 2, 195, startY + 2);
      startY += 8;
      
      // Info section
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      
      // Left Info
      doc.text(`Supplier    : ${mergedData.supplierName}`, 15, startY);
      doc.text(`Address     : ${mergedData.supplierAddress}`, 15, startY + 5);
      doc.text(`TRN No      : ${mergedData.supplierTrn}`, 15, startY + 10);
      
      // Right Info
      doc.text(`${isReturn ? 'PRT No.' : 'Voucher No'} : ${mergedData.voucherNo}`, 120, startY);
      doc.text(`${isReturn ? 'Inv No' : 'Purchase No'} : ${mergedData.purchaseNo}`, 120, startY + 5);
      doc.text(`${isReturn ? 'PRT Dt' : 'Date'}       : ${mergedData.date}`, 120, startY + 10);
      if (!isReturn) {
        doc.text(`Paymode      : ${mergedData.paymode}`, 120, startY + 15);
      }
      
      startY += 20;
      
      // Table Data Preparation
      const head = [
        isReturn ? 'S/N' : 'No.',
        isReturn ? 'Description/Barcode' : 'Product',
        'Qty',
        ...(isReturn ? ['Unit'] : []),
        'FOC',
        ...(!isReturn ? ['Unit'] : []),
        'Price',
        ...(!isReturn ? ['Discount'] : []),
        ...(isReturn ? ['Amount', 'Dis Amt'] : []),
        isReturn ? 'Taxable Amount' : 'Net Value',
        ...(isWithTax ? [isReturn ? 'VAT Amt' : 'VAT (%)'] : []),
        ...(isWithTax && !isReturn ? ['VAT Amt'] : []),
        'Net Amount'
      ];

      const body = mergedData.items.map((item, idx) => {
        const row = [
          (idx + 1).toString(),
          item.productName,
          item.qty.toString(),
          ...(isReturn ? [item.unit] : []),
          formatAmount(item.foc),
          ...(!isReturn ? [item.unit] : []),
          formatAmount(item.price),
          ...(!isReturn ? [formatAmount(item.discount)] : []),
          ...(isReturn ? [formatAmount(item.amount), formatAmount(item.discount)] : []),
          formatAmount(item.netValue),
          ...(isWithTax ? [isReturn ? formatAmount(item.vatAmt) : `${formatAmount(item.vatPercent)}%`] : []),
          ...(isWithTax && !isReturn ? [formatAmount(item.vatAmt)] : []),
          formatAmount(item.netAmount)
        ];
        return row;
      });
      
      autoTable(doc, {
        startY: startY,
        head: [head],
        body: body,
        theme: 'plain',
        styles: { fontSize: 7, halign: 'center', cellPadding: 1, lineWidth: 0.1, lineColor: 0 },
        headStyles: { fontStyle: 'bold', lineWidth: 0.1, lineColor: 0 },
        columnStyles: { 1: { halign: 'left' } },
        didDrawPage: (data) => {
          startY = data.cursor ? data.cursor.y : startY;
        }
      });
      
      startY += 5;
      
      // Totals
      const totalGross = mergedData.items.reduce((sum, item) => sum + (item.amount || 0), 0);
      const totalDiscount = mergedData.items.reduce((sum, item) => sum + ((item.amount || 0) - (item.netValue || 0)), 0);
      const totalNetValue = mergedData.items.reduce((sum, item) => sum + (item.netValue || 0), 0);
      const totalVat = mergedData.items.reduce((sum, item) => sum + (item.vatAmt || 0), 0);
      const totalNetAmount = mergedData.items.reduce((sum, item) => sum + (item.netAmount || 0), 0);

      doc.setFontSize(8);
      if (isReturn) {
        doc.text("Total", 80, startY);
        doc.text(formatAmount(totalGross), 110, startY, { align: 'right' });
        doc.text(formatAmount(totalDiscount), 125, startY, { align: 'right' });
        doc.text(formatAmount(totalNetValue), 145, startY, { align: 'right' });
        if (isWithTax) doc.text(formatAmount(totalVat), 165, startY, { align: 'right' });
        doc.text(formatAmount(totalNetAmount), 190, startY, { align: 'right' });
      } else {
        doc.text("Total", 100, startY);
        doc.text(formatAmount(totalDiscount), 120, startY, { align: 'right' });
        doc.text(formatAmount(totalNetValue), 140, startY, { align: 'right' });
        if (isWithTax) doc.text(formatAmount(totalVat), 170, startY, { align: 'right' });
        doc.text(formatAmount(totalNetAmount), 190, startY, { align: 'right' });
      }
      
      doc.line(15, startY - 3, 195, startY - 3);
      doc.line(15, startY + 2, 195, startY + 2);
      
      startY += 8;
      
      // Bottom Section
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      const wordPrefix = isReturn ? 'Amount In Words: ' : 'Grand Total in words: ';
      const cName = currencySymbol; 
      const sName = "FILS"; 
      doc.text(`${wordPrefix} ${numberToWords(mergedData.totals.grandTotal, cName, sName, decimalPart)}`, 15, startY);
      
      // Totals Block Right
      doc.text(`${isReturn ? 'Total Amount' : 'Total'}`, 140, startY); doc.text(formatAmount(mergedData.totals.total), 190, startY, { align: 'right' }); startY += 4;
      doc.text(`Discount`, 140, startY); doc.text(formatAmount(mergedData.totals.discount), 190, startY, { align: 'right' }); startY += 4;
      doc.text(`Net Value`, 140, startY); doc.text(formatAmount(mergedData.totals.total - mergedData.totals.discount), 190, startY, { align: 'right' }); startY += 4;
      
      if (isWithTax) {
        doc.text(`VAT`, 140, startY); doc.text(formatAmount(mergedData.totals.vat), 190, startY, { align: 'right' }); startY += 4;
      }
      
      if (!isReturn) {
        doc.text(`Adjustment Amount`, 140, startY); doc.text(formatAmount(mergedData.totals.adjustmentAmount), 190, startY, { align: 'right' }); startY += 4;
        doc.text(`Round Off`, 140, startY); doc.text(formatAmount(mergedData.totals.roundOff), 190, startY, { align: 'right' }); startY += 4;
      }
      
      doc.line(140, startY - 2, 195, startY - 2);
      doc.text(`${isReturn ? 'Net Amount' : 'Grand Total'}`, 140, startY + 2); doc.text(formatAmount(mergedData.totals.grandTotal), 190, startY + 2, { align: 'right' });
      
      doc.save(title);
      showToast("PDF Downloaded successfully!", "success");
    } catch (err: any) {
      console.error(err);
      showToast("Failed to generate PDF.", "error");
    }
  };

  /** Print — same flow, directly triggers browser print */
  const handlePrint = () => {
    if (!printRef.current || !mergedData) return;
    const title = `${mergedData.docTitle} - ${mergedData.purchaseNo || mergedData.voucherNo || ""}`;
    openPrintWindow(printRef.current.innerHTML, title);
  };

  if (!isOpen) return null;

  return (
    /* Raw fullscreen overlay — bypasses Modal's built-in max-w constraint */
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal box — 98vw, no hard max-w cap from the shared Modal */}
      <div
        className="relative flex flex-col bg-slate-50 rounded-xl shadow-2xl z-10 animate-[fadeIn_0.2s_ease-in-out]"
        style={{ width: "98vw", maxWidth: "1400px", maxHeight: "95vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Toolbar ── */}
        <div className="flex items-center justify-between p-4 bg-white border-b rounded-t-xl sticky top-0 z-10 shrink-0">
          <h2 className="text-xl font-bold text-[#49293e]">Print Preview</h2>

          <div className="flex items-center gap-4">
            {/* Export PDF */}
            <Button
              onClick={handleExportPDF}
              disabled={loading}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
            >
              <Download size={18} />
              Export PDF
            </Button>

            {/* Print */}
            <Button
              onClick={handlePrint}
              disabled={loading}
              className="flex items-center gap-2"
            >
              <Printer size={18} />
              Print
            </Button>

            {/* Close */}
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-full text-slate-500"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* ── Preview ── */}
        <div className="flex-1 overflow-auto p-8 flex justify-center bg-slate-200 rounded-b-xl">
          {loading || !mergedData ? (
            <div className="flex items-center justify-center h-64 text-slate-500 text-sm">
              Loading preview...
            </div>
          ) : (
            <div className="shadow-2xl bg-white">
              <PurchasePrintTemplate
                ref={printRef}
                data={mergedData}
                templateVariant={templateVariant}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
