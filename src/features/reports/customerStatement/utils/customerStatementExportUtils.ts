import { formatAmount } from "../../../../utils/currency";
import type { CustomerStatementData } from "../types";

const formatHeaderDate = (dateStr: string) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

export const exportCustomerStatementPDF = async (
  statementData: CustomerStatementData[],
  filters: any
) => {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const doc = new jsPDF();
  
  const companyName = localStorage.getItem("companyName") || "FEKRA advertising";
  const companyAddress = localStorage.getItem("companyAddress") || "NEAR NESTO BESIDE BIN RASHIED SOUQ MABELA BUILDING NO 211 SECOND FLOOR FLAT NO 21";

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(companyName, 105, 14, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(companyAddress, 105, 20, { align: "center" });

  const dateStr = `Customer Statement From ${formatHeaderDate(filters.fromDate)} To ${formatHeaderDate(filters.toDate)}`;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(dateStr, 105, 28, { align: "center" });
  
  const titleWidth = doc.getTextWidth(dateStr);
  doc.line(105 - titleWidth / 2, 29, 105 + titleWidth / 2, 29);

  const tableHeaders = [["Date", "Invoice No", "Voucher Type", "Invoice Amount", "Balance"]];
  const tableBody = statementData.map((row) => [
    row.invoiceDate ? formatHeaderDate(row.invoiceDate) : "",
    row.invoiceNo || "",
    row.voucherType || "",
    formatAmount(Number(row.invoiceAmount || 0)),
    formatAmount(Number(row.balance || 0)),
  ]);

  const totalInvoiceAmount = statementData.reduce((s, r) => s + Number(r.invoiceAmount || 0), 0);
  const totalBalance = statementData.reduce((s, r) => s + Number(r.balance || 0), 0);

  const tableFoot = [[
    { 
      content: "Total", 
      colSpan: 3, 
      styles: { halign: "right" as const, fontStyle: "bold" as const } 
    },
    { 
      content: formatAmount(totalInvoiceAmount), 
      styles: { halign: "right" as const, fontStyle: "bold" as const } 
    },
    { 
      content: formatAmount(totalBalance), 
      styles: { halign: "right" as const, fontStyle: "bold" as const } 
    }
  ]];

  autoTable(doc, {
    startY: 35,
    head: tableHeaders,
    body: tableBody,
    foot: tableFoot,
    theme: "striped",
    headStyles: { fillColor: [73, 41, 62], textColor: [255, 255, 255] },
    footStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], lineWidth: { top: 0.5 }, lineColor: [200, 200, 200] },
    styles: { fontSize: 8, font: "helvetica" },
    didParseCell: (data) => {
      const colIdx = data.column.index;
      if (data.section === "head" || data.section === "body") {
        if (colIdx === 0 || colIdx === 1 || colIdx === 2) {
          data.cell.styles.halign = "left";
        } else if (colIdx === 3 || colIdx === 4) {
          data.cell.styles.halign = "right";
        }
      }
    }
  });

  doc.save(`Customer_Statement_${filters.fromDate}_to_${filters.toDate}.pdf`);
};

export const exportCustomerStatementExcel = async (
  statementData: CustomerStatementData[],
  filters: any
) => {
  const XLSX = await import("xlsx-js-style");
  const companyName = localStorage.getItem("companyName") || "FEKRA advertising";
  const companyAddress = localStorage.getItem("companyAddress") || "NEAR NESTO BESIDE BIN RASHIED SOUQ MABELA BUILDING NO 211 SECOND FLOOR FLAT NO 21";

  const totalInvoiceAmount = statementData.reduce((s, r) => s + Number(r.invoiceAmount || 0), 0);
  const totalBalance = statementData.reduce((s, r) => s + Number(r.balance || 0), 0);

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
    { s: { r: 0, c: 0 }, e: { r: 0, c: 4 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 4 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: 4 } }
  ];

  rows.push([cellHelper(companyName, true, "center", { font: { bold: true, sz: 14 } }), "", "", "", ""]);
  rows.push([cellHelper(companyAddress, false, "center", { font: { sz: 8.5, color: { rgb: "475569" } } }), "", "", "", ""]);
  rows.push([cellHelper(`Customer Statement From ${formatHeaderDate(filters.fromDate)} To ${formatHeaderDate(filters.toDate)}`, true, "center", { font: { bold: true, sz: 11, underline: true } }), "", "", "", ""]);
  rows.push(["", "", "", "", ""]);

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
    cellHelper("Date", true, "left", headerStyle),
    cellHelper("Invoice No", true, "left", headerStyle),
    cellHelper("Voucher Type", true, "left", headerStyle),
    cellHelper("Invoice Amount", true, "right", headerStyle),
    cellHelper("Balance", true, "right", headerStyle)
  ]);

  statementData.forEach((row, idx) => {
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
      cellHelper(row.invoiceNo || "", false, "left", dataStyle),
      cellHelper(row.voucherType || "", false, "left", dataStyle),
      cellHelper(Number(row.invoiceAmount || 0), false, "right", dataStyle),
      cellHelper(Number(row.balance || 0), true, "right", dataStyle)
    ]);
  });

  rows.push(["", "", "", "", ""]);
  rows.push(["", "", "", "", ""]);
  rows.push(["", "", "", "", ""]);

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
  merges.push({ s: { r: summaryRowIdx, c: 0 }, e: { r: summaryRowIdx, c: 2 } });

  rows.push([
    cellHelper("Total", true, "right", summaryStyle),
    cellHelper("", false, "right", summaryStyle),
    cellHelper("", false, "right", summaryStyle),
    cellHelper(totalInvoiceAmount, true, "right", summaryStyle),
    cellHelper(totalBalance, true, "right", { ...summaryStyle, font: { bold: true, color: { rgb: "49293E" } } })
  ]);

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!merges"] = merges;

  ws["!cols"] = [
    { wch: 15 }, // Date
    { wch: 15 }, // Invoice No
    { wch: 20 }, // Voucher Type
    { wch: 18 }, // Invoice Amount
    { wch: 18 }  // Balance
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Customer Statement");
  XLSX.writeFile(wb, `Customer_Statement_${filters.fromDate}_to_${filters.toDate}.xlsx`);
};
