import { useState, useRef } from 'react';
import { useEvent } from '../../../../hooks/useEvent';
import { salesInvoiceApi } from '../../services/salesInvoiceApi';
import { orderApi } from '../../services/orderApi';
import { settledOrdersApi } from '../../services/settledOrdersApi';
import { getVatStatus } from '../utils/billing';
import { isBillArabicEnabled } from '../../utils/alternativeHelpers';
import { buildSalesInvoicePayload } from '../mappers/invoicePayloadMapper';

interface UsePosCheckoutFlowProps {
  status: any;
  cartDetails: any[];
  activeProvider: { provider: any; orderNo: string } | null;
  editingOrderId: number | null;
  editingSaleId: number | null;
  isCartModified: boolean;
  subtotal: number;
  totalDiscountAmount: number;
  totalServiceCharge: number;
  totalLevy: number;
  totalVat: number;
  total: number;
  deliveryCharge: number;
  tenderOptions: any[];
  decimalPart: number;
  waiterName: string | null;
  
  submitOrder: (params: any, print: boolean) => Promise<any>;
  getDirectSettleOrderPayload: (params: any) => any;
  requestAuthorization: (options: any) => void;
  showToast: (msg: string, type: 'success' | 'error' | 'info' | 'warning') => void;
  handleClearCart: () => void;
  setIsCashModalOpen: (val: boolean) => void;
  setIsMultiPayModalOpen: (val: boolean) => void;
  setSelectedKey: (val: string | null) => void;
  setSelectedProduct: (val: any) => void;
  setAlternatives: (val: any[]) => void;
  setActiveProvider: (val: any) => void;
  setChange: (val: string) => void;
  getRuntimePosConfig: () => Promise<any>;
}

export const usePosCheckoutFlow = ({
  status,
  cartDetails,
  activeProvider,
  editingOrderId,
  editingSaleId,
  isCartModified,
  subtotal,
  totalDiscountAmount,
  totalServiceCharge,
  totalLevy,
  totalVat,
  total,
  deliveryCharge,
  tenderOptions = [],
  decimalPart,
  waiterName,
  submitOrder,
  getDirectSettleOrderPayload,
  requestAuthorization,
  showToast,
  handleClearCart,
  setIsCashModalOpen,
  setIsMultiPayModalOpen,
  setSelectedKey,
  setSelectedProduct,
  setAlternatives,
  setActiveProvider,
  setChange,
  getRuntimePosConfig,
}: UsePosCheckoutFlowProps) => {
  const [settledPrintPayload, setSettledPrintPayload] = useState<{ mappedItems: any[], printData: any } | null>(null);
  const settleShouldPrintRef = useRef<boolean>(true);

  const submitOrderForEmployee = useEvent(async (employeeId: number, shouldPrint: boolean = true) => {
    if (!status) return;
    const orderId = await submitOrder({
      dayId: status.dayId,
      shiftId: status.shiftId,
      userId: status.userId,
      employeeId,
      customerId: (activeProvider?.provider?.postAccountId && activeProvider.provider.postAccountId > 0) ? activeProvider.provider.postAccountId : undefined,
      providerId: activeProvider?.provider?.providerId,
      providerOrderNo: activeProvider?.orderNo,
    }, shouldPrint);
    if (orderId) {
      setSelectedKey(null);
      setSelectedProduct(null);
      setAlternatives([]);
      setActiveProvider(null);
      setIsCashModalOpen(false);
      setIsMultiPayModalOpen(false);
      handleClearCart();
    }
  });

  const finalizeSettlement = useEvent(async (shouldPrint: boolean, payloadToPrint?: any) => {
    const payload = payloadToPrint || settledPrintPayload;
    if (shouldPrint && payload) {
      showToast("Printing receipt...", "info");
      try {
        const { Capacitor } = await import("@capacitor/core");

        const enableVat = getVatStatus();
        payload.printData.enableVat = enableVat;

        if (Capacitor.isNativePlatform()) {
          // ── FAST PATH: Native ESC/POS (no html2canvas, no API call) ──────────
          const { printEscPosMarkup } = await import("../../services/qzService");
          const { generateBillMarkup } = await import("../../utils/escPosGenerator");
          const markup = generateBillMarkup({
            cartDetails: payload.mappedItems,
            data: payload.printData,
          });
          await printEscPosMarkup(markup);
        } else {
          // ── DESKTOP PATH: QZ Tray (unchanged) ───────────────────────────────
          const { printHtmlReceipt } = await import("../../services/qzService");
          const { generateGuestPrintHtml } = await import("../../utils/guestPrintTemplate");
          // Read bill printer from cache (set by PrinterSettingsTab on save)
          const targetPrinter = localStorage.getItem('cachedBillPrinter') || undefined;
          const html = await generateGuestPrintHtml(payload.mappedItems, payload.printData);
          await printHtmlReceipt(html, targetPrinter);
        }

        showToast("Sales saved successfully", "success");
      } catch (printErr: any) {
        console.error("Settled print failed:", printErr);
        alert("PRINTING ERROR: " + (printErr.message || printErr));
        showToast("Order settled, but printing failed", "warning");
      }
    } else {
        showToast("Sales saved successfully", "success");
    }
    handleClearCart();
    setSettledPrintPayload(null);
  });

  const submitSettlementForEmployee = useEvent(async (employeeId: number, payments: { paymodeId: number, amount: number }[]) => {
    if (!status) return;
    
    const orderPayload = getDirectSettleOrderPayload({
      employeeId,
      customerId: (activeProvider?.provider?.postAccountId && activeProvider.provider.postAccountId > 0) ? activeProvider.provider.postAccountId : undefined,
      providerId: activeProvider?.provider?.providerId,
      providerOrderNo: activeProvider?.orderNo,
    });

    const isDelivery = orderPayload.orderTypeId === 4;
    if (isDelivery && (!orderPayload.addressId || Number(orderPayload.addressId) === 0)) {
      showToast("Please select a delivery address before settling.", "warning");
      return;
    }

    const isCombinedOrder = Boolean(
      orderPayload.combinedOrderIds && orderPayload.combinedOrderIds.length > 0
    );
    const isOrderEdited = !editingOrderId ? true : (isCartModified || isCombinedOrder);

    try {
      const resolvedCustomerId = (activeProvider?.provider?.postAccountId && activeProvider.provider.postAccountId > 0)
        ? activeProvider.provider.postAccountId
        : orderPayload.customerId;

      // Ensure each payment has a valid positive paymodeId
      const validPayments = payments.map(p => {
        let pid = Number(p.paymodeId);
        if (!pid || isNaN(pid) || pid <= 0) {
          const cashTender = (tenderOptions || []).find((t: any) => (t.label || "").toLowerCase().includes("cash"));
          pid = cashTender ? Number(cashTender.id) : 1;
        }
        return { ...p, paymodeId: pid };
      });

      // Rule: Block Credit Settlement if Customer ID is 1 (or default Cash Customer)
      const isCreditPayment = validPayments.some(p => {
        const tender = (tenderOptions || []).find((t: any) => String(t.id) === String(p.paymodeId));
        const label = (tender?.label || "").toLowerCase();
        return label.includes("credit") && !label.includes("multi");
      });

      if (isCreditPayment && (!resolvedCustomerId || Number(resolvedCustomerId) === 1)) {
        showToast("Credit payment is not allowed for Cash Customer. Please select a customer first.", "warning");
        return;
      }

      const salesPayload = buildSalesInvoicePayload({
        orderPayload,
        payments: validPayments,
        employeeId,
        dayId: status.dayId,
        shiftId: status.shiftId,
        transDate: status?.transDate || localStorage.getItem("transDate") || new Date().toISOString(),
        editingSaleId,
        isOrderEdited,
        tenderOptions,
        activeProviderPostAccountId: activeProvider?.provider?.postAccountId,
      });

      console.log("========== 🛒 POS SETTLEMENT DETAILS ==========");
      console.log("Employee ID:", employeeId);
      console.log("Resolved Customer ID:", resolvedCustomerId);
      console.log("Order Type ID:", orderPayload.orderTypeId);
      console.log("Payments:", payments);
      console.log("Order Payload:", orderPayload);
      console.log("Full Sales Payload (to API):", salesPayload);
      console.log("===============================================");

      let success = false;
      let newSaleId: number | null = null;
      let invoiceNoStr: string | undefined = undefined;
      if (editingSaleId) {
        success = await salesInvoiceApi.updateSalesInvoice(editingSaleId, salesPayload);
      } else {
        const createRes = await salesInvoiceApi.createSalesInvoice(salesPayload);
        if (typeof createRes === 'number') {
          newSaleId = createRes;
        } else if (createRes && typeof createRes === 'object') {
          newSaleId = createRes.id ?? createRes.saleId ?? null;
          const vNo = createRes.voucherNo ?? createRes.invoiceNo ?? createRes.voucherNumber ?? createRes.saleNo;
          if (vNo) invoiceNoStr = String(vNo);
        }
        success = !!newSaleId;
      }

      if (success) {
        setIsCashModalOpen(false);
        setIsMultiPayModalOpen(false);
        
        const finalSaleId = newSaleId || editingSaleId || 0;
        const now = new Date();
        const paymentNames: Record<number, string> = { 1: "Cash", 2: "Card", 3: "Credit" };
        const orderTypesMap: Record<number, string> = {
          1: "DINE IN", 2: "TAKE OUT", 3: "DRIVE THRU", 4: "DELIVERY", 5: "PROVIDERS", 6: "COMING"
        };
        const mappedOrderType = orderTypesMap[orderPayload.orderTypeId] || "DINE IN";
        


        let orderNoStr = finalSaleId.toString();
        let ticketNoStr = finalSaleId.toString();
        let waiterStr = waiterName || localStorage.getItem("defaultEmployeeName") || localStorage.getItem("employeeName") || "Waiter";
        let sectionStr = orderPayload.sectionId ? String(orderPayload.sectionId) : "DINE IN";
        let tableStr = orderPayload.tableNo ? orderPayload.tableNo : (orderPayload.tableId ? String(orderPayload.tableId) : "");
        let masterData: any = null;
        let detailsData: any[] | null = null;
        let modifiersData: any[] = [];

        try {
          const targetOrderId = orderPayload.orderId || editingOrderId || 0;
          let saleRes: any = null;

          if (finalSaleId > 0 && targetOrderId > 0) {
            try {
              saleRes = await salesInvoiceApi.getSalesInvoiceData(finalSaleId, targetOrderId);
            } catch (err) {
              console.warn("getSalesInvoiceData failed, attempting fallback:", err);
            }
          }

          if ((!saleRes || (!saleRes.detailsData && !saleRes.details)) && targetOrderId > 0) {
            try {
              const settledRes = await settledOrdersApi.getSettledOrderDetails(targetOrderId);
              if (settledRes && settledRes.data) {
                saleRes = settledRes.data;
              }
            } catch (err) {
              console.warn("getSettledOrderDetails failed, attempting orderApi:", err);
            }
          }

          if ((!saleRes || (!saleRes.detailsData && !saleRes.details)) && targetOrderId > 0) {
            try {
              const orderRes = await orderApi.getOrderDetails(targetOrderId);
              if (orderRes) {
                saleRes = orderRes?.data || orderRes;
              }
            } catch (err) {
              console.warn("getOrderDetails fallback failed:", err);
            }
          }

          if (saleRes) {
            masterData = saleRes.masterData || saleRes.master || saleRes.data?.masterData || saleRes.data?.master || saleRes;
            detailsData = saleRes.detailsData || saleRes.details || saleRes.data?.detailsData || saleRes.data?.details || null;
            modifiersData = saleRes.modifiersData || saleRes.modifiers || saleRes.data?.modifiersData || saleRes.data?.modifiers || [];
          }

          if (isCombinedOrder) {
            const primaryNo = masterData?.orderNo
              ? String(masterData.orderNo)
              : String(orderPayload.orderId || editingOrderId || "");
            const otherNos = (orderPayload.combinedOrderIds || []).map(String);
            const allNos = [primaryNo, ...otherNos].filter(Boolean);
            const uniqueNos = Array.from(new Set(allNos));
            orderNoStr = uniqueNos.join(", ");
            ticketNoStr = masterData?.ticketNo ? String(masterData.ticketNo) : (uniqueNos[0] || ticketNoStr);
            waiterStr = masterData?.employeeName || waiterStr;
            sectionStr = masterData?.sectionName || sectionStr;
            tableStr = masterData?.tableNo || masterData?.tableName || tableStr;
          } else if (masterData) {
            orderNoStr = masterData.orderNo ? String(masterData.orderNo) : orderNoStr;
            ticketNoStr = masterData.ticketNo ? String(masterData.ticketNo) : ticketNoStr;
            waiterStr = masterData.employeeName || waiterStr;
            sectionStr = masterData.sectionName || sectionStr;
            tableStr = masterData.tableNo || masterData.tableName || tableStr;
          }

          const rawVoucherNo = masterData?.voucherNo || masterData?.invoiceNo || masterData?.voucherNumber || masterData?.saleNo
            || saleRes?.voucherNo || saleRes?.invoiceNo || saleRes?.data?.voucherNo || saleRes?.data?.invoiceNo;
          if (rawVoucherNo) {
            invoiceNoStr = String(rawVoucherNo);
          }
        } catch (e) {
          console.warn("Failed to fetch invoice metadata for print:", e);
        }

        let mappedPrintItems = cartDetails;
        if (!isCombinedOrder && detailsData && Array.isArray(detailsData) && detailsData.length > 0) {
          try {
            const preMapped = detailsData.map((d: any) => {
              const itemMods = modifiersData.filter((m: any) => m.mapId === d.mapId);
              const extras = itemMods
                .filter((m: any) => (m.status || "").toLowerCase() === "extras" || ((m.status || "") === "" && (m.price || 0) > 0))
                .map((m: any) => ({
                  id: m.modifierId,
                  name: m.modifierName,
                  price: m.price || 0,
                  qty: m.qty || 1,
                  typeId: m.typeId
                }));
              const modifiers = itemMods
                .filter((m: any) => (m.status || "").toLowerCase() === "modifier" || ((m.status || "") === "" && (m.price || 0) <= 0))
                .map((m: any) => ({
                  id: m.modifierId,
                  name: m.modifierName,
                  qty: m.qty || 1,
                  typeId: m.typeId
                }));
              const messages = itemMods
                .filter((m: any) => (m.status || "").toLowerCase() === "message")
                .map((m: any) => ({
                  id: m.modifierId,
                  name: m.modifierName || m.name || ""
                }));

              let lineBase = (d.price || 0) * (d.qty || 1);
              extras.forEach((ex: any) => lineBase += ex.price * ex.qty);

              return { ...d, extras, modifiers, messages, lineBase };
            });

            mappedPrintItems = preMapped.map((d: any) => {
              const qty = d.qty ?? d.Qty ?? 1;
              const price = d.price ?? d.Price ?? 0;
              const cartMatch = cartDetails.find(c => c.productId === (d.productId || d.itemId));
              return {
                productId: d.productId || d.itemId || 0,
                quantity: qty,
                price: price,
                variantName: d.variantName || d.VariantName || cartMatch?.variantName,
                variantArabic: d.variantArabic || d.altArabic || d.VariantArabic || d.AltArabic || cartMatch?.variantArabic,
                product: {
                  name: d.productName || d.ProductName || cartMatch?.product?.name || `Product #${d.productId || 0}`,
                  price: price,
                  arabicName: d.arabicName || d.ArabicName || (d as any).productArabicName || cartMatch?.product?.arabicName
                },
                extras: d.extras,
                modifiers: d.modifiers,
                messages: d.messages || [],
                itemDiscount: d.discAmount || 0,
                lineTotal: d.netAmount ?? d.amount ?? d.lineBase ?? (price * qty)
              };
            });
          } catch (err) {
            console.warn("Failed to map API details for printing, falling back to cartDetails:", err);
            mappedPrintItems = cartDetails;
          }
        }

        const printPayloadObj = {
          mappedItems: mappedPrintItems,
          printData: {
            orderNo: orderNoStr,
            ticketNo: ticketNoStr,
            invoiceNo: invoiceNoStr || (finalSaleId > 0 ? String(finalSaleId) : undefined),
            waiter: waiterStr,
            counter: "Main",
            section: sectionStr,
            table: tableStr,
            orderType: mappedOrderType,
            date: now.toLocaleDateString('en-GB'),
            time: now.toLocaleTimeString('en-US', { hour12: true, hour: '2-digit', minute: '2-digit' }),
            customerName: orderPayload.customerName || "WALK IN",
            payments: payments.map(p => ({
              name: paymentNames[p.paymodeId] || "Other",
              amount: p.amount
            })),
            subTotal: isCombinedOrder ? subtotal : (masterData?.vatExclAmount ?? masterData?.subTotal ?? subtotal),
            discount: isCombinedOrder ? (totalDiscountAmount || 0) : (masterData?.discAmount ?? masterData?.discount ?? (totalDiscountAmount || 0)),
            serviceCharge: isCombinedOrder ? totalServiceCharge : (masterData?.serviceCharge ?? totalServiceCharge),
            levy: isCombinedOrder ? totalLevy : (masterData?.levyAmt ?? masterData?.levy ?? totalLevy),
            vatAmount: isCombinedOrder ? totalVat : (masterData?.vatAmount ?? totalVat),
            deliveryCharge: isCombinedOrder ? deliveryCharge : (masterData?.deliveryCharge ?? deliveryCharge),
            // Prefer the server-stored net amount to avoid frontend rounding accumulation errors
            netAmount: isCombinedOrder ? total : (masterData?.netAmount ?? total),
            changeAmount: Number(orderPayload.change) || 0,
            isSettlement: true,
            billArabic: isBillArabicEnabled()
          }
        };

        setSettledPrintPayload(printPayloadObj);
        finalizeSettlement(settleShouldPrintRef.current, printPayloadObj);
      } else {
        throw new Error("Invalid sales response");
      }
    } catch (err: any) {
      console.error("Settlement failed", err, err.response?.data);
      const errorMsg = err.response?.data?.title || err.response?.data?.message || err.message || "Failed to save sales invoice";
      showToast(errorMsg, "error");
    }
  });

  const handleCompleteSettlement = useEvent(async (payments: { paymodeId: number, amount: number }[], changeAmount: number) => {
    setChange(changeAmount.toFixed(decimalPart));
    if (!status) return;

    let config: any = null;
    try {
      config = await getRuntimePosConfig();
    } catch {
      showToast("Unable to load POS configuration", "error");
      return;
    }

    const defaultEmployeeEnabled = config?.defaultEmployee === "Enable";
    const defaultEmployeeId = Number(config?.employeeId ?? 0);

    if (defaultEmployeeEnabled && defaultEmployeeId > 0) {
      submitSettlementForEmployee(defaultEmployeeId, payments);
      return;
    }

    if (defaultEmployeeEnabled && (!Number.isFinite(defaultEmployeeId) || defaultEmployeeId <= 0)) {
      showToast("Default employee is enabled but not selected in settings", "error");
      return;
    }

    requestAuthorization({
      actionLabel: "Settlement",
      permissionId: 19, // Settle
      onAuthorized: (employeeId: number) => submitSettlementForEmployee(employeeId, payments),
    });
  });

  const handleCardCreditSettlement = useEvent(async (selectedPaymodeId: number) => {
    setChange("");
    if (!status) return;

    let resolvedPaymodeId = Number(selectedPaymodeId);
    if (!resolvedPaymodeId || isNaN(resolvedPaymodeId) || resolvedPaymodeId <= 0) {
      const cashTender = (tenderOptions || []).find((t: any) => (t.label || "").toLowerCase().includes("cash"));
      resolvedPaymodeId = cashTender ? Number(cashTender.id) : 1;
    }

    let config: any = null;
    try {
      config = await getRuntimePosConfig();
    } catch {
      showToast("Unable to load POS configuration", "error");
      return;
    }

    const defaultEmployeeEnabled = config?.defaultEmployee === "Enable";
    const defaultEmployeeId = Number(config?.employeeId ?? 0);
    const payments = [{ paymodeId: resolvedPaymodeId, amount: total }];

    if (defaultEmployeeEnabled && defaultEmployeeId > 0) {
      submitSettlementForEmployee(defaultEmployeeId, payments);
      return;
    }

    if (defaultEmployeeEnabled && (!Number.isFinite(defaultEmployeeId) || defaultEmployeeId <= 0)) {
      showToast("Default employee is enabled but not selected in settings", "error");
      return;
    }

    requestAuthorization({
      actionLabel: "Settlement",
      permissionId: 19, // Settle
      onAuthorized: (employeeId: number) => submitSettlementForEmployee(employeeId, payments),
    });
  });

  return {
    submitOrderForEmployee,
    submitSettlementForEmployee,
    finalizeSettlement,
    handleCompleteSettlement,
    handleCardCreditSettlement,
    settleShouldPrintRef
  };
};
