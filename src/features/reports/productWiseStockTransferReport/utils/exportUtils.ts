import { formatAmount } from "../../../../utils/currency";
import type { ProductWiseStockTransferRow } from "../types";

export const formatHeaderDate = (dateStr: string): string => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
};

export const PRINT_STYLES = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #ffffff; font-family: "Helvetica Neue", Helvetica, Arial, sans-serif; font-size: 11px; color: #1e293b; padding: 20px; }
  .header-container { text-align: center; margin-bottom: 20px; line-height: 1.4; }
  .company-name { font-size: 18px; font-weight: bold; text-transform: uppercase; color: #000000; margin-bottom: 4px; }
  .company-address { font-size: 9px; color: #475569; margin-bottom: 8px; font-weight: bold; }
  .report-title { font-size: 12px; font-weight: bold; text-decoration: underline; margin-top: 10px; color: #000000; }
  table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 10px; }
  th, td { padding: 6px 8px; border: none; }
  th { background-color: #49293e; color: #ffffff; font-weight: bold; font-size: 10px; }
  tr { border-bottom: 0.5px solid #e2e8f0; }
  tr:last-child { border-bottom: none; }
  .footer-row td { border-top: 1.5px solid #cbd5e1; font-weight: bold; background-color: #ffffff; padding: 8px; }
  @media print {
    body { padding: 0; }
    @page { size: A4 landscape; margin: 12mm; }
  }
`;

// ─── PDF ──────────────────────────────────────────────────────────────────────
export const exportProductWiseStockTransferPDF = async (
  rows: ProductWiseStockTransferRow[],
  grandTotals: { qty: number; netAmount: number },
  filters: any
) => {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const doc = new jsPDF({ orientation: "landscape" });

  const companyName = localStorage.getItem("companyName") || "Company Name";
  const companyAddress = localStorage.getItem("companyAddress") || "";

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(companyName, 148, 14, { align: "center" });

  if (companyAddress) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(companyAddress, 148, 20, { align: "center" });
  }

  const dateStr = `Product Wise Stock Transfer From ${formatHeaderDate(filters.fromDate)} To ${formatHeaderDate(filters.toDate)}`;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(dateStr, 148, 28, { align: "center" });
  const tw = doc.getTextWidth(dateStr);
  doc.line(148 - tw / 2, 29, 148 + tw / 2, 29);

  const body = rows.map((row) => [
    formatHeaderDate(row.transDate),
    String(row.refNo),
    row.fromBranch || "",
    row.toBranch || "",
    row.code || "",
    row.product || "",
    String(row.qty),
    row.unit || "",
    formatAmount(Number(row.price || 0)),
    formatAmount(Number(row.netAmount || 0)),
  ]);

  const foot = [[
    { content: "Total", colSpan: 6, styles: { halign: "right" as const, fontStyle: "bold" as const } },
    { content: String(grandTotals.qty), styles: { halign: "center" as const, fontStyle: "bold" as const } },
    { content: "", styles: {} },
    { content: "", styles: {} },
    { content: formatAmount(grandTotals.netAmount), styles: { halign: "right" as const, fontStyle: "bold" as const } },
  ]];

  autoTable(doc, {
    startY: 35,
    head: [["Date", "Ref No", "From Branch", "To Branch", "Code", "Product", "Qty", "Unit", "Price", "Net Amount"]],
    body,
    foot,
    theme: "striped",
    headStyles: { fillColor: [73, 41, 62], textColor: [255, 255, 255] },
    footStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], lineWidth: { top: 0.5 }, lineColor: [200, 200, 200] },
    styles: { fontSize: 8, font: "helvetica" },
    didParseCell: (data) => {
      const col = data.column.index;
      if (data.section === "head" || data.section === "body") {
        if (col === 2 || col === 3 || col === 5) data.cell.styles.halign = "left";
        else if (col === 0 || col === 1 || col === 4 || col === 6 || col === 7) data.cell.styles.halign = "center";
        else if (col === 8 || col === 9) data.cell.styles.halign = "right";
      }
    },
  });

  doc.save(`Product_Wise_Stock_Transfer_${filters.fromDate}_to_${filters.toDate}.pdf`);
};

// ─── Excel ────────────────────────────────────────────────────────────────────
export const exportProductWiseStockTransferExcel = async (
  rows: ProductWiseStockTransferRow[],
  grandTotals: { qty: number; netAmount: number },
  filters: any
) => {
  const XLSX = await import("xlsx-js-style");
  const companyName = localStorage.getItem("companyName") || "Company Name";
  const companyAddress = localStorage.getItem("companyAddress") || "";

  const cell = (
    v: any,
    bold = false,
    align: "left" | "center" | "right" = "left",
    extra: any = {}
  ) => {
    const isNum = typeof v === "number";
    return {
      v: isNum ? v : String(v),
      t: isNum ? "n" : "s",
      z: isNum ? "0.000" : undefined,
      s: { font: { bold, name: "Calibri", sz: 10 }, alignment: { horizontal: align, vertical: "center" }, ...extra },
    };
  };

  const NUM_COLS = 10;
  const empty = Array(NUM_COLS).fill("");
  const merges: any[] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: NUM_COLS - 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: NUM_COLS - 1 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: NUM_COLS - 1 } },
  ];

  const rows_: any[] = [];
  rows_.push([cell(companyName, true, "center", { font: { bold: true, sz: 14 } }), ...empty.slice(1)]);
  rows_.push([cell(companyAddress, false, "center", { font: { sz: 8.5, color: { rgb: "475569" } } }), ...empty.slice(1)]);
  rows_.push([cell(`Product Wise Stock Transfer From ${formatHeaderDate(filters.fromDate)} To ${formatHeaderDate(filters.toDate)}`, true, "center", { font: { bold: true, sz: 11, underline: true } }), ...empty.slice(1)]);
  rows_.push(empty);

  const hStyle = {
    font: { bold: true, color: { rgb: "FFFFFF" } },
    fill: { fgColor: { rgb: "49293E" } },
    border: {
      top: { style: "thin", color: { rgb: "CBD5E1" } }, bottom: { style: "thin", color: { rgb: "CBD5E1" } },
      left: { style: "thin", color: { rgb: "CBD5E1" } }, right: { style: "thin", color: { rgb: "CBD5E1" } },
    },
  };
  rows_.push([
    cell("Date", true, "center", hStyle), cell("Ref No", true, "center", hStyle),
    cell("From Branch", true, "left", hStyle), cell("To Branch", true, "left", hStyle),
    cell("Code", true, "center", hStyle), cell("Product", true, "left", hStyle),
    cell("Qty", true, "center", hStyle), cell("Unit", true, "center", hStyle),
    cell("Price", true, "right", hStyle), cell("Net Amount", true, "right", hStyle),
  ]);

  rows.forEach((row, idx) => {
    const dStyle = {
      border: {
        top: { style: "thin", color: { rgb: "E2E8F0" } }, bottom: { style: "thin", color: { rgb: "E2E8F0" } },
        left: { style: "thin", color: { rgb: "E2E8F0" } }, right: { style: "thin", color: { rgb: "E2E8F0" } },
      },
      fill: idx % 2 === 1 ? { fgColor: { rgb: "F8FAFC" } } : undefined,
    };
    rows_.push([
      cell(formatHeaderDate(row.transDate), false, "center", dStyle),
      cell(String(row.refNo), false, "center", dStyle),
      cell(row.fromBranch || "", false, "left", dStyle),
      cell(row.toBranch || "", false, "left", dStyle),
      cell(row.code || "", false, "center", dStyle),
      cell((row.product || "").toUpperCase(), false, "left", dStyle),
      cell(Number(row.qty || 0), false, "center", dStyle),
      cell(row.unit || "", false, "center", dStyle),
      cell(Number(row.price || 0), false, "right", dStyle),
      cell(Number(row.netAmount || 0), true, "right", dStyle),
    ]);
  });

  rows_.push(empty);

  const sStyle = {
    font: { bold: true, color: { rgb: "000000" } },
    fill: { fgColor: { rgb: "F8FAFC" } },
    border: {
      top: { style: "medium", color: { rgb: "49293E" } }, bottom: { style: "medium", color: { rgb: "49293E" } },
      left: { style: "thin", color: { rgb: "CBD5E1" } }, right: { style: "thin", color: { rgb: "CBD5E1" } },
    },
  };
  const sRowIdx = rows_.length;
  merges.push({ s: { r: sRowIdx, c: 0 }, e: { r: sRowIdx, c: 5 } });
  rows_.push([
    cell("Total", true, "right", sStyle), cell("", false, "left", sStyle),
    cell("", false, "left", sStyle), cell("", false, "left", sStyle),
    cell("", false, "left", sStyle), cell("", false, "left", sStyle),
    cell(grandTotals.qty, true, "center", sStyle),
    cell("", false, "left", sStyle), cell("", false, "left", sStyle),
    cell(grandTotals.netAmount, true, "right", { ...sStyle, font: { bold: true, color: { rgb: "49293E" } } }),
  ]);

  const ws = XLSX.utils.aoa_to_sheet(rows_);
  ws["!merges"] = merges;
  ws["!cols"] = [
    { wch: 13 }, { wch: 9 }, { wch: 18 }, { wch: 18 },
    { wch: 10 }, { wch: 26 }, { wch: 7 }, { wch: 7 },
    { wch: 13 }, { wch: 14 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Product Wise Stock Transfer");
  XLSX.writeFile(wb, `Product_Wise_Stock_Transfer_${filters.fromDate}_to_${filters.toDate}.xlsx`);
};
