import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { formatAmount } from "../../../../utils/currency";
import type { MonthlySalesReportResponse } from "../types";

export const exportMonthlySalesReportPDF = (
  reportData: MonthlySalesReportResponse["data"] | undefined,
  metadata: {
    branchName: string;
    fromPeriod: string;
    toPeriod: string;
  }
) => {
  if (!reportData || !reportData.columns || reportData.columns.length === 0) return;

  const doc = new jsPDF();
  const title = "Monthly Sales Report";
  
  doc.setFontSize(16);
  doc.text(title, 14, 15);
  doc.setFontSize(10);
  doc.text(`Branch: ${metadata.branchName}`, 14, 22);
  doc.text(`Period: ${metadata.fromPeriod} To ${metadata.toPeriod}`, 14, 28);

  const head = [["SNo", ...reportData.columns.map((c) => c.toUpperCase())]];

  // Calculate totals
  const totals: Record<string, number> = {};
  reportData.columns.forEach((col) => {
    if (col !== "Month") {
      totals[col] = reportData.rows.reduce((acc, row) => acc + (Number(row[col]) || 0), 0);
    }
  });

  const body = reportData.rows.map((row, index) => {
    const rowData = [String(index + 1)];
    reportData.columns.forEach((col) => {
      if (col === "Month") {
        rowData.push(row[col] || "-");
      } else {
        rowData.push(formatAmount(Number(row[col]) || 0));
      }
    });
    return rowData;
  });

  const footerRow = ["", "TOTAL"];
  reportData.columns.forEach((col) => {
    if (col !== "Month") {
      footerRow.push(formatAmount(totals[col] || 0));
    }
  });

  body.push(footerRow);

  // Dynamic alignment mapping
  const columnStyles: Record<number, any> = {
    0: { halign: "center" }, // SNo
    1: { halign: "left" }, // Month
  };
  
  for (let i = 2; i <= reportData.columns.length; i++) {
    columnStyles[i] = { halign: "right" }; // All monetary columns
  }

  autoTable(doc, {
    startY: 32,
    head: head,
    body: body,
    theme: "grid",
    headStyles: { fillColor: [73, 41, 62], textColor: 255 }, // Theme color
    footStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: "bold" },
    columnStyles: columnStyles,
    didParseCell: function (data) {
      // Style the total row
      if (data.row.index === body.length - 1) {
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fillColor = [240, 240, 240];
      }
    }
  });

  doc.save(`Monthly_Sales_Report_${metadata.fromPeriod}_${metadata.toPeriod}.pdf`);
};

export const exportMonthlySalesReportExcel = (
  reportData: MonthlySalesReportResponse["data"] | undefined,
  metadata: {
    branchName: string;
    fromPeriod: string;
    toPeriod: string;
  }
) => {
  if (!reportData || !reportData.columns || reportData.columns.length === 0) return;

  const exportData = reportData.rows.map((row, index) => {
    const rowData: Record<string, any> = {
      "SNo": index + 1,
      "Month": row["Month"] || "-",
    };

    reportData.columns.forEach((col) => {
      if (col !== "Month") {
        rowData[col] = Number(row[col]) || 0;
      }
    });

    return rowData;
  });

  // Calculate totals for Excel
  const totalRow: Record<string, any> = {
    "SNo": "",
    "Month": "TOTAL",
  };

  reportData.columns.forEach((col) => {
    if (col !== "Month") {
      totalRow[col] = reportData.rows.reduce((acc, row) => acc + (Number(row[col]) || 0), 0);
    }
  });

  exportData.push(totalRow);

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Monthly Sales Report");

  XLSX.writeFile(workbook, `Monthly_Sales_Report_${metadata.fromPeriod}_${metadata.toPeriod}.xlsx`);
};
