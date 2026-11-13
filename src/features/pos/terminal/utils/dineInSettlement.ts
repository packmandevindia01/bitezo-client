import { printCounterName } from "../../utils/printCounterName";
/**
 * Dine-In table screen → SETTLE: the order sent with the sales invoice (built from the STORED order) and the
 * receipt printed after it. Moved verbatim out of DineInTableOrdersModal.executeSettlement (2026-11-11).
 */
import { toDisplayNo } from "../../services/orderResponse";
import { buildPrintPricing } from "../../utils/printPricing";
import { getCachedExtras } from '../../services/menuApi';
import { generateGuestPrintHtml, isEnableVatGuestPrint } from '../../utils/guestPrintTemplate';
import { printHtmlReceipt } from '../../services/qzService';
import { billPrinter } from '../../utils/cashDrawer';
import { forEachBillCopy } from '../../utils/settlePrintConfig';
import { printerSettingsApi } from '../../services/printerSettingsApi';
import {
  roundCalc,
  getPriceView,
  getPrintPrice,
  CALC_PRECISION,
} from './billing';
import { sortOrderDetailsBySequence } from './orderSort';
import { resolveEmployeeNameForPrint } from "../../utils/employeeNames";
import { checkOrderHasBillDiscount } from './orderDiscountCheck';
import type { DirectSettleOrderBase } from '../mappers/orderPayloadMapper';
import type { DineInTable, TableOrdersResponse } from '../../types';
import { dineInBillFigures, dineInBillArabic } from "./dineInBillFigures";

// Saved-order data from the API is untyped.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Loose = any;
type ShowToast = (msg: string, type?: "success" | "error" | "info" | "warning") => void;
type Payment = { paymodeId: number; amount: number; paymodeName?: string };

export interface DineInSettleOrderInput {
  /** The order as loaded for the settle screen (its master fills gaps in the stored one). */
  settleOrderData: { orderId: number; master: Loose; mappedItems: Loose[]; rawData: Loose };
  /** `GET order` in the Exclusive view: the values the backend saved. */
  rawOrder: Loose;
  status: Loose;
  employeeId: number;
  targetOrderId: number;
  selectedMaster: TableOrdersResponse["masterData"][number];
  changeAmount: number;
  sectionId: number;
  table: DineInTable;
}

/** The order part of the sales invoice for settling a table order, from its stored values (no re-pricing). */
export const buildDineInSettleOrder = ({ settleOrderData, rawOrder, status, employeeId, targetOrderId, selectedMaster, changeAmount, sectionId, table }: DineInSettleOrderInput) => {
  const master = { ...(settleOrderData.rawData?.masterData || {}), ...(rawOrder.masterData || {}) };
  const details = sortOrderDetailsBySequence(rawOrder.detailsData || []);
  const modifiersData = rawOrder.modifiersData || [];

  const rawTransDate = status?.transDate || localStorage.getItem("transDate") || new Date().toISOString();
  const activeTransDate = rawTransDate.split("T")[0];

  const lineDiscountsSum = details.reduce((sum: number, d: any) => sum + Number(d.discAmount ?? d.DiscAmount ?? 0), 0);
  const resolvedDiscAmount = Math.max(Number(master.discAmount ?? master.DiscAmount ?? master.discount ?? 0), lineDiscountsSum);

  const mappedDetails = details.map((d: any) => {
    const qty = Number(d.qty ?? d.Qty ?? 1);
    const price = Number(d.price ?? d.Price ?? 0);
    const amount = Number(d.amount ?? d.Amount ?? price * qty);
    const discAmount = Number(d.discAmount ?? d.DiscAmount ?? 0);
    const serviceCharge = Number(d.serviceCharge ?? d.ServiceCharge ?? 0);
    const levy = Number(d.levy ?? d.Levy ?? 0);
    const vatAmount = Number(d.vatAmount ?? d.VatAmount ?? 0);
    const discPer = Number(d.discPer ?? d.DiscPer ?? 0);
    return {
      productId: d.productId || d.itemId || 0,
      unitId: d.unitId || 1,
      qty,
      price,
      basePrice: price,
      exclusivePrice: price,
      isPriceTaxExclusive: true,
      discPer,
      discAmount,
      serviceCharge,
      levy,
      vatId: d.vatId || 0,
      vatAmount,
      netAmount: roundCalc(Math.max(0, amount - discAmount + serviceCharge + levy + vatAmount)),
      mapId: d.mapId || 0,
      complimentaryStatus: Boolean(d.complimentaryStatus || d.ComplimentaryStatus || discPer === 100),
      baseQty: d.baseQty || qty || 1,
    };
  });

  // Stored modifier rows: extras carry their exclusive price, plain modifiers carry 0.
  const mappedModifiers = modifiersData.map((m: any) => {
    const price = Number(m.price ?? m.Price ?? 0);
    const qty = m.qty || 1;
    const isExtras = price > 0 || (m.status || "").toLowerCase() === "extras";
    return {
      mapId: m.mapId,
      modifierId: m.modifierId,
      qty,
      price,
      amount: isExtras ? roundCalc(price * qty, CALC_PRECISION) : 0,
      typeId: m.typeId || 0,
      modifierName: m.modifierName || "",
      arabicName: m.arabicName || "",
      status: m.status || (isExtras ? "extras" : "modifier"),
    };
  });

  // Totals are the sums of the stored detail rows (detail amount already includes extras).
  const calculatedVatExcl = roundCalc(
    mappedDetails.reduce((sum: number, d: any) => sum + (d.price * d.qty - d.discAmount + d.serviceCharge + d.levy), 0)
  );
  const calculatedVatAmt = roundCalc(mappedDetails.reduce((sum: number, d: any) => sum + d.vatAmount, 0));
  const isComplimentary = Boolean(
    master.complimentaryStatus ||
    master.ComplimentaryStatus ||
    Number(master.discPer ?? master.DiscPer ?? 0) === 100
  );

  const isBillLevelDiscount = Boolean(
    isComplimentary ||
    Number(master.discPer ?? master.DiscPer ?? 0) > 0 ||
    Number(master.billDiscountValue || 0) > 0 ||
    checkOrderHasBillDiscount({ master, details: mappedDetails })
  );

  const directSettleOrder: DirectSettleOrderBase = {
    orderId: targetOrderId,
    customerId: master.customerId || 1,
    employeeId,
    transDate: master.transDate || master.voucherDate || activeTransDate,
    discAmount: resolvedDiscAmount,
    discPer: Number(master.discPer ?? master.DiscPer ?? 0),
    billDiscount: master.billDiscount || master.billDiscountValue || resolvedDiscAmount,
    billDiscountValue: master.billDiscountValue || resolvedDiscAmount,
    billDiscountType: master.billDiscountType || (Number(master.discPer) > 0 ? "percentage" : "amount"),
    isBillDiscount: Boolean(master.isBillDiscount || isBillLevelDiscount),
    complimentaryStatus: isComplimentary,
    serviceCharge: Number(master.serviceCharge ?? (master as any).ServiceCharge ?? 0),
    levy: Number(master.levyAmt ?? master.levy ?? (master as any).Levy ?? 0),
    vatExclAmount: calculatedVatExcl,
    vatAmount: calculatedVatAmt,
    netAmount: master.netAmount || selectedMaster.netAmount,
    deliveryCharge: master.deliveryCharge || 0,
    updatedAt: new Date().toISOString(),
    prevUpdatedAt:
      sessionStorage.getItem(`order_prevUpdatedAt_${targetOrderId}`) ||
      master.prevUpdatedAt ||
      master.updatedAt ||
      undefined,
    orderTypeId: master.orderTypeId || 1,
    sectionId: Number(master.sectionId || sectionId || 0),
    tableId: Number(master.tableId || table.tableId || 0),
    tableNo: master.tableNo || table.tableName || "",
    guestNo: master.guestNo || 0,
    vehicleCustomerName: master.vehicleCustomerName || "",
    vehicleNo: master.vehicleNo || "",
    addressId: master.addressId || 0,
    missedCall: master.missedCall || false,
    contactNo: master.mobileNo || master.contactNo || "",
    note: master.note || "",
    change: String(changeAmount || "0.00"),
    isComing: master.isComing || false,
    comingTime: master.comingTime || new Date().toISOString(),
    providerId: master.providerId || 0,
    providerOrderNo: master.providerOrderNo || "",
    providerNo: master.providerNo || "",
    driverId: master.driverId || 0,
    details: mappedDetails,
    modifiers: mappedModifiers,
    voidProducts: [],
    voidModifiers: [],
    combinedOrderIds: [],
  };
  return { master, directSettleOrder, activeTransDate };
};

export interface DineInSettleReceiptInput {
  master: Loose;
  employeeId: number;
  settleOrderData: { orderId: number; master: Loose; mappedItems: Loose[]; rawData: Loose };
  table: DineInTable;
  invoiceNoStr: string | undefined;
  settledSaleId: number | undefined;
  changeAmount: number;
  mappedPayments: Payment[];
  tenderOptions: { id: string; label: string }[];
  /** POS config Settle Print (print / skip / the cashier's answer). */
  printReceipt: boolean;
  showToast: ShowToast;
}

/** Receipt after settling a table order (bill copies, this device's bill printer first). Throws if printing fails. */
export const printDineInSettleReceipt = async ({ master, employeeId, settleOrderData, table, invoiceNoStr, settledSaleId, changeAmount, mappedPayments, tenderOptions, printReceipt, showToast }: DineInSettleReceiptInput): Promise<void> => {
  const enableVat = isEnableVatGuestPrint();

  // Resolve employee name for settle print
  const settleRawEmpId = master.employeeId ?? master.empId ?? master.waiterId ?? employeeId;
  const settleWaiter = await resolveEmployeeNameForPrint(settleRawEmpId, master.employeeName);

  // Resolve customer name for settle print
  const settleCustomer =
    master.deliveryCustomerName ||
    master.vehicleCustomerName ||
    master.customerName ||
    master.customer ||
    "CASH CUSTOMER";

  const printPriceSetting = getPrintPrice();
  const isTaxInclusive = printPriceSetting === "Inclusive";

  const unified = buildPrintPricing(settleOrderData.rawData || settleOrderData.mappedItems, {
    dataView: getPriceView(),
    orderType: "DineIn",
    printPrice: printPriceSetting,
    allExtras: getCachedExtras(),
  });

  const figures = dineInBillFigures(unified, master, isTaxInclusive, { discountOnlyForBillDiscount: true });


  const printData: any = {
    orderNo: master.orderNo ?? String(master.orderId),
    ticketNo: toDisplayNo(master.ticketNo) ?? "",
    invoiceNo: invoiceNoStr,
    saleId: settledSaleId,
    waiter: settleWaiter,
    counter: printCounterName(master),
    section: master.sectionName || "DINE IN",
    table: table.tableName || "",
    orderType: "DINE IN",
    customerName: settleCustomer,
    date: new Date().toLocaleDateString('en-GB'),
    time: new Date().toLocaleTimeString('en-US', { hour12: true, hour: '2-digit', minute: '2-digit' }),
    subTotal: figures.subTotal,
    discount: figures.discount,
    serviceCharge: figures.serviceCharge,
    levy: figures.levy,
    charges: figures.charges,
    netValue: figures.netValue,
    vatAmount: figures.vatAmount,
    netAmount: unified.summary.grandTotal,
    deliveryCharge: master.deliveryCharge || 0,
    changeAmount: changeAmount,
    payments: mappedPayments.map((p) => ({
      name:
        tenderOptions.find((t: any) => String(t.id) === String(p.paymodeId))?.label ||
        p.paymodeName ||
        "Other",
      amount: p.amount,
    })),
    isSettlement: true,
    enableVat,
    printPrice: getPrintPrice(),
    priceView: getPriceView(),
    isBillDiscount: unified.summary.isBillDiscount,
    billArabic: dineInBillArabic(unified),
  };

  const htmlContent = await generateGuestPrintHtml(unified as any, printData);
  if (printReceipt) {
    showToast("Printing receipt...", "info");
    // Same as the terminal's settle: this device's bill printer first, then the server's.
    // With no name at all it still prints: the agent picks its default printer.
    let printer = billPrinter();
    if (!printer) {
      try {
        const gen = (await printerSettingsApi.getGeneral())?.data;
        const saved = gen?.androidBillPrinter || gen?.billPrinter || gen?.androidKOTPrinter || gen?.kotPrinter;
        if (saved && saved !== "No Printer") printer = saved;
      } catch (err) {
        console.warn("[DineInTableOrdersModal] Could not fetch general printer settings:", err);
      }
    }
    await forEachBillCopy(() => printHtmlReceipt(htmlContent, printer));
  }
};
