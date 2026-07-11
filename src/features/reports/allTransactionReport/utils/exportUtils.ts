import { formatAmount } from "../../../../utils/currency";
import type { AllTransactionReportData } from "../types";

const formatHeaderDate = (dateStr: string) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

const getGroupedData = (reportData: AllTransactionReportData[]) => {
  if (!reportData || reportData.length === 0) return [];
  const groups: { voucher: string; items: any[]; total: number }[] = [];
  const balances: { voucher: string; items: any[]; total: number } = { voucher: "Balance", items: [], total: 0 };
  
  reportData.forEach((row) => {
    const v = row.voucher || "Unknown";
    if (v.toLowerCase().includes("balance")) {
      balances.items.push(row);
      balances.total += Number(row.amount) || 0;
    } else {
      let existing = groups.find(g => g.voucher === v);
      if (!existing) {
        existing = { voucher: v, items: [], total: 0 };
        groups.push(existing);
      }
      existing.items.push(row);
      existing.total += Number(row.amount) || 0;
    }
  });
  if (balances.items.length > 0) groups.push(balances);
  return groups;
};

export const exportAllTransactionReportPDF = async (
  reportData: AllTransactionReportData[],
  _totalAmount: number,
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

  const dateStr = `All Transaction Report From ${formatHeaderDate(filters.fromDate)} To ${formatHeaderDate(filters.toDate)}`;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(dateStr, 105, 28, { align: "center" });
  
  const titleWidth = doc.getTextWidth(dateStr);
  doc.line(105 - titleWidth / 2, 29, 105 + titleWidth / 2, 29);

  const headers = [["SNo", "Particular", "Amount"]];
  const body: any[] = [];
  const groupedData = getGroupedData(reportData);

  groupedData.forEach((group, gIdx) => {
    const isBalance = group.voucher.toLowerCase().includes("balance");
    if (isBalance && body.length > 0) {
      body.push([{ content: "---", colSpan: 3, styles: { halign: "center" as const, fontStyle: "italic" as const, textColor: [150, 150, 150] } }]);
    }
    
    group.items.forEach((row, iIdx) => {
      body.push([
        iIdx === 0 && !isBalance ? String(gIdx + 1) : "",
        row.particular || "-",
        formatAmount(Number(row.amount || 0)),
      ]);
    });
    
    if (!isBalance) {
      body.push([
        "",
        { content: `Total ${group.voucher}`, styles: { fontStyle: "bold" as const, halign: "center" as const, fillColor: [243, 232, 255] } },
        { content: formatAmount(group.total), styles: { fontStyle: "bold" as const, halign: "right" as const, fillColor: [243, 232, 255] } }
      ]);
    }
  });

  autoTable(doc, {
    startY: 35,
    head: headers,
    body: body,
    theme: "striped",
    headStyles: { fillColor: [73, 41, 62], textColor: [255, 255, 255] },
    styles: { fontSize: 8, font: "helvetica" },
    columnStyles: {
      0: { cellWidth: 15, halign: "center" },
      1: { cellWidth: 130, halign: "left" },
      2: { cellWidth: 40, halign: "right" },
    },
    didParseCell: (data) => {
      const colIdx = data.column.index;
      if (data.section === "head" || data.section === "body") {
        if (colIdx === 0) data.cell.styles.halign = "center";
        else if (colIdx === 1) data.cell.styles.halign = "left";
        else if (colIdx === 2) data.cell.styles.halign = "right";
      }
    }
  });

  doc.save(`All_Transaction_Report_${filters.fromDate}_to_${filters.toDate}.pdf`);
};

export const exportAllTransactionReportExcel = async (
  reportData: AllTransactionReportData[],
  _totalAmount: number,
  filters: any
) => {
  const XLSX = await import("xlsx-js-style");
  const companyName = localStorage.getItem("companyName") || "FEKRA advertising";
  const companyAddress = localStorage.getItem("companyAddress") || "NEAR NESTO BESIDE BIN RASHIED SOUQ MABELA BUILDING NO 211 SECOND FLOOR FLAT NO 21";

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
    { s: { r: 0, c: 0 }, e: { r: 0, c: 3 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 3 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: 3 } }
  ];

  rows.push([cellHelper(companyName, true, "center", { font: { bold: true, sz: 14 } }), "", "", ""]);
  rows.push([cellHelper(companyAddress, false, "center", { font: { sz: 8.5, color: { rgb: "475569" } } }), "", "", ""]);
  rows.push([cellHelper(`All Transaction Report From ${formatHeaderDate(filters.fromDate)} To ${formatHeaderDate(filters.toDate)}`, true, "center", { font: { bold: true, sz: 11, underline: true } }), "", "", ""]);
  rows.push([]); 

  const headerStyle = { fill: { fgColor: { rgb: "49293E" } }, font: { color: { rgb: "FFFFFF" }, bold: true, sz: 10 } };
  rows.push([
    cellHelper("SNo", true, "center", headerStyle),
    cellHelper("Particular", true, "left", headerStyle),
    cellHelper("Amount", true, "right", headerStyle)
  ]);

  const groupedData = getGroupedData(reportData);

  groupedData.forEach((group, gIdx) => {
    const isBalance = group.voucher.toLowerCase().includes("balance");
    if (isBalance && rows.length > 5) {
      rows.push([
        cellHelper(""),
        cellHelper("----------------------------------------", false, "center"),
        cellHelper("")
      ]);
    }
    
    group.items.forEach((row, iIdx) => {
      rows.push([
        cellHelper(iIdx === 0 && !isBalance ? gIdx + 1 : "", false, "center"),
        cellHelper(row.particular || "-", false, "left"),
        cellHelper(Number(row.amount || 0), false, "right")
      ]);
    });
    
    if (!isBalance) {
      const subtotalStyle = { fill: { fgColor: { rgb: "F3E8FF" } }, font: { bold: true, sz: 10 } };
      rows.push([
        cellHelper("", false, "center", subtotalStyle),
        cellHelper(`Total ${group.voucher}`, true, "center", subtotalStyle),
        cellHelper(group.total, true, "right", subtotalStyle)
      ]);
    }
  });

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!merges"] = merges;
  ws["!cols"] = [{ wch: 10 }, { wch: 45 }, { wch: 20 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "AllTransactionReport");
  XLSX.writeFile(wb, `All_Transaction_Report_${filters.fromDate}_to_${filters.toDate}.xlsx`);
};
