import { formatAmount } from "../../../../utils/currency";
import type { ProductWiseStockAdjustmentRow } from "../types";

const formatHeaderDate = (dateStr: string): string => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

const PRINT_STYLES = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #ffffff; font-family: "Helvetica Neue", Helvetica, Arial, sans-serif; font-size: 11px; color: #1e293b; padding: 20px; }
  .text-center { text-align: center; }
  .text-left { text-align: left; }
  .text-right { text-align: right; }
  .font-bold { font-weight: bold; }
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
  .footer-row td { border-top: 1.5px solid #cbd5e1; border-bottom: none; font-weight: bold; background-color: #ffffff; padding: 8px; }
  .effect-plus { color: #15803d; font-weight: bold; }
  .effect-minus { color: #b91c1c; font-weight: bold; }
  @media print {
    body { padding: 0; }
    @page { size: A4 portrait; margin: 15mm; }
  }
`;

// ─── Export: PDF ─────────────────────────────────────────────────────────────
export const exportProductWiseStockAdjustmentPDF = async (
  rows: ProductWiseStockAdjustmentRow[],
  grandTotals: { qty: number; netAmount: number },
  filters: any
) => {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const doc = new jsPDF();

  const companyName =
    localStorage.getItem("companyName") || "Company Name";
  const companyAddress =
    localStorage.getItem("companyAddress") || "";

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(companyName, 105, 14, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  if (companyAddress) doc.text(companyAddress, 105, 20, { align: "center" });

  const dateStr = `Product Wise Stock Adjustment From ${formatHeaderDate(filters.fromDate)} To ${formatHeaderDate(filters.toDate)}`;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(dateStr, 105, 28, { align: "center" });
  const titleWidth = doc.getTextWidth(dateStr);
  doc.line(105 - titleWidth / 2, 29, 105 + titleWidth / 2, 29);

  const body = rows.map((row) => [
    formatHeaderDate(row.transDate),
    String(row.refNo),
    row.code || "",
    row.product || "",
    String(row.qty),
    row.unit || "",
    formatAmount(Number(row.price || 0)),
    formatAmount(Number(row.netAmount || 0)),
    row.type || "",
    row.effect || "",
  ]);

  const foot = [[
    { content: "Total", colSpan: 4, styles: { halign: "right" as const, fontStyle: "bold" as const } },
    { content: String(grandTotals.qty), styles: { halign: "center" as const, fontStyle: "bold" as const } },
    { content: "", styles: {} },
    { content: "", styles: {} },
    { content: formatAmount(grandTotals.netAmount), styles: { halign: "right" as const, fontStyle: "bold" as const } },
    { content: "", styles: {} },
    { content: "", styles: {} },
  ]];

  autoTable(doc, {
    startY: 35,
    head: [["Date", "Ref No", "Code", "Product", "Qty", "Unit", "Price", "Net Amount", "Type", "Effect"]],
    body,
    foot,
    theme: "striped",
    headStyles: { fillColor: [73, 41, 62], textColor: [255, 255, 255] },
    footStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], lineWidth: { top: 0.5 }, lineColor: [200, 200, 200] },
    styles: { fontSize: 8, font: "helvetica" },
    didParseCell: (data) => {
      const col = data.column.index;
      if (data.section === "head" || data.section === "body") {
        if (col === 3) data.cell.styles.halign = "left";
        else if (col === 0 || col === 1 || col === 2 || col === 4 || col === 5 || col === 8 || col === 9)
          data.cell.styles.halign = "center";
        else if (col === 6 || col === 7)
          data.cell.styles.halign = "right";
      }
    },
  });

  doc.save(`Product_Wise_Stock_Adjustment_${filters.fromDate}_to_${filters.toDate}.pdf`);
};

// ─── Export: Excel ────────────────────────────────────────────────────────────
export const exportProductWiseStockAdjustmentExcel = async (
  rows: ProductWiseStockAdjustmentRow[],
  grandTotals: { qty: number; netAmount: number },
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

  const headerStyle = {
    font: { bold: true, color: { rgb: "FFFFFF" } },
    fill: { fgColor: { rgb: "49293E" } },
    border: {
      top: { style: "thin", color: { rgb: "CBD5E1" } },
      bottom: { style: "thin", color: { rgb: "CBD5E1" } },
      left: { style: "thin", color: { rgb: "CBD5E1" } },
      right: { style: "thin", color: { rgb: "CBD5E1" } },
    },
  };

  const NUM_COLS = 10;
  const colArr = Array(NUM_COLS).fill("");

  const merges: any[] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: NUM_COLS - 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: NUM_COLS - 1 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: NUM_COLS - 1 } },
  ];

  const sheetRows: any[] = [];
  sheetRows.push([cellHelper(companyName, true, "center", { font: { bold: true, sz: 14 } }), ...colArr.slice(1)]);
  sheetRows.push([cellHelper(companyAddress, false, "center", { font: { sz: 8.5, color: { rgb: "475569" } } }), ...colArr.slice(1)]);
  sheetRows.push([
    cellHelper(
      `Product Wise Stock Adjustment From ${formatHeaderDate(filters.fromDate)} To ${formatHeaderDate(filters.toDate)}`,
      true, "center", { font: { bold: true, sz: 11, underline: true } }
    ),
    ...colArr.slice(1),
  ]);
  sheetRows.push(colArr); // empty spacer

  sheetRows.push([
    cellHelper("Date", true, "center", headerStyle),
    cellHelper("Ref No", true, "center", headerStyle),
    cellHelper("Code", true, "center", headerStyle),
    cellHelper("Product", true, "left", headerStyle),
    cellHelper("Qty", true, "center", headerStyle),
    cellHelper("Unit", true, "center", headerStyle),
    cellHelper("Price", true, "right", headerStyle),
    cellHelper("Net Amount", true, "right", headerStyle),
    cellHelper("Type", true, "center", headerStyle),
    cellHelper("Effect", true, "center", headerStyle),
  ]);

  rows.forEach((row, idx) => {
    const dataStyle = {
      border: {
        top: { style: "thin", color: { rgb: "E2E8F0" } },
        bottom: { style: "thin", color: { rgb: "E2E8F0" } },
        left: { style: "thin", color: { rgb: "E2E8F0" } },
        right: { style: "thin", color: { rgb: "E2E8F0" } },
      },
      fill: idx % 2 === 1 ? { fgColor: { rgb: "F8FAFC" } } : undefined,
    };
    sheetRows.push([
      cellHelper(formatHeaderDate(row.transDate), false, "center", dataStyle),
      cellHelper(String(row.refNo), false, "center", dataStyle),
      cellHelper(row.code || "", false, "center", dataStyle),
      cellHelper((row.product || "").toUpperCase(), false, "left", dataStyle),
      cellHelper(Number(row.qty || 0), false, "center", dataStyle),
      cellHelper(row.unit || "", false, "center", dataStyle),
      cellHelper(Number(row.price || 0), false, "right", dataStyle),
      cellHelper(Number(row.netAmount || 0), true, "right", dataStyle),
      cellHelper(row.type || "", false, "center", dataStyle),
      cellHelper(row.effect || "", false, "center", dataStyle),
    ]);
  });

  // Summary row
  sheetRows.push(colArr);
  const summaryStyle = {
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
  merges.push({ s: { r: summaryRowIdx, c: 0 }, e: { r: summaryRowIdx, c: 3 } });
  sheetRows.push([
    cellHelper("Total", true, "right", summaryStyle),
    cellHelper("", false, "left", summaryStyle),
    cellHelper("", false, "left", summaryStyle),
    cellHelper("", false, "left", summaryStyle),
    cellHelper(grandTotals.qty, true, "center", summaryStyle),
    cellHelper("", false, "left", summaryStyle),
    cellHelper("", false, "left", summaryStyle),
    cellHelper(grandTotals.netAmount, true, "right", { ...summaryStyle, font: { bold: true, color: { rgb: "49293E" } } }),
    cellHelper("", false, "left", summaryStyle),
    cellHelper("", false, "left", summaryStyle),
  ]);

  const ws = XLSX.utils.aoa_to_sheet(sheetRows);
  ws["!merges"] = merges;
  ws["!cols"] = [
    { wch: 13 }, // Date
    { wch: 10 }, // Ref No
    { wch: 10 }, // Code
    { wch: 28 }, // Product
    { wch: 8  }, // Qty
    { wch: 8  }, // Unit
    { wch: 14 }, // Price
    { wch: 14 }, // Net Amount
    { wch: 18 }, // Type
    { wch: 8  }, // Effect
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Stock Adjustment");
  XLSX.writeFile(wb, `Product_Wise_Stock_Adjustment_${filters.fromDate}_to_${filters.toDate}.xlsx`);
};

export { PRINT_STYLES, formatHeaderDate };
