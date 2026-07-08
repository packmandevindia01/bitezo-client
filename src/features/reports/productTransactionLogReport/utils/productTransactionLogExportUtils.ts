
import type { ProductTransactionLogRecord, ProductTransactionLogTotals } from "../types";

const formatHeaderDate = (dateStr: string) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
};

// ── PDF Export ────────────────────────────────────────────────────────────────
export const exportProductTransactionLogReportPDF = async (
  logData: ProductTransactionLogRecord[],
  totalData: ProductTransactionLogTotals,
  filters: any
) => {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const doc = new jsPDF("l", "mm", "a4"); // landscape for wider table
  const companyName = localStorage.getItem("companyName") || "Company";
  const companyAddress = localStorage.getItem("companyAddress") || "";

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(companyName, 148, 12, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(companyAddress, 148, 18, { align: "center" });

  const title = `Product Transaction Log  |  ${formatHeaderDate(filters.fromDate)} – ${formatHeaderDate(filters.toDate)}`;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(title, 148, 25, { align: "center" });
  const tw = doc.getTextWidth(title);
  doc.line(148 - tw / 2, 26.5, 148 + tw / 2, 26.5);

  const headers = [["SNo", "Branch", "Transaction", "Voucher No", "Account", "Qty In", "Qty Out", "Balance"]];

  const body = logData.map((row) => [
    String(row.sNo),
    row.branch || "",
    row.transaction || "",
    row.voucherNo || "",
    row.account || "",
    row.qtyIn || "—",
    row.qtyOut || "—",
    row.balance || "",
  ]);

  const foot = [[
    {
      content: `Opening: ${totalData.opening}     Received: ${totalData.received}     Issued: ${totalData.issued}     Balance: ${totalData.balance}`,
      colSpan: 8,
      styles: { halign: "left" as const, fontStyle: "bold" as const },
    },
  ]];

  autoTable(doc, {
    startY: 32,
    head: headers,
    body,
    foot,
    theme: "striped",
    headStyles: { fillColor: [73, 41, 62], textColor: 255, fontSize: 8 },
    footStyles: { fillColor: [245, 245, 245], textColor: 50, fontStyle: "bold", fontSize: 8 },
    columnStyles: {
      0: { halign: "center", cellWidth: 12 },
      1: { halign: "center", cellWidth: 22 },
      2: { halign: "left",   cellWidth: 38 },
      3: { halign: "center", cellWidth: 28 },
      4: { halign: "left",   cellWidth: 40 },
      5: { halign: "right",  cellWidth: 28 },
      6: { halign: "right",  cellWidth: 28 },
      7: { halign: "right",  cellWidth: 28 },
    },
    styles: { fontSize: 8 },
  });

  doc.save("product_transaction_log.pdf");
};

// ── Excel Export ──────────────────────────────────────────────────────────────
export const exportProductTransactionLogReportExcel = async (
  logData: ProductTransactionLogRecord[],
  totalData: ProductTransactionLogTotals,
  filters: any
) => {
  const XLSX = await import("xlsx-js-style");
  const companyName = localStorage.getItem("companyName") || "Company";
  const title = `Product Transaction Log — ${formatHeaderDate(filters.fromDate)} to ${formatHeaderDate(filters.toDate)}`;

  const rows: any[] = [];
  rows.push([companyName, "", "", "", "", "", "", ""]);
  rows.push([title, "", "", "", "", "", "", ""]);
  rows.push(["", "", "", "", "", "", "", ""]);
  rows.push(["SNo", "Branch", "Transaction", "Voucher No", "Account", "Qty In", "Qty Out", "Balance"]);

  logData.forEach((row) => {
    rows.push([
      row.sNo,
      row.branch || "",
      row.transaction || "",
      row.voucherNo || "",
      row.account || "",
      row.qtyIn || "—",
      row.qtyOut || "—",
      row.balance || "",
    ]);
  });

  rows.push(["", "", "", "", "", "", "", ""]);
  rows.push([`Opening: ${totalData.opening}`, "", `Received: ${totalData.received}`, "", `Issued: ${totalData.issued}`, "", `Balance: ${totalData.balance}`, ""]);

  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Style header row (row index 3)
  const headerCols = ["A", "B", "C", "D", "E", "F", "G", "H"];
  headerCols.forEach((col) => {
    const ref = `${col}4`;
    if (ws[ref]) {
      ws[ref].s = {
        font: { bold: true, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: "49293E" } },
        alignment: { horizontal: "center" },
      };
    }
  });

  // Title merges
  ws["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 7 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 7 } },
  ];

  // Column widths
  ws["!cols"] = [
    { wch: 6 }, { wch: 14 }, { wch: 24 }, { wch: 16 },
    { wch: 22 }, { wch: 14 }, { wch: 14 }, { wch: 18 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Transaction Log");
  XLSX.writeFile(wb, "product_transaction_log.xlsx");
};
