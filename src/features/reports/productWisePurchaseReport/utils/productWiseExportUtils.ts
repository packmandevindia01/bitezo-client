import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx-js-style";
import { formatAmount } from "../../../../utils/currency";
import type { ProductWisePurchaseData, ProductWiseTotalData } from "../types";

const formatHeaderDate = (dateStr: string) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

export const exportProductWisePurchaseReportPDF = (
  purchaseData: ProductWisePurchaseData[],
  _totalData: ProductWiseTotalData | null,
  filters: any
) => {
  const doc = new jsPDF("l", "mm", "a4");
  
  const companyName = localStorage.getItem("companyName") || "FEKRA advertising";
  const companyAddress = localStorage.getItem("companyAddress") || "NEAR NESTO BESIDE BIN RASHIED SOUQ MABELA BUILDING NO 211 SECOND FLOOR FLAT NO 21";

  // Center Header details
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(companyName, 148.5, 14, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(companyAddress, 148.5, 20, { align: "center" });

  // Underlined title
  const dateStr = `Product Wise Purchase Report From ${formatHeaderDate(filters.fromDate)} To ${formatHeaderDate(filters.toDate)}`;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(dateStr, 148.5, 28, { align: "center" });
  
  const titleWidth = doc.getTextWidth(dateStr);
  doc.line(148.5 - titleWidth / 2, 29, 148.5 + titleWidth / 2, 29);

  // Table Headers
  const headers = [[
    "Date", "P/R No", "Inv No", "Supplier", "Code", "Product", "Qty", "Unit", "Price", "Discount", "Net Value", "Vat Amt", "Net Amount"
  ]];

  const body = purchaseData.map((row) => [
    row.invoiceDate ? formatHeaderDate(row.invoiceDate) : "",
    row["p/R Number"] || "",
    row.invoiceNo || "",
    row.supplierName || "",
    row.productCode || "",
    row.productnName || "",
    row.qty !== undefined && row.qty !== null ? formatAmount(Number(row.qty || 0)) : "",
    row.unit || "",
    row.price !== "" ? formatAmount(Number(row.price || 0)) : "",
    row.discount !== "" ? formatAmount(Number(row.discount || 0)) : "",
    row.netValue !== "" ? formatAmount(Number(row.netValue || 0)) : "",
    row.vatAmount !== "" ? formatAmount(Number(row.vatAmount || 0)) : "",
    row.netAmount !== "" ? formatAmount(Number(row.netAmount || 0)) : "",
  ]);

  const totalDiscount = purchaseData.reduce((s, r) => s + Number(r.discount || 0), 0);
  const totalNetValue = purchaseData.reduce((s, r) => s + Number(r.netValue || 0), 0);
  const totalVatAmount = purchaseData.reduce((s, r) => s + Number(r.vatAmount || 0), 0);
  const grandTotal = purchaseData.reduce((s, r) => s + Number(r.netAmount || 0), 0);

  const foot = [[
    { 
      content: "Total", 
      colSpan: 9, 
      styles: { halign: "right" as const, fontStyle: "bold" as const } 
    },
    { 
      content: formatAmount(totalDiscount), 
      styles: { halign: "right" as const, fontStyle: "bold" as const } 
    },
    { 
      content: formatAmount(totalNetValue), 
      styles: { halign: "right" as const, fontStyle: "bold" as const } 
    },
    { 
      content: formatAmount(totalVatAmount), 
      styles: { halign: "right" as const, fontStyle: "bold" as const } 
    },
    { 
      content: formatAmount(grandTotal), 
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
    styles: { fontSize: 7, font: "helvetica" },
    didParseCell: (data) => {
      const colIdx = data.column.index;
      if (data.section === "head" || data.section === "body") {
        if (colIdx === 1 || colIdx === 2 || colIdx === 4 || colIdx === 7) {
          data.cell.styles.halign = "center";
        } else if (colIdx === 0 || colIdx === 3 || colIdx === 5) {
          data.cell.styles.halign = "left";
        } else {
          data.cell.styles.halign = "right";
        }
      }
    }
  });

  doc.save(`Product_Wise_Purchase_Report_${filters.fromDate}_to_${filters.toDate}.pdf`);
};

export const exportProductWisePurchaseReportExcel = (
  purchaseData: ProductWisePurchaseData[],
  _totalData: ProductWiseTotalData | null,
  filters: any
) => {
  const companyName = localStorage.getItem("companyName") || "FEKRA advertising";
  const companyAddress = localStorage.getItem("companyAddress") || "NEAR NESTO BESIDE BIN RASHIED SOUQ MABELA BUILDING NO 211 SECOND FLOOR FLAT NO 21";

  const totalDiscount = purchaseData.reduce((s, r) => s + Number(r.discount || 0), 0);
  const totalNetValue = purchaseData.reduce((s, r) => s + Number(r.netValue || 0), 0);
  const totalVatAmount = purchaseData.reduce((s, r) => s + Number(r.vatAmount || 0), 0);
  const grandTotal = purchaseData.reduce((s, r) => s + Number(r.netAmount || 0), 0);

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
    { s: { r: 0, c: 0 }, e: { r: 0, c: 12 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 12 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: 12 } }
  ];

  // 1. Title Block
  rows.push([cellHelper(companyName, true, "center", { font: { bold: true, sz: 14 } }), "", "", "", "", "", "", "", "", "", "", "", ""]);
  rows.push([cellHelper(companyAddress, false, "center", { font: { sz: 8.5, color: { rgb: "475569" } } }), "", "", "", "", "", "", "", "", "", "", "", ""]);
  rows.push([cellHelper(`Product Wise Purchase Report From ${formatHeaderDate(filters.fromDate)} To ${formatHeaderDate(filters.toDate)}`, true, "center", { font: { bold: true, sz: 11, underline: true } }), "", "", "", "", "", "", "", "", "", "", "", ""]);
  rows.push(["", "", "", "", "", "", "", "", "", "", "", "", ""]);

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
    cellHelper("Date", true, "left", headerStyle),
    cellHelper("P/R No", true, "center", headerStyle),
    cellHelper("Inv No", true, "center", headerStyle),
    cellHelper("Supplier", true, "left", headerStyle),
    cellHelper("Code", true, "center", headerStyle),
    cellHelper("Product", true, "left", headerStyle),
    cellHelper("Qty", true, "right", headerStyle),
    cellHelper("Unit", true, "center", headerStyle),
    cellHelper("Price", true, "right", headerStyle),
    cellHelper("Discount", true, "right", headerStyle),
    cellHelper("Net Value", true, "right", headerStyle),
    cellHelper("Vat Amt", true, "right", headerStyle),
    cellHelper("Net Amount", true, "right", headerStyle)
  ]);

  // 3. Table Data
  purchaseData.forEach((row, idx) => {
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
      cellHelper(row.invoiceDate ? formatHeaderDate(row.invoiceDate) : "", false, "left", dataStyle),
      cellHelper(row["p/R Number"] || "", false, "center", dataStyle),
      cellHelper(row.invoiceNo || "", false, "center", dataStyle),
      cellHelper((row.supplierName || "").toUpperCase(), false, "left", dataStyle),
      cellHelper(row.productCode || "", false, "center", dataStyle),
      cellHelper((row.productnName || "").toUpperCase(), false, "left", dataStyle),
      cellHelper(row.qty !== undefined && row.qty !== null ? Number(row.qty || 0) : "", false, "right", dataStyle),
      cellHelper(row.unit || "", false, "center", dataStyle),
      cellHelper(row.price !== "" ? Number(row.price || 0) : "", false, "right", dataStyle),
      cellHelper(row.discount !== "" ? Number(row.discount || 0) : "", false, "right", dataStyle),
      cellHelper(row.netValue !== "" ? Number(row.netValue || 0) : "", false, "right", dataStyle),
      cellHelper(row.vatAmount !== "" ? Number(row.vatAmount || 0) : "", false, "right", dataStyle),
      cellHelper(row.netAmount !== "" ? Number(row.netAmount || 0) : "", false, "right", dataStyle)
    ]);
  });

  rows.push(["", "", "", "", "", "", "", "", "", "", "", "", ""]);
  rows.push(["", "", "", "", "", "", "", "", "", "", "", "", ""]);

  // 5. Totals / Summary Row
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
  merges.push({ s: { r: summaryRowIdx, c: 0 }, e: { r: summaryRowIdx, c: 8 } });

  rows.push([
    cellHelper("Total", true, "right", summaryStyle),
    "", "", "", "", "", "", "", "", // merged
    cellHelper(totalDiscount, true, "right", summaryStyle),
    cellHelper(totalNetValue, true, "right", summaryStyle),
    cellHelper(totalVatAmount, true, "right", summaryStyle),
    cellHelper(grandTotal, true, "right", { ...summaryStyle, font: { bold: true, color: { rgb: "49293E" } } })
  ]);

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!merges"] = merges;

  ws["!cols"] = [
    { wch: 12 }, // Date
    { wch: 10 }, // P/R No
    { wch: 10 }, // Inv No
    { wch: 25 }, // Supplier
    { wch: 10 }, // Code
    { wch: 25 }, // Product
    { wch: 10 }, // Qty
    { wch: 8 },  // Unit
    { wch: 12 }, // Price
    { wch: 12 }, // Discount
    { wch: 14 }, // Net Value
    { wch: 14 }, // Vat Amt
    { wch: 14 }  // Net Amount
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Product Wise Purchase Report");
  XLSX.writeFile(wb, `Product_Wise_Purchase_Report_${filters.fromDate}_to_${filters.toDate}.xlsx`);
};
