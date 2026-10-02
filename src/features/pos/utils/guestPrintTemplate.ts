import type { PosCartItem } from "../types";
import { branchApi } from "../../inventory/branches/services/branchApi";
import { getLineStyle } from "../../inventory/branches/utils/lineHelpers";
import { isBillArabicEnabled, getAlternativeArabicName, containsArabic } from "./alternativeHelpers";
import { getDecimalPart } from "../../../utils/currency";

export interface GuestPrintData {
  orderNo: string;
  ticketNo: string;
  invoiceNo?: string;
  waiter: string;
  counter: string;
  section: string;
  table: string;
  orderType: string;
  date?: string;
  time?: string;
  customerName?: string;
  vehicleNo?: string;
  contactNo?: string;
  flatNo?: string;
  buildingNo?: string;
  blockNo?: string;
  roadNo?: string;
  area?: string;
  providerNo?: string;
  subTotal: number;
  discount?: number;
  serviceCharge: number;
  levy: number;
  vatAmount: number;
  netAmount: number;
  deliveryCharge?: number;
  enableVat?: boolean;
  payments?: { name: string; amount: number }[];
  changeAmount?: number;
  isSettlement?: boolean;
  isPackager?: boolean;
  showCompanyHeader?: boolean;
  billArabic?: boolean;
}

const formatOrderNo = (orderNo: any): string => {
  if (!orderNo) return "";
  const str = String(orderNo).trim();
  if (str.includes(",")) {
    return str
      .split(",")
      .map(s => {
        const trimmed = s.trim();
        return trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
      })
      .join(", ");
  }
  return str.startsWith("#") ? str : `#${str}`;
};

const getPaymodeArabic = (name: string): string => {
  const lower = (name || "").toLowerCase().trim();
  if (lower === "cash") return "نقد";
  if (lower === "card") return "بطاقة";
  if (lower === "credit") return "آجل";
  return "";
};

export const generateGuestPrintHtml = async (
  cartDetails: PosCartItem[],
  data: GuestPrintData
): Promise<string> => {
  const now = new Date();
  const dateStr = data.date || now.toLocaleDateString('en-GB'); // DD/MM/YYYY
  const timeStr = data.time || now.toLocaleTimeString('en-US'); // h:mm:ss A

  let customHeadersHtml = "";
  let customFootersHtml = "";
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
        const isHeader = (l: any) => {
          const sec = String(l.section || "").toLowerCase();
          const code = String(l.code || l.id || "").toUpperCase();
          return sec === "header" || (code.startsWith("H") && !code.startsWith("EH"));
        };
        const isFooter = (l: any) => {
          const sec = String(l.section || "").toLowerCase();
          const code = String(l.code || l.id || "").toUpperCase();
          return sec === "footer" || code.startsWith("F");
        };

        const headers = branchLines.filter(l => isHeader(l) && l.value && String(l.value).trim() !== "");
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

        const footers = branchLines.filter(l => isFooter(l) && l.value && String(l.value).trim() !== "");
        if (footers.length > 0) {
          customFootersHtml = footers.map(l => {
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
  }

  const isTakeOut = data.orderType?.toLowerCase().includes("take");
  const isDriveThru = data.orderType?.toLowerCase().includes("drive");
  const isDineIn = data.orderType?.toLowerCase().includes("dine");
  const isDelivery = data.orderType?.toLowerCase().includes("delivery");

  const modePrefix = data.isPackager ? "PACKAGER" : (data.isSettlement ? "" : "GUEST");

  let orderTypeLabel = modePrefix;
  if (isTakeOut) orderTypeLabel = modePrefix ? `${modePrefix} (TAKE OUT)` : "(TAKE OUT)";
  else if (isDriveThru) orderTypeLabel = modePrefix ? `${modePrefix} (DRIVE THRU)` : "(DRIVE THRU)";
  else if (isDineIn) orderTypeLabel = modePrefix ? `${modePrefix} (DINE IN)` : "(DINE IN)";
  else if (isDelivery) orderTypeLabel = modePrefix ? `${modePrefix} (DELIVERY)` : "(DELIVERY)";

  const isBillArabic = data.billArabic ?? isBillArabicEnabled();

  const arabicInvoiceTitle = data.enableVat
    ? '<div dir="rtl" lang="ar" class="arabic-text" style="font-size:12px; font-weight:bold; text-align:center; margin-top:2px;">فاتورة ضريبية مبسطة</div>'
    : '<div dir="rtl" lang="ar" class="arabic-text" style="font-size:12px; font-weight:bold; text-align:center; margin-top:2px;">فاتورة مبسطة</div>';

  const headerTitle = data.enableVat 
    ? `SIMPLIFIED TAX INVOICE${isBillArabic ? `${arabicInvoiceTitle}` : ''}<div style="margin-top:2px;">${orderTypeLabel}</div>` 
    : `SIMPLIFIED INVOICE${isBillArabic ? `${arabicInvoiceTitle}` : ''}<div style="margin-top:2px;">${orderTypeLabel}</div>`;

  const decimalPart = getDecimalPart();
  const fmt = (val: number | string | undefined | null) => {
    const n = typeof val === 'string' ? parseFloat(val) : Number(val || 0);
    return (Number.isFinite(n) ? n : 0).toFixed(decimalPart);
  };

  let itemsHtml = "";
  let displaySubTotal = 0; // Sum of rounded display amounts for consistency
  cartDetails.forEach((item) => {
    let name = (item.product?.name || `Item #${item.productId}`).toUpperCase();
    if (item.variantName && item.variantName.toLowerCase().trim() !== 'main') {
      name += ` - ${item.variantName.toUpperCase()}`;
    }
    const qty = item.quantity;
    
    const altArabicName = isBillArabic ? getAlternativeArabicName(item) : "";

    let extrasSum = 0;
    if (item.extras && item.extras.length > 0) {
      item.extras.forEach(ex => extrasSum += (ex.price * (ex.qty || 1)));
    }

    const origUnitPrice = Number(item.price ?? item.product?.price ?? 0);
    // Shape A (calculateOrder): has baseAmount = exclusive base (product only, no extras)
    // Shape B (API direct):     no baseAmount, item.price is already the exclusive price
    const itemBaseAmount: number | undefined = (item as any).baseAmount;
    const itemLineTotal: number | undefined = (item as any).lineTotal;

    // ── RATE: always the exclusive (pre-VAT) unit price ────────────────────────
    // Shape A: baseAmount = qty × exclusiveUnitPrice → divide to get exclusive unit price
    //          This correctly handles inclusive items (calculateOrder already reverses VAT into baseAmount)
    // Shape B: item.price is already exclusive from API → use directly
    const exclusiveUnitPrice =
      itemBaseAmount !== undefined && qty > 0
        ? Math.max(0, itemBaseAmount / qty)
        : origUnitPrice;

    // ── AMT: always the VAT-inclusive line total ────────────────────────────────
    // lineTotal from calculateOrder = inclusive total for the whole line (product + extras).
    // lineTotal from API direct = inclusive netAmount per line.
    // Deduct extras since they are printed as separate rows below.
    // IMPORTANT: No VAT stripping — lineTotal is already the correct inclusive total.
    const lineInclusiveAmt =
      itemLineTotal !== undefined && itemLineTotal > 0
        ? Math.max(0, itemLineTotal - extrasSum)
        : origUnitPrice * qty;

    // displaySubTotal accumulates exclusive amounts as a fallback for the Sub Total row
    // (only used when data.subTotal is not provided by the caller)
    const exclusiveBase =
      itemBaseAmount !== undefined
        ? Math.max(0, itemBaseAmount)
        : origUnitPrice * qty;
    displaySubTotal += parseFloat(fmt(exclusiveBase));

    let totalItemDisc = Number((item as any).itemDiscount ?? (item as any).discAmount ?? 0);
    const rate = fmt(exclusiveUnitPrice);
    const amt = fmt(lineInclusiveAmt);

    itemsHtml += `
      <tr>
        <td style="width: 14%; text-align: left; vertical-align: top; padding: 0.5px 0;">${qty}</td>
        <td style="width: 44%; text-align: left; vertical-align: top; padding: 0.5px 0;">
          <div>${name}</div>
          ${altArabicName ? `<div dir="rtl" lang="ar" class="arabic-text" style="font-size:11px; font-weight:bold; line-height:1.25; margin-top:1px; color:#000000; text-align:left; white-space:normal;">${altArabicName}</div>` : ''}
          ${totalItemDisc > 0 ? `<div style="font-size:10px; color:#555; font-style:italic;">(Disc: -${fmt(totalItemDisc)})</div>` : ''}
        </td>
        <td style="width: 18%; text-align: right; vertical-align: top; padding: 0.5px 0;">${rate}</td>
        <td style="width: 24%; text-align: right; vertical-align: top; padding: 0.5px 0;">${amt}</td>
      </tr>
    `;

    if (item.extras && item.extras.length > 0) {
      item.extras.forEach((ex: any) => {
        const exName = (ex.name || "EXTRA").toUpperCase();
        const exArabic = isBillArabic ? (ex.arabicName || ex.arabic || "") : "";
        const exDisplay = exArabic
          ? `+ ${exName} <span dir="rtl" lang="ar" class="arabic-text" style="font-size:10px; font-weight:normal; margin-left:4px; color:#000000; white-space:nowrap;">(${exArabic})</span>`
          : `+ ${exName}`;
        const exRate = fmt(ex.price);
        const exAmt = fmt(ex.price * (ex.qty || 1));
        displaySubTotal += parseFloat(exAmt);
        itemsHtml += `
          <tr>
            <td style="width: 14%; text-align: left; vertical-align: top; padding: 0.5px 0;">${ex.qty || 1}</td>
            <td style="width: 44%; text-align: left; vertical-align: top; padding: 0.5px 0;">${exDisplay}</td>
            <td style="width: 18%; text-align: right; vertical-align: top; padding: 0.5px 0;">${exRate}</td>
            <td style="width: 24%; text-align: right; vertical-align: top; padding: 0.5px 0;">${exAmt}</td>
          </tr>
        `;
      });
    }

    if (item.modifiers && item.modifiers.length > 0) {
      item.modifiers.forEach((mod: any) => {
        const modName = (mod.name || "MODIFIER").toUpperCase();
        const modArabic = isBillArabic ? (mod.arabicName || mod.arabic || "") : "";
        const modDisplay = modArabic
          ? `* ${modName} <span dir="rtl" lang="ar" class="arabic-text" style="font-size:10px; font-style:normal; margin-left:4px;">(${modArabic})</span>`
          : `* ${modName}`;
        itemsHtml += `
          <tr>
            <td style="text-align: left; vertical-align: top;"></td>
            <td style="text-align: left; vertical-align: top; font-style: italic;">${modDisplay}</td>
            <td style="text-align: right; vertical-align: top;"></td>
            <td style="text-align: right; vertical-align: top;"></td>
          </tr>
        `;
      });
    }

    if (item.messages && item.messages.length > 0) {
      item.messages.forEach((msg: any) => {
        const rawName = msg.name || "NOTE";
        const isMsgArabic = containsArabic(rawName);
        const msgDisplay = isMsgArabic
          ? `MSG: <span dir="rtl" lang="ar" class="arabic-text">${rawName}</span>`
          : `MSG: ${rawName.toUpperCase()}`;
        itemsHtml += `
          <tr>
            <td style="text-align: left; vertical-align: top;"></td>
            <td style="text-align: left; vertical-align: top; font-style: italic;">${msgDisplay}</td>
            <td style="text-align: right; vertical-align: top;"></td>
            <td style="text-align: right; vertical-align: top;"></td>
          </tr>
        `;
      });
    }
  });

  // Calculate VAT Amount from item cartDetails sum (exact same logic as KOT template)
  const cartVatSum = cartDetails.reduce((sum, item: any) => sum + (item.vatAmount || 0), 0);
  const rawVat = (data.vatAmount && data.vatAmount > 0) ? data.vatAmount : (cartVatSum > 0 ? cartVatSum : 0);

  displaySubTotal = parseFloat(fmt(displaySubTotal));
  
  // Show VAT if explicitly enabled OR if vatAmount / cartVatSum / netAmount difference indicates VAT presence
  const isVatActive = data.enableVat === true || rawVat > 0 || cartVatSum > 0 || (data.vatAmount && data.vatAmount > 0) || (data.netAmount > 0 && Math.abs(data.netAmount - (displaySubTotal + (data.serviceCharge || 0) + (data.levy || 0) + (data.deliveryCharge || 0))) > 0.001);

  const cartTotalDiscounts = cartDetails.reduce((sum, item: any) => {
    return sum + Number(item.itemDiscount ?? item.discAmount ?? 0);
  }, 0);
  const totalDiscount = (data.discount && data.discount > 0) ? data.discount : cartTotalDiscounts;

  const hasAuthoritativeTotals = data.subTotal !== undefined && Number(data.subTotal) > 0;
  const authoritativeSubTotal = hasAuthoritativeTotals ? Number(data.subTotal) : displaySubTotal;
  const authoritativeVatAmount = (data.vatAmount !== undefined && Number(data.vatAmount) > 0) ? Number(data.vatAmount) : (rawVat > 0 ? rawVat : 0);

  if (isVatActive) {
    data.enableVat = true;
    data.vatAmount = parseFloat(fmt(authoritativeVatAmount > 0 ? authoritativeVatAmount : (data.netAmount - displaySubTotal)));
    data.subTotal = parseFloat(fmt(hasAuthoritativeTotals ? authoritativeSubTotal : (data.netAmount - data.vatAmount - (data.serviceCharge || 0) - (data.levy || 0) - (data.deliveryCharge || 0))));
  } else {
    data.subTotal = parseFloat(fmt(authoritativeSubTotal));
    data.vatAmount = 0;
  }

  return `
    <html>
      <head>
        <meta charset="UTF-8" />
        <style>
          body {
            font-family: 'Cairo', 'Noto Sans Arabic', 'Noto Naskh Arabic', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            font-size: 13px;
            font-weight: 600;
            color: #000000;
            margin: 0 auto;
            padding: 0 0 35px 0;
            width: 100%;
            max-width: 576px;
            background-color: #ffffff;
            -webkit-font-smoothing: antialiased;
            text-rendering: geometricPrecision;
            box-sizing: border-box;
          }
          .arabic-text {
            direction: rtl;
            font-family: 'Cairo', 'Noto Sans Arabic', 'Noto Naskh Arabic', 'Segoe UI', Tahoma, Arial, 'Traditional Arabic', sans-serif;
            font-weight: normal;
            color: #000000;
            unicode-bidi: isolate;
            text-rendering: optimizeLegibility;
            font-feature-settings: 'liga' 1, 'calt' 1, 'kern' 1;
            -webkit-font-feature-settings: 'liga' 1, 'calt' 1, 'kern' 1;
            word-wrap: break-word;
            overflow-wrap: break-word;
            line-height: 1.5;
            padding: 1px 0;
          }
          .text-center { text-align: center; }
          .font-bold { font-weight: bold; }
          .header-title { font-size: 16px; margin-bottom: 12px; letter-spacing: 0.5px; font-weight: 800; color: #000000; }
          
          table { width: 100%; border-collapse: collapse; font-size: 13px; table-layout: fixed; }
          
          .dashed-hr { border: none; border-top: 1px dashed #000000; margin: 5px 0; }
          .solid-hr { border: none; border-top: 1px solid #000000; margin: 4px 0; }
          
          table.items-table {
            font-weight: 600;
            line-height: 1.15;
            color: #000000;
          }
          table.items-table th {
            font-weight: 700;
            color: #000000;
            text-transform: capitalize;
            padding-bottom: 5px;
            line-height: 1.3;
            text-align: left;
          }
          table.items-table th.col-rate,
          table.items-table th.col-amt {
            text-align: right;
          }
          table.items-table td {
            font-family: 'Cairo', 'Noto Sans Arabic', 'Segoe UI', Tahoma, Arial, sans-serif;
            font-size: 8.5pt;
            font-weight: normal;
            color: #000000;
            padding: 1px 0;
            line-height: 1.2;
          }
          table.items-table div {
            font-family: 'Cairo', 'Noto Sans Arabic', 'Segoe UI', Tahoma, Arial, sans-serif;
            font-size: 8.5pt;
            font-weight: normal;
            color: #000000;
            margin: 0;
            padding: 0;
            line-height: 1.15;
          }

          .meta-row { display: flex; justify-content: space-between; margin-bottom: 2px; font-weight: 600; color: #000000; }
          
          .totals-table {
            width: 100%;
            table-layout: fixed;
            margin-top: 4px;
            font-size: 13px;
            font-weight: 600;
            color: #000000;
          }
          .totals-table td {
            padding: 1.5px 0;
            font-weight: 600;
            color: #000000;
            vertical-align: middle;
          }
          .totals-label {
            width: 72%;
            text-align: left;
            font-weight: 600;
            color: #000000;
            white-space: nowrap;
          }
          .totals-value {
            width: 28%;
            text-align: right;
            font-weight: 700;
            color: #000000;
            white-space: nowrap;
          }
          
          .grand-total {
            font-family: 'Cairo', 'Noto Sans Arabic', 'Segoe UI', Tahoma, Arial, sans-serif;
            font-size: 12pt !important;
            font-weight: bold !important;
            color: #000000;
            white-space: nowrap;
          }

          .vat-table { margin-top: 6px; font-weight: 600; font-size: 12px; color: #000000; table-layout: fixed; }
          .vat-table th { text-align: left; padding-bottom: 5px; font-weight: 700; color: #000000; }
          .vat-table td { padding: 3px 0; font-weight: 600; color: #000000; }
          
          .barcode-container { text-align: center; margin-top: 15px; margin-bottom: 5px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; font-size: 32px; font-weight: bold; letter-spacing: 2px; color: #000000; }
        </style>
      </head>
      <body>
          ${allowCompanyHeader ? (customHeadersHtml ? `
            <div style="margin-bottom: 10px; padding: 0 4px; width: 100%; box-sizing: border-box;">
              ${customHeadersHtml}
            </div>
          ` : `
          <div class="text-center font-bold" style="font-size: 16px;">GOLD RESTAURANT</div>
          <div class="text-center" style="margin-bottom: 10px;">
            <div>Tea World</div>
            <div>Building:65,Road:2003,Block:320</div>
            <div>HOORA</div>
            <div>CR NO:48622-16</div>
            ${isVatActive ? '<div>VAT NO:220003229000002</div>' : ''}
            <div>Tel:17311999,Tel:17311999</div>
          </div>
          `) : ''}
  
          <div class="text-center header-title">${headerTitle}</div>
        
        <div class="dashed-hr" style="border-top: 1px solid #000;"></div>

        ${data.invoiceNo ? `
        <div class="meta-row">
          <div style="width: 50%;">Invoice No &nbsp; <span style="font-size: 16px; font-weight: bold;">${data.invoiceNo.startsWith('#') ? data.invoiceNo : (isNaN(Number(data.invoiceNo)) ? data.invoiceNo : '#' + data.invoiceNo)}</span></div>
          <div style="width: 50%;">Order No &nbsp; <span style="font-size: 16px; font-weight: bold;">${formatOrderNo(data.orderNo)}</span></div>
        </div>
        <div class="meta-row">
          <div style="width: 50%;">Ticket No &nbsp; <span style="font-size: 16px; font-weight: bold;">#${data.ticketNo}</span></div>
          <div style="width: 50%;">Date &nbsp; <span style="font-weight: normal">${dateStr}</span></div>
        </div>
        <div class="meta-row">
          <div style="width: 50%;">Time &nbsp; <span style="font-weight: normal">${timeStr}</span></div>
          <div style="width: 50%;">Employee &nbsp; <span style="font-weight: normal">${data.waiter}</span></div>
        </div>
        <div class="meta-row">
          <div style="width: 50%;">Counter &nbsp; <span style="font-weight: normal">${data.counter}</span></div>
          ${isDineIn ? `<div style="width: 50%;">Section &nbsp; <span style="font-weight: normal">${data.section}</span></div>` : '<div style="width: 50%;"></div>'}
        </div>
        ${isDineIn ? `
        <div class="meta-row">
          <div style="width: 50%;">Table &nbsp; <span style="font-weight: normal">${data.table}</span></div>
          <div style="width: 50%;"></div>
        </div>
        ` : ''}
        ` : `
        <div class="meta-row">
          <div style="width: 50%;">Order No &nbsp; <span style="font-size: 16px; font-weight: bold;">${formatOrderNo(data.orderNo)}</span></div>
          <div style="width: 50%;">Ticket No &nbsp; <span style="font-size: 16px; font-weight: bold;">#${data.ticketNo}</span></div>
        </div>
        <div class="meta-row">
          <div style="width: 50%;">Date &nbsp; <span style="font-weight: normal">${dateStr}</span></div>
          <div style="width: 50%;">Time &nbsp; <span style="font-weight: normal">${timeStr}</span></div>
        </div>
        <div class="meta-row">
          <div style="width: 50%;">Employee &nbsp; <span style="font-weight: normal">${data.waiter}</span></div>
          <div style="width: 50%;">Counter &nbsp; <span style="font-weight: normal">${data.counter}</span></div>
        </div>
        ${isDineIn ? `
        <div class="meta-row">
          <div style="width: 50%;">Section &nbsp; <span style="font-weight: normal">${data.section}</span></div>
          <div style="width: 50%;">Table &nbsp; <span style="font-weight: normal">${data.table}</span></div>
        </div>
        ` : ''}
        `}
        
        <div class="dashed-hr"></div>
        
        <table class="items-table">
          <thead>
            <tr>
              <th style="width: 14%; text-align: left;">Qty${isBillArabic ? '<br/><span class="arabic-text" style="font-size:10px; font-weight:normal; display:block; text-align:left; white-space:nowrap;">الكمية</span>' : ''}</th>
              <th style="width: 44%; text-align: left;">Description${isBillArabic ? '<br/><span class="arabic-text" style="font-size:10px; font-weight:normal; display:block; text-align:left; white-space:nowrap;">الوصف</span>' : ''}</th>
              <th class="col-rate" style="width: 18%; text-align: right;">Rate${isBillArabic ? '<br/><span class="arabic-text" style="font-size:10px; font-weight:normal; display:block; text-align:right; white-space:nowrap;">السعر</span>' : ''}</th>
              <th class="col-amt" style="width: 24%; text-align: right;">Amt${isBillArabic ? '<br/><span class="arabic-text" style="font-size:10px; font-weight:normal; display:block; text-align:right; white-space:nowrap;">المبلغ</span>' : ''}</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>
        
        <div class="dashed-hr"></div>

        <table class="totals-table">
          <tr>
            <td class="totals-label">Sub Total${isBillArabic ? ' <bdi class="arabic-text" style="font-size:10.5px; font-weight:normal; white-space:nowrap;">(المجموع الفرعي)</bdi>' : ''}</td>
            <td class="totals-value">${fmt(data.subTotal + (totalDiscount > 0 ? totalDiscount : 0))}</td>
          </tr>
          ${totalDiscount > 0 ? `
          <tr>
            <td class="totals-label">Discount${isBillArabic ? ' <bdi class="arabic-text" style="font-size:10.5px; font-weight:normal; white-space:nowrap;">(الخصم)</bdi>' : ''}</td>
            <td class="totals-value">-${fmt(totalDiscount)}</td>
          </tr>
          ` : ''}
          ${data.serviceCharge > 0 ? `
          <tr>
            <td class="totals-label">Service Charge${isBillArabic ? ' <bdi class="arabic-text" style="font-size:10.5px; font-weight:normal; white-space:nowrap;">(رسوم الخدمة)</bdi>' : ''}</td>
            <td class="totals-value">${fmt(data.serviceCharge)}</td>
          </tr>
          ` : ''}
          ${data.levy > 0 ? `
          <tr>
            <td class="totals-label">Levy(5%)${isBillArabic ? ' <bdi class="arabic-text" style="font-size:10.5px; font-weight:normal; white-space:nowrap;">(الضريبة الانتقائية 5%)</bdi>' : ''}</td>
            <td class="totals-value">${fmt(data.levy)}</td>
          </tr>
          ` : ''}
          ${(isDelivery || (data.deliveryCharge && data.deliveryCharge > 0)) ? `
          <tr>
            <td class="totals-label">Delivery Charge${isBillArabic ? ' <bdi class="arabic-text" style="font-size:10.5px; font-weight:normal; white-space:nowrap;">(رسوم التوصيل)</bdi>' : ''}</td>
            <td class="totals-value">${fmt(data.deliveryCharge || 0)}</td>
          </tr>
          ` : ''}
          ${isVatActive ? `
          <tr>
            <td class="totals-label">VAT Amount${isBillArabic ? ' <bdi class="arabic-text" style="font-size:10.5px; font-weight:normal; white-space:nowrap;">(ضريبة القيمة المضافة)</bdi>' : ''}</td>
            <td class="totals-value">${fmt(data.vatAmount)}</td>
          </tr>
          ` : ''}
          <tr>
            <td class="totals-label grand-total" style="white-space: nowrap; text-align: left;">Grand Total${isBillArabic ? ' <bdi class="arabic-text" style="font-size:11.5px; font-weight:bold; white-space:nowrap;">(المجموع الكلي)</bdi>' : ''}</td>
            <td class="totals-value grand-total" style="white-space: nowrap; text-align: right;">${fmt(data.netAmount)}</td>
          </tr>
          ${data.payments && data.payments.length > 0 ? `
          <tr><td colspan="2"><div class="dashed-hr" style="margin: 5px 0;"></div></td></tr>
          ${data.payments.map(p => {
            const arPay = isBillArabic && getPaymodeArabic(p.name) ? ` <bdi class="arabic-text" style="font-size:10.5px; font-weight:normal; white-space:nowrap;">(${getPaymodeArabic(p.name)})</bdi>` : '';
            return `
          <tr>
            <td class="totals-label">${p.name}${arPay}</td>
            <td class="totals-value">${fmt(p.amount)}</td>
          </tr>
          `;
          }).join('')}
          ` : ''}
          ${data.changeAmount !== undefined && data.changeAmount > 0 ? `
          <tr>
            <td class="totals-label">Change${isBillArabic ? ' <bdi class="arabic-text" style="font-size:10.5px; font-weight:normal; white-space:nowrap;">(المبلغ المتبقي)</bdi>' : ''}</td>
            <td class="totals-value">${fmt(data.changeAmount)}</td>
          </tr>
          ` : ''}
        </table>

        ${isVatActive ? `
        <div class="dashed-hr"></div>
        <table class="vat-table" style="margin-top: 4px; width: 100%;">
          <thead>
            <tr>
              <th style="text-align: left; width: 20%;">VAT Code${isBillArabic ? '<br/><span class="arabic-text" style="font-size:9.5px; font-weight:normal; display:block; text-align:left; white-space:nowrap;">رمز الضريبة</span>' : ''}</th>
              <th style="text-align: right; width: 30%;">Excl Amt${isBillArabic ? '<br/><span class="arabic-text" style="font-size:9.5px; font-weight:normal; display:block; text-align:right; white-space:nowrap;">المبلغ غير شامل</span>' : ''}</th>
              <th style="text-align: right; width: 24%;">VAT Amt${isBillArabic ? '<br/><span class="arabic-text" style="font-size:9.5px; font-weight:normal; display:block; text-align:right; white-space:nowrap;">مبلغ الضريبة</span>' : ''}</th>
              <th style="text-align: right; width: 26%;">Net Amt${isBillArabic ? '<br/><span class="arabic-text" style="font-size:9.5px; font-weight:normal; display:block; text-align:right; white-space:nowrap;">المبلغ الصافي</span>' : ''}</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="text-align: left; font-weight: normal; width: 20%;">10%</td>
              <td style="text-align: right; font-weight: normal; width: 30%;">${fmt(data.netAmount - data.vatAmount)}</td>
              <td style="text-align: right; font-weight: normal; width: 24%;">${fmt(data.vatAmount)}</td>
              <td style="text-align: right; font-weight: normal; width: 26%;">${fmt(data.netAmount)}</td>
            </tr>
          </tbody>
        </table>
        ` : '<div class="dashed-hr"></div>'}
        
        ${(isDriveThru || isDelivery) && (data.vehicleNo || data.customerName || data.contactNo || data.flatNo || data.buildingNo || data.blockNo || data.roadNo || data.area || data.providerNo) ? `
        <div style="margin-top: 10px; font-size: 12px;">
          <div style="font-weight: bold; text-transform: uppercase; margin-bottom: 3px;">
            ${isDelivery ? 'DELIVERY DETAILS' : 'CUSTOMER DETAILS'}
            ${isBillArabic ? `<bdi class="arabic-text" style="font-size: 11px; margin-left: 6px; white-space:nowrap;">(${isDelivery ? 'بيانات التوصيل' : 'بيانات العميل'})</bdi>` : ''}
          </div>
          <div class="solid-hr" style="border-top: 1px solid #000; margin-bottom: 5px;"></div>
          <table style="width: 100%; font-size: 12px; margin-top: 5px;">
            ${data.contactNo ? `<tr><td style="width: 35%; padding-bottom: 2px;">Mob No</td><td style="font-weight: bold;">${data.contactNo}</td></tr>` : ''}
            ${data.customerName ? `<tr><td style="width: 35%; padding-bottom: 2px;">Customer</td><td style="font-weight: bold;">${data.customerName}</td></tr>` : ''}
            ${data.flatNo ? `<tr><td style="width: 35%; padding-bottom: 2px;">Flat No</td><td style="font-weight: bold;">${data.flatNo}</td></tr>` : ''}
            ${data.buildingNo ? `<tr><td style="width: 35%; padding-bottom: 2px;">Building</td><td style="font-weight: bold;">${data.buildingNo}</td></tr>` : ''}
            ${data.blockNo ? `<tr><td style="width: 35%; padding-bottom: 2px;">Block</td><td style="font-weight: bold;">${data.blockNo}</td></tr>` : ''}
            ${data.roadNo ? `<tr><td style="width: 35%; padding-bottom: 2px;">Road</td><td style="font-weight: bold;">${data.roadNo}</td></tr>` : ''}
            ${data.area ? `<tr><td style="width: 35%; padding-bottom: 2px;">Area</td><td style="font-weight: bold;">${data.area}</td></tr>` : ''}
            ${data.vehicleNo ? `<tr><td style="width: 35%; padding-bottom: 2px;">Vehicle No</td><td style="font-weight: bold;">${data.vehicleNo}</td></tr>` : ''}
            ${data.providerNo ? `<tr><td style="width: 35%; padding-bottom: 2px;">Provider No</td><td style="font-weight: bold;">${data.providerNo}</td></tr>` : ''}
          </table>
        </div>
        ` : ''}

        <div class="barcode-container">*${String(data.orderNo || '').split(',')[0].trim()}*</div>
        
        <div style="font-size: 11px; margin-top: 5px;">Print Time : ${dateStr} ${timeStr}</div>

        ${customFootersHtml ? `
        <div style="margin-top: 10px; margin-bottom: 8px; padding: 0 4px; width: 100%; box-sizing: border-box; text-align: center;">
          ${customFootersHtml}
        </div>
        ` : ''}
        <div style="text-align: center; margin-top: 10px; font-size: 13px; font-family: 'Courier New', Courier, monospace; font-weight: bold; line-height: 1.5; padding: 0 4px 20px 4px; box-sizing: border-box;">
          <div>Thank you For Visiting</div>
          ${isBillArabic ? '<div dir="rtl" lang="ar" class="arabic-text" style="font-size: 12.5px; font-weight: bold; text-align: center; display: block; margin-top: 3px; line-height: 1.5; word-break: break-word; overflow-wrap: break-word;">شكراً لزيارتكم</div>' : ''}
          <div style="margin-top: 6px;">HAVE A GOOD DAY</div>
          ${isBillArabic ? '<div dir="rtl" lang="ar" class="arabic-text" style="font-size: 12.5px; font-weight: bold; text-align: center; display: block; margin-top: 3px; line-height: 1.5; word-break: break-word; overflow-wrap: break-word;">نتمنى لكم يوماً سعيداً</div>' : ''}
        </div>
        <div style="height: 35px; width: 100%; clear: both;"></div>
      </body>
    </html>
  `;
};
