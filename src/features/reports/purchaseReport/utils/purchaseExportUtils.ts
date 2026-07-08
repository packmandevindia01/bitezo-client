
import { formatAmount } from "../../../../utils/currency";
import type { PurchaseData, PaymodeData, TotalData } from "../types";

const formatHeaderDate = (dateStr: string) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

export const exportPurchaseReportPDF = async (
  purchaseData: PurchaseData[],
  _paymodeData: PaymodeData[],
  totalData: TotalData | null,
  filters: any
) => {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const doc = new jsPDF();
  
  const companyName = localStorage.getItem("companyName") || "FEKRA advertising";
  const companyAddress = localStorage.getItem("companyAddress") || "NEAR NESTO BESIDE BIN RASHIED SOUQ MABELA BUILDING NO 211 SECOND FLOOR FLAT NO 21";

  // Center Header details
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(companyName, 105, 14, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(companyAddress, 105, 20, { align: "center" });

  // Underlined report title
  const dateStr = `Purchase Report From ${formatHeaderDate(filters.fromDate)} To ${formatHeaderDate(filters.toDate)}`;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(dateStr, 105, 28, { align: "center" });
  
  const titleWidth = doc.getTextWidth(dateStr);
  doc.line(105 - titleWidth / 2, 29, 105 + titleWidth / 2, 29);

  // Purchase Data Table (Exact columns matching the prototype)
  const purchaseHeaders = [["BillDate", "BillNo", "Ref No", "Supplier", "Paymode", "Net Value", "Vat Amount", "Amount"]];
  const purchaseBody = purchaseData.map((row) => [
    row.invoiceDate ? formatHeaderDate(row.invoiceDate) : "",
    row.invoiceNo || "",
    row.refNo || "",
    row.supplierName || "",
    row.paymode || "",
    formatAmount(Number(row.netValue || 0)),
    formatAmount(Number(row.vatAmount || 0)),
    formatAmount(Number(row.netAmount || 0)),
  ]);

  const cashTotal = purchaseData.filter(r => r.paymode?.toLowerCase().includes("cash")).reduce((s, r) => s + Number(r.netAmount || 0), 0);
  const creditTotal = purchaseData.filter(r => r.paymode && !r.paymode.toLowerCase().includes("cash")).reduce((s, r) => s + Number(r.netAmount || 0), 0);
  const grandTotal = totalData ? totalData.netAmount : purchaseData.reduce((s, r) => s + Number(r.netAmount || 0), 0);

  // Spanned footer matching the template exactly:
  // - Colspan 6 (from BillDate up to Net Value) for Paymodes Cash & Credit summary
  // - Col 7 for "Total" label
  // - Col 8 for Grand Total value
  const purchaseFoot = [[
    { 
      content: `Cash: ${formatAmount(cashTotal)} Credit: ${formatAmount(creditTotal)}`, 
      colSpan: 6, 
      styles: { halign: "left" as const, fontStyle: "bold" as const } 
    },
    { 
      content: "Total", 
      styles: { halign: "right" as const, fontStyle: "bold" as const } 
    },
    { 
      content: formatAmount(grandTotal), 
      styles: { halign: "right" as const, fontStyle: "bold" as const } 
    }
  ]];

  autoTable(doc, {
    startY: 35,
    head: purchaseHeaders,
    body: purchaseBody,
    foot: purchaseFoot,
    theme: "striped",
    headStyles: { fillColor: [73, 41, 62], textColor: [255, 255, 255] }, // #49293e
    footStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], lineWidth: { top: 0.5 }, lineColor: [200, 200, 200] },
    styles: { fontSize: 8, font: "helvetica" },
    didParseCell: (data) => {
      const colIdx = data.column.index;
      if (data.section === "head" || data.section === "body") {
        if (colIdx === 0 || colIdx === 3) {
          data.cell.styles.halign = "left";
        } else if (colIdx === 1 || colIdx === 2 || colIdx === 4) {
          data.cell.styles.halign = "center";
        } else if (colIdx === 5 || colIdx === 6 || colIdx === 7) {
          data.cell.styles.halign = "right";
        }
      }
    }
  });

  doc.save(`Purchase_Report_${filters.fromDate}_to_${filters.toDate}.pdf`);
};

export const exportPurchaseReportExcel = async (
  purchaseData: PurchaseData[],
  _paymodeData: PaymodeData[],
  totalData: TotalData | null,
  filters: any
) => {
  const XLSX = await import("xlsx-js-style");
  const companyName = localStorage.getItem("companyName") || "FEKRA advertising";
  const companyAddress = localStorage.getItem("companyAddress") || "NEAR NESTO BESIDE BIN RASHIED SOUQ MABELA BUILDING NO 211 SECOND FLOOR FLAT NO 21";

  const cashTotal = purchaseData.filter(r => r.paymode?.toLowerCase().includes("cash")).reduce((s, r) => s + Number(r.netAmount || 0), 0);
  const creditTotal = purchaseData.filter(r => r.paymode && !r.paymode.toLowerCase().includes("cash")).reduce((s, r) => s + Number(r.netAmount || 0), 0);
  
  const totalNetValue = purchaseData.reduce((s, r) => s + Number(r.netValue || 0), 0);
  const totalVatAmount = purchaseData.reduce((s, r) => s + Number(r.vatAmount || 0), 0);
  const grandTotal = totalData ? totalData.netAmount : purchaseData.reduce((s, r) => s + Number(r.netAmount || 0), 0);

  const cellHelper = (v: any, isBold = false, align: "left" | "center" | "right" = "left", extraStyle = {}) => {
    const isNum = typeof v === "number";
    return {
      v: isNum ? v : String(v),
      t: isNum ? "n" : "s",
      z: isNum ? "0.000" : undefined,
      s: {
        font: { bold: isBold, name: "Calibri", sz: 10 },
        alignment: { horizontal: align, vertical: "center" },
        ...extraStyle
      }
    };
  };

  const rows: any[] = [];
  const merges: any[] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 7 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 7 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: 7 } }
  ];

  // 1. Title Block
  rows.push([cellHelper(companyName, true, "center", { font: { bold: true, sz: 14 } }), "", "", "", "", "", "", ""]);
  rows.push([cellHelper(companyAddress, false, "center", { font: { sz: 8.5, color: { rgb: "475569" } } }), "", "", "", "", "", "", ""]);
  rows.push([cellHelper(`Purchase Report From ${formatHeaderDate(filters.fromDate)} To ${formatHeaderDate(filters.toDate)}`, true, "center", { font: { bold: true, sz: 11, underline: true } }), "", "", "", "", "", "", ""]);
  rows.push(["", "", "", "", "", "", "", ""]); // empty divider

  // 2. Table Headers Style
  const headerStyle = {
    font: { bold: true, color: { rgb: "FFFFFF" } },
    fill: { fgColor: { rgb: "49293E" } },
    border: {
      top: { style: "thin", color: { rgb: "CBD5E1" } },
      bottom: { style: "thin", color: { rgb: "CBD5E1" } },
      left: { style: "thin", color: { rgb: "CBD5E1" } },
      right: { style: "thin", color: { rgb: "CBD5E1" } }
    }
  };

  rows.push([
    cellHelper("BillDate", true, "left", headerStyle),
    cellHelper("BillNo", true, "center", headerStyle),
    cellHelper("Ref No", true, "center", headerStyle),
    cellHelper("Supplier", true, "left", headerStyle),
    cellHelper("Paymode", true, "center", headerStyle),
    cellHelper("Net Value", true, "right", headerStyle),
    cellHelper("Vat Amount", true, "right", headerStyle),
    cellHelper("Amount", true, "right", headerStyle)
  ]);

  // 3. Table Data
  purchaseData.forEach((row, idx) => {
    const dataStyle = {
      border: {
        top: { style: "thin", color: { rgb: "E2E8F0" } },
        bottom: { style: "thin", color: { rgb: "E2E8F0" } },
        left: { style: "thin", color: { rgb: "E2E8F0" } },
        right: { style: "thin", color: { rgb: "E2E8F0" } }
      },
      fill: idx % 2 === 1 ? { fgColor: { rgb: "F8FAFC" } } : undefined
    };

    rows.push([
      cellHelper(row.invoiceDate ? formatHeaderDate(row.invoiceDate) : "", false, "left", dataStyle),
      cellHelper(row.invoiceNo || "", false, "center", dataStyle),
      cellHelper(row.refNo || "", false, "center", dataStyle),
      cellHelper((row.supplierName || "").toUpperCase(), false, "left", dataStyle),
      cellHelper((row.paymode || "").toUpperCase(), false, "center", dataStyle),
      cellHelper(Number(row.netValue || 0), false, "right", dataStyle),
      cellHelper(Number(row.vatAmount || 0), false, "right", dataStyle),
      cellHelper(Number(row.netAmount || 0), true, "right", dataStyle) // values bold under amount
    ]);
  });

  // 4. 2-3 Cells Gap (Insert 3 empty rows)
  rows.push(["", "", "", "", "", "", "", ""]);
  rows.push(["", "", "", "", "", "", "", ""]);
  rows.push(["", "", "", "", "", "", "", ""]);

  // 5. Totals / Summary Row
  const summaryStyle = {
    font: { bold: true, color: { rgb: "000000" } },
    fill: { fgColor: { rgb: "F8FAFC" } },
    border: {
      top: { style: "medium", color: { rgb: "49293E" } },
      bottom: { style: "medium", color: { rgb: "49293E" } },
      left: { style: "thin", color: { rgb: "CBD5E1" } },
      right: { style: "thin", color: { rgb: "CBD5E1" } }
    }
  };

  const summaryRowIdx = rows.length;
  merges.push({ s: { r: summaryRowIdx, c: 0 }, e: { r: summaryRowIdx, c: 4 } });

  rows.push([
    cellHelper(`Cash: ${formatAmount(cashTotal)}  |  Credit: ${formatAmount(creditTotal)}`, true, "left", summaryStyle),
    cellHelper("", false, "left", summaryStyle),
    cellHelper("", false, "left", summaryStyle),
    cellHelper("", false, "left", summaryStyle),
    cellHelper("", false, "left", summaryStyle),
    cellHelper(totalNetValue, true, "right", summaryStyle),
    cellHelper(totalVatAmount, true, "right", summaryStyle),
    cellHelper(grandTotal, true, "right", { ...summaryStyle, font: { bold: true, color: { rgb: "49293E" } } })
  ]);

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!merges"] = merges;

  // Set generous column widths
  ws["!cols"] = [
    { wch: 15 }, // BillDate
    { wch: 10 }, // BillNo
    { wch: 10 }, // Ref No
    { wch: 30 }, // Supplier
    { wch: 12 }, // Paymode
    { wch: 14 }, // Net Value
    { wch: 14 }, // Vat Amount
    { wch: 14 }  // Amount
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Purchase Report");
  XLSX.writeFile(wb, `Purchase_Report_${filters.fromDate}_to_${filters.toDate}.xlsx`);
};
