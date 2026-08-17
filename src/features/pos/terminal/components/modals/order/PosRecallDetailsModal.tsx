import React, { useState, useEffect } from "react";
import Modal from "../../../../../../components/common/Modal";
import { Loader } from "../../../../../../components/common";
import { orderApi } from "../../../../services/orderApi";
import { menuApi } from "../../../../services/menuApi";
import { useToast } from "../../../../../../app/providers/useToast";
import { useAppDispatch } from "../../../../../../app/hooks";
import { loadRecalledOrder } from "../../../store/posSlice";
import { formatAmount } from "../../../../../../utils/currency";
import { generateGuestPrintHtml } from "../../../../utils/guestPrintTemplate";
import { generateKotHtml } from "../../../../utils/kotTemplate";
import { executeKotRouting } from "../../../../utils/printerRouting";
import { printHtmlReceipt } from "../../../../services/qzService";
import { printerSettingsApi } from "../../../../services/printerSettingsApi";
import { Capacitor } from "@capacitor/core";

import { usePosProducts } from "../../../hooks/usePosProducts";

interface PosRecallDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: number | null;
  orderDetailsStr?: string; // Fallback string parsed from the recall list (e.g. details text)
  onEditSuccess?: () => void; // Triggered when loading into POS cart to close the parent modals
  onSettleSuccess?: (amount: number) => void; // Triggered when proceeding to settlement
}

export const PosRecallDetailsModal: React.FC<PosRecallDetailsModalProps> = ({
  isOpen,
  onClose,
  orderId,
  orderDetailsStr = "",
  onEditSuccess,
  onSettleSuccess,
}) => {
  const { showToast } = useToast();
  const dispatch = useAppDispatch();
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
    try {
      showToast(`Preparing KOT for Order #${orderId}...`, "info");
      
      const master = order.masterData || order;
      const details = order.detailsData || order.details || [];
      
      const orderTypeMap: Record<number, string> = {
        1: "DineIn", 2: "TakeOut", 3: "DriveThru",
        4: "Delivery", 5: "Providers", 6: "Coming"
      };
      const orderTypeName = master.orderType || orderTypeMap[master.orderTypeId] || master.orderTypeName || order?.orderTypeName || "DineIn";
      
      const mappedItems = details.map((d: any) => {
        const itemMods = modifiersData.filter((m: any) => m.mapId === d.mapId);
        const extras = itemMods.filter((m: any) => (m.status || "").toLowerCase() === "extras" || ((m.status || "") === "" && (m.price || 0) > 0)).map((m: any) => ({
          id: m.modifierId, name: m.modifierName, price: m.price || 0, qty: m.qty || 1
        }));
        const modifiers = itemMods.filter((m: any) => (m.status || "").toLowerCase() === "modifier" || ((m.status || "") === "" && (m.price || 0) <= 0)).map((m: any) => ({
          id: m.modifierId, name: m.modifierName, qty: m.qty || 1
        }));
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
          product: { 
            name: d.productName || d.ProductName || matchedProduct?.name || `Product #${pId}`, 
            price: d.price || 0,
            categoryId: d.categoryId || matchedProduct?.categoryId || 0
          },
          extras,
          modifiers,
          messages,
          lineTotal: inclusiveLineTotal,
          vatAmount: vatAmt,
          netAmount: inclusiveLineTotal
        };
      });

      const basePrintOptions = {
        orderNo: master.orderNo ?? String(orderId),
        ticketNo: master.ticketNo ?? "1",
        waiter: master.employeeName ?? "Waiter",
        counter: "Main",
        section: master.sectionName || "DINE IN",
        table: master.tableNo || "",
        orderType: orderTypeName,
        vehicleNo: master.vehicleNo || "",
        customerName: master.deliveryCustomerName || master.vehicleCustomerName || master.customerName || ""
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
    } catch (err) {
      console.error("Print KOT Error:", err);
      showToast("Printing KOT failed", "error");
    }
  };

  const handlePrintGuest = async () => {
    if (!orderId || !order) return;
    
    try {
      showToast(`Preparing Guest Receipt for Order #${orderId}...`, "success");
      
      const master = order.masterData || order;
      const details = order.detailsData || order.details || [];
      
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
      
      const voucherDateStr = master.voucherDate ?? master.orderDate ?? master.createdAt ?? timeFromDetails;
      let date: string | undefined;
      let time: string | undefined;
      
      if (voucherDateStr) {
        try {
          const d = new Date(voucherDateStr);
          if (!isNaN(d.getTime())) {
            date = d.toLocaleDateString('en-GB');
            time = d.toLocaleTimeString('en-US');
          } else if (/am|pm/i.test(voucherDateStr)) {
            const today = new Date();
            date = today.toLocaleDateString('en-GB');
            time = voucherDateStr;
          }
        } catch { /* ignore */ }
      }

      let totalVatBase = 0;
      const preMapped = details.map((d: any) => {
        const itemLineNetAmount = d.amount ?? d.netAmount ?? ((d.price || 0) * (d.qty || 1));
        const itemVatBase = itemLineNetAmount - (d.vatAmount || 0);
        totalVatBase += itemVatBase;
        
        const itemMods = modifiersData.filter((m: any) => m.mapId === d.mapId);
        const extras = itemMods.filter((m: any) => (m.status || "").toLowerCase() === "extras" || ((m.status || "") === "" && (m.price || 0) > 0)).map((m: any) => ({
          id: m.modifierId, name: m.modifierName, price: m.price || 0, qty: m.qty || 1, typeId: m.typeId
        }));
        const modifiers = itemMods.filter((m: any) => (m.status || "").toLowerCase() === "modifier" || ((m.status || "") === "" && (m.price || 0) <= 0)).map((m: any) => ({
          id: m.modifierId, name: m.modifierName, qty: m.qty || 1, typeId: m.typeId
        }));
        const messages = itemMods.filter((m: any) => (m.status || "").toLowerCase() === "message").map((m: any) => ({
          id: m.modifierId, name: m.modifierName || m.name || ""
        }));
        
        let lineBase = (d.price || 0) * (d.qty || 1);
        extras.forEach((ex: any) => lineBase += ex.price * ex.qty);
        
        return { ...d, itemVatBase, extras, modifiers, messages, lineBase };
      });

      const calculatedSubTotal = master.vatExclAmount || totalVatBase;
      const globalRatio = totalVatBase > 0 ? calculatedSubTotal / totalVatBase : 1;
      let calculatedVatTotal = master.vatAmount || details.reduce((sum: number, d: any) => sum + (d.vatAmount || 0), 0);

      const mappedItems = preMapped.map((d: any) => {
        const trueLineTotal = d.itemVatBase * globalRatio;
        const itemRatio = d.lineBase > 0 ? trueLineTotal / d.lineBase : 1;
        
        const adjustedExtras = d.extras.map((ex: any) => ({
          ...ex,
          price: ex.price * itemRatio
        }));
        
        const adjustedPrice = (d.price || 0) * itemRatio;
        
        return {
          productId: d.productId || d.itemId || 0,
          quantity: d.qty || 1,
          price: adjustedPrice,
          product: { name: d.productName || d.ProductName || `Product #${d.productId || 0}`, price: adjustedPrice },
          extras: adjustedExtras,
          modifiers: d.modifiers,
          messages: d.messages || [],
          lineTotal: trueLineTotal
        };
      });

      // Determine enableVat dynamically based on configs
      const getVatStatus = (): boolean => {
        try {
          const saved = localStorage.getItem('posConfigs');
          const full = saved ? JSON.parse(saved) : {};
          return full?.configs?.VatStatus === true;
        } catch {
          return false;
        }
      };
      const enableVat = getVatStatus();

      const printData = {
        orderNo: master.orderNo ?? String(orderId),
        ticketNo: master.ticketNo ?? "1",
        waiter: master.employeeName ?? "Waiter",
        counter: "Main",
        section: master.sectionName || "DINE IN",
        table: master.tableNo || "",
        orderType: orderTypeName,
        date, time,
        customerName: master.deliveryCustomerName || master.vehicleCustomerName || master.customerName,
        vehicleNo: master.vehicleNo,
        contactNo: master.mobileNo || master.contactNo,
        flatNo: master.flatNo,
        buildingNo: master.buildingNo,
        blockNo: master.blockNo,
        roadNo: master.roadNo,
        area: master.area,
        providerNo: master.providerNo,
        subTotal: calculatedSubTotal,
        serviceCharge: master.serviceCharge || 0,
        levy: master.levyAmt || master.levy || 0,
        vatAmount: calculatedVatTotal,
        netAmount: master.netAmount || 0,
        deliveryCharge: master.deliveryCharge || 0,
        enableVat
      };

      if (Capacitor.isNativePlatform()) {
        const { printEscPosMarkup } = await import("../../../../services/qzService");
        const { generateBillMarkup } = await import("../../../../utils/escPosGenerator");
        const markup = generateBillMarkup({ cartDetails: mappedItems as any, data: printData as any });
        await printEscPosMarkup(markup);
        showToast("Guest receipt sent to printer!", "success");
      } else {
        try {
          const htmlContent = await generateGuestPrintHtml(mappedItems as any, printData);
          const settingsRes = await printerSettingsApi.getGeneral();
          const billPrinter = settingsRes.data?.billPrinter || "No Printer";
          
          await printHtmlReceipt(htmlContent, billPrinter);
          showToast("Guest receipt sent to printer!", "success");
        } catch (err) {
          console.error("Printer error:", err);
          showToast("Failed to connect to printer", "error");
        }
      }
      
    } catch (e) {
      console.error(e);
      showToast("Failed to print receipt", "error");
    }
  };

  const handleEditOrder = () => {
    if (!order) return;
    
    try {
      const master = order.masterData || order;
      const details = order.detailsData || order.details || [];

      const priceView = (() => {
        try {
          const saved = localStorage.getItem('posConfigs');
          const full = saved ? JSON.parse(saved) : {};
          return full?.configs?.priceView === 'Inclusive' ? 'Inclusive' : 'Exclusive';
        } catch { return 'Exclusive'; }
      })();
      const isIncl = priceView === 'Inclusive';

      const mappedCartItems = details.map((detail: any, idx: number) => {
        const itemModifiers = modifiersData.filter((m: any) => m.mapId === detail.mapId);
        
        const extras = itemModifiers.filter((m: any) => (m.status || "").toLowerCase() === "extras" || ((m.status || "") === "" && (m.price || 0) > 0)).map((m: any) => ({
          id: m.modifierId,
          name: m.modifierName,
          price: m.price || 0,
          qty: m.qty || 1,
          typeId: m.typeId
        }));

        const modifiers = itemModifiers.filter((m: any) => (m.status || "").toLowerCase() === "modifier" || ((m.status || "") === "" && (m.price || 0) <= 0)).map((m: any) => ({
          id: m.modifierId,
          name: m.modifierName,
          qty: m.qty || 1,
          typeId: m.typeId,
          typeName: m.typeName
        }));

        const messages = itemModifiers.filter((m: any) => (m.status || "").toLowerCase() === "message").map((m: any) => ({
          id: m.modifierId,
          name: m.modifierName || m.name || ""
        }));

        let pId = detail.productId ?? detail.ProductId ?? detail.itemId ?? detail.ItemId ?? detail.product?.id ?? detail.Product?.id;
        
        let matchedProduct: any = null;
        if (pId) {
          matchedProduct = products.find((p: any) => p.id === pId);
        }
        if (!matchedProduct && detail.productName) {
          matchedProduct = products.find((p: any) => p.name === detail.productName || p.name === detail.ProductName);
          if (matchedProduct) pId = matchedProduct.id;
        }
        const realProduct = matchedProduct || {};

        if (!pId) {
          console.error("RAW API DETAIL MISSING ID:", JSON.stringify(detail, null, 2));
        }

        let itemIsIncl = isIncl;
        if (detail.netAmount !== undefined && detail.price !== undefined) {
          const lineBase = (detail.price || 0) * (detail.qty || 1);
          const discAmt = detail.discAmount || 0;
          const vatAmt = detail.vatAmount || 0;
          const netAmt = detail.netAmount;
          
          if (Math.abs(netAmt - (lineBase - discAmt)) < 0.01) {
            itemIsIncl = true;
          } else if (Math.abs(netAmt - ((lineBase - discAmt) + vatAmt)) < 0.01) {
            itemIsIncl = false;
          } else if (realProduct.isIncl !== undefined && realProduct.isIncl !== null) {
            itemIsIncl = Boolean(realProduct.isIncl);
          }
        } else if (realProduct.isIncl !== undefined && realProduct.isIncl !== null) {
          itemIsIncl = Boolean(realProduct.isIncl);
        }

        let calculatedVatValue: number | undefined = undefined;
        if (detail.vatAmount !== undefined && detail.netAmount !== undefined && detail.netAmount > 0) {
          const vatBase = detail.netAmount - detail.vatAmount;
          if (vatBase > 0) {
            calculatedVatValue = Math.round((detail.vatAmount / vatBase) * 100);
          }
        }

        return {
          uniqueId: `${pId}-variant-${Date.now()}-${idx}`,
          productId: pId,
          quantity: detail.qty || 1,
          price: detail.price || 0,
          isIncl: itemIsIncl,
          discountValue: detail.discAmount || 0,
          discountType: detail.discPer ? 'percentage' : 'amount',
          extras,
          modifiers,
          messages,
          isExisting: true,
          mapId: detail.mapId,
          originalQty: detail.qty || 1,
          product: {
            id: pId,
            name: detail.productName || detail.ProductName || realProduct.name || `Product #${pId}`,
            price: detail.price || realProduct.price || 0,
            categoryId: realProduct.categoryId || 1,
            unitId: detail.unitId || realProduct.unitId || 1,
            vatValue: detail.vatValue ?? calculatedVatValue ?? realProduct.vatValue ?? undefined,
            sVatId: detail.vatId ?? realProduct.sVatId ?? undefined,
            arabicName: realProduct.arabicName
          }
        };
      });

      const orderTypeNameMap: Record<string, number> = {
        "DineIn": 1, "TakeOut": 2, "DriveThru": 3,
        "Delivery": 4, "Providers": 5, "Coming": 6
      };

      const orderTypeName = master.orderType || master.orderTypeName || "DineIn";
      const orderTypeId = master.orderTypeId || orderTypeNameMap[orderTypeName] || 1;

      const rawVoucher = master.voucherNo ? String(master.voucherNo).replace(/\D/g, '') : '';
      const parsedVoucher = rawVoucher ? parseInt(rawVoucher, 10) : NaN;
      const saleId = !isNaN(parsedVoucher) ? parsedVoucher : null;

      dispatch(loadRecalledOrder({
        editingOrderId: orderId,
        editingSaleId: saleId,
        isSettledEdit: saleId !== null,
        cartItems: mappedCartItems,
        orderTypeId: orderTypeId,
        orderTypeName: orderTypeName,
        customerId: master.customerId || 1,
        addressId: master.addressId || 0,
        billDiscountValue: master.discAmount || 0,
        billDiscountType: master.discPer ? 'percentage' : 'amount',
        sectionId: master.sectionId || 0,
        tableId: master.tableId || 0,
        deliveryCharge: master.deliveryCharge !== undefined ? Number(master.deliveryCharge) : undefined,
        contactNo: master.mobileNo || master.contactNo,
        note: master.note,
        change: master.change,
        isComing: master.isComing,
        comingTime: master.comingTime,
        vehicleCustomerName: master.vehicleCustomerName,
        vehicleNo: master.vehicleNo
      }));

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
      const details = order.detailsData || order.details || [];

      const priceView = (() => {
        try {
          const saved = localStorage.getItem('posConfigs');
          const full = saved ? JSON.parse(saved) : {};
          return full?.configs?.priceView === 'Inclusive' ? 'Inclusive' : 'Exclusive';
        } catch { return 'Exclusive'; }
      })();
      const isIncl = priceView === 'Inclusive';

      const mappedCartItems = details.map((detail: any, idx: number) => {
        const itemModifiers = modifiersData.filter((m: any) => m.mapId === detail.mapId);
        
        const extras = itemModifiers.filter((m: any) => (m.price || 0) > 0).map((m: any) => ({
          id: m.modifierId,
          name: m.modifierName,
          price: m.price || 0,
          qty: m.qty || 1,
          typeId: m.typeId
        }));

        const modifiers = itemModifiers.filter((m: any) => (m.price || 0) <= 0).map((m: any) => ({
          id: m.modifierId,
          name: m.modifierName,
          qty: m.qty || 1,
          typeId: m.typeId,
          typeName: m.typeName
        }));

        let pId = detail.productId ?? detail.ProductId ?? detail.itemId ?? detail.ItemId ?? detail.product?.id ?? detail.Product?.id;
        
        let matchedProduct: any = null;
        if (pId) {
          matchedProduct = products.find((p: any) => p.id === pId);
        }
        if (!matchedProduct && detail.productName) {
          matchedProduct = products.find((p: any) => p.name === detail.productName || p.name === detail.ProductName);
          if (matchedProduct) pId = matchedProduct.id;
        }
        const realProduct = matchedProduct || {};

        if (!pId) {
          console.error("RAW API DETAIL MISSING ID:", JSON.stringify(detail, null, 2));
        }

        let itemIsIncl = isIncl;
        if (detail.netAmount !== undefined && detail.price !== undefined) {
          const lineBase = (detail.price || 0) * (detail.qty || 1);
          const discAmt = detail.discAmount || 0;
          const vatAmt = detail.vatAmount || 0;
          const netAmt = detail.netAmount;
          
          if (Math.abs(netAmt - (lineBase - discAmt)) < 0.01) {
            itemIsIncl = true;
          } else if (Math.abs(netAmt - ((lineBase - discAmt) + vatAmt)) < 0.01) {
            itemIsIncl = false;
          } else if (realProduct.isIncl !== undefined && realProduct.isIncl !== null) {
            itemIsIncl = Boolean(realProduct.isIncl);
          }
        } else if (realProduct.isIncl !== undefined && realProduct.isIncl !== null) {
          itemIsIncl = Boolean(realProduct.isIncl);
        }

        let calculatedVatValue: number | undefined = undefined;
        if (detail.vatAmount !== undefined && detail.netAmount !== undefined && detail.netAmount > 0) {
          const vatBase = detail.netAmount - detail.vatAmount;
          if (vatBase > 0) {
            calculatedVatValue = Math.round((detail.vatAmount / vatBase) * 100);
          }
        }

        return {
          uniqueId: `${pId}-variant-${Date.now()}-${idx}`,
          productId: pId,
          quantity: detail.qty || 1,
          price: detail.price || 0,
          isIncl: itemIsIncl,
          discountValue: detail.discAmount || 0,
          discountType: detail.discPer ? 'percentage' : 'amount',
          extras,
          modifiers,
          isExisting: true,
          mapId: detail.mapId,
          originalQty: detail.qty || 1,
          product: {
            id: pId,
            name: detail.productName || detail.ProductName || realProduct.name || `Product #${pId}`,
            price: detail.price || realProduct.price || 0,
            categoryId: realProduct.categoryId || 1,
            unitId: detail.unitId || realProduct.unitId || 1,
            vatValue: detail.vatValue ?? calculatedVatValue ?? realProduct.vatValue ?? undefined,
            sVatId: detail.vatId ?? realProduct.sVatId ?? undefined,
            arabicName: realProduct.arabicName
          }
        };
      });

      const orderTypeNameMap: Record<string, number> = {
        "DineIn": 1, "TakeOut": 2, "DriveThru": 3,
        "Delivery": 4, "Providers": 5, "Coming": 6
      };

      const orderTypeName = master.orderType || master.orderTypeName || "DineIn";
      const orderTypeId = master.orderTypeId || orderTypeNameMap[orderTypeName] || 1;

      const rawVoucher = master.voucherNo ? String(master.voucherNo).replace(/\D/g, '') : '';
      const parsedVoucher = rawVoucher ? parseInt(rawVoucher, 10) : NaN;
      const saleId = !isNaN(parsedVoucher) ? parsedVoucher : null;

      dispatch(loadRecalledOrder({
        editingOrderId: orderId,
        editingSaleId: saleId,
        isSettledEdit: saleId !== null,
        cartItems: mappedCartItems,
        orderTypeId: orderTypeId,
        orderTypeName: orderTypeName,
        customerId: master.customerId || 1,
        addressId: master.addressId || 0,
        billDiscountValue: master.discAmount || 0,
        billDiscountType: master.discPer ? 'percentage' : 'amount',
        sectionId: master.sectionId || 0,
        tableId: master.tableId || 0,
        deliveryCharge: master.deliveryCharge !== undefined ? Number(master.deliveryCharge) : undefined,
        contactNo: master.mobileNo || master.contactNo,
        note: master.note,
        change: master.change,
        isComing: master.isComing,
        comingTime: master.comingTime,
        vehicleCustomerName: master.vehicleCustomerName,
        vehicleNo: master.vehicleNo,
        isSettling: true
      }));

      onSettleSuccess?.(master.netAmount || 0);
      onClose();
    } catch (e) {
      console.error(e);
      showToast("Failed to load order for settlement", "error");
    }
  };

  if (!isOpen) return null;

  const master = order?.masterData || order || {};
  const details = order?.detailsData || order?.details || [];
  
  const orderNo = master.orderNo ?? order?.orderNo ?? orderId ?? "";
  const ticketNo = master.ticketNo ?? order?.ticketNo ?? "1";
  const employeeName = master.employeeName ?? order?.employeeName ?? "Waiter";
  
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

  const hasDelivery = !!master.mobileNo;
  const deliveryDetails = hasDelivery ? {
    mobile: master.mobileNo,
    customerName: master.deliveryCustomerName || master.customerName || "",
    area: master.area || "",
    block: master.blockNo || "",
    road: master.roadNo || "",
    building: master.buildingNo || "",
    flat: master.flatNo || "",
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
                  {deliveryDetails.customerName && <div><span className="font-bold text-stone-500">Customer: </span>{deliveryDetails.customerName}</div>}
                  {deliveryDetails.flat && <div><span className="font-bold text-stone-500">Flat No: </span>{deliveryDetails.flat}</div>}
                  {deliveryDetails.building && <div><span className="font-bold text-stone-500">Building: </span>{deliveryDetails.building}</div>}
                  {deliveryDetails.block && <div><span className="font-bold text-stone-500">Block: </span>{deliveryDetails.block}</div>}
                  {deliveryDetails.road && <div><span className="font-bold text-stone-500">Road: </span>{deliveryDetails.road}</div>}
                  {deliveryDetails.area && <div><span className="font-bold text-stone-500">Area: </span>{deliveryDetails.area}</div>}
                </div>
              )}
            </div>

            {/* Receipt Footer with Delivery Charge, VAT and Grand Total */}
            <div className="border-t border-dashed border-stone-400 pt-3 mt-4 space-y-1 text-[11px]">
              {master.vatExclAmount !== undefined && master.vatExclAmount > 0 && (
                <div className="flex justify-between items-center text-stone-600">
                  <span>Net Value</span>
                  <span>{formatAmount(master.vatExclAmount)}</span>
                </div>
              )}
              {master.deliveryCharge !== undefined && master.deliveryCharge > 0 && (
                <div className="flex justify-between items-center text-stone-600">
                  <span>Delivery Charge</span>
                  <span>{formatAmount(master.deliveryCharge)}</span>
                </div>
              )}
              {master.vatAmount !== undefined && master.vatAmount > 0 && (
                <div className="flex justify-between items-center text-stone-600">
                  <span>VAT</span>
                  <span>{formatAmount(master.vatAmount)}</span>
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
