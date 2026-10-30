import { roundCalc, sanitizeTaxExclusiveDetail, getVatStatus } from "../utils/billing";
import type { SalesInvoicePayload, PaymodeItem } from "../../types";
import type { DirectSettleOrderBase } from "./orderPayloadMapper";

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
  if (!dateVal) return new Date().toISOString().split("T")[0];
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
        discPer: isOrderBillDiscount ? 0 : (sanitized.discPer || 0),
        discAmount: isOrderBillDiscount ? 0 : (sanitized.discAmount || 0),
        serviceCharge: sanitized.serviceCharge || 0,
        levy: sanitized.levy || 0,
        vatAmount: sanitized.vatAmount || 0,
        netAmount: sanitized.netAmount,
        baseQty: sanitized.baseQty || sanitized.qty || 1,
        mapId: sanitized.mapId,
        complimentaryStatus: sanitized.complimentaryStatus || false,
      };
    });

    const totalModifierGross = (orderPayload.modifiers || []).reduce((sum: number, m: any) => sum + Number(m.amount !== undefined ? m.amount : (Number(m.price || 0) * Number(m.qty || 1))), 0);
    const lineExclSum = sanitizedDetails.reduce(
      (sum, d) => sum + (Number(d.price || 0) * Number(d.qty || 1) - Number(d.discAmount || 0)),
      0
    );
    let calcVatExcl = roundCalc(lineExclSum + totalModifierGross);
    const lineVatSum = roundCalc(sanitizedDetails.reduce((sum, d) => sum + Number(d.vatAmount || 0), 0));

    const invoiceDiscAmount = isOrderBillDiscount ? roundCalc(Number(orderPayload.discAmount || 0)) : 0;
    const invoiceDiscPer = isOrderBillDiscount ? Number(orderPayload.discPer || 0) : 0;
    if (isOrderBillDiscount) {
      calcVatExcl = roundCalc(Math.max(0, calcVatExcl - invoiceDiscAmount));
    }

    const isVatEnabled = getVatStatus();
    const isComplimentary = Boolean((orderPayload as any).complimentaryStatus || Number(orderPayload.discPer) === 100);
    const detailsSc = sanitizedDetails.reduce((sum, d) => sum + Number(d.serviceCharge || 0), 0);
    const detailsLevy = sanitizedDetails.reduce((sum, d) => sum + Number(d.levy || 0), 0);
    const totalSc = Number(orderPayload.serviceCharge || 0) || detailsSc;
    const totalLevy = Number(orderPayload.levy || 0) || detailsLevy;
    const taxableBase = Math.max(0, calcVatExcl + totalSc + totalLevy);
    let calcVatAmt = 0;
    if (isVatEnabled && !isComplimentary) {
      const expectedVat = roundCalc(taxableBase * 0.10);
      calcVatAmt = lineVatSum >= expectedVat ? lineVatSum : expectedVat;
    }
    const netPayable = roundCalc(taxableBase + calcVatAmt + Number(orderPayload.deliveryCharge || 0));

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
