/**
 * Recall → KOT (reprint the kitchen ticket of a saved order). Moved verbatim out of PosRecallDetailsModal
 * (2026-11-11, split of the saved-order windows); the guest bill is printRecallOrder.ts.
 */
import { getTerminalBranchId } from "@shared/config/device";
import { toDisplayNo } from "../../services/orderResponse";
import { buildPrintPricing } from "../../utils/printPricing";
import { deliveryApi } from "../../customer/services/deliveryApi";
import { fallbackOrderTypeByName } from "../store/posSlice";
import { generateKotHtml } from "../../utils/kotTemplate";
import { executeKotRouting } from "../../utils/printerRouting";
import { printHtmlReceipt } from "../../services/qzService";
import { printerSettingsApi } from "../../services/printerSettingsApi";
import { getPriceView, getPrintPrice } from "./billing";
import { isKotArabicEnabled } from "../../utils/alternativeHelpers";
import { checkOrderHasBillDiscount } from "./orderDiscountCheck";
import { savedOrderWaiterName } from "../../utils/employeeNames";

// Saved-order data from the API is untyped; the window keeps it as-is.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Loose = any;
type ShowToast = (msg: string, type?: "success" | "error" | "info" | "warning") => void;

export interface PrintRecallKotContext {
  orderId: number | null | undefined;
  order: Loose;
  fallbackDetails: Loose;
  orderDetailsStr: string;
  allExtras: Loose[];
  modifierTypes: Loose[];
  products: Loose[];
  productCache: Record<number, Loose>;
  showToast: ShowToast;
}

/** Reprint the KOT of a recalled order through the KOT printer routing. */
export const printRecallOrderKot = async ({ orderId, order, fallbackDetails, orderDetailsStr, allExtras, modifierTypes, products, productCache, showToast }: PrintRecallKotContext): Promise<void> => {
  if (!orderId || !order) return;
  let mappedItems: any[] = [];
  let basePrintOptions: any = null;
  try {
    showToast(`Preparing KOT for Order #${orderId}...`, "info");
    
    const rawMaster = order.masterData || order.master || order;
    const master = Array.isArray(rawMaster) ? (rawMaster[0] || {}) : (rawMaster || {});
    
    const orderTypeMap: Record<number, string> = {
      1: "DineIn", 2: "TakeOut", 3: "DriveThru",
      4: "Delivery", 5: "Providers", 6: "Coming"
    };
    const orderTypeCandidate =
  master.orderType ||
  orderTypeMap[master.orderTypeId] ||
  master.orderTypeName ||
  order?.orderTypeName ||
  fallbackDetails?.orderTypeName ||
  (orderDetailsStr?.match(/\((DineIn|TakeOut|DriveThru|Delivery|Providers|Coming)\)/i)?.[1]) ||
  "TakeOut";
const orderTypeName = fallbackOrderTypeByName(orderTypeCandidate).orderType;
    
    const printPriceSetting = getPrintPrice();
    const isTaxInclusive = printPriceSetting === "Inclusive";
    const isBillLevelDiscount = checkOrderHasBillDiscount(order);
    const unified = buildPrintPricing(order, {
      dataView: getPriceView(),
      orderType: orderTypeName,
      printPrice: printPriceSetting,
      modifierTypes,
      allExtras,
      isBillDiscount: isBillLevelDiscount,
      products,
      productCache,
    });

    mappedItems = unified.lines.map((l) => {
      const matchedProduct = l.productId ? products.find((p: any) => p.id === l.productId) : null;
      return {
        ...l,
        isUnifiedPricingLine: true,
        productId: l.productId,
        categoryId: l.categoryId || matchedProduct?.categoryId || 0,
        quantity: l.quantity,
        price: l.getRate(isTaxInclusive),
        variantName: l.variantName,
        variantArabic: l.variantArabic,
        product: {
          name: matchedProduct?.name || l.productName || `Product #${l.productId}`,
          price: l.getRate(isTaxInclusive),
          categoryId: l.categoryId || matchedProduct?.categoryId || 0,
          arabicName: l.productArabicName || matchedProduct?.arabicName,
        },
        extras: l.extras,
        modifiers: l.modifiers,
        messages: l.messages,
        lineTotal: l.getAmount(isTaxInclusive, unified.summary.isBillDiscount),
        vatAmount: l.vatAmount,
        netAmount: l.inclusiveAmount,
      };
    });

    let resolvedFlatNo = master.flatNo || master.flat || master.flatNumber || "";
    let resolvedBuildingNo = master.buildingNo || master.building || master.buildingNumber || "";
    let resolvedBlockNo = master.blockNo || master.block || master.blockNumber || "";
    let resolvedRoadNo = master.roadNo || master.road || master.roadNumber || master.street || "";
    let resolvedArea = master.area || master.areaName || "";
    const resolvedAddress = master.address || master.customerAddress || master.deliveryAddress || "";
    const resolvedContactNo =
      master.contactNo ||
      master.mobileNo ||
      master.phone ||
      master.mobile ||
      order?.contactNo ||
      order?.mobileNo ||
      (order as any)?.orderMaster?.contactNo ||
      (order as any)?.orderMaster?.mobileNo ||
      fallbackDetails?.deliveryDetails?.mobile ||
      "";
    const resolvedCallBack =
      master.callBack ||
      master.callback ||
      master.callBackNo ||
      master.callbackNo ||
      master.callBackNumber ||
      master.callbackNumber ||
      (order as any)?.callBack ||
      (order as any)?.callback ||
      (order as any)?.orderMaster?.callBack ||
      (order as any)?.orderMaster?.callback ||
      (order as any)?.master?.callBack ||
      "";

    const isDeliveryOrder = (orderTypeName || "").toLowerCase().includes("delivery");
    let resolvedCustomerName = master.deliveryCustomerName || master.vehicleCustomerName || master.customerName || master.customer || "";

    const rawChange =
      master.change ??
      master.keepChanges ??
      (order as any)?.change ??
      (order as any)?.keepChanges ??
      (order as any)?.orderMaster?.change ??
      (order as any)?.orderMaster?.keepChanges ??
      (order as any)?.master?.change ??
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
        console.warn("[PosRecallDetailsModal] Could not fetch delivery address fallback for KOT:", fetchAddrErr);
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
      order?.driverEmployeeName ||
      "";

    if (!resolvedDriver && orderDetailsStr) {
      const match = orderDetailsStr.match(/\(Driver:\s*([^)]+)\)/i) || orderDetailsStr.match(/Driver:\s*([A-Za-z0-9_\s]+)/i);
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

    const activeDriverId = master.driverId || order?.driverId;
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
        console.warn("[PosRecallDetailsModal] Failed to resolve driver name by id for KOT:", err);
      }
    }

    basePrintOptions = {
      orderNo: master.orderNo ?? String(orderId),
      ticketNo: toDisplayNo(master.ticketNo) ?? "",
      waiter: savedOrderWaiterName(master.employeeName ?? fallbackDetails?.employeeName, master.employeeId ?? master.empId),
      counter: "Main",
      section: master.sectionName || "DINE IN",
      table: master.tableNo || "",
      orderType: orderTypeName,
      vehicleNo: master.vehicleNo || "",
      customerName: resolvedCustomerName,
      driver: isDeliveryOrder ? (resolvedDriver || undefined) : undefined,
      driverName: isDeliveryOrder ? (resolvedDriver || undefined) : undefined,
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
      providerNo: master.providerNo || master.providerOrderNo || "",
      kotArabic: isKotArabicEnabled(),
      forcedPrint: true,
      priceView: getPriceView(),
      printPrice: getPrintPrice(),
      kotHeader: (localStorage.getItem("kotHeader") as any) || undefined,
    };

    await executeKotRouting(
      mappedItems as any,
      basePrintOptions,
      master.sectionId || 0,
      printerSettingsApi,
      printHtmlReceipt,
      generateKotHtml,
      false
    );
    
    showToast("KOT sent to printers successfully!", "success");
  } catch (err: any) {
    console.error("Print KOT Error:", err);
    // Fallback: If direct printer communication fails, open browser print preview window
    try {
      const headerTitle = "KOT";
      const kotHtml = await generateKotHtml(mappedItems as any, { ...basePrintOptions, headerTitle });
      const printWindow = window.open("", "_blank", "width=400,height=600");
      if (printWindow) {
        printWindow.document.write(kotHtml);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
          printWindow.print();
          printWindow.close();
        }, 300);
        showToast("Opened KOT in print preview", "info");
        return;
      }
    } catch (fallbackErr) {
      console.error("KOT fallback window error:", fallbackErr);
    }
    showToast(err?.message ? `Printing KOT failed: ${err.message}` : "Printing KOT failed", "error");
  }
};
