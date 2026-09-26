import type { PosCartItem } from "../types";
import { branchApi } from "../../inventory/branches/services/branchApi";
import { getLineStyle } from "../../inventory/branches/utils/lineHelpers";
import { isKotArabicEnabled, getAlternativeArabicName, containsArabic } from "./alternativeHelpers";
import { getDecimalPart } from "../../../utils/currency";

export interface KotPrintData {
  orderNo: string;
  ticketNo: string;
  waiter: string;
  counter: string;
  section: string;
  table: string;
  orderType: string;
  date?: string;
  time?: string;
  headerTitle?: string;
  isMaster?: boolean;
  vehicleNo?: string;
  customerName?: string;
  kotHeader?: string;
  kotArabic?: boolean;
}

export const generateKotHtml = async (
  cartDetails: PosCartItem[], 
  data: KotPrintData
): Promise<string> => {
  // Use current date/time as fallback
  const now = new Date();
  const dateStr = data.date || now.toLocaleDateString('en-GB'); // DD/MM/YYYY
  const timeStr = data.time || now.toLocaleTimeString('en-US'); // h:mm:ss A

  const rawKotHeader = data.kotHeader || localStorage.getItem("kotHeader") || "QTY,DESCRIPTION,AMT";
  const kotHeaderStyle = rawKotHeader.toUpperCase().replace(/\s+/g, "");

  let customHeadersHtml = "";
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
        const isBackoffice = sessionStorage.getItem("tempSystemType") === "backoffice" || localStorage.getItem("systemType") === "backoffice";
        const branchIdStr = isBackoffice
          ? (sessionStorage.getItem("backoffice_activeBranchId") || sessionStorage.getItem("backoffice_branchId"))
          : (localStorage.getItem("activeBranchId") || localStorage.getItem("branchId"));
        
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
      const headers = branchLines.filter(l => l.section === 'header' && l.value);
      if (headers.length > 0) {
        customHeadersHtml = headers.map(l => {
          const styleObj = getLineStyle(l) as any;
          const styleStr = Object.entries(styleObj).map(([k, v]) => {
            const kebab = k.replace(/[A-Z]/g, m => "-" + m.toLowerCase());
            return `${kebab}:${v}`;
          }).join(";");
          return `<div dir="auto" style="${styleStr}">${l.value}</div>`;
        }).join("");
      }
    }
  } catch {
    // Silently proceed with fallback headers if branch endpoint is forbidden for cashiers
  }

  // Map internal camelCase/PascalCase names → human-readable display
  const orderTypeIdMap: Record<number, string> = {
    1: "DINE IN", 2: "TAKE OUT", 3: "DRIVE THRU",
    4: "DELIVERY", 5: "PROVIDERS", 6: "COMING"
  };
  const orderTypeNameMap: Record<string, string> = {
    "dinein": "DINE IN", "takein": "DINE IN",
    "takeout": "TAKE OUT", "takeaway": "TAKE OUT",
    "drivethru": "DRIVE THRU", "drivethrough": "DRIVE THRU",
    "delivery": "DELIVERY",
    "providers": "PROVIDERS",
    "coming": "COMING"
  };
  const rawOrderType = data.orderType || "";
  const normalizedKey = rawOrderType.toLowerCase().replace(/[\s_-]/g, "");
  const orderTypeStr = orderTypeNameMap[normalizedKey]
    || (data as any).orderTypeIdMap?.[(data as any).orderTypeId]
    || orderTypeIdMap[(data as any).orderTypeId as number]
    || (rawOrderType ? rawOrderType.replace(/([A-Z])/g, " $1").trim().toUpperCase() : "DINE IN");
  const isDineIn = orderTypeStr === "DINE IN";

  const isKotArabic = data.kotArabic ?? isKotArabicEnabled();

  const orderTypeArabicMap: Record<string, string> = {
    "DINE IN": "محلي",
    "TAKE OUT": "سفري",
    "DELIVERY": "توصيل",
    "DRIVE THRU": "طلبات السيارات",
    "PROVIDERS": "مزودي الخدمة",
    "COMING": "قادم",
  };
  const orderTypeAr = orderTypeArabicMap[orderTypeStr] || "";
  const orderTypeDisplay = isKotArabic && orderTypeAr 
    ? `${orderTypeStr} <span class="arabic-text" style="font-size: 16px;">(${orderTypeAr})</span>`
    : orderTypeStr;

  const kotHeaderTitleDisplay = data.headerTitle 
    ? data.headerTitle 
    : (isKotArabic ? "KOT / طلب المطبخ" : "KOT");

  let itemsHtml = "";
  let totalVat = 0;
  let grandTotal = 0;
  const decimalPart = getDecimalPart();
  const fmt = (val: number | string | undefined | null) => {
    const n = typeof val === 'string' ? parseFloat(val) : Number(val || 0);
    return (Number.isFinite(n) ? n : 0).toFixed(decimalPart);
  };

  cartDetails.forEach((item) => {
    // Determine the product name
    let name = (item.product?.name || `Item #${item.productId}`).toUpperCase();
    if (item.variantName && item.variantName.toLowerCase().trim() !== 'main') {
      name += ` - ${item.variantName.toUpperCase()}`;
    }
    const qty = item.quantity;
    
    const altArabicName = isKotArabic ? getAlternativeArabicName(item) : "";
    const nameDisplayHtml = altArabicName
      ? `<div style="line-height: 1.3;">${name}</div><div dir="rtl" lang="ar" class="arabic-text" style="font-size:13px; font-weight:bold; line-height:1.4; padding: 2px 0 1px 0;">${altArabicName}</div>`
      : `<div style="line-height: 1.3;">${name}</div>`;

    let extrasSum = 0;
    if (item.extras && item.extras.length > 0) {
      item.extras.forEach(ex => extrasSum += (ex.price * (ex.qty || 1)));
    }
    
    // Subtract extrasSum because the extras are printed separately below
    let baseAmt = (item as any).lineTotal;
    if (baseAmt !== undefined) {
      baseAmt -= extrasSum;
    } else {
      baseAmt = (item.price || item.product?.price || 0) * item.quantity;
    }
    const amt = fmt(baseAmt);

    if (kotHeaderStyle === "QTY,DESCRIPTION") {
      itemsHtml += `
        <div style="display:flex; width:100%; align-items:flex-start; padding: 2px 0;">
          <div style="flex: 0 0 50px; min-width:50px; text-align:center; font-weight:bold; font-size:13px;">${qty}</div>
          <div style="flex: 1 1 auto; text-align:left; font-weight:bold; font-size:13px; min-width:0; word-break:break-word;">${nameDisplayHtml}</div>
        </div>
      `;
    } else if (kotHeaderStyle.startsWith("DESCRIPTION")) {
      itemsHtml += `
        <div style="display:flex; width:100%; align-items:flex-start; padding: 2px 0;">
          <div style="flex: 1 1 auto; text-align:left; font-weight:bold; font-size:13px; min-width:0; word-break:break-word;">${nameDisplayHtml}</div>
          <div style="flex: 0 0 50px; min-width:50px; text-align:center; font-weight:bold; font-size:13px;">${qty}</div>
          <div style="flex: 0 0 60px; min-width:60px; text-align:right; font-weight:bold; font-size:13px;">${amt}</div>
        </div>
      `;
    } else {
      itemsHtml += `
        <div style="display:flex; width:100%; align-items:flex-start; padding: 2px 0;">
          <div style="flex: 0 0 50px; min-width:50px; text-align:center; font-weight:bold; font-size:13px;">${qty}</div>
          <div style="flex: 1 1 auto; text-align:left; font-weight:bold; font-size:13px; min-width:0; word-break:break-word;">${nameDisplayHtml}</div>
          <div style="flex: 0 0 60px; min-width:60px; text-align:right; font-weight:bold; font-size:13px;">${amt}</div>
        </div>
      `;
    }

    // Print extras
    if (item.extras && item.extras.length > 0) {
      item.extras.forEach((ex: any) => {
          const exName = (ex.name || "EXTRA").toUpperCase();
          const exArabic = isKotArabic ? (ex.arabicName || ex.arabic || "") : "";
          const exDisplay = exArabic
            ? `+ ${exName} <span dir="rtl" lang="ar" class="arabic-text" style="font-size:10px; font-weight:normal; margin-left:4px;">(${exArabic})</span>`
            : `+ ${exName}`;
          const exAmt = fmt(ex.price * ex.qty);
          if (kotHeaderStyle.startsWith("DESCRIPTION")) {
            itemsHtml += `
              <div style="display:flex; width:100%; align-items:flex-start; padding: 1px 0;">
                <div style="flex: 1 1 auto; text-align:left; font-size:10px; padding-left:6px;">${exDisplay}</div>
                <div style="flex: 0 0 45px;"></div>
                <div style="flex: 0 0 55px; min-width:55px; text-align:right; font-weight:bold; font-size:10px;">${exAmt}</div>
              </div>
            `;
          } else {
            itemsHtml += `
              <div style="display:flex; width:100%; align-items:flex-start; padding: 1px 0;">
                <div style="flex: 0 0 45px;"></div>
                <div style="flex: 1 1 auto; text-align:left; font-size:10px; padding-left:6px;">${exDisplay}</div>
                ${kotHeaderStyle === "QTY,DESCRIPTION" ? "" : `<div style="flex: 0 0 55px; min-width:55px; text-align:right; font-weight:bold; font-size:10px;">${exAmt}</div>`}
              </div>
            `;
          }
        });
    }

    // Print modifiers
    if (item.modifiers && item.modifiers.length > 0) {
      item.modifiers.forEach((mod: any) => {
          const modName = (mod.name || "MODIFIER").toUpperCase();
          const modArabic = isKotArabic ? (mod.arabicName || mod.arabic || "") : "";
          const modDisplay = modArabic
            ? `* ${modName} <span dir="rtl" lang="ar" class="arabic-text" style="font-size:10px; font-style:normal; margin-left:4px;">(${modArabic})</span>`
            : `* ${modName}`;
          if (kotHeaderStyle.startsWith("DESCRIPTION")) {
            itemsHtml += `
              <div style="display:flex; width:100%; align-items:flex-start; padding: 1px 0;">
                <div style="flex: 1 1 auto; text-align:left; font-style:italic; font-size:10px; padding-left:6px;">${modDisplay}</div>
                <div style="flex: 0 0 45px;"></div>
                <div style="flex: 0 0 55px; min-width:55px;"></div>
              </div>
            `;
          } else {
            itemsHtml += `
              <div style="display:flex; width:100%; align-items:flex-start; padding: 1px 0;">
                <div style="flex: 0 0 45px;"></div>
                <div style="flex: 1 1 auto; text-align:left; font-style:italic; font-size:10px; padding-left:6px;">${modDisplay}</div>
                ${kotHeaderStyle === "QTY,DESCRIPTION" ? "" : `<div style="flex: 0 0 55px; min-width:55px;"></div>`}
              </div>
            `;
          }
        });
    }

    // Print messages / notes
    if (item.messages && item.messages.length > 0) {
      item.messages.forEach((msg: any) => {
          const rawName = msg.name || "NOTE";
          const isMsgArabic = containsArabic(rawName);
          const msgDisplay = isMsgArabic
            ? `NOTE: <span dir="rtl" lang="ar" class="arabic-text">${rawName}</span>`
            : `NOTE: ${rawName.toUpperCase()}`;
          if (kotHeaderStyle.startsWith("DESCRIPTION")) {
            itemsHtml += `
              <div style="display:flex; width:100%; align-items:flex-start; padding: 1px 0;">
                <div style="flex: 1 1 auto; text-align:left; font-style:italic; font-size:10px; padding-left:6px; color:#d97706;">${msgDisplay}</div>
                <div style="flex: 0 0 45px;"></div>
                <div style="flex: 0 0 55px; min-width:55px;"></div>
              </div>
            `;
          } else {
            itemsHtml += `
              <div style="display:flex; width:100%; align-items:flex-start; padding: 1px 0;">
                <div style="flex: 0 0 45px;"></div>
                <div style="flex: 1 1 auto; text-align:left; font-style:italic; font-size:10px; padding-left:6px; color:#d97706;">${msgDisplay}</div>
                ${kotHeaderStyle === "QTY,DESCRIPTION" ? "" : `<div style="flex: 0 0 55px; min-width:55px;"></div>`}
              </div>
            `;
          }
        });
    }
    
    // Accumulate totals
    const itemVat = (item as any).vatAmount || 0;
    let itemNet = (item as any).lineTotal;
    if (itemNet === undefined) {
      itemNet = baseAmt + extrasSum + itemVat;
    }
    totalVat += itemVat;
    grandTotal += itemNet;
  });

  const styles = `
      <head>
        <meta charset="UTF-8" />
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap');
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: 'Cairo', 'Segoe UI', Tahoma, Arial, Helvetica, sans-serif;
            font-size: 13px;
            font-weight: bold;
            color: #000000;
            margin: 0;
            padding: 2px 4px;
            width: 100%;
            -webkit-font-smoothing: antialiased;
          }
          table { border-collapse: collapse; width: 100%; table-layout: fixed; }
          .text-center { text-align: center; }
          .font-bold { font-weight: bold; }
          .dashed-line { border: none; border-top: 1px dashed #000000; margin: 4px 0; }
          .solid-line { border: none; border-top: 2px solid #000000; margin: 4px 0; }
          .arabic-text {
            direction: rtl;
            text-align: right;
            font-family: 'Cairo', 'Segoe UI', Tahoma, Arial, 'Traditional Arabic', sans-serif;
            unicode-bidi: embed;
            text-rendering: optimizeLegibility;
            font-feature-settings: 'liga' 1, 'kern' 1;
            -webkit-font-feature-settings: 'liga' 1, 'kern' 1;
            word-wrap: normal;
            overflow-wrap: break-word;
            white-space: normal;
          }
        </style>
      </head>
  `;

  // ─── Build meta rows (label : value pairs in a 2-column grid) ──────
  const metaCell = (label: string, val: string) => {
    if (!label && !val) return '<td style="width: 50%;"></td>';
    return `
      <td style="width: 50%; padding: 1px 0; font-size: 11px;">
        ${label ? `<span style="font-weight: bold;">${label} :</span>` : ""} ${val}
      </td>
    `;
  };
  const metaRow = (label1: string, val1: string, label2: string, val2: string) => `
    <tr>
      ${metaCell(label1, val1)}
      ${metaCell(label2, val2)}
    </tr>
  `;

  // Common meta rows
  let metaHtml = metaRow("Date", dateStr, "Time", timeStr);
  metaHtml += metaRow("Waiter", data.waiter, "Counter", data.counter);
  if (isDineIn) {
    metaHtml += metaRow("Section", data.section, "Table", data.table);
  }
  if (data.vehicleNo || data.customerName) {
    metaHtml += metaRow(
      data.vehicleNo ? "Vehicle" : "", data.vehicleNo || "",
      data.customerName ? "Customer" : "", data.customerName || ""
    );
  }

  // ─── Order No / Ticket No row ──────
  const orderTicketHtml = `
    <table>
      <tr>
        <td style="width: 50%; text-align: left; padding: 4px 0; font-size: 12px;">
          <span style="font-weight: bold;">Order No</span>&nbsp;
          <span style="font-size: 18px; font-weight: bold;">#${data.orderNo}</span>
        </td>
        <td style="width: 50%; text-align: right; padding: 4px 0; font-size: 12px;">
          <span style="font-weight: bold;">Ticket No</span>&nbsp;
          <span style="font-size: 18px; font-weight: bold;">#${data.ticketNo}</span>
        </td>
      </tr>
    </table>
  `;

  let tableHeaderHtml = "";
  if (kotHeaderStyle === "QTY,DESCRIPTION") {
    tableHeaderHtml = `
      <div style="display:flex; width:100%; align-items:flex-end; padding-bottom:3px;">
        <div style="flex: 0 0 50px; min-width:50px; text-align:center; font-weight:bold; font-size:12px;">QTY${isKotArabic ? '<div class="arabic-text" style="font-size:10px; font-weight:normal; text-align:center;">الكمية</div>' : ''}</div>
        <div style="flex: 1 1 auto; text-align:left; font-weight:bold; font-size:12px;">DESCRIPTION${isKotArabic ? '<div class="arabic-text" style="font-size:10px; font-weight:normal; text-align:left;">الصنف</div>' : ''}</div>
      </div>
    `;
  } else if (kotHeaderStyle.startsWith("DESCRIPTION")) {
    tableHeaderHtml = `
      <div style="display:flex; width:100%; align-items:flex-end; padding-bottom:3px;">
        <div style="flex: 1 1 auto; text-align:left; font-weight:bold; font-size:12px;">DESCRIPTION${isKotArabic ? '<div class="arabic-text" style="font-size:10px; font-weight:normal; text-align:left;">الصنف</div>' : ''}</div>
        <div style="flex: 0 0 50px; min-width:50px; text-align:center; font-weight:bold; font-size:12px;">QTY${isKotArabic ? '<div class="arabic-text" style="font-size:10px; font-weight:normal; text-align:center;">الكمية</div>' : ''}</div>
        <div style="flex: 0 0 60px; min-width:60px; text-align:right; font-weight:bold; font-size:12px;">AMT${isKotArabic ? '<div class="arabic-text" style="font-size:10px; font-weight:normal; text-align:right;">المبلغ</div>' : ''}</div>
      </div>
    `;
  } else {
    tableHeaderHtml = `
      <div style="display:flex; width:100%; align-items:flex-end; padding-bottom:3px;">
        <div style="flex: 0 0 50px; min-width:50px; text-align:center; font-weight:bold; font-size:12px;">QTY${isKotArabic ? '<div class="arabic-text" style="font-size:10px; font-weight:normal; text-align:center;">الكمية</div>' : ''}</div>
        <div style="flex: 1 1 auto; text-align:left; font-weight:bold; font-size:12px;">DESCRIPTION${isKotArabic ? '<div class="arabic-text" style="font-size:10px; font-weight:normal; text-align:left;">الصنف</div>' : ''}</div>
        <div style="flex: 0 0 60px; min-width:60px; text-align:right; font-weight:bold; font-size:12px;">AMT${isKotArabic ? '<div class="arabic-text" style="font-size:10px; font-weight:normal; text-align:right;">المبلغ</div>' : ''}</div>
      </div>
    `;
  }

  // ─── Items section (flex-based for reliable column separation on thermal printers) ──────
  const itemsTableHtml = `
    <div>
      ${tableHeaderHtml}
      <hr class="dashed-line" style="margin: 2px 0 4px 0;" />
      ${itemsHtml}
    </div>
  `;

  // ─── Totals ──────
  const showTotals = kotHeaderStyle.includes("AMT");
  const totalsHtml = (showTotals && grandTotal > 0) ? `
    <hr class="dashed-line" />
    <table>
      ${totalVat > 0 ? `
      <tr>
        <td style="text-align: right; padding: 3px 8px 3px 0; font-size: 13px; font-weight: bold;">VAT Amount${isKotArabic ? ' <span class="arabic-text" style="font-size: 11px; font-weight: normal;">(الضريبة)</span>' : ''}:</td>
        <td style="text-align: right; width: 30%; padding: 3px 0; font-size: 13px; font-weight: bold;">${fmt(totalVat)}</td>
      </tr>
      ` : ''}
      <tr>
        <td style="text-align: right; padding: 3px 8px 3px 0; font-size: 14px; font-weight: bold;">Total${isKotArabic ? ' <span class="arabic-text" style="font-size: 12px; font-weight: normal;">(المجموع)</span>' : ''}:</td>
        <td style="text-align: right; width: 30%; padding: 3px 0; font-size: 14px; font-weight: bold;">${fmt(grandTotal)}</td>
      </tr>
    </table>
  ` : '';

  // ─── MASTER KOT layout ──────
  if (data.isMaster) {
    return `
      <html>
        ${styles}
        <body>
          ${customHeadersHtml ? `
            <div style="text-align: center; margin-bottom: 8px; padding: 0 4px; width: 100%; word-break: break-word;">
              ${customHeadersHtml}
            </div>
          ` : ''}

          <div class="text-center" style="font-size: 18px; font-weight: bold; margin-bottom: 5px;">${orderTypeDisplay}</div>

          ${orderTicketHtml}

          <hr class="solid-line" />

          <table>${metaHtml}</table>

          ${isDineIn ? `<div class="text-center" style="font-size: 20px; font-weight: bold; margin: 8px 0;">Table : ${data.table}</div>` : ''}

          <hr class="solid-line" />
          <div class="text-center" style="font-size: 22px; font-weight: bold; margin: 8px 0;">***${kotHeaderTitleDisplay}***</div>
          <hr class="solid-line" />

          ${itemsTableHtml}

          ${totalsHtml}
          
          <div class="text-center" style="font-size: 11px; margin-top: 8px;">Print On : ${dateStr} ${timeStr}</div>
        </body>
      </html>
    `;
  }

  // ─── STATION KOT layout ──────
  return `
    <html>
      ${styles}
      <body>
        ${customHeadersHtml ? `
            <div style="text-align: center; margin-bottom: 8px; padding: 0 4px; width: 100%; word-break: break-word;">
              ${customHeadersHtml}
            </div>
          ` : ''}

        <div class="text-center" style="font-size: 20px; font-weight: bold; margin-bottom: 4px;">${orderTypeDisplay}</div>
        <div class="text-center" style="font-size: 22px; font-weight: bold; margin-bottom: 8px; letter-spacing: 1px;">***${kotHeaderTitleDisplay}***</div>

        <hr class="solid-line" />

        <table>${metaHtml}</table>

        ${orderTicketHtml}

        <hr class="solid-line" />

        ${itemsTableHtml}

        ${totalsHtml}
      </body>
    </html>
  `;
};
