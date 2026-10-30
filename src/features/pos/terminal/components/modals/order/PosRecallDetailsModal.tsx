import React, { useState, useEffect } from "react";
import Modal from "../../../../../../components/common/Modal";
import { Loader } from "../../../../../../components/common";
import { orderApi } from "../../../../services/orderApi";
import { menuApi } from "../../../../services/menuApi";
import { deliveryApi } from "../../../../customer/services/deliveryApi";
import { useToast } from "../../../../../../app/providers/useToast";
import { useAppDispatch, useAppSelector } from "../../../../../../app/hooks";
import { loadRecalledOrder, setDeliveryDetails, fallbackOrderTypeByName } from "../../../store/posSlice";
import { formatAmount } from "../../../../../../utils/currency";
import { isEnableVatGuestPrint } from "../../../../utils/guestPrintTemplate";
import { generateKotHtml } from "../../../../utils/kotTemplate";
import { executeKotRouting } from "../../../../utils/printerRouting";
import { printHtmlReceipt } from "../../../../services/qzService";
import { printerSettingsApi } from "../../../../services/printerSettingsApi";
import { getVatStatus, getBillingConfig, roundCalc, CALC_PRECISION, getPriceView, getPrintPrice, getDiscountCalculation } from "../../../utils/billing";
import { isKotArabicEnabled, formatItemDisplayName } from "../../../../utils/alternativeHelpers";
import { sortOrderDetailsBySequence } from "../../../utils/orderSort";
import { mapOrderDetailsToCartItems } from "../../../mappers/orderDetailToCartMapper";
import { buildUnifiedOrderPricing } from "../../../../utils/orderPricing";
import { checkOrderHasBillDiscount } from "../../../utils/orderDiscountCheck";
import { printRecallOrderGuestReceipt } from "../../../utils/printRecallOrder";

import { usePosProducts, alternativesCache } from "../../../hooks/usePosProducts";
import { t, getLocalizedName } from "../../../../utils/posLocalization";

interface PosRecallDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: number | null;
  orderDetailsStr?: string; // Fallback string parsed from the recall list (e.g. details text)
  onEditSuccess?: () => void; // Triggered when loading into POS cart to close the parent modals
  onSettleSuccess?: (amount: number) => void; // Triggered when proceeding to settlement
  onOrderVoided?: () => void;
}

const orderTypeNameMap: Record<string, number> = {
  DineIn: 1,
  TakeOut: 2,
  DriveThru: 3,
  Delivery: 4,
  Providers: 5,
  Coming: 6,
};

const orderTypeIdToNameMap: Record<number, string> = {
  1: "DineIn",
  2: "TakeOut",
  3: "DriveThru",
  4: "Delivery",
  5: "Providers",
  6: "Coming",
};

export const PosRecallDetailsModal: React.FC<PosRecallDetailsModalProps> = ({
  isOpen,
  onClose,
  orderId,
  orderDetailsStr = "",
  onEditSuccess,
  onSettleSuccess,
  onOrderVoided: _onOrderVoided,
}) => {
  const { showToast } = useToast();
  const dispatch = useAppDispatch();
  const productCache = useAppSelector((state) => state.pos.productCache);
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState<any>(null);
  const { products } = usePosProducts();

  // Parse details string as fallback in case API isn't ready or returns null/empty
  const fallbackDetails = React.useMemo(() => {
    if (!orderDetailsStr) return null;
    try {
      // E.g.: "Order : 5 Ticket : 1 07:52:49 AM (DineIn) (CASH CUSTOMER) (Waiter) Section : UPSTAIR TableNo : T1 Amnt : 9.800"
      const details = orderDetailsStr;
      
      const orderNoMatch = details.match(/Order\s*:\s*(\d+)/i);
      const ticketNoMatch = details.match(/Ticket\s*:\s*(\d+)/i);
      const amntMatch = details.match(/Amnt\s*:\s*([\d.]+)/i);
      const typeMatch = details.match(/\((DineIn|TakeOut|DriveThru|Delivery|Providers|Coming)\)/i);
      const customerMatch = details.match(/\((CASH CUSTOMER|[^)]+)\)/gi);
      
      // Attempt to extract customer/waiter names (usually in parentheses)
      let customerName = "CASH CUSTOMER";
      let employeeName = "Waiter";
      if (customerMatch && customerMatch.length >= 2) {
        customerName = customerMatch[1].replace(/[()]/g, "");
        if (customerMatch.length >= 3) {
          employeeName = customerMatch[2].replace(/[()]/g, "");
        }
      }

      const orderNo = orderNoMatch ? orderNoMatch[1] : (orderId || "");
      const ticketNo = ticketNoMatch ? ticketNoMatch[1] : "";
      const netAmount = amntMatch ? parseFloat(amntMatch[1]) : 0;
      const orderType = typeMatch ? typeMatch[1] : "DineIn";
      
      // Parse date/time
      const timeMatch = details.match(/(\d{2}:\d{2}:\d{2}\s*(?:AM|PM))/i);
      const timeStr = timeMatch ? timeMatch[1] : new Date().toLocaleTimeString();

      // Create fallback lines (mocked based on total amount)
      const mockItems = [
        {
          productId: 1,
          productName: "Ordered Items",
          qty: 1,
          price: netAmount,
          netAmount: netAmount,
        }
      ];

      return {
        orderId: orderId || 0,
        orderNo,
        ticketNo,
        employeeName,
        customerName,
        orderTypeName: orderType,
        netAmount,
        voucherDate: timeStr,
        details: mockItems,
        deliveryDetails: details.toLowerCase().includes("delivery") ? {
          mobile: "33000033",
          customerName: "Delivery Customer",
          area: "Area 1",
          block: "10",
          road: "20",
          building: "30",
          flat: "40",
        } : undefined
      };
    } catch (e) {
      console.error("Failed to parse fallback details:", e);
      return null;
    }
  }, [orderDetailsStr, orderId]);

  const effectiveOrderId = Number(
    orderId ||
    (orderDetailsStr && (orderDetailsStr.match(/Order\s*:\s*(\d+)/i)?.[1] || orderDetailsStr.match(/Order\s*No\s*:\s*(\d+)/i)?.[1] || orderDetailsStr.match(/#(\d+)/)?.[1])) ||
    0
  );

  const [modifierTypes, setModifierTypes] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen && (orderId || effectiveOrderId)) {
      void loadOrderDetails();
      void fetchModifierTypes();
    } else {
      setOrder(null);
    }
  }, [isOpen, orderId, effectiveOrderId]);

  const fetchModifierTypes = async () => {
    try {
      const data = await menuApi.getModifierTypes();
      setModifierTypes(data || []);
    } catch (e) {
      console.error("Failed to load modifier types:", e);
    }
  };

  const loadOrderDetails = async () => {
    const targetId = Number(orderId || effectiveOrderId);
    if (!targetId) return;
    setLoading(true);
    try {
      const parsedType = fallbackDetails?.orderTypeName || (orderDetailsStr?.match(/\((DineIn|TakeOut|DriveThru|Delivery|Providers|Coming)\)/i)?.[1]);
      const response = await orderApi.getOrderDetails(targetId, {
        priceView: effectivePriceView,
        orderType: parsedType,
      });
      const orderData = response?.data || response;
      const rawMaster = orderData?.masterData || orderData?.master || orderData;
      const master = Array.isArray(rawMaster) ? (rawMaster[0] || {}) : (rawMaster || {});
      const details = orderData?.detailsData || orderData?.details || [];

      if (orderData && ((Array.isArray(details) && details.length > 0) || (master && (master.orderNo || master.orderId || master.ticketNo)))) {
        console.log("ORDER DETAILS RAW RESPONSE:", JSON.stringify(orderData, null, 2));
        const safeOrderTypeId = master.orderTypeId || (master.orderType && orderTypeNameMap[master.orderType]) || 1;

        // Ensure alternatives are fetched and cached for products in this order
        const pIds = Array.from(new Set(details.map((d: any) => d.productId || d.ProductId || d.itemId || d.ItemId).filter(Boolean)));
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

        // Enrich detail rows with accurate alternative / variant names
        details.forEach((d: any) => {
          const pId = d.productId || d.ProductId || d.itemId || d.ItemId;
          const uId = d.unitId ?? d.UnitId;
          const altsKey = `${pId}-${safeOrderTypeId}`;
          const alts = alternativesCache[altsKey] || [];
          const matchedAlt = alts.find((a: any) => Number(a.unitId ?? a.UnitId ?? a.id ?? a.Id) === Number(uId));

          if (matchedAlt) {
            d.altName = matchedAlt.altName;
            d.variantName = matchedAlt.altName;
            d.variantArabic = matchedAlt.altArabic;
            d.unitName = matchedAlt.altName;
          } else if (d.altName || d.variantName) {
            d.variantName = d.altName || d.variantName;
            d.unitName = d.variantName;
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

        setOrder(orderData);
      } else {
        // Fall back to parsed details from order string
        setOrder(fallbackDetails);
      }
    } catch (err) {
      console.warn("API error, falling back to parsed string details:", err);
      setOrder(fallbackDetails);
    } finally {
      setLoading(false);
    }
  };

  // Deduplicate modifiersData to prevent Cartesian product duplicates from backend SQL joins
  const modifiersData = React.useMemo(() => {
    const rawModifiers = order?.modifiersData || order?.modifiers || order?.ModifiersData || order?.Modifiers || order?.data?.modifiersData || order?.data?.modifiers || [];
    const seen = new Set<string>();
    return rawModifiers.filter((m: any) => {
      const mMapId = m.mapId ?? m.MapId ?? m.mapID ?? 0;
      const mModId = m.modifierId ?? m.ModifierId ?? m.id ?? m.Id ?? 0;
      const key = `${mMapId}-${mModId}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [order?.modifiersData, order?.modifiers, order?.ModifiersData, order?.Modifiers, order?.data]);

  const handlePrintKOT = async () => {
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
      const unified = buildUnifiedOrderPricing(order, {
        orderType: orderTypeName,
        printPrice: printPriceSetting,
        modifierTypes,
        isBillDiscount: isBillLevelDiscount,
        products,
        productCache,
      });

      mappedItems = unified.lines.map((l) => {
        let matchedProduct = l.productId ? products.find((p: any) => p.id === l.productId) : null;
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
        fallbackDetails?.deliveryDetails?.mobile ||
        "";
      let resolvedCallBack =
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

      let rawChange =
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
            Number(localStorage.getItem("systemBranchId")) ||
            Number(localStorage.getItem("activeBranchId")) ||
            Number(localStorage.getItem("branchId")) ||
            1;
          const { employeeService } = await import("../../../../../general/employee/services/employeeService");
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
        ticketNo: master.ticketNo ?? "1",
        waiter: (() => {
          const rawName = master.employeeName ?? fallbackDetails?.employeeName;
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
        vehicleNo: master.vehicleNo || "",
        customerName: resolvedCustomerName,
        driver: isDeliveryOrder ? (resolvedDriver || undefined) : undefined,
        driverName: isDeliveryOrder ? (resolvedDriver || undefined) : undefined,
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
        kotArabic: isKotArabicEnabled(),
        forcedPrint: true,
        priceView: (localStorage.getItem("priceView") as any) || undefined,
        printPrice: (localStorage.getItem("printPrice") as any) || undefined,
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

  const handlePrintGuest = async () => {
    const targetOrderId = Number(orderId || effectiveOrderId);
    if (!targetOrderId) return;
    await printRecallOrderGuestReceipt({
      orderId: targetOrderId,
      order,
      orderDetailsStr,
      products,
      productCache,
      alternativesCache,
      showToast,
    });
  };

  const handleEditOrder = () => {
    if (!order) return;
    
    try {
      const rawMaster = order.masterData || order.master || order;
      const master = Array.isArray(rawMaster) ? (rawMaster[0] || {}) : (rawMaster || {});

      const rawTypeCandidate =
        master.orderType ||
        master.orderTypeName ||
        (master.orderTypeId ? orderTypeIdToNameMap[Number(master.orderTypeId)] : "") ||
        order?.orderTypeName ||
        fallbackDetails?.orderTypeName ||
        (orderDetailsStr?.match(/\((DineIn|TakeOut|DriveThru|Delivery|Providers|Coming)\)/i)?.[1]) ||
        "TakeOut";
      const resolvedOrderTypeObj = fallbackOrderTypeByName(rawTypeCandidate);
      const orderTypeName = resolvedOrderTypeObj.orderType;
      const orderTypeId = master.orderTypeId ? Number(master.orderTypeId) : resolvedOrderTypeObj.orderTypeId;

      const rawVoucher = master.voucherNo ? String(master.voucherNo).replace(/\D/g, '') : '';
      const parsedVoucher = rawVoucher ? parseInt(rawVoucher, 10) : NaN;
      const saleId = !isNaN(parsedVoucher) ? parsedVoucher : null;

      const rawUpdatedAt = master.updatedAt || master.updated_at || master.prevUpdatedAt || master.createdAt || master.created_at || master.voucherDate;
      const prevUpdatedAt = rawUpdatedAt ? String(rawUpdatedAt) : undefined;
      if (prevUpdatedAt) {
        sessionStorage.setItem(`order_prevUpdatedAt_${orderId}`, prevUpdatedAt);
      }

      const billingConfig = getBillingConfig(orderTypeName);
      const enableVat = getVatStatus();
      const netAmount = Number(master.netAmount ?? master.NetAmount ?? order?.netAmount ?? order?.NetAmount ?? 0);
      const masterDiscPer = Number(master.discPer ?? master.DiscPer ?? 0);

      let detailsVatSum = 0;
      let lineDiscountsSum = 0;
      details.forEach((d: any) => {
        detailsVatSum += Number(d.vatAmount ?? d.VatAmount ?? 0);
        lineDiscountsSum += Number(d.discAmount ?? d.DiscAmount ?? 0);
      });

      let resolvedVatAmount = Number(master.vatAmount ?? master.VatAmount ?? master.vatAmt ?? master.taxAmount ?? 0);
      if (resolvedVatAmount <= 0 && detailsVatSum > 0) {
        resolvedVatAmount = detailsVatSum;
      }
      if (enableVat && resolvedVatAmount <= 0 && netAmount > 0) {
        const vatRate = billingConfig.vatRate > 0 ? billingConfig.vatRate : 0.10;
        resolvedVatAmount = roundCalc(netAmount - (netAmount / (1 + vatRate)));
      }

      let resolvedDiscount = Number(
        master.discAmount ??
        master.DiscAmount ??
        master.discAmt ??
        master.DiscAmt ??
        master.discount ??
        master.Discount ??
        master.discountAmount ??
        master.DiscountAmount ??
        master.billDiscount ??
        master.BillDiscount ??
        master.billDiscountValue ??
        0
      );
      if (resolvedDiscount <= 0 && lineDiscountsSum > 0) {
        resolvedDiscount = roundCalc(lineDiscountsSum);
      }

      const isBillComplimentary = Boolean(
        master.complimentaryStatus ||
        master.ComplimentaryStatus ||
        masterDiscPer === 100 ||
        (details.length > 0 && details.every((d: any) =>
          Boolean(d.complimentaryStatus || d.ComplimentaryStatus || Number(d.discPer ?? d.DiscPer ?? 0) === 100)
        )) ||
        (netAmount === 0 && resolvedDiscount > 0 && details.length > 0)
      );

      const hasLineItemDiscounts = lineDiscountsSum > 0;
      const isBillLevelDiscount =
        isBillComplimentary ||
        masterDiscPer > 0 ||
        checkOrderHasBillDiscount(order) ||
        checkOrderHasBillDiscount({ master, details }) ||
        (!hasLineItemDiscounts && resolvedDiscount > 0) ||
        (hasLineItemDiscounts && resolvedDiscount > lineDiscountsSum + 0.001);

      const resolvedBillDiscType: 'percentage' | 'amount' =
        (isBillComplimentary || masterDiscPer > 0)
          ? 'percentage'
          : 'amount';

      const effectivePriceView = getPriceView();

      const mappedCartItems = mapOrderDetailsToCartItems(details, modifiersData, {
        products,
        productCache,
        priceView: effectivePriceView,
        masterDiscPer: isBillComplimentary ? 100 : masterDiscPer,
        isOrderBillDiscount: isBillLevelDiscount,
        orderType: orderTypeName,
      });

      const unifiedPricing = buildUnifiedOrderPricing(order, {
        orderType: orderTypeName,
        priceView: effectivePriceView,
        isBillDiscount: isBillLevelDiscount,
        products,
        productCache,
      });
      const authSubtotal = (master.subTotal && Math.abs(Number(master.subTotal) - unifiedPricing.summary.subTotalExclusive) < 0.15)
        ? Number(master.subTotal)
        : unifiedPricing.summary.subTotalExclusive;
      const authDiscount = isBillComplimentary
        ? authSubtotal
        : (backendDiscount > 0 ? backendDiscount : (unifiedPricing.summary.totalDiscountExcl || 0));
      const authTax = isBillComplimentary ? 0 : (resolvedVatAmount > 0 && Math.abs(resolvedVatAmount - unifiedPricing.summary.vatAmount) < 0.15 ? resolvedVatAmount : unifiedPricing.summary.vatAmount);
      const authNet = isBillComplimentary ? 0 : (netAmount > 0 && Math.abs(netAmount - unifiedPricing.summary.grandTotal) < 0.15 ? netAmount : unifiedPricing.summary.grandTotal);
      const authCharges = (unifiedPricing.summary.charges !== undefined && unifiedPricing.summary.charges > 0)
        ? unifiedPricing.summary.charges
        : roundCalc(Number(master.serviceCharge || 0) + Number(master.levy || master.levyAmt || 0));
      const authNetValue = (unifiedPricing.summary.netValue !== undefined && unifiedPricing.summary.netValue > 0)
        ? unifiedPricing.summary.netValue
        : roundCalc(Math.max(0, authSubtotal - authDiscount) + authCharges);

      let resolvedBillDiscVal = isBillComplimentary
        ? 100
        : masterDiscPer > 0
        ? masterDiscPer
        : isBillLevelDiscount
        ? (resolvedDiscount > 0 ? resolvedDiscount : (getDiscountCalculation() === "Inclusive" ? (unifiedPricing.summary.totalDiscountIncl || 0) : (unifiedPricing.summary.totalDiscountExcl || 0)))
        : 0;

      dispatch(loadRecalledOrder({
        editingOrderId: orderId,
        editingSaleId: saleId,
        isSettledEdit: saleId !== null,
        cartItems: mappedCartItems,
        orderTypeId: orderTypeId,
        orderTypeName: orderTypeName,
        customerId: master.customerId || 1,
        addressId: master.addressId || 0,
        billDiscountValue: Number(resolvedBillDiscVal || 0),
        billDiscountType: resolvedBillDiscType,
        sectionId: master.sectionId || 0,
        tableId: master.tableId || 0,
        tableNo: master.tableNo || master.tableName || (master.tableId ? String(master.tableId) : ""),
        guestNo: master.guestNo || master.guests || 0,
        deliveryCharge: master.deliveryCharge !== undefined ? Number(master.deliveryCharge) : undefined,
        contactNo: master.mobileNo || master.contactNo,
        callBack: master.callBack || master.callback || master.callBackNo || master.callbackNo || master.callBackNumber || master.callbackNumber,
        note: master.note,
        change: master.change || master.keepChanges,
        isComing: master.isComing,
        comingTime: master.comingTime,
        vehicleCustomerName: master.vehicleCustomerName,
        vehicleNo: master.vehicleNo,
        isMissedCall: Boolean(master.missedCall ?? master.isMissedCall),
        authoritativeSubtotal: authSubtotal,
        authoritativeDiscount: authDiscount,
        authoritativeTax: authTax,
        authoritativeNetAmount: authNet,
        authoritativeCharges: authCharges,
        authoritativeNetValue: authNetValue,
        prevUpdatedAt,
      }));

      if (orderTypeName.toLowerCase().includes("delivery")) {
        const resolvedChangeVal = master.change ?? master.keepChanges ?? (order as any)?.change ?? (order as any)?.keepChanges ?? "";
        const resolvedCallBackVal = master.callBack || master.callback || master.callBackNo || master.callbackNo || master.callBackNumber || master.callbackNumber || "";
        dispatch(setDeliveryDetails({
          customerName: master.deliveryCustomerName || master.vehicleCustomerName || master.customerName || "",
          contactNo: master.mobileNo || master.contactNo || "",
          callBack: resolvedCallBackVal,
          flatNo: master.flatNo || master.flat || master.flatNumber || "",
          buildingNo: master.buildingNo || master.building || master.buildingNumber || "",
          roadNo: master.roadNo || master.road || master.roadNumber || master.street || "",
          blockNo: master.blockNo || master.block || master.blockNumber || "",
          area: master.area || master.areaName || "",
          note: master.note || "",
          addressId: master.addressId || 0,
          isMissedCall: Boolean(master.missedCall ?? master.isMissedCall),
          isComing: Boolean(master.isComing),
          change: resolvedChangeVal,
        }));
      }

      onEditSuccess?.();
      onClose();
    } catch (e) {
      console.error(e);
      showToast("Failed to load order into editor", "error");
    }
  };

  const handleSettleOrder = () => {
    if (!order) return;
    
    try {
      const rawMaster = order.masterData || order.master || order;
      const master = Array.isArray(rawMaster) ? (rawMaster[0] || {}) : (rawMaster || {});

      const rawTypeCandidate =
        master.orderType ||
        master.orderTypeName ||
        (master.orderTypeId ? orderTypeIdToNameMap[Number(master.orderTypeId)] : "") ||
        order?.orderTypeName ||
        fallbackDetails?.orderTypeName ||
        (orderDetailsStr?.match(/\((DineIn|TakeOut|DriveThru|Delivery|Providers|Coming)\)/i)?.[1]) ||
        "TakeOut";
      const resolvedOrderTypeObj = fallbackOrderTypeByName(rawTypeCandidate);
      const orderTypeName = resolvedOrderTypeObj.orderType;
      const orderTypeId = master.orderTypeId ? Number(master.orderTypeId) : resolvedOrderTypeObj.orderTypeId;

      const rawVoucher = master.voucherNo ? String(master.voucherNo).replace(/\D/g, '') : '';
      const parsedVoucher = rawVoucher ? parseInt(rawVoucher, 10) : NaN;
      const saleId = !isNaN(parsedVoucher) ? parsedVoucher : null;

      const rawUpdatedAt = master.updatedAt || master.updated_at || master.prevUpdatedAt || master.createdAt || master.created_at || master.voucherDate;
      const prevUpdatedAt = rawUpdatedAt ? String(rawUpdatedAt) : undefined;
      if (prevUpdatedAt) {
        sessionStorage.setItem(`order_prevUpdatedAt_${orderId}`, prevUpdatedAt);
      }

      const billingConfig = getBillingConfig(orderTypeName);
      const enableVat = getVatStatus();
      const netAmount = Number(master.netAmount ?? master.NetAmount ?? order?.netAmount ?? order?.NetAmount ?? 0);
      const masterDiscPer = Number(master.discPer ?? master.DiscPer ?? 0);

      let detailsVatSum = 0;
      let lineDiscountsSum = 0;
      details.forEach((d: any) => {
        detailsVatSum += Number(d.vatAmount ?? d.VatAmount ?? 0);
        lineDiscountsSum += Number(d.discAmount ?? d.DiscAmount ?? 0);
      });

      let resolvedVatAmount = Number(master.vatAmount ?? master.VatAmount ?? master.vatAmt ?? master.taxAmount ?? 0);
      if (resolvedVatAmount <= 0 && detailsVatSum > 0) {
        resolvedVatAmount = detailsVatSum;
      }
      if (enableVat && resolvedVatAmount <= 0 && netAmount > 0) {
        const vatRate = billingConfig.vatRate > 0 ? billingConfig.vatRate : 0.10;
        resolvedVatAmount = roundCalc(netAmount - (netAmount / (1 + vatRate)));
      }

      let resolvedDiscount = Number(
        master.discAmount ??
        master.DiscAmount ??
        master.discAmt ??
        master.DiscAmt ??
        master.discount ??
        master.Discount ??
        master.discountAmount ??
        master.DiscountAmount ??
        master.billDiscount ??
        master.BillDiscount ??
        master.billDiscountValue ??
        0
      );
      if (resolvedDiscount <= 0 && lineDiscountsSum > 0) {
        resolvedDiscount = roundCalc(lineDiscountsSum);
      }

      const isBillComplimentary = Boolean(
        master.complimentaryStatus ||
        master.ComplimentaryStatus ||
        masterDiscPer === 100 ||
        (details.length > 0 && details.every((d: any) =>
          Boolean(d.complimentaryStatus || d.ComplimentaryStatus || Number(d.discPer ?? d.DiscPer ?? 0) === 100)
        )) ||
        (netAmount === 0 && resolvedDiscount > 0 && details.length > 0)
      );

      const hasLineItemDiscounts = lineDiscountsSum > 0;
      const isBillLevelDiscount =
        isBillComplimentary ||
        masterDiscPer > 0 ||
        checkOrderHasBillDiscount(order) ||
        checkOrderHasBillDiscount({ master, details }) ||
        (!hasLineItemDiscounts && resolvedDiscount > 0) ||
        (hasLineItemDiscounts && resolvedDiscount > lineDiscountsSum + 0.001);

      const resolvedBillDiscType: 'percentage' | 'amount' =
        (isBillComplimentary || masterDiscPer > 0)
          ? 'percentage'
          : 'amount';

      const effectivePriceView = getPriceView();

      const mappedCartItems = mapOrderDetailsToCartItems(details, modifiersData, {
        products,
        productCache,
        priceView: effectivePriceView,
        masterDiscPer: isBillComplimentary ? 100 : masterDiscPer,
        isOrderBillDiscount: isBillLevelDiscount,
      });

      const unifiedPricing = buildUnifiedOrderPricing(order, {
        orderType: orderTypeName,
        priceView: effectivePriceView,
        isBillDiscount: isBillLevelDiscount,
        products,
        productCache,
      });
      const authSubtotal = (master.subTotal && Math.abs(Number(master.subTotal) - unifiedPricing.summary.subTotalExclusive) < 0.15)
        ? Number(master.subTotal)
        : unifiedPricing.summary.subTotalExclusive;
      const authDiscount = isBillComplimentary
        ? authSubtotal
        : (backendDiscount > 0 ? backendDiscount : (unifiedPricing.summary.totalDiscountExcl || 0));
      const authTax = isBillComplimentary ? 0 : (resolvedVatAmount > 0 && Math.abs(resolvedVatAmount - unifiedPricing.summary.vatAmount) < 0.15 ? resolvedVatAmount : unifiedPricing.summary.vatAmount);
      const authNet = isBillComplimentary ? 0 : (netAmount > 0 && Math.abs(netAmount - unifiedPricing.summary.grandTotal) < 0.15 ? netAmount : unifiedPricing.summary.grandTotal);

      let resolvedBillDiscVal = isBillComplimentary
        ? 100
        : masterDiscPer > 0
        ? masterDiscPer
        : isBillLevelDiscount
        ? (resolvedDiscount > 0 ? resolvedDiscount : (getDiscountCalculation() === "Inclusive" ? (unifiedPricing.summary.totalDiscountIncl || 0) : (unifiedPricing.summary.totalDiscountExcl || 0)))
        : 0;

      dispatch(loadRecalledOrder({
        editingOrderId: orderId,
        editingSaleId: saleId,
        isSettledEdit: saleId !== null,
        cartItems: mappedCartItems,
        orderTypeId: orderTypeId,
        orderTypeName: orderTypeName,
        customerId: master.customerId || 1,
        addressId: master.addressId || 0,
        billDiscountValue: Number(resolvedBillDiscVal || 0),
        billDiscountType: resolvedBillDiscType,
        sectionId: master.sectionId || 0,
        tableId: master.tableId || 0,
        tableNo: master.tableNo || master.tableName || (master.tableId ? String(master.tableId) : ""),
        guestNo: master.guestNo || master.guests || 0,
        deliveryCharge: master.deliveryCharge !== undefined ? Number(master.deliveryCharge) : undefined,
        contactNo: master.mobileNo || master.contactNo,
        callBack: master.callBack || master.callback || master.callBackNo || master.callbackNo || master.callBackNumber || master.callbackNumber,
        note: master.note,
        change: master.change || master.keepChanges,
        isComing: master.isComing,
        comingTime: master.comingTime,
        vehicleCustomerName: master.vehicleCustomerName,
        vehicleNo: master.vehicleNo,
        deliveryCustomerName: master.deliveryCustomerName || master.vehicleCustomerName || master.customerName,
        flatNo: master.flatNo || master.flat || master.flatNumber || "",
        buildingNo: master.buildingNo || master.building || master.buildingNumber || "",
        blockNo: master.blockNo || master.block || master.blockNumber || "",
        roadNo: master.roadNo || master.road || master.roadNumber || master.street || "",
        area: master.area || master.areaName || "",
        isMissedCall: Boolean(master.missedCall ?? master.isMissedCall),
        isSettling: true,
        authoritativeSubtotal: authSubtotal,
        authoritativeDiscount: authDiscount,
        authoritativeTax: authTax,
        authoritativeNetAmount: authNet,
        prevUpdatedAt,
      }));

      if (orderTypeName.toLowerCase().includes("delivery")) {
        const resolvedChangeVal = master.change ?? master.keepChanges ?? (order as any)?.change ?? (order as any)?.keepChanges ?? "";
        const resolvedCallBackVal = master.callBack || master.callback || master.callBackNo || master.callbackNo || master.callBackNumber || master.callbackNumber || "";
        dispatch(setDeliveryDetails({
          customerName: master.deliveryCustomerName || master.vehicleCustomerName || master.customerName || "",
          contactNo: master.mobileNo || master.contactNo || "",
          callBack: resolvedCallBackVal,
          flatNo: master.flatNo || master.flat || master.flatNumber || "",
          buildingNo: master.buildingNo || master.building || master.buildingNumber || "",
          roadNo: master.roadNo || master.road || master.roadNumber || master.street || "",
          blockNo: master.blockNo || master.block || master.blockNumber || "",
          area: master.area || master.areaName || "",
          note: master.note || "",
          addressId: master.addressId || 0,
          isMissedCall: Boolean(master.missedCall ?? master.isMissedCall),
          isComing: Boolean(master.isComing),
          change: resolvedChangeVal,
        }));
      }

      onSettleSuccess?.(authNet);
      onClose();
    } catch (e) {
      console.error(e);
      showToast("Failed to load order for settlement", "error");
    }
  };

  if (!isOpen) return null;

  const rawMaster = order?.masterData || order?.master || order;
  const master = Array.isArray(rawMaster) ? (rawMaster[0] || {}) : (rawMaster || {});
  const details = sortOrderDetailsBySequence(order?.detailsData || order?.details || []);
  
  const orderNo = master.orderNo ?? order?.orderNo ?? orderId ?? "";
  const ticketNo = master.ticketNo ?? order?.ticketNo ?? "1";
  const resolveEmpName = (empId?: number | string | null) => {
    if (!empId) return null;
    try {
      const mapRaw = localStorage.getItem("posEmpNameMap");
      if (mapRaw) { const m = JSON.parse(mapRaw); if (m[String(empId)]) return m[String(empId)]; }
    } catch {}
    return null;
  };
  const rawEmpName = master.employeeName ?? master.waiter ?? order?.employeeName ?? fallbackDetails?.employeeName;
  const employeeName = (rawEmpName && !["waiter", "cashier", "null", "undefined"].includes(String(rawEmpName).trim().toLowerCase()))
    ? String(rawEmpName).trim()
    : (resolveEmpName(master.employeeId ?? master.empId ?? master.salespersonId)
      || localStorage.getItem("defaultEmployeeName")
      || localStorage.getItem("authorizedEmployeeName")
      || localStorage.getItem("employeeName")
      || "Waiter");
  
  const orderTypeMap: Record<number, string> = {
    1: "DineIn",
    2: "TakeOut",
    3: "DriveThru",
    4: "Delivery",
    5: "Providers",
    6: "Coming"
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
  
  // Extract time from orderDetailsStr as a reliable fallback (e.g. "7:46:02 PM")
  const timeFromDetails = (() => {
    if (!orderDetailsStr) return "";
    const m = orderDetailsStr.match(/(\d{1,2}:\d{2}:\d{2}\s*(?:AM|PM))/i);
    return m ? m[1] : "";
  })();

  // Try every common backend date field name — never fall back to current time
  const voucherDate: string =
    master.voucherDate ??
    master.VoucherDate ??
    master.orderDate ??
    master.OrderDate ??
    master.entryDate ??
    master.EntryDate ??
    master.transDate ??
    master.TransDate ??
    master.punchTime ??
    master.PunchTime ??
    master.orderTime ??
    master.OrderTime ??
    master.createdAt ??
    master.CreatedAt ??
    master.orderDateTime ??
    master.OrderDateTime ??
    order?.voucherDate ??
    order?.VoucherDate ??
    order?.orderDate ??
    order?.OrderDate ??
    order?.entryDate ??
    order?.createdAt ??
    timeFromDetails; // last resort: extract from the recall list text

  // Format date as dd/MM/yyyy preserving time portion
  const formatVoucherDate = (raw: string): string => {
    try {
      if (!raw) return "";
      const d = new Date(raw);
      if (isNaN(d.getTime())) {
        // If it's just a time string like "7:46:02 PM" extracted from details, prepend today's date
        if (/am|pm/i.test(raw)) {
          const today = new Date();
          const dd = String(today.getDate()).padStart(2, '0');
          const mm = String(today.getMonth() + 1).padStart(2, '0');
          const yyyy = today.getFullYear();
          return `${dd}/${mm}/${yyyy} ${raw}`;
        }
        return raw;
      }
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const yyyy = d.getFullYear();
      const hh = String(d.getHours()).padStart(2, '0');
      const min = String(d.getMinutes()).padStart(2, '0');
      const ss = String(d.getSeconds()).padStart(2, '0');
      return `${dd}/${mm}/${yyyy} ${hh}:${min}:${ss}`;
    } catch { return raw; }
  };
  const effectivePriceView = getPriceView();
  const isTaxInclusive = effectivePriceView === "Inclusive";

  const isBillLevelDiscount = order ? checkOrderHasBillDiscount(order) : false;
  const unified = buildUnifiedOrderPricing(order, {
    orderType: orderTypeName,
    priceView: effectivePriceView,
    modifierTypes,
    isBillDiscount: isBillLevelDiscount,
    products,
    productCache,
  });

  const billingConfig = getBillingConfig(orderTypeName || "DineIn");
  const isVatActive = Boolean(isEnableVatGuestPrint(master as any) || getVatStatus() || unified?.summary?.isVatActive);

  const backendDiscount = Number(
    master.discAmount ??
    master.DiscAmount ??
    master.discAmt ??
    master.DiscAmt ??
    master.discount ??
    master.Discount ??
    master.billDiscount ??
    master.BillDiscount ??
    master.billDiscountValue ??
    0
  );
  const detailsScSum = roundCalc(
    (details || []).reduce((sum: number, d: any) => sum + Number(d.serviceCharge ?? d.ServiceCharge ?? 0), 0)
  );
  const displayServiceCharge = detailsScSum > 0
    ? detailsScSum
    : Number(
        master.serviceCharge ??
        master.ServiceCharge ??
        (unified ? unified.summary.serviceCharge : 0)
      );

  const detailsLevySum = roundCalc(
    (details || []).reduce((sum: number, d: any) => sum + Number(d.levy ?? d.Levy ?? 0), 0)
  );
  const displayLevy = detailsLevySum > 0
    ? detailsLevySum
    : Number(
        master.levyAmt ??
        master.levy ??
        master.Levy ??
        (unified ? unified.summary.levy : 0)
      );
  const displayDeliveryCharge = Number(
    master.deliveryCharge ??
    master.DeliveryCharge ??
    (unified ? unified.summary.deliveryCharge : 0)
  );
  const rawModalCharges = Number(displayServiceCharge || 0) + Number(displayLevy || 0);
  const displayDiscount = Number(
    unified
      ? ((isTaxInclusive && rawModalCharges <= 0)
          ? (unified.summary.totalDiscountIncl ?? (typeof unified.summary.getTotalDiscount === "function" ? unified.summary.getTotalDiscount(true) : backendDiscount))
          : (unified.summary.totalDiscountExcl ?? (typeof unified.summary.getTotalDiscount === "function" ? unified.summary.getTotalDiscount(false) : backendDiscount)))
      : (backendDiscount > 0 ? backendDiscount : 0)
  );
  let displayVatAmount = Number(
    master.vatAmount ??
    master.VatAmount ??
    master.vatAmt ??
    (unified ? unified.summary.vatAmount : 0)
  );
  if (displayVatAmount <= 0 && isVatActive) {
    const rateFraction = billingConfig.vatRate > 0 ? (billingConfig.vatRate > 1 ? billingConfig.vatRate / 100 : billingConfig.vatRate) : 0.10;
    const delivery = Number(master.deliveryCharge || unified.summary?.deliveryCharge || 0);
    const grandTotal = Number(master.netAmount ?? master.NetAmount ?? unified.summary.grandTotal ?? 0);
    const taxableGross = Math.max(0, grandTotal - delivery);
    if (rateFraction > 0 && taxableGross > 0) {
      displayVatAmount = roundCalc(taxableGross - (taxableGross / (1 + rateFraction)), CALC_PRECISION);
    }
  }
  const grossSubTotalFromLines = unified
    ? ((isTaxInclusive && rawModalCharges <= 0) ? unified.summary.subTotalInclusive : unified.summary.subTotalExclusive)
    : 0;

  const displaySubTotal = Number(
    grossSubTotalFromLines > 0
      ? grossSubTotalFromLines
      : (master.subTotal !== undefined && master.subTotal !== null && Number(master.subTotal) > 0
          ? Number(master.subTotal)
          : (master.vatExclAmount !== undefined && master.vatExclAmount !== null && Number(master.vatExclAmount) > 0
              ? Number(master.vatExclAmount) + displayDiscount
              : 0))
  );
  const netAmount = Number(
    master.netAmount ??
    master.NetAmount ??
    unified.summary.grandTotal ??
    0
  );
  let displayCharges = (unified?.summary?.charges && unified.summary.charges > 0)
    ? unified.summary.charges
    : roundCalc(Number(displayServiceCharge || 0) + Number(displayLevy || 0));
  if (netAmount > 0) {
    const netBase = Math.max(0, displaySubTotal - displayDiscount);
    const residual = roundCalc(netAmount - netBase - displayDeliveryCharge - displayVatAmount);
    if (residual > 0.001) {
      if (displayCharges <= 0 || Math.abs(displayCharges - residual) > 0.05) {
        displayCharges = residual;
      }
    }
  }
  const displayNetValue = roundCalc(
    unified?.summary?.vatExclAmount ?? Math.max(0, netAmount - displayDeliveryCharge - displayVatAmount)
  );

  const hasDelivery = !!master.mobileNo || !!master.contactNo || !!master.deliveryCustomerName;
  const deliveryDetails = hasDelivery ? {
    mobile: master.mobileNo || master.contactNo || "",
    customerName: master.deliveryCustomerName || master.customerName || "",
    callBack: master.callBack || master.callback || master.callBackNo || master.callbackNo || "",
    area: master.area || "",
    block: master.blockNo || "",
    road: master.roadNo || "",
    building: master.buildingNo || "",
    flat: master.flatNo || "",
    change: master.change || master.keepChanges || "",
  } : order?.deliveryDetails;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      noPadding
      className="bg-[#262626] border border-stone-800 shadow-2xl rounded-2xl overflow-hidden w-full max-w-[520px] md:max-w-[550px]"
    >
      {/* HEADER */}
      <div className="bg-[#1e1e1e] border-b border-stone-800 text-stone-100 py-3.5 px-6 flex justify-between items-center">
        <h2 className="text-sm font-black uppercase tracking-[0.2em] text-[#f48120]">RECALL DETAILS</h2>
        <button onClick={onClose} className="p-1 hover:bg-stone-800 rounded-full transition-colors text-stone-400 hover:text-stone-100">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      {loading ? (
        <div className="py-24 flex items-center justify-center bg-stone-900/40">
          <Loader text="Retrieving Ticket Data..." />
        </div>
      ) : order ? (
        <div className="flex flex-col md:flex-row min-h-[420px] bg-stone-950/80">
          {/* LEFT SIDE: TICKET VIEW (Thermal Printer Style) */}
          <div className="flex-1 min-w-0 p-5 bg-[#faf8f5] text-stone-900 font-mono text-xs flex flex-col justify-between select-text shadow-inner">
            <div>
              {/* Ticket Header */}
              <div className="text-center font-bold border-b border-dashed border-stone-400 pb-3 mb-3">
                <div className="text-sm font-black tracking-wide uppercase">BITEZO POS</div>
                <div className="text-[10px] text-stone-500 font-medium">TERMINAL TICKET</div>
              </div>

              {/* Order Meta Info Grid */}
              <div className="grid grid-cols-2 gap-y-1 text-[11px] border-b border-dashed border-stone-400 pb-3 mb-3">
                <div className="min-w-0 break-words [overflow-wrap:anywhere]">
                  <span className="text-stone-500">Order No: </span>
                  <span className="font-bold">{orderNo}</span>
                </div>
                <div className="text-right min-w-0 break-words [overflow-wrap:anywhere]">
                  <span className="text-stone-500">Ticket: </span>
                  <span className="font-bold">{ticketNo}</span>
                </div>
                
                <div className="min-w-0 break-words [overflow-wrap:anywhere]">
                  <span className="text-stone-500">Emp: </span>
                  <span className="font-bold">{employeeName}</span>
                </div>
                <div className="text-right min-w-0 break-words [overflow-wrap:anywhere]">
                  <span className="text-stone-500">Type: </span>
                  <span className="font-bold text-[#49293e]">{orderTypeName}</span>
                </div>

                <div className="col-span-2 sm:col-span-1 min-w-0 break-words [overflow-wrap:anywhere]">
                  <span className="text-stone-500">Customer: </span>
                  <span className="font-bold">{master.deliveryCustomerName || master.vehicleCustomerName || master.customerName || "CASH CUSTOMER"}</span>
                </div>
                {orderTypeName.toLowerCase().includes("dine") && master.tableNo && (
                  <div className="col-span-2 sm:col-span-1 text-right min-w-0 break-words [overflow-wrap:anywhere]">
                    <span className="text-stone-500">Table: </span>
                    <span className="font-bold">
                      {master.sectionName ? `${master.sectionName} - ` : ""}{master.tableNo}
                    </span>
                  </div>
                )}

                {master.note && (
                  <div className="col-span-2 mt-1 min-w-0 break-words [overflow-wrap:anywhere]">
                    <span className="text-stone-500">Note: </span>
                    <span className="font-bold italic text-stone-600">"{master.note}"</span>
                  </div>
                )}
                
                {master.vehicleNo && (
                  <div className="col-span-2 mt-1 min-w-0 break-words [overflow-wrap:anywhere]">
                    <span className="text-stone-500">Vehicle: </span>
                    <span className="font-bold uppercase">{master.vehicleNo} {master.vehicleCustomerName ? `(${master.vehicleCustomerName})` : ""}</span>
                  </div>
                )}

                <div className="col-span-2 text-stone-500 text-[10px] mt-1">
                  Date: {formatVoucherDate(voucherDate)}
                </div>
              </div>

              {/* Items Table */}
              <div className="mb-4">
                <div className="grid grid-cols-[28px_minmax(0,1fr)_55px_65px] gap-2 font-bold text-stone-500 text-[10px] uppercase border-b border-stone-300 pb-1 mb-2">
                  <div className="text-center">{t("Qty")}</div>
                  <div>{t("Item")}</div>
                  <div className="text-right">{t("Price")}</div>
                  <div className="text-right">{t("Total")}</div>
                </div>

                <div className="space-y-2.5 overflow-y-auto max-h-[200px] pr-1">
                  {unified.lines.map((line, i: number) => {
                    const primaryName = line.productName;
                    const arabicName = line.productArabicName;
                    const localized = getLocalizedName(primaryName, arabicName);
                    const qty = line.quantity;
                    const price = isTaxInclusive
                      ? (line.inclusiveRate || line.getRate(true))
                      : (line.exclusiveRate || line.getRate(false));
                    const lineDisc = typeof line.getDiscount === "function" ? line.getDiscount(isTaxInclusive) : (line.lineDiscount || 0);
                    const itemDisc = lineDisc > 0 ? lineDisc : 0;
                    const origGrossAmt = (isTaxInclusive ? line.inclusiveGross : line.exclusiveGross) || (price * qty);
                    const netAmt = itemDisc > 0
                      ? Math.max(0, origGrossAmt - itemDisc)
                      : ((unified.summary.isBillDiscount || isBillLevelDiscount) ? origGrossAmt : (isTaxInclusive ? line.inclusiveAmount : line.exclusiveAmount));

                    return (
                      <div key={i} className="flex flex-col">
                        <div className="grid grid-cols-[28px_minmax(0,1fr)_55px_65px] gap-2 items-start text-[11px] leading-tight">
                          <div className="font-bold text-stone-500 text-center">{qty}</div>
                          <div className="flex flex-col font-bold text-stone-800 min-w-0">
                            <span className="break-words [overflow-wrap:anywhere] [word-break:break-word]">
                              {formatItemDisplayName(
                                localized.primary,
                                line.variantName
                              )}
                            </span>
                            {localized.secondary && (
                              <span className="text-[10px] text-stone-500 font-semibold break-words [overflow-wrap:anywhere] [word-break:break-word] mt-0.5">{localized.secondary}</span>
                            )}
                          </div>
                          <div className="text-right text-stone-500 shrink-0">{formatAmount(price)}</div>
                          <div className="text-right font-bold text-stone-900 shrink-0">
                            {formatAmount(origGrossAmt)}
                          </div>
                        </div>

                        {itemDisc > 0 && (
                          <div className="grid grid-cols-[28px_minmax(0,1fr)_55px_65px] gap-2 items-start text-[11px] leading-tight mt-0.5 font-bold">
                            <div></div>
                            <div className="col-span-2 text-right text-stone-700 whitespace-nowrap">
                              {t("Disc")} : {formatAmount(itemDisc)}
                            </div>
                            <div className="text-right text-stone-900 shrink-0">
                              {formatAmount(netAmt)}
                            </div>
                          </div>
                        )}

                        {/* Extras rendered underneath with description only, blank amount (already in parent) */}
                        {line.extras && line.extras.length > 0 && line.extras.map((ex, idx) => (
                          <div key={`ex-${idx}`} className="grid grid-cols-[28px_minmax(0,1fr)_55px_65px] gap-2 items-start text-[9px] leading-tight mt-0.5">
                            <div></div>
                            <div className="col-span-2 font-medium min-w-0 break-words [overflow-wrap:anywhere] [word-break:break-word] text-[#f48120]">
                              + {ex.qty > 1 ? `${ex.qty} x ` : ""}{ex.name}
                            </div>
                            <div className="text-right font-medium text-[#f48120] shrink-0"></div>
                          </div>
                        ))}

                        {/* Modifiers */}
                        {line.modifiers && line.modifiers.length > 0 && line.modifiers.map((mod, idx) => (
                          <div key={`mod-${idx}`} className="grid grid-cols-[28px_minmax(0,1fr)_55px_65px] gap-2 items-start text-[9px] leading-tight mt-0.5">
                            <div></div>
                            <div className="col-span-2 font-medium min-w-0 break-words [overflow-wrap:anywhere] [word-break:break-word] text-[#f48120]">
                              * {mod.typeName ? `${mod.typeName}: ` : ""}{mod.qty > 1 ? `${mod.qty} x ` : ""}{mod.name}
                            </div>
                            <div className="text-right font-medium text-[#f48120] shrink-0"></div>
                          </div>
                        ))}

                        {/* Messages */}
                        {line.messages && line.messages.length > 0 && line.messages.map((msg, idx) => (
                          <div key={`msg-${idx}`} className="grid grid-cols-[28px_minmax(0,1fr)_55px_65px] gap-2 items-start text-[9px] leading-tight mt-0.5">
                            <div></div>
                            <div className="col-span-2 font-medium min-w-0 break-words [overflow-wrap:anywhere] [word-break:break-word] text-purple-600">
                              💬 {msg.name}
                            </div>
                            <div className="text-right font-medium text-[#f48120] shrink-0"></div>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Delivery Details Block */}
              {deliveryDetails && (
                <div className="border-t border-dashed border-stone-400 pt-3 mt-3 text-[10px] space-y-0.5 text-stone-600 min-w-0">
                  <div className="font-bold uppercase tracking-wider text-stone-400 mb-1">{t("Delivery Details")}</div>
                  {deliveryDetails.mobile && <div className="break-words [overflow-wrap:anywhere]"><span className="font-bold text-stone-500">{t("Mobile")}: </span>{deliveryDetails.mobile}</div>}
                  {deliveryDetails.callBack && <div className="break-words [overflow-wrap:anywhere]"><span className="font-bold text-stone-500">Call Back: </span>{deliveryDetails.callBack}</div>}
                  {deliveryDetails.customerName && <div className="break-words [overflow-wrap:anywhere]"><span className="font-bold text-stone-500">{t("Customer")}: </span>{deliveryDetails.customerName}</div>}
                  {deliveryDetails.flat && <div className="break-words [overflow-wrap:anywhere]"><span className="font-bold text-stone-500">{t("Flat No")}: </span>{deliveryDetails.flat}</div>}
                  {deliveryDetails.building && <div className="break-words [overflow-wrap:anywhere]"><span className="font-bold text-stone-500">{t("Building")}: </span>{deliveryDetails.building}</div>}
                  {deliveryDetails.block && <div className="break-words [overflow-wrap:anywhere]"><span className="font-bold text-stone-500">{t("Block")}: </span>{deliveryDetails.block}</div>}
                  {deliveryDetails.road && <div className="break-words [overflow-wrap:anywhere]"><span className="font-bold text-stone-500">{t("Road")}: </span>{deliveryDetails.road}</div>}
                  {deliveryDetails.area && <div className="break-words [overflow-wrap:anywhere]"><span className="font-bold text-stone-500">{t("Area")}: </span>{deliveryDetails.area}</div>}
                  {deliveryDetails.change && <div className="break-words [overflow-wrap:anywhere]"><span className="font-bold text-stone-500">{t("Keep Change")}: </span>{deliveryDetails.change}</div>}
                </div>
              )}
            </div>

            {/* Receipt Footer with Sub Total, Discount, Charges, VAT and Grand Total */}
            <div className="border-t border-dashed border-stone-400 pt-3 mt-4 space-y-1 text-[11px]">
              <div className="flex justify-between items-center text-stone-600">
                <span>{t("Sub Total")}</span>
                <span>{formatAmount(displaySubTotal)}</span>
              </div>
              {displayDiscount > 0 && (
                <div className="flex justify-between items-center text-red-600">
                  <span>{t("Discount")}</span>
                  <span>-{formatAmount(displayDiscount)}</span>
                </div>
              )}
              {displayCharges > 0 && (
                <div className="flex justify-between items-center text-stone-600">
                  <span>{t("Charges")}</span>
                  <span>{formatAmount(displayCharges)}</span>
                </div>
              )}
              <div className="flex justify-between items-center text-stone-600">
                <span>{t("Net Value")}</span>
                <span>{formatAmount(displayNetValue)}</span>
              </div>
              {displayDeliveryCharge > 0 && (
                <div className="flex justify-between items-center text-stone-600">
                  <span>{t("Delivery Charge")}</span>
                  <span>{formatAmount(displayDeliveryCharge)}</span>
                </div>
              )}
              {(isVatActive || displayVatAmount > 0) && (
                <div className="flex justify-between items-center text-stone-600">
                  <span>{t("VAT")}</span>
                  <span>{formatAmount(displayVatAmount)}</span>
                </div>
              )}
              <div className="flex justify-between items-center text-xs font-bold text-stone-900 uppercase pt-2 border-t border-dashed border-stone-300">
                <span>{t("Grand Total")}</span>
                <span className="text-base font-black text-[#f48120]">
                  {formatAmount(netAmount)}
                </span>
              </div>
            </div>
          </div>

          {/* RIGHT SIDE: VERTICAL ACTION BUTTONS */}
          <div className="w-full md:w-28 shrink-0 bg-stone-900 border-t md:border-t-0 md:border-l border-stone-800 p-3 flex flex-row md:flex-col gap-2 justify-stretch items-stretch overflow-x-auto">
            <button
              onClick={handlePrintKOT}
              className="flex-1 md:flex-initial h-12 md:h-14 rounded-xl bg-emerald-700 hover:bg-emerald-600 active:scale-95 text-stone-100 font-black text-[10px] uppercase tracking-widest transition-all flex flex-col justify-center items-center gap-1 shadow-md"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.821V21h10.56v-7.179M9 3.75h6M19.5 8.25h-15A2.25 2.25 0 0 0 2.25 10.5v6.75a2.25 2.25 0 0 0 2.25 2.25h15a2.25 2.25 0 0 0 2.25-2.25V10.5a2.25 2.25 0 0 0-2.25-2.25Z" />
              </svg>
              KOT
            </button>
            
            <button
              onClick={handlePrintGuest}
              className="flex-1 md:flex-initial h-12 md:h-14 rounded-xl bg-stone-700 hover:bg-stone-600 active:scale-95 text-stone-100 font-black text-[10px] uppercase tracking-widest transition-all flex flex-col justify-center items-center gap-1 shadow-md"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0 1 10.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0 .229 2.523a1.125 1.125 0 0 1-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0 0 21 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 0 0-1.913-.247M6.34 18H5.25A2.25 2.25 0 0 1 3 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 0 1 1.913-.247m10.5 0a48.536 48.536 0 0 0-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5Zm-7.5 0h.008v.008H10.5V10.5Zm-3 0h.008v.008H7.5V10.5Z" />
              </svg>
              {t("GUEST")}
            </button>

            <button
              onClick={handleEditOrder}
              className="flex-1 md:flex-initial h-12 md:h-14 rounded-xl bg-[#49293e] hover:bg-[#5c3450] active:scale-95 text-stone-100 font-black text-[10px] uppercase tracking-widest transition-all flex flex-col justify-center items-center gap-1 shadow-md"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" />
              </svg>
              {t("EDIT")}
            </button>

            <button
              onClick={handleSettleOrder}
              className="flex-1 md:flex-initial h-12 md:h-14 rounded-xl bg-[#a35c24] hover:bg-[#b8692a] active:scale-95 text-stone-100 font-black text-[10px] uppercase tracking-widest transition-all flex flex-col justify-center items-center gap-1 shadow-md"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5h16.5M4.5 9h15M5.25 13.5h13.5M2.25 18.75V16.5a1.5 1.5 0 0 1 1.5-1.5h15a1.5 1.5 0 0 1 1.5 1.5v2.25" />
              </svg>
              {t("SETTLE")}
            </button>

            <button
              onClick={onClose}
              className="flex-1 md:flex-initial h-12 md:h-14 rounded-xl bg-stone-800 hover:bg-stone-700 active:scale-95 text-stone-300 hover:text-white font-black text-[10px] uppercase tracking-widest transition-all flex flex-col justify-center items-center gap-1 border border-stone-700/50 shadow-md"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
              {t("CLOSE")}
            </button>
          </div>
        </div>
      ) : (
        <div className="py-20 flex flex-col items-center justify-center text-stone-400 bg-stone-900/40">
          <svg className="w-12 h-12 text-stone-600 mb-3 animate-bounce" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
          </svg>
          <p className="text-xs font-bold uppercase tracking-widest">{t("No Order Data Available")}</p>
        </div>
      )}
    </Modal>
  );
};
