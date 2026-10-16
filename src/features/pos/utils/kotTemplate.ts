import type { PosCartItem } from "../types";
import { branchApi } from "../../inventory/branches/services/branchApi";
import { getLineStyle } from "../../inventory/branches/utils/lineHelpers";
import { isKotArabicEnabled, getAlternativeArabicName, containsArabic } from "./alternativeHelpers";
import { getModifierTypeNameById } from "../services/menuApi";
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
}

export const resolveKotPrintTaxSetting = (data?: KotPrintData): "Inclusive" | "Exclusive" => {
  if (data?.priceView === "Inclusive" || data?.priceView === "Exclusive") {
    return data.priceView;
  }
  if (data?.printPrice === "Inclusive" || data?.printPrice === "Exclusive") {
    return data.printPrice;
  }

  const directPriceView = localStorage.getItem("priceView");
  if (directPriceView === "Inclusive" || directPriceView === "Exclusive") {
    return directPriceView as "Inclusive" | "Exclusive";
  }
  const directPrintPrice = localStorage.getItem("printPrice");
  if (directPrintPrice === "Inclusive" || directPrintPrice === "Exclusive") {
    return directPrintPrice as "Inclusive" | "Exclusive";
  }

  try {
    for (const key of ["posConfigs", "posConfig", "pos_configs", "pos_config"]) {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        const configs = parsed?.configs || parsed?.data?.configs || parsed?.data || parsed;
        const pv = configs?.priceView || configs?.PriceView;
        if (pv === "Inclusive" || pv === "Exclusive") return pv;
        const pp = configs?.printPrice || configs?.PrintPrice;
        if (pp === "Inclusive" || pp === "Exclusive") return pp;
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
  const isDelivery = orderTypeStr === "DELIVERY" || Boolean(data.flatNo || data.buildingNo || data.blockNo || data.roadNo || data.area || data.address);
  const isDriveThru = orderTypeStr === "DRIVE THRU";

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
    ? (isKotArabic && (data.headerTitle === "VOID ITEMS" || data.headerTitle.includes("VOID")) ? `${data.headerTitle} / أصناف ملغاة` : data.headerTitle)
    : (isKotArabic ? "KOT / طلب المطبخ" : "KOT");

  const decimalPart = getDecimalPart();
  const fmt = (val: number | string | undefined | null) => {
    const n = typeof val === 'string' ? parseFloat(val) : Number(val || 0);
    return (Number.isFinite(n) ? n : 0).toFixed(decimalPart);
  };

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
  let isTaxInclusive = isVatActive ? (printTaxSetting === "Inclusive") : false;

  if (isVatActive && authoritativeSubTotal > 0 && authoritativeVatAmount > 0 && totalNet > 0) {
    const totalDiscVal = Number((data as any).discount || 0);
    if (Math.abs((authoritativeSubTotal - totalDiscVal + authoritativeVatAmount) - totalNet) < 0.05) {
      isTaxInclusive = false;
    } else if (Math.abs((authoritativeSubTotal - totalDiscVal) - totalNet) < 0.05) {
      isTaxInclusive = true;
    }
  }

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

  let itemsHtml = "";

  cartDetails.forEach((item, index) => {
    // Determine the product name
    let name = (item.product?.name || `Item #${item.productId}`).toUpperCase();
    if (item.variantName && item.variantName.toLowerCase().trim() !== 'main') {
      name += ` - ${item.variantName.toUpperCase()}`;
    }
    const qty = item.quantity;
    
    const altArabicName = isKotArabic ? getAlternativeArabicName(item) : "";
    const nameDisplayHtml = altArabicName
      ? `<div style="line-height: 1.3; font-weight: normal;">${name}</div><div dir="rtl" lang="ar" class="arabic-text" style="font-size:13px; font-weight:normal; line-height:1.4; padding: 2px 0 1px 0;">${altArabicName}</div>`
      : `<div style="line-height: 1.3; font-weight: normal;">${name}</div>`;

    const origUnitPrice = Number(item.price ?? item.product?.price ?? 0);
    const itemBaseAmount: number | undefined = (item as any).baseAmount;
    const itemLineTotal: number | undefined = (item as any).lineTotal;
    const itemVat: number = Number((item as any).vatAmount || 0);
    const totalItemDisc = isOrderBillDiscount ? 0 : Number((item as any).itemDiscount ?? (item as any).discAmount ?? 0);

    let extrasSum = 0;
    if (item.extras && item.extras.length > 0) {
      item.extras.forEach(ex => extrasSum += (Number(ex.price || 0) * (ex.qty || 1)));
    }

    // ── 1. Calculate Exclusive Amounts (Tax-Exclusive) ──
    const catalogExclusivePrice = (isVatActive && (authoritativeVatAmount > 0 || data.enableVat) && vatRatio > 0 && vatRatio < 1 && (item as any).isIncl)
      ? (origUnitPrice * vatRatio)
      : (origUnitPrice > 0 ? origUnitPrice : 0);

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
        const isBaseUndiscounted = catalogExclusivePrice > 0
          ? Math.abs(itemBaseAmount - (catalogExclusivePrice * qty)) < 0.01
          : totalItemDisc > 0;
        if (isBaseUndiscounted && totalItemDisc > 0) {
          exclusiveUnitPrice = catalogExclusivePrice > 0 ? catalogExclusivePrice : (itemBaseAmount / qty);
          exclusiveProductLineAmount = Math.max(0, itemBaseAmount - totalItemDisc);
        } else {
          exclusiveProductLineAmount = Math.max(0, itemBaseAmount);
          exclusiveUnitPrice = catalogExclusivePrice > 0 ? catalogExclusivePrice : Math.max(0, (itemBaseAmount + totalItemDisc) / qty);
        }
      } else if (itemVat > 0 && itemLineTotal !== undefined && itemLineTotal > 0) {
        exclusiveProductLineAmount = Math.max(0, itemLineTotal - extrasSum - itemVat);
        exclusiveUnitPrice = catalogExclusivePrice > 0 ? catalogExclusivePrice : (qty > 0 ? Math.max(0, (exclusiveProductLineAmount + totalItemDisc) / qty) : origUnitPrice);
      } else if (isVatActive && (authoritativeVatAmount > 0 || data.enableVat) && origUnitPrice > 0) {
        exclusiveUnitPrice = catalogExclusivePrice;
        exclusiveProductLineAmount = Math.max(0, (exclusiveUnitPrice * qty) - totalItemDisc);
      } else {
        exclusiveUnitPrice = origUnitPrice;
        exclusiveProductLineAmount = Math.max(0, (origUnitPrice * qty) - totalItemDisc);
      }
    }

    // ── 2. Calculate Inclusive Amounts (Tax-Inclusive) ──
    const catalogInclusivePrice = (!isTaxInclusive && isVatActive && vatRatio > 0 && vatRatio < 1 && !(item as any).isIncl)
      ? (origUnitPrice / vatRatio)
      : (origUnitPrice > 0 ? origUnitPrice : 0);

    let lineInclusiveAmt: number;
    let inclusiveUnitPrice: number;

    if (isOrderBillDiscount) {
      inclusiveUnitPrice = catalogInclusivePrice > 0 ? catalogInclusivePrice : origUnitPrice;
      lineInclusiveAmt = inclusiveUnitPrice * qty;
    } else {
      if (itemLineTotal !== undefined && itemLineTotal > 0) {
        const rawLineAmt = Math.max(0, itemLineTotal - extrasSum);
        const isLineUndiscounted = catalogInclusivePrice > 0
          ? Math.abs(rawLineAmt - (catalogInclusivePrice * qty)) < 0.01
          : false;
        if (isLineUndiscounted && totalItemDisc > 0) {
          inclusiveUnitPrice = catalogInclusivePrice;
          lineInclusiveAmt = Math.max(0, rawLineAmt - totalItemDisc);
        } else {
          lineInclusiveAmt = rawLineAmt;
          inclusiveUnitPrice = catalogInclusivePrice > 0 ? catalogInclusivePrice : (qty > 0 ? Math.max(0, (lineInclusiveAmt + totalItemDisc) / qty) : origUnitPrice);
        }
      } else if (itemBaseAmount !== undefined && isVatActive && vatRatio > 0 && vatRatio < 1) {
        const derivedInclusive = itemBaseAmount / vatRatio;
        const isLineUndiscounted = catalogInclusivePrice > 0
          ? Math.abs(derivedInclusive - (catalogInclusivePrice * qty)) < 0.01
          : totalItemDisc > 0;
        if (isLineUndiscounted && totalItemDisc > 0) {
          inclusiveUnitPrice = catalogInclusivePrice > 0 ? catalogInclusivePrice : (derivedInclusive / qty);
          lineInclusiveAmt = Math.max(0, derivedInclusive - totalItemDisc);
        } else {
          lineInclusiveAmt = derivedInclusive;
          inclusiveUnitPrice = catalogInclusivePrice > 0 ? catalogInclusivePrice : (qty > 0 ? Math.max(0, (lineInclusiveAmt + totalItemDisc) / qty) : origUnitPrice);
        }
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
    const amtStr = fmt(finalAmt);
    const rateDisplay = (qty > 1 && finalRate > 0)
      ? `<div style="font-size: 11px; color: #555; font-weight: normal;">@ ${fmt(finalRate)}</div>`
      : "";

    let subRowsHtml = "";

    // Sub-items: extras
    if (item.extras && item.extras.length > 0) {
      const dedupedExtrasMap = new Map<string, any>();
      item.extras.forEach((ex: any) => {
        const rawExName = (ex.name || ex.modifierName || "").trim();
        if (!rawExName) return;
        const exId = ex.id || ex.modifierId || 0;
        const typeId = ex.typeId || 0;
        const key = exId > 0 ? `${exId}-${typeId}` : `${typeId}-${rawExName.toLowerCase()}`;
        if (dedupedExtrasMap.has(key)) {
          const existing = dedupedExtrasMap.get(key);
          existing.qty = (existing.qty || 1) + (ex.qty || 1);
        } else {
          dedupedExtrasMap.set(key, { ...ex, qty: ex.qty || 1 });
        }
      });

      Array.from(dedupedExtrasMap.values()).forEach((ex: any) => {
        const exName = (ex.name || ex.modifierName || "EXTRA").toUpperCase();
        const exArabic = isKotArabic ? (ex.arabicName || ex.arabic || "") : "";
        const exDisplay = exArabic
          ? `+ ${exName} <span dir="rtl" lang="ar" class="arabic-text" style="font-size:11px; font-weight:normal; margin-left:4px; color:#000000;">(${exArabic})</span>`
          : `+ ${exName}`;
        const rawExPrice = Number(ex.price || 0);
        const exUnitPrice = (!isTaxInclusive && isVatActive && vatRatio < 1)
          ? (rawExPrice * vatRatio)
          : rawExPrice;
        const exLineAmt = exUnitPrice * (ex.qty || 1);
        const exAmtStr = rawExPrice > 0 ? fmt(exLineAmt) : "";
        subRowsHtml += `
          <div style="font-size: 11px; font-weight: normal; padding: 1px 0 1px 6px; color: #000000; display: flex; justify-content: space-between;">
            <span>${exDisplay} ${ex.qty > 1 ? `(x${ex.qty})` : ''}</span>
            ${exAmtStr ? `<span style="text-align: right; padding-right: 4px;">${exAmtStr}</span>` : ''}
          </div>
        `;
      });
    }

    // Sub-items: modifiers
    if (item.modifiers && item.modifiers.length > 0) {
      const dedupedModsMap = new Map<string, any>();
      item.modifiers.forEach((mod: any) => {
        const rawModName = (mod.name || mod.modifierName || "").trim();
        if (!rawModName) return;
        const modId = mod.id || mod.modifierId || 0;
        const typeId = mod.typeId || 0;
        const key = modId > 0 ? `${modId}-${typeId}` : `${typeId}-${rawModName.toLowerCase()}`;
        if (dedupedModsMap.has(key)) {
          const existing = dedupedModsMap.get(key);
          existing.qty = (existing.qty || 1) + (mod.qty || 1);
        } else {
          dedupedModsMap.set(key, { ...mod, qty: mod.qty || 1 });
        }
      });

      Array.from(dedupedModsMap.values()).forEach((mod: any) => {
        const rawTypeName = (mod.typeName || mod.modifierTypeName || (mod.typeId ? getModifierTypeNameById(mod.typeId) : "") || "").trim();
        const rawModName = (mod.name || mod.modifierName || "MODIFIER").trim();
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

        const modArabic = isKotArabic ? (mod.arabicName || mod.arabic || "") : "";
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
    if (item.messages && item.messages.length > 0) {
      const seenMsgs = new Set<string>();
      const dedupedMsgs = item.messages.filter((msg: any) => {
        const k = String(msg.name || "").trim().toLowerCase();
        if (!k || seenMsgs.has(k)) return false;
        seenMsgs.add(k);
        return true;
      });
      dedupedMsgs.forEach((msg: any) => {
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

    const cellPadding = index === 0 ? "padding: 8px 0 4px 0;" : "padding: 4px 0;";

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
            font-size: 13px;
            font-weight: normal;
            color: #000000;
            margin: 0;
            padding: 2px 4px;
            width: 100%;
            -webkit-font-smoothing: antialiased;
          }
          table { border-collapse: collapse; width: 100%; table-layout: fixed; }
          .text-center { text-align: center; }
          .font-bold { font-weight: bold; }
          .dashed-line { border: none; border-top: 1px dashed #000000; margin: 6px 0; }
          .solid-line { border: none; border-top: 2px solid #000000; margin: 6px 0; }
          .item-row {
            font-family: 'Cairo', 'Noto Sans Arabic', 'Segoe UI', Tahoma, Arial, sans-serif !important;
            font-size: 13px !important;
            font-weight: normal !important;
          }
          table.items-table {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
            margin-top: 2px;
          }
          table.items-table th {
            font-family: 'Cairo', 'Noto Sans Arabic', 'Segoe UI', Tahoma, Arial, sans-serif;
            font-weight: bold !important;
            font-size: 13px !important;
            color: #000000;
            border-bottom: 1px dashed #000000;
            padding-top: 4px;
            padding-bottom: 8px; /* Clearance above the underline */
            vertical-align: bottom;
          }
          table.items-table td {
            font-family: 'Cairo', 'Noto Sans Arabic', 'Segoe UI', Tahoma, Arial, sans-serif;
            font-weight: normal !important;
            font-size: 13px !important;
            color: #000000;
            vertical-align: top;
          }
          table.items-table tbody tr:first-child td {
            padding-top: 8px !important; /* Clearance below the underline to prevent overlapping with next line */
          }
          .arabic-text {
            direction: rtl;
            text-align: right;
            font-family: 'Cairo', 'Noto Sans Arabic', 'Segoe UI', Tahoma, Arial, 'Traditional Arabic', sans-serif;
            font-weight: normal;
            font-size: 13px;
            color: #000000 !important;
            unicode-bidi: embed;
            text-rendering: optimizeLegibility;
            line-height: 1.4;
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
      <td style="width: 50%; padding: 2px 0; font-size: 11px;">
        ${label ? `<span style="font-weight: bold;">${label} :</span>` : ""} <span style="font-weight: normal;">${val}</span>
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
  if (!isDelivery && !isDriveThru) {
    if (data.vehicleNo && data.customerName) {
      metaHtml += metaRow("Vehicle", data.vehicleNo, "Customer", data.customerName);
    } else if (data.customerName) {
      metaHtml += metaRow("Customer", data.customerName, "", "");
    } else if (data.vehicleNo) {
      metaHtml += metaRow("Vehicle", data.vehicleNo, "", "");
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
      <table style="width: 100%; font-size: 12px; border-collapse: collapse;">
        ${data.contactNo ? `<tr><td style="width: 35%; padding: 2px 0; font-weight: bold;">Mob No :</td><td style="font-weight: normal; padding: 2px 0;">${data.contactNo}</td></tr>` : ''}
        ${data.callBack ? `<tr><td style="width: 35%; padding: 2px 0; font-weight: bold;">Call Back :</td><td style="font-weight: normal; padding: 2px 0;">${data.callBack}</td></tr>` : ''}
        ${hasValidKeepChange ? `<tr><td style="width: 35%; padding: 2px 0; font-weight: bold;">Keep Change :</td><td style="font-weight: normal; padding: 2px 0;">${keepChangeVal}</td></tr>` : ''}
        ${data.customerName ? `<tr><td style="width: 35%; padding: 2px 0; font-weight: bold;">Customer :</td><td style="font-weight: normal; padding: 2px 0;">${data.customerName}</td></tr>` : ''}
        ${driverVal ? `<tr><td style="width: 35%; padding: 2px 0; font-weight: bold;">Driver${isKotArabic ? ' <bdi class="arabic-text" style="font-size:10px; font-weight:bold;">(السائق)</bdi>' : ''} :</td><td style="font-weight: normal; padding: 2px 0;">${driverVal}</td></tr>` : ''}
        ${data.flatNo ? `<tr><td style="width: 35%; padding: 2px 0; font-weight: bold;">Flat No :</td><td style="font-weight: normal; padding: 2px 0;">${data.flatNo}</td></tr>` : ''}
        ${data.buildingNo ? `<tr><td style="width: 35%; padding: 2px 0; font-weight: bold;">Building :</td><td style="font-weight: normal; padding: 2px 0;">${data.buildingNo}</td></tr>` : ''}
        ${data.blockNo ? `<tr><td style="width: 35%; padding: 2px 0; font-weight: bold;">Block :</td><td style="font-weight: normal; padding: 2px 0;">${data.blockNo}</td></tr>` : ''}
        ${data.roadNo ? `<tr><td style="width: 35%; padding: 2px 0; font-weight: bold;">Road :</td><td style="font-weight: normal; padding: 2px 0;">${data.roadNo}</td></tr>` : ''}
        ${data.area ? `<tr><td style="width: 35%; padding: 2px 0; font-weight: bold;">Area :</td><td style="font-weight: normal; padding: 2px 0;">${data.area}</td></tr>` : ''}
        ${data.address && !data.flatNo && !data.buildingNo && !data.roadNo && !data.blockNo ? `<tr><td style="width: 35%; padding: 2px 0; font-weight: bold;">Address :</td><td style="font-weight: normal; padding: 2px 0;">${data.address}</td></tr>` : ''}
        ${data.vehicleNo ? `<tr><td style="width: 35%; padding: 2px 0; font-weight: bold;">Vehicle No :</td><td style="font-weight: normal; padding: 2px 0;">${data.vehicleNo}</td></tr>` : ''}
        ${data.providerNo ? `<tr><td style="width: 35%; padding: 2px 0; font-weight: bold;">Provider No :</td><td style="font-weight: normal; padding: 2px 0;">${data.providerNo}</td></tr>` : ''}
      </table>
    </div>
  ` : '';

  // ─── Order No / Ticket No row ──────
  const orderTicketHtml = `
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 2px;">
      <tr>
        <td style="width: 50%; text-align: left; padding: 4px 0; font-size: 12px;">
          <span style="font-weight: bold;">Order No :</span>&nbsp;
          <span style="font-size: 16px; font-weight: normal;">#${data.orderNo}</span>
        </td>
        <td style="width: 50%; text-align: right; padding: 4px 0; font-size: 12px;">
          <span style="font-weight: bold;">Ticket No :</span>&nbsp;
          <span style="font-size: 16px; font-weight: normal;">#${data.ticketNo}</span>
        </td>
      </tr>
    </table>
  `;

  let tableHeaderHtml = "";
  if (kotHeaderStyle.startsWith("DESCRIPTION")) {
    tableHeaderHtml = `
      <thead>
        <tr>
          <th style="width: 56%; text-align: left; padding: 4px 0 8px 0; font-size: 13px; font-weight: bold; border-bottom: 1px dashed #000000;">
            DESCRIPTION${isKotArabic ? '<div class="arabic-text" style="font-size: 11px; font-weight: bold; text-align: left; margin-top: 2px;">الصنف</div>' : ''}
          </th>
          <th style="width: 18%; text-align: center; padding: 4px 0 8px 0; font-size: 13px; font-weight: bold; border-bottom: 1px dashed #000000;">
            QTY${isKotArabic ? '<div class="arabic-text" style="font-size: 11px; font-weight: bold; text-align: center; margin-top: 2px;">الكمية</div>' : ''}
          </th>
          <th style="width: 26%; text-align: right; padding: 4px 0 8px 0; font-size: 13px; font-weight: bold; border-bottom: 1px dashed #000000;">
            AMT${isKotArabic ? '<div class="arabic-text" style="font-size: 11px; font-weight: bold; text-align: right; margin-top: 2px;">المبلغ</div>' : ''}
          </th>
        </tr>
      </thead>
    `;
  } else {
    tableHeaderHtml = `
      <thead>
        <tr>
          <th style="width: 18%; text-align: center; padding: 4px 0 8px 0; font-size: 13px; font-weight: bold; border-bottom: 1px dashed #000000;">
            QTY${isKotArabic ? '<div class="arabic-text" style="font-size: 11px; font-weight: bold; text-align: center; margin-top: 2px;">الكمية</div>' : ''}
          </th>
          <th style="width: 56%; text-align: left; padding: 4px 0 8px 0; font-size: 13px; font-weight: bold; border-bottom: 1px dashed #000000;">
            DESCRIPTION${isKotArabic ? '<div class="arabic-text" style="font-size: 11px; font-weight: bold; text-align: left; margin-top: 2px;">الصنف</div>' : ''}
          </th>
          <th style="width: 26%; text-align: right; padding: 4px 0 8px 0; font-size: 13px; font-weight: bold; border-bottom: 1px dashed #000000;">
            AMT${isKotArabic ? '<div class="arabic-text" style="font-size: 11px; font-weight: bold; text-align: right; margin-top: 2px;">المبلغ</div>' : ''}
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

  // ─── Totals (KOT prints must not display VAT amount, total amount, or any pricing) ──────
  const totalsHtml = '';

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

          ${isDineIn ? `<div class="text-center" style="font-size: 18px; margin: 8px 0;"><span style="font-weight: bold;">Table :</span> <span style="font-weight: normal;">${data.table}</span></div>` : ''}

          <hr class="solid-line" />
          <div class="text-center" style="font-size: 22px; font-weight: bold; margin: 8px 0;">***${kotHeaderTitleDisplay}***</div>
          <hr class="solid-line" />

          ${itemsTableHtml}

          ${totalsHtml}

          ${deliveryDetailsHtml}
          
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

        ${deliveryDetailsHtml}

        <div class="text-center" style="font-size: 11px; margin-top: 8px;">Print On : ${dateStr} ${timeStr}</div>
      </body>
    </html>
  `;
};
