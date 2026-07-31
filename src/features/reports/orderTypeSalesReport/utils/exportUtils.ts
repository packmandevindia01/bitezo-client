import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { formatAmount } from "../../../../utils/currency";
import type { OrderTypeSalesReportResponse } from "../types";

const formatDate = (dateStr: string) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

export const exportOrderTypeSalesReportPDF = (
  reportData: OrderTypeSalesReportResponse["data"] | undefined,
  metadata: {
    branchName: string;
    fromDate: string;
    toDate: string;
  }
) => {
  if (!reportData || !reportData.columns || reportData.columns.length === 0) return;

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

  const titleStr = `Order Type Sales Report - Branch: ${metadata.branchName}`;
  const dateStr = `From ${formatDate(metadata.fromDate)} To ${formatDate(metadata.toDate)}`;
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(titleStr, 105, 26, { align: "center" });
  doc.text(dateStr, 105, 31, { align: "center" });

  const head = [["SNo", ...reportData.columns.map((c) => c.toUpperCase())]];

  // Calculate totals
  const totals: Record<string, number> = {};
  reportData.columns.forEach((col) => {
    if (col !== "Date") {
      totals[col] = reportData.rows.reduce((acc, row) => acc + (Number(row[col]) || 0), 0);
    }
  });

  const body = reportData.rows.map((row, index) => {
    const rowData = [String(index + 1)];
    reportData.columns.forEach((col) => {
      if (col === "Date") {
        rowData.push(row[col] ? formatDate(String(row[col])) : "-");
      } else {
        rowData.push(formatAmount(Number(row[col]) || 0));
      }
    });
    return rowData;
  });

  const footerRow = ["", "TOTAL"];
  reportData.columns.forEach((col) => {
    if (col !== "Date") {
      footerRow.push(formatAmount(totals[col] || 0));
    }
  });

  body.push(footerRow);

  // Dynamic alignment mapping
  const columnStyles: Record<number, any> = {
    0: { halign: "center" }, // SNo
    1: { halign: "left" }, // Date
  };
  
  for (let i = 2; i <= reportData.columns.length; i++) {
    columnStyles[i] = { halign: "right" }; // All monetary columns
  }

  autoTable(doc, {
    startY: 35,
    head: head,
    body: body,
    theme: "striped",
    headStyles: { fillColor: [73, 41, 62], textColor: 255 },
    footStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: "bold" },
    columnStyles: columnStyles,
    styles: { fontSize: 8 },
    didParseCell: function (data) {
      if (data.row.index === body.length - 1) {
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fillColor = [240, 240, 240];
      }
    }
  });

  doc.save(`OrderType_Sales_Report_${metadata.fromDate}_${metadata.toDate}.pdf`);
};

export const exportOrderTypeSalesReportExcel = (
  reportData: OrderTypeSalesReportResponse["data"] | undefined,
  metadata: {
    branchName: string;
    fromDate: string;
    toDate: string;
  }
) => {
  if (!reportData || !reportData.columns || reportData.columns.length === 0) return;

  const exportData = reportData.rows.map((row, index) => {
    const rowData: Record<string, any> = {
      "SNo": index + 1,
      "Date": row["Date"] ? formatDate(String(row["Date"])) : "-",
    };

    reportData.columns.forEach((col) => {
      if (col !== "Date") {
        rowData[col] = Number(row[col]) || 0;
      }
    });

    return rowData;
  });

  // Calculate totals for Excel
  const totalRow: Record<string, any> = {
    "SNo": "",
    "Date": "TOTAL",
  };

  reportData.columns.forEach((col) => {
    if (col !== "Date") {
      totalRow[col] = reportData.rows.reduce((acc, row) => acc + (Number(row[col]) || 0), 0);
    }
  });

  exportData.push(totalRow);

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Order Type Sales Report");

  XLSX.writeFile(workbook, `OrderType_Sales_Report_${metadata.fromDate}_${metadata.toDate}.xlsx`);
};
