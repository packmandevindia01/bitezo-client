
import type { EndReportData } from "../cashier/services/cashierLogService";
import { getDayEndReportConfig } from "../services/posConfigApi";
import { roundCalc } from "../terminal/utils/billing";

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

/** Format a totals row: label on left, value right-aligned (42 chars) */
const totalsLine = (label: string, value: string, bold = false): string => {
  const v = padLeft(value, 11);
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
  } catch {
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
  const fmt = (val: number | undefined | null) => roundCalc(val, decimalPart).toFixed(decimalPart);

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
  const rawSalesDetails = (data as any).salesDetails;
  const salesDetailsMap: Record<string, number> = {};
  if (Array.isArray(rawSalesDetails)) {
    rawSalesDetails.forEach((it: any) => {
      const desc = String(it.description || it.name || it.label || "").trim().toLowerCase();
      const val = Number(it.total ?? it.amount ?? it.value ?? 0);
      if (desc.includes("sale") || desc.includes("amount")) salesDetailsMap.saleAmount = val;
      else if (desc.includes("comp")) salesDetailsMap.complimentary = val;
      else if (desc.includes("disc")) salesDetailsMap.discount = val;
    });
  } else if (rawSalesDetails && typeof rawSalesDetails === "object") {
    salesDetailsMap.saleAmount = Number(rawSalesDetails.saleAmount ?? rawSalesDetails.sales ?? 0);
    salesDetailsMap.complimentary = Number(rawSalesDetails.complimentary ?? 0);
    salesDetailsMap.discount = Number(rawSalesDetails.discount ?? 0);
    salesDetailsMap.deliveryCharge = Number(rawSalesDetails.deliveryCharge ?? 0);
    if (rawSalesDetails.totalSale !== undefined) {
      salesDetailsMap.totalSale = Number(rawSalesDetails.totalSale);
    }
  }

  // Reconcile settled sales total across all payment modes or order types
  const paymodesListForTotal = data.paymodes || (data as any).payments || (data as any).paymodeSummary || (data as any).paymentSummary || [];
  const paymodeSum = Array.isArray(paymodesListForTotal)
    ? paymodesListForTotal.reduce((sum: number, p: any) => sum + Number(p.amount ?? p.total ?? 0), 0)
    : 0;
  const orderTypesListForTotal = Array.isArray(data.orderTypes) ? data.orderTypes : [];
  const orderTypeSum = orderTypesListForTotal.reduce((sum: number, o: any) => sum + Number(o.total || 0), 0);

  const settledTotal = paymodeSum > 0
    ? paymodeSum
    : (orderTypeSum > 0 ? orderTypeSum : (salesDetailsMap.saleAmount || 0));

  const deliveryCharge = Number(
    data.salesSummary?.deliveryCharge 
    ?? salesDetailsMap.deliveryCharge 
    ?? (data as any).deliveryCharge 
    ?? 0
  );

  const discount = Number(
    salesDetailsMap.discount 
    ?? (data as any).discount 
    ?? (data as any).totalDiscount 
    ?? (gs as any).totalDiscount 
    ?? 0
  );

  const complimentary = Number(
    salesDetailsMap.complimentary 
    ?? (data as any).complimentary 
    ?? 0
  );

  const taxSummaryList = Array.isArray(data.taxSummary) ? data.taxSummary : [];
  const taxSummaryVatTotal = taxSummaryList.reduce((sum, t) => sum + (Number(t.vatAmount) || 0), 0);

  const rawBaseSale = Number(data.salesSummary?.sales ?? 0);

  // If backend omitted modifier/extra VAT, reconcile actual VAT from (settledTotal - rawBaseSale - deliveryCharge)
  let vatAmount = Number(
    (rawSalesDetails && !Array.isArray(rawSalesDetails) ? (rawSalesDetails.vatAmount ?? rawSalesDetails.vat ?? rawSalesDetails.tax) : undefined)
    ?? data.salesSummary?.vatAmount 
    ?? taxSummaryVatTotal 
    ?? 0
  );

  if (settledTotal > 0 && rawBaseSale > 0 && (settledTotal - (rawBaseSale + deliveryCharge)) > vatAmount) {
    const diff = Number((settledTotal - rawBaseSale - deliveryCharge).toFixed(decimalPart));
    if (diff > vatAmount) {
      vatAmount = diff;
    }
  }

  let saleAmount = rawBaseSale;
  const totalSale = settledTotal > 0 ? settledTotal : (saleAmount + deliveryCharge + vatAmount);

  if (saleAmount <= 0 && totalSale > 0) {
    saleAmount = Math.max(0, Number((totalSale - deliveryCharge - vatAmount).toFixed(decimalPart)));
  }

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
  if (vatAmount > vatTotal + 0.001) {
    vatTotal = vatAmount;
  }
  const grandTotal = totalSale > 0 ? totalSale : ((data.salesSummary?.sales || 0) + vatTotal + (data.salesSummary?.deliveryCharge || 0));
  const totalDiscount = discount > 0 ? discount : ((data as any).totalDiscount ?? (gs as any).totalDiscount ?? 0);

  markup += `[C]<b>GENERAL SUMMARY</b>\n`;
  markup += `[L]${DASH_SEP}\n`;
  markup += twoCol("Sale:", fmt(saleAmount)) + "\n";
  if (deliveryCharge > 0) {
    markup += twoCol("Delivery Charge:", fmt(deliveryCharge)) + "\n";
  }
  markup += twoCol("VAT Amount:", fmt(vatAmount)) + "\n";
  markup += twoCol("Grand Total:", fmt(grandTotal)) + "\n";
  if (totalDiscount > 0) markup += twoCol("Total Discount:", fmt(totalDiscount)) + "\n";
  if (gs.voidSales) markup += twoCol("Cancelled Sales:", fmt(gs.voidSales)) + "\n";
  if (gs.voidOrders) markup += twoCol("Cancelled Order:", fmt(gs.voidOrders)) + "\n";
  if (gs.pendingOrder) markup += twoCol("Pending Order:", fmt(gs.pendingOrder)) + "\n";
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
  const fmt = (val: any) => roundCalc(val, decimalPart).toFixed(decimalPart);
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
  const fmt = (val: any) => roundCalc(val, decimalPart).toFixed(decimalPart);
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
  const fmt = (val: any) => roundCalc(val, decimalPart).toFixed(decimalPart);
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
  const fmt = (val: any) => roundCalc(val, decimalPart).toFixed(decimalPart);
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
  const fmt = (val: any) => roundCalc(val, decimalPart).toFixed(decimalPart);
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
  const fmt = (val: any) => roundCalc(val, decimalPart).toFixed(decimalPart);
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
    if (!Number.isFinite(n)) return (0).toFixed(decimalPart);
    return roundCalc(n, decimalPart).toFixed(decimalPart);
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


