import { printCounterName } from "../../utils/printCounterName";
/**
 * Dine-In table screen prints: the guest bill of a table order (row PRINT) and the receipt after SETTLE.
 * Moved out of DineInTableOrdersModal (2026-11-11, split of the window).
 */
import { toDisplayNo } from "../../services/orderResponse";
import { buildPrintPricing } from "../../utils/printPricing";
import { getCachedExtras } from '../../services/menuApi';
import { generateGuestPrintHtml, isEnableVatGuestPrint } from '../../utils/guestPrintTemplate';
import { hasPrinterHeadings, notifyPrinterHeadingWarning } from '../../utils/printHeadingUtils';
import { printHtmlReceipt } from '../../services/qzService';
import { printerSettingsApi } from '../../services/printerSettingsApi';
import { getPriceView, getPrintPrice } from './billing';
import { resolveEmployeeNameForPrint } from "../../utils/employeeNames";
import type { DineInTable, TableOrdersResponse } from '../../types';
import { dineInBillFigures, dineInBillArabic } from "./dineInBillFigures";

// Saved-order data from the API is untyped.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Loose = any;
type ShowToast = (msg: string, type?: "success" | "error" | "info" | "warning") => void;

export interface PrintDineInGuestContext {
  orderIdArg: number | undefined;
  data: TableOrdersResponse | null;
  selectedMaster: TableOrdersResponse["masterData"][number] | null;
  loading: boolean;
  table: DineInTable | null;
  showToast: ShowToast;
  fetchAndMapFullOrder: (orderId: number) => Promise<{ master: Loose; fullOrder: Loose }>;
}

/** Row PRINT: guest bill of one table order to the bill printer. */
export const printDineInGuestReceipt = async ({ orderIdArg, data, selectedMaster, loading, table, showToast, fetchAndMapFullOrder }: PrintDineInGuestContext): Promise<void> => {
  const printMaster = (orderIdArg ? data?.masterData.find((m) => m.orderId === orderIdArg) : null) ?? selectedMaster;
  if (!printMaster || !data || loading) return;

  if (!hasPrinterHeadings()) {
    notifyPrinterHeadingWarning(showToast);
  }

  try {
    showToast(`Preparing receipt for Order #${printMaster.orderNo}...`, 'success');

    const { master, fullOrder } = await fetchAndMapFullOrder(printMaster.orderId);

    const enableVat = isEnableVatGuestPrint();

    // ── Resolve date/time ──
    const isValidDateStr = (s: any) => {
      if (!s || typeof s !== 'string') return false;
      if (s.startsWith('0001')) return false;
      return true;
    };
    const candidateDates = [
      master.voucherDate, master.orderDate, master.transDate, master.createdAt,
    ];
    const resolvedDateStr = candidateDates.find(isValidDateStr);
    let printDate: string | undefined;
    let printTime: string | undefined;
    if (resolvedDateStr) {
      try {
        const d = new Date(resolvedDateStr);
        if (!isNaN(d.getTime()) && d.getFullYear() >= 2000) {
          printDate = d.toLocaleDateString('en-GB');
          printTime = d.toLocaleTimeString('en-US', { hour12: true, hour: '2-digit', minute: '2-digit' });
        }
      } catch {}
    }
    if (!printDate) {
      const now = new Date();
      printDate = now.toLocaleDateString('en-GB');
      printTime = now.toLocaleTimeString('en-US', { hour12: true, hour: '2-digit', minute: '2-digit' });
    }

    // ── Resolve employee name ──
    const rawEmpId = master.employeeId ?? master.empId ?? master.waiterId;
    const resolvedWaiter = await resolveEmployeeNameForPrint(rawEmpId, master.employeeName);

    // ── Resolve customer name ──
    const resolvedCustomerName =
      master.deliveryCustomerName ||
      master.vehicleCustomerName ||
      master.customerName ||
      master.customer ||
      "CASH CUSTOMER";

    const printPriceSetting = getPrintPrice();
    const isTaxInclusive = printPriceSetting === "Inclusive";

    const unified = buildPrintPricing(fullOrder, {
      dataView: getPriceView(),
      orderType: "DineIn",
      printPrice: printPriceSetting,
      allExtras: getCachedExtras(),
      isVatActive: enableVat,
    });

    const figures = dineInBillFigures(unified, master, isTaxInclusive, { discountOnlyForBillDiscount: false });



    const printData: any = {
      orderNo: master.orderNo ?? String(master.orderId),
      ticketNo: toDisplayNo(master.ticketNo) ?? "",
      waiter: resolvedWaiter,
      counter: printCounterName(master),
      section: master.sectionName || "DINE IN",
      table: table?.tableName || "",
      orderType: "DINE IN",
      customerName: resolvedCustomerName,
      date: printDate,
      time: printTime,
      subTotal: figures.subTotal,
      discount: figures.discount,
      serviceCharge: figures.serviceCharge,
      levy: figures.levy,
      charges: figures.charges,
      netValue: figures.netValue,
      vatAmount: figures.vatAmount,
      netAmount: unified.summary.grandTotal,
      deliveryCharge: master.deliveryCharge || 0,
      enableVat,
      printPrice: getPrintPrice(),
      priceView: getPriceView(),
      isBillDiscount: unified.summary.isBillDiscount,
      billArabic: dineInBillArabic(unified),
    };

    const htmlContent = await generateGuestPrintHtml(unified as any, printData);

    let billPrinter: string | undefined;
    try {
      const settingsRes = await printerSettingsApi.getGeneral();
      const gen = settingsRes?.data;
      billPrinter = gen?.androidBillPrinter || gen?.billPrinter || gen?.androidKOTPrinter || gen?.kotPrinter;
    } catch (err) {
      console.warn("[DineInTableOrdersModal] Could not fetch general printer settings:", err);
    }

    if (!billPrinter || billPrinter === "No Printer") {
      billPrinter =
        localStorage.getItem('cachedBillPrinter') ||
        localStorage.getItem('cachedBillPrinterIp') ||
        localStorage.getItem('cachedKotPrinter') ||
        localStorage.getItem('cachedKotPrinterIp') ||
        localStorage.getItem('printerIpAddress') ||
        undefined;
    }

    await printHtmlReceipt(htmlContent, billPrinter);
    showToast("Guest receipt sent to printer!", "success");
  } catch (e: any) {
    console.error("[DineInTableOrdersModal] Print error:", e);
    showToast(e?.message ? `Print failed: ${e.message}` : "Failed to print receipt", "error");
  }
};
