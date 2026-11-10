import { escapeHtml } from "../../../utils/html";
import type { PosCartItem } from "../types";
import { modifierLabelOf } from "./modifierLabel";
import { barcodeHtml } from "./printBarcode";
import { toDisplayNo } from "../services/orderResponse";
import { branchApi } from "../../inventory/branches/services/branchApi";
import { printLineHtml } from "../../inventory/branches/utils/lineHelpers";
import { isBillArabicEnabled, getAlternativeArabicName, containsArabic } from "./alternativeHelpers";
export { isBillArabicEnabled };
import { getDecimalPart } from "../../../utils/currency";
import { getBillingConfig, getPriceView, getVatStatus, roundCalc } from "../terminal/utils/billing";
import { applyCartPricingToUnified } from "./printPricing";
import { balanceBillFooter, balanceToTotal } from "../../../utils/money";
import { printChargeLines } from "./printCharges";
import { buildUnifiedOrderPricing, type UnifiedOrderPricingResult } from "./orderPricing";

export interface GuestPrintData {
  orderNo: string;
  ticketNo: string;
  invoiceNo?: string;
  /** Sales invoice id: the barcode on a settle print. No id, no barcode (never a guessed number). */
  saleId?: number;
  waiter: string;
  counter: string;
  section?: string;
  table?: string;
  orderType: string;
  date?: string;
  time?: string;
  customerName?: string;
  driver?: string;
  driverName?: string;
  vehicleNo?: string;
  contactNo?: string;
  /** delivery order taken from a missed call (Delivery page toggle) */
  missedCall?: boolean | string;
  callBack?: string;
  change?: string;
  keepChanges?: string;
  flatNo?: string;
  buildingNo?: string;
  blockNo?: string;
  roadNo?: string;
  area?: string;
  address?: string;
  providerNo?: string;
  subTotal: number;
  discount?: number;
  serviceCharge?: number;
  levy?: number;
  charges?: number;
  netValue?: number;
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
  printPrice?: "Inclusive" | "Exclusive" | string;
  priceView?: "Inclusive" | "Exclusive" | string;
  isBillDiscount?: boolean;
  billDiscount?: number;
  billDiscountValue?: number;
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

const normalizeTaxSetting = (val: any): "Inclusive" | "Exclusive" | undefined => {
  if (!val) return undefined;
  const str = String(val).trim().toLowerCase();
  if (str === "inclusive") return "Inclusive";
  if (str === "exclusive") return "Exclusive";
  return undefined;
};

export const resolvePrintTaxSetting = (data?: GuestPrintData): "Inclusive" | "Exclusive" => {
  // 1. Explicit printPrice in printData takes top priority
  const explicitPrint = normalizeTaxSetting(data?.printPrice);
  if (explicitPrint) return explicitPrint;

  // 2. Direct printPrice setting stored in localStorage from POS Settings > Operational Flags
  const directPrintPrice = normalizeTaxSetting(localStorage.getItem("printPrice"));
  if (directPrintPrice) return directPrintPrice;

  // 3. Cached posConfigs JSON check for printPrice
  try {
    for (const key of ["posConfigs", "posConfig", "pos_configs", "pos_config"]) {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        const configs = parsed?.configs || parsed;
        const pp = normalizeTaxSetting(configs?.printPrice || configs?.PrintPrice);
        if (pp) return pp;
      }
    }
  } catch {}

  // 4. Fallback to screen priceView only if printPrice was never configured
  const explicitView = normalizeTaxSetting(data?.priceView);
  if (explicitView) return explicitView;

  const directPriceView = normalizeTaxSetting(localStorage.getItem("priceView"));
  if (directPriceView) return directPriceView;

  try {
    for (const key of ["posConfigs", "posConfig", "pos_configs", "pos_config"]) {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        const configs = parsed?.configs || parsed;
        const pv = normalizeTaxSetting(configs?.priceView || configs?.PriceView);
        if (pv) return pv;
      }
    }
  } catch {}

  if (data?.orderType) {
    try {
      const bc = getBillingConfig(data.orderType);
      const bt = normalizeTaxSetting(bc?.vatType);
      if (bt) return bt;
    } catch {}
  }

  return normalizeTaxSetting(getPriceView()) ?? "Exclusive";
};

export const isEnableVatGuestPrint = (_data?: GuestPrintData): boolean => true;

export const resolveViewTaxSetting = (data?: GuestPrintData): "Inclusive" | "Exclusive" => {
  const explicitView = normalizeTaxSetting(data?.priceView);
  if (explicitView) return explicitView;

  const directPriceView = normalizeTaxSetting(localStorage.getItem("priceView"));
  if (directPriceView) return directPriceView;

  try {
    for (const key of ["posConfigs", "posConfig", "pos_configs", "pos_config"]) {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        const configs = parsed?.configs || parsed;
        const pv = normalizeTaxSetting(configs?.priceView || configs?.PriceView);
        if (pv) return pv;
      }
    }
  } catch {}

  if (data?.orderType) {
    try {
      const bc = getBillingConfig(data.orderType);
      const bt = normalizeTaxSetting(bc?.vatType);
      if (bt) return bt;
    } catch {}
  }

  return normalizeTaxSetting(getPriceView()) ?? "Exclusive";
};

export const generateGuestPrintHtml = async (
  cartDetails: PosCartItem[],
  data: GuestPrintData
): Promise<string> => {
  const now = new Date();
  const dateStr = data.date || now.toLocaleDateString('en-GB'); // DD/MM/YYYY
  const timeStr = data.time || now.toLocaleTimeString('en-US'); // h:mm:ss A
  const formattedTimeStr = timeStr.replace(/\s+/g, '\u00A0');

  let customHeadersHtml = "";
  let customFootersHtml = "";
  const allowCompanyHeader = data.showCompanyHeader !== false;
  // POS config "Packager Header" only controls the header: a packager print always keeps its footer.
  if (allowCompanyHeader || data.isPackager) {
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

        const headers = branchLines.filter(l => isHeader(l) && (l.value ?? l.lineValue) && String(l.value ?? l.lineValue).trim() !== "");
        if (allowCompanyHeader && headers.length > 0) {
          customHeadersHtml = headers.map(l => printLineHtml({ ...l, value: l.value ?? l.lineValue ?? "" })).join("");
        }

        const footers = branchLines.filter(l => isFooter(l) && (l.value ?? l.lineValue) && String(l.value ?? l.lineValue).trim() !== "");
        if (footers.length > 0) {
          customFootersHtml = footers.map(l => printLineHtml({ ...l, value: l.value ?? l.lineValue ?? "" })).join("");
        }
      }
    } catch {
      // Silently proceed with fallback headers if branch endpoint is forbidden for cashiers
    }
  }

  const isTakeOut = data.orderType?.toLowerCase().includes("take");
  const isDriveThru = data.orderType?.toLowerCase().includes("drive");
  const isDineIn = data.orderType?.toLowerCase().includes("dine");
  const hasDeliveryAddress = Boolean(data.flatNo || data.buildingNo || data.blockNo || data.roadNo || data.area || data.address);
  const isDelivery = Boolean(data.orderType?.toLowerCase().includes("delivery") || hasDeliveryAddress);
  const driverVal = escapeHtml((data.driverName || data.driver || "").trim());

  const rawCallBack = (data.callBack || (data as any).callback || (data as any).callBackNo || (data as any).callbackNo || (data as any).callBackNumber || (data as any).callbackNumber || "").trim();
  const effectiveCallBack = rawCallBack || (isDelivery ? (
    (data.orderNo ? localStorage.getItem(`order_callBack_${String(data.orderNo).replace(/\D/g, '')}`) : null) ||
    (data.orderNo ? sessionStorage.getItem(`order_callBack_${String(data.orderNo).replace(/\D/g, '')}`) : null) ||
    (data.invoiceNo ? localStorage.getItem(`order_callBack_${String(data.invoiceNo).replace(/\D/g, '')}`) : null) ||
    (data.invoiceNo ? sessionStorage.getItem(`order_callBack_${String(data.invoiceNo).replace(/\D/g, '')}`) : null) ||
    (data.contactNo ? localStorage.getItem(`delivery_callBack_${escapeHtml(data.contactNo)}`) : null) ||
    (data.contactNo ? sessionStorage.getItem(`delivery_callBack_${escapeHtml(data.contactNo)}`) : null) ||
    localStorage.getItem("pos_current_callBack") ||
    sessionStorage.getItem("pos_current_callBack") ||
    ""
  ) : "");

  const isGuestPrint = !data.isSettlement && !data.invoiceNo && !data.isPackager;
  // Guest and packager prints: the order number (the first one on a combined order). Settle prints: the sale id.
  const barcodeValue = isGuestPrint || data.isPackager
    ? toDisplayNo(String(data.orderNo ?? '').split(',')[0].trim().replace(/^#/, ''))
    : toDisplayNo(data.saleId);

  const isBillArabic = data.billArabic ?? isBillArabicEnabled();

  let orderTypeSuffix = "";
  if (isTakeOut) orderTypeSuffix = isBillArabic ? "(TAKE OUT / سفري)" : "(TAKE OUT)";
  else if (isDriveThru) orderTypeSuffix = isBillArabic ? "(DRIVE THRU / طلبات السيارات)" : "(DRIVE THRU)";
  else if (isDineIn) orderTypeSuffix = isBillArabic ? "(DINE IN / محلي)" : "(DINE IN)";
  else if (isDelivery) orderTypeSuffix = isBillArabic ? "(DELIVERY / توصيل)" : "(DELIVERY)";

  const arabicInvoiceTitle = data.enableVat !== false
    ? '<div dir="rtl" lang="ar" class="arabic-text" style="font-size:12px; font-weight:bold; text-align:center; margin-top:2px; line-height:1.3;">فاتورة ضريبية مبسطة</div>'
    : '<div dir="rtl" lang="ar" class="arabic-text" style="font-size:12px; font-weight:bold; text-align:center; margin-top:2px; line-height:1.3;">فاتورة مبسطة</div>';

  const arabicGuestTitle = '<div dir="rtl" lang="ar" class="arabic-text" style="font-size:12px; font-weight:bold; text-align:center; margin-top:2px; line-height:1.3;">فاتورة ضيف</div>';

  const orderTypeHtml = orderTypeSuffix
    ? `<div style="font-size: 13px; font-weight: 700; margin-top: 3px; line-height: 1.3; letter-spacing: 0;">${orderTypeSuffix}</div>`
    : '';

  let headerTitle = "";
  if (isGuestPrint) {
    headerTitle = `<div>GUEST PRINT</div>${isBillArabic ? arabicGuestTitle : ''}${orderTypeHtml}`;
  } else if (data.isPackager) {
    headerTitle = `<div>PACKAGER</div>${orderTypeHtml}`;
  } else {
    const mainTitle = data.enableVat !== false ? "SIMPLIFIED TAX INVOICE" : "SIMPLIFIED INVOICE";
    headerTitle = `<div>${mainTitle}</div>${isBillArabic ? arabicInvoiceTitle : ''}${orderTypeHtml}`;
  }

  const decimalPart = getDecimalPart();
  const fmt = (val: number | string | undefined | null) => {
    const n = typeof val === 'string' ? parseFloat(val) : Number(val || 0);
    if (!Number.isFinite(n)) return (0).toFixed(decimalPart);
    return roundCalc(n, decimalPart).toFixed(decimalPart);
  };

  const printTaxSetting = resolvePrintTaxSetting(data);
  const rawLines = Array.isArray(cartDetails)
    ? cartDetails
    : Array.isArray((cartDetails as any)?.lines)
    ? (cartDetails as any).lines
    : [];
  const isVatActive = Boolean(
    data.enableVat === true ||
    (data.vatAmount && data.vatAmount > 0) ||
    rawLines.some((it: any) => (it.vatAmount || 0) > 0) ||
    isEnableVatGuestPrint(data) ||
    getVatStatus()
  );
  const isTaxInclusive = isVatActive ? (printTaxSetting === "Inclusive") : false;

  const isInputPrecomputed = Boolean(cartDetails && Array.isArray((cartDetails as any).lines) && (cartDetails as any).summary);
  const inputTaxSetting = (cartDetails as any)?.summary?.printPrice || (cartDetails as any)?.summary?.priceView;
  const isInputMatchingSetting = isInputPrecomputed && (
    (printTaxSetting === "Inclusive" && (cartDetails as any).summary?.isTaxInclusive === true) ||
    (printTaxSetting === "Exclusive" && (cartDetails as any).summary?.isTaxInclusive === false) ||
    inputTaxSetting === printTaxSetting
  );

  // Single Source of Truth: Unified deterministic order pricing
  const unifiedBase: UnifiedOrderPricingResult = isInputMatchingSetting
    ? (cartDetails as any)
    : buildUnifiedOrderPricing(cartDetails, {
        ...data,
        printPrice: printTaxSetting,
        priceView: printTaxSetting,
      });

  // Live cart lines (e.g. packager print): numbers straight from the cart engine, in the Print Price view.
  const unified: UnifiedOrderPricingResult =
    (!isInputPrecomputed && applyCartPricingToUnified(unifiedBase, rawLines, { printPrice: printTaxSetting, deliveryCharge: data.deliveryCharge, orderType: data.orderType })) ||
    unifiedBase;



  // Footer Sub Total and Discount are ALWAYS exclusive — exactly what the cart / recall screen footer shows,
  // whatever the Print Price. (Rows still follow Print Price.) Previously an Inclusive print without
  // charges switched the footer to inclusive amounts, which did not match the screen.
  const resolvedDiscount = Number(
    unified.summary.totalDiscountExcl ?? (typeof unified.summary.getTotalDiscount === "function" ? unified.summary.getTotalDiscount(false) : (data.discount ?? (data as any).discAmount ?? 0))
  );

  const totalPrintDiscount = resolvedDiscount;

  const grossSubTotal = unified.summary.subTotalExclusive > 0
    ? unified.summary.subTotalExclusive
    : (typeof unified.summary.getSubTotal === "function" ? unified.summary.getSubTotal(false) : 0);
  const displaySubTotal = grossSubTotal > 0
    ? grossSubTotal
    : (data.subTotal !== undefined && Number(data.subTotal) > 0
        ? Number(data.subTotal)
        : Number((data as any).vatExclAmount || 0));

  if (!data.serviceCharge && isDineIn && unified.summary?.serviceCharge) {
    data.serviceCharge = unified.summary.serviceCharge;
  }
  if (!data.levy && unified.summary?.levy) {
    data.levy = unified.summary.levy;
  }

  const effectiveSc = (isDineIn && Number(data.serviceCharge || 0) > 0)
    ? Number(data.serviceCharge)
    : (isDineIn && Number((unified as any)?.summary?.serviceCharge || 0) > 0 ? Number((unified as any).summary.serviceCharge) : 0);
  const effectiveLevy = Number(data.levy || 0) > 0
    ? Number(data.levy)
    : Number((data as any)?.levyAmt || 0) > 0
    ? Number((data as any).levyAmt)
    : Number((unified as any)?.summary?.levy || 0);
  let effectiveCharges = (data.charges !== undefined && data.charges !== null && Number(data.charges) > 0)
    ? Number(data.charges)
    : roundCalc(effectiveSc + effectiveLevy);

  const exclDiscount = Number(
    unified.summary.totalDiscountExcl ??
    (typeof unified.summary.getTotalDiscount === "function" ? unified.summary.getTotalDiscount(false) : (isTaxInclusive ? roundCalc(totalPrintDiscount / 1.155, 3) : totalPrintDiscount))
  );
  const exclSubTotal = Number(
    unified.summary.subTotalExclusive > 0
      ? unified.summary.subTotalExclusive
      : (typeof unified.summary.getSubTotal === "function" ? unified.summary.getSubTotal(false) : displaySubTotal)
  );
  const grandTotal = Number(unified.summary.grandTotal > 0 ? unified.summary.grandTotal : (data.netAmount || 0));
  const netBase = Math.max(0, exclSubTotal - exclDiscount);
  const vat = unified.summary.vatAmount > 0 ? unified.summary.vatAmount : Number(data.vatAmount || 0);
  const del = Number(data.deliveryCharge || unified.summary?.deliveryCharge || 0);
  const expectedChargesFromResidual = roundCalc(grandTotal - netBase - del - vat);

  if (expectedChargesFromResidual > 0.001) {
    if (effectiveCharges <= 0 || Math.abs(effectiveCharges - expectedChargesFromResidual) > 0.005) {
      effectiveCharges = expectedChargesFromResidual;
    }
  }

  const recalculatedNetValue = roundCalc(netBase + effectiveCharges);
  const displayNetValue = (data.netValue !== undefined && data.netValue !== null && Number(data.netValue) > 0 && Math.abs(Number(data.netValue) - recalculatedNetValue) <= 0.005)
    ? Number(data.netValue)
    : recalculatedNetValue;

  if (isVatActive) {
    data.enableVat = true;
    let computedVat = unified.summary.vatAmount > 0 ? unified.summary.vatAmount : Number(data.vatAmount || 0);

    // If both priceView and printPrice are inclusive (or VAT is 0 despite isVatActive being true), reverse calculate the correct VAT:

    data.vatAmount = parseFloat(fmt(computedVat));
    data.subTotal = parseFloat(fmt(displaySubTotal));
  } else {
    data.enableVat = false;
    data.subTotal = parseFloat(fmt(displaySubTotal));
    data.vatAmount = 0;
  }
  data.netAmount = parseFloat(fmt(unified.summary.grandTotal > 0 ? unified.summary.grandTotal : (data.netAmount ?? 0)));
  if (totalPrintDiscount > 0) {
    data.discount = parseFloat(fmt(totalPrintDiscount));
  } else {
    delete (data as any).discount;
  }

  // ── Balanced display (fils): every printed equation adds up exactly ───────────────────────────
  //   Sub Total − Discount + Charges = Net Value;  Net Value + VAT + Delivery = Grand Total
  //   Exclusive print: Σ row amounts = Sub Total and Σ row discounts = Discount.
  // Display only (utils/money.ts balanceBillFooter / balanceToTotal) — stored / charged amounts are unchanged.
  const exactGrandTotal = unified.summary.grandTotal > 0 ? unified.summary.grandTotal : Number((data as any).netAmount ?? 0);
  const exactVat = isVatActive ? (unified.summary.vatAmount > 0 ? unified.summary.vatAmount : Number((data as any).vatAmount || 0)) : 0;
  const shownFooter = balanceBillFooter({
    subTotal: displaySubTotal,
    discount: totalPrintDiscount,
    charges: effectiveCharges,
    vat: exactVat,
    delivery: Number(data.deliveryCharge || 0),
    grandTotal: exactGrandTotal,
  }, decimalPart);
  data.vatAmount = isVatActive ? shownFooter.vat : 0;
  data.netAmount = shownFooter.grandTotal;
  if (totalPrintDiscount > 0) data.discount = shownFooter.discount;
  // Guest and settle bills always name the customer. A delivery bill with a name shows it once, in Delivery Details.
  const customerRowHtml = !data.isPackager && (!isDelivery || !data.customerName) ? `
          <tr>
            <td colspan="2" style="white-space: normal; word-break: break-word;">Customer${isBillArabic ? ' <bdi class="arabic-text" style="font-size: 9.5px; font-weight: normal;">(العميل)</bdi>' : ''} :&nbsp;<span style="font-weight: normal;" dir="auto">${escapeHtml(data.customerName || "CASH CUSTOMER")}</span></td>
          </tr>
          ` : '';
  const chargeLines = printChargeLines({ total: shownFooter.charges, serviceCharge: effectiveSc, levy: effectiveLevy, netBase, orderType: data.orderType, decimals: decimalPart });

  // Exclusive print rows add up to the footer (Inclusive rows carry VAT, the footer Sub Total never does).
  const rowsBalanceable = !isTaxInclusive && unified.lines.length > 0;
  const shownLineGross: number[] | null = rowsBalanceable
    ? balanceToTotal(unified.lines.map((l) => l.exclusiveGross), shownFooter.subTotal, decimalPart)
    : null;
  const exactRowDisc = unified.lines.map((l) => Number(l.lineDiscountExcl ?? (typeof l.getDiscount === "function" ? l.getDiscount(false) : l.lineDiscount) ?? 0));
  const shownLineDisc: number[] | null = rowsBalanceable && !unified.summary.isBillDiscount && exactRowDisc.some((d) => d > 0)
    ? balanceToTotal(exactRowDisc, shownFooter.discount, decimalPart)
    : null;

  let itemsHtml = "";
  unified.lines.forEach((line, lineIdx) => {
    const name = escapeHtml(line.productName.toUpperCase());
    const qty = line.quantity;
    const altArabicName = isBillArabic ? escapeHtml(getAlternativeArabicName(line.rawItem)) : "";
    const lineDiscVal = Number(
      isTaxInclusive
        ? (line.lineDiscountIncl ?? (typeof line.getDiscount === "function" ? line.getDiscount(true) : line.lineDiscount))
        : (line.lineDiscountExcl ?? (typeof line.getDiscount === "function" ? line.getDiscount(false) : line.lineDiscount))
    );
    const totalItemDisc = shownLineDisc ? shownLineDisc[lineIdx] : (lineDiscVal > 0 ? lineDiscVal : 0);

    const origRate = line.getRate(isTaxInclusive);
    const origGrossAmt = shownLineGross ? shownLineGross[lineIdx] : (isTaxInclusive ? line.inclusiveGross : line.exclusiveGross);
    const netAmt = totalItemDisc > 0
      ? Math.max(0, origGrossAmt - totalItemDisc)
      : (isTaxInclusive ? line.inclusiveAmount : line.exclusiveAmount);

    const rate = fmt(origRate);
    const amt = fmt(origGrossAmt);

    itemsHtml += `
      <tr>
        <td style="width: 14%; text-align: left; vertical-align: top; padding: 1px 0;">${qty}</td>
        <td style="width: 46%; text-align: left; vertical-align: top; padding: 1px 0;">
          <div style="word-break: break-word; overflow-wrap: break-word; white-space: normal; line-height: 1.25;">${name}</div>
          ${altArabicName ? `<div dir="rtl" lang="ar" class="arabic-text" style="font-size:11px; font-weight:bold; line-height:1.25; margin-top:1px; color:#000000; text-align:left; white-space:normal;">${altArabicName}</div>` : ''}
        </td>
        <td style="width: 18%; text-align: right; vertical-align: top; padding: 1px 0;">${rate}</td>
        <td style="width: 22%; text-align: right; vertical-align: top; padding: 1px 0;">${amt}</td>
      </tr>
      ${totalItemDisc > 0 ? `
      <tr>
        <td style="width: 14%; text-align: left; vertical-align: top; padding: 0.5px 0;"></td>
        <td colspan="2" style="text-align: right; vertical-align: top; padding: 0.5px 0; font-size: 11px; font-weight: bold; white-space: nowrap;">
          Disc : ${fmt(totalItemDisc)}${isBillArabic ? ` <span dir="rtl" lang="ar" class="arabic-text" style="font-size:9.5px; font-weight:normal;">(الخصم)</span>` : ''}
        </td>
        <td style="width: 22%; text-align: right; vertical-align: top; padding: 0.5px 0; font-weight: bold;">
          ${fmt(netAmt)}
        </td>
      </tr>
      ` : ''}
    `;

    if (line.extras && line.extras.length > 0) {
      line.extras.forEach((ex) => {
        const exName = escapeHtml((ex.name || "EXTRA").toUpperCase());
        const exArabic = isBillArabic ? escapeHtml((ex.arabicName || "")) : "";
        const exDisplay = exArabic
          ? `+ ${exName} <span dir="rtl" lang="ar" class="arabic-text" style="font-size:10px; font-weight:normal; margin-left:4px; color:#000000; white-space:nowrap;">(${exArabic})</span>`
          : `+ ${exName}`;
        const qtyLabel = (ex.qty && ex.qty > 1) ? ` (x${ex.qty})` : "";
        itemsHtml += `
          <tr>
            <td style="width: 14%; text-align: left; vertical-align: top; padding: 0.5px 0;"></td>
            <td style="width: 46%; text-align: left; vertical-align: top; padding: 0.5px 0; font-style: italic; color: #555;">${exDisplay}${qtyLabel}</td>
            <td style="width: 18%; text-align: right; vertical-align: top; padding: 0.5px 0;"></td>
            <td style="width: 22%; text-align: right; vertical-align: top; padding: 0.5px 0;"></td>
          </tr>
        `;
      });
    }

    if (line.modifiers && line.modifiers.length > 0) {
      line.modifiers.forEach((mod) => {
        const text = escapeHtml(modifierLabelOf(mod, { upperCase: true }));

        const modArabic = isBillArabic ? escapeHtml((mod.arabicName || "")) : "";
        const modDisplay = modArabic
          ? `* ${text} <span dir="rtl" lang="ar" class="arabic-text" style="font-size:10px; font-style:normal; margin-left:4px;">(${modArabic})</span>`
          : `* ${text}`;
        itemsHtml += `
          <tr>
            <td style="width: 14%; text-align: left; vertical-align: top; padding: 0.5px 0;"></td>
            <td style="width: 46%; text-align: left; vertical-align: top; font-style: italic; padding: 0.5px 0;">${modDisplay}</td>
            <td style="width: 18%; text-align: right; vertical-align: top; padding: 0.5px 0;"></td>
            <td style="width: 22%; text-align: right; vertical-align: top; padding: 0.5px 0;"></td>
          </tr>
        `;
      });
    }

    if (line.messages && line.messages.length > 0) {
      line.messages.forEach((msg) => {
        const rawName = escapeHtml(msg.name || "NOTE");
        const isMsgArabic = containsArabic(rawName);
        const msgDisplay = isMsgArabic
          ? `MSG: <span dir="rtl" lang="ar" class="arabic-text">${rawName}</span>`
          : `MSG: ${rawName.toUpperCase()}`;
        itemsHtml += `
          <tr>
            <td style="width: 14%; text-align: left; vertical-align: top; padding: 0.5px 0;"></td>
            <td style="width: 46%; text-align: left; vertical-align: top; font-style: italic; padding: 0.5px 0;">${msgDisplay}</td>
            <td style="width: 18%; text-align: right; vertical-align: top; padding: 0.5px 0;"></td>
            <td style="width: 22%; text-align: right; vertical-align: top; padding: 0.5px 0;"></td>
          </tr>
        `;
      });
    }
  });

  return `
    <html>
      <head>
        <meta charset="UTF-8" />
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: 'Cairo', 'Noto Sans Arabic', 'Noto Naskh Arabic', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            font-size: 13px;
            font-weight: 600;
            color: #000000;
            margin: 0 auto;
            padding: 2px 8px 0 8px;
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
          .header-title { font-family: 'Roboto', 'Cairo', 'Segoe UI', Tahoma, Arial, sans-serif; font-size: 16px; margin-bottom: 6px; letter-spacing: 0.5px; font-weight: 700; color: #000000; line-height: 1.3; }
          
          table { width: 100%; border-collapse: collapse; font-size: 13px; table-layout: fixed; }
          
          /* Printed text lands low (see orderTicketHtml in kotTemplate), so a line needs more room above it than below */
          .dashed-hr { border: none; border-top: 1px dashed #000000; margin: 11px 0 1px 0; clear: both; width: 100%; display: block; }
          .solid-hr { border: none; border-top: 1px solid #000000; margin: 4px 0; clear: both; width: 100%; display: block; }
          
          table.meta-table {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
            margin-bottom: 3px;
            font-size: 11px;
            font-weight: 600;
            color: #000000;
          }
          table.meta-table td {
            padding: 2px 2px;
            vertical-align: middle;
            font-weight: 600;
            color: #000000;
            line-height: 1.4;
            white-space: nowrap;
            overflow: visible;
          }
          table.meta-table .arabic-text {
            padding: 0;
            line-height: 1.2;
            display: inline;
          }
          
          table.items-table {
            font-weight: 600;
            line-height: 1.15;
            color: #000000;
            table-layout: fixed;
            width: 100%;
          }
          table.items-table th {
            font-weight: 700;
            color: #000000;
            text-transform: capitalize;
            padding-bottom: 5px;
            line-height: 1.3;
            text-align: left;
            word-break: break-word;
            overflow-wrap: break-word;
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
            word-break: break-word;
            overflow-wrap: break-word;
          }
          table.items-table div {
            font-family: 'Cairo', 'Noto Sans Arabic', 'Segoe UI', Tahoma, Arial, sans-serif;
            font-size: 8.5pt;
            font-weight: normal;
            color: #000000;
            margin: 0;
            padding: 0;
            line-height: 1.15;
            word-break: break-word;
            overflow-wrap: break-word;
          }

          ${isGuestPrint ? `
          table.items-table th { padding-bottom: 9px; border-bottom: 1px dashed #000000; }
          table.items-table tbody tr:first-child td { padding-top: 4px; }
          ` : ''}

          .meta-row { display: flex; justify-content: space-between; margin-bottom: 2px; font-weight: 600; color: #000000; }
          
          .totals-table {
            width: 100%;
            table-layout: fixed;
            margin-top: 0;
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
          .vat-table th { text-align: left; padding-bottom: 9px; font-weight: 700; color: #000000; border-bottom: 1px dashed #000000; }
          .vat-table td { padding: 0 0 2px 0; font-weight: 600; color: #000000; }
          
          .barcode-container { margin-top: 15px; margin-bottom: 5px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #000000; }
        </style>
      </head>
      <body>
          ${allowCompanyHeader && customHeadersHtml ? `
            <div style="margin-bottom: 10px; padding: 0 4px; width: 100%; box-sizing: border-box;">
              ${customHeadersHtml}
            </div>
          ` : ''}
  
          <div class="text-center header-title">${headerTitle}</div>
        
        <div class="dashed-hr" style="border-top: 1px solid #000;"></div>

        ${data.invoiceNo ? `
        <table class="meta-table">
          <tr>
            <td style="width: 50%; white-space: nowrap;">Invoice No${isBillArabic ? ' <bdi class="arabic-text" style="font-size: 9.5px; font-weight: normal;">(رقم الفاتورة)</bdi>' : ''} :&nbsp;<span style="font-size: 13px; font-weight: bold;">${data.invoiceNo.startsWith('#') ? data.invoiceNo : (isNaN(Number(data.invoiceNo)) ? data.invoiceNo : '#' + data.invoiceNo)}</span></td>
            <td style="width: 50%; white-space: nowrap;">Order No${isBillArabic ? ' <bdi class="arabic-text" style="font-size: 9.5px; font-weight: normal;">(رقم الطلب)</bdi>' : ''} :&nbsp;<span style="font-size: 13px; font-weight: bold;">${formatOrderNo(data.orderNo)}</span></td>
          </tr>
          <tr>
            <td style="width: 50%; white-space: nowrap;">Ticket No${isBillArabic ? ' <bdi class="arabic-text" style="font-size: 9.5px; font-weight: normal;">(رقم التذكرة)</bdi>' : ''} :&nbsp;<span style="font-size: 13px; font-weight: bold;">${toDisplayNo(data.ticketNo) ? "#" + toDisplayNo(data.ticketNo) : ""}</span></td>
            <td style="width: 50%; white-space: nowrap;">Date${isBillArabic ? ' <bdi class="arabic-text" style="font-size: 9.5px; font-weight: normal;">(التاريخ)</bdi>' : ''} :&nbsp;<span style="font-weight: normal; white-space: nowrap;">${dateStr}</span></td>
          </tr>
          <tr>
            <td style="width: 50%; white-space: nowrap;">Time${isBillArabic ? ' <bdi class="arabic-text" style="font-size: 9.5px; font-weight: normal;">(الوقت)</bdi>' : ''} :&nbsp;<span style="font-weight: normal; white-space: nowrap;">${formattedTimeStr}</span></td>
            <td style="width: 50%; white-space: nowrap;">Waiter${isBillArabic ? ' <bdi class="arabic-text" style="font-size: 9.5px; font-weight: normal;">(النادل)</bdi>' : ''} :&nbsp;<span style="font-weight: normal; white-space: nowrap;">${data.waiter}</span></td>
          </tr>
          <tr>
            <td style="width: 50%; white-space: nowrap;">Counter${isBillArabic ? ' <bdi class="arabic-text" style="font-size: 9.5px; font-weight: normal;">(الكاونتر)</bdi>' : ''} :&nbsp;<span style="font-weight: normal; white-space: nowrap;">${data.counter}</span></td>
            ${isDineIn ? `<td style="width: 50%; white-space: nowrap;">Section${isBillArabic ? ' <bdi class="arabic-text" style="font-size: 9.5px; font-weight: normal;">(القسم)</bdi>' : ''} :&nbsp;<span style="font-weight: normal; white-space: nowrap;">${data.section}</span></td>` : (driverVal ? `<td style="width: 50%; white-space: nowrap;">Driver${isBillArabic ? ' <bdi class="arabic-text" style="font-size: 9.5px; font-weight: normal;">(السائق)</bdi>' : ''} :&nbsp;<span style="font-weight: bold; white-space: nowrap;">${driverVal}</span></td>` : '<td style="width: 50%;"></td>')}
          </tr>
          ${isDineIn ? `
          <tr>
            <td style="width: 50%; white-space: nowrap;">Table${isBillArabic ? ' <bdi class="arabic-text" style="font-size: 9.5px; font-weight: normal;">(الطاولة)</bdi>' : ''} :&nbsp;<span style="font-weight: normal; white-space: nowrap;">${data.table}</span></td>
            <td style="width: 50%;"></td>
          </tr>
          ` : ''}
          ${customerRowHtml}
        </table>
        ` : `
        <table class="meta-table">
          <tr>
            <td style="width: 50%; white-space: nowrap;">Order No${isBillArabic ? ' <bdi class="arabic-text" style="font-size: 9.5px; font-weight: normal;">(رقم الطلب)</bdi>' : ''} :&nbsp;<span style="font-size: 13px; font-weight: bold;">${formatOrderNo(data.orderNo)}</span></td>
            <td style="width: 50%; white-space: nowrap;">Ticket No${isBillArabic ? ' <bdi class="arabic-text" style="font-size: 9.5px; font-weight: normal;">(رقم التذكرة)</bdi>' : ''} :&nbsp;<span style="font-size: 13px; font-weight: bold;">${toDisplayNo(data.ticketNo) ? "#" + toDisplayNo(data.ticketNo) : ""}</span></td>
          </tr>
          <tr>
            <td style="width: 50%; white-space: nowrap;">Date${isBillArabic ? ' <bdi class="arabic-text" style="font-size: 9.5px; font-weight: normal;">(التاريخ)</bdi>' : ''} :&nbsp;<span style="font-weight: normal; white-space: nowrap;">${dateStr}</span></td>
            <td style="width: 50%; white-space: nowrap;">Time${isBillArabic ? ' <bdi class="arabic-text" style="font-size: 9.5px; font-weight: normal;">(الوقت)</bdi>' : ''} :&nbsp;<span style="font-weight: normal; white-space: nowrap;">${formattedTimeStr}</span></td>
          </tr>
          <tr>
            <td style="width: 50%; white-space: nowrap;">Waiter${isBillArabic ? ' <bdi class="arabic-text" style="font-size: 9.5px; font-weight: normal;">(النادل)</bdi>' : ''} :&nbsp;<span style="font-weight: normal; white-space: nowrap;">${data.waiter}</span></td>
            <td style="width: 50%; white-space: nowrap;">Counter${isBillArabic ? ' <bdi class="arabic-text" style="font-size: 9.5px; font-weight: normal;">(الكاونتر)</bdi>' : ''} :&nbsp;<span style="font-weight: normal; white-space: nowrap;">${data.counter}</span></td>
          </tr>
          ${isDineIn ? `
          <tr>
            <td style="width: 50%; white-space: nowrap;">Section${isBillArabic ? ' <bdi class="arabic-text" style="font-size: 9.5px; font-weight: normal;">(القسم)</bdi>' : ''} :&nbsp;<span style="font-weight: normal; white-space: nowrap;">${data.section}</span></td>
            <td style="width: 50%; white-space: nowrap;">Table${isBillArabic ? ' <bdi class="arabic-text" style="font-size: 9.5px; font-weight: normal;">(الطاولة)</bdi>' : ''} :&nbsp;<span style="font-weight: normal; white-space: nowrap;">${data.table}</span></td>
          </tr>
          ` : (driverVal ? `
          <tr>
            <td style="width: 50%; white-space: nowrap;">Driver${isBillArabic ? ' <bdi class="arabic-text" style="font-size: 9.5px; font-weight: normal;">(السائق)</bdi>' : ''} :&nbsp;<span style="font-weight: bold; white-space: nowrap;">${driverVal}</span></td>
            <td style="width: 50%;"></td>
          </tr>
          ` : '')}
          ${customerRowHtml}
        </table>
        `}
        
        <div class="dashed-hr"></div>
        
        <table class="items-table">
          <thead>
            <tr>
              <th style="width: 14%; text-align: left;">Qty${isBillArabic ? '<br/><span class="arabic-text" style="font-size:10px; font-weight:normal; display:block; text-align:left; white-space:nowrap;">الكمية</span>' : ''}</th>
              <th style="width: 46%; text-align: left;">Description${isBillArabic ? '<br/><span class="arabic-text" style="font-size:10px; font-weight:normal; display:block; text-align:left; white-space:nowrap;">الوصف</span>' : ''}</th>
              <th class="col-rate" style="width: 18%; text-align: right;">Rate${isBillArabic ? '<br/><span class="arabic-text" style="font-size:10px; font-weight:normal; display:block; text-align:right; white-space:nowrap;">السعر</span>' : ''}</th>
              <th class="col-amt" style="width: 22%; text-align: right;">Amt${isBillArabic ? '<br/><span class="arabic-text" style="font-size:10px; font-weight:normal; display:block; text-align:right; white-space:nowrap;">المبلغ</span>' : ''}</th>
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
            <td class="totals-value">${fmt(shownFooter.subTotal)}</td>
          </tr>
          ${totalPrintDiscount > 0 ? `
          <tr>
            <td class="totals-label">Discount${isBillArabic ? ' <bdi class="arabic-text" style="font-size:10.5px; font-weight:normal; white-space:nowrap;">(الخصم)</bdi>' : ''}</td>
            <td class="totals-value">-${fmt(shownFooter.discount)}</td>
          </tr>
          ` : ''}
          ${chargeLines.map((c) => `
          <tr>
            <td class="totals-label">${c.label}${isBillArabic ? ` <bdi class="arabic-text" style="font-size:10.5px; font-weight:normal; white-space:nowrap;">(${c.arabic})</bdi>` : ''}</td>
            <td class="totals-value">${fmt(c.amount)}</td>
          </tr>
          `).join('')}
          ${(displayNetValue > 0) ? `
          <tr>
            <td class="totals-label">Net Value${isBillArabic ? ' <bdi class="arabic-text" style="font-size:10.5px; font-weight:normal; white-space:nowrap;">(القيمة الصافية)</bdi>' : ''}</td>
            <td class="totals-value">${fmt(shownFooter.netValue)}</td>
          </tr>
          ` : ''}
          ${(isDelivery || (data.deliveryCharge && data.deliveryCharge > 0)) ? `
          <tr>
            <td class="totals-label">Delivery Charge${isBillArabic ? ' <bdi class="arabic-text" style="font-size:10.5px; font-weight:normal; white-space:nowrap;">(رسوم التوصيل)</bdi>' : ''}</td>
            <td class="totals-value">${fmt(shownFooter.delivery)}</td>
          </tr>
          ` : ''}
          ${isVatActive && (data.vatAmount || 0) > 0 ? `
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
          <tr><td colspan="2"><div class="dashed-hr" style="margin: 9px 0 1px 0;"></div></td></tr>
          ${data.payments.map(p => {
            const arPay = isBillArabic && getPaymodeArabic(p.name) ? ` <bdi class="arabic-text" style="font-size:10.5px; font-weight:normal; white-space:nowrap;">(${getPaymodeArabic(p.name)})</bdi>` : '';
            return `
          <tr>
            <td class="totals-label">${escapeHtml(p.name)}${arPay}</td>
            <td class="totals-value">${fmt(p.amount)}</td>
          </tr>
          `;
          }).join('')}
          ` : ''}
          ${data.changeAmount !== undefined && Number(data.changeAmount) > 0 ? `
          <tr>
            <td class="totals-label" style="font-weight: 700;">Change${isBillArabic ? ' <bdi class="arabic-text" style="font-size:10.5px; font-weight:bold; white-space:nowrap;">(المبلغ المتبقي)</bdi>' : ''}</td>
            <td class="totals-value" style="font-weight: 700;">${fmt(data.changeAmount)}</td>
          </tr>
          ` : ''}
        </table>

        ${isVatActive && (data.vatAmount || 0) > 0 ? (() => {
          const effectiveDeliveryCharge = Number(
            data.deliveryCharge ?? 
            (data as any).deliveryAmount ?? 
            (data as any).customDeliveryCharge ?? 
            unified.summary?.deliveryCharge ?? 
            0
          );
          const hasDeliveryCharge = isDelivery && effectiveDeliveryCharge > 0;
          const vatPercent = unified.lines.find(l => (l.vatRate || 0) > 0)?.vatRate || 10;
          // Option B: Service charge and levy are part of the taxable base (Excl Amt)
          const exclAmount = Math.max(0, data.netAmount - (hasDeliveryCharge ? effectiveDeliveryCharge : 0) - data.vatAmount);

          return `
        <div class="dashed-hr"></div>
        <table class="vat-table" style="margin-top: 0; width: 100%;">
          <thead>
            <tr>
              ${hasDeliveryCharge ? `
              <th style="text-align: left; width: 18%; border-bottom: 1px dashed #000000; padding-bottom: 9px;">VAT Code${isBillArabic ? '<br/><span class="arabic-text" style="font-size:8.5px; font-weight:normal; display:block; text-align:left; white-space:nowrap;">رمز الضريبة</span>' : ''}</th>
              <th style="text-align: right; width: 22%; border-bottom: 1px dashed #000000; padding-bottom: 9px;">Excl Amt${isBillArabic ? '<br/><span class="arabic-text" style="font-size:8.5px; font-weight:normal; display:block; text-align:right; white-space:nowrap;">المبلغ غير شامل</span>' : ''}</th>
              <th style="text-align: right; width: 20%; border-bottom: 1px dashed #000000; padding-bottom: 9px;">VAT Amt${isBillArabic ? '<br/><span class="arabic-text" style="font-size:8.5px; font-weight:normal; display:block; text-align:right; white-space:nowrap;">مبلغ الضريبة</span>' : ''}</th>
              <th style="text-align: right; width: 20%; border-bottom: 1px dashed #000000; padding-bottom: 9px;">Delivery${isBillArabic ? '<br/><span class="arabic-text" style="font-size:8.5px; font-weight:normal; display:block; text-align:right; white-space:nowrap;">رسوم التوصيل</span>' : ''}</th>
              <th style="text-align: right; width: 20%; border-bottom: 1px dashed #000000; padding-bottom: 9px;">Net Amt${isBillArabic ? '<br/><span class="arabic-text" style="font-size:8.5px; font-weight:normal; display:block; text-align:right; white-space:nowrap;">المبلغ الصافي</span>' : ''}</th>
              ` : `
              <th style="text-align: left; width: 20%; border-bottom: 1px dashed #000000; padding-bottom: 9px;">VAT Code${isBillArabic ? '<br/><span class="arabic-text" style="font-size:9.5px; font-weight:normal; display:block; text-align:left; white-space:nowrap;">رمز الضريبة</span>' : ''}</th>
              <th style="text-align: right; width: 30%; border-bottom: 1px dashed #000000; padding-bottom: 9px;">Excl Amt${isBillArabic ? '<br/><span class="arabic-text" style="font-size:9.5px; font-weight:normal; display:block; text-align:right; white-space:nowrap;">المبلغ غير شامل</span>' : ''}</th>
              <th style="text-align: right; width: 24%; border-bottom: 1px dashed #000000; padding-bottom: 9px;">VAT Amt${isBillArabic ? '<br/><span class="arabic-text" style="font-size:9.5px; font-weight:normal; display:block; text-align:right; white-space:nowrap;">مبلغ الضريبة</span>' : ''}</th>
              <th style="text-align: right; width: 26%; border-bottom: 1px dashed #000000; padding-bottom: 9px;">Net Amt${isBillArabic ? '<br/><span class="arabic-text" style="font-size:9.5px; font-weight:normal; display:block; text-align:right; white-space:nowrap;">المبلغ الصافي</span>' : ''}</th>
              `}
            </tr>
          </thead>
          <tbody>
            <tr>
              ${hasDeliveryCharge ? `
              <td style="text-align: left; font-weight: normal; width: 18%; padding-top: 0;">${vatPercent}%</td>
              <td style="text-align: right; font-weight: normal; width: 22%; padding-top: 0;">${fmt(exclAmount)}</td>
              <td style="text-align: right; font-weight: normal; width: 20%; padding-top: 0;">${fmt(data.vatAmount)}</td>
              <td style="text-align: right; font-weight: normal; width: 20%; padding-top: 0;">${fmt(effectiveDeliveryCharge)}</td>
              <td style="text-align: right; font-weight: normal; width: 20%; padding-top: 0;">${fmt(data.netAmount)}</td>
              ` : `
              <td style="text-align: left; font-weight: normal; width: 20%; padding-top: 0;">${vatPercent}%</td>
              <td style="text-align: right; font-weight: normal; width: 30%; padding-top: 0;">${fmt(exclAmount)}</td>
              <td style="text-align: right; font-weight: normal; width: 24%; padding-top: 0;">${fmt(data.vatAmount)}</td>
              <td style="text-align: right; font-weight: normal; width: 26%; padding-top: 0;">${fmt(data.netAmount)}</td>
              `}
            </tr>
          </tbody>
        </table>
        <div class="dashed-hr"></div>
        `;
        })() : '<div class="dashed-hr"></div>'}
        
        ${(() => {
          const keepChangeVal = (data.change || data.keepChanges || "").trim();
          const hasValidKeepChange = keepChangeVal !== "" && keepChangeVal !== "0" && keepChangeVal !== "0.00" && keepChangeVal !== "0.000";
          const formattedKeepChange = hasValidKeepChange && !isNaN(Number(keepChangeVal)) ? fmt(Number(keepChangeVal)) : keepChangeVal;
          if (!isDelivery) return '';
          const isMissedCall = ["true", "1", "yes"].includes(String(data.missedCall ?? "").trim().toLowerCase());
          if (!(isMissedCall || data.contactNo || effectiveCallBack || hasValidKeepChange || data.customerName || driverVal || data.flatNo || data.buildingNo || data.blockNo || data.roadNo || data.area || data.address || data.providerNo)) return '';

          return `
        <div style="margin-top: 0; font-size: 12px; width: 100%;">
          <div style="font-weight: bold; text-transform: uppercase; margin-bottom: 3px;">
            DELIVERY DETAILS
            ${isBillArabic ? '<bdi class="arabic-text" style="font-size: 11px; margin-left: 6px; white-space:nowrap;">(بيانات التوصيل)</bdi>' : ''}
          </div>
          <div class="solid-hr" style="border-top: 1px solid #000; margin: 9px 0 1px 0;"></div>
          <div style="width: 100%; font-size: 12px;">
            ${isMissedCall ? `<div style="padding: 2px 0; line-height: 1.4; width: 100%; word-break: break-word;"><span style="font-weight: bold; white-space: nowrap;">Missed Call${isBillArabic ? ' <bdi class="arabic-text" style="font-size:10px; font-weight:bold;">(مكالمة فائتة)</bdi>' : ''} : </span><span style="font-weight: bold;">YES</span></div>` : ''}
            ${data.contactNo ? `<div style="padding: 2px 0; line-height: 1.4; width: 100%; word-break: break-word;"><span style="font-weight: bold; white-space: nowrap;">Mob No${isBillArabic ? ' <bdi class="arabic-text" style="font-size:10px; font-weight:bold;">(رقم الجوال)</bdi>' : ''} : </span><span style="font-weight: normal;">${escapeHtml(data.contactNo)}</span></div>` : ''}
            ${effectiveCallBack ? `<div style="padding: 2px 0; line-height: 1.4; width: 100%; word-break: break-word;"><span style="font-weight: bold; white-space: nowrap;">Call Back${isBillArabic ? ' <bdi class="arabic-text" style="font-size:10px; font-weight:bold;">(معاودة الاتصال)</bdi>' : ''} : </span><span style="font-weight: normal;">${escapeHtml(effectiveCallBack)}</span></div>` : ''}
            ${hasValidKeepChange ? `<div style="padding: 2px 0; line-height: 1.4; width: 100%; word-break: break-word;"><span style="font-weight: bold; white-space: nowrap;">Keep Change${isBillArabic ? ' <bdi class="arabic-text" style="font-size:10px; font-weight:bold;">(الباقي)</bdi>' : ''} : </span><span style="font-weight: normal;">${formattedKeepChange}</span></div>` : ''}
            ${data.customerName ? `<div style="padding: 2px 0; line-height: 1.4; width: 100%; word-break: break-word;"><span style="font-weight: bold; white-space: nowrap;">Customer${isBillArabic ? ' <bdi class="arabic-text" style="font-size:10px; font-weight:bold;">(العميل)</bdi>' : ''} : </span><span style="font-weight: normal;" dir="auto">${escapeHtml(data.customerName)}</span></div>` : ''}
            ${driverVal ? `<div style="padding: 2px 0; line-height: 1.4; width: 100%; word-break: break-word;"><span style="font-weight: bold; white-space: nowrap;">Driver${isBillArabic ? ' <bdi class="arabic-text" style="font-size:10px; font-weight:bold;">(السائق)</bdi>' : ''} : </span><span style="font-weight: normal;" dir="auto">${driverVal}</span></div>` : ''}
            ${data.flatNo ? `<div style="padding: 2px 0; line-height: 1.4; width: 100%; word-break: break-word;"><span style="font-weight: bold; white-space: nowrap;">Flat No${isBillArabic ? ' <bdi class="arabic-text" style="font-size:10px; font-weight:bold;">(شقة)</bdi>' : ''} : </span><span style="font-weight: normal;">${escapeHtml(data.flatNo)}</span></div>` : ''}
            ${data.buildingNo ? `<div style="padding: 2px 0; line-height: 1.4; width: 100%; word-break: break-word;"><span style="font-weight: bold; white-space: nowrap;">Building${isBillArabic ? ' <bdi class="arabic-text" style="font-size:10px; font-weight:bold;">(مبنى)</bdi>' : ''} : </span><span style="font-weight: normal;">${escapeHtml(data.buildingNo)}</span></div>` : ''}
            ${data.blockNo ? `<div style="padding: 2px 0; line-height: 1.4; width: 100%; word-break: break-word;"><span style="font-weight: bold; white-space: nowrap;">Block${isBillArabic ? ' <bdi class="arabic-text" style="font-size:10px; font-weight:bold;">(مجمع)</bdi>' : ''} : </span><span style="font-weight: normal;">${escapeHtml(data.blockNo)}</span></div>` : ''}
            ${data.roadNo ? `<div style="padding: 2px 0; line-height: 1.4; width: 100%; word-break: break-word;"><span style="font-weight: bold; white-space: nowrap;">Road${isBillArabic ? ' <bdi class="arabic-text" style="font-size:10px; font-weight:bold;">(طريق)</bdi>' : ''} : </span><span style="font-weight: normal;">${escapeHtml(data.roadNo)}</span></div>` : ''}
            ${data.area ? `<div style="padding: 2px 0; line-height: 1.4; width: 100%; word-break: break-word;"><span style="font-weight: bold; white-space: nowrap;">Area${isBillArabic ? ' <bdi class="arabic-text" style="font-size:10px; font-weight:bold;">(المنطقة)</bdi>' : ''} : </span><span style="font-weight: normal;">${escapeHtml(data.area)}</span></div>` : ''}
            ${data.address && !data.flatNo && !data.buildingNo && !data.roadNo && !data.blockNo ? `<div style="padding: 2px 0; line-height: 1.4; width: 100%; word-break: break-word;"><span style="font-weight: bold; white-space: nowrap;">Address${isBillArabic ? ' <bdi class="arabic-text" style="font-size:10px; font-weight:bold;">(العنوان)</bdi>' : ''} : </span><span style="font-weight: normal;">${escapeHtml(data.address)}</span></div>` : ''}
            ${data.providerNo ? `<div style="padding: 2px 0; line-height: 1.4; width: 100%; word-break: break-word;"><span style="font-weight: bold; white-space: nowrap;">Provider No${isBillArabic ? ' <bdi class="arabic-text" style="font-size:10px; font-weight:bold;">(رقم المزود)</bdi>' : ''} : </span><span style="font-weight: normal;">${escapeHtml(data.providerNo)}</span></div>` : ''}
          </div>
        </div>
        <div class="dashed-hr"></div>
        `;
        })()}

        ${barcodeValue ? `<div class="barcode-container">${barcodeHtml(barcodeValue)}</div>` : ''}
        
        <div style="font-size: 11px; margin-top: 5px; white-space: nowrap;">Print Time${isBillArabic ? ' <bdi class="arabic-text" style="font-size:10px; font-weight:normal;">(وقت الطباعة)</bdi>' : ''} : ${dateStr} ${formattedTimeStr}</div>

        ${customFootersHtml ? `
        <div style="margin-top: 10px; margin-bottom: 8px; padding: 0 4px; width: 100%; box-sizing: border-box; text-align: center;">
          ${customFootersHtml}
        </div>
        ` : ''}
      </body>
    </html>
  `;
};
