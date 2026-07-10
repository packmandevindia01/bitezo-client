import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { formatAmount } from "../../../../utils/currency";
import type { BillWiseMarginSalesData, BillWiseMarginTotalData } from "../types";


export const exportBillWiseMarginReportXLS = (
  data: BillWiseMarginSalesData[],
  totals: BillWiseMarginTotalData
) => {
  const wsData = [
    ["SNo", "Invoice Date", "Invoice No", "Customer Code", "Customer Name", "Net Value", "Cost", "Margin", "Margin %"],
    ...data.map((row) => [
      row.sNo,
      row.invoiceDate.split('T')[0],
      row.invoiceNo,
      row.customerCode,
      row.customerName,
      Number(row.netValue),
      Number(row.cost),
      Number(row.margin),
      Number(row.marginper)
    ]),
    [
      "",
      "",
      "",
      "",
      "Total",
      totals.netValue,
      totals.cost,
      totals.margin,
      totals.marginper
    ]
  ];

  const ws = XLSX.utils.aoa_to_sheet(wsData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Bill Wise Margin");
  XLSX.writeFile(wb, "bill_wise_margin_report.xlsx");
};

export const exportBillWiseMarginReportPDF = (
  data: BillWiseMarginSalesData[],
  totals: BillWiseMarginTotalData
) => {
  const doc = new jsPDF("landscape");

  doc.setFontSize(16);
  doc.text("Bill Wise Margin Report", 14, 15);

  const tableData = data.map((row) => [
    row.sNo,
    row.invoiceDate.split('T')[0],
    row.invoiceNo,
    row.customerCode,
    row.customerName,
    formatAmount(Number(row.netValue)),
    formatAmount(Number(row.cost)),
    formatAmount(Number(row.margin)),
    formatAmount(Number(row.marginper))
  ]);

  autoTable(doc, {
    startY: 25,
    head: [["SNo", "Invoice Date", "Invoice No", "Customer Code", "Customer Name", "Net Value", "Cost", "Margin", "Margin %"]],
    body: tableData,
    foot: [[
      "",
      "",
      "",
      "",
      "Total",
      formatAmount(totals.netValue),
      formatAmount(totals.cost),
      formatAmount(totals.margin),
      formatAmount(totals.marginper)
    ]],
    styles: { fontSize: 8 },
    headStyles: { fillColor: [73, 41, 62], halign: "center" },
    footStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: "bold" },
    columnStyles: {
      0: { halign: "center" },
      1: { halign: "center" },
      2: { halign: "center" },
      3: { halign: "center" },
      4: { halign: "center" }, // Or left if long text
      5: { halign: "right" },
      6: { halign: "right" },
      7: { halign: "right" },
      8: { halign: "right" },
    },
  });

  doc.save("bill_wise_margin_report.pdf");
};
