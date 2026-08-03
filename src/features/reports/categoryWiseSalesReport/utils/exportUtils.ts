import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { formatAmount } from "../../../../utils/currency";
import type { CategoryWiseSalesRow, CategoryWiseTotalData } from "../types";

const formatDate = (dateStr: string) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

export const exportCategoryWiseSalesReportPDF = (
  rows: CategoryWiseSalesRow[],
  totalData: CategoryWiseTotalData | null,
  metadata: {
    branchName: string;
    categoryName: string;
    fromDate: string;
    toDate: string;
  }
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

  const titleStr = `Category Wise Sales Report - Branch: ${metadata.branchName} | Category: ${metadata.categoryName}`;
  const dateStr = `From ${formatDate(metadata.fromDate)} To ${formatDate(metadata.toDate)}`;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(titleStr, 148.5, 26, { align: "center" });
  doc.text(dateStr, 148.5, 31, { align: "center" });

  const head = [
    [
      "S.NO",
      "CATEGORY CODE",
      "CATEGORY NAME",
      "QTY",
      "AMOUNT",
      "DISCOUNT",
      "NET VALUE",
      "VAT AMOUNT",
      "NET AMOUNT",
    ],
  ];

  let sumQty = 0;
  let sumAmount = 0;
  let sumDiscount = 0;
  let sumNetValue = 0;
  let sumVatAmount = 0;
  let sumNetAmount = 0;

  const body = rows.map((row, index) => {
    const qty = Number(row.qty ?? row.quantity ?? row.totalQty ?? 0);
    const amount = Number(row.amount ?? 0);
    const discount = Number(row.discount ?? 0);
    const netValue = Number(row.netValue ?? 0);
    const vatAmount = Number(row.vatAmount ?? 0);
    const netAmount = Number(row.netAmount ?? 0);

    sumQty += qty;
    sumAmount += amount;
    sumDiscount += discount;
    sumNetValue += netValue;
    sumVatAmount += vatAmount;
    sumNetAmount += netAmount;

    return [
      String(index + 1),
      String(row.categoryCode || row.catCode || row.code || row.categoryId || row.catId || "-"),
      String(row.categoryName || row.catName || row.name || row.category || "-"),
      String(qty),
      formatAmount(amount),
      formatAmount(discount),
      formatAmount(netValue),
      formatAmount(vatAmount),
      formatAmount(netAmount),
    ];
  });

  const finalAmount = totalData ? Number(totalData.amount || sumAmount) : sumAmount;
  const finalDiscount = totalData ? Number(totalData.discount || sumDiscount) : sumDiscount;
  const finalNetValue = totalData ? Number(totalData.netValue || sumNetValue) : sumNetValue;
  const finalVatAmount = totalData ? Number(totalData.vatAmount || sumVatAmount) : sumVatAmount;
  const finalNetAmount = totalData ? Number(totalData.netAmount || sumNetAmount) : sumNetAmount;

  body.push([
    "",
    "",
    "TOTAL",
    String(sumQty),
    formatAmount(finalAmount),
    formatAmount(finalDiscount),
    formatAmount(finalNetValue),
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
      3: { halign: "right", cellWidth: 25 },
      4: { halign: "right", cellWidth: 30 },
      5: { halign: "right", cellWidth: 30 },
      6: { halign: "right", cellWidth: 30 },
      7: { halign: "right", cellWidth: 30 },
      8: { halign: "right", cellWidth: 35 },
    },
    styles: { fontSize: 8 },
    didParseCell: function (data) {
      if (data.row.index === body.length - 1) {
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fillColor = [240, 240, 240];
      }
    },
  });

  doc.save(`CategoryWise_Sales_Report_${metadata.fromDate}_${metadata.toDate}.pdf`);
};

export const exportCategoryWiseSalesReportExcel = (
  rows: CategoryWiseSalesRow[],
  totalData: CategoryWiseTotalData | null,
  metadata: {
    branchName: string;
    categoryName: string;
    fromDate: string;
    toDate: string;
  }
) => {
  if (!rows || rows.length === 0) return;

  let sumQty = 0;
  let sumAmount = 0;
  let sumDiscount = 0;
  let sumNetValue = 0;
  let sumVatAmount = 0;
  let sumNetAmount = 0;

  const exportData = rows.map((row, index) => {
    const qty = Number(row.qty ?? row.quantity ?? row.totalQty ?? 0);
    const amount = Number(row.amount ?? 0);
    const discount = Number(row.discount ?? 0);
    const netValue = Number(row.netValue ?? 0);
    const vatAmount = Number(row.vatAmount ?? 0);
    const netAmount = Number(row.netAmount ?? 0);

    sumQty += qty;
    sumAmount += amount;
    sumDiscount += discount;
    sumNetValue += netValue;
    sumVatAmount += vatAmount;
    sumNetAmount += netAmount;

    return {
      "S.No": index + 1,
      "Category Code": String(row.categoryCode || row.catCode || row.code || row.categoryId || row.catId || "-"),
      "Category Name": String(row.categoryName || row.catName || row.name || row.category || "-"),
      "Qty": qty,
      "Amount": amount,
      "Discount": discount,
      "Net Value": netValue,
      "VAT Amount": vatAmount,
      "Net Amount": netAmount,
    };
  });

  const finalAmount = totalData ? Number(totalData.amount || sumAmount) : sumAmount;
  const finalDiscount = totalData ? Number(totalData.discount || sumDiscount) : sumDiscount;
  const finalNetValue = totalData ? Number(totalData.netValue || sumNetValue) : sumNetValue;
  const finalVatAmount = totalData ? Number(totalData.vatAmount || sumVatAmount) : sumVatAmount;
  const finalNetAmount = totalData ? Number(totalData.netAmount || sumNetAmount) : sumNetAmount;

  exportData.push({
    "S.No": "" as any,
    "Category Code": "",
    "Category Name": "TOTAL",
    "Qty": sumQty,
    "Amount": finalAmount,
    "Discount": finalDiscount,
    "Net Value": finalNetValue,
    "VAT Amount": finalVatAmount,
    "Net Amount": finalNetAmount,
  });

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Category Wise Sales");

  XLSX.writeFile(workbook, `CategoryWise_Sales_Report_${metadata.fromDate}_${metadata.toDate}.xlsx`);
};
