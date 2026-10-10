import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { formatAmount } from "../../../../utils/currency";
import type { ProductInputVatRow, ProductInputVatTotalData } from "../types";

export const formatDate = (dateStr: string) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

export const getProductName = (row: any): string => {
  return String(row.product || row.productName || row.name || "-");
};

export const getProductCode = (row: any): string => {
  return String(row.code || row.productCode || "-");
};

export const getVatPercent = (row: any): string => {
  if (row.vatPer !== undefined && row.vatPer !== null) {
    const val = String(row.vatPer);
    return val.endsWith("%") ? val : `${val}%`;
  }
  return "-";
};

export interface ExportMetadata {
  branchName: string;
  productName: string;
  vatName: string;
  fromDate: string;
  toDate: string;
}

export const exportProductInputVatReportPDF = (
  rows: ProductInputVatRow[],
  totalData: ProductInputVatTotalData | null,
  metadata: ExportMetadata
) => {
  if (!rows || rows.length === 0) return;

  const doc = new jsPDF("l", "mm", "a4");
  const companyName = localStorage.getItem("companyName") || "FEKRA advertising";
  const companyAddress =
    localStorage.getItem("companyAddress") ||
    "NEAR NESTO BESIDE BIN RASHIED SOUQ MABELA BUILDING NO 211 SECOND FLOOR FLAT NO 21";

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(companyName, 148.5, 14, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(companyAddress, 148.5, 20, { align: "center" });

  const titleStr = `Product Input VAT Report - Branch: ${metadata.branchName} | Product: ${metadata.productName} | VAT: ${metadata.vatName}`;
  const dateStr = `From ${formatDate(metadata.fromDate)} To ${formatDate(metadata.toDate)}`;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(titleStr, 148.5, 26, { align: "center" });
  doc.text(dateStr, 148.5, 31, { align: "center" });

  const head = [
    [
      "S.NO",
      "PRODUCT CODE",
      "PRODUCT NAME",
      "VAT %",
      "VALUE",
      "VAT AMOUNT",
      "NET AMOUNT",
    ],
  ];

  let sumValue = 0;
  let sumVatAmount = 0;
  let sumNetAmount = 0;

  const body = rows.map((row, index) => {
    const value = Number(row.value ?? 0);
    const vatAmount = Number(row.vatAmount ?? 0);
    const netAmount = Number(row.netAmount ?? 0);

    sumValue += value;
    sumVatAmount += vatAmount;
    sumNetAmount += netAmount;

    return [
      String(row.sNo ?? index + 1),
      getProductCode(row),
      getProductName(row),
      getVatPercent(row),
      formatAmount(value),
      formatAmount(vatAmount),
      formatAmount(netAmount),
    ];
  });

  const finalValue = totalData ? Number(totalData.value ?? sumValue) : sumValue;
  const finalVatAmount = totalData ? Number(totalData.vatAmount ?? sumVatAmount) : sumVatAmount;
  const finalNetAmount = totalData ? Number(totalData.netAmount ?? sumNetAmount) : sumNetAmount;

  body.push([
    "",
    "",
    "TOTAL",
    "",
    formatAmount(finalValue),
    formatAmount(finalVatAmount),
    formatAmount(finalNetAmount),
  ]);

  autoTable(doc, {
    startY: 35,
    head: head,
    body: body,
    theme: "striped",
    headStyles: { fillColor: [73, 41, 62], textColor: 255 },
    footStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: "bold" },
    columnStyles: {
      0: { halign: "center", cellWidth: 15 },
      1: { halign: "center", cellWidth: 35 },
      2: { halign: "left", cellWidth: "auto" },
      3: { halign: "center", cellWidth: 25 },
      4: { halign: "right", cellWidth: 35 },
      5: { halign: "right", cellWidth: 35 },
      6: { halign: "right", cellWidth: 40 },
    },
    styles: { fontSize: 8 },
    didParseCell: function (data) {
      if (data.row.index === body.length - 1) {
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fillColor = [240, 240, 240];
      }
    },
  });

  doc.save(`ProductInput_VAT_Report_${metadata.fromDate}_${metadata.toDate}.pdf`);
};

export const exportProductInputVatReportExcel = (
  rows: ProductInputVatRow[],
  totalData: ProductInputVatTotalData | null,
  metadata: ExportMetadata
) => {
  if (!rows || rows.length === 0) return;

  let sumValue = 0;
  let sumVatAmount = 0;
  let sumNetAmount = 0;

  const exportData = rows.map((row, index) => {
    const value = Number(row.value ?? 0);
    const vatAmount = Number(row.vatAmount ?? 0);
    const netAmount = Number(row.netAmount ?? 0);

    sumValue += value;
    sumVatAmount += vatAmount;
    sumNetAmount += netAmount;

    return {
      "S.No": row.sNo ?? (index + 1),
      "Product Code": getProductCode(row),
      "Product Name": getProductName(row),
      "VAT %": getVatPercent(row),
      "Value": value,
      "VAT Amount": vatAmount,
      "Net Amount": netAmount,
    };
  });

  const finalValue = totalData ? Number(totalData.value ?? sumValue) : sumValue;
  const finalVatAmount = totalData ? Number(totalData.vatAmount ?? sumVatAmount) : sumVatAmount;
  const finalNetAmount = totalData ? Number(totalData.netAmount ?? sumNetAmount) : sumNetAmount;

  exportData.push({
    "S.No": "" as any,
    "Product Code": "",
    "Product Name": "TOTAL",
    "VAT %": "",
    "Value": finalValue,
    "VAT Amount": finalVatAmount,
    "Net Amount": finalNetAmount,
  });

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Product Input VAT");

  XLSX.writeFile(
    workbook,
    `ProductInput_VAT_Report_${metadata.fromDate}_${metadata.toDate}.xlsx`
  );
};
