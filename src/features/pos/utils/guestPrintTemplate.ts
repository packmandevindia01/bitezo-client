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
    ? '<span class="arabic-text" style="font-size:12px; font-weight:bold;">فاتورة ضريبية مبسطة</span>'
    : '<span class="arabic-text" style="font-size:12px; font-weight:bold;">فاتورة مبسطة</span>';

  const headerTitle = data.enableVat 
    ? `SIMPLIFIED TAX INVOICE${isBillArabic ? `<br/>${arabicInvoiceTitle}` : ''}<br/>${orderTypeLabel}` 
    : `SIMPLIFIED INVOICE${isBillArabic ? `<br/>${arabicInvoiceTitle}` : ''}<br/>${orderTypeLabel}`;

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
        <td style="width: 10%; text-align: left; vertical-align: top; padding: 0.5px 0;">${qty}</td>
        <td style="width: 45%; text-align: left; vertical-align: top; padding: 0.5px 0;">
          <div>${name}</div>
          ${altArabicName ? `<div dir="rtl" lang="ar" class="arabic-text" style="font-size:12px; font-weight:normal; line-height:1.25; margin-top:1px;">${altArabicName}</div>` : ''}
          ${totalItemDisc > 0 ? `<div style="font-size:10px; color:#555; font-style:italic;">(Disc: -${fmt(totalItemDisc)})</div>` : ''}
        </td>
        <td style="width: 20%; text-align: right; vertical-align: top; padding: 0.5px 0;">${rate}</td>
        <td style="width: 25%; text-align: right; vertical-align: top; padding: 0.5px 0;">${amt}</td>
      </tr>
    `;

    if (item.extras && item.extras.length > 0) {
      item.extras.forEach((ex: any) => {
        const exName = (ex.name || "EXTRA").toUpperCase();
        const exArabic = isBillArabic ? (ex.arabicName || ex.arabic || "") : "";
        const exDisplay = exArabic
          ? `+ ${exName} <span dir="rtl" lang="ar" class="arabic-text" style="font-size:10px; margin-left:4px;">(${exArabic})</span>`
          : `+ ${exName}`;
        const exRate = fmt(ex.price);
        const exAmt = fmt(ex.price * (ex.qty || 1));
        displaySubTotal += parseFloat(exAmt);
        itemsHtml += `
          <tr>
            <td style="text-align: left; vertical-align: top; padding: 0.5px 0;">${ex.qty || 1}</td>
            <td style="text-align: left; vertical-align: top; padding: 0.5px 0;">${exDisplay}</td>
            <td style="text-align: right; vertical-align: top; padding: 0.5px 0;">${exRate}</td>
            <td style="text-align: right; vertical-align: top; padding: 0.5px 0;">${exAmt}</td>
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
          @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap');
          body {
            font-family: 'Cairo', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            font-size: 14px;
            color: #000;
            margin: 0 auto;
            padding: 0;
            width: 100%;
            max-width: 576px;
            background-color: #ffffff;
            -webkit-font-smoothing: antialiased;
            text-rendering: geometricPrecision;
          }
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
          .text-center { text-align: center; }
          .font-bold { font-weight: bold; }
          .header-title { font-size: 16px; margin-bottom: 12px; letter-spacing: 0.5px; font-weight: normal; }
          
          table { width: 100%; border-collapse: collapse; font-size: 13px; }
          
          .dashed-hr { border: none; border-top: 1px dashed #000; margin: 5px 0; }
          .solid-hr { border: none; border-top: 1px solid #000; margin: 4px 0; }
          
          table.items-table {
            font-weight: normal;
            line-height: 1.15;
          }
          table.items-table th {
            text-align: left;
            font-weight: normal;
            text-transform: capitalize;
            padding-bottom: 3px;
            line-height: 1.15;
          }
          table.items-table td {
            font-weight: normal;
            padding: 0.5px 0;
            line-height: 1.15;
          }
          table.items-table div {
            font-weight: normal !important;
            margin: 0;
            padding: 0;
            line-height: 1.15;
          }

          .meta-row { display: flex; justify-content: space-between; margin-bottom: 2px; font-weight: bold;}
          
          .totals-table { margin-top: 4px; font-size: 13px; font-weight: normal; }
          .totals-table td { padding: 1.5px 0; font-weight: normal; }
          .totals-label { text-align: left; font-weight: normal; }
          .totals-value { text-align: right; font-weight: normal; }
          
          .grand-total { font-size: 18px; font-weight: bold !important; }

          .vat-table { margin-top: 6px; font-weight: normal; font-size: 12px; }
          .vat-table th { text-align: left; padding-bottom: 5px; font-weight: normal; }
          .vat-table td { padding: 3px 0; font-weight: normal; }
          
          .barcode-container { text-align: center; margin-top: 15px; margin-bottom: 5px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; font-size: 32px; font-weight: bold; letter-spacing: 2px; }
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
              <th style="width: 10%;">Qty${isBillArabic ? '<br/><span class="arabic-text" style="font-size:10px; font-weight:normal;">الكمية</span>' : ''}</th>
              <th style="width: 45%;">Description${isBillArabic ? '<br/><span class="arabic-text" style="font-size:10px; font-weight:normal;">الوصف</span>' : ''}</th>
              <th style="width: 20%; text-align: right;">Rate${isBillArabic ? '<br/><span class="arabic-text" style="font-size:10px; font-weight:normal;">السعر</span>' : ''}</th>
              <th style="width: 25%; text-align: right;">Amt${isBillArabic ? '<br/><span class="arabic-text" style="font-size:10px; font-weight:normal;">المبلغ</span>' : ''}</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>
        
        <div class="dashed-hr"></div>

        <table class="totals-table">
          <tr>
            <td class="totals-label">Sub Total${isBillArabic ? ' <span class="arabic-text" style="font-size:11px; font-weight:normal;">(المجموع الفرعي)</span>' : ''}</td>
            <td class="totals-value">${fmt(data.subTotal + (totalDiscount > 0 ? totalDiscount : 0))}</td>
          </tr>
          ${totalDiscount > 0 ? `
          <tr>
            <td class="totals-label">Discount${isBillArabic ? ' <span class="arabic-text" style="font-size:11px; font-weight:normal;">(الخصم)</span>' : ''}</td>
            <td class="totals-value">-${fmt(totalDiscount)}</td>
          </tr>
          ` : ''}
          ${data.serviceCharge > 0 ? `
          <tr>
            <td class="totals-label">Service Charge${isBillArabic ? ' <span class="arabic-text" style="font-size:11px; font-weight:normal;">(رسوم الخدمة)</span>' : ''}</td>
            <td class="totals-value">${fmt(data.serviceCharge)}</td>
          </tr>
          ` : ''}
          ${data.levy > 0 ? `
          <tr>
            <td class="totals-label">Levy(5%)${isBillArabic ? ' <span class="arabic-text" style="font-size:11px; font-weight:normal;">(الضريبة الانتقائية 5%)</span>' : ''}</td>
            <td class="totals-value">${fmt(data.levy)}</td>
          </tr>
          ` : ''}
          ${(isDelivery || (data.deliveryCharge && data.deliveryCharge > 0)) ? `
          <tr>
            <td class="totals-label">Delivery Charge${isBillArabic ? ' <span class="arabic-text" style="font-size:11px; font-weight:normal;">(رسوم التوصيل)</span>' : ''}</td>
            <td class="totals-value">${fmt(data.deliveryCharge || 0)}</td>
          </tr>
          ` : ''}
          ${isVatActive ? `
          <tr>
            <td class="totals-label">VAT Amount${isBillArabic ? ' <span class="arabic-text" style="font-size:11px; font-weight:normal;">(ضريبة القيمة المضافة)</span>' : ''}</td>
            <td class="totals-value">${fmt(data.vatAmount)}</td>
          </tr>
          ` : ''}
          <tr>
            <td class="totals-label grand-total">Grand Total${isBillArabic ? ' <span class="arabic-text" style="font-size:12px; font-weight:bold;">(المجموع الكلي)</span>' : ''}</td>
            <td class="totals-value grand-total">${fmt(data.netAmount)}</td>
          </tr>
          ${data.payments && data.payments.length > 0 ? `
          <tr><td colspan="2"><div class="dashed-hr" style="margin: 5px 0;"></div></td></tr>
          ${data.payments.map(p => {
            const arPay = isBillArabic && getPaymodeArabic(p.name) ? ` <span class="arabic-text" style="font-size:11px; font-weight:normal;">(${getPaymodeArabic(p.name)})</span>` : '';
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
            <td class="totals-label">Change${isBillArabic ? ' <span class="arabic-text" style="font-size:11px; font-weight:normal;">(المبلغ المتبقي)</span>' : ''}</td>
            <td class="totals-value">${fmt(data.changeAmount)}</td>
          </tr>
          ` : ''}
        </table>

        ${isVatActive ? `
        <div class="dashed-hr"></div>
        <table class="vat-table" style="margin-top: 4px; width: 100%;">
          <thead>
            <tr>
              <th style="text-align: left; width: 25%;">VAT Code${isBillArabic ? '<br/><span class="arabic-text" style="font-size:10px; font-weight:normal;">رمز الضريبة</span>' : ''}</th>
              <th style="text-align: right; width: 25%;">Excl Amt${isBillArabic ? '<br/><span class="arabic-text" style="font-size:10px; font-weight:normal;">المبلغ غير شامل</span>' : ''}</th>
              <th style="text-align: right; width: 25%;">VAT Amt${isBillArabic ? '<br/><span class="arabic-text" style="font-size:10px; font-weight:normal;">مبلغ الضريبة</span>' : ''}</th>
              <th style="text-align: right; width: 25%;">Net Amt${isBillArabic ? '<br/><span class="arabic-text" style="font-size:10px; font-weight:normal;">المبلغ الصافي</span>' : ''}</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="text-align: left; font-weight: normal;">10%</td>
              <td style="text-align: right; font-weight: normal;">${fmt(data.netAmount - data.vatAmount)}</td>
              <td style="text-align: right; font-weight: normal;">${fmt(data.vatAmount)}</td>
              <td style="text-align: right; font-weight: normal;">${fmt(data.netAmount)}</td>
            </tr>
          </tbody>
        </table>
        ` : '<div class="dashed-hr"></div>'}
        
        ${(isDriveThru || isDelivery) && (data.vehicleNo || data.customerName || data.contactNo || data.flatNo || data.buildingNo || data.blockNo || data.roadNo || data.area || data.providerNo) ? `
        <div style="margin-top: 10px; font-size: 12px;">
          <div style="font-weight: bold; text-transform: uppercase; margin-bottom: 3px;">
            ${isDelivery ? 'DELIVERY DETAILS' : 'CUSTOMER DETAILS'}
            ${isBillArabic ? `<span class="arabic-text" style="font-size: 11px; margin-left: 6px;">(${isDelivery ? 'بيانات التوصيل' : 'بيانات العميل'})</span>` : ''}
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
        <div style="margin-top: 10px; padding: 0 4px; width: 100%; box-sizing: border-box;">
          ${customFootersHtml}
        </div>
        ` : `
        <div style="text-align: center; margin-top: 12px; font-size: 13px; font-family: 'Courier New', Courier, monospace; font-weight: bold; line-height: 1.4;">
          <div>Thank you For Visiting</div>
          ${isBillArabic ? '<div class="arabic-text" style="font-size: 13px; font-weight: bold;">شكراً لزيارتكم</div>' : ''}
          <div>HAVE A GOOD DAY</div>
          ${isBillArabic ? '<div class="arabic-text" style="font-size: 13px; font-weight: bold;">نتمنى لكم يوماً سعيداً</div>' : ''}
        </div>
        `}
      </body>
    </html>
  `;
};
