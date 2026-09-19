/**
 * ESC/POS Markup Generator for dantsu/ESCPOS-ThermalPrinter-Android
 *
 * Generates dantsu-formatted text markup for 80mm thermal printers.
 * Paper: 80mm | 48 chars per line | Font A
 *
 * Dantsu markup quick reference:
 *   [L]text          → left aligned
 *   [C]text          → center aligned
 *   [R]text          → right aligned
 *   [L]<b>text</b>   → bold
 *   [L]<font size='big'>text</font>       → double height
 *   [L]<font size='wide'>text</font>      → double width
 *   [L]<font size='big-wide'>text</font>  → double height + width
 *   \n               → line feed
 */

import type { PosCartItem } from "../types";
import type { GuestPrintData } from "./guestPrintTemplate";
import type { KotPrintData } from "./kotTemplate";
import type { EndReportData } from "../cashier/services/cashierLogService";
import { getDayEndReportConfig } from "../services/posConfigApi";
import { isKotArabicEnabled, isBillArabicEnabled, getAlternativeArabicName } from "./alternativeHelpers";

// ── Constants ─────────────────────────────────────────────────────────────────
const LINE_WIDTH = 48; // chars per line on 80mm paper
const SEPARATOR  = "-".repeat(LINE_WIDTH);
const DASH_SEP   = "-".repeat(LINE_WIDTH);

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Left-pad a string to width */
const padLeft = (s: string, width: number): string =>
  String(s).padStart(width);

/** Right-pad a string to width */
const padRight = (s: string, width: number): string =>
  String(s).padEnd(width);

/** Truncate string to max length, appending '…' if cut */
const trunc = (s: string, max: number): string =>
  s.length > max ? s.substring(0, max - 1) + "~" : s;

/**
 * Format a two-column line: left text + right text flush to LINE_WIDTH.
 * If left + right > LINE_WIDTH, left text is truncated.
 * If widthOrBold is true, the entire two-column line is wrapped in <b> tags for bold thermal printing.
 */
const twoCol = (left: string, right: string, widthOrBold?: number | boolean): string => {
  const width = typeof widthOrBold === 'number' ? widthOrBold : LINE_WIDTH;
  const isBold = typeof widthOrBold === 'boolean' ? widthOrBold : false;
  const r = String(right);
  const maxLeft = Math.max(1, width - r.length - 1);
  const l = trunc(String(left), maxLeft).padEnd(maxLeft);
  return isBold ? `[L]<b>${l} ${r}</b>` : `[L]${l} ${r}`;
};

/**
 * Format an item line: name | qty | amount
 * Width breakdown (48 chars):
 *   name   = 30 chars (left, truncated)
 *   qty    =  5 chars (e.g. " x 2 ")
 *   amount = 10 chars (right-aligned)
 *   gap    =  3 chars
 */
const itemLine = (name: string, qty: number, amount: string): string => {
  const amtStr  = padLeft(amount, 10);
  const qtyStr  = padLeft(`x${qty}`, 4);
  const maxName = LINE_WIDTH - amtStr.length - qtyStr.length - 2;
  const nameStr = padRight(trunc(name.toUpperCase(), maxName), maxName);
  return `[L]${nameStr} ${qtyStr} ${amtStr}`;
};

/** Format a totals row: label on left, value right-aligned */
const totalsLine = (label: string, value: string, bold = false): string => {
  const v = padLeft(value, 12);
  const maxL = LINE_WIDTH - v.length;
  const l = padRight(trunc(label, maxL), maxL);
  return bold ? `[L]<b>${l}${v}</b>` : `[L]${l}${v}`;
};

/** Get active branch custom line items from localStorage / session */
export const getActiveBranchLines = (): any[] => {
  try {
    const cachedPrintData = localStorage.getItem("branchPrintData");
    if (cachedPrintData) {
      const parsed = JSON.parse(cachedPrintData);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      if (Array.isArray(parsed?.data) && parsed.data.length > 0) return parsed.data;
    }

    const sessionStr = localStorage.getItem("posSession") || localStorage.getItem("activeBranch");
    if (sessionStr) {
      const parsed = JSON.parse(sessionStr);
      if (parsed.lines && Array.isArray(parsed.lines)) return parsed.lines;
      if (parsed.activeBranch?.lines && Array.isArray(parsed.activeBranch.lines)) return parsed.activeBranch.lines;
    }
  } catch (e) {
    // Ignore JSON parse errors
  }
  return [];
};

/** Convert dynamic line items to ESC/POS markup tags */
export const buildEscPosLines = (lines: any[], section: "header" | "footer" | "dayEndHeader"): string => {
  const target = section.toLowerCase();
  const sectionLines = lines.filter(l => {
    if (!l.value || String(l.value).trim() === "") return false;
    const sec = String(l.section || "").toLowerCase();
    const code = String(l.code || l.id || "").toUpperCase();
    if (target === "header") {
      return sec === "header" || (code.startsWith("H") && !code.startsWith("EH"));
    }
    if (target === "footer") {
      return sec === "footer" || code.startsWith("F");
    }
    if (target === "dayendheader") {
      return sec === "dayendheader" || sec === "dayend" || code.startsWith("EH");
    }
    return false;
  });

  if (sectionLines.length === 0) return "";

  let markup = "";
  sectionLines.forEach(l => {
    let text = String(l.value).trim();
    const isBold = String(l.fontStyle || "").toLowerCase().includes("bold");
    const isLarge = String(l.fontSize || "").toLowerCase() === "large";

    if (isBold) text = `<b>${text}</b>`;
    if (isLarge) text = `<font size='big'>${text}</font>`;

    const offset = typeof l.offsetX === "number" ? Math.max(0, Math.min(100, Math.round(l.offsetX))) : 0;
    let alignTag = "[L]";

    if (offset === 0) {
      alignTag = "[L]";
    } else if (offset === 50) {
      alignTag = "[C]";
    } else if (offset === 100) {
      alignTag = "[R]";
    } else {
      // Custom percentage-based left indentation margin (1% to 49% or intermediate)
      alignTag = "[L]";
      const maxCols = isLarge ? Math.floor(LINE_WIDTH / 2) : LINE_WIDTH;
      const indentSpaces = Math.max(1, Math.min(maxCols - 4, Math.floor((offset / 100) * maxCols)));
      text = " ".repeat(indentSpaces) + text;
    }

    markup += `${alignTag}${text}\n`;
  });
  return markup;
};

/** Get company name + address from dynamic branch lines or fallback to localStorage */
export const getCompanyHeader = (): string => {
  const activeLines = getActiveBranchLines();
  const dynamicMarkup = buildEscPosLines(activeLines, "header");
  if (dynamicMarkup) return dynamicMarkup;

  const name    = localStorage.getItem("companyName") || "RESTAURANT";
  const address = localStorage.getItem("companyAddress") || "";
  const crNo    = localStorage.getItem("crNo") || "";
  const vatNo   = localStorage.getItem("vatNo") || "";
  const tel     = localStorage.getItem("companyPhone") || "";

  let markup = `[C]<b><font size='big'>${name}</font></b>\n`;
  if (address) markup += `[C]${address}\n`;
  if (crNo)    markup += `[C]CR NO: ${crNo}\n`;
  if (vatNo)   markup += `[C]VAT NO: ${vatNo}\n`;
  if (tel)     markup += `[C]Tel: ${tel}\n`;
  return markup;
};

/** Get dynamic End-of-Day report header (EH1..EH7) or fallback to company header */
export const getEndReportHeader = (): string => {
  const activeLines = getActiveBranchLines();
  const dynamicMarkup = buildEscPosLines(activeLines, "dayEndHeader");
  if (dynamicMarkup) return dynamicMarkup;
  return getCompanyHeader();
};

/** Get dynamic receipt footer lines (F1..F7) */
export const getCompanyFooter = (): string => {
  const activeLines = getActiveBranchLines();
  return buildEscPosLines(activeLines, "footer");
};

const now = () => {
  const d = new Date();
  const date = d.toLocaleDateString("en-GB");
  const time = d.toLocaleTimeString("en-US");
  return { date, time };
};

// ── Bill / Guest Receipt Markup ───────────────────────────────────────────────

export interface BillMarkupInput {
  cartDetails: PosCartItem[];
  data: GuestPrintData;
  customHeaderLines?: string[]; // plain text lines from branch headers
}

export const generateBillMarkup = (input: BillMarkupInput): string => {
  const { cartDetails, data, customHeaderLines } = input;
  const isBillArabic = data.billArabic ?? isBillArabicEnabled();
  const decimalPart = parseInt(localStorage.getItem('decimalPart') || '3', 10);
  const fmt = (val: any) => {
    const n = typeof val === 'string' ? parseFloat(val) : Number(val || 0);
    return (Number.isFinite(n) ? n : 0).toFixed(decimalPart);
  };
  const { date: dateStr, time: timeStr } = now();

  const isTakeOut  = data.orderType?.toLowerCase().includes("take");
  const isDriveThru = data.orderType?.toLowerCase().includes("drive");
  const isDineIn   = data.orderType?.toLowerCase().includes("dine");
  const isDelivery = data.orderType?.toLowerCase().includes("delivery");

  const cartVatSum = cartDetails.reduce((s: number, it: any) => s + (it.vatAmount || 0), 0);
  const rawVat = (data.vatAmount && data.vatAmount > 0) ? data.vatAmount : (cartVatSum > 0 ? cartVatSum : 0);
  
  // Calculate displaySubTotal for logic usage
  let displaySubTotal = 0;
  cartDetails.forEach((item) => {
    let extrasSum = 0;
    if (item.extras && item.extras.length > 0) item.extras.forEach(ex => { extrasSum += ex.price * (ex.qty || 1); });
    let baseAmt = (item as any).lineTotal;
    if (baseAmt !== undefined) baseAmt -= extrasSum;
    else baseAmt = (item.price || item.product?.price || 0) * item.quantity;
    displaySubTotal += parseFloat(fmt(baseAmt));
  });

  const isVatActive = data.enableVat === true || rawVat > 0 || cartVatSum > 0 || (data.vatAmount && data.vatAmount > 0) || (data.netAmount > 0 && Math.abs(data.netAmount - (displaySubTotal + (data.serviceCharge || 0) + (data.levy || 0) + (data.deliveryCharge || 0))) > 0.001);

  let invoiceTitle = isVatActive ? "SIMPLIFIED TAX INVOICE" : "SIMPLIFIED INVOICE";
  const modePrefix = data.isPackager ? "PACKAGER" : (data.isSettlement ? "" : "GUEST");

  let orderLabel = modePrefix;
  if (isTakeOut)   orderLabel = modePrefix ? `${modePrefix} (TAKE OUT)` : "(TAKE OUT)";
  if (isDriveThru) orderLabel = modePrefix ? `${modePrefix} (DRIVE THRU)` : "(DRIVE THRU)";
  if (isDineIn)    orderLabel = modePrefix ? `${modePrefix} (DINE IN)` : "(DINE IN)";
  if (isDelivery)  orderLabel = modePrefix ? `${modePrefix} (DELIVERY)` : "(DELIVERY)";

  let markup = "";

  // ── Header ──────────────────────────────────────────────────────────────────
  const allowCompanyHeader = data.showCompanyHeader !== false;
  if (allowCompanyHeader) {
    if (customHeaderLines && customHeaderLines.length > 0) {
      customHeaderLines.forEach(line => { markup += `[C]${line}\n`; });
    } else {
      markup += getCompanyHeader();
    }
  }

  markup += `[C]${SEPARATOR}\n`;
  markup += `[C]<b>${invoiceTitle}</b>\n`;
  if (orderLabel) markup += `[C]<b>${orderLabel}</b>\n`;
  markup += `[L]${SEPARATOR}\n`;

  // ── Meta rows ───────────────────────────────────────────────────────────────
  markup += twoCol(`Order No #${data.orderNo}`, `Ticket No #${data.ticketNo}`) + "\n";
  markup += twoCol(`Date: ${dateStr}`, `Time: ${timeStr}`) + "\n";
  markup += twoCol(`Employee: ${data.waiter}`, `Counter: ${data.counter}`) + "\n";
  if (isDineIn) {
    markup += twoCol(`Section: ${data.section}`, `Table: ${data.table}`) + "\n";
  }
  markup += `[L]${DASH_SEP}\n`;

  // ── Column headers ───────────────────────────────────────────────────────────
  markup += `[L]<b>${padRight("Description", LINE_WIDTH - 16)}${padLeft("Qty", 5)} ${padLeft("Amount", 10)}</b>\n`;
  markup += `[L]${DASH_SEP}\n`;

  // ── Items ───────────────────────────────────────────────────────────────────
  displaySubTotal = 0; // Reset for loop

  cartDetails.forEach((item) => {
    let name = (item.product?.name || `Item #${item.productId}`).toUpperCase();
    if (item.variantName && item.variantName.toLowerCase().trim() !== "main") {
      name += ` - ${item.variantName.toUpperCase()}`;
    }
    const qty = item.quantity;

    let extrasSum = 0;
    if (item.extras && item.extras.length > 0) {
      item.extras.forEach(ex => { extrasSum += ex.price * (ex.qty || 1); });
    }

    let baseAmt = (item as any).lineTotal;
    const itemVat = (item as any).vatAmount || 0;
    if (baseAmt !== undefined && baseAmt > 0) {
      baseAmt -= extrasSum;
      if (itemVat > 0 && baseAmt > itemVat && Math.abs(baseAmt - ((item.price || item.product?.price || 0) * item.quantity)) > 0.001) {
        baseAmt -= itemVat;
      }
    } else {
      baseAmt = (item.price || item.product?.price || 0) * item.quantity;
    }

    const amt = fmt(baseAmt);
    displaySubTotal += parseFloat(amt);
    markup += itemLine(name, qty, amt) + "\n";

    const altArabicName = isBillArabic ? getAlternativeArabicName(item) : "";
    if (altArabicName) {
      markup += `[L]${altArabicName}\n`;
    }

    const itemDisc = Number((item as any).itemDiscount ?? (item as any).discAmount ?? 0);
    if (itemDisc > 0) {
      markup += `[L]  * DISC: -${fmt(itemDisc)}\n`;
    }

    // Extras
    if (item.extras && item.extras.length > 0) {
      item.extras.forEach(ex => {
        const exName  = `  + ${(ex.name || "EXTRA").toUpperCase()}`;
        const exAmt   = fmt(ex.price * (ex.qty || 1));
        displaySubTotal += parseFloat(exAmt);
        markup += itemLine(exName, ex.qty || 1, exAmt) + "\n";
      });
    }

    // Modifiers (no price, just name note)
    if (item.modifiers && item.modifiers.length > 0) {
      item.modifiers.forEach(mod => {
        markup += `[L]  * ${(mod.name || "MODIFIER").toUpperCase()}\n`;
      });
    }

    // Messages / Notes
    if (item.messages && item.messages.length > 0) {
      item.messages.forEach(msg => {
        markup += `[L]  MSG: ${(msg.name || "").toUpperCase()}\n`;
      });
    }
  });

  markup += `[L]${DASH_SEP}\n`;

  // ── Totals ──────────────────────────────────────────────────────────────────
  const cartTotalDiscounts = cartDetails.reduce((sum, item: any) => {
    return sum + Number(item.itemDiscount ?? item.discAmount ?? 0);
  }, 0);
  const totalDiscount = (data.discount && data.discount > 0) ? data.discount : cartTotalDiscounts;

  displaySubTotal = parseFloat(fmt(displaySubTotal));
  const hasAuthoritativeTotals = data.subTotal !== undefined && Number(data.subTotal) > 0;
  const authoritativeSubTotal = hasAuthoritativeTotals ? Number(data.subTotal) : displaySubTotal;
  const authoritativeVatAmount = (data.vatAmount !== undefined && Number(data.vatAmount) > 0) ? Number(data.vatAmount) : (rawVat > 0 ? rawVat : 0);

  let subTotal = authoritativeSubTotal;
  let vatAmount = 0;
  if (isVatActive) {
    vatAmount  = parseFloat(fmt(authoritativeVatAmount > 0 ? authoritativeVatAmount : (data.netAmount - displaySubTotal - (data.serviceCharge || 0) - (data.levy || 0) - (data.deliveryCharge || 0))));
    subTotal   = parseFloat(fmt(hasAuthoritativeTotals ? authoritativeSubTotal : (data.netAmount - vatAmount - (data.serviceCharge || 0) - (data.levy || 0) - (data.deliveryCharge || 0))));
  }

  const subTotalBeforeDiscount = subTotal + (totalDiscount > 0 ? totalDiscount : 0);
  markup += totalsLine("Sub Total", fmt(subTotalBeforeDiscount)) + "\n";
  if (totalDiscount > 0) {
    markup += totalsLine("Discount", `-${fmt(totalDiscount)}`) + "\n";
  }
  if ((data.serviceCharge || 0) > 0) markup += totalsLine("Service Charge", fmt(data.serviceCharge)) + "\n";
  if ((data.levy || 0) > 0) markup += totalsLine("Levy (5%)", fmt(data.levy)) + "\n";
  if ((isDelivery || (data.deliveryCharge && data.deliveryCharge > 0))) {
    markup += totalsLine("Delivery Charge", fmt(data.deliveryCharge || 0)) + "\n";
  }
  if (isVatActive || vatAmount > 0) markup += totalsLine("VAT Amount", fmt(vatAmount)) + "\n";

  markup += `[L]${DASH_SEP}\n`;
  markup += `[L]<b><font size='big'>${padRight("GRAND TOTAL", LINE_WIDTH - 10)}${padLeft(fmt(data.netAmount), 10)}</font></b>\n`;

  // ── Payments ─────────────────────────────────────────────────────────────────
  if (data.payments && data.payments.length > 0) {
    markup += `[L]${DASH_SEP}\n`;
    data.payments.forEach(p => {
      markup += totalsLine(p.name, fmt(p.amount)) + "\n";
    });
  }
  if (data.changeAmount !== undefined && data.changeAmount > 0) {
    markup += totalsLine("Change", fmt(data.changeAmount), true) + "\n";
  }

  // ── VAT table (if enabled) ────────────────────────────────────────────────
  if (isVatActive || vatAmount > 0) {
    markup += `[L]${DASH_SEP}\n`;
    markup += `[L]<b>${padRight("VAT Code", 14)}${padRight("Excl Amt", 12)}${padRight("VAT Amt", 10)}${padLeft("Net Amt", 12)}</b>\n`;
    markup += `[L]${DASH_SEP}\n`;
    const exclAmt = fmt(data.netAmount - vatAmount);
    markup += `[L]${padRight("10%", 14)}${padRight(exclAmt, 12)}${padRight(fmt(vatAmount), 10)}${padLeft(fmt(data.netAmount), 12)}\n`;
    markup += `[L]${DASH_SEP}\n`;
  }

  // ── Delivery / Drive-thru details ─────────────────────────────────────────
  if ((isDriveThru || isDelivery) && (data.vehicleNo || data.customerName || data.contactNo || data.flatNo)) {
    markup += `[L]${DASH_SEP}\n`;
    markup += `[C]<b>${isDelivery ? "DELIVERY DETAILS" : "CUSTOMER DETAILS"}</b>\n`;
    markup += `[L]${DASH_SEP}\n`;
    if (data.contactNo)  markup += twoCol("Mob No",      data.contactNo)  + "\n";
    if (data.customerName) markup += twoCol("Customer",  data.customerName) + "\n";
    if (data.flatNo)     markup += twoCol("Flat No",     data.flatNo)     + "\n";
    if (data.buildingNo) markup += twoCol("Building",    data.buildingNo) + "\n";
    if (data.blockNo)    markup += twoCol("Block",       data.blockNo)    + "\n";
    if (data.roadNo)     markup += twoCol("Road",        data.roadNo)     + "\n";
    if (data.area)       markup += twoCol("Area",        data.area)       + "\n";
    if (data.vehicleNo)  markup += twoCol("Vehicle No",  data.vehicleNo)  + "\n";
    if (data.providerNo) markup += twoCol("Provider No", data.providerNo) + "\n";
  }

  // ── Footer ────────────────────────────────────────────────────────────────
  markup += `[L]${DASH_SEP}\n`;
  markup += `[C]<b>Order No: #${data.orderNo}</b>\n`;
  markup += `[L]Print Time: ${dateStr} ${timeStr}\n`;
  const dynamicFooterMarkup = getCompanyFooter();
  if (dynamicFooterMarkup) {
    markup += dynamicFooterMarkup;
  }
  markup += `[L]\n[L]\n[L]\n`; // feed before cut

  return markup;
};

// ── KOT Markup ────────────────────────────────────────────────────────────────

export interface KotMarkupInput {
  cartDetails: PosCartItem[];
  data: KotPrintData;
}

export const generateKotMarkup = (input: KotMarkupInput): string => {
  const { cartDetails, data } = input;
  const isKotArabic = data.kotArabic ?? isKotArabicEnabled();
  const { date: dateStr, time: timeStr } = now();

  const orderTypeIdMap: Record<number, string> = {
    1: "DINE IN", 2: "TAKE OUT", 3: "DRIVE THRU",
    4: "DELIVERY", 5: "PROVIDERS", 6: "COMING"
  };
  const orderTypeNameMap: Record<string, string> = {
    "dinein": "DINE IN", "takein": "DINE IN",
    "takeout": "TAKE OUT", "takeaway": "TAKE OUT",
    "drivethru": "DRIVE THRU", "drivethrough": "DRIVE THRU",
    "delivery": "DELIVERY", "providers": "PROVIDERS", "coming": "COMING"
  };

  const rawOrderType = data.orderType || "";
  const normalizedKey = rawOrderType.toLowerCase().replace(/[\s_-]/g, "");
  const orderTypeStr = orderTypeNameMap[normalizedKey]
    || orderTypeIdMap[(data as any).orderTypeId as number]
    || rawOrderType.toUpperCase()
    || "DINE IN";

  const isDineIn = orderTypeStr === "DINE IN";
  const headerTitle = (data.headerTitle || "KOT").toUpperCase();
  const decimalPart = parseInt(localStorage.getItem('decimalPart') || '3', 10);

  let markup = "";

  // ── KOT Header ──────────────────────────────────────────────────────────────
  markup += `[C]${SEPARATOR}\n`;
  markup += `[C]<b><font size='big'>${headerTitle}</font></b>\n`;
  markup += `[C]${orderTypeStr}\n`;
  markup += `[L]${SEPARATOR}\n`;

  markup += twoCol(`Order: #${data.orderNo}`, `Ticket: #${data.ticketNo}`) + "\n";
  markup += twoCol(`Date: ${dateStr}`, `Time: ${timeStr}`) + "\n";
  markup += twoCol(`Waiter: ${data.waiter}`, `Counter: ${data.counter}`) + "\n";

  if (isDineIn) {
    markup += twoCol(`Section: ${data.section}`, `Table: ${data.table}`) + "\n";
  }
  if (data.vehicleNo)   markup += `[L]Vehicle No: ${data.vehicleNo}\n`;
  if (data.customerName) markup += `[L]Customer: ${data.customerName}\n`;

  const rawKotHeader = data.kotHeader || localStorage.getItem("kotHeader") || "QTY,DESCRIPTION,AMT";
  const kotHeaderStyle = rawKotHeader.toUpperCase().replace(/\s+/g, "");

  markup += `[L]${SEPARATOR}\n`;
  if (kotHeaderStyle === "QTY,DESCRIPTION") {
    markup += `[L]<b>${padRight("Qty", 6)} ${padRight("Description", LINE_WIDTH - 7)}</b>\n`;
  } else if (kotHeaderStyle.startsWith("DESCRIPTION")) {
    markup += `[L]<b>${padRight("Description", LINE_WIDTH - 16)}${padLeft("Qty", 5)} ${padLeft("Amount", 10)}</b>\n`;
  } else {
    markup += `[L]<b>${padLeft("Qty", 5)} ${padRight("Description", LINE_WIDTH - 16)} ${padLeft("Amount", 10)}</b>\n`;
  }
  markup += `[L]${SEPARATOR}\n`;

  // ── KOT Items ───────────────────────────────────────────────────────────────
  cartDetails.forEach((item) => {
    let name = (item.product?.name || `Item #${item.productId}`).toUpperCase();
    if (item.variantName && item.variantName.toLowerCase().trim() !== "main") {
      name += ` - ${item.variantName.toUpperCase()}`;
    }
    const qty = item.quantity;
    let extrasSum = 0;
    if (item.extras && item.extras.length > 0) {
      item.extras.forEach(ex => { extrasSum += ex.price * (ex.qty || 1); });
    }

    let baseAmt = (item as any).lineTotal;
    if (baseAmt !== undefined) baseAmt -= extrasSum;
    else baseAmt = (item.price || item.product?.price || 0) * item.quantity;
    const amtStr = Number(baseAmt || 0).toFixed(decimalPart);

    if (kotHeaderStyle === "QTY,DESCRIPTION") {
      const qtyStr = padRight(`x${qty}`, 5);
      const maxName = LINE_WIDTH - qtyStr.length - 1;
      const nameStr = padRight(trunc(name, maxName), maxName);
      markup += `[L]<b>${qtyStr} ${nameStr}</b>\n`;
    } else if (kotHeaderStyle.startsWith("DESCRIPTION")) {
      const aStr = padLeft(amtStr, 10);
      const qStr = padLeft(String(qty), 5);
      const maxName = LINE_WIDTH - aStr.length - qStr.length - 2;
      const nameStr = padRight(trunc(name, maxName), maxName);
      markup += `[L]<b>${nameStr} ${qStr} ${aStr}</b>\n`;
    } else {
      const aStr = padLeft(amtStr, 10);
      const qStr = padRight(`x${qty}`, 5);
      const maxName = LINE_WIDTH - aStr.length - qStr.length - 2;
      const nameStr = padRight(trunc(name, maxName), maxName);
      markup += `[L]<b>${qStr}${nameStr} ${aStr}</b>\n`;
    }

    const altArabicName = isKotArabic ? getAlternativeArabicName(item) : "";
    if (altArabicName) {
      markup += `[L]${altArabicName}\n`;
    }

    // Extras
    if (item.extras && item.extras.length > 0) {
      item.extras.forEach(ex => {
        const exName = `  + ${(ex.name || "EXTRA").toUpperCase()}`;
        const exQty = padLeft(String(ex.qty || 1), 5);
        if (kotHeaderStyle === "QTY,DESCRIPTION") {
          markup += `[L]${padRight(trunc(exName, LINE_WIDTH - 6), LINE_WIDTH - 6)} ${exQty}\n`;
        } else {
          const exAmt = Number(ex.price * (ex.qty || 1)).toFixed(decimalPart);
          markup += itemLine(exName, ex.qty || 1, exAmt) + "\n";
        }
      });
    }

    // Modifiers
    if (item.modifiers && item.modifiers.length > 0) {
      item.modifiers.forEach(mod => {
        markup += `[L]  * ${(mod.name || "").toUpperCase()}\n`;
      });
    }

    // Messages / Kitchen Notes
    if (item.messages && item.messages.length > 0) {
      item.messages.forEach(msg => {
        markup += `[L]  NOTE: ${(msg.name || "").toUpperCase()}\n`;
      });
    }
  });

  markup += `[L]${SEPARATOR}\n`;
  markup += `[L]\n[L]\n[L]\n`; // feed before cut

  return markup;
};

// ── Cashier / Shift Report Markup ────────────────────────────────────────────

export interface CashierReportMarkupInput {
  reportLines: string[]; // plain text lines to print
  title?: string;
}

export const generateCashierReportMarkup = (input: CashierReportMarkupInput): string => {
  const { reportLines, title = "CASHIER REPORT" } = input;
  const { date: dateStr, time: timeStr } = now();

  let markup = "";
  markup += getCompanyHeader();
  markup += `[C]${SEPARATOR}\n`;
  markup += `[C]<b>${title}</b>\n`;
  markup += `[C]${dateStr} ${timeStr}\n`;
  markup += `[L]${SEPARATOR}\n`;

  reportLines.forEach(line => {
    if (!line.trim()) {
      markup += `[L]\n`;
    } else if (line.startsWith("===") || line.startsWith("---")) {
      markup += `[L]${SEPARATOR}\n`;
    } else {
      markup += `[L]${line}\n`;
    }
  });

  markup += `[L]${SEPARATOR}\n`;
  markup += `[L]\n[L]\n[L]\n`;
  return markup;
};

// ── End Report Markup (Day End & Shift End) ───────────────────────────────────

export const generateEndReportMarkup = (data: EndReportData, reportType: 'DAYEND' | 'SHIFTEND'): string => {
  const config = getDayEndReportConfig();
  console.log(`[ESC/POS ${reportType} Report Data Received from Backend]:`, data);
  const decimalPart = parseInt(localStorage.getItem('decimalPart') || '3', 10);
  const fmt = (val: number | undefined | null) => Number(val || 0).toFixed(decimalPart);

  const formatDate = (isoStr?: string) => {
    if (!isoStr || isoStr.includes('1900-01-01')) return '';
    try {
      return new Date(isoStr).toLocaleDateString('en-GB');
    } catch {
      return '';
    }
  };

  const formatTime = (isoStr?: string) => {
    if (!isoStr || isoStr.includes('1900-01-01')) return '';
    try {
      return new Date(isoStr).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true });
    } catch {
      return '';
    }
  };

  const gs = data.generalSummary || {} as any;
  const cf = data.cashFlow || {} as any;

  let markup = "";
  markup += getEndReportHeader();
  markup += `[C]${SEPARATOR}\n`;
  markup += `[C]<b><font size='big'>${reportType === 'DAYEND' ? 'DAYEND REPORT' : 'SHIFTEND REPORT'}</font></b>\n`;
  markup += `[L]${SEPARATOR}\n`;

  // Start & End date/times
  markup += twoCol("Start Date:", formatDate(gs.startDate)) + "\n";
  markup += twoCol("Start Time:", formatTime(gs.startDate)) + "\n";
  markup += twoCol("End Date:", formatDate(gs.endDate)) + "\n";
  markup += twoCol("End Time:", formatTime(gs.endDate)) + "\n";
  markup += `[L]${DASH_SEP}\n`;

  // Order Summary (Order Type)
  if (config.showOrderType && data.orderTypes && data.orderTypes.length > 0) {
    markup += `[C]<b>ORDER SUMMARY</b>\n`;
    markup += `[L]${DASH_SEP}\n`;
    let orderSummaryTotal = 0;
    data.orderTypes.forEach(o => {
      orderSummaryTotal += o.total;
      markup += twoCol(`${o.orderType} (x${o.count || 0})`, fmt(o.total)) + "\n";
    });
    markup += twoCol("Total:", fmt(orderSummaryTotal)) + "\n";
    markup += `[L]${DASH_SEP}\n`;
  }

  // Waiter Summary (Employee)
  const waitersList = data.waiters || (data as any).employees || [];
  if (config.showEmployee && waitersList.length > 0) {
    markup += `[C]<b>WAITER SUMMARY</b>\n`;
    markup += `[L]${DASH_SEP}\n`;
    let waiterTotal = 0;
    waitersList.forEach((w: any) => {
      const name = w.waiter || w.employeeName || w.employee || "Unknown";
      waiterTotal += (w.total || 0);
      markup += twoCol(name, fmt(w.total)) + "\n";
    });
    markup += twoCol("Total:", fmt(waiterTotal)) + "\n";
    markup += `[L]${DASH_SEP}\n`;
  }

  // Sales by Category
  if (config.showCategory && data.categories && data.categories.length > 0) {
    markup += `[C]<b>SALES BY CATEGORY</b>\n`;
    markup += `[L]${DASH_SEP}\n`;
    data.categories.forEach(c => {
      markup += twoCol(`${c.categoryName} (x${c.qty})`, fmt(c.total)) + "\n";
    });
    markup += `[L]${DASH_SEP}\n`;
  }

  // Sales by Product
  const prodList = (data as any).products || (data as any).productSummary || [];
  if (config.showProduct && prodList.length > 0) {
    markup += `[C]<b>SALES BY PRODUCT</b>\n`;
    markup += `[L]${DASH_SEP}\n`;
    let prodTotal = 0;
    prodList.forEach((p: any) => {
      const name = p.productName || p.product || "Unknown";
      const qty = p.qty || p.quantity || 0;
      const total = p.total || p.amount || 0;
      prodTotal += Number(total) || 0;
      markup += twoCol(`${name} (x${qty})`, fmt(total)) + "\n";
    });
    markup += twoCol("Total:", fmt(prodTotal)) + "\n";
    markup += `[L]${DASH_SEP}\n`;
  }

  // Sales by Group
  const groupList = (data as any).groups || (data as any).groupSummary || [];
  if (config.showGroup && groupList.length > 0) {
    markup += `[C]<b>SALES BY GROUP</b>\n`;
    markup += `[L]${DASH_SEP}\n`;
    let groupTotal = 0;
    groupList.forEach((g: any) => {
      const name = g.groupName || g.group || "Unknown";
      const qty = g.qty || g.quantity || 0;
      const total = g.total || g.amount || 0;
      groupTotal += Number(total) || 0;
      markup += twoCol(`${name} (x${qty})`, fmt(total)) + "\n";
    });
    markup += twoCol("Total:", fmt(groupTotal)) + "\n";
    markup += `[L]${DASH_SEP}\n`;
  }

  // Driver Summary
  const driverList = (data as any).drivers || (data as any).driverSummary || [];
  if (config.showDriver && driverList.length > 0) {
    markup += `[C]<b>DRIVER SUMMARY</b>\n`;
    markup += `[L]${DASH_SEP}\n`;
    let driverTotal = 0;
    driverList.forEach((d: any) => {
      const name = d.driverName || d.driver || "Unknown";
      const count = d.count || d.totalOrders || 0;
      const total = d.total || d.amount || 0;
      driverTotal += Number(total) || 0;
      markup += twoCol(`${name} (${count} orders)`, fmt(total)) + "\n";
    });
    markup += twoCol("Total:", fmt(driverTotal)) + "\n";
    markup += `[L]${DASH_SEP}\n`;
  }

  // Voucher Entries
  const voucherList = (data as any).voucherEntries || (data as any).vouchers || [];
  if (config.showVoucherEntry && voucherList.length > 0) {
    markup += `[C]<b>VOUCHER ENTRIES</b>\n`;
    markup += `[L]${DASH_SEP}\n`;
    let voucherTotal = 0;
    voucherList.forEach((v: any) => {
      const num = v.voucherNo || v.voucherNumber || v.billNo || "-";
      const amt = v.amount || 0;
      voucherTotal += Number(amt) || 0;
      markup += twoCol(num, fmt(amt)) + "\n";
    });
    markup += twoCol("Total:", fmt(voucherTotal)) + "\n";
    markup += `[L]${DASH_SEP}\n`;
  }

  // Void Items
  const voidList = data.voidProducts || (data as any).voidItems || [];
  if (config.showVoidItem && voidList.length > 0) {
    markup += `[C]<b>VOID ITEMS</b>\n`;
    markup += `[L]${DASH_SEP}\n`;
    let voidTotal = 0;
    voidList.forEach((v: any) => {
      const amt = v.amount || 0;
      voidTotal += amt;
      const pName = v.productName || v.product || "Unknown";
      markup += twoCol(`${pName} (x${v.qty || 1})`, fmt(amt)) + "\n";
    });
    markup += twoCol("Total Void:", fmt(voidTotal)) + "\n";
    markup += `[L]${DASH_SEP}\n`;
  }

  // Denominations
  const denomList = (data as any).denominations || (data as any).cashDenominations || [];
  if (config.showDenomination && denomList.length > 0) {
    markup += `[C]<b>DENOMINATIONS</b>\n`;
    markup += `[L]${DASH_SEP}\n`;
    let denomTotal = 0;
    denomList.forEach((d: any) => {
      const count = d.count ?? d.cashCount ?? 0;
      const value = d.denomination ?? d.denominationValue ?? d.name ?? 0;
      const total = d.total ?? (Number(value) * Number(count));
      denomTotal += Number(total) || 0;
      markup += twoCol(`${value} x ${count}`, fmt(total)) + "\n";
    });
    markup += twoCol("Total:", fmt(denomTotal)) + "\n";
    markup += `[L]${DASH_SEP}\n`;
  }

  // Payment Summary
  if (data.paymodes && data.paymodes.length > 0) {
    markup += `[C]<b>PAYMENT SUMMARY</b>\n`;
    markup += `[L]${DASH_SEP}\n`;
    let paymodeTotal = 0;
    data.paymodes.forEach(p => {
      paymodeTotal += p.amount;
      markup += twoCol(p.paymodeName, fmt(p.amount)) + "\n";
    });
    markup += twoCol("Total:", fmt(paymodeTotal)) + "\n";
    markup += `[L]${DASH_SEP}\n`;
  }

  // General Summary
  let vatTotal = 0;
  if (data.taxSummary && data.taxSummary.length > 0) {
    data.taxSummary.forEach(t => vatTotal += t.vatAmount);
  }
  markup += `[C]<b>GENERAL SUMMARY</b>\n`;
  markup += `[L]${DASH_SEP}\n`;
  markup += twoCol("Sale:", fmt(data.salesSummary?.sales)) + "\n";
  if ((data.salesSummary?.deliveryCharge || 0) > 0) {
    markup += twoCol("Delivery Charge:", fmt(data.salesSummary?.deliveryCharge)) + "\n";
  }
  markup += twoCol("VAT Amount:", fmt(data.salesSummary?.vatAmount || vatTotal)) + "\n";
  markup += twoCol("Grand Total:", fmt((data.salesSummary?.sales || 0) + vatTotal + (data.salesSummary?.deliveryCharge || 0))) + "\n";
  if (gs.voidSales) markup += twoCol("Cancelled Sales:", fmt(gs.voidSales)) + "\n";
  if (gs.voidOrders) markup += twoCol("Cancelled Order:", fmt(gs.voidOrders)) + "\n";
  markup += `[L]${DASH_SEP}\n`;

  // Cash Flow
  markup += `[C]<b>CASH FLOW</b>\n`;
  markup += `[L]${DASH_SEP}\n`;
  markup += twoCol("CASH:", fmt(cf.cashSales)) + "\n";
  markup += twoCol("Pay In:", fmt(cf.payIn)) + "\n";
  markup += twoCol("Total Cash In:", fmt((cf.cashSales || 0) + (cf.payIn || 0))) + "\n";
  markup += twoCol("Pay Out:", fmt(cf.payOut)) + "\n";
  markup += twoCol("Total Cash Out:", fmt(cf.payOut)) + "\n";
  markup += twoCol("Net Cash:", fmt(((cf.cashSales || 0) + (cf.payIn || 0)) - (cf.payOut || 0))) + "\n";
  markup += twoCol("Closing Balance:", fmt(cf.closingBal)) + "\n";
  markup += twoCol("Difference:", fmt(cf.closingBal - (((cf.cashSales || 0) + (cf.payIn || 0)) - (cf.payOut || 0)))) + "\n";
  markup += `[L]${SEPARATOR}\n`;
  markup += `[L]\n[L]\n[L]\n`;

  return markup;
};

// ── Void Order Summary 80mm ESC/POS Markup ─────────────────────────────
export const generateVoidOrderReportMarkup = (logs: any[], fromDate: string, toDate: string): string => {
  const decimalPart = parseInt(localStorage.getItem('decimalPart') || '3', 10);
  const fmt = (val: any) => Number(val || 0).toFixed(decimalPart);
  const totalAmount = logs.reduce((sum, item) => sum + (parseFloat(String(item.amount)) || 0), 0);

  let markup = "";
  markup += getCompanyHeader();
  markup += `[C]${SEPARATOR}\n`;
  markup += `[C]<b><font size='big'>VOID ORDER SUMMARY</font></b>\n`;
  markup += `[C]Period: ${fromDate} to ${toDate}\n`;
  markup += `[L]${SEPARATOR}\n`;

  if (logs.length === 0) {
    markup += `[C]No void orders found\n`;
  } else {
    logs.forEach((item, index) => {
      const sNo = item.sNo || (index + 1);
      const orderType = item.orderType || '-';
      const dt = item.date ? new Date(item.date).toLocaleString('en-GB') : '-';
      const emp = item.employee || '-';
      const reason = item.reason || '-';
      
      markup += twoCol(`<b>#${sNo} Order #${item.orderNo}</b> (${orderType})`, fmt(item.amount), true) + "\n";
      markup += `[L]Date: ${dt}\n`;
      markup += `[L]Employee: ${emp} | Reason: ${reason}\n`;
      markup += `[L]${DASH_SEP}\n`;
    });
  }

  markup += twoCol("TOTAL RECORDS:", String(logs.length)) + "\n";
  markup += twoCol("TOTAL VOID AMOUNT:", fmt(totalAmount), true) + "\n";
  markup += `[L]${SEPARATOR}\n`;
  markup += `[L]\n[L]\n[L]\n`;
  return markup;
};

// ── Void Product Summary 80mm ESC/POS Markup ────────────────────────────
export const generateVoidProductReportMarkup = (logs: any[], fromDate: string, toDate: string): string => {
  const decimalPart = parseInt(localStorage.getItem('decimalPart') || '3', 10);
  const fmt = (val: any) => Number(val || 0).toFixed(decimalPart);
  const totalQty = logs.reduce((sum, item) => sum + (parseFloat(String(item.quantity)) || 0), 0);
  const totalAmount = logs.reduce((sum, item) => sum + (parseFloat(String(item.amount)) || 0), 0);

  let markup = "";
  markup += getCompanyHeader();
  markup += `[C]${SEPARATOR}\n`;
  markup += `[C]<b><font size='big'>VOID PRODUCT SUMMARY</font></b>\n`;
  markup += `[C]Period: ${fromDate} to ${toDate}\n`;
  markup += `[L]${SEPARATOR}\n`;

  if (logs.length === 0) {
    markup += `[C]No voided products found\n`;
  } else {
    logs.forEach((item, index) => {
      const sNo = item.sNo || (index + 1);
      const orderType = item.orderType || '-';
      const dt = item.voidDate ? new Date(item.voidDate).toLocaleString('en-GB') : '-';
      const emp = item.employee || '-';
      const product = item.product || '-';
      const qtyStr = `${item.quantity} ${item.unit || ''}`.trim();

      markup += `[L]<b>#${sNo} ${product}</b>\n`;
      markup += twoCol(`Order #${item.orderNo} (${orderType}) Qty: ${qtyStr}`, fmt(item.amount), true) + "\n";
      markup += `[L]Employee: ${emp} | Void Date: ${dt}\n`;
      markup += `[L]${DASH_SEP}\n`;
    });
  }

  markup += twoCol("TOTAL ITEMS:", String(logs.length)) + "\n";
  markup += twoCol("TOTAL VOID QTY:", String(totalQty)) + "\n";
  markup += twoCol("TOTAL VOID AMOUNT:", fmt(totalAmount), true) + "\n";
  markup += `[L]${SEPARATOR}\n`;
  markup += `[L]\n[L]\n[L]\n`;
  return markup;
};

// ── Cancelled Invoice Summary 80mm ESC/POS Markup ──────────────────────
export const generateVoidInvoiceReportMarkup = (logs: any[], fromDate: string, toDate: string): string => {
  const decimalPart = parseInt(localStorage.getItem('decimalPart') || '3', 10);
  const fmt = (val: any) => Number(val || 0).toFixed(decimalPart);
  const totalAmount = logs.reduce((sum, item) => sum + (parseFloat(String(item.amount)) || 0), 0);

  let markup = "";
  markup += getCompanyHeader();
  markup += `[C]${SEPARATOR}\n`;
  markup += `[C]<b><font size='big'>CANCELLED INVOICE SUMMARY</font></b>\n`;
  markup += `[C]Period: ${fromDate} to ${toDate}\n`;
  markup += `[L]${SEPARATOR}\n`;

  if (logs.length === 0) {
    markup += `[C]No cancelled invoices found\n`;
  } else {
    logs.forEach((item, index) => {
      const sNo = item.sNo || (index + 1);
      const billNo = item.billNo || '-';
      const orderType = item.orderType || '-';
      const dt = item.date ? new Date(item.date).toLocaleString('en-GB') : '-';
      const emp = item.employee || '-';
      const reason = item.reason || '-';

      markup += twoCol(`<b>#${sNo} Bill: ${billNo}</b> (#${item.orderNo})`, fmt(item.amount), true) + "\n";
      markup += `[L]Type: ${orderType} | Date: ${dt}\n`;
      markup += `[L]Employee: ${emp} | Reason: ${reason}\n`;
      markup += `[L]${DASH_SEP}\n`;
    });
  }

  markup += twoCol("TOTAL INVOICES:", String(logs.length)) + "\n";
  markup += twoCol("TOTAL CANCELLED AMOUNT:", fmt(totalAmount), true) + "\n";
  markup += `[L]${SEPARATOR}\n`;
  markup += `[L]\n[L]\n[L]\n`;
  return markup;
};

// ── Bill Complementary Summary 80mm ESC/POS Markup ─────────────────────
export const generateBillComplementaryReportMarkup = (logs: any[], fromDate: string, toDate: string): string => {
  const decimalPart = parseInt(localStorage.getItem('decimalPart') || '3', 10);
  const fmt = (val: any) => Number(val || 0).toFixed(decimalPart);
  const totalAmount = logs.reduce((sum, item) => sum + (parseFloat(String(item.amount)) || 0), 0);

  let markup = "";
  markup += getCompanyHeader();
  markup += `[C]${SEPARATOR}\n`;
  markup += `[C]<b><font size='big'>BILL COMPLEMENTARY SUMMARY</font></b>\n`;
  markup += `[C]Period: ${fromDate} to ${toDate}\n`;
  markup += `[L]${SEPARATOR}\n`;

  if (logs.length === 0) {
    markup += `[C]No complementary bills found\n`;
  } else {
    logs.forEach((item, index) => {
      const sNo = item.sNo || (index + 1);
      const billNo = item.billNo || '-';
      const customer = item.customer || '-';
      const emp = item.employee || '-';
      const dt = item.date ? new Date(item.date).toLocaleString('en-GB') : '-';

      markup += twoCol(`<b>#${sNo} Bill: ${billNo}</b>`, fmt(item.amount || 0), true) + "\n";
      markup += `[L]Customer: ${customer}\n`;
      markup += `[L]Employee: ${emp} | Date: ${dt}\n`;
      markup += `[L]${DASH_SEP}\n`;
    });
  }

  markup += twoCol("TOTAL COMPLEMENTARY BILLS:", String(logs.length)) + "\n";
  markup += twoCol("TOTAL AMOUNT:", fmt(totalAmount), true) + "\n";
  markup += `[L]${SEPARATOR}\n`;
  markup += `[L]\n[L]\n[L]\n`;
  return markup;
};

// ── Driver Summary 80mm ESC/POS Markup ─────────────────────────────────
export const generateDriverSummaryReportMarkup = (logs: any[], fromDate: string, toDate: string): string => {
  const decimalPart = parseInt(localStorage.getItem('decimalPart') || '3', 10);
  const fmt = (val: any) => Number(val || 0).toFixed(decimalPart);
  const totalAmount = logs.reduce((sum, item) => sum + (parseFloat(String(item.amount)) || 0), 0);

  let markup = "";
  markup += getCompanyHeader();
  markup += `[C]${SEPARATOR}\n`;
  markup += `[C]<b><font size='big'>DRIVER SUMMARY REPORT</font></b>\n`;
  markup += `[C]Period: ${fromDate} to ${toDate}\n`;
  markup += `[L]${SEPARATOR}\n`;

  if (logs.length === 0) {
    markup += `[C]No driver records found\n`;
  } else {
    logs.forEach((item, index) => {
      const sNo = item.sNo || (index + 1);
      const driver = item.driver || 'Unknown Driver';
      const totalOrders = item.totalOrders ? ` (${item.totalOrders} Orders)` : '';

      markup += twoCol(`<b>#${sNo} ${driver}${totalOrders}</b>`, fmt(item.amount), true) + "\n";
      markup += `[L]${DASH_SEP}\n`;
    });
  }

  markup += twoCol("TOTAL DRIVERS:", String(logs.length)) + "\n";
  markup += twoCol("TOTAL AMOUNT:", fmt(totalAmount), true) + "\n";
  markup += `[L]${SEPARATOR}\n`;
  markup += `[L]\n[L]\n[L]\n`;
  return markup;
};

// ── All Transaction Summary 80mm ESC/POS Markup ────────────────────────
export const generateAllTransactionSummaryReportMarkup = (logs: any[], fromDate: string, toDate: string): string => {
  const decimalPart = parseInt(localStorage.getItem('decimalPart') || '3', 10);
  const fmt = (val: any) => Number(val || 0).toFixed(decimalPart);
  const totalAmount = logs.reduce((sum, item) => sum + (parseFloat(String(item.amount)) || 0), 0);

  let markup = "";
  markup += getCompanyHeader();
  markup += `[C]${SEPARATOR}\n`;
  markup += `[C]<b><font size='big'>ALL TRANSACTION SUMMARY</font></b>\n`;
  markup += `[C]Period: ${fromDate} to ${toDate}\n`;
  markup += `[L]${SEPARATOR}\n`;

  if (logs.length === 0) {
    markup += `[C]No transaction summary records found\n`;
  } else {
    logs.forEach((item, index) => {
      const sNo = item.sNo || (index + 1);
      const particular = item.particular || '-';
      const category = item.category ? ` [${item.category}]` : '';
      const payType = item.paymentType ? ` (${item.paymentType})` : '';

      markup += twoCol(`<b>#${sNo} ${particular}${category}${payType}</b>`, fmt(item.amount), true) + "\n";
      markup += `[L]${DASH_SEP}\n`;
    });
  }

  markup += twoCol("TOTAL TRANSACTIONS:", String(logs.length)) + "\n";
  markup += twoCol("TOTAL AMOUNT:", fmt(totalAmount), true) + "\n";
  markup += `[L]${SEPARATOR}\n`;
  markup += `[L]\n[L]\n[L]\n`;
  return markup;
};

// ── Delivery / Driver Settle 80mm ESC/POS Markup ─────────────────────────────
export const generateDeliverySettleMarkup = (
  data: import("./deliverySettlePrintTemplate").DeliverySettlePrintData
): string => {
  const decimalPart = parseInt(localStorage.getItem("decimalPart") || "3", 10);
  const fmt = (val: any) => {
    const n = typeof val === "string" ? parseFloat(val) : Number(val || 0);
    return (Number.isFinite(n) ? n : 0).toFixed(decimalPart);
  };
  const nowObj = new Date();
  const dateStr = data.date || nowObj.toLocaleDateString("en-GB");
  const timeStr = data.time || nowObj.toLocaleTimeString("en-US");
  const dateTimeStr = `${dateStr} ${timeStr}`;
  const printTimeStr =
    data.printTime || `${nowObj.toLocaleDateString("en-GB")} ${nowObj.toLocaleTimeString("en-US")}`;

  let markup = "";
  if (data.showCompanyHeader !== false) {
    markup += getCompanyHeader();
  }

  // Meta Section
  markup += twoCol("Driver", data.driverName) + "\n";
  markup += twoCol("Date", dateTimeStr) + "\n";
  markup += twoCol("Settle By", data.settleBy) + "\n";
  markup += `[L]${DASH_SEP}\n`;

  // Group by Paymode
  const defaultPaymode = (data.paymodeName || "CARD").toUpperCase();
  const groupedMap = new Map<string, import("./deliverySettlePrintTemplate").DeliverySettleOrderItem[]>();
  data.items.forEach((item) => {
    const mode = (item.paymodeName || defaultPaymode).toUpperCase();
    if (!groupedMap.has(mode)) groupedMap.set(mode, []);
    groupedMap.get(mode)!.push(item);
  });

  let grandTotal = 0;

  groupedMap.forEach((items, paymode) => {
    markup += `[L]<b>${paymode}</b>\n`;
    markup += `[L]${DASH_SEP}\n`;

    // Table Header: SNo (4) Token (7) Customer Address (24) Amount (13) = 48
    const hSNo = padRight("SNo", 4);
    const hToken = padRight("Token", 7);
    const hAddr = padRight("Customer Address", 24);
    const hAmt = padLeft("Amount", 13);
    markup += `[L]<b>${hSNo}${hToken}${hAddr}${hAmt}</b>\n`;
    markup += `[L]${DASH_SEP}\n`;

    let subtotal = 0;
    items.forEach((item, idx) => {
      const sNo = padRight(String(item.sNo || idx + 1), 4);
      const token = padRight(trunc(String(item.token || "-"), 6), 7);
      const addr = padRight(trunc(String(item.customerAddress || "-"), 23), 24);
      const amtStr = padLeft(fmt(item.amount), 13);
      subtotal += Number(item.amount) || 0;

      markup += `[L]${sNo}${token}${addr}${amtStr}\n`;
    });

    grandTotal += subtotal;
    markup += `[L]${DASH_SEP}\n`;
    markup += totalsLine("Total", fmt(subtotal)) + "\n";
  });

  const finalGrandTotal =
    data.grandTotal !== undefined && data.grandTotal > 0 ? data.grandTotal : grandTotal;
  markup += `[L]${DASH_SEP}\n`;
  markup += totalsLine("Grand Total", fmt(finalGrandTotal), true) + "\n";
  markup += `[L]${DASH_SEP}\n`;
  markup += `[L]Print Time : ${printTimeStr}\n`;
  markup += `[L]\n[L]\n[L]\n`;

  return markup;
};


