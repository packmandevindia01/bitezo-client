import { roundCalc, sanitizeTaxExclusiveDetail, getVatStatus } from "../utils/billing";
import type { SalesInvoicePayload, PaymodeItem } from "../../types";
import { dec, sumDec, toNum } from "../../../../utils/money";
import type { DirectSettleOrderBase } from "./orderPayloadMapper";

import { toLocalDateString } from "../../../../utils/date";
export interface BuildInvoiceOptions {
  orderPayload: DirectSettleOrderBase;
  payments: { paymodeId: number; amount: number; paymodeName?: string }[];
  employeeId: number;
  dayId: number;
  shiftId: number;
  transDate: string;
  editingSaleId?: number | null;
  isOrderEdited?: boolean;
  tenderOptions?: { id: string; label: string }[];
  activeProviderPostAccountId?: number;
}

export const formatDateOnly = (dateVal: string | Date | undefined | null): string => {
  if (!dateVal) return toLocalDateString();
  if (typeof dateVal === "string") {
    const trimmed = dateVal.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
    if (trimmed.includes("T")) return trimmed.split("T")[0];
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    }
    return trimmed;
  }
  const d = dateVal;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const resolveExactTransDate = (sessionDate?: string): string => {
  const now = new Date();
  if (!sessionDate) {
    return now.toISOString();
  }

  // If sessionDate already has a non-midnight time (e.g. not ending with T00:00:00...)
  if (sessionDate.includes("T") && !sessionDate.includes("T00:00:00")) {
    return sessionDate;
  }

  const datePart = sessionDate.split("T")[0];
  if (!datePart || !/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
    return now.toISOString();
  }

  const [year, month, day] = datePart.split("-").map(Number);
  const combined = new Date();
  combined.setFullYear(year, month - 1, day);
  return combined.toISOString();
};

/**
 * Pure Mapper: Builds the SalesInvoicePayload for POST/PUT /sales-invoices.
 * Guarantees that paymodes balance and line totals conform to backend DTO specs.
 */
export const buildSalesInvoicePayload = (options: BuildInvoiceOptions): SalesInvoicePayload => {
  const {
    orderPayload,
    payments,
    employeeId,
    dayId,
    shiftId,
    transDate,
    editingSaleId = 0,
    isOrderEdited = true,
    tenderOptions = [],
    activeProviderPostAccountId,
  } = options;

  let systemSeriesId =
    Number(localStorage.getItem("systemSeriesId")) ||
    Number(localStorage.getItem("seriesId")) ||
    1;
  if (!systemSeriesId || isNaN(systemSeriesId) || systemSeriesId <= 0 || systemSeriesId > 6) {
    systemSeriesId = 1;
  }

  const activeTransDateIso = resolveExactTransDate(transDate);
  const activeDriverId = orderPayload.driverId || Number(localStorage.getItem("selectedDriverId") || 0);

  const resolvedCustomerId =
    activeProviderPostAccountId && activeProviderPostAccountId > 0
      ? activeProviderPostAccountId
      : orderPayload.customerId || 1;

  // Ensure each payment entry has a valid positive paymodeId
  const validPayments: PaymodeItem[] = payments.map((p) => {
    let pid = Number(p.paymodeId);
    if (!pid || isNaN(pid) || pid <= 0) {
      const cashTender = tenderOptions.find((t) => (t.label || "").toLowerCase().includes("cash"));
      pid = cashTender ? Number(cashTender.id) : 1;
    }
    return {
      paymodeId: pid,
      paymodeName: p.paymodeName,
      amount: roundCalc(p.amount),
    };
  });

  const rootPaymodeId =
    validPayments.length > 1
      ? 3
      : validPayments.length === 1 && validPayments[0].paymodeId > 0
      ? validPayments[0].paymodeId
      : 1;

  const resolvedVoucherDate = formatDateOnly(orderPayload.voucherDate || transDate || new Date());

    const isOrderBillDiscount = Boolean(
      (orderPayload as any).isBillDiscount ||
      Number((orderPayload as any).billDiscountValue || (orderPayload as any).billDiscount || 0) > 0 ||
      (Number(orderPayload.discAmount || 0) > 0 && !(orderPayload.details || []).some((d: any) => Number(d.discAmount || 0) > 0.001))
    );

    const sanitizedDetails = (orderPayload.details || []).map((d: any) => {
      const sanitized = sanitizeTaxExclusiveDetail(d);
      return {
        productId: sanitized.productId,
        unitId: sanitized.unitId || 1,
        vatId: sanitized.vatId || 1,
        qty: sanitized.qty,
        price: sanitized.price,
        basePrice: sanitized.basePrice,
        exclusivePrice: sanitized.exclusivePrice,
        isPriceTaxExclusive: true,
        discPer: sanitized.discPer || 0,
        discAmount: sanitized.discAmount || 0,
        serviceCharge: sanitized.serviceCharge || 0,
        levy: sanitized.levy || 0,
        vatAmount: sanitized.vatAmount || 0,
        netAmount: sanitized.netAmount,
        baseQty: sanitized.baseQty || sanitized.qty || 1,
        mapId: sanitized.mapId,
        complimentaryStatus: sanitized.complimentaryStatus || false,
      };
    });

    // All totals in EXACT decimal (utils/money.ts) and kept as decimals until the end: converting a partial
    // total to a JS number can drop its 14th decimal (only ~16 significant digits), e.g. 100 → 99.99999999999999.
    const totalModifierGrossD = sumDec((orderPayload.modifiers || []).map((m: any) =>
      m.amount !== undefined ? m.amount : dec(m.price || 0).times(Number(m.qty || 1))));
    // Exclusive line value after discount. From the engine's own line values when present (exact);
    // price × qty only for old data — a 14-dp unit price × qty cannot always rebuild the amount (10/3 × 3).
    const lineExcl = (d: any) =>
      d.netAmount !== undefined && d.netAmount !== null
        ? dec(d.netAmount).minus(dec(d.vatAmount || 0)).minus(dec(d.serviceCharge || 0)).minus(dec(d.levy || 0))
        : dec(d.price || 0).times(Number(d.qty || 1)).minus(dec(d.discAmount || 0));
    const lineExclSumD = sumDec(sanitizedDetails.map(lineExcl));
    const masterNetD = dec(orderPayload.vatExclAmount || 0).minus(dec(orderPayload.serviceCharge || 0)).minus(dec(orderPayload.levy || 0));
    const areDetailsCombined = sanitizedDetails.length > 0 && lineExclSumD.minus(masterNetD).abs().lessThan(0.05);
    let calcVatExclD = areDetailsCombined ? lineExclSumD : lineExclSumD.plus(totalModifierGrossD);
    const lineVatSumD = sumDec(sanitizedDetails.map((d) => d.vatAmount || 0));

    const invoiceDiscAmount = isOrderBillDiscount ? roundCalc(Number(orderPayload.discAmount || 0)) : 0;
    const invoiceDiscPer = isOrderBillDiscount ? Number(orderPayload.discPer || 0) : 0;
    const totalDetailDiscSum = toNum(sumDec(sanitizedDetails.map((d) => d.discAmount || 0)));
    if (isOrderBillDiscount && totalDetailDiscSum < 0.001) {
      calcVatExclD = calcVatExclD.minus(dec(invoiceDiscAmount));
    }
    if (calcVatExclD.isNegative()) calcVatExclD = dec(0);

    const isVatEnabled = getVatStatus();
    const isComplimentary = Boolean((orderPayload as any).complimentaryStatus || Number(orderPayload.discPer) === 100);
    const totalScD = Number(orderPayload.serviceCharge || 0) ? dec(orderPayload.serviceCharge) : sumDec(sanitizedDetails.map((d) => d.serviceCharge || 0));
    const totalLevyD = Number(orderPayload.levy || 0) ? dec(orderPayload.levy) : sumDec(sanitizedDetails.map((d) => d.levy || 0));
    let taxableBaseD = calcVatExclD.plus(totalScD).plus(totalLevyD);
    if (taxableBaseD.isNegative()) taxableBaseD = dec(0);
    // VAT is the sum of the per-line VAT (each line uses its own product VAT rate).
    // Previously this was floored at a hard-coded 10% of the whole bill, which over-taxed
    // zero-rated / lower-rated items on the sales invoice.
    let calcVatAmtD = dec(0);
    if (isVatEnabled && !isComplimentary) {
      calcVatAmtD = lineVatSumD.greaterThan(0) ? lineVatSumD : dec(orderPayload.vatAmount || 0);
    }
    const taxableBase = toNum(taxableBaseD);
    const calcVatAmt = toNum(calcVatAmtD);
    const netPayable = toNum(taxableBaseD.plus(calcVatAmtD).plus(dec(orderPayload.deliveryCharge || 0)));

  return {
    seriesId: systemSeriesId,
    prefix: "",
    customerId: resolvedCustomerId,
    paymodeId: rootPaymodeId,
    employeeId,
    dayId,
    shiftId,
    transDate: activeTransDateIso,
    orderTypeId: orderPayload.orderTypeId,
    androidStatus: false,
    saleId: editingSaleId || 0,
    orderId: orderPayload.orderId,
    voucherDate: resolvedVoucherDate,
    discAmount: invoiceDiscAmount,
    discPer: invoiceDiscPer,
    billDiscount: (orderPayload as any).billDiscount ?? (orderPayload as any).billDiscountValue ?? invoiceDiscAmount,
    billDiscountValue: (orderPayload as any).billDiscountValue ?? invoiceDiscAmount,
    billDiscountType: (orderPayload as any).billDiscountType ?? (Number(orderPayload.discPer) > 0 ? "percentage" : "amount"),
    isBillDiscount: isOrderBillDiscount,
    serviceCharge: orderPayload.serviceCharge,
    levy: orderPayload.levy,
    vatExclAmount: taxableBase,
    vatAmount: calcVatAmt,
    netAmount: netPayable,
    deliveryCharge: Math.max(0, orderPayload.deliveryCharge),
    complimentaryStatus: Boolean((orderPayload as any).complimentaryStatus || Number(orderPayload.discPer) === 100),
    createdAt: new Date().toISOString(),
    orderMaster: {
      isOrderEdited,
      sectionId: orderPayload.sectionId,
      tableId: orderPayload.tableId,
      guestNo: orderPayload.guestNo,
      vehicleCustomerName: orderPayload.vehicleCustomerName,
      vehicleNo: orderPayload.vehicleNo,
      addressId: orderPayload.addressId,
      missedCall: orderPayload.missedCall,
      contactNo: orderPayload.contactNo,
      note: orderPayload.note,
      change: (orderPayload.orderTypeId === 4 && orderPayload.change && orderPayload.change !== "0.00" && orderPayload.change !== "0" && orderPayload.change !== "0.000") ? String(orderPayload.change) : "",
      isComing: orderPayload.isComing,
      comingTime: orderPayload.comingTime || new Date().toISOString(),
      providerNo: orderPayload.providerNo,
      driverId: activeDriverId,
      complimentaryStatus: Boolean((orderPayload as any).complimentaryStatus || Number(orderPayload.discPer) === 100),
    },
    combinedOrderIds: orderPayload.combinedOrderIds,
    modifiers: orderPayload.modifiers,
    voidProducts: orderPayload.voidProducts,
    voidModifiers: orderPayload.voidModifiers,
    details: sanitizedDetails,
    paymodes:
      rootPaymodeId === 3
        ? (validPayments.length > 0
            ? validPayments.map((p) => ({ paymodeId: p.paymodeId, amount: p.amount }))
            : [{ paymodeId: 3, amount: orderPayload.netAmount }])
        : [],
  };
};
