import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { formatAmount } from "../../../../utils/currency";
import type { ProductWiseLevyRow, ProductWiseLevyTotalData } from "../types";

export const formatDate = (dateStr?: string) => {
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

export interface ExportMetadata {
  branchName: string;
  fromDate: string;
  toDate: string;
}

export const exportProductWiseLevyReportPDF = (
  rows: ProductWiseLevyRow[],
  totalData: ProductWiseLevyTotalData | null,
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

  const titleStr = `Product Wise Levy Report - Branch: ${metadata.branchName}`;
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
      "NET VALUE",
      "SERVICE CHARGE",
      "LEVY",
      "VAT AMOUNT",
      "NET AMOUNT",
    ],
  ];

  let sumNetValue = 0;
  let sumServiceCharge = 0;
  let sumLevy = 0;
  let sumVatAmount = 0;
  let sumNetAmount = 0;

  const body = rows.map((row, index) => {
    const netValue = Number(row.netValue ?? 0);
    const serviceCharge = Number(row.serviceCharge ?? 0);
    const levy = Number(row.levy ?? 0);
    const vatAmount = Number(row.vatAmount ?? 0);
    const netAmount = Number(row.netAmount ?? 0);

    sumNetValue += netValue;
    sumServiceCharge += serviceCharge;
    sumLevy += levy;
    sumVatAmount += vatAmount;
    sumNetAmount += netAmount;

    return [
      String(row.sNo ?? index + 1),
      getProductCode(row),
      getProductName(row),
      formatAmount(netValue),
      formatAmount(serviceCharge),
      formatAmount(levy),
      formatAmount(vatAmount),
      formatAmount(netAmount),
    ];
  });

  const finalNetValue = totalData ? Number(totalData.netValue ?? sumNetValue) : sumNetValue;
  const finalServiceCharge = totalData
    ? Number(totalData.serviceCharge ?? sumServiceCharge)
    : sumServiceCharge;
  const finalLevy = totalData ? Number(totalData.levy ?? sumLevy) : sumLevy;
  const finalVatAmount = totalData ? Number(totalData.vatAmount ?? sumVatAmount) : sumVatAmount;
  const finalNetAmount = totalData ? Number(totalData.netAmount ?? sumNetAmount) : sumNetAmount;

  body.push([
    "",
    "",
    "TOTAL",
    formatAmount(finalNetValue),
    formatAmount(finalServiceCharge),
    formatAmount(finalLevy),
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
      3: { halign: "right", cellWidth: 35 },
      4: { halign: "right", cellWidth: 35 },
      5: { halign: "right", cellWidth: 35 },
      6: { halign: "right", cellWidth: 35 },
      7: { halign: "right", cellWidth: 40 },
    },
    styles: { fontSize: 8 },
    didParseCell: function (data) {
      if (data.row.index === body.length - 1) {
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fillColor = [240, 240, 240];
      }
    },
  });

  doc.save(`ProductWise_Levy_Report_${metadata.fromDate}_${metadata.toDate}.pdf`);
};

export const exportProductWiseLevyReportExcel = (
  rows: ProductWiseLevyRow[],
  totalData: ProductWiseLevyTotalData | null,
  metadata: ExportMetadata
) => {
  if (!rows || rows.length === 0) return;

  let sumNetValue = 0;
  let sumServiceCharge = 0;
  let sumLevy = 0;
  let sumVatAmount = 0;
  let sumNetAmount = 0;

  const exportData = rows.map((row, index) => {
    const netValue = Number(row.netValue ?? 0);
    const serviceCharge = Number(row.serviceCharge ?? 0);
    const levy = Number(row.levy ?? 0);
    const vatAmount = Number(row.vatAmount ?? 0);
    const netAmount = Number(row.netAmount ?? 0);

    sumNetValue += netValue;
    sumServiceCharge += serviceCharge;
    sumLevy += levy;
    sumVatAmount += vatAmount;
    sumNetAmount += netAmount;

    return {
      "S.No": row.sNo ?? (index + 1),
      "Product Code": getProductCode(row),
      "Product Name": getProductName(row),
      "Net Value": netValue,
      "Service Charge": serviceCharge,
      "Levy": levy,
      "VAT Amount": vatAmount,
      "Net Amount": netAmount,
    };
  });

  const finalNetValue = totalData ? Number(totalData.netValue ?? sumNetValue) : sumNetValue;
  const finalServiceCharge = totalData
    ? Number(totalData.serviceCharge ?? sumServiceCharge)
    : sumServiceCharge;
  const finalLevy = totalData ? Number(totalData.levy ?? sumLevy) : sumLevy;
  const finalVatAmount = totalData ? Number(totalData.vatAmount ?? sumVatAmount) : sumVatAmount;
  const finalNetAmount = totalData ? Number(totalData.netAmount ?? sumNetAmount) : sumNetAmount;

  exportData.push({
    "S.No": "" as any,
    "Product Code": "",
    "Product Name": "TOTAL",
    "Net Value": finalNetValue,
    "Service Charge": finalServiceCharge,
    "Levy": finalLevy,
    "VAT Amount": finalVatAmount,
    "Net Amount": finalNetAmount,
  });

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Product Wise Levy");

  XLSX.writeFile(
    workbook,
    `ProductWise_Levy_Report_${metadata.fromDate}_${metadata.toDate}.xlsx`
  );
};
