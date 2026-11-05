import { escapeHtml } from "../../../shared/lib/html";
import { printHtmlInIframe } from "../../../shared/lib/print";
import type { toMatrix } from "./reportMath";

/**
 * Print / Excel / PDF for every report — all from the same matrix the screen shows (toMatrix), so the
 * outputs cannot disagree. jsPDF / xlsx are loaded only when an export is clicked (they are ~1.2 MB).
 */
type Matrix = ReturnType<typeof toMatrix>;

export interface ReportMeta {
  title: string;
  subtitle?: string;
  /** e.g. [["Branch", "All"], ["Period", "2026-01 To 2026-12"]] */
  lines?: [string, string][];
}

const fileSafe = (s: string) => s.replace(/[^a-z0-9]+/gi, "_").replace(/^_|_$/g, "") || "report";

export const printReport = (m: Matrix, meta: ReportMeta) => {
  const th = m.header.map((h, i) => `<th style="text-align:${m.align[i]}">${escapeHtml(h)}</th>`).join("");
  const tr = (cells: string[], bold = false) =>
    `<tr${bold ? ' style="font-weight:700;border-top:2px solid #333"' : ""}>${cells
      .map((c, i) => `<td style="text-align:${m.align[i]}">${escapeHtml(c)}</td>`).join("")}</tr>`;
  const html = `
    <style>
      body{font-family:Arial,sans-serif;font-size:11px;color:#111;margin:16px}
      h1{font-size:16px;margin:0 0 4px} .meta{margin:0 0 10px;color:#444}
      table{width:100%;border-collapse:collapse} th,td{border:1px solid #ccc;padding:4px 6px}
      th{background:#f1f1f1;font-size:10px}
    </style>
    <h1>${escapeHtml(meta.title)}</h1>
    <div class="meta">${[meta.subtitle, ...(meta.lines || []).map(([k, v]) => `${k}: ${v}`)].filter(Boolean).map((x) => escapeHtml(String(x))).join(" &nbsp;|&nbsp; ")}</div>
    <table><thead><tr>${th}</tr></thead><tbody>${m.body.map((r) => tr(r)).join("")}${m.footer ? tr(m.footer, true) : ""}</tbody></table>`;
  printHtmlInIframe(html, meta.title);
};

export const exportReportExcel = async (m: Matrix, meta: ReportMeta) => {
  const XLSX = await import("xlsx");
  const aoa = [[meta.title], ...(meta.lines || []).map(([k, v]) => [`${k}: ${v}`]), [], m.header, ...m.body, ...(m.footer ? [m.footer] : [])];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Report");
  XLSX.writeFile(wb, `${fileSafe(meta.title)}.xlsx`);
};

export const exportReportPdf = async (m: Matrix, meta: ReportMeta) => {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
  const doc = new jsPDF({ orientation: m.header.length > 7 ? "landscape" : "portrait" });
  doc.setFontSize(14);
  doc.text(meta.title, 14, 15);
  doc.setFontSize(9);
  (meta.lines || []).forEach(([k, v], i) => doc.text(`${k}: ${v}`, 14, 22 + i * 5));
  const columnStyles: Record<number, { halign: "left" | "right" | "center" }> = {};
  m.align.forEach((a, i) => { columnStyles[i] = { halign: a }; });
  autoTable(doc, {
    head: [m.header],
    body: m.footer ? [...m.body, m.footer] : m.body,
    startY: 22 + (meta.lines?.length || 0) * 5 + 2,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [73, 41, 62] },
    columnStyles,
    didParseCell: (d: { section: string; row: { index: number }; cell: { styles: { fontStyle: string } } }) => {
      if (m.footer && d.section === "body" && d.row.index === m.body.length) d.cell.styles.fontStyle = "bold";
    },
  });
  doc.save(`${fileSafe(meta.title)}.pdf`);
};
