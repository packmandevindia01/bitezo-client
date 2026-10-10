import React, { useState, useEffect } from "react";
import Modal from "../../../../../../components/common/Modal";
import { Loader } from "../../../../../../components/common";
import { orderApi } from "../../../../services/orderApi";
import { menuApi, getModifierTypeNameById } from "../../../../services/menuApi";
import { deliveryApi } from "../../../../customer/services/deliveryApi";
import { useToast } from "../../../../../../app/providers/useToast";
import { useAppDispatch, useAppSelector } from "../../../../../../app/hooks";
import { loadRecalledOrder, setDeliveryDetails } from "../../../store/posSlice";
import { formatAmount } from "../../../../../../utils/currency";
import { generateGuestPrintHtml } from "../../../../utils/guestPrintTemplate";
import { generateKotHtml } from "../../../../utils/kotTemplate";
import { executeKotRouting } from "../../../../utils/printerRouting";
import { printHtmlReceipt } from "../../../../services/qzService";
import { printerSettingsApi } from "../../../../services/printerSettingsApi";
import { getVatStatus, getBillingConfig, roundCalc } from "../../../utils/billing";
import { isKotArabicEnabled, isBillArabicEnabled } from "../../../../utils/alternativeHelpers";
import { sortOrderDetailsBySequence } from "../../../utils/orderSort";
import { mapOrderDetailsToCartItems } from "../../../mappers/orderDetailToCartMapper";

import { usePosProducts } from "../../../hooks/usePosProducts";

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

  const [modifierTypes, setModifierTypes] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen && orderId) {
      void loadOrderDetails();
      void fetchModifierTypes();
    } else {
      setOrder(null);
    }
  }, [isOpen, orderId]);

  const fetchModifierTypes = async () => {
    try {
      const data = await menuApi.getModifierTypes();
      setModifierTypes(data || []);
    } catch (e) {
      console.error("Failed to load modifier types:", e);
    }
  };

  const loadOrderDetails = async () => {
    if (!orderId) return;
    setLoading(true);
    try {
      const response = await orderApi.getOrderDetails(orderId);
      if (response && response.isSuccess && response.data) {
        console.log("ORDER DETAILS RAW RESPONSE:", JSON.stringify(response.data, null, 2));
        setOrder(response.data);
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
    const rawModifiers = order?.modifiersData || [];
    const seen = new Set<string>();
    return rawModifiers.filter((m: any) => {
      const key = `${m.mapId}-${m.modifierId}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [order?.modifiersData]);

  const handlePrintKOT = async () => {
    if (!orderId || !order) return;
    let mappedItems: any[] = [];
    let basePrintOptions: any = null;
    try {
      showToast(`Preparing KOT for Order #${orderId}...`, "info");
      
      const master = order.masterData || order;
      const details = sortOrderDetailsBySequence(order.detailsData || order.details || []);
      
      const orderTypeMap: Record<number, string> = {
        1: "DineIn", 2: "TakeOut", 3: "DriveThru",
        4: "Delivery", 5: "Providers", 6: "Coming"
      };
      const orderTypeName = master.orderType || orderTypeMap[master.orderTypeId] || master.orderTypeName || order?.orderTypeName || "DineIn";
      
      mappedItems = details.map((d: any) => {
        const itemMods = modifiersData.filter((m: any) => m.mapId === d.mapId);
        const extras = itemMods.filter((m: any) => (m.status || "").toLowerCase() === "extras" || ((m.status || "") === "" && (m.price || 0) > 0)).map((m: any) => ({
          id: m.modifierId, name: m.modifierName, price: m.price || 0, qty: m.qty || 1
        }));
        const modifiers = itemMods.filter((m: any) => (m.status || "").toLowerCase() === "modifier" || ((m.status || "") === "" && (m.price || 0) <= 0)).map((m: any) => {
          const typeName = m.typeName || m.modifierTypeName || modifierTypes.find((t: any) => t.typeId === m.typeId || t.id === m.typeId)?.name || modifierTypes.find((t: any) => t.typeId === m.typeId || t.id === m.typeId)?.typeName || getModifierTypeNameById(m.typeId) || "";
          return {
            id: m.modifierId,
            name: m.modifierName,
            qty: m.qty || 1,
            typeId: m.typeId,
            typeName,
            arabicName: m.arabicName || ""
          };
        });
        const messages = itemMods.filter((m: any) => (m.status || "").toLowerCase() === "message").map((m: any) => ({
          id: m.modifierId, name: m.modifierName || m.name || ""
        }));
        
        let lineBase = (d.price || 0) * (d.qty || 1);
        extras.forEach((ex: any) => lineBase += ex.price * ex.qty);
        
        const vatAmt = d.vatAmount || 0;
        const inclusiveLineTotal = d.netAmount || (lineBase + vatAmt);
        
        let pId = d.productId || d.itemId || 0;
        let matchedProduct = pId ? products.find((p: any) => p.id === pId) : null;
        if (!matchedProduct && d.productName) {
          matchedProduct = products.find((p: any) => p.name === d.productName || p.name === d.ProductName);
          if (matchedProduct) pId = matchedProduct.id;
        }
        
        return {
          productId: pId,
          categoryId: d.categoryId || matchedProduct?.categoryId || 0,
          quantity: d.qty || 1,
          price: d.price || 0,
          variantArabic: d.variantArabic || d.altArabic || d.VariantArabic || d.AltArabic,
          product: { 
            name: d.productName || d.ProductName || matchedProduct?.name || `Product #${pId}`, 
            price: d.price || 0,
            categoryId: d.categoryId || matchedProduct?.categoryId || 0,
            arabicName: d.arabicName || d.ArabicName || matchedProduct?.arabicName
          },
          extras,
          modifiers,
          messages,
          lineTotal: inclusiveLineTotal,
          vatAmount: vatAmt,
          netAmount: inclusiveLineTotal
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
        forcedPrint: true
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
    if (!orderId || !order) return;
    
    try {
      showToast(`Preparing Guest Receipt for Order #${orderId}...`, "success");
      
      const master = order.masterData || order;
      const details = sortOrderDetailsBySequence(order.detailsData || order.details || []);
      
      const orderTypeMap: Record<number, string> = {
        1: "DineIn", 2: "TakeOut", 3: "DriveThru",
        4: "Delivery", 5: "Providers", 6: "Coming"
      };
      const orderTypeName = master.orderType || orderTypeMap[master.orderTypeId] || master.orderTypeName || order?.orderTypeName || "DineIn";

      const timeFromDetails = (() => {
        if (!orderDetailsStr) return "";
        const m = orderDetailsStr.match(/(\d{1,2}:\d{2}:\d{2}\s*(?:AM|PM))/i);
        return m ? m[1] : "";
      })();
      
      const isValidDateStr = (s: any) => {
        if (!s || typeof s !== 'string') return false;
        if (s.startsWith('0001')) return false;
        return true;
      };

      const candidateDates = [
        master.voucherDate,
        master.orderDate,
        master.createdAt,
        timeFromDetails
      ];

      let resolvedDateStr = candidateDates.find(isValidDateStr);
      let date: string | undefined;
      let time: string | undefined;
      
      if (resolvedDateStr) {
        try {
          const d = new Date(resolvedDateStr);
          if (!isNaN(d.getTime()) && d.getFullYear() >= 2000) {
            date = d.toLocaleDateString('en-GB');
            time = d.toLocaleTimeString('en-US', { hour12: true, hour: '2-digit', minute: '2-digit' });
          } else if (/am|pm/i.test(resolvedDateStr)) {
            const today = new Date();
            date = today.toLocaleDateString('en-GB');
            time = resolvedDateStr;
          }
        } catch { /* ignore */ }
      }

      if (!date) {
        const now = new Date();
        date = now.toLocaleDateString('en-GB');
        time = now.toLocaleTimeString('en-US', { hour12: true, hour: '2-digit', minute: '2-digit' });
      }

      const netAmount = Number(master.netAmount ?? order.netAmount ?? 0);
      const enableVat = getVatStatus();

      let detailsVatSum = 0;
      let totalVatBase = 0;
      const preMapped = details.map((d: any) => {
        const itemMods = modifiersData.filter((m: any) => m.mapId === d.mapId);
        const extras = itemMods.filter((m: any) => (m.status || "").toLowerCase() === "extras" || ((m.status || "") === "" && (m.price || 0) > 0)).map((m: any) => ({
          id: m.modifierId, name: m.modifierName, price: m.price || 0, qty: m.qty || 1, typeId: m.typeId
        }));
        const modifiers = itemMods.filter((m: any) => (m.status || "").toLowerCase() === "modifier" || ((m.status || "") === "" && (m.price || 0) <= 0)).map((m: any) => {
          const typeName = m.typeName || m.modifierTypeName || modifierTypes.find((t: any) => t.typeId === m.typeId || t.id === m.typeId)?.name || modifierTypes.find((t: any) => t.typeId === m.typeId || t.id === m.typeId)?.typeName || getModifierTypeNameById(m.typeId) || "";
          return {
            id: m.modifierId,
            name: m.modifierName,
            qty: m.qty || 1,
            typeId: m.typeId,
            typeName,
            arabicName: m.arabicName || ""
          };
        });
        const messages = itemMods.filter((m: any) => (m.status || "").toLowerCase() === "message").map((m: any) => ({
          id: m.modifierId, name: m.modifierName || m.name || ""
        }));
        
        const qty = d.qty ?? d.Qty ?? 1;
        const amount = d.amount ?? d.netAmount ?? d.NetAmount ?? d.Amount ?? 0;
        const price = d.price ?? d.Price ?? (qty > 0 ? amount / qty : 0);

        let lineBase = price * qty;
        extras.forEach((ex: any) => lineBase += ex.price * ex.qty);

        const itemLineNetAmount = amount || lineBase;
        const itemVat = Number(d.vatAmount ?? d.VatAmount ?? 0);
        detailsVatSum += itemVat;

        const itemVatBase = itemVat > 0 ? (itemLineNetAmount - itemVat) : itemLineNetAmount;
        totalVatBase += itemVatBase;
        
        return {
          ...d,
          qty,
          price,
          extras,
          modifiers,
          messages,
          lineBase,
          itemLineNetAmount,
          itemVat,
          itemVatBase
        };
      });

      let resolvedVatAmount = Number(master.vatAmount ?? master.VatAmount ?? master.vatAmt ?? master.taxAmount ?? 0);
      if (resolvedVatAmount <= 0 && detailsVatSum > 0) {
        resolvedVatAmount = detailsVatSum;
      }

      // If VAT is active in system settings and prices are inclusive but vatAmount was 0
      if (enableVat && resolvedVatAmount <= 0 && netAmount > 0) {
        const billingConfig = getBillingConfig(orderTypeName);
        const vatRate = billingConfig.vatRate > 0 ? billingConfig.vatRate : 0.10;
        resolvedVatAmount = roundCalc(netAmount - (netAmount / (1 + vatRate)));
      }

      let resolvedDiscount = Number(master.discAmount ?? master.DiscAmount ?? master.discount ?? 0);
      if (resolvedDiscount <= 0) {
        const lineDiscounts = details.reduce((acc: number, d: any) => acc + Number(d.discAmount ?? d.DiscAmount ?? 0), 0);
        if (lineDiscounts > 0) resolvedDiscount = roundCalc(lineDiscounts);
      }

      const serviceCharge = Number(master.serviceCharge || 0);
      const levy = Number(master.levyAmt || master.levy || 0);
      const deliveryCharge = Number(master.deliveryCharge || 0);

      const netTaxableBase = roundCalc(netAmount - resolvedVatAmount - serviceCharge - levy - deliveryCharge);
      let resolvedSubTotal = Number(master.vatExclAmount ?? master.VatExclAmount ?? master.subTotal ?? master.SubTotal ?? 0);
      if (resolvedSubTotal <= 0 || (enableVat && Math.abs(resolvedSubTotal - netAmount) < 0.001 && resolvedVatAmount > 0)) {
        resolvedSubTotal = roundCalc(netTaxableBase + resolvedDiscount);
      }

      const mappedItems = preMapped.map((d: any) => {
        const pId = d.productId || d.itemId || 0;
        let itemVat = d.itemVat;
        if (enableVat && itemVat <= 0 && resolvedVatAmount > 0 && netAmount > 0) {
          const ratio = (d.itemLineNetAmount || 0) / netAmount;
          itemVat = Number((resolvedVatAmount * ratio).toFixed(3));
        }
        const itemLineNet = d.itemLineNetAmount || d.lineBase || ((d.price || 0) * (d.qty || 1));
        const itemBase = d.baseAmount !== undefined ? d.baseAmount : (d.price || 0) * (d.qty || 1);
        return {
          productId: pId,
          quantity: d.qty || 1,
          price: d.price || 0,
          baseAmount: itemBase,
          variantArabic: d.variantArabic || d.altArabic || d.VariantArabic || d.AltArabic,
          product: { 
            name: d.productName || d.ProductName || `Product #${pId}`, 
            price: d.price || 0,
            arabicName: d.arabicName || d.ArabicName
          },
          extras: d.extras,
          modifiers: d.modifiers,
          messages: d.messages || [],
          itemDiscount: d.discAmount || 0,
          lineTotal: itemLineNet,
          vatAmount: itemVat
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
      const isDeliveryOrder = (orderTypeName || "").toLowerCase().includes("delivery");
      let resolvedCallBack = isDeliveryOrder
        ? (master.callBack ||
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
          "")
        : "";

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
          console.warn("[PosRecallDetailsModal] Could not fetch delivery address fallback for Guest:", fetchAddrErr);
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
          console.warn("[PosRecallDetailsModal] Failed to resolve driver name by id for Guest:", err);
        }
      }

      const printData = {
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
        date, time,
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
        serviceCharge: master.serviceCharge || 0,
        levy: master.levyAmt || master.levy || 0,
        vatAmount: resolvedVatAmount,
        netAmount: netAmount,
        deliveryCharge: master.deliveryCharge || 0,
        enableVat,
        billArabic: isBillArabicEnabled() || mappedItems.some((it: any) => 
          Boolean(it.product?.arabicName || it.variantArabic || (it as any).altArabic)
        )
      };

      let htmlContent = "";
      try {
        htmlContent = await generateGuestPrintHtml(mappedItems as any, printData);
        
        let billPrinter: string | undefined;
        try {
          const settingsRes = await printerSettingsApi.getGeneral();
          const gen = settingsRes?.data;
          billPrinter = gen?.androidBillPrinter || gen?.billPrinter || gen?.androidKOTPrinter || gen?.kotPrinter;
        } catch (err) {
          console.warn("[PosRecallDetailsModal] Could not fetch general printer settings:", err);
        }

        if (!billPrinter || billPrinter === "No Printer") {
          billPrinter = localStorage.getItem('cachedBillPrinter') || 
                        localStorage.getItem('cachedBillPrinterIp') ||
                        localStorage.getItem('cachedKotPrinter') || 
                        localStorage.getItem('cachedKotPrinterIp') || 
                        localStorage.getItem('printerIpAddress') || 
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

  const handleEditOrder = () => {
    if (!order) return;
    
    try {
      const master = order.masterData || order;
      const details = sortOrderDetailsBySequence(order.detailsData || order.details || []);

      const priceView = (() => {
        try {
          const saved = localStorage.getItem('posConfigs');
          const full = saved ? JSON.parse(saved) : {};
          return full?.configs?.priceView === 'Inclusive' ? 'Inclusive' : 'Exclusive';
        } catch { return 'Exclusive'; }
      })();
      const isIncl = priceView === 'Inclusive';

      const orderTypeName = master.orderType || master.orderTypeName || "DineIn";
      const orderTypeId = master.orderTypeId || orderTypeNameMap[orderTypeName] || 1;

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
      const netAmount = Number(master.netAmount ?? order?.netAmount ?? 0);
      const masterDiscPer = Number(master.discPer || 0);

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

      let resolvedDiscount = Number(master.discAmount ?? master.DiscAmount ?? master.discount ?? 0);
      if (resolvedDiscount <= 0 && lineDiscountsSum > 0) {
        resolvedDiscount = roundCalc(lineDiscountsSum);
      }

      const hasLineItemDiscounts = lineDiscountsSum > 0;
      const isBillLevelDiscount =
        Boolean(master.complimentaryStatus || master.ComplimentaryStatus) ||
        masterDiscPer > 0 ||
        (!hasLineItemDiscounts && resolvedDiscount > 0);

      const resolvedBillDiscType: 'percentage' | 'amount' =
        (master.complimentaryStatus || master.ComplimentaryStatus || (masterDiscPer === 100) || masterDiscPer > 0)
          ? 'percentage'
          : 'amount';
      let resolvedBillDiscVal = (master.complimentaryStatus || master.ComplimentaryStatus || (masterDiscPer === 100))
        ? 100
        : masterDiscPer > 0
        ? masterDiscPer
        : isBillLevelDiscount
        ? resolvedDiscount
        : 0;

      if (isBillLevelDiscount && resolvedBillDiscType === 'amount' && isIncl && resolvedBillDiscVal > 0) {
        const vatRate = billingConfig.vatRate > 0 ? billingConfig.vatRate : 0.10;
        resolvedBillDiscVal = roundCalc(resolvedBillDiscVal * (1 + vatRate), 4);
      }

      const mappedCartItems = mapOrderDetailsToCartItems(details, modifiersData, {
        products,
        productCache,
        priceView,
        masterDiscPer,
        isOrderBillDiscount: isBillLevelDiscount,
      });

      const serviceCharge = Number(master.serviceCharge || 0);
      const levy = Number(master.levyAmt || master.levy || 0);
      const deliveryCharge = Number(master.deliveryCharge || 0);
      const netTaxableBase = roundCalc(netAmount - resolvedVatAmount - serviceCharge - levy - deliveryCharge);
      let resolvedSubTotal = Number(master.vatExclAmount ?? master.VatExclAmount ?? master.subTotal ?? master.SubTotal ?? 0);
      if (resolvedSubTotal <= 0 || (enableVat && Math.abs(resolvedSubTotal - netAmount) < 0.001 && resolvedVatAmount > 0)) {
        resolvedSubTotal = roundCalc(netTaxableBase + resolvedDiscount);
      }

      dispatch(loadRecalledOrder({
        editingOrderId: orderId,
        editingSaleId: saleId,
        isSettledEdit: saleId !== null,
        cartItems: mappedCartItems,
        orderTypeId: orderTypeId,
        orderTypeName: orderTypeName,
        customerId: master.customerId || 1,
        addressId: master.addressId || 0,
        billDiscountValue: resolvedBillDiscVal,
        billDiscountType: resolvedBillDiscType,
        sectionId: master.sectionId || 0,
        tableId: master.tableId || 0,
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
        authoritativeSubtotal: resolvedSubTotal,
        authoritativeDiscount: resolvedDiscount,
        authoritativeTax: resolvedVatAmount,
        authoritativeNetAmount: netAmount,
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
      const master = order.masterData || order;
      const details = sortOrderDetailsBySequence(order.detailsData || order.details || []);

      const priceView = (() => {
        try {
          const saved = localStorage.getItem('posConfigs');
          const full = saved ? JSON.parse(saved) : {};
          return full?.configs?.priceView === 'Inclusive' ? 'Inclusive' : 'Exclusive';
        } catch { return 'Exclusive'; }
      })();
      const isIncl = priceView === 'Inclusive';

      const orderTypeName = master.orderType || master.orderTypeName || "DineIn";
      const orderTypeId = master.orderTypeId || orderTypeNameMap[orderTypeName] || 1;

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
      const netAmount = Number(master.netAmount ?? order?.netAmount ?? 0);
      const masterDiscPer = Number(master.discPer || 0);

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

      let resolvedDiscount = Number(master.discAmount ?? master.DiscAmount ?? master.discount ?? 0);
      if (resolvedDiscount <= 0 && lineDiscountsSum > 0) {
        resolvedDiscount = roundCalc(lineDiscountsSum);
      }

      const hasLineItemDiscounts = lineDiscountsSum > 0;
      const isBillLevelDiscount =
        Boolean(master.complimentaryStatus || master.ComplimentaryStatus) ||
        masterDiscPer > 0 ||
        (!hasLineItemDiscounts && resolvedDiscount > 0);

      const resolvedBillDiscType: 'percentage' | 'amount' =
        (master.complimentaryStatus || master.ComplimentaryStatus || (masterDiscPer === 100) || masterDiscPer > 0)
          ? 'percentage'
          : 'amount';
      let resolvedBillDiscVal = (master.complimentaryStatus || master.ComplimentaryStatus || (masterDiscPer === 100))
        ? 100
        : masterDiscPer > 0
        ? masterDiscPer
        : isBillLevelDiscount
        ? resolvedDiscount
        : 0;

      if (isBillLevelDiscount && resolvedBillDiscType === 'amount' && isIncl && resolvedBillDiscVal > 0) {
        const vatRate = billingConfig.vatRate > 0 ? billingConfig.vatRate : 0.10;
        resolvedBillDiscVal = roundCalc(resolvedBillDiscVal * (1 + vatRate), 4);
      }

      const mappedCartItems = mapOrderDetailsToCartItems(details, modifiersData, {
        products,
        productCache,
        priceView,
        masterDiscPer,
        isOrderBillDiscount: isBillLevelDiscount,
      });

      const serviceCharge = Number(master.serviceCharge || 0);
      const levy = Number(master.levyAmt || master.levy || 0);
      const deliveryCharge = Number(master.deliveryCharge || 0);
      const netTaxableBase = roundCalc(netAmount - resolvedVatAmount - serviceCharge - levy - deliveryCharge);
      let resolvedSubTotal = Number(master.vatExclAmount ?? master.VatExclAmount ?? master.subTotal ?? master.SubTotal ?? 0);
      if (resolvedSubTotal <= 0 || (enableVat && Math.abs(resolvedSubTotal - netAmount) < 0.001 && resolvedVatAmount > 0)) {
        resolvedSubTotal = roundCalc(netTaxableBase + resolvedDiscount);
      }

      dispatch(loadRecalledOrder({
        editingOrderId: orderId,
        editingSaleId: saleId,
        isSettledEdit: saleId !== null,
        cartItems: mappedCartItems,
        orderTypeId: orderTypeId,
        orderTypeName: orderTypeName,
        customerId: master.customerId || 1,
        addressId: master.addressId || 0,
        billDiscountValue: resolvedBillDiscVal,
        billDiscountType: resolvedBillDiscType,
        sectionId: master.sectionId || 0,
        tableId: master.tableId || 0,
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
        authoritativeSubtotal: resolvedSubTotal,
        authoritativeDiscount: resolvedDiscount,
        authoritativeTax: resolvedVatAmount,
        authoritativeNetAmount: netAmount,
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

      onSettleSuccess?.(master.netAmount || 0);
      onClose();
    } catch (e) {
      console.error(e);
      showToast("Failed to load order for settlement", "error");
    }
  };

  if (!isOpen) return null;

  const master = order?.masterData || order || {};
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
  const rawEmpName = master.employeeName ?? order?.employeeName ?? fallbackDetails?.employeeName;
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
  const orderTypeName = master.orderType || orderTypeMap[master.orderTypeId] || master.orderTypeName || order?.orderTypeName || "DineIn";
  
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
  const netAmount = master.netAmount ?? order?.netAmount ?? 0;
  const enableVat = getVatStatus();

  let detailsVatSum = 0;
  let lineDiscountsSum = 0;
  details.forEach((d: any) => {
    detailsVatSum += Number(d.vatAmount ?? d.VatAmount ?? 0);
    lineDiscountsSum += Number(d.discAmount ?? d.DiscAmount ?? 0);
  });

  let displayVatAmount = Number(master.vatAmount ?? master.VatAmount ?? master.vatAmt ?? master.taxAmount ?? 0);
  if (displayVatAmount <= 0 && detailsVatSum > 0) {
    displayVatAmount = detailsVatSum;
  }
  if (enableVat && displayVatAmount <= 0 && netAmount > 0) {
    const billingConfig = getBillingConfig(orderTypeName);
    const vatRate = billingConfig.vatRate > 0 ? billingConfig.vatRate : 0.10;
    displayVatAmount = roundCalc(netAmount - (netAmount / (1 + vatRate)));
  }

  let displayDiscount = Number(master.discAmount ?? master.DiscAmount ?? master.discount ?? 0);
  if (displayDiscount <= 0 && lineDiscountsSum > 0) {
    displayDiscount = roundCalc(lineDiscountsSum);
  }

  const displayServiceCharge = Number(master.serviceCharge || 0);
  const displayLevy = Number(master.levyAmt || master.levy || 0);
  const displayDeliveryCharge = Number(master.deliveryCharge || 0);

  const netTaxableBase = roundCalc(netAmount - displayVatAmount - displayServiceCharge - displayLevy - displayDeliveryCharge);
  let displaySubTotal = Number(master.vatExclAmount ?? master.VatExclAmount ?? master.subTotal ?? master.SubTotal ?? 0);
  if (displaySubTotal <= 0 || (enableVat && Math.abs(displaySubTotal - netAmount) < 0.001 && displayVatAmount > 0)) {
    displaySubTotal = roundCalc(netTaxableBase + displayDiscount);
  }

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
      className="bg-[#262626] border border-stone-800 shadow-2xl rounded-2xl overflow-hidden max-w-[500px]"
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
          <div className="flex-1 p-5 bg-[#faf8f5] text-stone-900 font-mono text-xs flex flex-col justify-between select-text shadow-inner">
            <div>
              {/* Ticket Header */}
              <div className="text-center font-bold border-b border-dashed border-stone-400 pb-3 mb-3">
                <div className="text-sm font-black tracking-wide uppercase">BITEZO POS</div>
                <div className="text-[10px] text-stone-500 font-medium">TERMINAL TICKET</div>
              </div>

              {/* Order Meta Info Grid */}
              <div className="grid grid-cols-2 gap-y-1 text-[11px] border-b border-dashed border-stone-400 pb-3 mb-3">
                <div>
                  <span className="text-stone-500">Order No: </span>
                  <span className="font-bold">{orderNo}</span>
                </div>
                <div className="text-right">
                  <span className="text-stone-500">Ticket: </span>
                  <span className="font-bold">{ticketNo}</span>
                </div>
                
                <div>
                  <span className="text-stone-500">Emp: </span>
                  <span className="font-bold">{employeeName}</span>
                </div>
                <div className="text-right">
                  <span className="text-stone-500">Type: </span>
                  <span className="font-bold text-[#49293e]">{orderTypeName}</span>
                </div>

                <div>
                  <span className="text-stone-500">Customer: </span>
                  <span className="font-bold">{master.deliveryCustomerName || master.vehicleCustomerName || master.customerName || "CASH CUSTOMER"}</span>
                </div>
                {orderTypeName.toLowerCase().includes("dine") && master.tableNo && (
                  <div className="text-right">
                    <span className="text-stone-500">Table: </span>
                    <span className="font-bold">
                      {master.sectionName ? `${master.sectionName} - ` : ""}{master.tableNo}
                    </span>
                  </div>
                )}

                {master.note && (
                  <div className="col-span-2 mt-1">
                    <span className="text-stone-500">Note: </span>
                    <span className="font-bold italic text-stone-600">"{master.note}"</span>
                  </div>
                )}
                
                {master.vehicleNo && (
                  <div className="col-span-2 mt-1">
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
                <div className="grid grid-cols-[24px_1fr_60px] font-bold text-stone-500 text-[10px] uppercase border-b border-stone-300 pb-1 mb-2">
                  <div>Qty</div>
                  <div className="pl-2">Description</div>
                  <div className="text-right">Amount</div>
                </div>

                <div className="space-y-2.5 overflow-y-auto max-h-[200px] pr-1">
                  {details.map((detail: any, i: number) => {
                    const itemModifiers = modifiersData.filter((m: any) => m.mapId === detail.mapId);
                    return (
                      <div key={i} className="flex flex-col">
                        <div className="grid grid-cols-[24px_1fr_60px] items-start text-[11px] leading-tight">
                          <div className="font-bold text-stone-500">{detail.qty}</div>
                          <div className="pl-2 flex flex-col font-bold text-stone-800">
                            <span>{detail.productName || `Product #${detail.productId}`}{detail.unitName ? ` - ${detail.unitName}` : ""}</span>
                            {detail.price > 0 && (
                              <span className="text-[9px] text-stone-400 font-normal">@ {formatAmount(detail.price)}</span>
                            )}
                          </div>
                          <div className="text-right font-bold text-stone-900">
                            {formatAmount(detail.amount ?? detail.netAmount ?? (detail.price * detail.qty))}
                          </div>
                        </div>
                        
                        {/* Modifiers and Messages display as separate rows */}
                        {itemModifiers.map((mod: any, idx: number) => {
                          const isMessage = (mod.status || "").toLowerCase() === "message";
                          let prefix = "+";
                          
                          if (isMessage) {
                            prefix = "💬";
                          } else if (mod.typeName && mod.typeName.trim() !== "") {
                            prefix = mod.typeName.toUpperCase();
                          } else if (mod.typeId) {
                            const match = modifierTypes.find((t: any) => t.typeId === mod.typeId || t.id === mod.typeId);
                            if (match && match.name) {
                              prefix = match.name.toUpperCase();
                            }
                          }

                          return (
                            <div key={idx} className="grid grid-cols-[24px_1fr_60px] items-start text-[9px] leading-tight mt-0.5">
                              <div></div>
                              <div className={`pl-3 font-medium ${isMessage ? "text-purple-600" : "text-[#f48120]"}`}>
                                {prefix} {!isMessage && mod.qty > 1 ? `${mod.qty} x ` : ""}{mod.modifierName}
                              </div>
                              <div className="text-right font-medium text-[#f48120]">
                                {mod.price > 0 ? formatAmount(mod.price * (mod.qty || 1)) : ""}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Delivery Details Block */}
              {deliveryDetails && (
                <div className="border-t border-dashed border-stone-400 pt-3 mt-3 text-[10px] space-y-0.5 text-stone-600">
                  <div className="font-bold uppercase tracking-wider text-stone-400 mb-1">Delivery Details</div>
                  {deliveryDetails.mobile && <div><span className="font-bold text-stone-500">Mobile: </span>{deliveryDetails.mobile}</div>}
                  {deliveryDetails.callBack && <div><span className="font-bold text-stone-500">Call Back: </span>{deliveryDetails.callBack}</div>}
                  {deliveryDetails.customerName && <div><span className="font-bold text-stone-500">Customer: </span>{deliveryDetails.customerName}</div>}
                  {deliveryDetails.flat && <div><span className="font-bold text-stone-500">Flat No: </span>{deliveryDetails.flat}</div>}
                  {deliveryDetails.building && <div><span className="font-bold text-stone-500">Building: </span>{deliveryDetails.building}</div>}
                  {deliveryDetails.block && <div><span className="font-bold text-stone-500">Block: </span>{deliveryDetails.block}</div>}
                  {deliveryDetails.road && <div><span className="font-bold text-stone-500">Road: </span>{deliveryDetails.road}</div>}
                  {deliveryDetails.area && <div><span className="font-bold text-stone-500">Area: </span>{deliveryDetails.area}</div>}
                  {deliveryDetails.change && <div><span className="font-bold text-stone-500">Keep Change: </span>{deliveryDetails.change}</div>}
                </div>
              )}
            </div>

            {/* Receipt Footer with Sub Total, Discount, Charges, VAT and Grand Total */}
            <div className="border-t border-dashed border-stone-400 pt-3 mt-4 space-y-1 text-[11px]">
              <div className="flex justify-between items-center text-stone-600">
                <span>Sub Total</span>
                <span>{formatAmount(displaySubTotal)}</span>
              </div>
              {displayDiscount > 0 && (
                <div className="flex justify-between items-center text-red-600">
                  <span>Discount</span>
                  <span>-{formatAmount(displayDiscount)}</span>
                </div>
              )}
              {displayServiceCharge > 0 && (
                <div className="flex justify-between items-center text-stone-600">
                  <span>Service Charge</span>
                  <span>{formatAmount(displayServiceCharge)}</span>
                </div>
              )}
              {displayLevy > 0 && (
                <div className="flex justify-between items-center text-stone-600">
                  <span>Levy(5%)</span>
                  <span>{formatAmount(displayLevy)}</span>
                </div>
              )}
              {displayDeliveryCharge > 0 && (
                <div className="flex justify-between items-center text-stone-600">
                  <span>Delivery Charge</span>
                  <span>{formatAmount(displayDeliveryCharge)}</span>
                </div>
              )}
              {displayVatAmount > 0 && (
                <div className="flex justify-between items-center text-stone-600">
                  <span>VAT</span>
                  <span>{formatAmount(displayVatAmount)}</span>
                </div>
              )}
              <div className="flex justify-between items-center text-xs font-bold text-stone-900 uppercase pt-2 border-t border-dashed border-stone-300">
                <span>Grand Total</span>
                <span className="text-base font-black text-[#f48120]">
                  {formatAmount(netAmount)}
                </span>
              </div>
            </div>
          </div>

          {/* RIGHT SIDE: VERTICAL ACTION BUTTONS */}
          <div className="w-full md:w-28 shrink-0 bg-stone-900 border-t md:border-t-0 md:border-l border-stone-800 p-3 flex flex-row md:flex-col gap-2 justify-stretch items-stretch">
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
              GUEST
            </button>

            <button
              onClick={handleEditOrder}
              className="flex-1 md:flex-initial h-12 md:h-14 rounded-xl bg-[#49293e] hover:bg-[#5c3450] active:scale-95 text-stone-100 font-black text-[10px] uppercase tracking-widest transition-all flex flex-col justify-center items-center gap-1 shadow-md"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" />
              </svg>
              EDIT
            </button>

            <button
              onClick={handleSettleOrder}
              className="flex-1 md:flex-initial h-12 md:h-14 rounded-xl bg-[#a35c24] hover:bg-[#b8692a] active:scale-95 text-stone-100 font-black text-[10px] uppercase tracking-widest transition-all flex flex-col justify-center items-center gap-1 shadow-md"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5h16.5M4.5 9h15M5.25 13.5h13.5M2.25 18.75V16.5a1.5 1.5 0 0 1 1.5-1.5h15a1.5 1.5 0 0 1 1.5 1.5v2.25" />
              </svg>
              SETTLE
            </button>

            <button
              onClick={onClose}
              className="flex-1 md:flex-initial h-12 md:h-14 rounded-xl bg-stone-800 hover:bg-stone-700 active:scale-95 text-stone-300 hover:text-white font-black text-[10px] uppercase tracking-widest transition-all flex flex-col justify-center items-center gap-1 border border-stone-700/50 shadow-md"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
              CLOSE
            </button>
          </div>
        </div>
      ) : (
        <div className="py-20 flex flex-col items-center justify-center text-stone-400 bg-stone-900/40">
          <svg className="w-12 h-12 text-stone-600 mb-3 animate-bounce" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
          </svg>
          <p className="text-xs font-bold uppercase tracking-widest">No Order Data Available</p>
        </div>
      )}
    </Modal>
  );
};
