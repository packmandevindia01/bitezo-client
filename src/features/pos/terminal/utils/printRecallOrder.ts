import { orderApi } from "../../services/orderApi";
import { deliveryApi } from "../../customer/services/deliveryApi";
import { menuApi } from "../../services/menuApi";
import { printerSettingsApi } from "../../services/printerSettingsApi";
import { generateGuestPrintHtml, isEnableVatGuestPrint } from "../../utils/guestPrintTemplate";
import { printHtmlReceipt } from "../../services/qzService";
import { buildUnifiedOrderPricing } from "../../utils/orderPricing";
import { checkOrderHasBillDiscount } from "./orderDiscountCheck";
import { roundCalc, getPrintPrice } from "./billing";
import { isBillArabicEnabled } from "../../utils/alternativeHelpers";
import { hasPrinterHeadings, notifyPrinterHeadingWarning } from "../../utils/printHeadingUtils";
import { alternativesCache } from "../hooks/usePosProducts";

export interface PrintRecallOrderOptions {
  orderId: number;
  order?: any;
  matchedOrderRow?: any;
  orderDetailsStr?: string;
  products?: any[];
  productCache?: Record<number, any>;
  alternativesCache?: Record<string, any>;
  currentWaiterName?: string;
  showToast: (msg: string, type?: "success" | "error" | "info" | "warning") => void;
}

const orderTypeIdToNameMap: Record<number, string> = {
  1: "DineIn",
  2: "TakeOut",
  3: "DriveThru",
  4: "Delivery",
  5: "Providers",
  6: "Coming",
};

/**
 * Single Unified Guest Receipt Print Pipeline for Recall Orders.
 * Used identically by both:
 * 1) PosRecallModal (Row "PRINT" button)
 * 2) PosRecallDetailsModal ("GUEST" button)
 */
export const printRecallOrderGuestReceipt = async (
  options: PrintRecallOrderOptions
): Promise<void> => {
  const {
    orderId,
    order: passedOrder,
    matchedOrderRow,
    orderDetailsStr,
    products = [],
    productCache = {},
    showToast,
  } = options;

  if (!orderId) {
    showToast("Invalid order ID for printing", "error");
    return;
  }

  if (!hasPrinterHeadings()) {
    notifyPrinterHeadingWarning(showToast);
  }

  try {
    showToast(`Preparing Guest Receipt for Order #${orderId}...`, "info");

    const printPriceSetting = getPrintPrice();
    const isTaxInclusive = printPriceSetting === "Inclusive";

    // 1. Resolve base order data (either passed directly or loaded from backend)
    let order = passedOrder;
    const effectiveOrderDetailsStr =
      orderDetailsStr ||
      (typeof matchedOrderRow?.details === "string" ? matchedOrderRow.details : undefined);

    const parsedTypeFromStr =
      effectiveOrderDetailsStr?.match(/\((DineIn|TakeOut|DriveThru|Delivery|Providers|Coming)\)/i)?.[1];
    const initialOrderType =
      matchedOrderRow?.orderType ||
      matchedOrderRow?.orderTypeName ||
      (matchedOrderRow?.orderTypeId ? orderTypeIdToNameMap[Number(matchedOrderRow.orderTypeId)] : undefined) ||
      parsedTypeFromStr ||
      "TakeOut";

    if (!order) {
      const orderRes = await orderApi.getOrderDetails(orderId, {
        priceView: printPriceSetting,
        orderType: initialOrderType,
      });
      order = orderRes?.data || orderRes;
    }

    if (!order) {
      showToast(`Failed to load order #${orderId} data for printing`, "error");
      return;
    }

    const rawMaster = order.masterData || order.master || order;
    const master = Array.isArray(rawMaster) ? (rawMaster[0] || {}) : (rawMaster || {});

    const orderTypeName =
      master.orderType ||
      master.orderTypeName ||
      (master.orderTypeId ? orderTypeIdToNameMap[Number(master.orderTypeId)] : "") ||
      initialOrderType ||
      "TakeOut";

    // 2. Fetch specialized print data from backend
    let printOrder = order;
    try {
      const printRes = await orderApi.getOrderPrintData(orderId, {
        priceView: printPriceSetting,
        orderType: orderTypeName,
      });
      if (printRes && (printRes.data || printRes.masterData)) {
        printOrder = printRes.data || printRes;
      }
    } catch (err) {
      console.warn("[printRecallOrder] getOrderPrintData fallback to loaded order:", err);
    }

    const rawPrintMaster = printOrder.masterData || printOrder.master || printOrder;
    const effectivePrintMaster = Array.isArray(rawPrintMaster) ? (rawPrintMaster[0] || {}) : (rawPrintMaster || master);

    // Remove backend print data's subTotal so unified pricing calculates the true gross subtotal
    if (effectivePrintMaster && effectivePrintMaster.subTotal !== undefined) {
      delete effectivePrintMaster.subTotal;
      delete effectivePrintMaster.SubTotal;
    }
    if (printOrder.masterData && printOrder.masterData.subTotal !== undefined) {
      delete printOrder.masterData.subTotal;
      delete printOrder.masterData.SubTotal;
    }

    const netAmount = Number(
      effectivePrintMaster.netAmount ??
      printOrder.netAmount ??
      master.netAmount ??
      order.netAmount ??
      0
    );
    const enableVat = isEnableVatGuestPrint();

    let modifierTypes: any[] = [];
    try {
      modifierTypes = (await menuApi.getModifierTypes()) || [];
    } catch {
      // ignore
    }

    // 3. Ensure product alternatives are cached for variant naming
    const detailsList = printOrder.detailsData || printOrder.details || order.detailsData || order.details || [];
    const safeOrderTypeId =
      master.orderTypeId ||
      (orderTypeName === "DineIn" ? 1 : orderTypeName === "TakeOut" ? 2 : orderTypeName === "DriveThru" ? 3 : orderTypeName === "Delivery" ? 4 : 1);

    const pIds = Array.from(
      new Set(detailsList.map((d: any) => d.productId || d.ProductId || d.itemId || d.ItemId).filter(Boolean))
    );
    await Promise.all(
      pIds.map(async (pId: any) => {
        const key = `${pId}-${safeOrderTypeId}`;
        if (!alternativesCache[key]) {
          try {
            const alts = await menuApi.getAlternatives(Number(pId), safeOrderTypeId);
            if (alts && alts.length > 0) {
              alternativesCache[key] = alts;
            }
          } catch {}
        }
      })
    );

    detailsList.forEach((d: any) => {
      const pId = d.productId || d.ProductId || d.itemId || d.ItemId;
      const uId = d.unitId ?? d.UnitId;
      const altsKey = `${pId}-${safeOrderTypeId}`;
      const alts = alternativesCache[altsKey] || [];
      const matchedAlt = alts.find((a: any) => Number(a.unitId ?? a.UnitId ?? a.id ?? a.Id) === Number(uId));
      if (matchedAlt) {
        d.altName = matchedAlt.altName;
        d.variantName = matchedAlt.altName;
        d.variantArabic = matchedAlt.altArabic;
      }
      if (!d.productName && !d.ProductName) {
        const numPid = Number(pId);
        const cachedProd = productCache[numPid] || (products && products.find((p: any) => p.id === numPid));
        if (cachedProd) {
          d.productName = cachedProd.name;
          d.arabicName = cachedProd.arabicName;
        }
      }
    });

    // 4. Resolve Date & Time
    const timeFromDetails = (() => {
      if (!effectiveOrderDetailsStr) return "";
      const m = effectiveOrderDetailsStr.match(/(\d{1,2}:\d{2}:\d{2}\s*(?:AM|PM))/i);
      return m ? m[1] : "";
    })();

    const isValidDateStr = (s: any) => {
      if (!s || typeof s !== "string") return false;
      if (s.startsWith("0001")) return false;
      return true;
    };

    const candidateDates = [
      master.voucherDate,
      master.orderDate,
      master.createdAt,
      timeFromDetails,
    ];

    let resolvedDateStr = candidateDates.find(isValidDateStr);
    let date: string | undefined;
    let time: string | undefined;

    if (resolvedDateStr) {
      try {
        const d = new Date(resolvedDateStr);
        if (!isNaN(d.getTime()) && d.getFullYear() >= 2000) {
          date = d.toLocaleDateString("en-GB");
          time = d.toLocaleTimeString("en-US", { hour12: true, hour: "2-digit", minute: "2-digit" });
        } else if (/am|pm/i.test(resolvedDateStr)) {
          const today = new Date();
          date = today.toLocaleDateString("en-GB");
          time = resolvedDateStr;
        }
      } catch {
        /* ignore */
      }
    }

    if (!date) {
      const now = new Date();
      date = now.toLocaleDateString("en-GB");
      time = now.toLocaleTimeString("en-US", { hour12: true, hour: "2-digit", minute: "2-digit" });
    }

    // 5. Build Unified Order Pricing
    const isBillLevelDiscount = checkOrderHasBillDiscount(printOrder);
    const unified = buildUnifiedOrderPricing(printOrder, {
      orderType: orderTypeName,
      printPrice: printPriceSetting,
      modifierTypes,
      isVatActive: enableVat,
      isBillDiscount: isBillLevelDiscount,
      products,
      productCache,
    });

    const mappedItems = unified.lines.map((l) => ({
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
        : (unified.summary.isBillDiscount ? 0 : l.getDiscount(isTaxInclusive)),
      lineTotal: (l.lineDiscount > 0 || l.lineDiscountIncl > 0 || l.lineDiscountExcl > 0)
        ? Math.max(0, (isTaxInclusive ? l.inclusiveGross : l.exclusiveGross) - l.getDiscount(isTaxInclusive))
        : l.getAmount(isTaxInclusive, unified.summary.isBillDiscount),
      lineNetAmount: l.inclusiveAmount,
      basePrice: l.exclusiveRate,
      vatAmount: l.vatAmount,
    }));

    // 6. Compute consistent footer financial breakdown
    const rawCharges = Number(master.serviceCharge ?? unified.summary.serviceCharge ?? 0) +
      Number(master.levyAmt ?? master.levy ?? master.Levy ?? unified.summary.levy ?? 0);

    const resolvedDiscount = Number(
      (isTaxInclusive && rawCharges <= 0)
        ? (unified.summary.totalDiscountIncl ?? (typeof unified.summary.getTotalDiscount === "function" ? unified.summary.getTotalDiscount(true) : (master.discAmount ?? master.discount ?? 0)))
        : (unified.summary.totalDiscountExcl ?? (typeof unified.summary.getTotalDiscount === "function" ? unified.summary.getTotalDiscount(false) : (master.discAmount ?? master.discount ?? 0)))
    );

    const resolvedSubTotal = Number(
      (isTaxInclusive && rawCharges <= 0)
        ? (unified.summary.subTotalInclusive > 0
            ? unified.summary.subTotalInclusive
            : (typeof unified.summary.getSubTotal === "function" ? unified.summary.getSubTotal(true) : 0))
        : (unified.summary.subTotalExclusive > 0
            ? unified.summary.subTotalExclusive
            : (typeof unified.summary.getSubTotal === "function" ? unified.summary.getSubTotal(false) : 0))
    );

    const resolvedVatAmount = Number(
      (unified?.summary.vatAmount && unified.summary.vatAmount > 0)
        ? unified.summary.vatAmount
        : (master.vatAmount ?? master.VatAmount ?? 0)
    );

    const resolvedGrandTotal = unified.summary.grandTotal > 0 ? unified.summary.grandTotal : netAmount;

    let resolvedCharges = (unified?.summary?.charges && unified.summary.charges > 0)
      ? unified.summary.charges
      : roundCalc(Number(master.serviceCharge ?? unified.summary.serviceCharge ?? 0) + Number(master.levyAmt ?? master.levy ?? master.Levy ?? unified.summary.levy ?? 0));

    if (resolvedGrandTotal > 0) {
      const netBase = Math.max(0, resolvedSubTotal - resolvedDiscount);
      const residual = roundCalc(resolvedGrandTotal - netBase - Number(master.deliveryCharge || 0) - resolvedVatAmount);
      if (residual > 0.001) {
        if (resolvedCharges <= 0 || Math.abs(resolvedCharges - residual) > 0.05) {
          resolvedCharges = residual;
        }
      }
    }

    const resolvedNetValue = (unified?.summary?.vatExclAmount && unified.summary.vatExclAmount > 0)
      ? unified.summary.vatExclAmount
      : roundCalc(Math.max(0, resolvedSubTotal - resolvedDiscount) + resolvedCharges);

    // 7. Resolve Customer, Delivery, and Driver Information
    const isDeliveryOrder = (orderTypeName || "").toLowerCase().includes("delivery");

    let resolvedFlatNo = master.flatNo || master.flat || master.flatNumber || "";
    let resolvedBuildingNo = master.buildingNo || master.building || master.buildingNumber || "";
    let resolvedBlockNo = master.blockNo || master.block || master.blockNumber || "";
    let resolvedRoadNo = master.roadNo || master.road || master.roadNumber || master.street || "";
    let resolvedArea = master.area || master.areaName || "";
    let resolvedAddress = master.address || master.customerAddress || master.deliveryAddress || "";
    let resolvedContactNo =
      master.contactNo ||
      master.mobileNo ||
      master.phone ||
      master.mobile ||
      order?.contactNo ||
      order?.mobileNo ||
      (order as any)?.orderMaster?.contactNo ||
      (order as any)?.orderMaster?.mobileNo ||
      "";

    let resolvedCallBack = isDeliveryOrder
      ? (master.callBack ||
        master.callback ||
        master.callBackNo ||
        master.callbackNo ||
        master.callBackNumber ||
        master.callbackNumber ||
        (order as any)?.callBack ||
        (order as any)?.callback ||
        "")
      : "";

    let resolvedCustomerName = master.deliveryCustomerName || master.vehicleCustomerName || master.customerName || master.customer || "";

    const rawChange =
      master.change ??
      master.keepChanges ??
      (order as any)?.change ??
      (order as any)?.keepChanges ??
      "";

    const validKeepChange = (isDeliveryOrder && rawChange !== undefined && rawChange !== null &&
      String(rawChange).trim() !== "" &&
      String(rawChange).trim() !== "0" &&
      String(rawChange).trim() !== "0.00" &&
      String(rawChange).trim() !== "0.000")
      ? String(rawChange).trim()
      : undefined;

    if (isDeliveryOrder && !resolvedFlatNo && !resolvedBuildingNo && !resolvedBlockNo && !resolvedRoadNo && !resolvedArea && resolvedContactNo) {
      try {
        const addrRes = await deliveryApi.getDeliveryAddress(resolvedContactNo);
        const addrData = Array.isArray(addrRes?.data) ? addrRes.data[0] : (addrRes?.data || addrRes);
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
        console.warn("[printRecallOrder] Could not fetch delivery address fallback for Guest:", fetchAddrErr);
      }
    }

    let resolvedDriver =
      master.driverName ||
      master.allocatedDriverName ||
      master.driver ||
      master.driverEmployeeName ||
      order?.driverName ||
      order?.allocatedDriverName ||
      order?.driver ||
      "";

    if (!resolvedDriver && effectiveOrderDetailsStr) {
      const match = effectiveOrderDetailsStr.match(/\(Driver:\s*([^)]+)\)/i) || effectiveOrderDetailsStr.match(/Driver:\s*([A-Za-z0-9_\s]+)/i);
      if (match && match[1]) {
        resolvedDriver = match[1].trim();
      }
    }

    const activeDriverId = master.driverId || order?.driverId;
    if (!resolvedDriver && activeDriverId && Number(activeDriverId) > 0) {
      try {
        const branchId =
          Number(localStorage.getItem("systemBranchId")) ||
          Number(localStorage.getItem("activeBranchId")) ||
          Number(localStorage.getItem("branchId")) ||
          1;
        const { employeeService } = await import("../../../general/employee/services/employeeService");
        const dList = await employeeService.getDrivers(branchId);
        const dFound = dList.find((d: any) => d.driverId === Number(activeDriverId));
        if (dFound) {
          resolvedDriver = dFound.driverName;
        }
      } catch (err) {
        console.warn("[printRecallOrder] Failed to resolve driver name by id for Guest:", err);
      }
    }

    // 8. Prepare Guest Print Payload
    const printData = {
      orderNo: master.orderNo ?? String(orderId),
      ticketNo: master.ticketNo ?? "1",
      waiter: (() => {
        const rawName = master.employeeName ?? master.waiter ?? order?.employeeName;
        if (rawName && !["waiter", "cashier", "null", "undefined"].includes(String(rawName).trim().toLowerCase())) {
          return String(rawName).trim();
        }
        try {
          const mapRaw = localStorage.getItem("posEmpNameMap");
          if (mapRaw) {
            const m = JSON.parse(mapRaw);
            const n = m[String(master.employeeId ?? master.empId ?? "")];
            if (n && !["waiter", "cashier"].includes(String(n).trim().toLowerCase())) return String(n).trim();
          }
        } catch {}
        return (
          localStorage.getItem("defaultEmployeeName") ||
          localStorage.getItem("authorizedEmployeeName") ||
          localStorage.getItem("employeeName") ||
          "Waiter"
        );
      })(),
      counter: "Main",
      section: master.sectionName || "DINE IN",
      table: master.tableNo || "",
      orderType: orderTypeName,
      date,
      time,
      customerName: resolvedCustomerName,
      driver: isDeliveryOrder ? (resolvedDriver || undefined) : undefined,
      driverName: isDeliveryOrder ? (resolvedDriver || undefined) : undefined,
      vehicleNo: master.vehicleNo,
      contactNo: isDeliveryOrder ? (resolvedContactNo || undefined) : undefined,
      callBack: isDeliveryOrder ? (resolvedCallBack || undefined) : undefined,
      change: isDeliveryOrder ? validKeepChange : undefined,
      keepChanges: isDeliveryOrder ? validKeepChange : undefined,
      flatNo: isDeliveryOrder ? (resolvedFlatNo || undefined) : undefined,
      buildingNo: isDeliveryOrder ? (resolvedBuildingNo || undefined) : undefined,
      blockNo: isDeliveryOrder ? (resolvedBlockNo || undefined) : undefined,
      roadNo: isDeliveryOrder ? (resolvedRoadNo || undefined) : undefined,
      area: isDeliveryOrder ? (resolvedArea || undefined) : undefined,
      address: isDeliveryOrder ? (resolvedAddress || undefined) : undefined,
      providerNo: master.providerNo || master.providerOrderNo || "",
      subTotal: resolvedSubTotal,
      discount: resolvedDiscount,
      serviceCharge: Number(master.serviceCharge ?? unified.summary.serviceCharge ?? 0),
      levy: Number(master.levyAmt ?? master.levy ?? master.Levy ?? unified.summary.levy ?? 0),
      charges: resolvedCharges,
      netValue: resolvedNetValue,
      vatAmount: resolvedVatAmount,
      netAmount: resolvedGrandTotal,
      deliveryCharge: master.deliveryCharge || 0,
      enableVat,
      printPrice: (localStorage.getItem("printPrice") as any) || undefined,
      priceView: (localStorage.getItem("priceView") as any) || undefined,
      billArabic: isBillArabicEnabled() || mappedItems.some((it: any) =>
        Boolean(it.product?.arabicName || it.variantArabic || (it as any).altArabic)
      ),
      isBillDiscount: unified.summary.isBillDiscount,
    };

    // 9. Generate HTML and Dispatch to Printer
    let htmlContent = "";
    try {
      htmlContent = await generateGuestPrintHtml(unified as any, printData);

      let billPrinter: string | undefined;
      try {
        const settingsRes = await printerSettingsApi.getGeneral();
        const gen = settingsRes?.data;
        billPrinter = gen?.androidBillPrinter || gen?.billPrinter || gen?.androidKOTPrinter || gen?.kotPrinter;
      } catch (err) {
        console.warn("[printRecallOrder] Could not fetch general printer settings:", err);
      }

      if (!billPrinter || billPrinter === "No Printer") {
        billPrinter = localStorage.getItem("cachedBillPrinter") ||
          localStorage.getItem("cachedBillPrinterIp") ||
          localStorage.getItem("cachedKotPrinter") ||
          localStorage.getItem("cachedKotPrinterIp") ||
          localStorage.getItem("printerIpAddress") ||
          undefined;
      }

      await printHtmlReceipt(htmlContent, billPrinter);
      showToast("Guest receipt sent to printer!", "success");
    } catch (err: any) {
      console.error("Printer error:", err);
      try {
        const printWindow = window.open("", "_blank", "width=400,height=600");
        if (printWindow) {
          printWindow.document.write(htmlContent);
          printWindow.document.close();
          printWindow.focus();
          setTimeout(() => {
            printWindow.print();
            printWindow.close();
          }, 300);
          showToast("Opened Guest receipt in print preview", "info");
          return;
        }
      } catch (fallbackErr) {
        console.error("Guest fallback window error:", fallbackErr);
      }
      showToast(err?.message ? `Print failed: ${err.message}` : "Failed to connect to printer", "error");
    }
  } catch (e: any) {
    console.error(e);
    showToast(e?.message ? `Print failed: ${e.message}` : "Failed to print receipt", "error");
  }
};
