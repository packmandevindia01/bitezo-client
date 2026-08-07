import jsPDF from "jspdf";
import "jspdf-autotable";
import * as XLSX from "xlsx";
import { formatAmount } from "../../../../utils/currency";

export const exportEmployeeSalesReportPDF = (
  data: any[],
  filters: any
) => {
  const doc = new jsPDF("p", "mm", "a4");

  // Header
  doc.setFontSize(14);
  doc.text("Employee Sales Report", 14, 15);
  doc.setFontSize(9);
  doc.text(`From: ${filters.fromDate} To: ${filters.toDate}`, 14, 21);
  if (filters.branchName) {
    doc.text(`Branch: ${filters.branchName}`, 14, 26);
  }

  // Table
  const tableData = data.map((r, i) => [
    i + 1,
    r.code || "",
    r.employee || "",
    formatAmount(Number(r.netValue || 0)),
    formatAmount(Number(r.vatAmount || 0)),
    formatAmount(Number(r.netAmount || 0))
  ]);

  const grandTotals = {
    netValue: data.reduce((s, r) => s + Number(r.netValue || 0), 0),
    vatAmount: data.reduce((s, r) => s + Number(r.vatAmount || 0), 0),
    netAmount: data.reduce((s, r) => s + Number(r.netAmount || 0), 0)
  };

  tableData.push([
    "",
    "",
    "Totals:",
    formatAmount(grandTotals.netValue),
    formatAmount(grandTotals.vatAmount),
    formatAmount(grandTotals.netAmount)
  ]);

  (doc as any).autoTable({
    startY: 32,
    head: [["SNo", "Code", "Employee", "Net Value", "Vat Amnt", "Amount"]],
    body: tableData,
    theme: "grid",
    headStyles: { fillColor: [73, 41, 62], textColor: 255, fontSize: 8 },
    bodyStyles: { fontSize: 8 },
    columnStyles: {
      0: { halign: "center", cellWidth: 15 },
      1: { halign: "center", cellWidth: 20 },
      2: { halign: "left" },
      3: { halign: "right", cellWidth: 25 },
      4: { halign: "right", cellWidth: 25 },
      5: { halign: "right", cellWidth: 25 }
    },
    didParseCell: function (data: any) {
      if (data.row.index === tableData.length - 1) {
        data.cell.styles.fontStyle = "bold";
        if (data.column.index === 5) {
          data.cell.styles.textColor = [73, 41, 62];
        }
      }
    }
  });

  doc.save(`Employee_Sales_Report_${filters.fromDate}_${filters.toDate}.pdf`);
};

export const exportEmployeeSalesReportExcel = (
  data: any[],
  filters: any
) => {
  const wsData = [
    ["Employee Sales Report"],
    [`From: ${filters.fromDate}`, `To: ${filters.toDate}`],
    filters.branchName ? [`Branch: ${filters.branchName}`] : [],
    [],
    ["SNo", "Code", "Employee", "Net Value", "Vat Amnt", "Amount"]
  ];

  data.forEach((r, i) => {
    wsData.push([
      i + 1,
      r.code || "",
      r.employee || "",
      Number(r.netValue || 0).toFixed(3),
      Number(r.vatAmount || 0).toFixed(3),
      Number(r.netAmount || 0).toFixed(3)
    ] as any);
  });

  const grandTotals = {
    netValue: data.reduce((s, r) => s + Number(r.netValue || 0), 0),
    vatAmount: data.reduce((s, r) => s + Number(r.vatAmount || 0), 0),
    netAmount: data.reduce((s, r) => s + Number(r.netAmount || 0), 0)
  };

  wsData.push([
    "",
    "",
    "Totals:",
    grandTotals.netValue.toFixed(3),
    grandTotals.vatAmount.toFixed(3),
    grandTotals.netAmount.toFixed(3)
  ] as any);

  const ws = XLSX.utils.aoa_to_sheet(wsData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "EmployeeSalesReport");
  XLSX.writeFile(wb, `Employee_Sales_Report_${filters.fromDate}_${filters.toDate}.xlsx`);
};
