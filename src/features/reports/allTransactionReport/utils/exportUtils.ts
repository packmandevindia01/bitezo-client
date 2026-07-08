import { formatAmount } from "../../../../utils/currency";
import type { AllTransactionReportData } from "../types";

const formatHeaderDate = (dateStr: string) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

export const exportAllTransactionReportPDF = async (
  reportData: AllTransactionReportData[],
  totalAmount: number,
  filters: any
) => {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const doc = new jsPDF();
  
  const companyName = localStorage.getItem("companyName") || "FEKRA advertising";
  const companyAddress = localStorage.getItem("companyAddress") || "NEAR NESTO BESIDE BIN RASHIED SOUQ MABELA BUILDING NO 211 SECOND FLOOR FLAT NO 21";

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(companyName, 105, 14, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(companyAddress, 105, 20, { align: "center" });

  const dateStr = `All Transaction Report From ${formatHeaderDate(filters.fromDate)} To ${formatHeaderDate(filters.toDate)}`;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(dateStr, 105, 28, { align: "center" });
  
  const titleWidth = doc.getTextWidth(dateStr);
  doc.line(105 - titleWidth / 2, 29, 105 + titleWidth / 2, 29);

  const headers = [["SNo", "Voucher", "Particular", "Amount"]];
  const body = reportData.map((row, idx) => [
    idx + 1,
    row.voucher || "-",
    row.particular || "-",
    formatAmount(Number(row.amount || 0)),
  ]);

  const foot = [[
    { content: "", colSpan: 2, styles: { halign: "left" as const, fontStyle: "bold" as const } },
    { content: "Total", styles: { halign: "right" as const, fontStyle: "bold" as const } },
    { content: formatAmount(totalAmount), styles: { halign: "right" as const, fontStyle: "bold" as const } }
  ]];

  autoTable(doc, {
    startY: 35,
    head: headers,
    body: body,
    foot: foot,
    theme: "striped",
    headStyles: { fillColor: [73, 41, 62], textColor: [255, 255, 255] },
    footStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], lineWidth: { top: 0.5 }, lineColor: [200, 200, 200] },
    styles: { fontSize: 8, font: "helvetica" },
    didParseCell: (data) => {
      const colIdx = data.column.index;
      if (data.section === "head" || data.section === "body") {
        if (colIdx === 0) data.cell.styles.halign = "center";
        else if (colIdx === 1 || colIdx === 2) data.cell.styles.halign = "left";
        else if (colIdx === 3) data.cell.styles.halign = "right";
      }
    }
  });

  doc.save(`All_Transaction_Report_${filters.fromDate}_to_${filters.toDate}.pdf`);
};

export const exportAllTransactionReportExcel = async (
  reportData: AllTransactionReportData[],
  totalAmount: number,
  filters: any
) => {
  const XLSX = await import("xlsx-js-style");
  const companyName = localStorage.getItem("companyName") || "FEKRA advertising";
  const companyAddress = localStorage.getItem("companyAddress") || "NEAR NESTO BESIDE BIN RASHIED SOUQ MABELA BUILDING NO 211 SECOND FLOOR FLAT NO 21";

  const cellHelper = (v: any, isBold = false, align: "left" | "center" | "right" = "left", extraStyle = {}) => {
    const isNum = typeof v === "number";
    return {
      v: isNum ? v : String(v),
      t: isNum ? "n" : "s",
      z: isNum ? "0.000" : undefined,
      s: {
        font: { bold: isBold, name: "Calibri", sz: 10 },
        alignment: { horizontal: align, vertical: "center" },
        ...extraStyle
      }
    };
  };

  const rows: any[] = [];
  const merges: any[] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 3 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 3 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: 3 } }
  ];

  rows.push([cellHelper(companyName, true, "center", { font: { bold: true, sz: 14 } }), "", "", ""]);
  rows.push([cellHelper(companyAddress, false, "center", { font: { sz: 8.5, color: { rgb: "475569" } } }), "", "", ""]);
  rows.push([cellHelper(`All Transaction Report From ${formatHeaderDate(filters.fromDate)} To ${formatHeaderDate(filters.toDate)}`, true, "center", { font: { bold: true, sz: 11, underline: true } }), "", "", ""]);
  rows.push([]); 

  const headerStyle = { fill: { fgColor: { rgb: "49293E" } }, font: { color: { rgb: "FFFFFF" }, bold: true, sz: 10 } };
  rows.push([
    cellHelper("SNo", true, "center", headerStyle),
    cellHelper("Voucher", true, "left", headerStyle),
    cellHelper("Particular", true, "left", headerStyle),
    cellHelper("Amount", true, "right", headerStyle)
  ]);

  reportData.forEach((row, idx) => {
    rows.push([
      cellHelper(idx + 1, false, "center"),
      cellHelper(row.voucher || "-", false, "left"),
      cellHelper(row.particular || "-", false, "left"),
      cellHelper(Number(row.amount || 0), false, "right")
    ]);
  });

  rows.push([
    cellHelper(""),
    cellHelper(""),
    cellHelper("Total", true, "right"),
    cellHelper(totalAmount, true, "right")
  ]);

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!merges"] = merges;
  ws["!cols"] = [{ wch: 8 }, { wch: 25 }, { wch: 40 }, { wch: 15 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "AllTransactionReport");
  XLSX.writeFile(wb, `All_Transaction_Report_${filters.fromDate}_to_${filters.toDate}.xlsx`);
};
