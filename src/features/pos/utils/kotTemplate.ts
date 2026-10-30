import type { PosCartItem } from "../types";
import { branchApi } from "../../inventory/branches/services/branchApi";
import { getLineStyle } from "../../inventory/branches/utils/lineHelpers";
import { isKotArabicEnabled, isOtherKitchenItemEnabled, isCompanyNameKotEnabled, getAlternativeArabicName, containsArabic, formatItemDisplayName } from "./alternativeHelpers";
import { getModifierTypeNameById } from "../services/menuApi";
import { getDecimalPart } from "../../../utils/currency";
import { roundCalc } from "../terminal/utils/billing";
import { buildUnifiedOrderPricing, type UnifiedOrderPricingResult } from "./orderPricing";

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
  driver?: string;
  driverName?: string;
  contactNo?: string;
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
  kotHeader?: string;
  kotArabic?: boolean;
  priceView?: "Inclusive" | "Exclusive";
  printPrice?: "Inclusive" | "Exclusive";
  enableVat?: boolean;
  vatRate?: number;
  vatAmount?: number;
  subTotal?: number;
  netAmount?: number;
  otherKitchenItems?: PosCartItem[];
  otherKitchenItemEnabled?: boolean;
  companyNameKot?: boolean;
}

export const resolveKotPrintTaxSetting = (data?: KotPrintData): "Inclusive" | "Exclusive" => {
  // 1. Explicit printPrice in data takes top priority
  if (data?.printPrice === "Inclusive" || data?.printPrice === "Exclusive") {
    return data.printPrice;
  }
  // 2. Direct printPrice setting stored in localStorage from POS Settings > Operational Flags
  const directPrintPrice = localStorage.getItem("printPrice");
  if (directPrintPrice === "Inclusive" || directPrintPrice === "Exclusive") {
    return directPrintPrice as "Inclusive" | "Exclusive";
  }
  // 3. Cached posConfigs JSON check for printPrice
  try {
    for (const key of ["posConfigs", "posConfig", "pos_configs", "pos_config"]) {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        const configs = parsed?.configs || parsed?.data?.configs || parsed?.data || parsed;
        const pp = configs?.printPrice || configs?.PrintPrice;
        if (pp === "Inclusive" || pp === "Exclusive") return pp;
      }
    }
  } catch {}

  // 4. Fallback to screen priceView
  if (data?.priceView === "Inclusive" || data?.priceView === "Exclusive") {
    return data.priceView;
  }
  const directPriceView = localStorage.getItem("priceView");
  if (directPriceView === "Inclusive" || directPriceView === "Exclusive") {
    return directPriceView as "Inclusive" | "Exclusive";
  }
  try {
    for (const key of ["posConfigs", "posConfig", "pos_configs", "pos_config"]) {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        const configs = parsed?.configs || parsed?.data?.configs || parsed?.data || parsed;
        const pv = configs?.priceView || configs?.PriceView;
        if (pv === "Inclusive" || pv === "Exclusive") return pv;
      }
    }
  } catch {}

  return "Inclusive";
};

export const resolveKotHeaderStyle = (dataHeader?: string): string => {
  if (dataHeader) return dataHeader.toUpperCase().replace(/\s+/g, "");
  const direct = localStorage.getItem("kotHeader");
  if (direct) return direct.toUpperCase().replace(/\s+/g, "");
  try {
    for (const key of ["posConfigs", "posConfig", "pos_configs", "pos_config"]) {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        const configs = parsed?.configs || parsed?.data?.configs || parsed?.data || parsed;
        const kh = configs?.kotHeader || configs?.KotHeader;
        if (kh) return String(kh).toUpperCase().replace(/\s+/g, "");
      }
    }
  } catch {}
  return "QTY,DESCRIPTION,AMT";
};

export const generateKotHtml = async (
  cartDetails: PosCartItem[], 
  data: KotPrintData
): Promise<string> => {
  // Use current date/time as fallback
  const now = new Date();
  const dateStr = data.date || now.toLocaleDateString('en-GB'); // DD/MM/YYYY
  const timeStr = data.time || now.toLocaleTimeString('en-US'); // h:mm:ss A

  const kotHeaderStyle = resolveKotHeaderStyle(data.kotHeader);

  const showCompanyHeader = data.companyNameKot ?? isCompanyNameKotEnabled();

  let customHeadersHtml = "";
  if (showCompanyHeader) {
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
        const sessionStr = localStorage.getItem("posSession") || localStorage.getItem("activeBranch");
        if (sessionStr) {
          try {
            const parsed = JSON.parse(sessionStr);
            const lines = parsed.lines || parsed.activeBranch?.lines || [];
            if (Array.isArray(lines) && lines.length > 0) branchLines = lines;
          } catch {}
        }
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
        const headers = branchLines.filter(l => isHeader(l) && (l.value ?? l.lineValue) && String(l.value ?? l.lineValue).trim() !== "");
        if (headers.length > 0) {
          customHeadersHtml = headers.map(l => {
            const val = l.value ?? l.lineValue ?? "";
            const styleObj = getLineStyle(l) as any;
            const styleStr = Object.entries(styleObj).map(([k, v]) => {
              const kebab = k.replace(/[A-Z]/g, m => "-" + m.toLowerCase());
              return `${kebab}:${v}`;
            }).join(";");
            return `<div dir="auto" style="${styleStr}">${val}</div>`;
          }).join("");
        }
      }
    } catch {
      // Silently proceed with fallback headers if branch endpoint is forbidden for cashiers
    }

    if (!customHeadersHtml) {
      const companyFallback =
        localStorage.getItem("companyName") ||
        localStorage.getItem("systemBranchName") ||
        localStorage.getItem("activeBranchName") ||
        localStorage.getItem("branchName") ||
        "";
      if (companyFallback) {
        customHeadersHtml = `<div style="font-size: 18px; font-weight: bold; text-align: center; margin-bottom: 4px;">${companyFallback}</div>`;
      }
    }
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
  const isDelivery = orderTypeStr === "DELIVERY" || Boolean(data.flatNo || data.buildingNo || data.blockNo || data.roadNo || data.area || data.address);

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

  const isMasterKot = Boolean(data.isMaster);
  let effectiveTitle = data.headerTitle || (isMasterKot ? "MASTER KOT" : "KOT");
  if (isMasterKot && effectiveTitle === "KOT") {
    effectiveTitle = "MASTER KOT";
  }

  let kotHeaderTitleDisplay = effectiveTitle;
  if (isKotArabic) {
    const wrapAr = (ar: string) => `<span class="arabic-text" style="font-weight: bold; letter-spacing: normal !important;">${ar}</span>`;
    if (effectiveTitle === "MASTER KOT") {
      kotHeaderTitleDisplay = `MASTER KOT / ${wrapAr("طلب المطبخ الرئيسي")}`;
    } else if (effectiveTitle === "UPDATE MASTER KOT") {
      kotHeaderTitleDisplay = `UPDATE MASTER KOT / ${wrapAr("تعديل طلب المطبخ الرئيسي")}`;
    } else if (effectiveTitle === "MASTER RE-ORDER" || effectiveTitle === "UPDATE RE-ORDER") {
      kotHeaderTitleDisplay = `MASTER RE-ORDER / ${wrapAr("إعادة طلب المطبخ الرئيسي")}`;
    } else if (effectiveTitle === "RE-ORDER") {
      kotHeaderTitleDisplay = `RE-ORDER / ${wrapAr("إعادة الطلب")}`;
    } else if (effectiveTitle === "KOT") {
      kotHeaderTitleDisplay = `KOT / ${wrapAr("طلب المطبخ")}`;
    } else if (effectiveTitle === "UPDATE KOT") {
      kotHeaderTitleDisplay = `UPDATE KOT / ${wrapAr("تعديل طلب المطبخ")}`;
    } else if (effectiveTitle === "VOID ITEMS" || effectiveTitle.includes("VOID")) {
      kotHeaderTitleDisplay = `${effectiveTitle} / ${wrapAr("أصناف ملغاة")}`;
    }
  }

  const decimalPart = getDecimalPart();
  const fmt = (val: number | string | undefined | null) => {
    const n = typeof val === 'string' ? parseFloat(val) : Number(val || 0);
    if (!Number.isFinite(n)) return (0).toFixed(decimalPart);
    return roundCalc(n, decimalPart).toFixed(decimalPart);
  };

  const cartVatSum = cartDetails.reduce((sum, item: any) => sum + (item.vatAmount || 0), 0);
  const rawVat = (data.vatAmount && data.vatAmount > 0) ? data.vatAmount : (cartVatSum > 0 ? cartVatSum : 0);
  const isVatActive = data.enableVat === true || rawVat > 0 || cartVatSum > 0;

  const printTaxSetting = resolveKotPrintTaxSetting(data);
  const isTaxInclusive = isVatActive ? (printTaxSetting === "Inclusive") : false;

  // Single Source of Truth: Unified deterministic order pricing
  const unified: UnifiedOrderPricingResult = (cartDetails && Array.isArray((cartDetails as any).lines) && (cartDetails as any).summary)
    ? (cartDetails as any)
    : buildUnifiedOrderPricing(cartDetails, data);
  const isOrderBillDiscount = unified.summary.isBillDiscount;

  let itemsHtml = "";

  unified.lines.forEach((line) => {
    const name = line.productName.toUpperCase();
    const qty = line.quantity;

    const altArabicName = isKotArabic ? getAlternativeArabicName(line.rawItem) : "";
    const nameDisplayHtml = altArabicName
      ? `<div style="line-height: 1.3; font-weight: normal; word-break: break-word; overflow-wrap: break-word; white-space: normal;">${name}</div><div dir="rtl" lang="ar" class="arabic-text" style="font-size:13px; font-weight:normal; line-height:1.4; padding: 2px 0 1px 0; word-break: break-word; overflow-wrap: break-word; white-space: normal;">${altArabicName}</div>`
      : `<div style="line-height: 1.3; font-weight: normal; word-break: break-word; overflow-wrap: break-word; white-space: normal;">${name}</div>`;

    const finalAmt = line.getAmount(isTaxInclusive, isOrderBillDiscount);
    const amtStr = fmt(finalAmt);
    const rateDisplay = "";

    let subRowsHtml = "";

    // Sub-items: extras
    if (line.extras && line.extras.length > 0) {
      line.extras.forEach((ex) => {
        const exName = (ex.name || "EXTRA").toUpperCase();
        const exArabic = isKotArabic ? (ex.arabicName || "") : "";
        const exDisplay = exArabic
          ? `+ ${exName} <span dir="rtl" lang="ar" class="arabic-text" style="font-size:11px; font-weight:normal; margin-left:4px; color:#000000;">(${exArabic})</span>`
          : `+ ${exName}`;
        subRowsHtml += `
          <div style="font-size: 11px; font-weight: normal; padding: 1px 0 1px 6px; color: #000000;">
            <span>${exDisplay} ${ex.qty > 1 ? `(x${ex.qty})` : ''}</span>
          </div>
        `;
      });
    }

    // Sub-items: modifiers
    if (line.modifiers && line.modifiers.length > 0) {
      line.modifiers.forEach((mod) => {
        const rawTypeName = (mod.typeName || (mod.typeId ? getModifierTypeNameById(mod.typeId) : "") || "").trim();
        const rawModName = (mod.name || "MODIFIER").trim();
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

        const modArabic = isKotArabic ? (mod.arabicName || "") : "";
        const modDisplay = modArabic
          ? `* ${text} <span dir="rtl" lang="ar" class="arabic-text" style="font-size:11px; font-weight:normal; margin-left:4px; color:#000000;">(${modArabic})</span>`
          : `* ${text}`;
        subRowsHtml += `
          <div style="font-size: 11px; font-weight: normal; font-style: italic; padding: 1px 0 1px 6px; color: #000000;">
            ${modDisplay}
          </div>
        `;
      });
    }

    // Sub-items: messages / notes
    if (line.messages && line.messages.length > 0) {
      line.messages.forEach((msg) => {
        const rawName = msg.name || "NOTE";
        const isMsgArabic = containsArabic(rawName);
        const msgDisplay = isMsgArabic
          ? `NOTE: <span dir="rtl" lang="ar" class="arabic-text" style="font-weight: normal;">${rawName}</span>`
          : `NOTE: ${rawName.toUpperCase()}`;
        subRowsHtml += `
          <div style="font-size: 11px; font-weight: normal; font-style: italic; padding: 1px 0 1px 6px; color: #d97706;">
            ${msgDisplay}
          </div>
        `;
      });
    }

    const cellPadding = "padding: 2px 0;";

    if (kotHeaderStyle.startsWith("DESCRIPTION")) {
      itemsHtml += `
        <tr class="item-row" style="border-bottom: 0.5px solid #eee;">
          <td style="width: 56%; text-align: left; vertical-align: top; ${cellPadding} font-weight: normal; font-size: 13px;">
            ${nameDisplayHtml}
            ${rateDisplay}
            ${subRowsHtml}
          </td>
          <td style="width: 18%; text-align: center; vertical-align: top; ${cellPadding} font-weight: normal; font-size: 13px;">${qty}</td>
          <td style="width: 26%; text-align: right; vertical-align: top; ${cellPadding} font-weight: normal; font-size: 13px;">${amtStr}</td>
        </tr>
      `;
    } else {
      itemsHtml += `
        <tr class="item-row" style="border-bottom: 0.5px solid #eee;">
          <td style="width: 18%; text-align: center; vertical-align: top; ${cellPadding} font-weight: normal; font-size: 13px;">${qty}</td>
          <td style="width: 56%; text-align: left; vertical-align: top; ${cellPadding} font-weight: normal; font-size: 13px;">
            ${nameDisplayHtml}
            ${rateDisplay}
            ${subRowsHtml}
          </td>
          <td style="width: 26%; text-align: right; vertical-align: top; ${cellPadding} font-weight: normal; font-size: 13px;">${amtStr}</td>
        </tr>
      `;
    }
  });

  const styles = `
      <head>
        <meta charset="UTF-8" />
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: 'Cairo', 'Noto Sans Arabic', 'Segoe UI', Tahoma, Arial, Helvetica, sans-serif;
            font-size: 12.5px;
            font-weight: normal;
            color: #000000;
            margin: 0;
            padding: 0 2px;
            width: 100%;
            -webkit-font-smoothing: antialiased;
          }
          table { border-collapse: collapse; width: 100%; table-layout: fixed; }
          .text-center { text-align: center; }
          .font-bold { font-weight: bold; }
          .dashed-line { border: none; border-top: 1px dashed #000000; margin: 5px 0; clear: both; }
          .solid-line { border: none; border-top: 1.5px solid #000000; margin: 5px 0; clear: both; }
          .item-row {
            font-family: 'Cairo', 'Noto Sans Arabic', 'Segoe UI', Tahoma, Arial, sans-serif !important;
            font-size: 12.5px !important;
            font-weight: normal !important;
          }
          table.items-table {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
            margin-top: 1px;
          }
          table.items-table th {
            font-family: 'Cairo', 'Noto Sans Arabic', 'Segoe UI', Tahoma, Arial, sans-serif;
            font-weight: bold !important;
            font-size: 12px !important;
            color: #000000;
            border-bottom: 1px dashed #000000;
            padding-top: 2px;
            padding-bottom: 7px !important; /* Clearance above dashed underline for Arabic descenders */
            vertical-align: bottom;
          }
          table.items-table td {
            font-family: 'Cairo', 'Noto Sans Arabic', 'Segoe UI', Tahoma, Arial, sans-serif;
            font-weight: normal !important;
            font-size: 12.5px !important;
            color: #000000;
            vertical-align: top;
            word-break: break-word;
            overflow-wrap: break-word;
          }
          table.items-table tbody tr:first-child td {
            padding-top: 3px !important;
          }
          .arabic-text {
            direction: rtl;
            text-align: right;
            font-family: 'Cairo', 'Noto Sans Arabic', 'Segoe UI', Tahoma, Arial, 'Traditional Arabic', sans-serif;
            font-weight: normal;
            font-size: 12px;
            color: #000000 !important;
            unicode-bidi: embed;
            text-rendering: optimizeLegibility;
            line-height: 1.35;
            word-wrap: normal;
            overflow-wrap: break-word;
            white-space: normal;
            letter-spacing: normal !important;
          }
        </style>
      </head>
  `;

  // ─── Build meta rows (label : value pairs in a 2-column grid) ──────
  const metaLabel = (lbl: string) => {
    if (!isKotArabic || !lbl) return lbl;
    const arMap: Record<string, string> = {
      Date: "التاريخ",
      Time: "الوقت",
      Employee: "الموظف",
      Waiter: "النادل",
      Counter: "الكاونتر",
      Section: "القسم",
      Table: "الطاولة",
      Vehicle: "المركبة",
      Customer: "العميل",
      Driver: "السائق",
    };
    const ar = arMap[lbl];
    return ar ? `${lbl} (${ar})` : lbl;
  };
  const metaCell = (label: string, val: string) => {
    if (!label && !val) return '<td style="width: 50%;"></td>';
    return `
      <td style="width: 50%; padding: 1px 0; font-size: 11px; line-height: 1.25;">
        ${label ? `<span style="font-weight: bold;">${metaLabel(label)} :</span>` : ""} <span style="font-weight: normal;">${val}</span>
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
  const empLabel = isDineIn ? "Waiter" : "Employee";
  metaHtml += metaRow(empLabel, data.waiter, "Counter", data.counter);
  if (isDineIn) {
    metaHtml += metaRow("Section", data.section, "Table", data.table);
  }
  if (!isDelivery) {
    if (data.customerName) {
      metaHtml += `
        <tr>
          <td colspan="2" style="width: 100%; padding: 1px 0; font-size: 11px; line-height: 1.25;">
            <span style="font-weight: bold;">${metaLabel("Customer")} :</span> <span style="font-weight: normal;">${data.customerName}</span>
          </td>
        </tr>
      `;
    }
    if (data.vehicleNo) {
      metaHtml += `
        <tr>
          <td colspan="2" style="width: 100%; padding: 1px 0; font-size: 11px; line-height: 1.25;">
            <span style="font-weight: bold;">${metaLabel("Vehicle")} :</span> <span style="font-weight: normal;">${data.vehicleNo}</span>
          </td>
        </tr>
      `;
    }
  }

  const keepChangeVal = (data.change || data.keepChanges || "").trim();
  const hasValidKeepChange = keepChangeVal !== "" && keepChangeVal !== "0" && keepChangeVal !== "0.00" && keepChangeVal !== "0.000";
  const driverVal = (data.driverName || data.driver || "").trim();

  const hasDeliveryDetails = isDelivery && Boolean(
    data.contactNo || data.callBack || hasValidKeepChange || data.customerName || driverVal || data.flatNo || data.buildingNo || 
    data.blockNo || data.roadNo || data.area || data.address || data.providerNo
  );

  const deliveryDetailsHtml = isDelivery && hasDeliveryDetails ? `
    <div style="margin-top: 8px; border-top: 1px dashed #000; padding-top: 5px; font-size: 12px;">
      <div style="font-weight: bold; text-transform: uppercase; margin-bottom: 4px;">
        DELIVERY DETAILS
        ${isKotArabic ? `<bdi class="arabic-text" style="font-size: 11px; margin-left: 6px; white-space:nowrap; font-weight: bold;">(بيانات التوصيل)</bdi>` : ''}
      </div>
      <div style="width: 100%; font-size: 12px; margin-top: 3px;">
        ${data.contactNo ? `<div style="padding: 1.5px 0; line-height: 1.35; width: 100%; word-break: break-word;"><span style="font-weight: bold; white-space: nowrap;">Mob No${isKotArabic ? ' <bdi class="arabic-text" style="font-size:10px; font-weight:bold;">(رقم الجوال)</bdi>' : ''} : </span><span style="font-weight: normal;">${data.contactNo}</span></div>` : ''}
        ${data.callBack ? `<div style="padding: 1.5px 0; line-height: 1.35; width: 100%; word-break: break-word;"><span style="font-weight: bold; white-space: nowrap;">Call Back${isKotArabic ? ' <bdi class="arabic-text" style="font-size:10px; font-weight:bold;">(معاودة الاتصال)</bdi>' : ''} : </span><span style="font-weight: normal;">${data.callBack}</span></div>` : ''}
        ${hasValidKeepChange ? `<div style="padding: 1.5px 0; line-height: 1.35; width: 100%; word-break: break-word;"><span style="font-weight: bold; white-space: nowrap;">Keep Change${isKotArabic ? ' <bdi class="arabic-text" style="font-size:10px; font-weight:bold;">(الباقي)</bdi>' : ''} : </span><span style="font-weight: normal;">${keepChangeVal}</span></div>` : ''}
        ${data.customerName ? `<div style="padding: 1.5px 0; line-height: 1.35; width: 100%; word-break: break-word;"><span style="font-weight: bold; white-space: nowrap;">Customer${isKotArabic ? ' <bdi class="arabic-text" style="font-size:10px; font-weight:bold;">(العميل)</bdi>' : ''} : </span><span style="font-weight: normal;" dir="auto">${data.customerName}</span></div>` : ''}
        ${driverVal ? `<div style="padding: 1.5px 0; line-height: 1.35; width: 100%; word-break: break-word;"><span style="font-weight: bold; white-space: nowrap;">Driver${isKotArabic ? ' <bdi class="arabic-text" style="font-size:10px; font-weight:bold;">(السائق)</bdi>' : ''} : </span><span style="font-weight: normal;" dir="auto">${driverVal}</span></div>` : ''}
        ${data.flatNo ? `<div style="padding: 1.5px 0; line-height: 1.35; width: 100%; word-break: break-word;"><span style="font-weight: bold; white-space: nowrap;">Flat No${isKotArabic ? ' <bdi class="arabic-text" style="font-size:10px; font-weight:bold;">(شقة)</bdi>' : ''} : </span><span style="font-weight: normal;">${data.flatNo}</span></div>` : ''}
        ${data.buildingNo ? `<div style="padding: 1.5px 0; line-height: 1.35; width: 100%; word-break: break-word;"><span style="font-weight: bold; white-space: nowrap;">Building${isKotArabic ? ' <bdi class="arabic-text" style="font-size:10px; font-weight:bold;">(مبنى)</bdi>' : ''} : </span><span style="font-weight: normal;">${data.buildingNo}</span></div>` : ''}
        ${data.blockNo ? `<div style="padding: 1.5px 0; line-height: 1.35; width: 100%; word-break: break-word;"><span style="font-weight: bold; white-space: nowrap;">Block${isKotArabic ? ' <bdi class="arabic-text" style="font-size:10px; font-weight:bold;">(مجمع)</bdi>' : ''} : </span><span style="font-weight: normal;">${data.blockNo}</span></div>` : ''}
        ${data.roadNo ? `<div style="padding: 1.5px 0; line-height: 1.35; width: 100%; word-break: break-word;"><span style="font-weight: bold; white-space: nowrap;">Road${isKotArabic ? ' <bdi class="arabic-text" style="font-size:10px; font-weight:bold;">(طريق)</bdi>' : ''} : </span><span style="font-weight: normal;">${data.roadNo}</span></div>` : ''}
        ${data.area ? `<div style="padding: 1.5px 0; line-height: 1.35; width: 100%; word-break: break-word;"><span style="font-weight: bold; white-space: nowrap;">Area${isKotArabic ? ' <bdi class="arabic-text" style="font-size:10px; font-weight:bold;">(المنطقة)</bdi>' : ''} : </span><span style="font-weight: normal;">${data.area}</span></div>` : ''}
        ${data.address && !data.flatNo && !data.buildingNo && !data.roadNo && !data.blockNo ? `<div style="padding: 1.5px 0; line-height: 1.35; width: 100%; word-break: break-word;"><span style="font-weight: bold; white-space: nowrap;">Address${isKotArabic ? ' <bdi class="arabic-text" style="font-size:10px; font-weight:bold;">(العنوان)</bdi>' : ''} : </span><span style="font-weight: normal;">${data.address}</span></div>` : ''}
        ${data.vehicleNo ? `<div style="padding: 1.5px 0; line-height: 1.35; width: 100%; word-break: break-word;"><span style="font-weight: bold; white-space: nowrap;">Vehicle No${isKotArabic ? ' <bdi class="arabic-text" style="font-size:10px; font-weight:bold;">(المركبة)</bdi>' : ''} : </span><span style="font-weight: normal;">${data.vehicleNo}</span></div>` : ''}
        ${data.providerNo ? `<div style="padding: 1.5px 0; line-height: 1.35; width: 100%; word-break: break-word;"><span style="font-weight: bold; white-space: nowrap;">Provider No${isKotArabic ? ' <bdi class="arabic-text" style="font-size:10px; font-weight:bold;">(رقم المزود)</bdi>' : ''} : </span><span style="font-weight: normal;">${data.providerNo}</span></div>` : ''}
      </div>
    </div>
  ` : '';

  // ─── Order No / Ticket No row ──────
  const orderTicketHtml = `
    <table style="width: 100%; border-collapse: collapse; margin-top: 2px; margin-bottom: 2px;">
      <tr>
        <td style="width: 50%; text-align: left; padding: 2px 0 6px 0; font-size: 11.5px; line-height: 1.3;">
          <span style="font-weight: bold;">Order No${isKotArabic ? ' <bdi class="arabic-text" style="font-size: 10px; font-weight: normal; margin-left: 2px;">(رقم الطلب)</bdi>' : ''}:</span>&nbsp;
          <span style="font-size: 13.5px; font-weight: bold;">#${data.orderNo}</span>
        </td>
        <td style="width: 50%; text-align: right; padding: 2px 0 6px 0; font-size: 11.5px; line-height: 1.3;">
          <span style="font-weight: bold;">Ticket No${isKotArabic ? ' <bdi class="arabic-text" style="font-size: 10px; font-weight: normal; margin-left: 2px;">(رقم التذكرة)</bdi>' : ''}:</span>&nbsp;
          <span style="font-size: 13.5px; font-weight: bold;">#${data.ticketNo}</span>
        </td>
      </tr>
    </table>
  `;

  let tableHeaderHtml = "";
  if (kotHeaderStyle.startsWith("DESCRIPTION")) {
    tableHeaderHtml = `
      <thead>
        <tr>
          <th style="width: 56%; text-align: left; padding: 2px 0 7px 0; font-size: 12px; font-weight: bold; border-bottom: 1px dashed #000000;">
            DESCRIPTION${isKotArabic ? '<div class="arabic-text" style="font-size: 10.5px; font-weight: bold; text-align: left; margin-top: 1px; padding-bottom: 2px;">الصنف</div>' : ''}
          </th>
          <th style="width: 18%; text-align: center; padding: 2px 0 7px 0; font-size: 12px; font-weight: bold; border-bottom: 1px dashed #000000;">
            QTY${isKotArabic ? '<div class="arabic-text" style="font-size: 10.5px; font-weight: bold; text-align: center; margin-top: 1px; padding-bottom: 2px;">الكمية</div>' : ''}
          </th>
          <th style="width: 26%; text-align: right; padding: 2px 0 7px 0; font-size: 12px; font-weight: bold; border-bottom: 1px dashed #000000;">
            AMT${isKotArabic ? '<div class="arabic-text" style="font-size: 10.5px; font-weight: bold; text-align: right; margin-top: 1px; padding-bottom: 2px;">المبلغ</div>' : ''}
          </th>
        </tr>
      </thead>
    `;
  } else {
    tableHeaderHtml = `
      <thead>
        <tr>
          <th style="width: 18%; text-align: center; padding: 2px 0 7px 0; font-size: 12px; font-weight: bold; border-bottom: 1px dashed #000000;">
            QTY${isKotArabic ? '<div class="arabic-text" style="font-size: 10.5px; font-weight: bold; text-align: center; margin-top: 1px; padding-bottom: 2px;">الكمية</div>' : ''}
          </th>
          <th style="width: 56%; text-align: left; padding: 2px 0 7px 0; font-size: 12px; font-weight: bold; border-bottom: 1px dashed #000000;">
            DESCRIPTION${isKotArabic ? '<div class="arabic-text" style="font-size: 10.5px; font-weight: bold; text-align: left; margin-top: 1px; padding-bottom: 2px;">الصنف</div>' : ''}
          </th>
          <th style="width: 26%; text-align: right; padding: 2px 0 7px 0; font-size: 12px; font-weight: bold; border-bottom: 1px dashed #000000;">
            AMT${isKotArabic ? '<div class="arabic-text" style="font-size: 10.5px; font-weight: bold; text-align: right; margin-top: 1px; padding-bottom: 2px;">المبلغ</div>' : ''}
          </th>
        </tr>
      </thead>
    `;
  }

  // ─── Items section (solid table layout for 100% precision on thermal printers) ──────
  const itemsTableHtml = `
    <table class="items-table" style="width: 100%; border-collapse: collapse; table-layout: fixed;">
      ${tableHeaderHtml}
      <tbody>
        ${itemsHtml}
      </tbody>
    </table>
  `;

  // ─── Other Kitchen Items section (only when enabled and on multi-station KOT prints) ──────
  let otherItemsSectionHtml = "";
  const isOtherKitchenEnabled = data.otherKitchenItemEnabled ?? isOtherKitchenItemEnabled();
  const rawOtherItems = (!data.isMaster && isOtherKitchenEnabled && Array.isArray(data.otherKitchenItems))
    ? data.otherKitchenItems
    : [];

  if (rawOtherItems.length > 0) {
    let otherRowsHtml = "";
    rawOtherItems.forEach((item) => {
      const name = formatItemDisplayName(
        item.product?.name || `Item #${item.productId}`,
        item.variantName
      ).toUpperCase();
      const qty = item.quantity;

      const altArabicName = isKotArabic ? getAlternativeArabicName(item) : "";
      const nameDisplayHtml = altArabicName
        ? `<div style="line-height: 1.3; font-weight: normal; word-break: break-word; overflow-wrap: break-word; white-space: normal;">${name}</div><div dir="rtl" lang="ar" class="arabic-text" style="font-size:13px; font-weight:normal; line-height:1.4; padding: 2px 0 1px 0; word-break: break-word; overflow-wrap: break-word; white-space: normal;">${altArabicName}</div>`
        : `<div style="line-height: 1.3; font-weight: normal; word-break: break-word; overflow-wrap: break-word; white-space: normal;">${name}</div>`;

      let otherSubRowsHtml = "";
      if (item.modifiers && item.modifiers.length > 0) {
        item.modifiers.forEach((mod: any) => {
          const rawModName = (mod.name || mod.modifierName || "").trim();
          if (!rawModName) return;
          const modArabic = isKotArabic ? (mod.arabicName || mod.arabic || "") : "";
          const modDisplay = modArabic
            ? `* ${rawModName.toUpperCase()} <span dir="rtl" lang="ar" class="arabic-text" style="font-size:11px; font-weight:normal; margin-left:4px; color:#000000;">(${modArabic})</span>`
            : `* ${rawModName.toUpperCase()}`;
          otherSubRowsHtml += `
            <div style="font-size: 11px; font-weight: normal; font-style: italic; padding: 1px 0 1px 6px; color: #000000;">
              ${modDisplay}
            </div>
          `;
        });
      }
      if (item.messages && item.messages.length > 0) {
        item.messages.forEach((msg: any) => {
          const rawName = msg.name || "NOTE";
          const isMsgArabic = containsArabic(rawName);
          const msgDisplay = isMsgArabic
            ? `NOTE: <span dir="rtl" lang="ar" class="arabic-text" style="font-weight: normal;">${rawName}</span>`
            : `NOTE: ${rawName.toUpperCase()}`;
          otherSubRowsHtml += `
            <div style="font-size: 11px; font-weight: normal; font-style: italic; padding: 1px 0 1px 6px; color: #d97706;">
              ${msgDisplay}
            </div>
          `;
        });
      }

      const cellPadding = "padding: 2px 0;";

      if (kotHeaderStyle.startsWith("DESCRIPTION")) {
        otherRowsHtml += `
          <tr class="item-row" style="border-bottom: 0.5px solid #eee;">
            <td style="width: 80%; text-align: left; vertical-align: top; ${cellPadding} font-weight: normal; font-size: 12.5px;">
              ${nameDisplayHtml}
              ${otherSubRowsHtml}
            </td>
            <td style="width: 20%; text-align: center; vertical-align: top; ${cellPadding} font-weight: normal; font-size: 12.5px;">${qty}</td>
          </tr>
        `;
      } else {
        otherRowsHtml += `
          <tr class="item-row" style="border-bottom: 0.5px solid #eee;">
            <td style="width: 20%; text-align: center; vertical-align: top; ${cellPadding} font-weight: normal; font-size: 12.5px;">${qty}</td>
            <td style="width: 80%; text-align: left; vertical-align: top; ${cellPadding} font-weight: normal; font-size: 12.5px;">
              ${nameDisplayHtml}
              ${otherSubRowsHtml}
            </td>
          </tr>
        `;
      }
    });

    let otherTableHeaderHtml = "";
    if (kotHeaderStyle.startsWith("DESCRIPTION")) {
      otherTableHeaderHtml = `
        <thead>
          <tr>
            <th style="width: 80%; text-align: left; padding: 2px 0 7px 0; font-size: 12px; font-weight: bold; border-bottom: 1px dashed #000000;">
              DESCRIPTION${isKotArabic ? '<div class="arabic-text" style="font-size: 10.5px; font-weight: bold; text-align: left; margin-top: 1px; padding-bottom: 2px;">الصنف</div>' : ''}
            </th>
            <th style="width: 20%; text-align: center; padding: 2px 0 7px 0; font-size: 12px; font-weight: bold; border-bottom: 1px dashed #000000;">
              QTY${isKotArabic ? '<div class="arabic-text" style="font-size: 10.5px; font-weight: bold; text-align: center; margin-top: 1px; padding-bottom: 2px;">الكمية</div>' : ''}
            </th>
          </tr>
        </thead>
      `;
    } else {
      otherTableHeaderHtml = `
        <thead>
          <tr>
            <th style="width: 20%; text-align: center; padding: 2px 0 7px 0; font-size: 12px; font-weight: bold; border-bottom: 1px dashed #000000;">
              QTY${isKotArabic ? '<div class="arabic-text" style="font-size: 10.5px; font-weight: bold; text-align: center; margin-top: 1px; padding-bottom: 2px;">الكمية</div>' : ''}
            </th>
            <th style="width: 80%; text-align: left; padding: 2px 0 7px 0; font-size: 12px; font-weight: bold; border-bottom: 1px dashed #000000;">
              DESCRIPTION${isKotArabic ? '<div class="arabic-text" style="font-size: 10.5px; font-weight: bold; text-align: left; margin-top: 1px; padding-bottom: 2px;">الصنف</div>' : ''}
            </th>
          </tr>
        </thead>
      `;
    }

    otherItemsSectionHtml = `
      <hr class="solid-line" />
      <div class="text-center" style="font-size: 13.5px; font-weight: bold; margin: 4px 0 2px 0;">
        *** OTHER ITEMS ***
        ${isKotArabic ? '<div class="arabic-text" style="font-size: 11px; font-weight: bold; text-align: center; margin-top: 2px; padding-bottom: 2px; letter-spacing: normal !important;">(الأصناف الأخرى)</div>' : ''}
      </div>
      <table class="items-table other-items-table" style="width: 100%; border-collapse: collapse; table-layout: fixed;">
        ${otherTableHeaderHtml}
        <tbody>
          ${otherRowsHtml}
        </tbody>
      </table>
      <hr class="solid-line" />
    `;
  }

  // ─── Totals (KOT prints must not display VAT amount, total amount, or any pricing) ──────
  const totalsHtml = '';

  // ─── MASTER KOT layout ──────
  if (data.isMaster) {
    return `
      <html>
        ${styles}
        <body>
          ${showCompanyHeader && customHeadersHtml ? `
            <div style="margin-bottom: 8px; padding: 0 4px; width: 100%; box-sizing: border-box; word-break: break-word;">
              ${customHeadersHtml}
            </div>
          ` : ''}

          <div class="text-center" style="font-size: 18px; font-weight: bold; margin-bottom: 5px;">${orderTypeDisplay}</div>

          ${orderTicketHtml}

          <hr class="solid-line" />

          <table>${metaHtml}</table>

          ${isDineIn ? `<div class="text-center" style="font-size: 18px; margin: 8px 0;"><span style="font-weight: bold;">Table${isKotArabic ? ' <bdi class="arabic-text" style="font-size: 14px; font-weight: normal;">(الطاولة)</bdi>' : ''} :</span> <span style="font-weight: normal;">${data.table}</span></div>` : ''}

          <hr class="solid-line" />
          <div class="text-center" style="font-size: 22px; font-weight: bold; margin: 8px 0;">***${kotHeaderTitleDisplay}***</div>
          <hr class="solid-line" />

          ${itemsTableHtml}

          ${totalsHtml}

          ${deliveryDetailsHtml}
          
          <div class="text-center" style="font-size: 11px; margin-top: 8px;">Print On${isKotArabic ? ' <bdi class="arabic-text" style="font-size: 10px; font-weight: normal;">(وقت الطباعة)</bdi>' : ''} : ${dateStr} ${timeStr}</div>
        </body>
      </html>
    `;
  }

  // ─── STATION KOT layout ──────
  return `
    <html>
      ${styles}
      <body>
        ${showCompanyHeader && customHeadersHtml ? `
          <div style="margin-bottom: 8px; padding: 0 4px; width: 100%; box-sizing: border-box; word-break: break-word;">
            ${customHeadersHtml}
          </div>
        ` : ''}
        <div class="text-center" style="font-size: 16px; font-weight: bold; margin-bottom: 2px;">${orderTypeDisplay}</div>
        <div class="text-center" style="font-size: 17px; font-weight: bold; margin-bottom: 3px;">***${kotHeaderTitleDisplay}***</div>

        <hr class="solid-line" />

        <table>${metaHtml}</table>

        ${orderTicketHtml}

        <hr class="solid-line" />

        ${itemsTableHtml}

        ${otherItemsSectionHtml}

        ${totalsHtml}

        ${deliveryDetailsHtml}

        <div class="text-center" style="font-size: 10px; margin-top: 4px;">Print On${isKotArabic ? ' <bdi class="arabic-text" style="font-size: 10px; font-weight: normal;">(وقت الطباعة)</bdi>' : ''} : ${dateStr} ${timeStr}</div>
      </body>
    </html>
  `;
};
