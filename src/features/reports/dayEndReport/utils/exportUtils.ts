import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { formatAmount } from "../../../../utils/currency";

const formatDateTime = (dateStr: string) => {
  if (!dateStr || dateStr.startsWith("1900")) return "-";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
};

export const exportDayEndReportPDF = (
  dynamicColumns: string[],
  rows: Record<string, any>[],
  filters: any
) => {
  const doc = new jsPDF({ orientation: "landscape" });

  const companyName = localStorage.getItem("companyName") || "FEKRA advertising";
  const companyAddress = localStorage.getItem("companyAddress") || "NEAR NESTO BESIDE BIN RASHIED SOUQ MABELA BUILDING NO 211 SECOND FLOOR FLAT NO 21";
  
  // Header Text
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(companyName.toUpperCase(), doc.internal.pageSize.width / 2, 15, { align: "center" });

  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(100);
  doc.text(companyAddress.toUpperCase(), doc.internal.pageSize.width / 2, 20, { align: "center" });

  doc.setFontSize(10);
  doc.setTextColor(0);
  doc.text(
    `Day End Report From ${filters.fromDate || "-"} To ${filters.toDate || "-"}`,
    doc.internal.pageSize.width / 2,
    28,
    { align: "center" }
  );

  // Define standard columns + dynamic ones
  const head = [["SNo", "Start Date", "End Date", ...dynamicColumns]];

  // Format the body rows
  const body = rows.map((row, idx) => {
    const rowData = [
      row.SNo || idx + 1,
      formatDateTime(row.StartDate),
      formatDateTime(row.EndDate),
    ];
    dynamicColumns.forEach(col => {
      rowData.push(formatAmount(Number(row[col] || 0)));
    });
    return rowData;
  });

  // Calculate Totals
  const totalsRow = ["", "", "Totals:"];
  dynamicColumns.forEach(col => {
    const total = rows.reduce((sum, row) => sum + Number(row[col] || 0), 0);
    totalsRow.push(formatAmount(total));
  });
  body.push(totalsRow);

  // Render Table
  autoTable(doc, {
    startY: 35,
    head: head,
    body: body,
    theme: "grid",
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [73, 41, 62], textColor: 255, halign: "center" },
    columnStyles: {
      0: { halign: "center" },
      1: { halign: "left" },
      2: { halign: "left" },
      ...dynamicColumns.reduce((acc: any, _, idx) => {
        acc[idx + 3] = { halign: "right" }; // Index shift by 3 because of SNo, StartDate, EndDate
        return acc;
      }, {})
    },
    didParseCell: (data) => {
      // Style Totals Row
      if (data.row.index === body.length - 1) {
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fillColor = [240, 240, 240];
        if (data.column.index === 2) {
          data.cell.styles.halign = "right";
        }
      }
    },
  });

  doc.save(`Day_End_Report_${filters.fromDate}_to_${filters.toDate}.pdf`);
};

export const exportDayEndReportExcel = (
  dynamicColumns: string[],
  rows: Record<string, any>[],
  filters: any
) => {
  // Add headers
  const excelData = rows.map((row, idx) => {
    const exportRow: any = {
      "SNo": row.SNo || idx + 1,
      "Start Date": formatDateTime(row.StartDate),
      "End Date": formatDateTime(row.EndDate),
    };
    dynamicColumns.forEach(col => {
      exportRow[col] = Number(row[col] || 0);
    });
    return exportRow;
  });

  // Calculate totals
  const totalsRow: any = {
    "SNo": "",
    "Start Date": "",
    "End Date": "Totals:",
  };
  dynamicColumns.forEach(col => {
    totalsRow[col] = rows.reduce((sum, row) => sum + Number(row[col] || 0), 0);
  });
  excelData.push(totalsRow);

  const worksheet = XLSX.utils.json_to_sheet(excelData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Day End Report");

  XLSX.writeFile(
    workbook,
    `Day_End_Report_${filters.fromDate}_to_${filters.toDate}.xlsx`
  );
};
