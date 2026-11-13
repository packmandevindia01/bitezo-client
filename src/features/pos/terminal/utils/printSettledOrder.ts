import { orderTypeNameFromId } from "../../utils/providerOrderType";
/**
 * Settled orders → PRINT (guest bill of a settled order). Moved verbatim out of PosSettledDetailsModal
 * (2026-11-11, split of the saved-order windows); the window passes what it has loaded.
 */
import { getTerminalBranchId } from "@shared/config/device";
import { toDisplayNo } from "../../services/orderResponse";
import { buildPrintPricing } from "../../utils/printPricing";
import { deliveryApi } from "../../customer/services/deliveryApi";
import { resolveEmployeeNameForPrint } from "../../utils/employeeNames";
import { generateGuestPrintHtml } from "../../utils/guestPrintTemplate";
import { hasPrinterHeadings, notifyPrinterHeadingWarning } from "../../utils/printHeadingUtils";
import { printHtmlReceipt } from "../../services/qzService";
import { printerSettingsApi } from "../../services/printerSettingsApi";
import { getPriceView, getPrintPrice, roundCalc } from "./billing";
import { isBillArabicEnabled } from "../../utils/alternativeHelpers";
import { checkOrderHasBillDiscount } from "./orderDiscountCheck";

// Saved-order data from the API is untyped; the window keeps it as-is.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Loose = any;
type ShowToast = (msg: string, type?: "success" | "error" | "info" | "warning") => void;

export interface PrintSettledOrderContext {
  orderId: number | null;
  order: Loose;
  orderDetailsStr: string | undefined;
  orderSummary: Loose;
  allExtras: Loose[];
  modifierTypes: Loose[];
  products: Loose[];
  productCache: Record<number, Loose>;
  resolvedEmployeeName: string;
  showToast: ShowToast;
  /** Totals the window shows (the print uses the same numbers). */
  displayDiscount: number;
  displaySubTotal: number;
  displayCharges: number;
  displayNetValue: number;
  netAmount: number;
}

/** Print the guest bill of a settled order to the bill printer. */
export const printSettledOrderReceipt = async ({ orderId, order, orderDetailsStr, orderSummary, allExtras, modifierTypes, products, productCache, resolvedEmployeeName, showToast, displayDiscount, displaySubTotal, displayCharges, displayNetValue, netAmount }: PrintSettledOrderContext): Promise<void> => {
  if (!orderId || !order) return;

  if (!hasPrinterHeadings()) {
    notifyPrinterHeadingWarning(showToast);
  }

  try {
    showToast(`Preparing Receipt for Order #${orderId}...`, "success");

    const rawMaster = order.masterData || order.master || order;
    const master = Array.isArray(rawMaster) ? (rawMaster[0] || {}) : (rawMaster || {});

    const orderTypeName =
      master.orderType ||
      orderTypeNameFromId(master.orderTypeId) ||
      master.orderTypeName ||
      order?.orderTypeName ||
      "DineIn";

    const isValidDateStr = (s: any) => {
      if (!s || typeof s !== "string") return false;
      if (s.startsWith("0001")) return false;
      return true;
    };

    const candidateDates = [
      master.voucherDate,
      master.transDate,
      master.orderDate,
      master.createdAt,
      master.entryDate,
      order.voucherDate,
      order.transDate,
      order.createdAt,
    ];

    const resolvedDateStr = candidateDates.find(isValidDateStr);

    let date: string | undefined;
    let time: string | undefined;

    if (resolvedDateStr) {
      try {
        const d = new Date(resolvedDateStr);
        if (!isNaN(d.getTime()) && d.getFullYear() >= 2000) {
          date = d.toLocaleDateString("en-GB");
          time = d.toLocaleTimeString("en-US", { hour12: true, hour: "2-digit", minute: "2-digit" });
        }
      } catch {
        /* ignore */
      }
    }

    const detailsStr = orderDetailsStr || order.details || orderSummary?.details || "";
    if (!date && typeof detailsStr === "string") {
      const timeMatch = detailsStr.match(/(\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM))/i);
      const dateMatch = detailsStr.match(/(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})/);
      if (dateMatch) date = dateMatch[1];
      if (timeMatch) time = timeMatch[1];
    }

    if (!date) {
      const now = new Date();
      date = now.toLocaleDateString("en-GB");
      time = now.toLocaleTimeString("en-US", { hour12: true, hour: "2-digit", minute: "2-digit" });
    }

    const printPriceSetting = getPrintPrice();
    const isTaxInclusive = printPriceSetting === "Inclusive";

    const isBillLevelDiscount = checkOrderHasBillDiscount(order);
    const unified = buildPrintPricing(order, {
      dataView: getPriceView(),
      orderType: orderTypeName,
      printPrice: printPriceSetting,
      allExtras,
      modifierTypes,
      products,
      productCache,
      isBillDiscount: isBillLevelDiscount,
    });

    const printDetails = Array.isArray(order?.detailsData) ? order.detailsData : (Array.isArray(order?.details) ? order.details : []);
    const printModifiersData = Array.isArray(order?.modifiersData) ? order.modifiersData : (Array.isArray(order?.modifiers) ? order.modifiers : []);
    const linesToMap = (printDetails && printDetails.length > 0) ? printDetails : (unified ? unified.lines : []);

    const mappedItems = linesToMap.map((l: any, i: number) => {
      if (l?.isUnifiedPricingLine === true) {
        return {
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
          itemDiscount: (unified?.summary?.isBillDiscount || isBillLevelDiscount)
            ? 0
            : l.getDiscount(isTaxInclusive),
          lineTotal: (unified?.summary?.isBillDiscount || isBillLevelDiscount)
            ? (isTaxInclusive ? l.inclusiveGross : l.exclusiveGross)
            : Math.max(0, (isTaxInclusive ? l.inclusiveGross : l.exclusiveGross) - l.getDiscount(isTaxInclusive)),
          lineNetAmount: l.inclusiveAmount,
          basePrice: l.exclusiveRate,
          vatAmount: l.vatAmount,
        };
      }

      const primaryName = l.productName || l.itemName || `Item #${l.productId || i + 1}`;
      const arabicName = l.arabicName || l.productArabicName || "";
      const variantName = l.variantName || l.altName || "";
      const variantArabic = l.variantArabic || l.altArabic || "";
      const qty = Number(l.qty ?? l.quantity ?? 1);
      const price = Number(l.price ?? 0);
      const lineTotal = Number(l.amount ?? (price * qty));
      const itemDisc = Number(l.discAmount ?? 0);

      const itemMapId = l.mapId ?? l.MapId;
      const itemMods = itemMapId !== undefined
        ? printModifiersData.filter((m: any) => Number(m.mapId ?? m.MapId) === Number(itemMapId))
        : [];

      const extras = itemMods.filter((m: any) => {
        const p = Number(m.price ?? 0);
        const s = String(m.status || "").toLowerCase();
        const tid = Number(m.typeId || 0);
        return s === "extras" || s === "extra" || tid === 2 || p > 0;
      });

      const standardMods = itemMods.filter((m: any) => {
        const p = Number(m.price ?? 0);
        const s = String(m.status || "").toLowerCase();
        const tid = Number(m.typeId || 0);
        return s !== "message" && s !== "extras" && s !== "extra" && tid !== 2 && p <= 0;
      });

      const messages = itemMods.filter((m: any) => {
        const s = String(m.status || "").toLowerCase();
        return s === "message" || s === "messages";
      });

      return {
        productId: l.productId,
        quantity: qty,
        price: price,
        baseAmount: lineTotal,
        variantName,
        variantArabic,
        product: {
          name: primaryName,
          price: price,
          arabicName: arabicName,
        },
        extras,
        modifiers: standardMods,
        messages,
        itemDiscount: (isBillLevelDiscount || unified?.summary?.isBillDiscount) ? 0 : itemDisc,
        lineTotal: ((isBillLevelDiscount || unified?.summary?.isBillDiscount) || itemDisc <= 0) ? lineTotal : Math.max(0, lineTotal - itemDisc),
        lineNetAmount: lineTotal,
        basePrice: price,
        vatAmount: Number(l.vatAmount ?? 0),
      };
    });

    const resolvedDiscount = displayDiscount > 0
      ? displayDiscount
      : Number(
          unified.summary.totalDiscountExcl ?? (typeof unified.summary.getTotalDiscount === "function" ? unified.summary.getTotalDiscount(false) : (master.discAmount ?? master.discount ?? 0))
        );
    const resolvedSubTotal = displaySubTotal > 0
      ? displaySubTotal
      : Number(
          unified.summary.subTotalExclusive > 0
            ? unified.summary.subTotalExclusive
            : (typeof unified.summary.getSubTotal === "function" ? unified.summary.getSubTotal(false) : 0)
        );
    const resolvedVatAmount = Number(
      (unified?.summary.vatAmount && unified.summary.vatAmount > 0)
        ? unified.summary.vatAmount
        : (master.vatAmount ?? master.VatAmount ?? 0)
    );

    const invoiceNo =
      master.voucherNo ||
      master.invoiceNo ||
      master.voucherNumber ||
      master.saleNo ||
      (master.saleId ? String(master.saleId) : orderId ? String(orderId) : undefined);

    const paymentNames: Record<number, string> = { 1: "Cash", 2: "Card", 3: "Credit" };
    const rawPayments =
      order.paymentData ||
      order.paymentsData ||
      order.payments ||
      order.paymodes ||
      order.tenderData ||
      master.payments ||
      master.paymodes ||
      [];
    let payments =
      Array.isArray(rawPayments) && rawPayments.length > 0
        ? rawPayments.map((p: any) => ({
            name:
              p.paymentName ||
              p.paymodeName ||
              p.name ||
              paymentNames[p.paymodeId] ||
              paymentNames[p.paymentId] ||
              "Payment",
            amount: Number(p.amount ?? p.paidAmount ?? 0),
          }))
        : undefined;

    if (!payments || payments.length === 0) {
      const rootPaymodeId = master.paymodeId || order.paymodeId;
      const rootPaymodeName =
        master.paymodeName || master.paymentName || (rootPaymodeId ? paymentNames[rootPaymodeId] : "Cash");
      if (rootPaymodeName) {
        payments = [{ name: rootPaymodeName, amount: netAmount }];
      }
    }

    let resolvedFlatNo = master.flatNo || master.flat || master.flatNumber || "";
    let resolvedBuildingNo = master.buildingNo || master.building || master.buildingNumber || "";
    let resolvedBlockNo = master.blockNo || master.block || master.blockNumber || "";
    let resolvedRoadNo = master.roadNo || master.road || master.roadNumber || master.street || "";
    let resolvedArea = master.area || master.areaName || "";
    let resolvedCustomerName =
      master.deliveryCustomerName ||
      master.vehicleCustomerName ||
      master.customerName ||
      master.customer ||
      "";

    if (!resolvedCustomerName && typeof detailsStr === "string") {
      const parenMatches = detailsStr.match(/\(([^)]+)\)/g)?.map((s: string) => s.replace(/[()]/g, "").trim()) || [];
      if (parenMatches.length >= 2) {
        resolvedCustomerName = parenMatches[1];
      } else if (parenMatches.length === 1) {
        resolvedCustomerName = parenMatches[0];
      }
    }
    if (!resolvedCustomerName) {
      resolvedCustomerName = "CASH CUSTOMER";
    }
    const isDeliveryOrder = (orderTypeName || "").toLowerCase().includes("delivery");
    const resolvedContactNo = master.mobileNo || master.contactNo || master.phone || master.mobile || "";
    const resolvedCallBack = isDeliveryOrder
      ? (master.callBack || 
         master.callback || 
         master.callBackNo || 
         master.callbackNo || 
         master.callBackNumber || 
         master.callbackNumber || 
         (order as any)?.callBack || 
         (order as any)?.callback || 
         localStorage.getItem(`order_callBack_${orderId}`) ||
         sessionStorage.getItem(`order_callBack_${orderId}`) ||
         localStorage.getItem(`order_callBack_${invoiceNo}`) ||
         sessionStorage.getItem(`order_callBack_${invoiceNo}`) ||
         (resolvedContactNo ? localStorage.getItem(`delivery_callBack_${resolvedContactNo}`) : null) ||
         (resolvedContactNo ? sessionStorage.getItem(`delivery_callBack_${resolvedContactNo}`) : null) ||
         localStorage.getItem("pos_current_callBack") ||
         "")
      : "";

    const rawChangeVal = master.change ?? master.keepChanges ?? (order as any)?.change ?? (order as any)?.keepChanges ?? "";
    const validKeepChange = (isDeliveryOrder && rawChangeVal !== undefined && rawChangeVal !== null &&
      String(rawChangeVal).trim() !== "" &&
      String(rawChangeVal).trim() !== "0" &&
      String(rawChangeVal).trim() !== "0.00" &&
      String(rawChangeVal).trim() !== "0.000")
      ? String(rawChangeVal).trim()
      : undefined;

    const resolvedAddress = master.address || master.customerAddress || master.deliveryAddress || "";

    if (
      isDeliveryOrder &&
      !resolvedFlatNo &&
      !resolvedBuildingNo &&
      !resolvedBlockNo &&
      !resolvedRoadNo &&
      !resolvedArea &&
      resolvedContactNo
    ) {
      try {
        const addrRes = await deliveryApi.getDeliveryAddress(resolvedContactNo);
        const addrData = Array.isArray(addrRes?.data) ? addrRes.data[0] : addrRes?.data || addrRes;
        if (addrData) {
          resolvedFlatNo = addrData.flatNo || resolvedFlatNo;
          resolvedBuildingNo = addrData.buildingNo || resolvedBuildingNo;
          resolvedBlockNo = addrData.blockNo || resolvedBlockNo;
          resolvedRoadNo = addrData.roadNo || resolvedRoadNo;
          resolvedArea = addrData.area || resolvedArea;
          if (!resolvedCustomerName || resolvedCustomerName === "CASH CUSTOMER") {
            resolvedCustomerName = addrData.customerName || resolvedCustomerName;
          }
        }
      } catch (fetchAddrErr) {
        console.warn("[PosSettledDetailsModal] Could not fetch delivery address fallback:", fetchAddrErr);
      }
    }

    const rawEmpId =
      master.employeeId ??
      master.empId ??
      master.waiterId ??
      master.salespersonId ??
      orderSummary?.employeeId ??
      orderSummary?.empId ??
      order?.employeeId;

    const resolvedWaiter = await resolveEmployeeNameForPrint(
      rawEmpId,
      master.employeeName || order?.employeeName || resolvedEmployeeName
    );

    let resolvedDriver =
      master.driverName ||
      master.allocatedDriverName ||
      master.driver ||
      master.driverEmployeeName ||
      orderSummary?.driverName ||
      orderSummary?.allocatedDriverName ||
      orderSummary?.driver ||
      order?.driverName ||
      order?.allocatedDriverName ||
      order?.driver ||
      "";

    if (!resolvedDriver && orderSummary && typeof orderSummary.details === "string") {
      const match = orderSummary.details.match(/\(Driver:\s*([^)]+)\)/i) || orderSummary.details.match(/Driver:\s*([A-Za-z0-9_\s]+)/i);
      if (match && match[1]) {
        resolvedDriver = match[1].trim();
      }
    }

    if (!resolvedDriver && typeof master.details === "string") {
      const match = master.details.match(/\(Driver:\s*([^)]+)\)/i) || master.details.match(/Driver:\s*([A-Za-z0-9_\s]+)/i);
      if (match && match[1]) {
        resolvedDriver = match[1].trim();
      }
    }

    const activeDriverId = master.driverId || orderSummary?.driverId || order?.driverId;
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
        console.warn("[PosSettledDetailsModal] Failed to resolve driver name by id:", err);
      }
    }

    const printSc = Number(master.serviceCharge ?? unified.summary.serviceCharge ?? 0);
    let printLevy = Number(master.levyAmt ?? master.levy ?? master.Levy ?? unified.summary.levy ?? 0);
    let printCharges = displayCharges > 0 ? displayCharges : roundCalc(printSc + printLevy);
    const printGrandTotal = Number(master.netAmount ?? unified.summary.grandTotal ?? 0);
    if (printCharges <= 0) {
      if (printGrandTotal > 0) {
        const netBase = Math.max(0, resolvedSubTotal - resolvedDiscount);
        const residual = roundCalc(printGrandTotal - netBase - Number(master.deliveryCharge || 0) - resolvedVatAmount);
        if (residual > 0.001) {
          printCharges = residual;
          if (printLevy <= 0) printLevy = residual;
        }
      }
    }
    const printNetValue = displayNetValue > 0 ? displayNetValue : roundCalc(Math.max(0, resolvedSubTotal - resolvedDiscount) + printCharges);

    const printData = {
      orderNo: master.orderNo ?? String(orderId),
      ticketNo: toDisplayNo(master.ticketNo) ?? "",
      invoiceNo,
      // The real id only (list row, then saved order). The voucher number is not a sale id.
      saleId: Number(orderSummary?.saleId ?? orderSummary?.SaleId ?? master.saleId ?? 0) || undefined,
      waiter: resolvedWaiter,
      counter: "Main",
      section: master.sectionName || "DINE IN",
      table: master.tableNo || "",
      orderType: orderTypeName,
      date,
      time,
      customerName: resolvedCustomerName || "CASH CUSTOMER",
      driver: isDeliveryOrder ? (resolvedDriver || undefined) : undefined,
      driverName: isDeliveryOrder ? (resolvedDriver || undefined) : undefined,
      vehicleNo: master.vehicleNo,
      contactNo: isDeliveryOrder ? (resolvedContactNo || undefined) : undefined,
      callBack: isDeliveryOrder ? (resolvedCallBack || undefined) : undefined,
      missedCall: isDeliveryOrder ? Boolean(master.missedCall ?? master.isMissedCall) : undefined,
      change: isDeliveryOrder ? validKeepChange : undefined,
      keepChanges: isDeliveryOrder ? validKeepChange : undefined,
      flatNo: isDeliveryOrder ? (resolvedFlatNo || undefined) : undefined,
      buildingNo: isDeliveryOrder ? (resolvedBuildingNo || undefined) : undefined,
      blockNo: isDeliveryOrder ? (resolvedBlockNo || undefined) : undefined,
      roadNo: isDeliveryOrder ? (resolvedRoadNo || undefined) : undefined,
      area: isDeliveryOrder ? (resolvedArea || undefined) : undefined,
      address: isDeliveryOrder ? (resolvedAddress || undefined) : undefined,
      providerNo: master.providerNo || master.providerOrderNo,
      subTotal: resolvedSubTotal,
      discount: resolvedDiscount,
      serviceCharge: printSc,
      levy: printLevy,
      charges: printCharges,
      netValue: printNetValue,
      vatAmount: resolvedVatAmount,
      netAmount: printGrandTotal > 0 ? printGrandTotal : unified.summary.grandTotal,
      deliveryCharge: master.deliveryCharge || 0,
      payments,
      enableVat: unified.summary.isVatActive,
      isSettlement: true,
      printPrice: printPriceSetting,
      priceView: getPriceView(),
      billArabic:
        isBillArabicEnabled() ||
        mappedItems.some((it: any) =>
          Boolean(it.product?.arabicName || it.variantArabic || (it as any).altArabic)
        ),
      isBillDiscount: isBillLevelDiscount,
    };

    const htmlContent = await generateGuestPrintHtml(unified as any, printData);

    let billPrinter: string | undefined;
    try {
      const settingsRes = await printerSettingsApi.getGeneral();
      const gen = settingsRes?.data;
      billPrinter = gen?.androidBillPrinter || gen?.billPrinter || gen?.androidKOTPrinter || gen?.kotPrinter;
    } catch (err) {
      console.warn("[PosSettledDetailsModal] Could not fetch general printer settings:", err);
    }

    if (!billPrinter || billPrinter === "No Printer") {
      billPrinter =
        localStorage.getItem("cachedBillPrinter") ||
        localStorage.getItem("cachedBillPrinterIp") ||
        localStorage.getItem("cachedKotPrinter") ||
        localStorage.getItem("cachedKotPrinterIp") ||
        localStorage.getItem("printerIpAddress") ||
        undefined;
    }

    await printHtmlReceipt(htmlContent, billPrinter);
    showToast("Settled receipt sent to printer!", "success");
  } catch (e: any) {
    console.error("[PosSettledDetailsModal] Print error:", e);
    showToast(e?.message ? `Print failed: ${e.message}` : "Failed to print receipt", "error");
  }
};
