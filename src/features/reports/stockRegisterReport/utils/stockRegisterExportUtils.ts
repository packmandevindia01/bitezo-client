import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx-js-style";
import { formatAmount } from "../../../../utils/currency";
import type { StockRegisterProductData, StockRegisterTotalData } from "../types";

const formatHeaderDate = (dateStr: string) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

export const exportStockRegisterReportPDF = (
  productData: StockRegisterProductData[],
  _totalData: StockRegisterTotalData | null,
  filters: any
) => {
  const doc = new jsPDF("p", "mm", "a4");
  
  const companyName = localStorage.getItem("companyName") || "FEKRA advertising";
  const companyAddress = localStorage.getItem("companyAddress") || "NEAR NESTO BESIDE BIN RASHIED SOUQ MABELA BUILDING NO 211 SECOND FLOOR FLAT NO 21";

  // Center Header details
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(companyName, 105, 14, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(companyAddress, 105, 20, { align: "center" });

  // Underlined title
  const dateStr = `Stock Register Report As On Date: ${formatHeaderDate(filters.asOnDate)}`;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(dateStr, 105, 28, { align: "center" });
  
  const titleWidth = doc.getTextWidth(dateStr);
  doc.line(105 - titleWidth / 2, 29, 105 + titleWidth / 2, 29);

  // Table Headers
  const headers = [[
    "SNo", "Code", "Product", "Group", "Category", "Stock", "Cost", "Value"
  ]];

  const body = productData.map((row, idx) => [
    idx + 1,
    row.productCode || "",
    row.productName || "",
    row.group || "",
    row.category || "",
    row.stock || "",
    row.cost !== "" ? formatAmount(Number(row.cost || 0)) : "",
    row.value !== "" ? formatAmount(Number(row.value || 0)) : "",
  ]);

  const totalValue = productData.reduce((s, r) => s + Number(r.value || 0), 0);

  const foot = [[
    { 
      content: "Total", 
      colSpan: 7, 
      styles: { halign: "right" as const, fontStyle: "bold" as const } 
    },
    { 
      content: formatAmount(totalValue), 
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
    didParseCell: (data) => {
      const colIdx = data.column.index;
      if (data.section === "head" || data.section === "body") {
        if (colIdx === 0 || colIdx === 1 || colIdx === 5) {
          data.cell.styles.halign = "center";
        } else if (colIdx === 2 || colIdx === 3 || colIdx === 4) {
          data.cell.styles.halign = "left";
        } else {
          data.cell.styles.halign = "right";
        }
      }
    }
  });

  doc.save(`Stock_Register_Report_${filters.asOnDate}.pdf`);
};

export const exportStockRegisterReportExcel = (
  productData: StockRegisterProductData[],
  _totalData: StockRegisterTotalData | null,
  filters: any
) => {
  const companyName = localStorage.getItem("companyName") || "FEKRA advertising";
  const companyAddress = localStorage.getItem("companyAddress") || "NEAR NESTO BESIDE BIN RASHIED SOUQ MABELA BUILDING NO 211 SECOND FLOOR FLAT NO 21";

  const totalValue = productData.reduce((s, r) => s + Number(r.value || 0), 0);

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
    { s: { r: 0, c: 0 }, e: { r: 0, c: 7 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 7 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: 7 } }
  ];

  // 1. Title Block
  rows.push([cellHelper(companyName, true, "center", { font: { bold: true, sz: 14 } }), "", "", "", "", "", "", ""]);
  rows.push([cellHelper(companyAddress, false, "center", { font: { sz: 8.5, color: { rgb: "475569" } } }), "", "", "", "", "", "", ""]);
  rows.push([cellHelper(`Stock Register Report As On Date: ${formatHeaderDate(filters.asOnDate)}`, true, "center", { font: { bold: true, sz: 11, underline: true } }), "", "", "", "", "", "", ""]);
  rows.push(["", "", "", "", "", "", "", ""]);

  // 2. Table Headers
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
    cellHelper("Code", true, "center", headerStyle),
    cellHelper("Product", true, "left", headerStyle),
    cellHelper("Group", true, "left", headerStyle),
    cellHelper("Category", true, "left", headerStyle),
    cellHelper("Stock", true, "center", headerStyle),
    cellHelper("Cost", true, "right", headerStyle),
    cellHelper("Value", true, "right", headerStyle)
  ]);

  // 3. Table Data
  productData.forEach((row, idx) => {
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
      cellHelper(idx + 1, false, "center", dataStyle),
      cellHelper(row.productCode || "", false, "center", dataStyle),
      cellHelper((row.productName || "").toUpperCase(), false, "left", dataStyle),
      cellHelper((row.group || "").toUpperCase(), false, "left", dataStyle),
      cellHelper((row.category || "").toUpperCase(), false, "left", dataStyle),
      cellHelper(row.stock || "", false, "center", dataStyle),
      cellHelper(row.cost !== "" ? Number(row.cost || 0) : "", false, "right", dataStyle),
      cellHelper(row.value !== "" ? Number(row.value || 0) : "", false, "right", dataStyle)
    ]);
  });

  rows.push(["", "", "", "", "", "", "", ""]);
  rows.push(["", "", "", "", "", "", "", ""]);

  // 5. Totals Row
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
  merges.push({ s: { r: summaryRowIdx, c: 0 }, e: { r: summaryRowIdx, c: 6 } });

  rows.push([
    cellHelper("Total", true, "right", summaryStyle),
    "", "", "", "", "", "", // merged
    cellHelper(totalValue, true, "right", { ...summaryStyle, font: { bold: true, color: { rgb: "49293E" } } })
  ]);

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!merges"] = merges;

  ws["!cols"] = [
    { wch: 8 },  // SNo
    { wch: 10 }, // Code
    { wch: 25 }, // Product
    { wch: 15 }, // Group
    { wch: 15 }, // Category
    { wch: 18 }, // Stock
    { wch: 12 }, // Cost
    { wch: 14 }  // Value
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Stock Register Report");
  XLSX.writeFile(wb, `Stock_Register_Report_${filters.asOnDate}.xlsx`);
};
