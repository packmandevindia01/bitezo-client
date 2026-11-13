import { createSettleFlow, type SettleFlow } from '../utils/settleFlow';
import { useState, useRef } from 'react';
import { useEvent } from '../../../../hooks/useEvent';
import { useAppDispatch } from '../../../../app/hooks';
import { setIsSettling, setWaiter } from '../store/posSlice';
import { salesInvoiceApi } from '../../services/salesInvoiceApi';
import { openDrawerIfCash } from '../../utils/cashDrawer';
import { useSettlePrintPrompt } from './useSettlePrintPrompt';
import { forEachBillCopy } from '../../utils/settlePrintConfig';
import { printKotOnSettle } from '../utils/settleKot';
import { getVatStatus, } from '../utils/billing';
import { buildSalesInvoicePayload } from '../mappers/invoicePayloadMapper';
import { store } from '../../../../app/store';
import { buildSettleReceiptPayload } from '../utils/settleReceiptData';
import {
  disableDefaultEmployeeConfig,
  isEmployeeNotFoundError,
  isDefaultEmployeeValidInCache,
} from '../../utils/defaultEmployee';

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
  waiterId?: number | null;
  
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
  waiterId,
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
  const dispatch = useAppDispatch();
  const [settledPrintPayload, setSettledPrintPayload] = useState<{ mappedItems: any[], printData: any } | null>(null);
  // Settle lock = a small state machine (utils/settleFlow.ts). It also drives the Redux `isSettling`
  // flag that disables the Settle / Place buttons, and is held until the receipt print + cart clear finish.
  const settleFlowRef = useRef<SettleFlow | null>(null);
  if (!settleFlowRef.current) {
    settleFlowRef.current = createSettleFlow((state) => dispatch(setIsSettling(state !== "idle")));
  }
  const settleFlow = settleFlowRef.current;
  const settleShouldPrintRef = useRef<boolean>(false);
  const settlePrint = useSettlePrintPrompt();
  const settlementCashChangeRef = useRef<number>(0);
  const settlementEmployeeIdRef = useRef<number | null>(null);
  const isOrderSubmittingRef = useRef<boolean>(false);

  const setSettlementEmployeeId = useEvent((empId: number | null) => {
    settlementEmployeeIdRef.current = empId;
  });

  const submitOrderForEmployee = useEvent(async (employeeId: number, shouldPrint: boolean = false) => {
    if (!status || isOrderSubmittingRef.current) return { success: false, orderId: null };
    isOrderSubmittingRef.current = true;
    try {
    const result = await submitOrder({
      dayId: status.dayId,
      shiftId: status.shiftId,
      userId: status.userId,
      employeeId,
      customerId: (activeProvider?.provider?.postAccountId && activeProvider.provider.postAccountId > 0) ? activeProvider.provider.postAccountId : undefined,
      providerId: activeProvider?.provider?.providerId,
      providerOrderNo: activeProvider?.orderNo,
    }, shouldPrint);

    if (result && typeof result === "object" && (result as any).isEmployeeNotFound) {
      return { success: false, isEmployeeNotFound: true, orderId: null };
    }

    if (result && (typeof result === "number" || (typeof result === "string" && Number(result) > 0))) {
      setSelectedKey(null);
      setSelectedProduct(null);
      setAlternatives([]);
      setActiveProvider(null);
      setIsCashModalOpen(false);
      setIsMultiPayModalOpen(false);
      handleClearCart();
      return { success: true, isEmployeeNotFound: false, orderId: Number(result) };
    }
    return { success: false, isEmployeeNotFound: false, orderId: null };
    } finally {
      isOrderSubmittingRef.current = false;
    }
  });

  const finalizeSettlement = useEvent(async (shouldPrint: boolean, payloadToPrint?: any) => {
    try {
      // POS config "KOT Print (Settle)": before the receipt, so an "ask before printing" question cannot hold up the kitchen.
      try {
        await printKotOnSettle({
          cartDetails,
          isEdit: Boolean(editingOrderId),
          printData: (payloadToPrint || settledPrintPayload)?.printData,
          sectionId: store.getState().pos.selectedSectionId,
        });
      } catch (kotErr: unknown) {
        console.error("Settle KOT failed:", kotErr);
        showToast(`Order settled, but the KOT failed: ${kotErr instanceof Error ? kotErr.message : kotErr}`, "warning");
      }
      // POS config "Settle Print": print, skip or ask. The sale is already saved; the settle lock holds meanwhile.
      await printAndClearAfterSettle(shouldPrint && (await settlePrint.decide()), payloadToPrint);
    } finally {
      // Release the settle lock only now: receipt printed (or failed) and the cart is cleared.
      settleFlow.finish();
    }
  });

  const printAndClearAfterSettle = async (shouldPrint: boolean, payloadToPrint?: any) => {
    const payload = payloadToPrint || settledPrintPayload;
    if (shouldPrint && payload) {
      showToast("Printing receipt...", "info");
      try {
        const enableVat = getVatStatus();
        payload.printData.enableVat = enableVat;
        const { isBillArabicEnabled } = await import("../../utils/alternativeHelpers");
        const billArabic = isBillArabicEnabled() || payload.mappedItems.some((it: any) => 
          Boolean(it.product?.arabicName || it.variantArabic || (it as any).altArabic)
        );
        payload.printData.billArabic = billArabic;

        let targetPrinter = localStorage.getItem('cachedBillPrinter') || undefined;
        if (!targetPrinter || targetPrinter === "No Printer") {
          targetPrinter = localStorage.getItem('cachedBillPrinterIp') ||
                          localStorage.getItem('cachedKotPrinter') ||
                          localStorage.getItem('cachedKotPrinterIp') ||
                          localStorage.getItem('printerIpAddress') ||
                          undefined;
        }

        // ── UNIFIED HTML GRAPHIC PATH: Identical typography, alignment, and formatting on both Web and Android ──
        const { printHtmlReceipt } = await import("../../services/qzService");
        const { generateGuestPrintHtml } = await import("../../utils/guestPrintTemplate");
        const { hasPrinterHeadings, notifyPrinterHeadingWarning } = await import("../../utils/printHeadingUtils");
        if (!hasPrinterHeadings()) {
          notifyPrinterHeadingWarning(showToast);
        }
        const html = await generateGuestPrintHtml(payload.unifiedPricing || payload.mappedItems, payload.printData);
        await forEachBillCopy(() => printHtmlReceipt(html, targetPrinter));

        showToast("Sales saved successfully", "success");
      } catch (printErr: any) {
        console.error("Settled print failed:", printErr);
        // No blocking alert() in the middle of service: the sale IS saved, only the print failed.
        showToast(`Order settled, but printing failed: ${printErr?.message || printErr}`, "warning");
      }
    } else {
        showToast("Sales saved successfully", "success");
    }
    handleClearCart();
    setSettledPrintPayload(null);
    settleShouldPrintRef.current = false;
    settlementEmployeeIdRef.current = null;
  };

  const submitSettlementForEmployee = useEvent(async (employeeId: number, payments: { paymodeId: number, amount: number }[]) => {
    // A settlement already running (saving OR printing) → ignore the tap.
    if (!status || !settleFlow.begin()) return;
    
    const orderPayload = getDirectSettleOrderPayload({
      employeeId,
      customerId: (activeProvider?.provider?.postAccountId && activeProvider.provider.postAccountId > 0) ? activeProvider.provider.postAccountId : undefined,
      providerId: activeProvider?.provider?.providerId,
      providerOrderNo: activeProvider?.orderNo,
    });

    const isDelivery = orderPayload.orderTypeId === 4;
    if (isDelivery && (!orderPayload.addressId || Number(orderPayload.addressId) === 0)) {
      showToast("Please select a delivery address before settling.", "warning");
      // Release the settle lock — otherwise every later Settle is silently ignored until reload.
      settleFlow.fail();
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

      const effectiveOrderPayload = { ...orderPayload };
      if (orderPayload.combinedOrderIds && orderPayload.combinedOrderIds.length > 0) {
        const allIds = [orderPayload.orderId || editingOrderId, ...orderPayload.combinedOrderIds].filter(Boolean).map(Number);
        const maxId = Math.max(...allIds);
        if (maxId !== orderPayload.orderId) {
          effectiveOrderPayload.orderId = maxId;
          effectiveOrderPayload.combinedOrderIds = allIds.filter(id => id !== maxId);
        }
      }

      const salesPayload = buildSalesInvoicePayload({
        orderPayload: effectiveOrderPayload,
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
      let createRes: any = null;
      if (editingSaleId) {
        success = await salesInvoiceApi.updateSalesInvoice(editingSaleId, salesPayload);
        if (success) settleFlow.saved(); // invoice saved — the lock is now released only by finalizeSettlement
      } else {
        try {
          createRes = await salesInvoiceApi.createSalesInvoice(salesPayload);
        } catch (initialErr: any) {
          const errMsg = String(initialErr?.response?.data?.message || initialErr?.message || "").toLowerCase();
          const isTicketConflict = errMsg.includes("ticket");

          if (isTicketConflict && (!salesPayload.orderId || salesPayload.orderId === 0)) {
            console.warn("[usePosCheckoutFlow] Direct settlement ticket collision on backend. Falling back to pre-order submission...");
            try {
              const preOrderId = await submitOrder({
                dayId: status.dayId,
                shiftId: status.shiftId,
                userId: status.userId,
                employeeId,
                customerId: (activeProvider?.provider?.postAccountId && activeProvider.provider.postAccountId > 0) ? activeProvider.provider.postAccountId : undefined,
                providerId: activeProvider?.provider?.providerId,
                providerOrderNo: activeProvider?.orderNo,
              }, false);

              if (preOrderId && (typeof preOrderId === 'number' || typeof preOrderId === 'string') && Number(preOrderId) > 0) {
                salesPayload.orderId = Number(preOrderId);
                createRes = await salesInvoiceApi.createSalesInvoice(salesPayload);
              } else {
                throw initialErr;
              }
            } catch (fallbackErr) {
              console.error("[usePosCheckoutFlow] Pre-order fallback also failed:", fallbackErr);
              throw initialErr;
            }
          } else {
            throw initialErr;
          }
        }

        if (typeof createRes === 'number') {
          newSaleId = createRes;
        } else if (createRes && typeof createRes === 'object') {
          newSaleId = createRes.id ?? createRes.saleId ?? null;
          const vNo = createRes.voucherNo ?? createRes.invoiceNo ?? createRes.voucherNumber ?? createRes.saleNo;
          if (vNo) invoiceNoStr = String(vNo);
        }
        success = !!newSaleId;
        if (success) settleFlow.saved(); // invoice saved — the lock is now released only by finalizeSettlement
      }

      if (success) {
        setIsCashModalOpen(false);
        setIsMultiPayModalOpen(false);

        // New settlements only: editing a settled bill takes no new sale, so the drawer stays shut.
        if (!editingSaleId) {
          await openDrawerIfCash(validPayments, tenderOptions || [], (reason) =>
            showToast(`Order settled, but the cash drawer did not open: ${reason}`, "warning")
          );
        }

        const printPayloadObj = await buildSettleReceiptPayload({
          orderPayload, salesPayload, createRes, newSaleId, editingSaleId, editingOrderId, invoiceNoStr, employeeId, waiterId, waiterName,
          isCombinedOrder, cartDetails, subtotal, totalDiscountAmount, totalServiceCharge, totalLevy, totalVat, total, deliveryCharge,
          payments, tenderOptions, cashChange: settlementCashChangeRef.current,
          providerName: activeProvider?.provider?.providerName,
          customerName: store.getState().pos.selectedCustomerName,
        });

        setSettledPrintPayload(printPayloadObj);
        finalizeSettlement(settleShouldPrintRef.current, printPayloadObj);
        return { success: true, isEmployeeNotFound: false };
      } else {
        throw new Error("Invalid sales response");
      }
    } catch (err: any) {
      console.error("Settlement failed", err, err.response?.data);
      const isEmployeeError = isEmployeeNotFoundError(err);
      if (isEmployeeError) {
        disableDefaultEmployeeConfig("Settlement rejected employeeId: not found or invalid.");
        dispatch(setWaiter({ waiterId: null, waiterName: null }));
        const errorMsg = "The configured default employee was not found in the system and has been disabled. Please select an employee to authorize settlement.";
        showToast(errorMsg, "warning");
        return { success: false, isEmployeeNotFound: true };
      }
      const rawMsg = err.response?.data?.title || err.response?.data?.message || err.message || "Failed to save sales invoice";
      const isTicketConflict = String(rawMsg).toLowerCase().includes("ticket");
      const errorMsg = isTicketConflict
        ? "Ticket number sequence conflict on server. Please tap Settle again."
        : rawMsg;
      showToast(errorMsg, "error");
      return { success: false, isEmployeeNotFound: false };
    } finally {
      // Nothing saved → release. Once saved, this is a no-op: finalizeSettlement releases after print + cart clear.
      settleFlow.fail();
    }
  });

  /**
   * Who settles: the authorised employee → the waiter → the configured default employee (when it still
   * exists) → otherwise ask for authorisation (permission 19). Shared by cash / multi-pay and card / credit
   * (the same 40 lines were duplicated in both handlers).
   */
  const settleWithResolvedEmployee = async (
    payments: { paymodeId: number, amount: number, tenderedAmount?: number }[],
    overrideEmployeeId?: number
  ) => {
    let config: any = null;
    try {
      config = await getRuntimePosConfig();
    } catch {
      showToast("Unable to load POS configuration", "error");
      return;
    }

    const defaultEmployeeEnabled = config?.defaultEmployee === "Enable";
    const defaultEmployeeId = Number(config?.employeeId ?? 0);

    const authorizedEmpId = overrideEmployeeId || settlementEmployeeIdRef.current || (localStorage.getItem("authorizedEmployeeId") ? Number(localStorage.getItem("authorizedEmployeeId")) : null);
    let effectiveEmployeeId = (authorizedEmpId && authorizedEmpId > 0)
      ? authorizedEmpId
      : (waiterId && waiterId > 0)
      ? waiterId
      : (defaultEmployeeEnabled && defaultEmployeeId > 0 ? defaultEmployeeId : null);

    if (effectiveEmployeeId && !waiterId && !authorizedEmpId && defaultEmployeeEnabled) {
      if (!isDefaultEmployeeValidInCache(defaultEmployeeId)) {
        disableDefaultEmployeeConfig("Default employee not found in branch employees cache");
        dispatch(setWaiter({ waiterId: null, waiterName: null }));
        showToast("Configured default employee was not found in this branch and has been disabled. Please authorize settlement.", "warning");
        effectiveEmployeeId = null;
      }
    }

    if (effectiveEmployeeId) {
      const res = await submitSettlementForEmployee(effectiveEmployeeId, payments);
      if (res && (res as any).isEmployeeNotFound) {
        requestAuthorization({
          actionLabel: "Settlement",
          permissionId: 19, // Settle
          bypassDefaultEmployee: true,
          onAuthorized: (employeeId: number) => submitSettlementForEmployee(employeeId, payments),
        });
      }
      return;
    }

    if (defaultEmployeeEnabled && (!Number.isFinite(defaultEmployeeId) || defaultEmployeeId <= 0)) {
      disableDefaultEmployeeConfig("Invalid default employee ID in settlement");
      dispatch(setWaiter({ waiterId: null, waiterName: null }));
      showToast("Default employee was not configured properly and has been disabled. Please authorize settlement.", "warning");
    }

    requestAuthorization({
      actionLabel: "Settlement",
      permissionId: 19, // Settle
      bypassDefaultEmployee: true,
      onAuthorized: (employeeId: number) => submitSettlementForEmployee(employeeId, payments),
    });
  };

  const handleCompleteSettlement = useEvent(async (payments: { paymodeId: number, amount: number, tenderedAmount?: number }[], changeAmount: number) => {
    settlementCashChangeRef.current = Number(changeAmount) || 0;
    setChange(changeAmount.toFixed(decimalPart));
    if (!status) return;

    await settleWithResolvedEmployee(payments);
  });

  const handleCardCreditSettlement = useEvent(async (selectedPaymodeId: number, overrideEmployeeId?: number) => {
    setChange("");
    if (!status) return;

    let resolvedPaymodeId = Number(selectedPaymodeId);
    if (!resolvedPaymodeId || isNaN(resolvedPaymodeId) || resolvedPaymodeId <= 0) {
      const cashTender = (tenderOptions || []).find((t: any) => (t.label || "").toLowerCase().includes("cash"));
      resolvedPaymodeId = cashTender ? Number(cashTender.id) : 1;
    }

    await settleWithResolvedEmployee([{ paymodeId: resolvedPaymodeId, amount: total }], overrideEmployeeId);
  });

  return {
    settlePrintPromptProps: settlePrint.promptProps,
    submitOrderForEmployee,
    submitSettlementForEmployee,
    finalizeSettlement,
    handleCompleteSettlement,
    handleCardCreditSettlement,
    setSettlementEmployeeId,
    settlementEmployeeIdRef,
    settleShouldPrintRef
  };
};
