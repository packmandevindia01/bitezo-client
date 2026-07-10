import { jsPDF } from "jspdf";
import "jspdf-autotable";
import * as XLSX from "xlsx";
import { formatAmount } from "../../../../utils/currency";
import type { ProductWiseMarginProductsData, ProductWiseMarginTotalData } from "../types";

export const exportProductWiseMarginReportXLS = (
  rows: ProductWiseMarginProductsData[],
  totals: ProductWiseMarginTotalData | null,
  filters: { fromDate: string; toDate: string }
) => {
  const data = rows.map((r) => ({
    "SNo": r.sNo,
    "Product Code": r.productCode,
    "Product Name": r.productName,
    "Group": r.group,
    "Category": r.category,
    "Sub Category": r.subCategory,
    "Net Value": Number(r.netValue),
    "Cost": Number(r.cost),
    "Margin": Number(r.margin),
    "Margin %": Number(r.marginPer),
  }));

  if (totals) {
    data.push({
      "SNo": "" as any,
      "Product Code": "" as any,
      "Product Name": "TOTAL" as any,
      "Group": "" as any,
      "Category": "" as any,
      "Sub Category": "" as any,
      "Net Value": totals.netValue,
      "Cost": totals.cost,
      "Margin": totals.margin,
      "Margin %": totals.marginper,
    });
  }

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Product Wise Margin Report");
  XLSX.writeFile(wb, `Product_Wise_Margin_Report_${filters.fromDate}_to_${filters.toDate}.xlsx`);
};

export const exportProductWiseMarginReportPDF = (
  rows: ProductWiseMarginProductsData[],
  totals: ProductWiseMarginTotalData | null,
  filters: { fromDate: string; toDate: string }
) => {
  const doc = new jsPDF("landscape");

  doc.setFontSize(16);
  doc.text("Product Wise Margin Report", 14, 15);

  doc.setFontSize(10);
  doc.text(`Period: ${filters.fromDate} to ${filters.toDate}`, 14, 22);

  const tableColumn = [
    "SNo",
    "Product Code",
    "Product Name",
    "Group",
    "Category",
    "Sub Category",
    "Net Value",
    "Cost",
    "Margin",
    "Margin %",
  ];

  const tableRows = rows.map((r) => [
    r.sNo,
    r.productCode,
    r.productName,
    r.group,
    r.category,
    r.subCategory,
    formatAmount(Number(r.netValue)),
    formatAmount(Number(r.cost)),
    formatAmount(Number(r.margin)),
    formatAmount(Number(r.marginPer)),
  ]);

  if (totals) {
    tableRows.push([
      "",
      "",
      "TOTAL",
      "",
      "",
      "",
      formatAmount(Number(totals.netValue)),
      formatAmount(Number(totals.cost)),
      formatAmount(Number(totals.margin)),
      formatAmount(Number(totals.marginper)),
    ]);
  }

  (doc as any).autoTable({
    head: [tableColumn],
    body: tableRows,
    startY: 28,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [73, 41, 62] },
    columnStyles: {
      6: { halign: "right" },
      7: { halign: "right" },
      8: { halign: "right" },
      9: { halign: "right" },
    },
    didParseCell: function (data: any) {
      if (
        data.row.index === tableRows.length - 1 &&
        totals
      ) {
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fillColor = [240, 240, 240];
      }
    },
  });

  doc.save(`Product_Wise_Margin_Report_${filters.fromDate}_to_${filters.toDate}.pdf`);
};
