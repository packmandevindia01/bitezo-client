import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx-js-style";
import { formatAmount } from "../../../../utils/currency";

const formatHeaderDate = (dateStr: string) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

export const exportDailySalesReportPDF = (
  columns: string[],
  rows: Record<string, string | number>[],
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
  const dateStr = `Daily Sales Report From ${formatHeaderDate(filters.fromDate)} To ${formatHeaderDate(filters.toDate)}`;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(dateStr, 105, 28, { align: "center" });
  
  const titleWidth = doc.getTextWidth(dateStr);
  doc.line(105 - titleWidth / 2, 29, 105 + titleWidth / 2, 29);

  // Dynamic headers: Date, paymodes, Total
  const dynamicPaymodes = columns.filter(c => c !== "VoucherDate");
  const headers = [[
    "Date",
    ...dynamicPaymodes,
    "Total"
  ]];

  // Rows mapping
  const body = rows.map((row) => {
    let rowSum = 0;
    const values = dynamicPaymodes.map((col) => {
      const val = Number(row[col] || 0);
      rowSum += val;
      return formatAmount(val);
    });
    return [
      row.VoucherDate ? formatHeaderDate(String(row.VoucherDate)) : "",
      ...values,
      formatAmount(rowSum)
    ];
  });

  // Calculate footer totals
  const colTotals = dynamicPaymodes.map((col) => {
    return rows.reduce((sum, r) => sum + Number(r[col] || 0), 0);
  });
  const grandTotal = colTotals.reduce((sum, val) => sum + val, 0);

  const foot = [[
    "Total",
    ...colTotals.map(val => formatAmount(val)),
    formatAmount(grandTotal)
  ]];

  // Generate columnStyles based on number of columns
  const columnStyles: Record<number, any> = {
    0: { halign: "center" as const }
  };
  for (let i = 1; i <= dynamicPaymodes.length + 1; i++) {
    columnStyles[i] = { halign: "right" as const };
  }

  autoTable(doc, {
    startY: 35,
    head: headers,
    body: body,
    foot: foot,
    theme: "striped",
    headStyles: { fillColor: [73, 41, 62], textColor: 255 },
    columnStyles: columnStyles,
    styles: { fontSize: 8 },
  });

  doc.save("daily_sales_report.pdf");
};

export const exportDailySalesReportExcel = (
  columns: string[],
  rows: Record<string, string | number>[],
  filters: any
) => {
  const companyName = localStorage.getItem("companyName") || "FEKRA advertising";
  const dateStr = `Daily Sales Report From ${formatHeaderDate(filters.fromDate)} To ${formatHeaderDate(filters.toDate)}`;

  const excelRows: any[] = [];
  
  // Title Row
  excelRows.push([companyName]);
  excelRows.push([dateStr]);
  excelRows.push([]); // Spacer

  // Header Row
  const dynamicPaymodes = columns.filter(c => c !== "VoucherDate");
  const headers = ["Date", ...dynamicPaymodes, "Total"];
  excelRows.push(headers);

  // Data Rows
  rows.forEach((row) => {
    let rowSum = 0;
    const values = dynamicPaymodes.map((col) => {
      const val = Number(row[col] || 0);
      rowSum += val;
      return val;
    });
    excelRows.push([
      row.VoucherDate ? formatHeaderDate(String(row.VoucherDate)) : "",
      ...values,
      rowSum
    ]);
  });

  // Footer Totals Row
  const colTotals = dynamicPaymodes.map((col) => {
    return rows.reduce((sum, r) => sum + Number(r[col] || 0), 0);
  });
  const grandTotal = colTotals.reduce((sum, val) => sum + val, 0);
  excelRows.push([
    "Total",
    ...colTotals,
    grandTotal
  ]);

  const ws = XLSX.utils.aoa_to_sheet(excelRows);

  // Apply basic header coloring
  const range = XLSX.utils.decode_range(ws["!ref"] || "A1:Z100");
  const lastColIdx = dynamicPaymodes.length + 1;

  for (let R = range.s.r; R <= range.e.r; ++R) {
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cell_ref = XLSX.utils.encode_cell({ c: C, r: R });
      const cell = ws[cell_ref];
      if (!cell) continue;
      
      if (R === 3) {
        cell.s = {
          font: { bold: true, color: { rgb: "FFFFFF" } },
          fill: { fgColor: { rgb: "49293E" } },
          alignment: { horizontal: C === 0 ? "center" : "right" }
        };
      } else if (R < 3) {
        cell.s = {
          font: { bold: true, sz: R === 0 ? 14 : 10 },
          alignment: { horizontal: "center" }
        };
      } else if (R === range.e.r) {
        // Footer bold
        cell.s = {
          font: { bold: true },
          alignment: { horizontal: C === 0 ? "center" : "right" }
        };
      }
    }
  }

  // Merge headers for title
  ws["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: lastColIdx } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: lastColIdx } }
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Daily Sales");
  XLSX.writeFile(wb, "daily_sales_report.xlsx");
};
