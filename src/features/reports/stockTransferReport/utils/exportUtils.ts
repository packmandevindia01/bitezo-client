import { formatAmount } from "../../../../utils/currency";
import type { StockTransferReportRow } from "../types";

const formatHeaderDate = (dateStr: string): string => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
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
  .bg-zebra { background-color: #f8fafc; }
  .footer-row td { border-top: 1.5px solid #cbd5e1; font-weight: bold; background-color: #ffffff; padding: 8px; }
  @media print {
    body { padding: 0; }
    @page { size: A4 portrait; margin: 15mm; }
  }
`;

// ─── PDF Export ───────────────────────────────────────────────────────────────
export const exportStockTransferPDF = async (
  rows: StockTransferReportRow[],
  grandTotal: number,
  filters: any
) => {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const doc = new jsPDF();

  const companyName = localStorage.getItem("companyName") || "Company Name";
  const companyAddress = localStorage.getItem("companyAddress") || "";

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(companyName, 105, 14, { align: "center" });

  if (companyAddress) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(companyAddress, 105, 20, { align: "center" });
  }

  const dateStr = `Stock Transfer Report From ${formatHeaderDate(filters.fromDate)} To ${formatHeaderDate(filters.toDate)}`;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(dateStr, 105, 28, { align: "center" });
  const tw = doc.getTextWidth(dateStr);
  doc.line(105 - tw / 2, 29, 105 + tw / 2, 29);

  const body = rows.map((row) => [
    formatHeaderDate(row.transDate),
    String(row.refNo),
    row.fromBranch || "",
    row.toBranch || "",
    row.employee || "",
    formatAmount(Number(row.netAmount || 0)),
  ]);

  const foot = [[
    { content: "Total", colSpan: 5, styles: { halign: "right" as const, fontStyle: "bold" as const } },
    { content: formatAmount(grandTotal), styles: { halign: "right" as const, fontStyle: "bold" as const } },
  ]];

  autoTable(doc, {
    startY: 35,
    head: [["Date", "Ref No", "From Branch", "To Branch", "Employee", "Net Amount"]],
    body,
    foot,
    theme: "striped",
    headStyles: { fillColor: [73, 41, 62], textColor: [255, 255, 255] },
    footStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], lineWidth: { top: 0.5 }, lineColor: [200, 200, 200] },
    styles: { fontSize: 8, font: "helvetica" },
    didParseCell: (data) => {
      const col = data.column.index;
      if (data.section === "head" || data.section === "body") {
        if (col === 2 || col === 3 || col === 4) data.cell.styles.halign = "left";
        else if (col === 0 || col === 1) data.cell.styles.halign = "center";
        else if (col === 5) data.cell.styles.halign = "right";
      }
    },
  });

  doc.save(`Stock_Transfer_Report_${filters.fromDate}_to_${filters.toDate}.pdf`);
};

// ─── Excel Export ─────────────────────────────────────────────────────────────
export const exportStockTransferExcel = async (
  rows: StockTransferReportRow[],
  grandTotal: number,
  filters: any
) => {
  const XLSX = await import("xlsx-js-style");
  const companyName = localStorage.getItem("companyName") || "Company Name";
  const companyAddress = localStorage.getItem("companyAddress") || "";

  const cellHelper = (
    v: any,
    isBold = false,
    align: "left" | "center" | "right" = "left",
    extraStyle: any = {}
  ) => {
    const isNum = typeof v === "number";
    return {
      v: isNum ? v : String(v),
      t: isNum ? "n" : "s",
      z: isNum ? "0.000" : undefined,
      s: {
        font: { bold: isBold, name: "Calibri", sz: 10 },
        alignment: { horizontal: align, vertical: "center" },
        ...extraStyle,
      },
    };
  };

  const NUM_COLS = 6;
  const emptyRow = Array(NUM_COLS).fill("");

  const merges: any[] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: NUM_COLS - 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: NUM_COLS - 1 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: NUM_COLS - 1 } },
  ];

  const sheetRows: any[] = [];
  sheetRows.push([cellHelper(companyName, true, "center", { font: { bold: true, sz: 14 } }), ...emptyRow.slice(1)]);
  sheetRows.push([cellHelper(companyAddress, false, "center", { font: { sz: 8.5, color: { rgb: "475569" } } }), ...emptyRow.slice(1)]);
  sheetRows.push([
    cellHelper(
      `Stock Transfer Report From ${formatHeaderDate(filters.fromDate)} To ${formatHeaderDate(filters.toDate)}`,
      true, "center", { font: { bold: true, sz: 11, underline: true } }
    ),
    ...emptyRow.slice(1),
  ]);
  sheetRows.push(emptyRow);

  const hStyle = {
    font: { bold: true, color: { rgb: "FFFFFF" } },
    fill: { fgColor: { rgb: "49293E" } },
    border: {
      top: { style: "thin", color: { rgb: "CBD5E1" } },
      bottom: { style: "thin", color: { rgb: "CBD5E1" } },
      left: { style: "thin", color: { rgb: "CBD5E1" } },
      right: { style: "thin", color: { rgb: "CBD5E1" } },
    },
  };

  sheetRows.push([
    cellHelper("Date", true, "center", hStyle),
    cellHelper("Ref No", true, "center", hStyle),
    cellHelper("From Branch", true, "left", hStyle),
    cellHelper("To Branch", true, "left", hStyle),
    cellHelper("Employee", true, "left", hStyle),
    cellHelper("Net Amount", true, "right", hStyle),
  ]);

  rows.forEach((row, idx) => {
    const dStyle = {
      border: {
        top: { style: "thin", color: { rgb: "E2E8F0" } },
        bottom: { style: "thin", color: { rgb: "E2E8F0" } },
        left: { style: "thin", color: { rgb: "E2E8F0" } },
        right: { style: "thin", color: { rgb: "E2E8F0" } },
      },
      fill: idx % 2 === 1 ? { fgColor: { rgb: "F8FAFC" } } : undefined,
    };
    sheetRows.push([
      cellHelper(formatHeaderDate(row.transDate), false, "center", dStyle),
      cellHelper(String(row.refNo), false, "center", dStyle),
      cellHelper(row.fromBranch || "", false, "left", dStyle),
      cellHelper(row.toBranch || "", false, "left", dStyle),
      cellHelper(row.employee || "", false, "left", dStyle),
      cellHelper(Number(row.netAmount || 0), true, "right", dStyle),
    ]);
  });

  sheetRows.push(emptyRow);

  const sStyle = {
    font: { bold: true, color: { rgb: "000000" } },
    fill: { fgColor: { rgb: "F8FAFC" } },
    border: {
      top: { style: "medium", color: { rgb: "49293E" } },
      bottom: { style: "medium", color: { rgb: "49293E" } },
      left: { style: "thin", color: { rgb: "CBD5E1" } },
      right: { style: "thin", color: { rgb: "CBD5E1" } },
    },
  };
  const summaryRowIdx = sheetRows.length;
  merges.push({ s: { r: summaryRowIdx, c: 0 }, e: { r: summaryRowIdx, c: 4 } });
  sheetRows.push([
    cellHelper("Total", true, "right", sStyle),
    cellHelper("", false, "left", sStyle),
    cellHelper("", false, "left", sStyle),
    cellHelper("", false, "left", sStyle),
    cellHelper("", false, "left", sStyle),
    cellHelper(grandTotal, true, "right", { ...sStyle, font: { bold: true, color: { rgb: "49293E" } } }),
  ]);

  const ws = XLSX.utils.aoa_to_sheet(sheetRows);
  ws["!merges"] = merges;
  ws["!cols"] = [
    { wch: 13 }, // Date
    { wch: 10 }, // Ref No
    { wch: 20 }, // From Branch
    { wch: 20 }, // To Branch
    { wch: 20 }, // Employee
    { wch: 15 }, // Net Amount
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Stock Transfer");
  XLSX.writeFile(wb, `Stock_Transfer_Report_${filters.fromDate}_to_${filters.toDate}.xlsx`);
};

export { formatHeaderDate };
