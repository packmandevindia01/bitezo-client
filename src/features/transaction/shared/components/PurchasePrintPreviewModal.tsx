import { useState, useRef, useEffect } from "react";
import { X, Download, Printer } from "lucide-react";
import { Button } from "../../../../components/common";
import { useToast } from "../../../../app/providers/useToast";
import { PurchasePrintTemplate } from "./PurchasePrintTemplate";
import type { PurchasePrintData } from "./PurchasePrintTemplate";
import { fetchCompany } from "../../../company/services/companyApi";
import axiosInstance from "../../../../api/axiosInstance";

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
      window.onload = function() {
        setTimeout(function() { window.print(); }, 500);
      };
    <\\/script>
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

  /** Export PDF — opens new window, user selects "Save as PDF" in the print dialog */
  const handleExportPDF = () => {
    if (!printRef.current || !mergedData) return;
    const title = `${mergedData.docTitle} - ${mergedData.purchaseNo || mergedData.voucherNo || ""}`;
    showToast('Opening print dialog — choose "Save as PDF" to export.', "info");
    openPrintWindow(printRef.current.innerHTML, title);
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
