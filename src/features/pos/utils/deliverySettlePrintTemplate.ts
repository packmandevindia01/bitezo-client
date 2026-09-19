import { branchApi } from "../../inventory/branches/services/branchApi";
import { getLineStyle } from "../../inventory/branches/utils/lineHelpers";
import { getDecimalPart } from "../../../utils/currency";
import { Capacitor } from "@capacitor/core";

export interface DeliverySettleOrderItem {
  sNo: number;
  token: string;
  customerAddress: string;
  amount: number;
  paymodeName?: string;
}

export interface DeliverySettlePrintData {
  driverName: string;
  date?: string;
  time?: string;
  settleBy: string;
  paymodeName?: string;
  items: DeliverySettleOrderItem[];
  total: number;
  grandTotal: number;
  printTime?: string;
  showCompanyHeader?: boolean;
}

/**
 * Generates the HTML receipt for Driver / Delivery Settlement.
 * Exactly matches the layout in the physical receipt image:
 * - Company header lines (HURA LOUNGE CAFE, CR, VAT, etc.)
 * - Driver, Date, Settle By
 * - Paymode Header (CARD, CASH, etc.)
 * - Table: SNo | Token | Customer Address | Amount
 * - Total & Grand Total
 * - Print Time
 */
export const generateDeliverySettlePrintHtml = async (
  data: DeliverySettlePrintData
): Promise<string> => {
  const now = new Date();
  const dateStr = data.date || now.toLocaleDateString("en-GB"); // DD/MM/YYYY
  const timeStr = data.time || now.toLocaleTimeString("en-US"); // hh:mm:ss A
  const dateTimeStr = `${dateStr} ${timeStr}`;
  const printTimeStr = data.printTime || `${now.toLocaleDateString("en-GB")} ${now.toLocaleTimeString("en-US")}`;

  let customHeadersHtml = "";
  const allowCompanyHeader = data.showCompanyHeader !== false;

  if (allowCompanyHeader) {
    try {
      let branchLines: any[] = [];
      const cached = localStorage.getItem("branchPrintData");
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) branchLines = parsed;
          else if (Array.isArray(parsed?.data)) branchLines = parsed.data;
        } catch {}
      }

      if (branchLines.length === 0) {
        try {
          branchLines = await branchApi.fetchBranchPrintData();
          if (branchLines && branchLines.length > 0) {
            localStorage.setItem("branchPrintData", JSON.stringify(branchLines));
          }
        } catch {
          const isBackoffice =
            sessionStorage.getItem("tempSystemType") === "backoffice" ||
            localStorage.getItem("systemType") === "backoffice";
          const branchIdStr = isBackoffice
            ? sessionStorage.getItem("backoffice_activeBranchId") ||
              sessionStorage.getItem("backoffice_branchId")
            : localStorage.getItem("activeBranchId") || localStorage.getItem("branchId");

          let branchId = 0;
          if (branchIdStr && branchIdStr !== "null" && branchIdStr !== "undefined") {
            branchId = Number(branchIdStr);
          }
          if (branchId > 0) {
            const branch = await branchApi.fetchBranchById(branchId);
            if (branch && branch.lines) {
              branchLines = branch.lines;
            }
          }
        }
      }

      if (branchLines && branchLines.length > 0) {
        const isHeader = (l: any) => {
          const sec = String(l.section || "").toLowerCase();
          const code = String(l.code || l.id || "").toUpperCase();
          return sec === "header" || (code.startsWith("H") && !code.startsWith("EH"));
        };

        const headers = branchLines.filter(
          (l) => isHeader(l) && l.value && String(l.value).trim() !== ""
        );
        if (headers.length > 0) {
          customHeadersHtml = headers
            .map((l) => {
              const styleObj = getLineStyle(l) as any;
              const styleStr = Object.entries(styleObj)
                .map(([k, v]) => {
                  const kebab = k.replace(/[A-Z]/g, (m) => "-" + m.toLowerCase());
                  return `${kebab}:${v}`;
                })
                .join(";");
              return `<div style="${styleStr}">${l.value}</div>`;
            })
            .join("");
        }
      }
    } catch {
      // Proceed without custom headers if branch endpoint is unreachable
    }
  }

  // Fallback company header if branch print data is missing
  if (!customHeadersHtml) {
    const companyName = localStorage.getItem("companyName") || localStorage.getItem("branchName") || "";
    const crNo = localStorage.getItem("crNo") || localStorage.getItem("companyCrNo") || "";
    const vatNo = localStorage.getItem("vatNo") || localStorage.getItem("companyVatNo") || "";
    if (companyName) {
      customHeadersHtml = `
        <div style="text-align: center; font-weight: bold; font-size: 15px;">${companyName}</div>
        ${crNo ? `<div style="text-align: center; font-size: 12px;">CR No : ${crNo}</div>` : ""}
        ${vatNo ? `<div style="text-align: center; font-size: 12px;">VAT NO : ${vatNo}</div>` : ""}
      `;
    }
  }

  const decimalPart = getDecimalPart();
  const fmt = (val: number | string | undefined | null) => {
    const n = typeof val === "string" ? parseFloat(val) : Number(val || 0);
    return (Number.isFinite(n) ? n : 0).toFixed(decimalPart);
  };

  // Group items by paymodeName (if items have different paymodes, or single paymode)
  const paymodeGroups: { paymode: string; items: DeliverySettleOrderItem[]; subtotal: number }[] = [];
  const defaultPaymode = (data.paymodeName || "CARD").toUpperCase();

  const groupedMap = new Map<string, DeliverySettleOrderItem[]>();
  data.items.forEach((item) => {
    const mode = (item.paymodeName || defaultPaymode).toUpperCase();
    if (!groupedMap.has(mode)) {
      groupedMap.set(mode, []);
    }
    groupedMap.get(mode)!.push(item);
  });

  groupedMap.forEach((items, paymode) => {
    const subtotal = items.reduce((sum, it) => sum + (Number(it.amount) || 0), 0);
    paymodeGroups.push({ paymode, items, subtotal });
  });

  // Build the HTML for all groups
  const groupsHtml = paymodeGroups
    .map((group) => {
      const rowsHtml = group.items
        .map((item, idx) => {
          const sNo = item.sNo || idx + 1;
          const token = item.token || "-";
          const addr = item.customerAddress || "-";
          const amt = fmt(item.amount);

          return `
            <tr>
              <td style="width: 10%; text-align: left; vertical-align: top; padding: 2px 0;">${sNo}</td>
              <td style="width: 18%; text-align: left; vertical-align: top; padding: 2px 0;">${token}</td>
              <td style="width: 44%; text-align: left; vertical-align: top; padding: 2px 0; word-break: break-all;">${addr}</td>
              <td style="width: 28%; text-align: right; vertical-align: top; padding: 2px 0;">${amt}</td>
            </tr>
          `;
        })
        .join("");

      return `
        <div style="font-weight: bold; font-size: 13px; text-transform: uppercase; margin: 6px 0 3px 0;">
          ${group.paymode}
        </div>
        <div class="dashed-hr"></div>

        <table class="items-table">
          <thead>
            <tr>
              <th style="width: 10%; text-align: left; padding: 2px 0;">SNo</th>
              <th style="width: 18%; text-align: left; padding: 2px 0;">Token</th>
              <th style="width: 44%; text-align: left; padding: 2px 0;">Customer Address</th>
              <th style="width: 28%; text-align: right; padding: 2px 0;">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr><td colspan="4"><div class="dashed-hr" style="margin: 2px 0 4px 0;"></div></td></tr>
            ${rowsHtml}
          </tbody>
        </table>

        <div class="dashed-hr"></div>
        <table class="totals-table">
          <tr>
            <td class="totals-label">Total</td>
            <td class="totals-value">${fmt(group.subtotal)}</td>
          </tr>
        </table>
      `;
    })
    .join("");

  const grandTotal =
    data.grandTotal !== undefined && data.grandTotal > 0
      ? data.grandTotal
      : paymodeGroups.reduce((s, g) => s + g.subtotal, 0);

  return `
    <html>
      <head>
        <meta charset="UTF-8" />
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            font-size: 13px;
            color: #000;
            margin: 0 auto;
            padding: 0;
            width: 100%;
            max-width: 576px;
            background-color: #ffffff;
            -webkit-font-smoothing: antialiased;
            text-rendering: geometricPrecision;
          }
          .text-center { text-align: center; }
          .font-bold { font-weight: bold; }
          .custom-header { margin-bottom: 8px; text-align: center; }
          
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          
          .dashed-hr { border: none; border-top: 1px dashed #000; margin: 5px 0; }
          .solid-hr { border: none; border-top: 1px solid #000; margin: 4px 0; }
          
          .meta-table td { padding: 1.5px 0; font-size: 12px; }
          .meta-label { width: 26%; font-weight: bold; }
          .meta-value { width: 74%; }
          
          .items-table th {
            font-weight: bold;
            font-size: 12px;
          }
          
          .totals-table { width: 100%; font-size: 13px; }
          .totals-label { width: 72%; text-align: right; padding-right: 12px; font-weight: bold; }
          .totals-value { width: 28%; text-align: right; font-weight: bold; }
          
          .grand-total-label { font-size: 14px; font-weight: bold; text-align: right; padding-right: 12px; }
          .grand-total-value { font-size: 14px; font-weight: bold; text-align: right; }

          .print-time {
            font-size: 11px;
            margin-top: 8px;
          }
        </style>
      </head>
      <body>
        ${customHeadersHtml ? `<div class="custom-header">${customHeadersHtml}</div>` : ""}

        <div class="meta-section">
          <table class="meta-table">
            <tr>
              <td class="meta-label">Driver</td>
              <td class="meta-value">${data.driverName}</td>
            </tr>
            <tr>
              <td class="meta-label">Date</td>
              <td class="meta-value">${dateTimeStr}</td>
            </tr>
            <tr>
              <td class="meta-label">Settle By</td>
              <td class="meta-value">${data.settleBy}</td>
            </tr>
          </table>
        </div>

        <div class="dashed-hr"></div>

        ${groupsHtml}

        <div class="dashed-hr"></div>
        <table class="totals-table">
          <tr>
            <td class="grand-total-label">Grand Total</td>
            <td class="grand-total-value">${fmt(grandTotal)}</td>
          </tr>
        </table>
        <div class="dashed-hr"></div>

        <div class="print-time">
          Print Time : ${printTimeStr}
        </div>
      </body>
    </html>
  `;
};

/**
 * Universal print dispatcher for Driver / Delivery Settlement.
 * Routes to native ESC/POS on mobile, or QZ Tray HTML receipt on desktop.
 */
export const printDeliverySettlementReceipt = async (
  data: DeliverySettlePrintData,
  printerName?: string
): Promise<void> => {
  try {
    if (Capacitor.isNativePlatform()) {
      const { printEscPosMarkup } = await import("../services/qzService");
      const { generateDeliverySettleMarkup } = await import("./escPosGenerator");
      const markup = generateDeliverySettleMarkup(data);
      await printEscPosMarkup(markup, printerName);
    } else {
      const { printHtmlReceipt } = await import("../services/qzService");
      const html = await generateDeliverySettlePrintHtml(data);
      const targetPrinter = printerName || localStorage.getItem("cachedBillPrinter") || undefined;
      await printHtmlReceipt(html, targetPrinter);
    }
  } catch (err) {
    console.error("[printDeliverySettlementReceipt] Error:", err);
    throw err;
  }
};
