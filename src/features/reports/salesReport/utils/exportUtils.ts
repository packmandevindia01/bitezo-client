import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { formatAmount } from "../../../../utils/currency";
import type { SalesData, PaymodeData, TotalData } from "../types";

export const exportSalesReportPDF = (
  salesData: SalesData[],
  paymodeData: PaymodeData[],
  totalData: TotalData | null,
  filters: any
) => {
  const doc = new jsPDF();
  
  // Title
  doc.setFontSize(18);
  doc.text("Sales Report", 14, 22);
  
  // Filters info
  doc.setFontSize(10);
  doc.text(`Date: ${filters.fromDate} to ${filters.toDate}`, 14, 30);
  doc.text(`Branch: ${filters.branchName || "All"} | Customer: ${filters.customerName || "All"} | Paymode: ${filters.paymodeName || "All"}`, 14, 36);

  // Sales Data Table
  const salesHeaders = [["S.No", "Inv Date", "Inv No", "Customer", "Paymode", "Net Value", "VAT Amt", "Net Amt"]];
  const salesBody = salesData.map((row) => [
    row.sNo,
    row.invoiceDate ? row.invoiceDate.split("T")[0] : "",
    row.invoiceNo,
    row.customerName,
    row.paymode,
    formatAmount(Number(row.netValue)),
    formatAmount(Number(row.vatAmount)),
    formatAmount(Number(row.netAmount)),
  ]);

  autoTable(doc, {
    startY: 42,
    head: salesHeaders,
    body: salesBody,
    theme: "striped",
    headStyles: { fillColor: [73, 41, 62] }, // #49293e
    styles: { fontSize: 8 },
    columnStyles: {
      5: { halign: "right" },
      6: { halign: "right" },
      7: { halign: "right" }
    }
  });

  let finalY = (doc as any).lastAutoTable.finalY + 10;

  // Paymode Summary Table
  if (paymodeData && paymodeData.length > 0) {
    doc.setFontSize(14);
    doc.text("Paymode Summary", 14, finalY);
    
    autoTable(doc, {
      startY: finalY + 5,
      head: [["Paymode", "Amount"]],
      body: paymodeData.map(p => [p.paymodeName, formatAmount(p.amount)]),
      theme: "grid",
      headStyles: { fillColor: [73, 41, 62] },
      styles: { fontSize: 8 },
      columnStyles: { 1: { halign: "right" } }
    });
    finalY = (doc as any).lastAutoTable.finalY + 10;
  }

  // Grand Totals
  if (totalData) {
    doc.setFontSize(14);
    doc.text("Grand Totals", 14, finalY);
    
    autoTable(doc, {
      startY: finalY + 5,
      head: [["Net Value", "VAT Amount", "Total Net Amount"]],
      body: [[
        formatAmount(totalData.netValue),
        formatAmount(totalData.vatAmount),
        formatAmount(totalData.netAmount)
      ]],
      theme: "grid",
      headStyles: { fillColor: [73, 41, 62] },
      styles: { fontSize: 9, fontStyle: "bold" },
      columnStyles: { 0: { halign: "right" }, 1: { halign: "right" }, 2: { halign: "right" } }
    });
  }

  doc.save(`Sales_Report_${filters.fromDate}_to_${filters.toDate}.pdf`);
};

export const exportSalesReportExcel = (
  salesData: SalesData[],
  paymodeData: PaymodeData[],
  totalData: TotalData | null,
  filters: any
) => {
  const wb = XLSX.utils.book_new();

  const salesHeaders = ["S.No", "Invoice Date", "Invoice No", "Customer Code", "Customer Name", "Paymode", "Net Value", "VAT Amount", "Net Amount"];
  const salesRows = salesData.map(row => [
    row.sNo,
    row.invoiceDate ? row.invoiceDate.split("T")[0] : "",
    row.invoiceNo,
    row.customerCode,
    row.customerName,
    row.paymode,
    Number(row.netValue),
    Number(row.vatAmount),
    Number(row.netAmount)
  ]);
  
  const wsData = [
    [`Sales Report (${filters.fromDate} to ${filters.toDate})`],
    [`Branch: ${filters.branchName || "All"} | Customer: ${filters.customerName || "All"} | Paymode: ${filters.paymodeName || "All"}`],
    [],
    salesHeaders,
    ...salesRows,
    [],
    ["Grand Totals", "", "", "", "", "", 
      totalData ? Number(totalData.netValue) : 0, 
      totalData ? Number(totalData.vatAmount) : 0, 
      totalData ? Number(totalData.netAmount) : 0
    ],
    [],
    ["Paymode Summary"],
    ["Paymode", "Amount"],
    ...paymodeData.map(p => [p.paymodeName, Number(p.amount)])
  ];

  const ws = XLSX.utils.aoa_to_sheet(wsData);

  const headerStyle = { font: { bold: true, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "49293E" } } };

  for (let c = 0; c < salesHeaders.length; c++) {
    const cellRef = XLSX.utils.encode_cell({ r: 3, c });
    if (!ws[cellRef]) ws[cellRef] = { t: "s", v: salesHeaders[c] };
    ws[cellRef].s = headerStyle;
  }

  XLSX.utils.book_append_sheet(wb, ws, "Sales Report");
  XLSX.writeFile(wb, `Sales_Report_${filters.fromDate}_to_${filters.toDate}.xlsx`);
};
