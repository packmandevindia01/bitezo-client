import { useState, useRef } from 'react';
import { useEvent } from '../../../../hooks/useEvent';
import { salesInvoiceApi } from '../../services/salesInvoiceApi';

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
  totalVat: number;
  total: number;
  deliveryCharge: number;
  tenderOptions: any[];
  decimalPart: number;
  
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
  totalVat,
  total,
  deliveryCharge,
  tenderOptions,
  decimalPart,
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
    }
  });

  const finalizeSettlement = useEvent(async (shouldPrint: boolean, payloadToPrint?: any) => {
    const payload = payloadToPrint || settledPrintPayload;
    if (shouldPrint && payload) {
      showToast("Printing receipt...", "info");
      try {
        const { printerSettingsApi } = await import("../../services/printerSettingsApi");
        const { printHtmlReceipt } = await import("../../services/qzService");
        const { generateGuestPrintHtml } = await import("../../utils/guestPrintTemplate");
        
        let targetPrinter: string | undefined;
        try {
          const printerSettingsResponse = await printerSettingsApi.getGeneral();
          targetPrinter = printerSettingsResponse?.data?.billPrinter;
        } catch {}

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
        payload.printData.enableVat = enableVat;

        const html = generateGuestPrintHtml(payload.mappedItems, payload.printData);
        await printHtmlReceipt(html, targetPrinter);
      } catch (printErr: any) {
        console.error("Settled print failed:", printErr);
        showToast("Order settled, but printing failed", "warning");
      }
    }
    showToast("Sales saved successfully", "success");
    handleClearCart();
    setSettledPrintPayload(null);
  });

  const submitSettlementForEmployee = useEvent(async (employeeId: number, payments: { paymodeId: number, amount: number }[]) => {
    if (!status) return;
    
    const orderPayload = getDirectSettleOrderPayload({
      employeeId,
      providerOrderNo: activeProvider?.orderNo,
    });

    const isOrderEdited = !editingOrderId || isCartModified;

    try {
      const salesPayload: any = {
        seriesId: 1,
        prefix: "",
        customerId: orderPayload.customerId,
        paymodeId: payments.length > 1 ? 3 : (payments.length > 0 ? payments[0].paymodeId : 1),
        employeeId: orderPayload.employeeId,
        dayId: status.dayId,
        shiftId: status.shiftId,
        orderTypeId: orderPayload.orderTypeId,
        androidStatus: false,
        saleId: editingSaleId || 0,
        orderId: orderPayload.orderId,
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
          change: orderPayload.change,
          isComing: orderPayload.isComing,
          comingTime: orderPayload.comingTime,
          providerNo: orderPayload.providerNo,
        },
        combinedOrderIds: orderPayload.combinedOrderIds,
        modifiers: orderPayload.modifiers,
        voidProducts: orderPayload.voidProducts,
        voidModifiers: orderPayload.voidModifiers,
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
        details: orderPayload.details.map((d: any) => ({
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
          baseQty: d.baseQty,
          mapId: d.mapId,
          complimentaryStatus: d.complimentaryStatus || false
        })),
        paymodes: payments
      };

      let success = false;
      let newSaleId: number | null = null;
      if (editingSaleId) {
        success = await salesInvoiceApi.updateSalesInvoice(editingSaleId, salesPayload);
      } else {
        newSaleId = await salesInvoiceApi.createSalesInvoice(salesPayload);
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
        
        const printPayloadObj = {
          mappedItems: cartDetails,
          printData: {
            orderNo: finalSaleId.toString(),
            ticketNo: finalSaleId.toString(),
            waiter: String(employeeId),
            orderType: mappedOrderType,
            date: now.toLocaleDateString('en-GB'),
            time: now.toLocaleTimeString('en-US', { hour12: true, hour: '2-digit', minute: '2-digit' }),
            customer: orderPayload.customerName || "WALK IN",
            payments: payments.map(p => ({
              method: paymentNames[p.paymodeId] || "Other",
              amount: p.amount
            })),
            totals: {
              subtotal: subtotal.toFixed(decimalPart),
              discountAmount: totalDiscountAmount.toFixed(decimalPart),
              serviceCharge: totalServiceCharge.toFixed(decimalPart),
              vatAmount: totalVat.toFixed(decimalPart),
              deliveryCharge: deliveryCharge.toFixed(decimalPart),
              netAmount: total.toFixed(decimalPart),
            },
            isSettlement: true
          }
        };

        setSettledPrintPayload(printPayloadObj);
        finalizeSettlement(settleShouldPrintRef.current, printPayloadObj);
      } else {
        throw new Error("Invalid sales response");
      }
    } catch (err: any) {
      showToast(err.message || "Failed to save sales invoice", "error");
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

    if (defaultEmployeeEnabled) {
      if (!Number.isFinite(defaultEmployeeId) || defaultEmployeeId <= 0) {
        showToast("Default employee is not configured", "error");
        return;
      }
      submitSettlementForEmployee(defaultEmployeeId, payments);
      return;
    }

    requestAuthorization({
      actionLabel: "Settlement",
      onAuthorized: (employeeId: number) => submitSettlementForEmployee(employeeId, payments),
    });
  });

  const handleCardCreditSettlement = useEvent(async () => {
    setChange("");
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
    const cardPaymodeId = tenderOptions.find(t => t.label.toLowerCase().includes('card'))?.id || 2;
    const payments = [{ paymodeId: Number(cardPaymodeId), amount: total }];

    if (defaultEmployeeEnabled) {
      if (!Number.isFinite(defaultEmployeeId) || defaultEmployeeId <= 0) {
        showToast("Default employee is not configured", "error");
        return;
      }
      submitSettlementForEmployee(defaultEmployeeId, payments);
      return;
    }

    requestAuthorization({
      actionLabel: "Settlement",
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
