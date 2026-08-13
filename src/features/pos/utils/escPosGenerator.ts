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
 */
const twoCol = (left: string, right: string, width = LINE_WIDTH): string => {
  const r = String(right);
  const maxLeft = width - r.length - 1;
  const l = trunc(String(left), maxLeft).padEnd(maxLeft);
  return `[L]${l} ${r}`;
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

/** Get company name + address from localStorage */
const getCompanyHeader = (): string => {
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
  const { date: dateStr, time: timeStr } = now();

  const isTakeOut  = data.orderType?.toLowerCase().includes("take");
  const isDriveThru = data.orderType?.toLowerCase().includes("drive");
  const isDineIn   = data.orderType?.toLowerCase().includes("dine");
  const isDelivery = data.orderType?.toLowerCase().includes("delivery");

  let invoiceTitle = data.enableVat ? "SIMPLIFIED TAX INVOICE" : "SIMPLIFIED INVOICE";
  let orderLabel = "GUEST";
  if (isTakeOut)   orderLabel = "GUEST (TAKE OUT)";
  if (isDriveThru) orderLabel = "GUEST (DRIVE THRU)";
  if (isDineIn)    orderLabel = "GUEST (DINE IN)";
  if (isDelivery)  orderLabel = "GUEST (DELIVERY)";
  if (data.isSettlement) orderLabel = isTakeOut ? "(TAKE OUT)" : isDriveThru ? "(DRIVE THRU)" : isDineIn ? "(DINE IN)" : isDelivery ? "(DELIVERY)" : "";

  let markup = "";

  // ── Header ──────────────────────────────────────────────────────────────────
  if (customHeaderLines && customHeaderLines.length > 0) {
    customHeaderLines.forEach(line => { markup += `[C]${line}\n`; });
  } else {
    markup += getCompanyHeader();
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
  let displaySubTotal = 0;

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
    if (baseAmt !== undefined) {
      baseAmt -= extrasSum;
    } else {
      baseAmt = (item.price || item.product?.price || 0) * item.quantity;
    }

    const amt = baseAmt.toFixed(3);
    displaySubTotal += parseFloat(amt);
    markup += itemLine(name, qty, amt) + "\n";

    // Extras
    if (item.extras && item.extras.length > 0) {
      item.extras.forEach(ex => {
        const exName  = `  + ${(ex.name || "EXTRA").toUpperCase()}`;
        const exAmt   = (ex.price * (ex.qty || 1)).toFixed(3);
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
  // Recalculate consistent with guestPrintTemplate.ts logic
  const cartVatSum = cartDetails.reduce((s: number, it: any) => s + (it.vatAmount || 0), 0);
  const rawVat = (data.vatAmount && data.vatAmount > 0) ? data.vatAmount : (cartVatSum > 0 ? cartVatSum : 0);

  displaySubTotal = parseFloat(displaySubTotal.toFixed(3));
  let subTotal = displaySubTotal;
  let vatAmount = 0;
  if (data.enableVat) {
    vatAmount  = parseFloat(rawVat.toFixed(3));
    subTotal   = parseFloat((data.netAmount - vatAmount - (data.serviceCharge || 0) - (data.levy || 0) - (data.deliveryCharge || 0)).toFixed(3));
  }

  markup += totalsLine("Sub Total", subTotal.toFixed(3)) + "\n";
  if ((data.serviceCharge || 0) > 0) markup += totalsLine("Service Charge", (data.serviceCharge).toFixed(3)) + "\n";
  if ((data.levy || 0) > 0) markup += totalsLine("Levy (5%)", (data.levy).toFixed(3)) + "\n";
  if ((isDelivery || (data.deliveryCharge && data.deliveryCharge > 0))) {
    markup += totalsLine("Delivery Charge", (data.deliveryCharge || 0).toFixed(3)) + "\n";
  }
  if (data.enableVat) markup += totalsLine("VAT Amount", vatAmount.toFixed(3)) + "\n";

  markup += `[L]${DASH_SEP}\n`;
  markup += `[L]<b><font size='big'>${padRight("GRAND TOTAL", LINE_WIDTH - 10)}${padLeft(data.netAmount.toFixed(3), 10)}</font></b>\n`;

  // ── Payments ─────────────────────────────────────────────────────────────────
  if (data.payments && data.payments.length > 0) {
    markup += `[L]${DASH_SEP}\n`;
    data.payments.forEach(p => {
      markup += totalsLine(p.name, p.amount.toFixed(3)) + "\n";
    });
  }
  if (data.changeAmount !== undefined && data.changeAmount > 0) {
    markup += totalsLine("Change", data.changeAmount.toFixed(3), true) + "\n";
  }

  // ── VAT table (if enabled) ────────────────────────────────────────────────
  if (data.enableVat) {
    markup += `[L]${DASH_SEP}\n`;
    markup += `[L]<b>${padRight("VAT Code", 14)}${padRight("Excl Amt", 12)}${padRight("VAT Amt", 10)}${padLeft("Net Amt", 12)}</b>\n`;
    markup += `[L]${DASH_SEP}\n`;
    const exclAmt = (data.netAmount - vatAmount).toFixed(3);
    markup += `[L]${padRight("10%", 14)}${padRight(exclAmt, 12)}${padRight(vatAmount.toFixed(3), 10)}${padLeft(data.netAmount.toFixed(3), 12)}\n`;
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

  markup += `[L]${SEPARATOR}\n`;
  markup += `[L]<b>${padRight("Item", LINE_WIDTH - 6)}${padLeft("Qty", 6)}</b>\n`;
  markup += `[L]${SEPARATOR}\n`;

  // ── KOT Items ───────────────────────────────────────────────────────────────
  cartDetails.forEach((item) => {
    let name = (item.product?.name || `Item #${item.productId}`).toUpperCase();
    if (item.variantName && item.variantName.toLowerCase().trim() !== "main") {
      name += ` - ${item.variantName.toUpperCase()}`;
    }

    const qtyStr = padLeft(String(item.quantity), 6);
    const maxName = LINE_WIDTH - qtyStr.length;
    const nameStr = padRight(trunc(name, maxName), maxName);
    markup += `[L]<b>${nameStr}${qtyStr}</b>\n`;

    // Extras
    if (item.extras && item.extras.length > 0) {
      item.extras.forEach(ex => {
        const exName = `  + ${(ex.name || "EXTRA").toUpperCase()}`;
        const exQty = padLeft(String(ex.qty || 1), 6);
        const maxEx = LINE_WIDTH - exQty.length;
        markup += `[L]${padRight(trunc(exName, maxEx), maxEx)}${exQty}\n`;
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
  markup += getCompanyHeader();
  markup += `[C]${SEPARATOR}\n`;
  markup += `[C]<b><font size='big'>${reportType === 'DAYEND' ? 'DAYEND REPORT' : 'SHIFTEND REPORT'}</font></b>\n`;
  markup += `[L]${SEPARATOR}\n`;

  // Start & End date/times
  markup += twoCol("Start Date:", formatDate(gs.startDate)) + "\n";
  markup += twoCol("Start Time:", formatTime(gs.startDate)) + "\n";
  markup += twoCol("End Date:", formatDate(gs.endDate)) + "\n";
  markup += twoCol("End Time:", formatTime(gs.endDate)) + "\n";
  markup += `[L]${DASH_SEP}\n`;

  // Order Summary
  if (data.orderTypes && data.orderTypes.length > 0) {
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

  // Waiter Summary
  if (data.waiters && data.waiters.length > 0) {
    markup += `[C]<b>WAITER SUMMARY</b>\n`;
    markup += `[L]${DASH_SEP}\n`;
    let waiterTotal = 0;
    data.waiters.forEach(w => {
      waiterTotal += w.total;
      markup += twoCol(w.waiter, fmt(w.total)) + "\n";
    });
    markup += twoCol("Total:", fmt(waiterTotal)) + "\n";
    markup += `[L]${DASH_SEP}\n`;
  }

  // Sales by Category
  if (data.categories && data.categories.length > 0) {
    markup += `[C]<b>SALES BY CATEGORY</b>\n`;
    markup += `[L]${DASH_SEP}\n`;
    data.categories.forEach(c => {
      markup += twoCol(`${c.categoryName} (x${c.qty})`, fmt(c.total)) + "\n";
    });
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

