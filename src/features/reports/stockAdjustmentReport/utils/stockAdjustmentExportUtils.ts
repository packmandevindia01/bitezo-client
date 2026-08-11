import { formatAmount } from "../../../../utils/currency";
import type { StockAdjustmentReportItem } from "../types";

const formatHeaderDate = (dateStr: string) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

export const exportStockAdjustmentPDF = async (
  data: StockAdjustmentReportItem[],
  filters: any
) => {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const doc = new jsPDF();
  
  const companyName = localStorage.getItem("companyName") || "FEKRA advertising";
  const companyAddress = localStorage.getItem("companyAddress") || "NEAR NESTO BESIDE BIN RASHIED SOUQ MABELA BUILDING NO 211 SECOND FLOOR FLAT NO 21";

  // Center Header details
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(companyName, 105, 14, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(companyAddress, 105, 20, { align: "center" });

  // Underlined report title
  const dateStr = `Stock Adjustment Report From ${formatHeaderDate(filters.fromDate)} To ${formatHeaderDate(filters.toDate)}`;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(dateStr, 105, 28, { align: "center" });
  
  const titleWidth = doc.getTextWidth(dateStr);
  doc.line(105 - titleWidth / 2, 29, 105 + titleWidth / 2, 29);

  // Headers & Body
  const headers = [["SNo", "Trans Date", "Ref No", "Branch", "Employee", "Net Amount"]];
  const body = data.map((row, idx) => [
    row.sNo || idx + 1,
    row.transDate ? formatHeaderDate(row.transDate) : "",
    row.refNo || "",
    row.branch || "",
    row.employee || "",
    formatAmount(Number(row.netAmount || 0)),
  ]);

  const totalNetAmount = data.reduce((s, r) => s + Number(r.netAmount || 0), 0);

  const foot = [[
    { 
      content: `Total Records: ${data.length}`, 
      colSpan: 4, 
      styles: { halign: "left" as const, fontStyle: "bold" as const } 
    },
    { 
      content: "Total", 
      styles: { halign: "right" as const, fontStyle: "bold" as const } 
    },
    { 
      content: formatAmount(totalNetAmount), 
      styles: { halign: "right" as const, fontStyle: "bold" as const } 
    }
  ]];

  autoTable(doc, {
    startY: 35,
    head: headers,
    body: body,
    foot: foot,
    theme: "striped",
    headStyles: { fillColor: [73, 41, 62], textColor: [255, 255, 255] }, // #49293e
    footStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], lineWidth: { top: 0.5 }, lineColor: [200, 200, 200] },
    styles: { fontSize: 8, font: "helvetica" },
    didParseCell: (dataCell) => {
      const colIdx = dataCell.column.index;
      if (dataCell.section === "head" || dataCell.section === "body") {
        if (colIdx === 0 || colIdx === 1 || colIdx === 2) {
          dataCell.cell.styles.halign = "center";
        } else if (colIdx === 3 || colIdx === 4) {
          dataCell.cell.styles.halign = "left";
        } else if (colIdx === 5) {
          dataCell.cell.styles.halign = "right";
        }
      }
    }
  });

  doc.save(`Stock_Adjustment_Report_${filters.fromDate}_to_${filters.toDate}.pdf`);
};

export const exportStockAdjustmentExcel = async (
  data: StockAdjustmentReportItem[],
  filters: any
) => {
  const XLSX = await import("xlsx-js-style");
  const companyName = localStorage.getItem("companyName") || "FEKRA advertising";
  const companyAddress = localStorage.getItem("companyAddress") || "NEAR NESTO BESIDE BIN RASHIED SOUQ MABELA BUILDING NO 211 SECOND FLOOR FLAT NO 21";

  const totalNetAmount = data.reduce((s, r) => s + Number(r.netAmount || 0), 0);

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
    { s: { r: 0, c: 0 }, e: { r: 0, c: 5 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 5 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: 5 } }
  ];

  // 1. Title Block
  rows.push([cellHelper(companyName, true, "center", { font: { bold: true, sz: 14 } }), "", "", "", "", ""]);
  rows.push([cellHelper(companyAddress, false, "center", { font: { sz: 8.5, color: { rgb: "475569" } } }), "", "", "", "", ""]);
  rows.push([cellHelper(`Stock Adjustment Report From ${formatHeaderDate(filters.fromDate)} To ${formatHeaderDate(filters.toDate)}`, true, "center", { font: { bold: true, sz: 11, underline: true } }), "", "", "", "", ""]);
  rows.push(["", "", "", "", "", ""]); // empty divider

  // 2. Table Headers Style
  const headerStyle = {
    font: { bold: true, color: { rgb: "FFFFFF" } },
    fill: { fgColor: { rgb: "49293E" } },
    border: {
      top: { style: "thin", color: { rgb: "CBD5E1" } },
      bottom: { style: "thin", color: { rgb: "CBD5E1" } },
      left: { style: "thin", color: { rgb: "CBD5E1" } },
      right: { style: "thin", color: { rgb: "CBD5E1" } }
    }
  };

  rows.push([
    cellHelper("SNo", true, "center", headerStyle),
    cellHelper("Trans Date", true, "center", headerStyle),
    cellHelper("Ref No", true, "center", headerStyle),
    cellHelper("Branch", true, "left", headerStyle),
    cellHelper("Employee", true, "left", headerStyle),
    cellHelper("Net Amount", true, "right", headerStyle)
  ]);

  // 3. Table Data
  data.forEach((row, idx) => {
    const dataStyle = {
      border: {
        top: { style: "thin", color: { rgb: "E2E8F0" } },
        bottom: { style: "thin", color: { rgb: "E2E8F0" } },
        left: { style: "thin", color: { rgb: "E2E8F0" } },
        right: { style: "thin", color: { rgb: "E2E8F0" } }
      },
      fill: idx % 2 === 1 ? { fgColor: { rgb: "F8FAFC" } } : undefined
    };

    rows.push([
      cellHelper(row.sNo || idx + 1, false, "center", dataStyle),
      cellHelper(row.transDate ? formatHeaderDate(row.transDate) : "", false, "center", dataStyle),
      cellHelper(row.refNo || "", false, "center", dataStyle),
      cellHelper(row.branch || "", false, "left", dataStyle),
      cellHelper(row.employee || "", false, "left", dataStyle),
      cellHelper(Number(row.netAmount || 0), true, "right", dataStyle)
    ]);
  });

  // 4. Totals / Summary Row
  rows.push(["", "", "", "", "", ""]);
  rows.push(["", "", "", "", "", ""]);

  const summaryStyle = {
    font: { bold: true, color: { rgb: "000000" } },
    fill: { fgColor: { rgb: "F8FAFC" } },
    border: {
      top: { style: "medium", color: { rgb: "49293E" } },
      bottom: { style: "medium", color: { rgb: "49293E" } },
      left: { style: "thin", color: { rgb: "CBD5E1" } },
      right: { style: "thin", color: { rgb: "CBD5E1" } }
    }
  };

  const summaryRowIdx = rows.length;
  merges.push({ s: { r: summaryRowIdx, c: 0 }, e: { r: summaryRowIdx, c: 4 } });

  rows.push([
    cellHelper(`Total Records: ${data.length}`, true, "left", summaryStyle),
    cellHelper("", false, "left", summaryStyle),
    cellHelper("", false, "left", summaryStyle),
    cellHelper("", false, "left", summaryStyle),
    cellHelper("", false, "left", summaryStyle),
    cellHelper(totalNetAmount, true, "right", { ...summaryStyle, font: { bold: true, color: { rgb: "49293E" } } })
  ]);

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!merges"] = merges;
  ws["!cols"] = [
    { wch: 8 },  // SNo
    { wch: 15 }, // Trans Date
    { wch: 10 }, // Ref No
    { wch: 25 }, // Branch
    { wch: 25 }, // Employee
    { wch: 18 }  // Net Amount
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Stock Adjustment Report");
  XLSX.writeFile(wb, `Stock_Adjustment_Report_${filters.fromDate}_to_${filters.toDate}.xlsx`);
};
