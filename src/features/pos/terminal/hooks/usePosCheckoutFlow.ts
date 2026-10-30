import { useState, useRef } from 'react';
import { useEvent } from '../../../../hooks/useEvent';
import { useAppDispatch } from '../../../../app/hooks';
import { setIsSettling, setWaiter } from '../store/posSlice';
import { salesInvoiceApi } from '../../services/salesInvoiceApi';
import { orderApi } from '../../services/orderApi';
import { settledOrdersApi } from '../../services/settledOrdersApi';
import { getVatStatus, roundCalc, getPriceView } from '../utils/billing';
import { isBillArabicEnabled, cleanProductName } from '../../utils/alternativeHelpers';
import { buildSalesInvoicePayload } from '../mappers/invoicePayloadMapper';
import { sortOrderDetailsBySequence } from '../utils/orderSort';
import { getModifierTypeNameById } from '../../services/menuApi';
import { alternativesCache } from '../hooks/usePosProducts';
import { checkOrderHasBillDiscount } from '../utils/orderDiscountCheck';
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
  const isSettlingRef = useRef<boolean>(false);
  const settleShouldPrintRef = useRef<boolean>(false);
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
        const html = await generateGuestPrintHtml(payload.mappedItems, payload.printData);
        await printHtmlReceipt(html, targetPrinter);

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
    settleShouldPrintRef.current = false;
    settlementEmployeeIdRef.current = null;
  });

  const submitSettlementForEmployee = useEvent(async (employeeId: number, payments: { paymodeId: number, amount: number }[]) => {
    if (!status || isSettlingRef.current) return;
    isSettlingRef.current = true;
    dispatch(setIsSettling(true));
    
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

      let effectiveOrderPayload = { ...orderPayload };
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
      if (editingSaleId) {
        success = await salesInvoiceApi.updateSalesInvoice(editingSaleId, salesPayload);
      } else {
        let createRes: any = null;
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
        const resolveEmployeeNameById = async (empId?: number | string | null): Promise<string | null> => {
          if (!empId) return null;
          const idStr = String(empId).trim();
          if (!idStr || idStr === "0" || idStr === "NaN") return null;

          try {
            const mapRaw = localStorage.getItem("posEmpNameMap");
            if (mapRaw) {
              const map: Record<string, string> = JSON.parse(mapRaw);
              if (map[idStr]) return map[idStr];
            }
          } catch {}

          if (idStr === localStorage.getItem("authorizedEmployeeId")) {
            const authName = localStorage.getItem("authorizedEmployeeName");
            if (authName) return authName;
          }

          try {
            const branchId =
              Number(localStorage.getItem("systemBranchId")) ||
              Number(localStorage.getItem("activeBranchId")) ||
              Number(localStorage.getItem("branchId")) ||
              0;
            const { getEmployeeNames } = await import("../../../general/employee/services/employeeService");
            const list = await getEmployeeNames(branchId);
            if (Array.isArray(list) && list.length > 0) {
              const map: Record<string, string> = {};
              try {
                const existing = localStorage.getItem("posEmpNameMap");
                if (existing) Object.assign(map, JSON.parse(existing));
              } catch {}
              list.forEach((e: any) => {
                const id = e.empId ?? e.id;
                const name = e.empName ?? e.name;
                if (id && name) map[String(id)] = name;
              });
              localStorage.setItem("posEmpNameMap", JSON.stringify(map));
              if (map[idStr]) return map[idStr];
            }
          } catch {}

          return null;
        };

        let waiterStr = (await resolveEmployeeNameById(employeeId))
          || (waiterId && waiterId === employeeId ? waiterName : null)
          || localStorage.getItem("defaultEmployeeName")
          || localStorage.getItem("authorizedEmployeeName")
          || waiterName
          || localStorage.getItem("employeeName")
          || "Waiter";
        let sectionStr = orderPayload.sectionId ? String(orderPayload.sectionId) : "DINE IN";
        let tableStr = orderPayload.tableNo ? orderPayload.tableNo : (orderPayload.tableId ? String(orderPayload.tableId) : "");
        let masterData: any = null;
        let origOrderMaster: any = null;
        let detailsData: any[] | null = null;
        let modifiersData: any[] = [];
        const targetOrderId = orderPayload.orderId || editingOrderId || 0;

        try {
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
              const activeOrderTypeName = orderPayload.orderTypeId === 1 ? "DineIn" : "TakeOut";
              const settledRes = await settledOrdersApi.getSettledOrderDetails(targetOrderId, {
                priceView: getPriceView(),
                orderType: activeOrderTypeName,
              });
              if (settledRes && settledRes.data) {
                saleRes = settledRes.data;
              }
            } catch (err) {
              console.warn("getSettledOrderDetails failed, attempting orderApi:", err);
            }
          }

          if (targetOrderId > 0) {
            try {
              const activeOrderTypeName = orderPayload.orderTypeId === 1 ? "DineIn" : "TakeOut";
              const orderRes = await orderApi.getOrderDetails(targetOrderId, {
                priceView: getPriceView(),
                orderType: activeOrderTypeName,
              });
              if (orderRes) {
                origOrderMaster = orderRes?.data?.masterData || orderRes?.masterData || orderRes?.data || orderRes;
                if (!saleRes || (!saleRes.detailsData && !saleRes.details)) {
                  saleRes = orderRes?.data || orderRes;
                }
              }
            } catch (err) {
              console.warn("getOrderDetails fallback failed:", err);
            }
          }

          if (saleRes) {
            masterData = saleRes.masterData || saleRes.master || saleRes.data?.masterData || saleRes.data?.master || saleRes;
            detailsData = saleRes.detailsData || saleRes.details || saleRes.data?.detailsData || saleRes.data?.details || null;
            const rawModData = saleRes.modifiersData || saleRes.modifiers || saleRes.data?.modifiersData || saleRes.data?.modifiers || [];
            const seenModDataKeys = new Set<string>();
            modifiersData = (rawModData || []).filter((m: any) => {
              const mMapId = m.mapId ?? m.MapId ?? m.mapID ?? 0;
              const mModId = m.modifierId ?? m.ModifierId ?? m.id ?? m.Id ?? 0;
              const mName = String(m.modifierName ?? m.ModifierName ?? m.name ?? m.Name ?? "").trim().toLowerCase();
              const key = `${mMapId}-${mModId || mName}`;
              if (seenModDataKeys.has(key)) return false;
              seenModDataKeys.add(key);
              return true;
            });
          }

          if (origOrderMaster && masterData) {
            const origChange = origOrderMaster.change ?? origOrderMaster.keepChanges;
            const curChange = masterData.change ?? masterData.keepChanges;
            const isCurChangeZero = !curChange || curChange === "0.00" || curChange === "0" || curChange === "0.000";
            if (isCurChangeZero && origChange && origChange !== "0.00" && origChange !== "0" && origChange !== "0.000") {
              masterData.change = String(origChange);
              masterData.keepChanges = String(origChange);
            }
            if (!masterData.callBack && origOrderMaster.callBack) {
              masterData.callBack = origOrderMaster.callBack;
            }
            if (!masterData.flatNo && origOrderMaster.flatNo) masterData.flatNo = origOrderMaster.flatNo;
            if (!masterData.buildingNo && origOrderMaster.buildingNo) masterData.buildingNo = origOrderMaster.buildingNo;
            if (!masterData.roadNo && origOrderMaster.roadNo) masterData.roadNo = origOrderMaster.roadNo;
            if (!masterData.blockNo && origOrderMaster.blockNo) masterData.blockNo = origOrderMaster.blockNo;
            if (!masterData.area && origOrderMaster.area) masterData.area = origOrderMaster.area;
            if (!masterData.address && origOrderMaster.address) masterData.address = origOrderMaster.address;
            if (!masterData.deliveryCustomerName && origOrderMaster.deliveryCustomerName) {
              masterData.deliveryCustomerName = origOrderMaster.deliveryCustomerName;
            }
            if (!masterData.contactNo && (origOrderMaster.contactNo || origOrderMaster.mobileNo)) {
              masterData.contactNo = origOrderMaster.contactNo || origOrderMaster.mobileNo;
            }
            if (Number(origOrderMaster.discAmount || 0) > 0 && (!masterData.discAmount || Number(masterData.discAmount) === 0)) {
              masterData.discAmount = origOrderMaster.discAmount;
            }
            if (Number(origOrderMaster.vatAmount || 0) > 0 && (!masterData.vatAmount || Number(masterData.vatAmount) === 0)) {
              masterData.vatAmount = origOrderMaster.vatAmount;
            }
            if (Number(origOrderMaster.vatExclAmount || 0) > 0 && (!masterData.vatExclAmount || Number(masterData.vatExclAmount) === 0)) {
              masterData.vatExclAmount = origOrderMaster.vatExclAmount;
            }
            if (Number(origOrderMaster.serviceCharge || 0) > 0 && (!masterData.serviceCharge || Number(masterData.serviceCharge) === 0)) {
              masterData.serviceCharge = origOrderMaster.serviceCharge;
            }
            if (Number(origOrderMaster.levyAmt || origOrderMaster.levy || 0) > 0 && (!masterData.levyAmt && !masterData.levy || (Number(masterData.levyAmt || 0) === 0 && Number(masterData.levy || 0) === 0))) {
              masterData.levyAmt = origOrderMaster.levyAmt || origOrderMaster.levy;
              masterData.levy = origOrderMaster.levyAmt || origOrderMaster.levy;
            }
          }

          const masterEmp = masterData?.employeeName || (await resolveEmployeeNameById(masterData?.employeeId ?? masterData?.empId ?? masterData?.waiterId));
          if (masterEmp) {
            waiterStr = masterEmp;
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
            sectionStr = masterData?.sectionName || sectionStr;
            tableStr = masterData?.tableNo || masterData?.tableName || tableStr;
          } else if (masterData) {
            orderNoStr = masterData.orderNo ? String(masterData.orderNo) : orderNoStr;
            ticketNoStr = masterData.ticketNo ? String(masterData.ticketNo) : ticketNoStr;
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

        const isBillDisc = Boolean(
          (cartDetails.length > 0 && cartDetails.some((it: any) => (it.billDiscountAmount && it.billDiscountAmount > 0))) ||
          checkOrderHasBillDiscount({ master: masterData, details: detailsData }) ||
          (detailsData && detailsData.length > 0 && Number(detailsData[0]?.discPer ?? 0) > 0 && detailsData.every((d: any) => Number(d.discPer ?? 0) === Number(detailsData[0]?.discPer ?? 0)))
        );

        let mappedPrintItems = cartDetails;
        if (!isCombinedOrder && detailsData && Array.isArray(detailsData) && detailsData.length > 0) {
          try {
            const sortedDetails = sortOrderDetailsBySequence(detailsData);
            const usedCartIndices = new Set<number>();

            // Helper to find the 1-to-1 corresponding cart item for detail d
            const findCartMatch = (d: any) => {
              const dPid = Number(d.productId || d.itemId || 0);
              const dUnitId = Number(d.unitId ?? d.UnitId ?? 0);
              const dMapId = d.mapId !== undefined ? Number(d.mapId) : undefined;

              // 1. Match by mapId if available
              if (dMapId !== undefined) {
                const idx = cartDetails.findIndex((c, i) => !usedCartIndices.has(i) && c.mapId !== undefined && Number(c.mapId) === dMapId);
                if (idx !== -1) {
                  usedCartIndices.add(idx);
                  return cartDetails[idx];
                }
              }

              // 2. Match by productId AND unitId
              if (dPid > 0 && dUnitId > 0) {
                const idx = cartDetails.findIndex((c, i) => !usedCartIndices.has(i) && Number(c.productId) === dPid && Number(c.unitId ?? c.product?.unitId ?? 0) === dUnitId);
                if (idx !== -1) {
                  usedCartIndices.add(idx);
                  return cartDetails[idx];
                }
              }

              // 3. Match by productId AND price (within 0.02)
              if (dPid > 0 && d.price !== undefined) {
                const dPrice = Number(d.price);
                const idx = cartDetails.findIndex((c, i) => !usedCartIndices.has(i) && Number(c.productId) === dPid && Math.abs(Number(c.price) - dPrice) < 0.02);
                if (idx !== -1) {
                  usedCartIndices.add(idx);
                  return cartDetails[idx];
                }
              }

              // 4. Fallback match by productId
              if (dPid > 0) {
                const idx = cartDetails.findIndex((c, i) => !usedCartIndices.has(i) && Number(c.productId) === dPid);
                if (idx !== -1) {
                  usedCartIndices.add(idx);
                  return cartDetails[idx];
                }
              }

              return undefined;
            };

            mappedPrintItems = sortedDetails.map((d: any) => {
              const cartMatch = findCartMatch(d);
              const dPid = Number(d.productId || d.itemId || cartMatch?.productId || 0);
              const dUnitId = Number(d.unitId ?? d.UnitId ?? cartMatch?.unitId ?? cartMatch?.product?.unitId ?? 1);
              const itemMods = modifiersData.filter((m: any) => Number(m.mapId ?? m.MapId ?? 0) === Number(d.mapId ?? d.MapId ?? 0));

              // If order was edited or cart was modified, prioritize user's active cart extras
              const rawExtras = (cartMatch?.extras && (isCartModified || isOrderEdited || Boolean(editingOrderId)))
                ? cartMatch.extras
                : itemMods
                    .filter((m: any) => (m.status || "").toLowerCase() === "extras" || ((m.status || "") === "" && (m.price || 0) > 0))
                    .map((m: any) => ({
                      id: m.modifierId,
                      name: m.modifierName,
                      price: m.price || 0,
                      qty: m.qty || 1,
                      typeId: m.typeId
                    }));

              const dedupedExtrasMap = new Map<string, any>();
              (rawExtras || []).forEach((ex: any) => {
                const exName = String(ex.name || ex.modifierName || "").trim().toLowerCase();
                if (!exName) return;
                const exId = ex.id || ex.modifierId || 0;
                const typeId = ex.typeId || 0;
                const key = exId > 0 ? `${exId}-${typeId}` : `${typeId}-${exName}`;
                if (dedupedExtrasMap.has(key)) {
                  const existing = dedupedExtrasMap.get(key);
                  existing.qty = (existing.qty || 1) + (ex.qty || 1);
                } else {
                  dedupedExtrasMap.set(key, { ...ex, qty: ex.qty || 1 });
                }
              });
              const extras = Array.from(dedupedExtrasMap.values());

              // If order was edited or cart was modified, prioritize user's active cart modifiers
              const rawModifiers = (cartMatch?.modifiers && (isCartModified || isOrderEdited || Boolean(editingOrderId)))
                ? cartMatch.modifiers
                : itemMods
                    .filter((m: any) => (m.status || "").toLowerCase() === "modifier" || ((m.status || "") === "" && (m.price || 0) <= 0))
                    .map((m: any) => {
                      const cartMod = cartMatch?.modifiers?.find((cm: any) => cm.id === m.modifierId || cm.name === m.modifierName);
                      const typeName = m.typeName || m.modifierTypeName || cartMod?.typeName || getModifierTypeNameById(m.typeId) || "";
                      return {
                        id: m.modifierId,
                        name: m.modifierName || m.name || "",
                        qty: m.qty || 1,
                        typeId: m.typeId,
                        typeName,
                        arabicName: m.arabicName || cartMod?.arabicName || "",
                      };
                    });

              const dedupedModsMap = new Map<string, any>();
              (rawModifiers || []).forEach((mod: any) => {
                const mName = String(mod.name || mod.modifierName || "").trim().toLowerCase();
                if (!mName) return;
                const mId = mod.id || mod.modifierId || 0;
                const typeId = mod.typeId || 0;
                const key = mId > 0 ? `${mId}-${typeId}` : `${typeId}-${mName}`;
                if (dedupedModsMap.has(key)) {
                  const existing = dedupedModsMap.get(key);
                  existing.qty = (existing.qty || 1) + (mod.qty || 1);
                } else {
                  dedupedModsMap.set(key, { ...mod, qty: mod.qty || 1 });
                }
              });
              const modifiers = Array.from(dedupedModsMap.values());

              const rawMessages = (cartMatch?.messages && (isCartModified || isOrderEdited || Boolean(editingOrderId)))
                ? cartMatch.messages
                : itemMods
                    .filter((m: any) => (m.status || "").toLowerCase() === "message")
                    .map((m: any) => ({
                      id: m.modifierId,
                      name: m.modifierName || m.name || ""
                    }));

              const seenMsgs = new Set<string>();
              const messages = (rawMessages || []).filter((msg: any) => {
                const k = String(msg.name || "").trim().toLowerCase();
                if (!k || seenMsgs.has(k)) return false;
                seenMsgs.add(k);
                return true;
              });

              const qty = d.qty ?? d.Qty ?? cartMatch?.quantity ?? 1;
              const amount = d.netAmount ?? d.amount ?? cartMatch?.lineTotal ?? 0;
              const itemDisc = isBillDisc ? 0 : Number(cartMatch?.itemDiscount ?? d.discAmount ?? d.DiscAmount ?? d.discount ?? 0);
              const rawPrice = (d.price !== undefined && Number(d.price) > 0)
                ? Number(d.price)
                : (cartMatch?.basePrice !== undefined && Number(cartMatch.basePrice) > 0
                    ? Number(cartMatch.basePrice)
                    : Number(cartMatch?.catalogPrice ?? cartMatch?.price ?? 0));
              const price = (rawPrice > 0)
                ? (itemDisc > 0 && Math.abs((rawPrice * qty) - amount) < 0.001 && qty > 0 ? (amount + itemDisc) / qty : rawPrice)
                : (qty > 0 ? (amount + itemDisc) / qty : 0);
              let lineBase = price * qty;
              extras.forEach((ex: any) => lineBase += ex.price * ex.qty);

              // Resolve variant name from cartMatch, detail row, or alternativesCache
              let resolvedVariantName = cartMatch?.variantName || d.variantName || d.VariantName || d.altName || d.AltName;
              let resolvedVariantArabic = cartMatch?.variantArabic || d.variantArabic || d.altArabic || d.VariantArabic || d.AltArabic;

              if (!resolvedVariantName && dPid > 0 && dUnitId > 0) {
                const allCachedAlts = Object.entries(alternativesCache)
                  .filter(([k]) => k.startsWith(`${dPid}-`))
                  .flatMap(([, alts]) => alts);
                const matchedAlt = allCachedAlts.find(
                  (a: any) => Number(a.unitId ?? a.UnitId ?? a.id ?? a.Id) === dUnitId
                );
                if (matchedAlt) {
                  resolvedVariantName = matchedAlt.altName;
                  resolvedVariantArabic = matchedAlt.altArabic;
                }
              }

              let itemVat = Number(d.vatAmount ?? d.VatAmount ?? d.vatAmt ?? d.VatAmt ?? d.taxAmount ?? d.TaxAmount ?? cartMatch?.vatAmount ?? 0);
              if (itemVat <= 0 && amount > lineBase) {
                itemVat = Number((amount - lineBase).toFixed(4));
              }
              const lineTotal = d.netAmount ?? d.amount ?? cartMatch?.lineTotal ?? lineBase;
              const activeVatRate = itemVat > 0 && lineTotal > itemVat
                ? (itemVat / (lineTotal - itemVat))
                : 0.10;
              const resolvedUnitBasePrice = cartMatch?.basePrice !== undefined && Number(cartMatch.basePrice) > 0
                ? Number(cartMatch.basePrice)
                : (price > 0
                    ? (cartMatch?.isIncl === false ? price : roundCalc(price / (1 + activeVatRate), 4))
                    : (qty > 0 ? Math.max(0, lineTotal - itemVat) / qty : 0));
              const baseAmount = cartMatch?.baseAmount !== undefined && cartMatch.baseAmount > 0
                ? cartMatch.baseAmount
                : roundCalc(resolvedUnitBasePrice * qty, 4);

              return {
                productId: dPid,
                unitId: dUnitId,
                quantity: qty,
                price: price,
                basePrice: resolvedUnitBasePrice,
                baseAmount,
                vatAmount: itemVat,
                lineNetAmount: cartMatch?.lineNetAmount ?? (d.netAmount !== undefined ? Number(d.netAmount) : undefined),
                isIncl: cartMatch?.isIncl,
                variantName: resolvedVariantName,
                variantArabic: resolvedVariantArabic,
                product: {
                  name: cleanProductName(d.productName || d.ProductName || cartMatch?.product?.name, resolvedVariantName) || `Product #${dPid}`,
                  price: price,
                  arabicName: d.arabicName || d.ArabicName || (d as any).productArabicName || cartMatch?.product?.arabicName
                },
                extras,
                modifiers,
                messages,
                itemDiscount: itemDisc,
                discountValue: itemDisc,
                discountType: 'amount' as const,
                discAmount: itemDisc,
                lineTotal: lineTotal
              };
            });
          } catch (err) {
            console.warn("Failed to map API details for printing, falling back to cartDetails:", err);
            mappedPrintItems = cartDetails;
          }
        }

        const isDeliveryOrder = mappedOrderType.toLowerCase().includes("delivery");
        const finalContactNo = masterData?.mobileNo || masterData?.contactNo || orderPayload.contactNo || "";
        const finalCallBack = isDeliveryOrder ? (
          masterData?.callBack || 
          masterData?.callback || 
          (orderPayload as any)?.callBack || 
          (targetOrderId ? localStorage.getItem(`order_callBack_${targetOrderId}`) : null) ||
          (targetOrderId ? sessionStorage.getItem(`order_callBack_${targetOrderId}`) : null) ||
          (finalContactNo ? localStorage.getItem(`delivery_callBack_${finalContactNo}`) : null) ||
          (finalContactNo ? sessionStorage.getItem(`delivery_callBack_${finalContactNo}`) : null) ||
          localStorage.getItem("pos_current_callBack") ||
          ""
        ) : "";
        const finalCustomerName = masterData?.deliveryCustomerName || masterData?.vehicleCustomerName || masterData?.customerName || (orderPayload as any).deliveryCustomerName || orderPayload.customerName || (orderPayload as any).vehicleCustomerName || (isDeliveryOrder ? "DELIVERY CUSTOMER" : "WALK IN");
        const finalFlatNo = isDeliveryOrder ? (masterData?.flatNo || masterData?.flat || masterData?.flatNumber || (orderPayload as any).flatNo || "") : "";
        const finalBuildingNo = isDeliveryOrder ? (masterData?.buildingNo || masterData?.building || masterData?.buildingNumber || (orderPayload as any).buildingNo || "") : "";
        const finalBlockNo = isDeliveryOrder ? (masterData?.blockNo || masterData?.block || masterData?.blockNumber || (orderPayload as any).blockNo || "") : "";
        const finalRoadNo = isDeliveryOrder ? (masterData?.roadNo || masterData?.road || masterData?.roadNumber || masterData?.street || (orderPayload as any).roadNo || "") : "";
        const finalArea = isDeliveryOrder ? (masterData?.area || masterData?.areaName || (orderPayload as any).area || "") : "";
        const finalAddress = isDeliveryOrder ? (masterData?.address || masterData?.customerAddress || masterData?.deliveryAddress || "") : "";
        const finalVehicleNo = masterData?.vehicleNo || orderPayload.vehicleNo || "";
        const finalProviderNo = masterData?.providerNo || masterData?.providerOrderNo || orderPayload.providerNo || orderPayload.providerOrderNo || "";

        const rawKeepChange = isDeliveryOrder
          ? ((orderPayload.change && orderPayload.change !== "0.00" && orderPayload.change !== "0" && orderPayload.change !== "0.000")
              ? String(orderPayload.change)
              : ((masterData as any)?.change && (masterData as any)?.change !== "0.00" && (masterData as any)?.change !== "0" && (masterData as any)?.change !== "0.000")
              ? String((masterData as any)?.change)
              : ((masterData as any)?.keepChanges && (masterData as any)?.keepChanges !== "0.00" && (masterData as any)?.keepChanges !== "0" && (masterData as any)?.keepChanges !== "0.000")
              ? String((masterData as any)?.keepChanges)
              : ((origOrderMaster as any)?.change && (origOrderMaster as any)?.change !== "0.00" && (origOrderMaster as any)?.change !== "0" && (origOrderMaster as any)?.change !== "0.000")
              ? String((origOrderMaster as any)?.change)
              : ((origOrderMaster as any)?.keepChanges && (origOrderMaster as any)?.keepChanges !== "0.00" && (origOrderMaster as any)?.keepChanges !== "0" && (origOrderMaster as any)?.keepChanges !== "0.000")
              ? String((origOrderMaster as any)?.keepChanges)
              : undefined)
          : undefined;

        let resolvedDriver =
          masterData?.driverName ||
          masterData?.allocatedDriverName ||
          masterData?.driver ||
          masterData?.driverEmployeeName ||
          origOrderMaster?.driverName ||
          origOrderMaster?.allocatedDriverName ||
          origOrderMaster?.driver ||
          origOrderMaster?.driverEmployeeName ||
          "";

        if (!resolvedDriver && origOrderMaster && typeof origOrderMaster.details === "string") {
          const match = origOrderMaster.details.match(/\(Driver:\s*([^)]+)\)/i) || origOrderMaster.details.match(/Driver:\s*([A-Za-z0-9_\s]+)/i);
          if (match && match[1]) {
            resolvedDriver = match[1].trim();
          }
        }

        if (!resolvedDriver && masterData && typeof masterData.details === "string") {
          const match = masterData.details.match(/\(Driver:\s*([^)]+)\)/i) || masterData.details.match(/Driver:\s*([A-Za-z0-9_\s]+)/i);
          if (match && match[1]) {
            resolvedDriver = match[1].trim();
          }
        }

        const activeDriverId = masterData?.driverId || origOrderMaster?.driverId || orderPayload?.driverId;
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
            console.warn("[usePosCheckoutFlow] Failed to resolve driver name by id:", err);
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
            time: now.toLocaleTimeString('en-US', { hour12: true, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            customerName: finalCustomerName,
            driver: isDeliveryOrder ? (resolvedDriver || undefined) : undefined,
            driverName: isDeliveryOrder ? (resolvedDriver || undefined) : undefined,
            contactNo: isDeliveryOrder ? (finalContactNo || undefined) : undefined,
            callBack: isDeliveryOrder ? (finalCallBack || undefined) : undefined,
            change: isDeliveryOrder ? rawKeepChange : undefined,
            keepChanges: isDeliveryOrder ? rawKeepChange : undefined,
            flatNo: isDeliveryOrder ? (finalFlatNo || undefined) : undefined,
            buildingNo: isDeliveryOrder ? (finalBuildingNo || undefined) : undefined,
            blockNo: isDeliveryOrder ? (finalBlockNo || undefined) : undefined,
            roadNo: isDeliveryOrder ? (finalRoadNo || undefined) : undefined,
            area: isDeliveryOrder ? (finalArea || undefined) : undefined,
            address: isDeliveryOrder ? (finalAddress || undefined) : undefined,
            vehicleNo: finalVehicleNo,
            providerNo: finalProviderNo,
            payments: payments.map(p => {
              const matchedTender = (tenderOptions || []).find((t: any) => String(t.id) === String(p.paymodeId));
              return {
                name: matchedTender?.label || paymentNames[p.paymodeId] || "Other",
                amount: (p as any).tenderedAmount ?? p.amount
              };
            }),
            subTotal: (subtotal && subtotal > 0)
              ? subtotal
              : (masterData?.subTotal ?? (localStorage.getItem("printPrice") === "Exclusive" ? masterData?.vatExclAmount : undefined) ?? subtotal),
            discount: (totalDiscountAmount && totalDiscountAmount > 0)
              ? totalDiscountAmount
              : Number(masterData?.discAmount ?? masterData?.discount ?? 0),
            vatExclAmount: masterData?.vatExclAmount ?? (subtotal && totalDiscountAmount ? Math.max(0, subtotal - totalDiscountAmount) : undefined),
            billDiscountValue: orderPayload.billDiscountValue ?? orderPayload.billDiscount ?? undefined,
            discAmount: Number(masterData?.discAmount ?? totalDiscountAmount ?? 0),
            serviceCharge: isCombinedOrder ? totalServiceCharge : (Number(masterData?.serviceCharge || 0) > 0 ? Number(masterData.serviceCharge) : totalServiceCharge),
            levy: isCombinedOrder ? totalLevy : (Number(masterData?.levyAmt || masterData?.levy || 0) > 0 ? Number(masterData.levyAmt || masterData.levy) : totalLevy),
            charges: roundCalc(
              (isCombinedOrder ? totalServiceCharge : (Number(masterData?.serviceCharge || 0) > 0 ? Number(masterData.serviceCharge) : totalServiceCharge)) +
              (isCombinedOrder ? totalLevy : (Number(masterData?.levyAmt || masterData?.levy || 0) > 0 ? Number(masterData.levyAmt || masterData.levy) : totalLevy))
            ),
            netValue: (localStorage.getItem("printPrice") !== "Inclusive")
              ? roundCalc(
                  Math.max(
                    0,
                    ((subtotal && subtotal > 0) ? subtotal : (masterData?.subTotal ?? (localStorage.getItem("printPrice") === "Exclusive" ? masterData?.vatExclAmount : undefined) ?? subtotal)) -
                    ((totalDiscountAmount && totalDiscountAmount > 0) ? totalDiscountAmount : Number(masterData?.discAmount ?? masterData?.discount ?? 0))
                  ) +
                  roundCalc(
                    (isCombinedOrder ? totalServiceCharge : (Number(masterData?.serviceCharge || 0) > 0 ? Number(masterData.serviceCharge) : totalServiceCharge)) +
                    (isCombinedOrder ? totalLevy : (Number(masterData?.levyAmt || masterData?.levy || 0) > 0 ? Number(masterData.levyAmt || masterData.levy) : totalLevy))
                  )
                )
              : undefined,
            vatAmount: isCombinedOrder ? totalVat : ((totalVat && totalVat > 0) ? totalVat : (masterData?.vatAmount ?? totalVat)),
            deliveryCharge: isCombinedOrder ? deliveryCharge : (masterData?.deliveryCharge ?? deliveryCharge),
            netAmount: isCombinedOrder ? total : ((total && total > 0) ? total : (masterData?.netAmount ?? total)),
            changeAmount: settlementCashChangeRef.current > 0 ? settlementCashChangeRef.current : undefined,
            isSettlement: true,
            printPrice: (localStorage.getItem("printPrice") as any) || undefined,
            priceView: (localStorage.getItem("priceView") as any) || undefined,
            billArabic: isBillArabicEnabled(),
            isBillDiscount: isBillDisc
          }
        };

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
      isSettlingRef.current = false;
      dispatch(setIsSettling(false));
    }
  });

  const handleCompleteSettlement = useEvent(async (payments: { paymodeId: number, amount: number, tenderedAmount?: number }[], changeAmount: number) => {
    settlementCashChangeRef.current = Number(changeAmount) || 0;
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

    const authorizedEmpId = settlementEmployeeIdRef.current || (localStorage.getItem("authorizedEmployeeId") ? Number(localStorage.getItem("authorizedEmployeeId")) : null);
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
  });

  const handleCardCreditSettlement = useEvent(async (selectedPaymodeId: number, overrideEmployeeId?: number) => {
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
  });

  return {
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
