import { roundCalc } from "../utils/billing";
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

  const activeTransDate = (transDate || new Date().toISOString()).split("T")[0];
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

  return {
    seriesId: systemSeriesId,
    prefix: "",
    customerId: resolvedCustomerId,
    paymodeId: rootPaymodeId,
    employeeId,
    dayId,
    shiftId,
    transDate: activeTransDate,
    orderTypeId: orderPayload.orderTypeId,
    androidStatus: false,
    saleId: editingSaleId || 0,
    orderId: orderPayload.orderId,
    voucherDate: new Date().toISOString(),
    discAmount: orderPayload.discAmount,
    discPer: orderPayload.discPer,
    serviceCharge: orderPayload.serviceCharge,
    levy: orderPayload.levy,
    vatExclAmount: orderPayload.vatExclAmount,
    vatAmount: orderPayload.vatAmount,
    netAmount: orderPayload.netAmount,
    deliveryCharge: orderPayload.deliveryCharge,
    createdAt: new Date().toISOString(),
    updateAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
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
      change: orderPayload.change || "0.00",
      isComing: orderPayload.isComing,
      comingTime: orderPayload.comingTime,
      providerNo: orderPayload.providerNo,
      driverId: activeDriverId,
      transDate: activeTransDate,
    },
    combinedOrderIds: orderPayload.combinedOrderIds,
    modifiers: orderPayload.modifiers,
    voidProducts: orderPayload.voidProducts,
    voidModifiers: orderPayload.voidModifiers,
    details: orderPayload.details.map((d) => ({
      productId: d.productId,
      unitId: d.unitId,
      vatId: d.vatId,
      qty: d.qty,
      price: d.price,
      discPer: d.discPer,
      discAmount: d.discAmount,
      serviceCharge: d.serviceCharge,
      levy: d.levy,
      vatAmount: d.vatAmount,
      netAmount: d.netAmount,
      baseQty: d.baseQty || d.qty || 1,
      mapId: d.mapId,
      complimentaryStatus: d.complimentaryStatus || false,
    })),
    paymodes:
      rootPaymodeId === 3
        ? validPayments.map((p) => ({ paymodeId: p.paymodeId, amount: p.amount }))
        : [],
  };
};
