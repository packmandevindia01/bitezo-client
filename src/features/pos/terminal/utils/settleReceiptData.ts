/**
 * Terminal settle → the receipt data, after the sales invoice is saved: reads the settled order back (settled
 * details → invoice data → settled print data → order → the cart as last resort), merges the original order's
 * delivery / money fields, maps the lines and fills the receipt fields (waiter, order numbers, delivery, driver,
 * payments, totals). Moved verbatim out of usePosCheckoutFlow.submitSettlementForEmployee (2026-11-11).
 */
import { getTerminalBranchId } from "@shared/config/device";
import { buildPrintPricing } from "../../utils/printPricing";
import { salesInvoiceApi } from '../../services/salesInvoiceApi';
import { orderApi } from '../../services/orderApi';
import { settledOrdersApi } from '../../services/settledOrdersApi';
import { roundCalc, getPrintPrice, getPriceView } from './billing';
import { isBillArabicEnabled, cleanProductName } from '../../utils/alternativeHelpers';
import { sortOrderDetailsBySequence } from './orderSort';
import { getModifierTypeNameById } from '../../services/menuApi';
import { alternativesCache } from '../hooks/usePosProducts';
import { checkOrderHasBillDiscount } from './orderDiscountCheck';
import { store } from '../../../../app/store';
import { isRealEmployeeName, resolveEmployeeNameForPrint } from "../../utils/employeeNames";

// Saved-order data from the API is untyped.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Loose = any;

export interface SettleReceiptInput {
  /** Provider order: the provider name printed in the header ("(ZOMATO)"). */
  providerName?: string;
  /** The settle order payload (getDirectSettleOrderPayload). */
  orderPayload: Loose;
  /** The sales invoice that was sent. */
  salesPayload: Loose;
  /** The create-invoice reply (null on an update). */
  createRes: Loose;
  newSaleId: number | null;
  editingSaleId: number | null;
  editingOrderId: number | null;
  /** Voucher number from the save reply, if any. */
  invoiceNoStr: string | undefined;
  /** Who settled. */
  employeeId: number;
  waiterId: number | null | undefined;
  waiterName: string | null;
  isCombinedOrder: boolean;
  cartDetails: Loose[];
  /** Cart totals (fallback when no settled data comes back). */
  subtotal: number;
  totalDiscountAmount: number;
  totalServiceCharge: number;
  totalLevy: number;
  totalVat: number;
  total: number;
  deliveryCharge: number;
  payments: { paymodeId: number; amount: number }[];
  tenderOptions: Loose[];
  /** Cash change given (shown on the receipt when > 0). */
  cashChange: number;
}

/**
 * Saved detail rows → receipt lines, matched 1-to-1 with the cart lines (mapId → product + unit → product + price
 * → product); extras / modifiers / messages from the saved rows or the cart. Used only when the settled data could
 * not be priced by the print pricing.
 */
export const mapSettledDetailsToPrintItems = ({ detailsData, modifiersData, cartDetails, isBillDisc }: {
  detailsData: Loose[];
  modifiersData: Loose[];
  cartDetails: Loose[];
  isBillDisc: boolean;
}): Loose[] => {
  const sortedDetails = sortOrderDetailsBySequence(detailsData);
  const usedCartIndices = new Set<number>();

  // Helper to find the 1-to-1 corresponding cart item for detail d
  const findCartMatch = (d: any) => {
    const dPid = Number(d.productId || d.itemId || 0);
    const dUnitId = Number(d.unitId ?? d.UnitId ?? 0);
    const dMapId = d.mapId !== undefined ? Number(d.mapId) : undefined;

    // 1. Match by mapId if available
    if (dMapId !== undefined) {
      const idx = cartDetails.findIndex((c, i) => !usedCartIndices.has(i) && c.mapId !== undefined && Number(c.mapId) === dMapId);
      if (idx !== -1) {
        usedCartIndices.add(idx);
        return cartDetails[idx];
      }
    }

    // 2. Match by productId AND unitId
    if (dPid > 0 && dUnitId > 0) {
      const idx = cartDetails.findIndex((c, i) => !usedCartIndices.has(i) && Number(c.productId) === dPid && Number(c.unitId ?? c.product?.unitId ?? 0) === dUnitId);
      if (idx !== -1) {
        usedCartIndices.add(idx);
        return cartDetails[idx];
      }
    }

    // 3. Match by productId AND price (within 0.02)
    if (dPid > 0 && d.price !== undefined) {
      const dPrice = Number(d.price);
      const idx = cartDetails.findIndex((c, i) => !usedCartIndices.has(i) && Number(c.productId) === dPid && Math.abs(Number(c.price) - dPrice) < 0.02);
      if (idx !== -1) {
        usedCartIndices.add(idx);
        return cartDetails[idx];
      }
    }

    // 4. Fallback match by productId
    if (dPid > 0) {
      const idx = cartDetails.findIndex((c, i) => !usedCartIndices.has(i) && Number(c.productId) === dPid);
      if (idx !== -1) {
        usedCartIndices.add(idx);
        return cartDetails[idx];
      }
    }

    return undefined;
  };

  return sortedDetails.map((d: any) => {
    const cartMatch = findCartMatch(d);
    const dPid = Number(d.productId || d.itemId || cartMatch?.productId || 0);
    const dUnitId = Number(d.unitId ?? d.UnitId ?? cartMatch?.unitId ?? cartMatch?.product?.unitId ?? 1);
    const itemMods = modifiersData.filter((m: any) => Number(m.mapId ?? m.MapId ?? 0) === Number(d.mapId ?? d.MapId ?? 0));

    // Prioritize detail modifiers from backend response if present (so prices are consistent with d.price), otherwise fallback to cart extras
    const hasItemModsExtras = itemMods.some((m: any) => (m.status || "").toLowerCase() === "extras" || ((m.status || "") === "" && (m.price || 0) > 0));
    const rawExtras = hasItemModsExtras
      ? itemMods
          .filter((m: any) => (m.status || "").toLowerCase() === "extras" || ((m.status || "") === "" && (m.price || 0) > 0))
          .map((m: any) => ({
            id: m.modifierId,
            name: m.modifierName,
            price: m.price || 0,
            qty: m.qty || 1,
            typeId: m.typeId,
            isPriceTaxExclusive: true,
          }))
      : (cartMatch?.extras && cartMatch.extras.length > 0)
          ? cartMatch.extras
          : [];

    const dedupedExtrasMap = new Map<string, any>();
    (rawExtras || []).forEach((ex: any) => {
      const exName = String(ex.name || ex.modifierName || "").trim().toLowerCase();
      if (!exName) return;
      const exId = ex.id || ex.modifierId || 0;
      const typeId = ex.typeId || 0;
      const key = exId > 0 ? `${exId}-${typeId}` : `${typeId}-${exName}`;
      if (dedupedExtrasMap.has(key)) {
        const existing = dedupedExtrasMap.get(key);
        existing.qty = (existing.qty || 1) + (ex.qty || 1);
      } else {
        dedupedExtrasMap.set(key, { ...ex, qty: ex.qty || 1 });
      }
    });
    const extras = Array.from(dedupedExtrasMap.values());

    // Prioritize user's active cart modifiers if present
    const rawModifiers = (cartMatch?.modifiers && cartMatch.modifiers.length > 0)
      ? cartMatch.modifiers
      : itemMods
          .filter((m: any) => (m.status || "").toLowerCase() === "modifier" || ((m.status || "") === "" && (m.price || 0) <= 0))
          .map((m: any) => {
            const cartMod = cartMatch?.modifiers?.find((cm: any) => cm.id === m.modifierId || cm.name === m.modifierName);
            const typeName = m.typeName || m.modifierTypeName || cartMod?.typeName || getModifierTypeNameById(m.typeId) || "";
            return {
              id: m.modifierId,
              name: m.modifierName || m.name || "",
              qty: m.qty || 1,
              typeId: m.typeId,
              typeName,
              arabicName: m.arabicName || cartMod?.arabicName || "",
            };
          });

    const dedupedModsMap = new Map<string, any>();
    (rawModifiers || []).forEach((mod: any) => {
      const mName = String(mod.name || mod.modifierName || "").trim().toLowerCase();
      if (!mName) return;
      const mId = mod.id || mod.modifierId || 0;
      const typeId = mod.typeId || 0;
      const key = mId > 0 ? `${mId}-${typeId}` : `${typeId}-${mName}`;
      if (dedupedModsMap.has(key)) {
        const existing = dedupedModsMap.get(key);
        existing.qty = (existing.qty || 1) + (mod.qty || 1);
      } else {
        dedupedModsMap.set(key, { ...mod, qty: mod.qty || 1 });
      }
    });
    const modifiers = Array.from(dedupedModsMap.values());

    // Prioritize user's active cart messages if present
    const rawMessages = (cartMatch?.messages && cartMatch.messages.length > 0)
      ? cartMatch.messages
      : itemMods
          .filter((m: any) => (m.status || "").toLowerCase() === "message")
          .map((m: any) => ({
            id: m.modifierId,
            name: m.modifierName || m.name || ""
          }));

    const seenMsgs = new Set<string>();
    const messages = (rawMessages || []).filter((msg: any) => {
      const k = String(msg.name || "").trim().toLowerCase();
      if (!k || seenMsgs.has(k)) return false;
      seenMsgs.add(k);
      return true;
    });

    const qty = d.qty ?? d.Qty ?? cartMatch?.quantity ?? 1;
    const amount = d.netAmount ?? d.amount ?? cartMatch?.lineTotal ?? 0;
    const itemDiscExcl = isBillDisc
      ? 0
      : Number(
          cartMatch?.baseDiscount ||
          cartMatch?.itemDiscountExcl ||
          cartMatch?.itemDiscountAmount ||
          d.discAmount ||
          d.DiscAmount ||
          0
        );
    const itemDiscIncl = isBillDisc
      ? 0
      : Number(
          cartMatch?.itemDiscountIncl ||
          cartMatch?.itemDiscountGross ||
          (cartMatch?.discountType === 'percentage' ? 0 : cartMatch?.discountValue) ||
          (cartMatch?.itemDiscount && cartMatch.itemDiscount > itemDiscExcl ? cartMatch.itemDiscount : 0) ||
          0
        );
    const itemDisc = itemDiscExcl > 0 ? itemDiscExcl : itemDiscIncl;
    const rawPrice = (d.price !== undefined && Number(d.price) > 0)
      ? Number(d.price)
      : (cartMatch?.basePrice !== undefined && Number(cartMatch.basePrice) > 0
          ? Number(cartMatch.basePrice)
          : Number(cartMatch?.catalogPrice ?? cartMatch?.price ?? 0));
    const price = (rawPrice > 0)
      ? (itemDisc > 0 && Math.abs((rawPrice * qty) - amount) < 0.001 && qty > 0 ? (amount + itemDisc) / qty : rawPrice)
      : (qty > 0 ? (amount + itemDisc) / qty : 0);
    let lineBase = price * qty;
    extras.forEach((ex: any) => lineBase += ex.price * ex.qty);

    // Resolve variant name from cartMatch, detail row, or alternativesCache
    let resolvedVariantName = cartMatch?.variantName || d.variantName || d.VariantName || d.altName || d.AltName;
    let resolvedVariantArabic = cartMatch?.variantArabic || d.variantArabic || d.altArabic || d.VariantArabic || d.AltArabic;

    if (!resolvedVariantName && dPid > 0 && dUnitId > 0) {
      const allCachedAlts = Object.entries(alternativesCache)
        .filter(([k]) => k.startsWith(`${dPid}-`))
        .flatMap(([, alts]) => alts);
      const matchedAlt = allCachedAlts.find(
        (a: any) => Number(a.unitId ?? a.UnitId ?? a.id ?? a.Id) === dUnitId
      );
      if (matchedAlt) {
        resolvedVariantName = matchedAlt.altName;
        resolvedVariantArabic = matchedAlt.altArabic;
      }
    }

    let itemVat = Number(d.vatAmount ?? d.VatAmount ?? d.vatAmt ?? d.VatAmt ?? d.taxAmount ?? d.TaxAmount ?? cartMatch?.vatAmount ?? 0);
    if (itemVat <= 0 && amount > lineBase) {
      itemVat = roundCalc(amount - lineBase);
    }
    const extrasSumForLine = extras.reduce((sum: number, ex: any) => sum + Number(ex.price || 0) * Number(ex.qty || 1), 0);
    const lineTotal = cartMatch?.lineTotal ?? d.netAmount ?? (d.amount !== undefined ? (Number(d.amount) + extrasSumForLine) : lineBase);
    const activeVatRate = itemVat > 0 && lineTotal > itemVat
      ? (itemVat / (lineTotal - itemVat))
      : 0.10;
    const resolvedUnitBasePrice = cartMatch?.basePrice !== undefined && Number(cartMatch.basePrice) > 0
      ? Number(cartMatch.basePrice)
      : (price > 0
          ? (cartMatch?.isIncl === false ? price : roundCalc(price / (1 + activeVatRate), 4))
          : (qty > 0 ? Math.max(0, lineTotal - itemVat) / qty : 0));
    const baseAmount = cartMatch?.baseAmount !== undefined && cartMatch.baseAmount > 0
      ? cartMatch.baseAmount
      : roundCalc(resolvedUnitBasePrice * qty, 4);

    const isDerivedFromInclusiveGross = Boolean(
      (cartMatch?.originalLineTotal && Math.abs(price * qty - Number(cartMatch.originalLineTotal)) < 0.05) ||
      (cartMatch?.basePrice && Number(cartMatch.basePrice) > 0 && price > Number(cartMatch.basePrice) + 0.05) ||
      (amount > 0 && itemDisc > 0 && Math.abs(price * qty - (amount + itemDisc)) < 0.05 && (amount + itemDisc) > (cartMatch?.baseAmount || 0))
    );

    const resolvedIsPriceTaxExclusive = isDerivedFromInclusiveGross
      ? false
      : (cartMatch?.isPriceTaxExclusive ??
          (cartMatch?.isIncl === false ? true : (cartMatch?.isIncl === true ? false : undefined)) ??
          (d.isPriceTaxExclusive !== undefined ? d.isPriceTaxExclusive : (d.isIncl === false ? true : (d.isIncl === true ? false : undefined))));

    return {
      productId: dPid,
      unitId: dUnitId,
      quantity: qty,
      price: price,
      basePrice: resolvedUnitBasePrice,
      baseAmount,
      vatAmount: itemVat,
      lineNetAmount: cartMatch?.lineNetAmount ?? (d.netAmount !== undefined ? Number(d.netAmount) : undefined),
      amount: cartMatch?.amount ?? (d.amount !== undefined ? Number(d.amount) : undefined),
      originalLineTotal: cartMatch?.originalLineTotal ?? (d.originalLineTotal !== undefined ? Number(d.originalLineTotal) : undefined),
      extrasTotal: cartMatch?.extrasTotal ?? (d.extrasTotal !== undefined ? Number(d.extrasTotal) : undefined),
      isIncl: isDerivedFromInclusiveGross ? true : (cartMatch?.isIncl ?? d.isIncl),
      isPriceTaxExclusive: resolvedIsPriceTaxExclusive,
      variantName: resolvedVariantName,
      variantArabic: resolvedVariantArabic,
      product: {
        name: cleanProductName(d.productName || d.ProductName || cartMatch?.product?.name, resolvedVariantName) || `Product #${dPid}`,
        price: price,
        arabicName: d.arabicName || d.ArabicName || (d as any).productArabicName || cartMatch?.product?.arabicName
      },
      extras,
      modifiers,
      messages,
      itemDiscount: (getPrintPrice() === "Inclusive") ? (itemDiscIncl > 0 ? itemDiscIncl : itemDisc) : itemDisc,
      itemDiscountAmount: itemDiscExcl > 0 ? itemDiscExcl : itemDisc,
      itemDiscountExcl: itemDiscExcl > 0 ? itemDiscExcl : itemDisc,
      itemDiscountIncl: itemDiscIncl > 0 ? itemDiscIncl : undefined,
      baseDiscount: itemDiscExcl > 0 ? itemDiscExcl : itemDisc,
      discountValue: itemDiscIncl > 0 ? itemDiscIncl : itemDisc,
      discountType: 'amount' as const,
      discAmount: itemDiscExcl > 0 ? itemDiscExcl : itemDisc,
      lineTotal: lineTotal
    };
  });
};

/** Delivery driver's name: on the settled / original order, in its details text, or looked up by driver id. */
const resolveDeliveryDriverName = async (masterData: Loose, origOrderMaster: Loose, orderPayload: Loose): Promise<string> => {
  let resolvedDriver =
    masterData?.driverName ||
    masterData?.allocatedDriverName ||
    masterData?.driver ||
    masterData?.driverEmployeeName ||
    origOrderMaster?.driverName ||
    origOrderMaster?.allocatedDriverName ||
    origOrderMaster?.driver ||
    origOrderMaster?.driverEmployeeName ||
    "";

  if (!resolvedDriver && origOrderMaster && typeof origOrderMaster.details === "string") {
    const match = origOrderMaster.details.match(/\(Driver:\s*([^)]+)\)/i) || origOrderMaster.details.match(/Driver:\s*([A-Za-z0-9_\s]+)/i);
    if (match && match[1]) {
      resolvedDriver = match[1].trim();
    }
  }

  if (!resolvedDriver && masterData && typeof masterData.details === "string") {
    const match = masterData.details.match(/\(Driver:\s*([^)]+)\)/i) || masterData.details.match(/Driver:\s*([A-Za-z0-9_\s]+)/i);
    if (match && match[1]) {
      resolvedDriver = match[1].trim();
    }
  }

  const activeDriverId = masterData?.driverId || origOrderMaster?.driverId || orderPayload?.driverId;
  if (!resolvedDriver && activeDriverId && Number(activeDriverId) > 0) {
    try {
      const branchId =
        getTerminalBranchId() || 1;
      const { employeeService } = await import("../../../general/employee/services/employeeService");
      const dList = await employeeService.getDrivers(branchId);
      const dFound = dList.find((d: any) => d.driverId === Number(activeDriverId));
      if (dFound) {
        resolvedDriver = dFound.driverName;
      }
    } catch (err) {
      console.warn("[usePosCheckoutFlow] Failed to resolve driver name by id:", err);
    }
  }
  return resolvedDriver;
};

/** The receipt data (`{ mappedItems, unifiedPricing, printData }`) for a settle that has just been saved. */
export const buildSettleReceiptPayload = async ({ orderPayload, salesPayload, createRes, newSaleId, editingSaleId, editingOrderId, invoiceNoStr: savedInvoiceNo, employeeId, waiterId, waiterName, isCombinedOrder, cartDetails, subtotal, totalDiscountAmount, totalServiceCharge, totalLevy, totalVat, total, deliveryCharge, payments, tenderOptions, cashChange, providerName }: SettleReceiptInput) => {
  let invoiceNoStr = savedInvoiceNo;
  const finalSaleId = newSaleId || editingSaleId || 0;
  const now = new Date();
  const paymentNames: Record<number, string> = { 1: "Cash", 2: "Card", 3: "Credit" };
  const orderTypesMap: Record<number, string> = {
    1: "DINE IN", 2: "TAKE OUT", 3: "DRIVE THRU", 4: "DELIVERY"
  };
  // Above 4 = a provider's own id (5 Swiggy, 6 Zomato …).
  const mappedOrderType = orderTypesMap[orderPayload.orderTypeId] || (Number(orderPayload.orderTypeId) > 4 ? "PROVIDERS" : "DINE IN");
  


  let orderNoStr = finalSaleId.toString();
  let ticketNoStr = finalSaleId.toString();
  // The order's employee (punched code or default employee, AGENT.md §6.0): name of that id, never another device name.
  let waiterStr = await resolveEmployeeNameForPrint(employeeId, waiterId && waiterId === employeeId ? waiterName : null);
  let sectionStr = orderPayload.sectionId ? String(orderPayload.sectionId) : "DINE IN";
  let tableStr = orderPayload.tableNo ? orderPayload.tableNo : (orderPayload.tableId ? String(orderPayload.tableId) : "");
  let masterData: any = null;
  let origOrderMaster: any = null;
  let detailsData: any[] | null = null;
  let modifiersData: any[] = [];
  let saleRes: any = null;
  const printPriceSetting = getPrintPrice();
  const activeOrderTypeName = orderPayload.orderTypeId === 1 ? "DineIn" : "TakeOut";
  const returnedOrderId = Number(
    createRes?.orderId ??
    createRes?.data?.orderId ??
    createRes?.orderMaster?.orderId ??
    createRes?.orderNo ??
    createRes?.data?.orderNo ??
    salesPayload.orderId
  );
  const targetOrderId = (returnedOrderId && returnedOrderId > 0)
    ? returnedOrderId
    : (orderPayload.orderId || editingOrderId || Number(newSaleId) || 0);

  try {
    saleRes = null;

    // 1. Primary: Fetch authoritative settled order details using the exact print price view
    if (targetOrderId > 0) {
      try {
        const settledRes = await settledOrdersApi.getSettledOrderDetails(targetOrderId, {
          priceView: printPriceSetting,
          orderType: activeOrderTypeName,
        });
        if (settledRes && settledRes.data) {
          saleRes = settledRes.data;
        }
      } catch (err) {
        console.warn("getSettledOrderDetails failed, attempting salesInvoiceApi fallback:", err);
      }
    }

    // 2. Secondary fallback: Sales Invoice API
    if ((!saleRes || (!saleRes.detailsData && !saleRes.details)) && finalSaleId > 0 && targetOrderId > 0) {
      try {
        saleRes = await salesInvoiceApi.getSalesInvoiceData(finalSaleId, targetOrderId);
      } catch (err) {
        console.warn("getSalesInvoiceData failed, attempting fallback:", err);
      }
    }

    // 3. Third fallback: Settled Print Data API
    if ((!saleRes || (!saleRes.detailsData && !saleRes.details)) && finalSaleId > 0) {
      try {
        const printRes = await settledOrdersApi.getSettledPrintData(finalSaleId, targetOrderId || finalSaleId);
        if (printRes && printRes.data) {
          saleRes = printRes.data;
        }
      } catch (err) {
        console.warn("getSettledPrintData fallback failed:", err);
      }
    }

    // 4. Fourth fallback: Order API
    if ((!saleRes || (!saleRes.detailsData && !saleRes.details)) && targetOrderId > 0) {
      try {
        const orderRes = await orderApi.getOrderDetails(targetOrderId, {
          priceView: printPriceSetting,
          orderType: activeOrderTypeName,
        });
        if (orderRes) {
          origOrderMaster = orderRes?.data?.masterData || orderRes?.masterData || orderRes?.data || orderRes;
          if (!saleRes || (!saleRes.detailsData && !saleRes.details)) {
            saleRes = orderRes?.data || orderRes;
          }
        }
      } catch (err) {
        console.warn("getOrderDetails fallback failed:", err);
      }
    }

    // 5. Authoritative synthesis fallback: create standard orderData from cartDetails and salesPayload
    if (!saleRes || (!saleRes.detailsData && !saleRes.details)) {
      saleRes = {
        masterData: {
          orderNo: orderNoStr,
          ticketNo: ticketNoStr,
          voucherNo: invoiceNoStr,
          orderType: mappedOrderType,
          sectionName: sectionStr,
          tableNo: tableStr,
          serviceCharge: totalServiceCharge,
          levy: totalLevy,
          vatExclAmount: roundCalc(Math.max(0, subtotal - totalDiscountAmount) + totalServiceCharge + totalLevy),
          vatAmount: totalVat,
          netAmount: total,
          discAmount: totalDiscountAmount,
          deliveryCharge,
        },
        detailsData: cartDetails.map((c: any, idx: number) => ({
          mapId: c.mapId ?? (idx + 1),
          productId: c.productId,
          productName: c.product?.name || c.name || `Product #${c.productId}`,
          arabicName: c.product?.arabicName || c.arabicName,
          variantName: c.variantName,
          variantArabic: c.variantArabic,
          qty: c.quantity,
          price: (c.basePrice !== undefined && Number(c.basePrice) > 0) ? Number(c.basePrice) : (c.catalogPrice ?? c.price),
          amount: (c.basePrice !== undefined && Number(c.basePrice) > 0) ? (Number(c.basePrice) * c.quantity) : (Number(c.catalogPrice ?? c.price) * c.quantity),
          discAmount: Number(c.baseDiscount || c.itemDiscountExcl || c.itemDiscountAmount || 0),
          discPer: c.discountType === 'percentage' ? (c.discountValue || 0) : 0,
          serviceCharge: c.sc || 0,
          levy: c.levy || 0,
          vatAmount: c.vatAmount || 0,
          netAmount: c.lineNetAmount || c.lineTotal,
          isIncl: c.product?.isIncl ?? c.isIncl,
          isPriceTaxExclusive: true,
        })),
        modifiersData: cartDetails.flatMap((c: any, idx: number) => [
          ...(c.extras || []).map((ex: any) => ({
            mapId: c.mapId ?? (idx + 1),
            modifierId: ex.id,
            modifierName: ex.name,
            price: ex.price,
            qty: ex.qty || 1,
            status: "extras",
          })),
          ...(c.modifiers || []).map((mod: any) => ({
            mapId: c.mapId ?? (idx + 1),
            modifierId: mod.id,
            modifierName: mod.name,
            price: 0,
            qty: mod.qty || 1,
            status: "modifier",
          })),
        ]),
      };
    }

    if (saleRes) {
      masterData = saleRes.masterData || saleRes.master || saleRes.data?.masterData || saleRes.data?.master || saleRes;
      detailsData = saleRes.detailsData || saleRes.details || saleRes.data?.detailsData || saleRes.data?.details || null;
      const rawModData = saleRes.modifiersData || saleRes.modifiers || saleRes.data?.modifiersData || saleRes.data?.modifiers || [];
      const seenModDataKeys = new Set<string>();
      modifiersData = (rawModData || []).filter((m: any) => {
        const mMapId = m.mapId ?? m.MapId ?? m.mapID ?? 0;
        const mModId = m.modifierId ?? m.ModifierId ?? m.id ?? m.Id ?? 0;
        const mName = String(m.modifierName ?? m.ModifierName ?? m.name ?? m.Name ?? "").trim().toLowerCase();
        const key = `${mMapId}-${mModId || mName}`;
        if (seenModDataKeys.has(key)) return false;
        seenModDataKeys.add(key);
        return true;
      });
    }

    if (origOrderMaster && masterData) {
      const origChange = origOrderMaster.change ?? origOrderMaster.keepChanges;
      const curChange = masterData.change ?? masterData.keepChanges;
      const isCurChangeZero = !curChange || curChange === "0.00" || curChange === "0" || curChange === "0.000";
      if (isCurChangeZero && origChange && origChange !== "0.00" && origChange !== "0" && origChange !== "0.000") {
        masterData.change = String(origChange);
        masterData.keepChanges = String(origChange);
      }
      if (!masterData.callBack && origOrderMaster.callBack) {
        masterData.callBack = origOrderMaster.callBack;
      }
      if (!masterData.flatNo && origOrderMaster.flatNo) masterData.flatNo = origOrderMaster.flatNo;
      if (!masterData.buildingNo && origOrderMaster.buildingNo) masterData.buildingNo = origOrderMaster.buildingNo;
      if (!masterData.roadNo && origOrderMaster.roadNo) masterData.roadNo = origOrderMaster.roadNo;
      if (!masterData.blockNo && origOrderMaster.blockNo) masterData.blockNo = origOrderMaster.blockNo;
      if (!masterData.area && origOrderMaster.area) masterData.area = origOrderMaster.area;
      if (!masterData.address && origOrderMaster.address) masterData.address = origOrderMaster.address;
      if (!masterData.deliveryCustomerName && origOrderMaster.deliveryCustomerName) {
        masterData.deliveryCustomerName = origOrderMaster.deliveryCustomerName;
      }
      if (!masterData.contactNo && (origOrderMaster.contactNo || origOrderMaster.mobileNo)) {
        masterData.contactNo = origOrderMaster.contactNo || origOrderMaster.mobileNo;
      }
      if (Number(origOrderMaster.discAmount || 0) > 0 && (!masterData.discAmount || Number(masterData.discAmount) === 0)) {
        masterData.discAmount = origOrderMaster.discAmount;
      }
      if (Number(origOrderMaster.vatAmount || 0) > 0 && (!masterData.vatAmount || Number(masterData.vatAmount) === 0)) {
        masterData.vatAmount = origOrderMaster.vatAmount;
      }
      if (Number(origOrderMaster.vatExclAmount || 0) > 0 && (!masterData.vatExclAmount || Number(masterData.vatExclAmount) === 0)) {
        masterData.vatExclAmount = origOrderMaster.vatExclAmount;
      }
      if (Number(origOrderMaster.serviceCharge || 0) > 0 && (!masterData.serviceCharge || Number(masterData.serviceCharge) === 0)) {
        masterData.serviceCharge = origOrderMaster.serviceCharge;
      }
      if (Number(origOrderMaster.levyAmt || origOrderMaster.levy || 0) > 0 && (!masterData.levyAmt && !masterData.levy || (Number(masterData.levyAmt || 0) === 0 && Number(masterData.levy || 0) === 0))) {
        masterData.levyAmt = origOrderMaster.levyAmt || origOrderMaster.levy;
        masterData.levy = origOrderMaster.levyAmt || origOrderMaster.levy;
      }
    }

    // The saved order's own employee wins (only when it has a name or an id).
    const masterEmpId = masterData?.employeeId ?? masterData?.empId ?? masterData?.waiterId;
    if (isRealEmployeeName(masterData?.employeeName) || Number(masterEmpId) > 0) {
      const masterEmp = await resolveEmployeeNameForPrint(masterEmpId, masterData?.employeeName);
      if (isRealEmployeeName(masterEmp)) waiterStr = masterEmp;
    }

    if (isCombinedOrder) {
      const primaryNo = masterData?.orderNo
        ? String(masterData.orderNo)
        : String(orderPayload.orderId || editingOrderId || "");
      const otherNos = (orderPayload.combinedOrderIds || []).map(String);
      const allNos = [primaryNo, ...otherNos].filter(Boolean);
      const uniqueNos = Array.from(new Set(allNos));
      orderNoStr = uniqueNos.join(", ");
      ticketNoStr = masterData?.ticketNo ? String(masterData.ticketNo) : (uniqueNos[0] || ticketNoStr);
      sectionStr = masterData?.sectionName || sectionStr;
      tableStr = masterData?.tableNo || masterData?.tableName || tableStr;
    } else if (masterData) {
      orderNoStr = masterData.orderNo ? String(masterData.orderNo) : orderNoStr;
      ticketNoStr = masterData.ticketNo ? String(masterData.ticketNo) : ticketNoStr;
      sectionStr = masterData.sectionName || sectionStr;
      tableStr = masterData.tableNo || masterData.tableName || tableStr;
    }

    const rawVoucherNo = masterData?.voucherNo || masterData?.invoiceNo || masterData?.voucherNumber || masterData?.saleNo
      || saleRes?.voucherNo || saleRes?.invoiceNo || saleRes?.data?.voucherNo || saleRes?.data?.invoiceNo;
    if (rawVoucherNo) {
      invoiceNoStr = String(rawVoucherNo);
    }
  } catch (e) {
    console.warn("Failed to fetch invoice metadata for print:", e);
  }

  const isTaxInclusive = printPriceSetting === "Inclusive";
  const isBillDisc = Boolean(
    (cartDetails.length > 0 && cartDetails.some((it: any) => (it.billDiscountAmount && it.billDiscountAmount > 0))) ||
    checkOrderHasBillDiscount({ master: masterData, details: detailsData }) ||
    (detailsData && detailsData.length > 0 && Number(detailsData[0]?.discPer ?? 0) > 0 && detailsData.every((d: any) => Number(d.discPer ?? 0) === Number(detailsData[0]?.discPer ?? 0)))
  );

  const currentProductCache = store.getState()?.pos?.productCache || {};

  let unifiedSettledPricing: any = null;
  if (!isCombinedOrder && (saleRes || (detailsData && detailsData.length > 0))) {
    try {
      unifiedSettledPricing = buildPrintPricing(saleRes || { masterData, detailsData, modifiersData }, {
        dataView: printPriceSetting,
        orderType: mappedOrderType,
        printPrice: printPriceSetting,
        productCache: currentProductCache,
        isBillDiscount: isBillDisc,
      });
    } catch (e) {
      console.warn("[usePosCheckoutFlow] Could not price the settled data:", e);
    }
  }

  let mappedPrintItems = cartDetails;
  if (unifiedSettledPricing && Array.isArray(unifiedSettledPricing.lines) && unifiedSettledPricing.lines.length > 0) {
    mappedPrintItems = unifiedSettledPricing.lines.map((l: any) => ({
      ...l,
      isUnifiedPricingLine: true,
      productId: l.productId,
      quantity: l.quantity,
      price: l.getRate(isTaxInclusive),
      baseAmount: l.exclusiveGross,
      variantName: l.variantName,
      variantArabic: l.variantArabic,
      product: {
        name: l.productName,
        price: l.getRate(isTaxInclusive),
        arabicName: l.productArabicName,
      },
      extras: l.extras,
      modifiers: l.modifiers,
      messages: l.messages,
      itemDiscount: (l.lineDiscount > 0 || l.lineDiscountIncl > 0 || l.lineDiscountExcl > 0)
        ? l.getDiscount(isTaxInclusive)
        : (unifiedSettledPricing.summary.isBillDiscount ? 0 : l.getDiscount(isTaxInclusive)),
      lineTotal: (l.lineDiscount > 0 || l.lineDiscountIncl > 0 || l.lineDiscountExcl > 0)
        ? Math.max(0, (isTaxInclusive ? l.inclusiveGross : l.exclusiveGross) - l.getDiscount(isTaxInclusive))
        : l.getAmount(isTaxInclusive, unifiedSettledPricing.summary.isBillDiscount),
      lineNetAmount: l.inclusiveAmount,
      basePrice: l.exclusiveRate,
      vatAmount: l.vatAmount,
    }));
  } else if (!isCombinedOrder && detailsData && Array.isArray(detailsData) && detailsData.length > 0) {
    try {
      mappedPrintItems = mapSettledDetailsToPrintItems({ detailsData, modifiersData, cartDetails, isBillDisc });
    } catch (err) {
      console.warn("Failed to map API details for printing, falling back to cartDetails:", err);
      mappedPrintItems = cartDetails;
    }
  }

  if (mappedPrintItems === cartDetails && Array.isArray(cartDetails) && cartDetails.length > 0) {
    const isPrintIncl = getPrintPrice() === "Inclusive";
    mappedPrintItems = cartDetails.map((c: any) => {
      const itemDiscIncl = isBillDisc
        ? 0
        : Number(
            c.itemDiscountIncl ||
            c.itemDiscountGross ||
            (c.discountType === "percentage" ? 0 : c.discountValue) ||
            (c.itemDiscount && c.itemDiscount > (c.baseDiscount || 0) ? c.itemDiscount : 0) ||
            0
          );
      const itemDiscExcl = isBillDisc
        ? 0
        : Number(c.baseDiscount || c.itemDiscountExcl || c.itemDiscountAmount || c.itemDiscount || 0);
      const itemDisc = isPrintIncl ? (itemDiscIncl > 0 ? itemDiscIncl : itemDiscExcl) : itemDiscExcl;

      return {
        ...c,
        itemDiscount: itemDisc,
        itemDiscountAmount: itemDiscExcl > 0 ? itemDiscExcl : itemDisc,
        itemDiscountExcl: itemDiscExcl > 0 ? itemDiscExcl : itemDisc,
        itemDiscountIncl: itemDiscIncl > 0 ? itemDiscIncl : undefined,
        baseDiscount: itemDiscExcl > 0 ? itemDiscExcl : itemDisc,
        discountValue: itemDiscIncl > 0 ? itemDiscIncl : itemDisc,
      };
    });
  }

  const isDeliveryOrder = mappedOrderType.toLowerCase().includes("delivery");
  const finalContactNo = masterData?.mobileNo || masterData?.contactNo || orderPayload.contactNo || "";
  const finalCallBack = isDeliveryOrder ? (
    masterData?.callBack || 
    masterData?.callback || 
    (orderPayload as any)?.callBack || 
    (targetOrderId ? localStorage.getItem(`order_callBack_${targetOrderId}`) : null) ||
    (targetOrderId ? sessionStorage.getItem(`order_callBack_${targetOrderId}`) : null) ||
    (finalContactNo ? localStorage.getItem(`delivery_callBack_${finalContactNo}`) : null) ||
    (finalContactNo ? sessionStorage.getItem(`delivery_callBack_${finalContactNo}`) : null) ||
    localStorage.getItem("pos_current_callBack") ||
    ""
  ) : "";
  const finalCustomerName = masterData?.deliveryCustomerName || masterData?.vehicleCustomerName || masterData?.customerName || (orderPayload as any).deliveryCustomerName || orderPayload.customerName || (orderPayload as any).vehicleCustomerName || (isDeliveryOrder ? "DELIVERY CUSTOMER" : "WALK IN");
  const finalFlatNo = isDeliveryOrder ? (masterData?.flatNo || masterData?.flat || masterData?.flatNumber || (orderPayload as any).flatNo || "") : "";
  const finalBuildingNo = isDeliveryOrder ? (masterData?.buildingNo || masterData?.building || masterData?.buildingNumber || (orderPayload as any).buildingNo || "") : "";
  const finalBlockNo = isDeliveryOrder ? (masterData?.blockNo || masterData?.block || masterData?.blockNumber || (orderPayload as any).blockNo || "") : "";
  const finalRoadNo = isDeliveryOrder ? (masterData?.roadNo || masterData?.road || masterData?.roadNumber || masterData?.street || (orderPayload as any).roadNo || "") : "";
  const finalArea = isDeliveryOrder ? (masterData?.area || masterData?.areaName || (orderPayload as any).area || "") : "";
  const finalAddress = isDeliveryOrder ? (masterData?.address || masterData?.customerAddress || masterData?.deliveryAddress || "") : "";
  const finalVehicleNo = masterData?.vehicleNo || orderPayload.vehicleNo || "";
  const finalProviderNo = masterData?.providerNo || masterData?.providerOrderNo || orderPayload.providerNo || orderPayload.providerOrderNo || "";

  const rawKeepChange = isDeliveryOrder
    ? ((orderPayload.change && orderPayload.change !== "0.00" && orderPayload.change !== "0" && orderPayload.change !== "0.000")
        ? String(orderPayload.change)
        : ((masterData as any)?.change && (masterData as any)?.change !== "0.00" && (masterData as any)?.change !== "0" && (masterData as any)?.change !== "0.000")
        ? String((masterData as any)?.change)
        : ((masterData as any)?.keepChanges && (masterData as any)?.keepChanges !== "0.00" && (masterData as any)?.keepChanges !== "0" && (masterData as any)?.keepChanges !== "0.000")
        ? String((masterData as any)?.keepChanges)
        : ((origOrderMaster as any)?.change && (origOrderMaster as any)?.change !== "0.00" && (origOrderMaster as any)?.change !== "0" && (origOrderMaster as any)?.change !== "0.000")
        ? String((origOrderMaster as any)?.change)
        : ((origOrderMaster as any)?.keepChanges && (origOrderMaster as any)?.keepChanges !== "0.00" && (origOrderMaster as any)?.keepChanges !== "0" && (origOrderMaster as any)?.keepChanges !== "0.000")
        ? String((origOrderMaster as any)?.keepChanges)
        : undefined)
    : undefined;

  const resolvedDriver = await resolveDeliveryDriverName(masterData, origOrderMaster, orderPayload);

  return {
    mappedItems: mappedPrintItems,
    unifiedPricing: unifiedSettledPricing || undefined,
    printData: {
      orderNo: orderNoStr,
      ticketNo: ticketNoStr,
      invoiceNo: invoiceNoStr || (finalSaleId > 0 ? String(finalSaleId) : undefined),
      saleId: finalSaleId > 0 ? finalSaleId : undefined,
      waiter: waiterStr,
      counter: "Main",
      section: sectionStr,
      table: tableStr,
      // Provider order: the provider name, so the header prints "(ZOMATO)" (charges are unaffected).
      orderType: Number(orderPayload.orderTypeId) > 4 && providerName ? providerName : mappedOrderType,
      date: now.toLocaleDateString('en-GB'),
      time: now.toLocaleTimeString('en-US', { hour12: true, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      customerName: finalCustomerName,
      driver: isDeliveryOrder ? (resolvedDriver || undefined) : undefined,
      driverName: isDeliveryOrder ? (resolvedDriver || undefined) : undefined,
      contactNo: isDeliveryOrder ? (finalContactNo || undefined) : undefined,
      callBack: isDeliveryOrder ? (finalCallBack || undefined) : undefined,
      missedCall: isDeliveryOrder ? Boolean(masterData?.missedCall ?? orderPayload.missedCall) : undefined,
      change: isDeliveryOrder ? rawKeepChange : undefined,
      keepChanges: isDeliveryOrder ? rawKeepChange : undefined,
      flatNo: isDeliveryOrder ? (finalFlatNo || undefined) : undefined,
      buildingNo: isDeliveryOrder ? (finalBuildingNo || undefined) : undefined,
      blockNo: isDeliveryOrder ? (finalBlockNo || undefined) : undefined,
      roadNo: isDeliveryOrder ? (finalRoadNo || undefined) : undefined,
      area: isDeliveryOrder ? (finalArea || undefined) : undefined,
      address: isDeliveryOrder ? (finalAddress || undefined) : undefined,
      vehicleNo: finalVehicleNo,
      providerNo: finalProviderNo,
      payments: payments.map(p => {
        const matchedTender = (tenderOptions || []).find((t: any) => String(t.id) === String(p.paymodeId));
        return {
          name: matchedTender?.label || paymentNames[p.paymodeId] || "Other",
          amount: (p as any).tenderedAmount ?? p.amount
        };
      }),
      subTotal: unifiedSettledPricing
        ? ((isTaxInclusive && (unifiedSettledPricing.summary.charges || 0) <= 0)
            ? (unifiedSettledPricing.summary.subTotalInclusive > 0 ? unifiedSettledPricing.summary.subTotalInclusive : unifiedSettledPricing.summary.subTotalExclusive)
            : unifiedSettledPricing.summary.subTotalExclusive)
        : ((subtotal && subtotal > 0)
            ? subtotal
            : (masterData?.subTotal ?? (printPriceSetting === "Exclusive" ? masterData?.vatExclAmount : undefined) ?? subtotal)),
      discount: unifiedSettledPricing
        ? ((isTaxInclusive && (unifiedSettledPricing.summary.charges || 0) <= 0)
            ? unifiedSettledPricing.summary.totalDiscountIncl
            : unifiedSettledPricing.summary.totalDiscountExcl)
        : ((totalDiscountAmount && totalDiscountAmount > 0)
            ? totalDiscountAmount
            : Number(masterData?.discAmount ?? masterData?.discount ?? 0)),
      vatExclAmount: masterData?.vatExclAmount ?? (subtotal && totalDiscountAmount ? Math.max(0, subtotal - totalDiscountAmount) : undefined),
      billDiscountValue: orderPayload.billDiscountValue ?? orderPayload.billDiscount ?? undefined,
      isBillDiscount: isBillDisc,
      discAmount: isBillDisc
        ? (unifiedSettledPricing
            ? ((isTaxInclusive && (unifiedSettledPricing.summary.charges || 0) <= 0) ? unifiedSettledPricing.summary.totalDiscountIncl : unifiedSettledPricing.summary.totalDiscountExcl)
            : Number(masterData?.discAmount ?? totalDiscountAmount ?? 0))
        : 0,
      serviceCharge: unifiedSettledPricing
        ? unifiedSettledPricing.summary.serviceCharge
        : (isCombinedOrder ? totalServiceCharge : (Number(masterData?.serviceCharge || 0) > 0 ? Number(masterData.serviceCharge) : totalServiceCharge)),
      levy: unifiedSettledPricing
        ? unifiedSettledPricing.summary.levy
        : (isCombinedOrder ? totalLevy : (Number(masterData?.levyAmt || masterData?.levy || 0) > 0 ? Number(masterData.levyAmt || masterData.levy) : totalLevy)),
      charges: unifiedSettledPricing
        ? unifiedSettledPricing.summary.charges
        : roundCalc(
            (isCombinedOrder ? totalServiceCharge : (Number(masterData?.serviceCharge || 0) > 0 ? Number(masterData.serviceCharge) : totalServiceCharge)) +
            (isCombinedOrder ? totalLevy : (Number(masterData?.levyAmt || masterData?.levy || 0) > 0 ? Number(masterData.levyAmt || masterData.levy) : totalLevy))
          ),
      netValue: unifiedSettledPricing
        ? ((!isTaxInclusive || (unifiedSettledPricing.summary.charges || 0) > 0) ? unifiedSettledPricing.summary.netValue : undefined)
        : ((printPriceSetting !== "Inclusive")
            ? roundCalc(
                Math.max(
                  0,
                  ((subtotal && subtotal > 0) ? subtotal : (masterData?.subTotal ?? (printPriceSetting === "Exclusive" ? masterData?.vatExclAmount : undefined) ?? subtotal)) -
                  ((totalDiscountAmount && totalDiscountAmount > 0) ? totalDiscountAmount : Number(masterData?.discAmount ?? masterData?.discount ?? 0))
                ) +
                roundCalc(
                  (isCombinedOrder ? totalServiceCharge : (Number(masterData?.serviceCharge || 0) > 0 ? Number(masterData.serviceCharge) : totalServiceCharge)) +
                  (isCombinedOrder ? totalLevy : (Number(masterData?.levyAmt || masterData?.levy || 0) > 0 ? Number(masterData.levyAmt || masterData.levy) : totalLevy))
                )
              )
            : undefined),
      vatAmount: unifiedSettledPricing
        ? unifiedSettledPricing.summary.vatAmount
        : (isCombinedOrder ? totalVat : ((totalVat && totalVat > 0) ? totalVat : (masterData?.vatAmount ?? totalVat))),
      deliveryCharge: unifiedSettledPricing
        ? unifiedSettledPricing.summary.deliveryCharge
        : (isCombinedOrder ? deliveryCharge : (masterData?.deliveryCharge ?? deliveryCharge)),
      netAmount: unifiedSettledPricing
        ? unifiedSettledPricing.summary.grandTotal
        : (isCombinedOrder ? total : ((total && total > 0) ? total : (masterData?.netAmount ?? total))),
      changeAmount: cashChange > 0 ? cashChange : undefined,
      isSettlement: true,
      printPrice: (printPriceSetting as any) || undefined,
      priceView: getPriceView(),
      billArabic: isBillArabicEnabled(),
      productCache: currentProductCache,
    }
  };

};
