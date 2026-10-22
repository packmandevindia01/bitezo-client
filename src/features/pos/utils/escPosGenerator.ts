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
import { type GuestPrintData, resolvePrintTaxSetting, resolveViewTaxSetting } from "./guestPrintTemplate";
import { type KotPrintData, resolveKotPrintTaxSetting, resolveKotHeaderStyle } from "./kotTemplate";
import type { EndReportData } from "../cashier/services/cashierLogService";
import { getDayEndReportConfig } from "../services/posConfigApi";
import { isKotArabicEnabled, isBillArabicEnabled, isCompanyNameKotEnabled, getAlternativeArabicName, formatItemDisplayName } from "./alternativeHelpers";
import { getModifierTypeNameById } from "../services/menuApi";

// ── Constants ─────────────────────────────────────────────────────────────────
const LINE_WIDTH = 48; // standard 48 chars per line on 80mm thermal paper
const SEPARATOR  = "-".repeat(LINE_WIDTH);
const DASH_SEP   = "-".repeat(LINE_WIDTH);

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Left-pad a string to width */
const padLeft = (s: string, width: number): string =>
  String(s).padStart(width);

/** Right-pad a string to width */
const padRight = (s: string, width: number): string =>
  String(s).padEnd(width);

/** Center-pad a string to width */
const padCenter = (s: string, width: number): string => {
  const str = String(s);
  if (str.length >= width) return str.substring(0, width);
  const leftPad = Math.floor((width - str.length) / 2);
  const rightPad = width - str.length - leftPad;
  return " ".repeat(leftPad) + str + " ".repeat(rightPad);
};

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
 * Format a three-column line: left text + center text + right text flush to LINE_WIDTH (48 chars).
 * Columns: col1 (Product) ~ 28 chars, col2 (Qty) ~ 7 chars, col3 (Total) ~ 11 chars.
 * Total: 28 + 1 + 7 + 1 + 11 = 48.
 */
const threeCol = (left: string, center: string, right: string, isBold = false): string => {
  const r = padLeft(String(right), 11);
  const c = padCenter(String(center), 7);
  const maxLeft = LINE_WIDTH - r.length - c.length - 2;
  const l = padRight(trunc(String(left), maxLeft), maxLeft);
  const line = `${l} ${c} ${r}`;
  return isBold ? `[L]<b>${line}</b>` : `[L]${line}`;
};

/**
 * Format an item line: name | qty | amount
 * Width breakdown (42 chars):
 *   name   = 26 chars (left, truncated)
 *   gap    =  1 char
 *   qty    =  4 chars (e.g. " x 2")
 *   gap    =  1 char
 *   amount = 10 chars (right-aligned)
 *   Total  = 26 + 1 + 4 + 1 + 10 = 42 chars
 */
const itemLine = (name: string, qty: number, amount: string): string => {
  const amtStr  = padLeft(amount, 10);
  const qtyStr  = padLeft(`x${qty}`, 4);
  const maxName = LINE_WIDTH - amtStr.length - qtyStr.length - 2;
  const nameStr = padRight(trunc(name.toUpperCase(), maxName), maxName);
  return `[L]${nameStr} ${qtyStr} ${amtStr}`;
};

/** Format a totals row: label on left, value right-aligned (42 chars) */
const totalsLine = (label: string, value: string, bold = false): string => {
  const v = padLeft(value, 11);
  const maxL = LINE_WIDTH - v.length;
  const l = padRight(trunc(label, maxL), maxL);
  return bold ? `[L]<b>${l}${v}</b>` : `[L]${l}${v}`;
};

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
  if (lower.includes("benefit")) return "بنفت";
  if (lower === "credit") return "آجل";
  if (lower === "cheque" || lower === "check") return "شيك";
  if (lower === "online") return "عبر الإنترنت";
  if (lower.includes("talabat")) return "طلبات";
  if (lower.includes("jahez")) return "جاهز";
  if (lower.includes("ahlan")) return "أهلاً";
  if (lower === "other") return "أخرى";
  return "";
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

/** Get company name + address from dynamic branch lines or empty if not set (no fallback) */
export const getCompanyHeader = (): string => {
  const activeLines = getActiveBranchLines();
  const dynamicMarkup = buildEscPosLines(activeLines, "header");
  if (dynamicMarkup) return dynamicMarkup;
  return "";
};

/** Get dynamic End-of-Day report header (EH1..EH7) or empty if not set (no fallback) */
export const getEndReportHeader = (): string => {
  const activeLines = getActiveBranchLines();
  const dynamicMarkup = buildEscPosLines(activeLines, "dayEndHeader");
  if (dynamicMarkup) return dynamicMarkup;
  return "";
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
  const driverVal = (data.driverName || data.driver || "").trim();

  const cartVatSum = cartDetails.reduce((s: number, it: any) => s + (it.vatAmount || 0), 0);
  const rawVat = (data.vatAmount && data.vatAmount > 0) ? data.vatAmount : (cartVatSum > 0 ? cartVatSum : 0);
  
  // Calculate displaySubTotal for logic usage
  let displaySubTotal = 0;
  cartDetails.forEach((item) => {
    let extrasSum = 0;
    if (item.extras && item.extras.length > 0) item.extras.forEach(ex => { extrasSum += ex.price * (ex.qty || 1); });
    let baseAmt = (item as any).lineTotal;
    if (baseAmt !== undefined) baseAmt = Math.max(0, baseAmt - extrasSum);
    else baseAmt = (item.price || item.product?.price || 0) * item.quantity;
    displaySubTotal += parseFloat(fmt(baseAmt));
  });

  const isVatActive = data.enableVat === true || rawVat > 0 || cartVatSum > 0 || (data.vatAmount && data.vatAmount > 0) || (data.netAmount > 0 && Math.abs(data.netAmount - (displaySubTotal + (data.serviceCharge || 0) + (data.levy || 0) + (data.deliveryCharge || 0))) > 0.001);
  const printTaxSetting = resolvePrintTaxSetting(data as any);
  const viewTaxSetting = resolveViewTaxSetting(data as any);
  const isTaxInclusive = isVatActive ? (printTaxSetting === "Inclusive") : false;
  const isViewInclusive = viewTaxSetting === "Inclusive";

  const isGuestPrint = !data.isSettlement && !data.invoiceNo && !data.isPackager;

  let invoiceTitle = "";
  if (isGuestPrint) {
    invoiceTitle = "GUEST PRINT";
    if (isBillArabic) {
      invoiceTitle += "\n[C]<b>فاتورة ضيف</b>";
    }
  } else if (data.isPackager) {
    invoiceTitle = "PACKAGER";
  } else {
    invoiceTitle = isVatActive ? "SIMPLIFIED TAX INVOICE" : "SIMPLIFIED INVOICE";
    if (isBillArabic) {
      invoiceTitle += isVatActive ? "\n[C]<b>فاتورة ضريبية مبسطة</b>" : "\n[C]<b>فاتورة مبسطة</b>";
    }
  }

  let orderLabel = "";
  if (isTakeOut)   orderLabel = isBillArabic ? "(TAKE OUT / سفري)" : "(TAKE OUT)";
  if (isDriveThru) orderLabel = isBillArabic ? "(DRIVE THRU / طلبات السيارات)" : "(DRIVE THRU)";
  if (isDineIn)    orderLabel = isBillArabic ? "(DINE IN / محلي)" : "(DINE IN)";
  if (isDelivery)  orderLabel = isBillArabic ? "(DELIVERY / توصيل)" : "(DELIVERY)";

  let markup = "";

  // ── Header ──────────────────────────────────────────────────────────────────
  const allowCompanyHeader = data.showCompanyHeader !== false;
  if (allowCompanyHeader) {
    if (customHeaderLines && customHeaderLines.length > 0) {
      customHeaderLines.forEach(line => { markup += `[C]${line}\n`; });
    } else {
      const companyHdr = getCompanyHeader();
      if (companyHdr) markup += companyHdr;
    }
  }

  if (markup.length > 0) {
    markup += `[C]${SEPARATOR}\n`;
  }
  markup += `[C]<b>${invoiceTitle}</b>\n`;
  if (orderLabel) markup += `[C]<b>${orderLabel}</b>\n`;
  markup += `[L]${SEPARATOR}\n`;

  // ── Meta rows ───────────────────────────────────────────────────────────────
  const invLbl = isBillArabic ? "Inv No (رقم الفاتورة)" : "Inv No";
  const ordLbl = isBillArabic ? "Order No (رقم الطلب)" : "Order No";
  const tktLbl = isBillArabic ? "Ticket No (رقم التذكرة)" : "Ticket No";
  const dateLbl = isBillArabic ? "Date (التاريخ)" : "Date";
  const timeLbl = isBillArabic ? "Time (الوقت)" : "Time";
  const empLbl = isBillArabic ? "Employee (الموظف)" : "Employee";
  const cntLbl = isBillArabic ? "Counter (الكاونتر)" : "Counter";
  const secLbl = isBillArabic ? "Section (القسم)" : "Section";
  const drvLbl = isBillArabic ? "Driver (السائق)" : "Driver";
  const tblLbl = isBillArabic ? "Table (الطاولة)" : "Table";

  if (data.invoiceNo) {
    const invDisplay = data.invoiceNo.startsWith('#') ? data.invoiceNo : (isNaN(Number(data.invoiceNo)) ? data.invoiceNo : '#' + data.invoiceNo);
    markup += twoCol(`${invLbl}: ${invDisplay}`, `${ordLbl} ${formatOrderNo(data.orderNo)}`) + "\n";
    markup += twoCol(`${tktLbl} #${data.ticketNo}`, `${dateLbl}: ${dateStr}`) + "\n";
    markup += twoCol(`${timeLbl}: ${timeStr}`, `${empLbl}: ${data.waiter}`) + "\n";
    if (data.counter) markup += twoCol(`${cntLbl}: ${data.counter}`, isDineIn ? `${secLbl}: ${data.section}` : (driverVal ? `${drvLbl}: ${driverVal}` : "")) + "\n";
    if (isDineIn && data.table) markup += `[L]${tblLbl}: ${data.table}\n`;
  } else {
    markup += twoCol(`${ordLbl} ${formatOrderNo(data.orderNo)}`, `${tktLbl} #${data.ticketNo}`) + "\n";
    markup += twoCol(`${dateLbl}: ${dateStr}`, `${timeLbl}: ${timeStr}`) + "\n";
    markup += twoCol(`${empLbl}: ${data.waiter}`, `${cntLbl}: ${data.counter}`) + "\n";
    if (isDineIn) {
      markup += twoCol(`${secLbl}: ${data.section}`, `${tblLbl}: ${data.table}`) + "\n";
    } else if (driverVal) {
      markup += twoCol(`${drvLbl}: ${driverVal}`, "") + "\n";
    }
  }
  markup += `[L]${DASH_SEP}\n`;

  // ── Column headers ───────────────────────────────────────────────────────────
  markup += `[L]<b>${padRight("Description", LINE_WIDTH - 16)} ${padLeft("Qty", 4)} ${padLeft("Amount", 10)}</b>\n`;
  if (isBillArabic) {
    markup += `[L]<b>${padRight("الوصف", LINE_WIDTH - 16)} ${padLeft("الكمية", 4)} ${padLeft("المبلغ", 10)}</b>\n`;
  }
  markup += `[L]${DASH_SEP}\n`;

  // ── Items ───────────────────────────────────────────────────────────────────
  displaySubTotal = 0; // Reset for loop

  const isOrderBillDiscount = Boolean(
    data.isBillDiscount ||
    (cartDetails.length > 0 && cartDetails.some((it: any) => (it.billDiscountAmount && it.billDiscountAmount > 0))) ||
    (
      data.discount && data.discount > 0 && cartDetails.length > 0 && (
        cartDetails.every((it: any) => !it.itemDiscount || it.itemDiscount <= 0.0001) ||
        (
          Number((cartDetails[0] as any).discPer ?? (cartDetails[0] as any).DiscPer ?? 0) > 0 &&
          cartDetails.every((it: any) => Number((it as any).discPer ?? (it as any).DiscPer ?? 0) === Number((cartDetails[0] as any).discPer ?? (cartDetails[0] as any).DiscPer ?? 0))
        )
      )
    )
  );

  displaySubTotal = 0;
  cartDetails.forEach((item) => {
    const name = formatItemDisplayName(
      item.product?.name || `Item #${item.productId}`,
      item.variantName
    ).toUpperCase();
    const qty = item.quantity;

    let extrasSum = 0;
    if (item.extras && item.extras.length > 0) {
      item.extras.forEach(ex => { extrasSum += ex.price * (ex.qty || 1); });
    }

    const origPrice = Number(item.price || item.product?.price || 0);
    const itemBaseAmount: number | undefined = (item as any).baseAmount;
    const itemLineTotal: number | undefined = (item as any).lineTotal;
    const itemLineNetAmount: number | undefined = (item as any).lineNetAmount ?? (item as any).LineNetAmount;
    const itemVat = Number((item as any).vatAmount || (item as any).VatAmount || 0);
    const itemDisc = isOrderBillDiscount ? 0 : Number((item as any).itemDiscount ?? (item as any).discAmount ?? 0);

    const knownBasePrice = (item as any).basePrice !== undefined && Number((item as any).basePrice) > 0
      ? Number((item as any).basePrice)
      : (itemBaseAmount !== undefined && itemBaseAmount > 0 && qty > 0 ? (itemBaseAmount / qty) : undefined);

    const vatRatio = isVatActive ? (1 / 1.10) : 1;
    const catalogExclusivePrice = knownBasePrice !== undefined
      ? knownBasePrice
      : (isViewInclusive
          ? ((isVatActive && vatRatio > 0 && vatRatio < 1) ? (origPrice * vatRatio) : origPrice)
          : origPrice);

    const catalogInclusivePrice = knownBasePrice !== undefined
      ? ((isVatActive && vatRatio > 0 && vatRatio < 1) ? (knownBasePrice / vatRatio) : knownBasePrice)
      : (isViewInclusive
          ? origPrice
          : ((isVatActive && vatRatio > 0 && vatRatio < 1) ? (origPrice / vatRatio) : origPrice));

    let exclusiveProductLineAmount: number;
    if (isOrderBillDiscount) {
      exclusiveProductLineAmount = catalogExclusivePrice * qty;
    } else {
      const netValueVal = (item as any).netValue !== undefined ? Number((item as any).netValue) : undefined;
      if (netValueVal !== undefined && qty > 0) {
        exclusiveProductLineAmount = Math.max(0, netValueVal);
      } else if (itemBaseAmount !== undefined && qty > 0) {
        exclusiveProductLineAmount = Math.max(0, itemBaseAmount - itemDisc);
      } else if (!isViewInclusive && itemLineTotal !== undefined && itemLineTotal > 0) {
        exclusiveProductLineAmount = Math.max(0, itemLineTotal - extrasSum);
      } else if (isViewInclusive && itemLineTotal !== undefined && itemLineTotal > 0) {
        exclusiveProductLineAmount = itemVat > 0
          ? Math.max(0, itemLineTotal - extrasSum - itemVat)
          : Math.max(0, (itemLineTotal - extrasSum) * vatRatio);
      } else {
        exclusiveProductLineAmount = Math.max(0, (catalogExclusivePrice * qty) - itemDisc);
      }
    }

    let lineInclusiveAmt: number;
    if (isOrderBillDiscount) {
      lineInclusiveAmt = catalogInclusivePrice * qty;
    } else {
      if (itemLineNetAmount !== undefined && itemLineNetAmount > 0) {
        lineInclusiveAmt = Math.max(0, itemLineNetAmount - extrasSum);
      } else if (isViewInclusive && itemLineTotal !== undefined && itemLineTotal > 0) {
        lineInclusiveAmt = Math.max(0, itemLineTotal - extrasSum);
      } else if (!isViewInclusive && itemLineTotal !== undefined && itemLineTotal > 0) {
        lineInclusiveAmt = itemVat > 0
          ? Math.max(0, itemLineTotal - extrasSum) + itemVat
          : (isVatActive && vatRatio > 0 && vatRatio < 1 ? Math.max(0, itemLineTotal - extrasSum) / vatRatio : Math.max(0, itemLineTotal - extrasSum));
      } else if (itemVat > 0) {
        lineInclusiveAmt = exclusiveProductLineAmount + itemVat;
      } else if (isVatActive && vatRatio > 0 && vatRatio < 1) {
        lineInclusiveAmt = Math.max(0, (catalogInclusivePrice * qty) - itemDisc);
      } else {
        lineInclusiveAmt = Math.max(0, (origPrice * qty) - itemDisc);
      }
    }

    const baseAmt = isTaxInclusive ? lineInclusiveAmt : exclusiveProductLineAmount;

    const amt = fmt(baseAmt);
    displaySubTotal += parseFloat(amt);
    markup += itemLine(name, qty, amt) + "\n";

    const altArabicName = isBillArabic ? getAlternativeArabicName(item) : "";
    if (altArabicName) {
      markup += `[R]${altArabicName}\n`;
    }

    if (itemDisc > 0) {
      markup += `[L]  * DISC: -${fmt(itemDisc)}\n`;
    }

    // Extras
    if (item.extras && item.extras.length > 0) {
      const dedupedExtrasMap = new Map<string, any>();
      item.extras.forEach(ex => {
        const rawExName = (ex.name || (ex as any).modifierName || "").trim();
        if (!rawExName) return;
        const exId = ex.id || (ex as any).modifierId || 0;
        const typeId = ex.typeId || 0;
        const key = exId > 0 ? `${exId}-${typeId}` : `${typeId}-${rawExName.toLowerCase()}`;
        if (dedupedExtrasMap.has(key)) {
          const existing = dedupedExtrasMap.get(key);
          existing.qty = (existing.qty || 1) + (ex.qty || 1);
        } else {
          dedupedExtrasMap.set(key, { ...ex, qty: ex.qty || 1 });
        }
      });

      Array.from(dedupedExtrasMap.values()).forEach(ex => {
        const rawExPrice = Number(ex.price || 0);
        let exUnitPrice = rawExPrice;
        if (isVatActive && vatRatio > 0 && vatRatio < 1) {
          if (isTaxInclusive && !isViewInclusive) {
            exUnitPrice = rawExPrice / vatRatio;
          } else if (!isTaxInclusive && isViewInclusive) {
            exUnitPrice = rawExPrice * vatRatio;
          }
        }
        const exName  = `  + ${(ex.name || "EXTRA").toUpperCase()}`;
        const exAmt   = fmt(exUnitPrice * (ex.qty || 1));
        displaySubTotal += parseFloat(exAmt);
        markup += itemLine(exName, ex.qty || 1, exAmt) + "\n";
      });
    }

    // Modifiers (no price, just name note)
    if (item.modifiers && item.modifiers.length > 0) {
      const dedupedModsMap = new Map<string, any>();
      item.modifiers.forEach(mod => {
        const rawModName = (mod.name || (mod as any).modifierName || "").trim();
        if (!rawModName) return;
        const modId = mod.id || (mod as any).modifierId || 0;
        const typeId = mod.typeId || 0;
        const key = modId > 0 ? `${modId}-${typeId}` : `${typeId}-${rawModName.toLowerCase()}`;
        if (dedupedModsMap.has(key)) {
          const existing = dedupedModsMap.get(key);
          existing.qty = (existing.qty || 1) + (mod.qty || 1);
        } else {
          dedupedModsMap.set(key, { ...mod, qty: mod.qty || 1 });
        }
      });

      Array.from(dedupedModsMap.values()).forEach(mod => {
        const rawTypeName = (mod.typeName || (mod as any).modifierTypeName || (mod.typeId ? getModifierTypeNameById(mod.typeId) : "") || "").trim();
        const rawModName = (mod.name || (mod as any).modifierName || "MODIFIER").trim();
        const typeUpper = rawTypeName.toUpperCase();
        const nameUpper = rawModName.toUpperCase();
        const qtyPart = (mod.qty && mod.qty > 1) ? `${mod.qty} x ` : "";

        let text = "";
        if (typeUpper) {
          if (nameUpper.startsWith(`${typeUpper}:`)) {
            text = nameUpper;
          } else if (nameUpper.startsWith(typeUpper)) {
            const rest = nameUpper.slice(typeUpper.length).replace(/^[:\s-]+/, "").trim();
            text = rest ? `${typeUpper}: ${qtyPart}${rest}` : `${typeUpper}: ${qtyPart}`;
          } else {
            text = `${typeUpper}: ${qtyPart}${nameUpper}`;
          }
        } else {
          text = `${qtyPart}${nameUpper}`;
        }

        markup += `[L]  * ${text}\n`;
      });
    }

    // Messages / Notes
    if (item.messages && item.messages.length > 0) {
      const seenMsgs = new Set<string>();
      const dedupedMsgs = item.messages.filter((msg: any) => {
        const k = String(msg.name || "").trim().toLowerCase();
        if (!k || seenMsgs.has(k)) return false;
        seenMsgs.add(k);
        return true;
      });
      dedupedMsgs.forEach(msg => {
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
  const authoritativeVatAmount = (data.vatAmount !== undefined && !isNaN(Number(data.vatAmount))) ? Number(data.vatAmount) : (rawVat > 0 ? rawVat : 0);

  let vatAmount = 0;
  if (isVatActive) {
    const computedVat = data.vatAmount !== undefined
      ? Number(data.vatAmount)
      : (authoritativeVatAmount > 0 ? authoritativeVatAmount : Math.max(0, data.netAmount - displaySubTotal - (data.serviceCharge || 0) - (data.levy || 0) - (data.deliveryCharge || 0)));
    vatAmount  = parseFloat(fmt(Math.max(0, computedVat)));
  }

  const netTaxableBase = Math.max(
    0,
    Number(data.netAmount || 0) -
      Number(vatAmount || 0) -
      Number(data.serviceCharge || 0) -
      Number(data.levy || 0) -
      Number(data.deliveryCharge || 0)
  );

  const subTotalBeforeDiscount =
    hasAuthoritativeTotals && Math.abs(authoritativeSubTotal - (netTaxableBase + (totalDiscount > 0 ? totalDiscount : 0))) < 0.05
      ? authoritativeSubTotal
      : hasAuthoritativeTotals && Math.abs(authoritativeSubTotal - netTaxableBase) < 0.05
      ? authoritativeSubTotal + (totalDiscount > 0 ? totalDiscount : 0)
      : (netTaxableBase + (totalDiscount > 0 ? totalDiscount : 0));
  markup += totalsLine(isBillArabic ? "Sub Total (المجموع الفرعي)" : "Sub Total", fmt(subTotalBeforeDiscount)) + "\n";
  if (totalDiscount > 0) {
    markup += totalsLine(isBillArabic ? "Discount (الخصم)" : "Discount", `-${fmt(totalDiscount)}`) + "\n";
  }
  if ((data.serviceCharge || 0) > 0) markup += totalsLine(isBillArabic ? "Service Charge (رسوم الخدمة)" : "Service Charge", fmt(data.serviceCharge)) + "\n";
  if ((data.levy || 0) > 0) markup += totalsLine(isBillArabic ? "Levy (5%) (الضريبة الانتقائية)" : "Levy (5%)", fmt(data.levy)) + "\n";
  if ((isDelivery || (data.deliveryCharge && data.deliveryCharge > 0))) {
    markup += totalsLine(isBillArabic ? "Delivery Charge (رسوم التوصيل)" : "Delivery Charge", fmt(data.deliveryCharge || 0)) + "\n";
  }
  if (isVatActive || vatAmount > 0) markup += totalsLine(isBillArabic ? "VAT Amount (مبلغ الضريبة)" : "VAT Amount", fmt(vatAmount)) + "\n";

  markup += `[L]${DASH_SEP}\n`;
  const grandTotalLabel = isBillArabic ? "GRAND TOTAL (المجموع الكلي)" : "GRAND TOTAL";
  markup += totalsLine(grandTotalLabel, fmt(data.netAmount), true) + "\n";

  // ── Payments ─────────────────────────────────────────────────────────────────
  if (data.payments && data.payments.length > 0) {
    markup += `[L]${DASH_SEP}\n`;
    data.payments.forEach(p => {
      const pAr = isBillArabic && getPaymodeArabic(p.name) ? ` (${getPaymodeArabic(p.name)})` : "";
      markup += totalsLine(`${p.name}${pAr}`, fmt(p.amount)) + "\n";
    });
  }
  if (data.changeAmount !== undefined && Number(data.changeAmount) > 0) {
    markup += totalsLine(isBillArabic ? "Change (المبلغ المتبقي)" : "Change", fmt(data.changeAmount), true) + "\n";
  }

  // ── VAT table (if enabled) ────────────────────────────────────────────────
  if (isVatActive || vatAmount > 0) {
    markup += `[L]${DASH_SEP}\n`;
    markup += `[L]<b>${padRight("VAT Code", 12)}${padLeft("Excl Amt", 12)}${padLeft("VAT Amt", 12)}${padLeft("Net Amt", 12)}</b>\n`;
    markup += `[L]${DASH_SEP}\n`;
    const exclAmt = fmt(data.netAmount - vatAmount);
    markup += `[L]${padRight("10%", 12)}${padLeft(exclAmt, 12)}${padLeft(fmt(vatAmount), 12)}${padLeft(fmt(data.netAmount), 12)}\n`;
    markup += `[L]${DASH_SEP}\n`;
  }

  // ── Delivery details (ONLY for Delivery orders) ─────────────────────────
  const keepChangeVal = (data.change || data.keepChanges || "").trim();
  const hasValidKeepChange = keepChangeVal !== "" && keepChangeVal !== "0" && keepChangeVal !== "0.00" && keepChangeVal !== "0.000";

  if (isDelivery && (data.customerName || driverVal || data.contactNo || data.callBack || hasValidKeepChange || data.flatNo || data.buildingNo || data.blockNo || data.roadNo || data.area || data.address || data.providerNo)) {
    markup += `[L]${DASH_SEP}\n`;
    markup += `[C]<b>DELIVERY DETAILS</b>\n`;
    markup += `[L]${DASH_SEP}\n`;
    if (data.contactNo)  markup += twoCol("Mob No",      data.contactNo)  + "\n";
    if (data.callBack)   markup += twoCol("Call Back",    data.callBack)   + "\n";
    if (hasValidKeepChange) markup += twoCol("Keep Change", keepChangeVal) + "\n";
    if (data.customerName) markup += twoCol("Customer",  data.customerName) + "\n";
    if (driverVal)       markup += twoCol("Driver",       driverVal)       + "\n";
    if (data.flatNo)     markup += twoCol("Flat No",     data.flatNo)     + "\n";
    if (data.buildingNo) markup += twoCol("Building",    data.buildingNo) + "\n";
    if (data.blockNo)    markup += twoCol("Block",       data.blockNo)    + "\n";
    if (data.roadNo)     markup += twoCol("Road",        data.roadNo)     + "\n";
    if (data.area)       markup += twoCol("Area",        data.area)       + "\n";
    if (data.address && !data.flatNo && !data.buildingNo && !data.roadNo && !data.blockNo) markup += twoCol("Address", data.address) + "\n";
    if (data.providerNo) markup += twoCol("Provider No", data.providerNo) + "\n";
  }

  // ── Footer ────────────────────────────────────────────────────────────────
  markup += `[L]${DASH_SEP}\n`;
  markup += `[C]<b>Order No: ${formatOrderNo(data.orderNo)}</b>\n`;
  markup += `[C]Print Time: ${dateStr} ${timeStr}\n`;
  const dynamicFooterMarkup = getCompanyFooter();
  if (dynamicFooterMarkup) {
    markup += dynamicFooterMarkup;
  }
  markup += `[L] \n[L] \n`; // feed before cut

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
  const decimalPart = parseInt(localStorage.getItem('decimalPart') || '3', 10);
  const fmt = (val: any) => Number(val || 0).toFixed(decimalPart);

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

  const orderTypeArabicMap: Record<string, string> = {
    "DINE IN": "محلي",
    "TAKE OUT": "سفري",
    "DELIVERY": "توصيل",
    "DRIVE THRU": "طلبات السيارات",
    "PROVIDERS": "مزودي الخدمة",
    "COMING": "قادم",
  };
  const orderTypeAr = orderTypeArabicMap[orderTypeStr] || "";

  const isDineIn = orderTypeStr === "DINE IN";
  const isDelivery = orderTypeStr === "DELIVERY" || Boolean(data.flatNo || data.buildingNo || data.blockNo || data.roadNo || data.area || data.address);

  const isMasterKot = Boolean(data.isMaster);
  let defaultTitle = isMasterKot ? "MASTER KOT" : "KOT";
  let rawTitle = (data.headerTitle || defaultTitle).toUpperCase();
  if (isMasterKot && rawTitle === "KOT") {
    rawTitle = "MASTER KOT";
  }

  let kotTitleDisplay = rawTitle;
  if (isKotArabic) {
    if (rawTitle === "MASTER KOT") {
      kotTitleDisplay = "MASTER KOT / طلب المطبخ الرئيسي";
    } else if (rawTitle === "UPDATE MASTER KOT") {
      kotTitleDisplay = "UPDATE MASTER KOT / تعديل طلب المطبخ الرئيسي";
    } else if (rawTitle === "KOT") {
      kotTitleDisplay = "KOT / طلب المطبخ";
    } else if (rawTitle === "UPDATE KOT") {
      kotTitleDisplay = "UPDATE KOT / تعديل طلب المطبخ";
    } else if (rawTitle.includes("VOID")) {
      kotTitleDisplay = `${rawTitle} / أصناف ملغاة`;
    }
  }

  let markup = "";

  // ── KOT Company Header ───────────────────────────────────────────────
  const showCompanyHdr = data.companyNameKot ?? isCompanyNameKotEnabled();
  if (showCompanyHdr) {
    const companyHdr = getCompanyHeader();
    if (companyHdr) {
      markup += companyHdr;
    } else {
      const fallbackName = localStorage.getItem("companyName") || localStorage.getItem("systemBranchName") || localStorage.getItem("branchName") || "";
      if (fallbackName) {
        markup += `[C]<b><font size='big'>${fallbackName}</font></b>\n`;
      }
    }
  }

  // ── KOT Header ──────────────────────────────────────────────────────────────
  markup += `[C]${SEPARATOR}\n`;
  markup += `[C]<b><font size='big'>${kotTitleDisplay}</font></b>\n`;
  markup += `[C]${orderTypeStr}${isKotArabic && orderTypeAr ? ` (${orderTypeAr})` : ''}\n`;
  markup += `[L]${SEPARATOR}\n`;

  const kotOrdLbl = isKotArabic ? "Order (رقم الطلب)" : "Order";
  const kotTktLbl = isKotArabic ? "Ticket (رقم التذكرة)" : "Ticket";
  const kotDateLbl = isKotArabic ? "Date (التاريخ)" : "Date";
  const kotTimeLbl = isKotArabic ? "Time (الوقت)" : "Time";
  const kotWaitLbl = isKotArabic ? (isDineIn ? "Waiter (النادل)" : "Employee (الموظف)") : (isDineIn ? "Waiter" : "Employee");
  const kotCntLbl = isKotArabic ? "Counter (الكاونتر)" : "Counter";
  const kotSecLbl = isKotArabic ? "Section (القسم)" : "Section";
  const kotTblLbl = isKotArabic ? "Table (الطاولة)" : "Table";

  markup += twoCol(`${kotOrdLbl}: ${formatOrderNo(data.orderNo || "")}`, `${kotTktLbl}: #${data.ticketNo || ""}`) + "\n";
  markup += twoCol(`${kotDateLbl}: ${dateStr || ""}`, `${kotTimeLbl}: ${timeStr || ""}`) + "\n";
  markup += twoCol(`${kotWaitLbl}: ${data.waiter || "Cashier"}`, `${kotCntLbl}: ${data.counter || "Main"}`) + "\n";

  if (isDineIn) {
    markup += twoCol(`${kotSecLbl}: ${data.section || "Main"}`, `${kotTblLbl}: ${data.table || "T1"}`) + "\n";
  }
  if (data.vehicleNo)   markup += `[L]${isKotArabic ? "Vehicle No (المركبة)" : "Vehicle No"}: ${data.vehicleNo}\n`;
  if (data.customerName) markup += `[L]${isKotArabic ? "Customer (العميل)" : "Customer"}: ${data.customerName}\n`;
  if (isDelivery) {
    const kotKeepChange = (data.change || data.keepChanges || "").trim();
    const hasKotKeepChange = kotKeepChange !== "" && kotKeepChange !== "0" && kotKeepChange !== "0.00" && kotKeepChange !== "0.000";
    const driverVal = (data.driverName || data.driver || "").trim();
    if (data.contactNo)    markup += `[L]${isKotArabic ? "Mob No (رقم الجوال)" : "Mob No"}: ${data.contactNo}\n`;
    if (data.callBack)     markup += `[L]${isKotArabic ? "Call Back (معاودة الاتصال)" : "Call Back"}: ${data.callBack}\n`;
    if (hasKotKeepChange)  markup += `[L]${isKotArabic ? "Keep Change (الباقي)" : "Keep Change"}: ${kotKeepChange}\n`;
    if (driverVal)         markup += `[L]${isKotArabic ? "Driver (السائق)" : "Driver"}: ${driverVal}\n`;
    if (data.flatNo)       markup += `[L]${isKotArabic ? "Flat No (شقة)" : "Flat No"}: ${data.flatNo}\n`;
    if (data.buildingNo)   markup += `[L]${isKotArabic ? "Building (مبنى)" : "Building"}: ${data.buildingNo}\n`;
    if (data.blockNo)      markup += `[L]${isKotArabic ? "Block (مجمع)" : "Block"}: ${data.blockNo}\n`;
    if (data.roadNo)       markup += `[L]${isKotArabic ? "Road (طريق)" : "Road"}: ${data.roadNo}\n`;
    if (data.area)         markup += `[L]${isKotArabic ? "Area (المنطقة)" : "Area"}: ${data.area}\n`;
    if (data.address && !data.flatNo && !data.buildingNo && !data.roadNo && !data.blockNo) {
      markup += `[L]${isKotArabic ? "Address (العنوان)" : "Address"}: ${data.address}\n`;
    }
  }

  const kotHeaderStyle = resolveKotHeaderStyle(data.kotHeader);
  const cartVatSum = cartDetails.reduce((sum, item: any) => sum + (item.vatAmount || 0), 0);
  const rawVat = (data.vatAmount && data.vatAmount > 0) ? data.vatAmount : (cartVatSum > 0 ? cartVatSum : 0);
  const isVatActive = data.enableVat === true || rawVat > 0 || cartVatSum > 0;
  const totalNet = Number(data.netAmount || 0);
  const authoritativeSubTotal = (data.subTotal !== undefined && Number(data.subTotal) > 0) ? Number(data.subTotal) : 0;
  const authoritativeVatAmount = (data.vatAmount !== undefined && !isNaN(Number(data.vatAmount))) ? Number(data.vatAmount) : (rawVat > 0 ? rawVat : 0);

  const vatRatio = (authoritativeSubTotal > 0 && authoritativeVatAmount > 0 && totalNet > 0 && Math.abs((authoritativeSubTotal + authoritativeVatAmount) - totalNet) < 0.05)
    ? (authoritativeSubTotal / totalNet)
    : (isVatActive ? (1 / 1.10) : 1);

  const printTaxSetting = resolveKotPrintTaxSetting(data);
  const viewTaxSetting = resolveViewTaxSetting(data as any);
  const isTaxInclusive = isVatActive ? (printTaxSetting === "Inclusive") : false;
  const isViewInclusive = viewTaxSetting === "Inclusive";

  markup += `[L]${SEPARATOR}\n`;
  if (kotHeaderStyle.startsWith("DESCRIPTION")) {
    const qCol = padLeft("Qty", 4);
    const aCol = padLeft("Amt", 8);
    const dWidth = Math.max(10, LINE_WIDTH - qCol.length - aCol.length - 2);
    markup += `[L]<b>${padRight("Description", dWidth)} ${qCol} ${aCol}</b>\n`;
    if (isKotArabic) {
      markup += `[L]<b>${padRight("الصنف", dWidth)} ${padLeft("الكمية", 4)} ${padLeft("المبلغ", 8)}</b>\n`;
    }
  } else {
    const qCol = padRight("Qty", 4);
    const aCol = padLeft("Amt", 8);
    const dWidth = Math.max(10, LINE_WIDTH - qCol.length - aCol.length - 2);
    markup += `[L]<b>${qCol} ${padRight("Description", dWidth)} ${aCol}</b>\n`;
    if (isKotArabic) {
      markup += `[L]<b>${padRight("الكمية", 4)} ${padRight("الصنف", dWidth)} ${padLeft("المبلغ", 8)}</b>\n`;
    }
  }
  markup += `[L]${SEPARATOR}\n`;

  const isOrderBillDiscount = Boolean(
    (data as any).isBillDiscount ||
    (cartDetails.length > 0 && cartDetails.some((it: any) => (it.billDiscountAmount && it.billDiscountAmount > 0))) ||
    (
      (data as any).discount && (data as any).discount > 0 && cartDetails.length > 0 && (
        cartDetails.every((it: any) => !it.itemDiscount || it.itemDiscount <= 0.0001) ||
        (
          Number((cartDetails[0] as any).discPer ?? (cartDetails[0] as any).DiscPer ?? 0) > 0 &&
          cartDetails.every((it: any) => Number((it as any).discPer ?? (it as any).DiscPer ?? 0) === Number((cartDetails[0] as any).discPer ?? (cartDetails[0] as any).DiscPer ?? 0))
        )
      )
    )
  );

  // ── KOT Items ───────────────────────────────────────────────────────────────
  cartDetails.forEach((item) => {
    const name = formatItemDisplayName(
      item.product?.name || `Item #${item.productId}`,
      item.variantName
    ).toUpperCase();
    const qty = item.quantity;

    const origUnitPrice = Number(item.price ?? item.product?.price ?? 0);
    const itemBaseAmount: number | undefined = (item as any).baseAmount;
    const itemLineTotal: number | undefined = (item as any).lineTotal;
    const itemVat: number = Number((item as any).vatAmount || 0);
    const totalItemDisc = isOrderBillDiscount ? 0 : Number((item as any).itemDiscount ?? (item as any).discAmount ?? 0);

    let extrasSum = 0;
    if (item.extras && item.extras.length > 0) {
      item.extras.forEach(ex => extrasSum += (Number(ex.price || 0) * (ex.qty || 1)));
    }

    const itemLineNetAmount: number | undefined = (item as any).lineNetAmount ?? (item as any).LineNetAmount;
    const knownBasePrice = (item as any).basePrice !== undefined && Number((item as any).basePrice) > 0
      ? Number((item as any).basePrice)
      : (itemBaseAmount !== undefined && itemBaseAmount > 0 && qty > 0 ? (itemBaseAmount / qty) : undefined);

    const catalogExclusivePrice = knownBasePrice !== undefined
      ? knownBasePrice
      : (isViewInclusive
          ? ((isVatActive && vatRatio > 0 && vatRatio < 1) ? (origUnitPrice * vatRatio) : origUnitPrice)
          : origUnitPrice);

    const catalogInclusivePrice = knownBasePrice !== undefined
      ? ((isVatActive && vatRatio > 0 && vatRatio < 1) ? (knownBasePrice / vatRatio) : knownBasePrice)
      : (isViewInclusive
          ? origUnitPrice
          : ((isVatActive && vatRatio > 0 && vatRatio < 1) ? (origUnitPrice / vatRatio) : origUnitPrice));

    let exclusiveUnitPrice: number;
    let exclusiveProductLineAmount: number;

    if (isOrderBillDiscount) {
      exclusiveUnitPrice = catalogExclusivePrice > 0 ? catalogExclusivePrice : origUnitPrice;
      exclusiveProductLineAmount = exclusiveUnitPrice * qty;
    } else {
      const netValueVal = (item as any).netValue !== undefined ? Number((item as any).netValue) : undefined;

      if (netValueVal !== undefined && qty > 0) {
        exclusiveProductLineAmount = Math.max(0, netValueVal);
        exclusiveUnitPrice = catalogExclusivePrice > 0 ? catalogExclusivePrice : Math.max(0, (netValueVal + totalItemDisc) / qty);
      } else if (itemBaseAmount !== undefined && qty > 0) {
        exclusiveUnitPrice = catalogExclusivePrice > 0 ? catalogExclusivePrice : (itemBaseAmount / qty);
        exclusiveProductLineAmount = Math.max(0, itemBaseAmount - totalItemDisc);
      } else if (!isViewInclusive && itemLineTotal !== undefined && itemLineTotal > 0) {
        exclusiveProductLineAmount = Math.max(0, itemLineTotal - extrasSum);
        exclusiveUnitPrice = catalogExclusivePrice > 0 ? catalogExclusivePrice : (qty > 0 ? Math.max(0, (exclusiveProductLineAmount + totalItemDisc) / qty) : origUnitPrice);
      } else if (isViewInclusive && itemLineTotal !== undefined && itemLineTotal > 0) {
        exclusiveProductLineAmount = itemVat > 0
          ? Math.max(0, itemLineTotal - extrasSum - itemVat)
          : Math.max(0, (itemLineTotal - extrasSum) * vatRatio);
        exclusiveUnitPrice = catalogExclusivePrice > 0 ? catalogExclusivePrice : (qty > 0 ? Math.max(0, (exclusiveProductLineAmount + totalItemDisc) / qty) : origUnitPrice);
      } else {
        exclusiveUnitPrice = catalogExclusivePrice > 0 ? catalogExclusivePrice : origUnitPrice;
        exclusiveProductLineAmount = Math.max(0, (exclusiveUnitPrice * qty) - totalItemDisc);
      }
    }

    let lineInclusiveAmt: number;
    let inclusiveUnitPrice: number;

    if (isOrderBillDiscount) {
      inclusiveUnitPrice = catalogInclusivePrice > 0 ? catalogInclusivePrice : origUnitPrice;
      lineInclusiveAmt = inclusiveUnitPrice * qty;
    } else {
      if (itemLineNetAmount !== undefined && itemLineNetAmount > 0) {
        lineInclusiveAmt = Math.max(0, itemLineNetAmount - extrasSum);
        inclusiveUnitPrice = catalogInclusivePrice > 0 ? catalogInclusivePrice : (qty > 0 ? Math.max(0, (lineInclusiveAmt + totalItemDisc) / qty) : origUnitPrice);
      } else if (isViewInclusive && itemLineTotal !== undefined && itemLineTotal > 0) {
        lineInclusiveAmt = Math.max(0, itemLineTotal - extrasSum);
        inclusiveUnitPrice = catalogInclusivePrice > 0 ? catalogInclusivePrice : (qty > 0 ? Math.max(0, (lineInclusiveAmt + totalItemDisc) / qty) : origUnitPrice);
      } else if (!isViewInclusive && itemLineTotal !== undefined && itemLineTotal > 0) {
        lineInclusiveAmt = itemVat > 0
          ? Math.max(0, itemLineTotal - extrasSum) + itemVat
          : (isVatActive && vatRatio > 0 && vatRatio < 1 ? Math.max(0, itemLineTotal - extrasSum) / vatRatio : Math.max(0, itemLineTotal - extrasSum));
        inclusiveUnitPrice = catalogInclusivePrice > 0 ? catalogInclusivePrice : (qty > 0 ? Math.max(0, (lineInclusiveAmt + totalItemDisc) / qty) : origUnitPrice);
      } else if (itemVat > 0) {
        lineInclusiveAmt = exclusiveProductLineAmount + itemVat;
        inclusiveUnitPrice = catalogInclusivePrice > 0 ? catalogInclusivePrice : (qty > 0 ? Math.max(0, (lineInclusiveAmt + totalItemDisc) / qty) : origUnitPrice);
      } else if (isVatActive && (authoritativeVatAmount > 0 || data.enableVat) && vatRatio > 0 && vatRatio < 1) {
        inclusiveUnitPrice = catalogInclusivePrice > 0 ? catalogInclusivePrice : origUnitPrice;
        lineInclusiveAmt = Math.max(0, (inclusiveUnitPrice * qty) - totalItemDisc);
      } else {
        inclusiveUnitPrice = catalogInclusivePrice > 0 ? catalogInclusivePrice : origUnitPrice;
        lineInclusiveAmt = Math.max(0, (origUnitPrice * qty) - totalItemDisc);
      }
    }

    const finalRate = isTaxInclusive ? inclusiveUnitPrice : exclusiveUnitPrice;
    const finalAmt = isTaxInclusive ? lineInclusiveAmt : exclusiveProductLineAmount;
    const amtStr = padLeft(fmt(finalAmt), 8);

    if (kotHeaderStyle.startsWith("DESCRIPTION")) {
      const qStr = padLeft(`x${qty}`, 4);
      const maxName = Math.max(10, LINE_WIDTH - qStr.length - amtStr.length - 2);
      const nameStr = padRight(trunc(name, maxName), maxName);
      markup += `[L]${nameStr} ${qStr} ${amtStr}\n`;
    } else {
      const qStr = padRight(`x${qty}`, 4);
      const maxName = Math.max(10, LINE_WIDTH - qStr.length - amtStr.length - 2);
      const nameStr = padRight(trunc(name, maxName), maxName);
      markup += `[L]${qStr} ${nameStr} ${amtStr}\n`;
    }

    if (qty > 1 && finalRate > 0) {
      markup += `[L]  @ ${fmt(finalRate)}\n`;
    }

    const altArabicName = isKotArabic ? getAlternativeArabicName(item) : "";
    if (altArabicName) {
      markup += `[R]${altArabicName}\n`;
    }

    // Extras
    if (item.extras && item.extras.length > 0) {
      const dedupedExtrasMap = new Map<string, any>();
      item.extras.forEach(ex => {
        const rawExName = (ex.name || (ex as any).modifierName || "").trim();
        if (!rawExName) return;
        const exId = ex.id || (ex as any).modifierId || 0;
        const typeId = ex.typeId || 0;
        const key = exId > 0 ? `${exId}-${typeId}` : `${typeId}-${rawExName.toLowerCase()}`;
        if (dedupedExtrasMap.has(key)) {
          const existing = dedupedExtrasMap.get(key);
          existing.qty = (existing.qty || 1) + (ex.qty || 1);
        } else {
          dedupedExtrasMap.set(key, { ...ex, qty: ex.qty || 1 });
        }
      });

      Array.from(dedupedExtrasMap.values()).forEach(ex => {
        const rawExPrice = Number(ex.price || 0);
        let exUnitPrice = rawExPrice;
        if (isVatActive && vatRatio > 0 && vatRatio < 1) {
          if (isTaxInclusive && !isViewInclusive) {
            exUnitPrice = rawExPrice / vatRatio;
          } else if (!isTaxInclusive && isViewInclusive) {
            exUnitPrice = rawExPrice * vatRatio;
          }
        }
        const exLineAmt = exUnitPrice * (ex.qty || 1);
        const exAmtStr = rawExPrice > 0 ? padLeft(fmt(exLineAmt), 8) : "";
        const exName = `  + ${(ex.name || (ex as any).modifierName || "EXTRA").toUpperCase()}`;
        const exQty = padLeft(String(ex.qty || 1), 4);
        const maxExName = Math.max(8, LINE_WIDTH - exQty.length - (exAmtStr ? exAmtStr.length + 1 : 0) - 1);
        markup += `[L]${padRight(trunc(exName, maxExName), maxExName)} ${exQty}${exAmtStr ? ` ${exAmtStr}` : ""}\n`;
      });
    }

    // Modifiers
    if (item.modifiers && item.modifiers.length > 0) {
      const dedupedModsMap = new Map<string, any>();
      item.modifiers.forEach(mod => {
        const rawModName = (mod.name || (mod as any).modifierName || "").trim();
        if (!rawModName) return;
        const modId = mod.id || (mod as any).modifierId || 0;
        const typeId = mod.typeId || 0;
        const key = modId > 0 ? `${modId}-${typeId}` : `${typeId}-${rawModName.toLowerCase()}`;
        if (dedupedModsMap.has(key)) {
          const existing = dedupedModsMap.get(key);
          existing.qty = (existing.qty || 1) + (mod.qty || 1);
        } else {
          dedupedModsMap.set(key, { ...mod, qty: mod.qty || 1 });
        }
      });

      Array.from(dedupedModsMap.values()).forEach(mod => {
        const rawTypeName = (mod.typeName || (mod as any).modifierTypeName || (mod.typeId ? getModifierTypeNameById(mod.typeId) : "") || "").trim();
        const rawModName = (mod.name || (mod as any).modifierName || "").trim();
        const typeUpper = rawTypeName.toUpperCase();
        const nameUpper = rawModName.toUpperCase();
        const qtyPart = (mod.qty && mod.qty > 1) ? `${mod.qty} x ` : "";

        let text = "";
        if (typeUpper) {
          if (nameUpper.startsWith(`${typeUpper}:`)) {
            text = nameUpper;
          } else if (nameUpper.startsWith(typeUpper)) {
            const rest = nameUpper.slice(typeUpper.length).replace(/^[:\s-]+/, "").trim();
            text = rest ? `${typeUpper}: ${qtyPart}${rest}` : `${typeUpper}: ${qtyPart}`;
          } else {
            text = `${typeUpper}: ${qtyPart}${nameUpper}`;
          }
        } else {
          text = `${qtyPart}${nameUpper}`;
        }

        markup += `[L]  * ${text}\n`;
      });
    }

    // Messages / Kitchen Notes
    if (item.messages && item.messages.length > 0) {
      const seenMsgs = new Set<string>();
      const dedupedMsgs = item.messages.filter((msg: any) => {
        const k = String(msg.name || "").trim().toLowerCase();
        if (!k || seenMsgs.has(k)) return false;
        seenMsgs.add(k);
        return true;
      });
      dedupedMsgs.forEach(msg => {
        markup += `[L]  NOTE: ${(msg.name || "").toUpperCase()}\n`;
      });
    }
  });

  markup += `[L]${SEPARATOR}\n`;
  markup += `[L] \n[L] \n`; // feed before cut

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
      markup += `[L] \n`;
    } else if (line.startsWith("===") || line.startsWith("---")) {
      markup += `[L]${SEPARATOR}\n`;
    } else {
      markup += `[L]${line}\n`;
    }
  });

  markup += `[L]${SEPARATOR}\n`;
  markup += `[L] \n[L] \n`;
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

  // Start & End date/times, User, Counter
  const user = String(
    (data as any).user 
    || (data as any).userName 
    || (data as any).cashier 
    || (data as any).cashierName 
    || (gs as any).user 
    || (gs as any).userName 
    || (gs as any).cashier 
    || (gs as any).cashierName 
    || (data as any).shiftInfo?.user 
    || (data as any).shiftInfo?.userName 
    || (data as any).shift?.user 
    || (data as any).shift?.userName 
    || (data.header as any)?.user 
    || (reportType === 'SHIFTEND' ? (localStorage.getItem("userName") || sessionStorage.getItem("backoffice_userName") || "") : "")
  ).trim();

  const counter = String(
    (data as any).counter 
    || (data as any).counterName 
    || (gs as any).counter 
    || (gs as any).counterName 
    || (data as any).shiftInfo?.counter 
    || (data as any).shiftInfo?.counterName 
    || (data as any).shift?.counter 
    || (data as any).shift?.counterName 
    || (data.header as any)?.counter 
    || (reportType === 'SHIFTEND' ? (localStorage.getItem("systemCounterName") || localStorage.getItem("counterName") || (localStorage.getItem("systemCounterId") ? `Counter ${localStorage.getItem("systemCounterId")}` : "")) : "")
  ).trim();

  markup += twoCol("Start Date:", formatDate(gs.startDate)) + "\n";
  markup += twoCol("Start Time:", formatTime(gs.startDate)) + "\n";
  markup += twoCol("End Date:", formatDate(gs.endDate)) + "\n";
  markup += twoCol("End Time:", formatTime(gs.endDate)) + "\n";
  if (user && user !== 'undefined' && user !== 'null') markup += twoCol("User:", user) + "\n";
  if (counter && counter !== 'undefined' && counter !== 'null') markup += twoCol("Counter:", counter) + "\n";
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

  // Sales Details
  const salesDetails = (data as any).salesDetails || {};
  const saleAmount = Number(salesDetails.saleAmount ?? data.salesSummary?.sales ?? 0);
  const complimentary = Number(salesDetails.complimentary ?? (data as any).complimentary ?? 0);
  const discount = Number(salesDetails.discount ?? (data as any).discount ?? 0);
  const deliveryCharge = Number(salesDetails.deliveryCharge ?? data.salesSummary?.deliveryCharge ?? 0);
  const taxSummaryList = Array.isArray(data.taxSummary) ? data.taxSummary : [];
  const taxSummaryVatTotal = taxSummaryList.reduce((sum, t) => sum + (Number(t.vatAmount) || 0), 0);
  const vatAmount = Number(
    salesDetails.vatAmount 
    ?? salesDetails.vat 
    ?? salesDetails.tax 
    ?? salesDetails.taxAmount 
    ?? data.salesSummary?.vatAmount 
    ?? taxSummaryVatTotal 
    ?? 0
  );
  const calculatedTotalSale = saleAmount + deliveryCharge + (taxSummaryVatTotal > 0 ? taxSummaryVatTotal : vatAmount);
  const totalSale = salesDetails.totalSale != null && Number(salesDetails.totalSale) >= calculatedTotalSale
    ? Number(salesDetails.totalSale)
    : calculatedTotalSale;

  markup += `[C]<b>SALES DETAILS</b>\n`;
  markup += `[L]${DASH_SEP}\n`;
  markup += twoCol("Sale Amount:", fmt(saleAmount)) + "\n";
  if (deliveryCharge > 0) {
    markup += twoCol("Delivery Charge:", fmt(deliveryCharge)) + "\n";
  }
  if (taxSummaryList.length > 0 && taxSummaryVatTotal > 0) {
    taxSummaryList.forEach(t => {
      const rawName = (t.vatName || '').trim();
      const label = rawName 
        ? (rawName.toLowerCase().includes('vat') || rawName.toLowerCase().includes('tax') ? rawName : `VAT ${rawName}`)
        : 'VAT Amount:';
      markup += twoCol(label.endsWith(':') ? label : `${label}:`, fmt(t.vatAmount)) + "\n";
    });
  } else {
    markup += twoCol("VAT Amount:", fmt(vatAmount)) + "\n";
  }
  markup += twoCol("Complimentary:", fmt(complimentary)) + "\n";
  markup += twoCol("Discount:", fmt(discount)) + "\n";
  markup += twoCol("Total Sale:", fmt(totalSale)) + "\n";
  markup += `[L]${DASH_SEP}\n`;

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

  // Sales by Product — 3 columns (Product, Qty, Total)
  const prodList = (data as any).products || (data as any).productSummary || [];
  if (config.showProduct && prodList.length > 0) {
    markup += `[C]<b>SALES BY PRODUCT</b>\n`;
    markup += `[L]${DASH_SEP}\n`;
    markup += threeCol("Product", "Qty", "Total", true) + "\n";
    markup += `[L]${DASH_SEP}\n`;
    let prodTotal = 0;
    let prodQtyTotal = 0;
    prodList.forEach((p: any) => {
      const name = p.productName || p.product || p.name || "Unknown";
      const qty = Number(p.qty || p.quantity || 0);
      const total = Number(p.total || p.amount || 0);
      prodTotal += total;
      prodQtyTotal += qty;
      markup += threeCol(name, String(qty), fmt(total)) + "\n";
    });
    markup += `[L]${DASH_SEP}\n`;
    markup += threeCol("Total", String(prodQtyTotal), fmt(prodTotal), true) + "\n";
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
  const paymodesList = (data.paymodes && data.paymodes.length > 0) ? data.paymodes : [];
  if (paymodesList.length > 0) {
    const rawTxns: any[] = (data as any).transactions 
      || (data as any).payments 
      || (data as any).paymentDetails 
      || (data as any).paymodeDetails 
      || (data as any).sales 
      || (data as any).salesInvoices 
      || (data as any).orders 
      || (data as any).bills 
      || (data as any).invoices 
      || [];

    const totalSessionTransactions = (data.orderTypes || []).reduce((sum, o) => sum + (Number(o.count) || 0), 0)
      || (data.waiters || []).reduce((sum, w) => sum + (Number(w.count) || 0), 0)
      || Number((data.generalSummary as any)?.totalOrders || (data.generalSummary as any)?.totalSales || (data.generalSummary as any)?.totalBills || (data.salesSummary as any)?.totalOrders || 0);

    const resolvePaymodeCount = (p: any): number => {
      if (!p) return 0;
      const directCandidates = [
        p.count, p.Count,
        p.transactionCount, p.TransactionCount,
        p.txnCount, p.TxnCount,
        p.txn_count, p.Txn_Count,
        p.transCount, p.TransCount,
        p.transactions, p.Transactions,
        p.billCount, p.BillCount,
        p.totalBills, p.TotalBills,
        p.bills, p.Bills,
        p.orderCount, p.OrderCount,
        p.totalOrders, p.TotalOrders,
        p.orders, p.Orders,
        p.noOfTransactions, p.NoOfTransactions,
        p.numberOfTransactions, p.NumberOfTransactions,
        p.noOfBills, p.NoOfBills,
        p.noOfTxns, p.NoOfTxns,
        p.qty, p.Qty,
        p.quantity, p.Quantity,
        p.totalCount, p.TotalCount,
        p.salesCount, p.SalesCount,
        p.invoiceCount, p.InvoiceCount,
        p.invoices, p.Invoices,
        p.paymentCount, p.PaymentCount,
        p.paymentsCount, p.PaymentsCount,
        p.payments, p.Payments,
      ];
      for (const val of directCandidates) {
        if (typeof val === 'number' && !isNaN(val) && val > 0) return val;
        if (typeof val === 'string' && val.trim() !== '' && !isNaN(Number(val)) && Number(val) > 0) return Number(val);
      }
      if (Array.isArray(rawTxns) && rawTxns.length > 0) {
        const pName = (p.paymodeName || p.name || p.mode || '').toString().toLowerCase().trim();
        const pId = p.paymodeId ?? p.id ?? p.code;
        const matched = rawTxns.filter((t: any) => {
          const tName = (t.paymodeName || t.paymode || t.paymentMode || t.mode || t.tender || t.name || '').toString().toLowerCase().trim();
          const tId = t.paymodeId ?? t.tenderId ?? t.id;
          if (pId !== undefined && tId !== undefined && String(pId) === String(tId)) return true;
          if (pName && tName && (pName === tName || tName.includes(pName) || pName.includes(tName))) return true;
          return false;
        });
        if (matched.length > 0) return matched.length;
      }
      if (paymodesList.length === 1 && totalSessionTransactions > 0) {
        return totalSessionTransactions;
      }
      if (Number(p.amount || p.total || 0) > 0) {
        return 1;
      }
      return 0;
    };

    const initialCounts = paymodesList.map((p: any) => resolvePaymodeCount(p));
    const anyExplicitCount = initialCounts.some((c: number) => c > 1);

    if (!anyExplicitCount && totalSessionTransactions > 0 && paymodesList.length > 0) {
      const totalAmount = paymodesList.reduce((sum: number, p: any) => sum + Math.max(0, Number(p.amount || p.total || 0)), 0);
      if (totalAmount > 0) {
        let allocatedTotal = 0;
        paymodesList.forEach((p: any, idx: number) => {
          const amt = Math.max(0, Number(p.amount || p.total || 0));
          if (amt > 0) {
            const share = Math.max(1, Math.round((amt / totalAmount) * totalSessionTransactions));
            initialCounts[idx] = share;
            allocatedTotal += share;
          } else {
            initialCounts[idx] = 0;
          }
        });
        if (allocatedTotal !== totalSessionTransactions && totalSessionTransactions >= paymodesList.length) {
          const maxIdx = paymodesList.reduce((maxI: number, p: any, i: number, arr: any[]) => Number(p.amount || p.total || 0) > Number(arr[maxI].amount || arr[maxI].total || 0) ? i : maxI, 0);
          initialCounts[maxIdx] = Math.max(1, initialCounts[maxIdx] + (totalSessionTransactions - allocatedTotal));
        }
      }
    }

    markup += `[C]<b>PAYMENT SUMMARY</b>\n`;
    markup += `[L]${DASH_SEP}\n`;
    let paymodeTotal = 0;
    let paymodeCountTotal = 0;
    paymodesList.forEach((p, idx) => {
      const count = initialCounts[idx] ?? resolvePaymodeCount(p);
      const amt = Number(p.amount || p.total || 0);
      paymodeTotal += amt;
      paymodeCountTotal += count;
      const name = p.paymodeName || p.name || 'Unknown';
      const label = count > 0 ? `${name} (x${count})` : name;
      markup += twoCol(label, fmt(amt)) + "\n";
    });
    const totalLabel = paymodeCountTotal > 0 ? `Total (x${paymodeCountTotal}):` : "Total:";
    markup += twoCol(totalLabel, fmt(paymodeTotal)) + "\n";
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
  const totalCashIn = (cf.cashSales || 0) + (cf.openingBal || 0) + (cf.payIn || 0);
  const totalCashOut = Number(cf.payOut || 0);
  const netCash = totalCashIn - totalCashOut;
  const difference = (cf.closingBal || 0) - netCash;

  markup += `[C]<b>CASH FLOW</b>\n`;
  markup += `[L]${DASH_SEP}\n`;
  markup += twoCol("CASH:", fmt(cf.cashSales)) + "\n";
  markup += twoCol("Opening Balance:", fmt(cf.openingBal)) + "\n";
  markup += twoCol("Pay In:", fmt(cf.payIn)) + "\n";
  markup += twoCol("Total Cash In:", fmt(totalCashIn)) + "\n";
  markup += twoCol("Pay Out:", fmt(cf.payOut)) + "\n";
  markup += twoCol("Total Cash Out:", fmt(totalCashOut)) + "\n";
  markup += twoCol("Net Cash:", fmt(netCash)) + "\n";
  markup += twoCol("Closing Balance:", fmt(cf.closingBal)) + "\n";
  markup += twoCol("Difference:", fmt(difference)) + "\n";
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


