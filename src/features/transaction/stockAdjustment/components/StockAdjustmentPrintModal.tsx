import React, { useRef, useState } from "react";
import { X, Download, FileSpreadsheet, Printer } from "lucide-react";
import { Button } from "../../../../components/common";
import { useToast } from "../../../../app/providers/useToast";
import type { StockAdjustmentForm, StockAdjustmentLineItem } from "../types";

// Plain CSS only — no Tailwind, no CSS variables. Safe for html2pdf.
const printStyles = `
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    @page { size: A4 portrait; margin: 0.5in; }
  }
  .print-wrapper {
    width: 210mm;
    min-height: 297mm;
    background: white;
    color: black;
    font-family: Arial, sans-serif;
    padding: 10mm 15mm;
    margin: 0 auto;
    box-sizing: border-box;
    font-size: 12px;
  }
  .print-header {
    text-align: center;
    border: 1px solid #000;
    border-radius: 10px;
    padding: 20px;
    margin-bottom: 20px;
  }
  .print-company {
    font-size: 16px;
    font-weight: bold;
    margin: 0 0 10px 0;
  }
  .print-sub {
    font-size: 14px;
    font-weight: bold;
    margin: 0;
  }
  .print-title {
    text-align: center;
    font-size: 14px;
    font-weight: bold;
    text-decoration: underline;
    margin-bottom: 20px;
  }
  .print-meta {
    display: flex;
    justify-content: space-between;
    margin-bottom: 10px;
    font-weight: bold;
    font-size: 12px;
  }
  .print-meta div {
    display: flex;
    gap: 10px;
  }
  .print-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 12px;
  }
  .print-table th, .print-table td {
    border: 1px solid #000;
    padding: 6px 10px;
    text-align: left;
  }
  .print-table th {
    font-weight: bold;
  }
`;

interface PrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  form: StockAdjustmentForm;
  items: StockAdjustmentLineItem[];
  branches: { value: string; label: string }[];
}

const openPrintWindow = (html: string, title: string) => {
  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${title}</title>
        <style>${printStyles}</style>
      </head>
      <body>
        ${html}
        <script>
          window.onload = () => {
            window.print();
            setTimeout(() => window.close(), 500);
          };
        </script>
      </body>
    </html>
  `);
  win.document.close();
};

const StockAdjustmentPrintModal: React.FC<PrintModalProps> = ({
  isOpen,
  onClose,
  form,
  items,
  branches
}) => {
  const { showToast } = useToast();
  const printRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);

  const branchName = branches.find(b => String(b.value) === String(form.branch))?.label || form.branch;
  const docTitle = "STOCK_ADJUSTMENT_REPORT";

  const handleExportPDF = async () => {
    if (!printRef.current) return;
    try {
      setLoading(true);
      showToast('Generating PDF...', 'info');
      // @ts-ignore
      const html2pdf = (await import('html2pdf.js')).default;
      
      const elementToPrint = document.createElement('div');
      elementToPrint.innerHTML = `<style>${printStyles}</style>` + printRef.current.innerHTML;

      const opt = {
        margin:       0.2,
        filename:     `${docTitle}_${form.refNo || "Draft"}.pdf`,
        image:        { type: 'jpeg' as const, quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true },
        jsPDF:        { unit: 'in' as const, format: 'a4' as const, orientation: 'portrait' as const }
      };

      html2pdf().set(opt).from(elementToPrint).save();
    } catch (err) {
      console.error("PDF generation failed:", err);
      showToast('Failed to generate PDF', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleExportExcel = async () => {
    try {
      const XLSX = await import("xlsx-js-style");
      // Create worksheet data
      const wsData = [
        ["AL ASRIYA ADVANCED TRADING LLC"],
        ["SULTANATE OF OMAN"],
        [""],
        ["STOCK ADJUSTMENT REPORT"],
        [""],
        [`ST No : ${form.refNo || ""}`, "", `Depot Name : ${branchName || ""}`, "", `Date : ${form.date ? form.date.split("-").reverse().join("/") : ""}`],
        [""],
        ["No", "Product", "Code", "Stock Effect", "Quantity"]
      ];

      items.forEach((item, index) => {
        wsData.push([
          (index + 1).toString(),
          item.product,
          item.code || "",
          item.effect === "+" ? "(+)" : item.effect === "-" ? "(-)" : "(All)",
          item.qty.toString()
        ]);
      });

      const ws = XLSX.utils.aoa_to_sheet(wsData);

      // Merge headers across the 5 columns
      ws["!merges"] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 4 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: 4 } },
        { s: { r: 3, c: 0 }, e: { r: 3, c: 4 } },
      ];

      // Add styles
      const titleStyle = {
        font: { bold: true, sz: 12 },
        alignment: { horizontal: "center", vertical: "center" }
      };

      const tableHeaderStyle = {
        font: { bold: true, color: { rgb: "000000" } },
        fill: { patternType: "solid", fgColor: { rgb: "E5E7EB" } }, // Tailwind gray-200
        alignment: { horizontal: "center", vertical: "center" },
        border: {
          top: { style: "thin", color: { rgb: "000000" } },
          bottom: { style: "thin", color: { rgb: "000000" } },
          left: { style: "thin", color: { rgb: "000000" } },
          right: { style: "thin", color: { rgb: "000000" } }
        }
      };

      const tableBodyStyle = {
        alignment: { vertical: "center" },
        border: {
          top: { style: "thin", color: { rgb: "000000" } },
          bottom: { style: "thin", color: { rgb: "000000" } },
          left: { style: "thin", color: { rgb: "000000" } },
          right: { style: "thin", color: { rgb: "000000" } }
        }
      };
      
      const tableBodyCenterStyle = {
        ...tableBodyStyle,
        alignment: { horizontal: "center", vertical: "center" }
      };

      if (ws["A1"]) ws["A1"].s = titleStyle;
      if (ws["A2"]) ws["A2"].s = titleStyle;
      if (ws["A4"]) ws["A4"].s = { ...titleStyle, font: { bold: true, sz: 14, underline: true } };

      ["A8", "B8", "C8", "D8", "E8"].forEach(cell => {
        if (ws[cell]) ws[cell].s = tableHeaderStyle;
      });

      items.forEach((_, index) => {
        const rowIndex = 9 + index;
        if (ws[`A${rowIndex}`]) ws[`A${rowIndex}`].s = tableBodyCenterStyle;
        if (ws[`B${rowIndex}`]) ws[`B${rowIndex}`].s = tableBodyStyle;
        if (ws[`C${rowIndex}`]) ws[`C${rowIndex}`].s = tableBodyStyle;
        if (ws[`D${rowIndex}`]) ws[`D${rowIndex}`].s = tableBodyCenterStyle;
        if (ws[`E${rowIndex}`]) ws[`E${rowIndex}`].s = tableBodyCenterStyle;
      });

      // Simple column widths
      ws["!cols"] = [
        { wch: 15 },
        { wch: 40 },
        { wch: 15 },
        { wch: 15 },
        { wch: 10 }
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Stock Adjustment");
      XLSX.writeFile(wb, `${docTitle}_${form.refNo || "Draft"}.xlsx`);
    } catch (err) {
      console.error("Excel generation failed:", err);
      showToast('Failed to generate Excel', 'error');
    }
  };

  const handlePrint = () => {
    if (!printRef.current) return;
    openPrintWindow(printRef.current.innerHTML, docTitle);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div
        className="relative flex flex-col bg-slate-50 rounded-xl shadow-2xl z-10 animate-[fadeIn_0.2s_ease-in-out]"
        style={{ width: "98vw", maxWidth: "1000px", maxHeight: "95vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Toolbar */}
        <div className="flex items-center justify-between p-4 bg-white border-b rounded-t-xl sticky top-0 z-10 shrink-0">
          <h2 className="text-xl font-bold text-[#49293e]">Export Preview</h2>

          <div className="flex items-center gap-2 md:gap-4">
            <Button
              onClick={handleExportExcel}
              disabled={loading}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <FileSpreadsheet size={18} />
              <span className="hidden md:inline">Excel</span>
            </Button>

            <Button
              onClick={handleExportPDF}
              disabled={loading}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white"
            >
              <Download size={18} />
              <span className="hidden md:inline">PDF</span>
            </Button>

            <Button
              onClick={handlePrint}
              disabled={loading}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Printer size={18} />
              <span className="hidden md:inline">Print</span>
            </Button>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors ml-2"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Preview Area */}
        <div className="flex-1 overflow-y-auto bg-slate-200 p-4 md:p-8 flex justify-center">
          <div 
            ref={printRef}
            className="print-wrapper shadow-lg"
          >
            <style>{printStyles}</style>

            <div className="print-header">
              <p className="print-company">AL ASRIYA ADVANCED TRADING LLC</p>
              <p className="print-sub">SULTANATE OF OMAN</p>
            </div>

            <div className="print-title">STOCK ADJUSTMENT REPORT</div>

            <div className="print-meta">
              <div>
                <span style={{ width: "60px" }}>ST No</span>
                <span>:</span>
                <span style={{ minWidth: "100px" }}>{form.refNo || "______________"}</span>
              </div>
              <div>
                <span style={{ width: "80px" }}>Depot Name</span>
                <span>:</span>
                <span style={{ minWidth: "150px" }}>{branchName || "______________"}</span>
              </div>
              <div>
                <span style={{ width: "40px" }}>Date</span>
                <span>:</span>
                <span style={{ minWidth: "100px" }}>{form.date ? form.date.split("-").reverse().join("/") : "______________"}</span>
              </div>
            </div>

            <table className="print-table">
              <thead>
                <tr>
                  <th style={{ width: "5%" }}>No</th>
                  <th style={{ width: "45%" }}>Product</th>
                  <th style={{ width: "15%" }}>Code</th>
                  <th style={{ width: "15%" }}>Stock Effect</th>
                  <th style={{ width: "20%" }}>Quantity</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ textAlign: "center", padding: "20px" }}>No items found</td>
                  </tr>
                )}
                {items.map((item, index) => (
                  <tr key={index}>
                    <td>{index + 1}</td>
                    <td>{item.product}</td>
                    <td>{item.code}</td>
                    <td>{item.effect === "+" ? "(+)" : item.effect === "-" ? "(-)" : "(All)"}</td>
                    <td>{item.qty}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StockAdjustmentPrintModal;
