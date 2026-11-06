import { getTerminalBranchId } from "@shared/config/device";
import { buildSavedOrderLoad, dispatchSavedOrderLoad } from "../../../utils/savedOrderToCart";
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { toDisplayNo } from "../../../../services/orderResponse";
import { buildPrintPricing } from "../../../../utils/printPricing";
import { PosRecallDetailsModal } from "../order/PosRecallDetailsModal";
import { usePosRecall } from "../../../hooks/usePosRecall";
import { Printer, X, Plus } from "lucide-react";
import { formatAmount } from "../../../../../../utils/currency";
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../../../../../app/hooks';
import { setSectionId, setTableId, setGuestNo, clearCart, setOrderTypeByName, setTableNo, setWaiter } from '../../../store/posSlice';
import { dineInApi } from '../../../../services/dineInApi';
import { orderApi } from '../../../../services/orderApi';
import { menuApi, getCachedExtras } from '../../../../services/menuApi';
import { alternativesCache } from '../../../hooks/usePosProducts';
import { useToast } from '../../../../../../app/providers/useToast';
import { Loader, Modal } from '../../../../../../components/common';
import { GuestCountModal } from "./GuestCountModal";
import { generateGuestPrintHtml, isEnableVatGuestPrint } from '../../../../utils/guestPrintTemplate';
import { hasPrinterHeadings, notifyPrinterHeadingWarning } from '../../../../utils/printHeadingUtils';
import { printHtmlReceipt } from '../../../../services/qzService';
import { openDrawerIfCash } from '../../../../utils/cashDrawer';
import { printerSettingsApi } from '../../../../services/printerSettingsApi';
import {
  roundCalc,
  getPriceView,
  getPrintPrice,
  CALC_PRECISION,
} from '../../../utils/billing';
import { isBillArabicEnabled } from '../../../../utils/alternativeHelpers';
import { sortOrderDetailsBySequence } from '../../../utils/orderSort';
import { mapOrderDetailsToCartItems } from '../../../mappers/orderDetailToCartMapper';
import { getEmployeeNames, getEmployeeById } from "../../../../../general/employee/services/employeeService";
import { PosMultiPayModal, type MultiPaymentLine } from '../payment/PosMultiPayModal';
import { checkOrderHasBillDiscount } from '../../../utils/orderDiscountCheck';
import { EmployeePasswordModal } from '../system/EmployeePasswordModal';
import { useEmployeeAuthorization } from '../../../hooks/useEmployeeAuthorization';
import { useCashierLog } from '../../../../cashier';
import { usePosMasterData } from '../../../hooks/usePosQueries';
import { getRuntimePosConfig } from '../../../hooks/system/useTerminalInit';
import { buildSalesInvoicePayload } from '../../../mappers/invoicePayloadMapper';
import { salesInvoiceApi } from '../../../../services/salesInvoiceApi';
import {
  disableDefaultEmployeeConfig,
  isEmployeeNotFoundError,
  isDefaultEmployeeValidInCache,
} from '../../../../utils/defaultEmployee';
import type { DirectSettleOrderBase } from '../../../mappers/orderPayloadMapper';
import type {
  DineInTable,
  TableOrdersResponse,
  RecallOrder,
} from '../../../../types';

interface DineInTableOrdersModalProps {
  isOpen: boolean;
  table: DineInTable | null;
  sectionId: number;
  onClose: () => void;
  /** Called after EDIT/SETTLE so DineInPage can navigate away cleanly */
  onEditSuccess?: () => void;
  onSettleSuccess?: (orderId: number, amount: number) => void;
}


export const DineInTableOrdersModal: React.FC<DineInTableOrdersModalProps> = ({
  isOpen,
  table,
  sectionId,
  onClose,
  onEditSuccess,
  onSettleSuccess,
}) => {
  const dispatch = useAppDispatch();
  const productCache = useAppSelector((state) => state.pos.productCache);
  const editingOrderId = useAppSelector((state) => state.pos.editingOrderId);
  const navigate = useNavigate();
  const { showToast } = useToast();

  const { status } = useCashierLog();
  const { data: posMasterData } = usePosMasterData();
  const {
    authorizationModalKey,
    authorizationModalProps,
    requestAuthorization,
  } = useEmployeeAuthorization();

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<TableOrdersResponse | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [showGuestCount, setShowGuestCount] = useState(false);

  // Settle modal states
  const [isMultiPayOpen, setIsMultiPayOpen] = useState(false);
  const [isSettlingSubmit, setIsSettlingSubmit] = useState(false);
  const dineInSettlementEmployeeIdRef = useRef<number | null>(null);
  const [settleOrderData, setSettleOrderData] = useState<{
    orderId: number;
    master: any;
    mappedItems: any[];
    rawData: any;
  } | null>(null);

  const tenderOptions: { id: string; label: string }[] = useMemo(() => {
    const rawList =
      posMasterData?.paymodes ||
      (posMasterData as any)?.paymode ||
      (posMasterData as any)?.data?.paymodes ||
      [];

    const list = rawList.length > 0 ? rawList : [
      { paymodeId: 1, paymodeName: "Cash" },
      { paymodeId: 2, paymodeName: "Card" },
      { paymodeId: 3, paymodeName: "Credit" }
    ];

    return list
      .slice()
      .sort((a: any, b: any) => {
        const aIsCash = Number(a.paymodeId) === 1 || (a.paymodeName || "").toLowerCase().includes("cash");
        const bIsCash = Number(b.paymodeId) === 1 || (b.paymodeName || "").toLowerCase().includes("cash");
        if (aIsCash && !bIsCash) return -1;
        if (!aIsCash && bIsCash) return 1;
        return Number(a.paymodeId) - Number(b.paymodeId);
      })
      .map((p: any) => ({
        id: String(p.paymodeId),
        label: p.paymodeName,
      }));
  }, [posMasterData]);

  /* Fetch orders when modal opens + auto-refresh every 10 seconds */
  useEffect(() => {
    if (isOpen && table) {
      setSelectedOrderId(null);
      setData(null);
      void fetchOrders();

      const interval = setInterval(() => {
        void fetchOrders(true);
      }, 10000);

      return () => clearInterval(interval);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, table]);

  const fetchOrders = async (isSilent = false) => {
    if (!table) return;
    if (!isSilent) setLoading(true);
    try {
      const res = await dineInApi.getTableOrders(table.tableId);
      if (res.isSuccess && res.data) {
        setData(res.data);
        if (res.data.masterData.length > 0) {
          setSelectedOrderId(prev => prev !== null && res.data.masterData.some(m => m.orderId === prev) ? prev : res.data.masterData[0].orderId);
        }
      } else if (!isSilent) {
        showToast(res.message || 'Failed to load table orders', 'error');
      }
    } catch (e: any) {
      if (!isSilent) showToast(e.message || 'Error loading table orders', 'error');
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  const selectedMaster = data?.masterData.find(o => o.orderId === selectedOrderId) ?? null;
  /* ── Recall-style list. Row text = the Recall list's own text for the order (time, customer, employee…),
        matched by orderId; built from the table data only when the order is not in the Recall list. ── */
  const { orders: recallRows, fetchOrders: fetchRecallRows } = usePosRecall();
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  useEffect(() => {
    if (isOpen && table) void fetchRecallRows({ OrderTypeId: 1 });
  }, [isOpen, table, data, fetchRecallRows]);
  const recallRowById = useMemo(() => {
    const map = new Map<number, RecallOrder>();
    recallRows.forEach((r: any) => map.set(Number(r.orderId ?? r.OrderId), r));
    return map;
  }, [recallRows]);
  const rowText = (m: TableOrdersResponse["masterData"][number]): string => {
    const recall = recallRowById.get(Number(m.orderId));
    if (recall && typeof recall.details === "string" && recall.details.trim()) return recall.details;
    const section = m.sectionName ? ` Section : ${m.sectionName}` : "";
    const tableNo = m.tableNo ? ` TableNo : ${m.tableNo}` : "";
    return `Order : ${m.orderNo} Ticket : ${m.ticketNo} (DineIn)${section}${tableNo} Amnt : ${formatAmount(m.netAmount)}`;
  };
  const openDetails = (orderId: number) => {
    setSelectedOrderId(orderId);
    setIsDetailsOpen(true);
  };

  /* ── Check if table or order is marked as Reserved ── */
  const isTableReserved = useMemo(() => {
    // 1. Check table object properties and name
    if (
      table?.isReserved ||
      (table as any)?.isReserve ||
      (table as any)?.reserved ||
      (table?.status && String(table.status).toLowerCase() === 'reserved') ||
      ((table as any)?.tableStatus && String((table as any).tableStatus).toLowerCase() === 'reserved') ||
      ((table as any)?.reservationStatus && String((table as any).reservationStatus).toLowerCase() === 'reserved') ||
      /reserved/i.test(table?.tableName || '') ||
      /reservation/i.test(table?.tableName || '')
    ) {
      return true;
    }

    // 2. Check modal response data envelope
    if (
      (data as any)?.isReserved ||
      (data as any)?.isReserve ||
      (data as any)?.reserved ||
      ((data as any)?.status && String((data as any).status).toLowerCase() === 'reserved') ||
      ((data as any)?.tableStatus && String((data as any).tableStatus).toLowerCase() === 'reserved')
    ) {
      return true;
    }

    // 3. Check selectedMaster
    if (selectedMaster) {
      if (
        (selectedMaster as any).isReserved ||
        (selectedMaster as any).isReserve ||
        (selectedMaster as any).reserved ||
        ((selectedMaster as any).status && String((selectedMaster as any).status).toLowerCase() === 'reserved') ||
        ((selectedMaster as any).orderStatus && String((selectedMaster as any).orderStatus).toLowerCase() === 'reserved') ||
        ((selectedMaster as any).orderType && String((selectedMaster as any).orderType).toLowerCase() === 'reserved') ||
        ((selectedMaster as any).orderTypeName && String((selectedMaster as any).orderTypeName).toLowerCase() === 'reserved') ||
        /reserved/i.test((selectedMaster as any)?.note || '') ||
        /reservation/i.test((selectedMaster as any)?.note || '')
      ) {
        return true;
      }
    }

    // 4. Check any order in masterData
    if (data?.masterData && data.masterData.length > 0) {
      return data.masterData.some((m: any) =>
        m.isReserved ||
        m.isReserve ||
        m.reserved ||
        (m.status && String(m.status).toLowerCase() === 'reserved') ||
        (m.orderStatus && String(m.orderStatus).toLowerCase() === 'reserved') ||
        (m.orderType && String(m.orderType).toLowerCase() === 'reserved') ||
        (m.orderTypeName && String(m.orderTypeName).toLowerCase() === 'reserved') ||
        /reserved/i.test(m.note || '') ||
        /reservation/i.test(m.note || '')
      );
    }

    return false;
  }, [table, data, selectedMaster]);

  /* ── NEW — ask for guest count first (§1 autofocus / guest UX rule) ── */
  const handleNew = () => {
    if (!table) return;
    setShowGuestCount(true);
  };

  const handleNewGuestConfirm = (guestCount: number) => {
    if (!table) return;
    if (!editingOrderId) {
      dispatch(clearCart());
    }
    dispatch(setSectionId(sectionId));
    dispatch(setTableId(table.tableId));
    dispatch(setTableNo(table.tableName || table.tableId.toString()));
    dispatch(setGuestNo(guestCount));
    dispatch(setOrderTypeByName('DineIn'));
    setShowGuestCount(false);
    onClose();
    navigate('/pos', { state: { skipAutoDineIn: true } });
  };

  /* ── FULL ORDER MAPPER ── */
  const fetchAndMapFullOrder = async (orderId: number) => {
    const res = await orderApi.getOrderDetails(orderId, { orderType: "DineIn" });
    if (!res?.isSuccess || !res.data) throw new Error("Failed to fetch full order details");
    
    const fullOrder = res.data;
    const master = fullOrder.masterData || fullOrder;
    const details = sortOrderDetailsBySequence(fullOrder.detailsData || fullOrder.details || []);
    const modifiersData = fullOrder.modifiersData || fullOrder.modifiers || fullOrder.ModifiersData || fullOrder.Modifiers || [];

    // Ensure alternatives are fetched and cached for products in this order
    const safeOrderTypeId = master.orderTypeId || 1;
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

    // Deduplicate modifiersData (SQL Cartesian fix)
    const seenMods = new Set<string>();
    const dedupedModifiers = modifiersData.filter((m: any) => {
      const mMapId = m.mapId ?? m.MapId ?? m.mapID ?? 0;
      const mModId = m.modifierId ?? m.ModifierId ?? m.id ?? m.Id ?? 0;
      const key = `${mMapId}-${mModId}`;
      if (seenMods.has(key)) return false;
      seenMods.add(key);
      return true;
    });

    const priceView = getPriceView();

    const masterDiscPer = Number(master.discPer ?? master.DiscPer ?? 0);
    const lineDiscountsSum = details.reduce((sum: number, d: any) => sum + Number(d.discAmount ?? d.DiscAmount ?? 0), 0);
    const resolvedDiscount = Number(master.discAmount ?? master.DiscAmount ?? master.discount ?? lineDiscountsSum);
    const netAmount = Number(master.netAmount ?? master.NetAmount ?? 0);

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
      (!hasLineItemDiscounts && resolvedDiscount > 0) ||
      (hasLineItemDiscounts && resolvedDiscount > lineDiscountsSum + 0.001) ||
      checkOrderHasBillDiscount({ master, details });

    const mappedItems = mapOrderDetailsToCartItems(details, dedupedModifiers, {
      productCache,
      priceView,
      masterDiscPer: isBillComplimentary ? 100 : masterDiscPer,
      isOrderBillDiscount: isBillLevelDiscount,
      orderType: 'DineIn',
      products: (posMasterData as any)?.products,
    });

    return { master, mappedItems, fullOrder, isBillComplimentary, isBillLevelDiscount, masterDiscPer, resolvedDiscount, lineDiscountsSum };
  };

  /* ── EDIT — load selected order into cart ── */
  const handleEdit = async () => {
    if (!selectedMaster || !data || loading) return;
    try {
      // fetchAndMapFullOrder also pre-loads the product alternatives the cart needs.
      const { master, fullOrder } = await fetchAndMapFullOrder(selectedMaster.orderId);
      // Shared saved-order loader (savedOrderToCart.ts) — same code as Recall / Settled → Edit.
      // This copy used to rebuild the footer from the legacy pricing and pass the bill discount raw.
      const load = buildSavedOrderLoad(fullOrder, {
        mode: "recallEdit",
        orderId: selectedMaster.orderId,
        products: (posMasterData as any)?.products,
        productCache,
        orderTypeHints: ["DineIn"],
      });
      // Table screen specifics (kept from the old loader): the table chosen here, the order's waiter, Dine-In.
      Object.assign(load.payload, {
        orderTypeId: master.orderTypeId || 1,
        orderTypeName: 'DineIn',
        sectionId,
        tableId: table!.tableId,
        deliveryCharge: master.deliveryCharge || 0,
        waiterName: master.employeeName ?? "Waiter",
      });
      load.deliveryDetails = null;
      dispatchSavedOrderLoad(load, dispatch, selectedMaster.orderId);
      showToast(`Order #${selectedMaster.orderNo} loaded for editing`, 'success');
      onEditSuccess?.();
      onClose();
      navigate('/pos', { state: { skipAutoDineIn: true } });
    } catch {
      showToast('Failed to load full order for editing', 'error');
    }
  };

  /* ── SETTLE — open MultiPay modal for settlement ── */
  const handleSettle = async () => {
    if (!selectedMaster || !data || loading) return;
    try {
      setLoading(true);
      const targetOrderId = selectedMaster.orderId;
      const { master, mappedItems, fullOrder } = await fetchAndMapFullOrder(targetOrderId);
      const rawUpdatedAt = master.updatedAt || master.updated_at || master.prevUpdatedAt || master.createdAt || master.created_at || master.voucherDate;
      const prevUpdatedAt = rawUpdatedAt ? String(rawUpdatedAt) : undefined;
      if (prevUpdatedAt) {
        sessionStorage.setItem(`order_prevUpdatedAt_${targetOrderId}`, prevUpdatedAt);
      }

      const openMultiPay = (empId: number) => {
        dineInSettlementEmployeeIdRef.current = empId;
        localStorage.setItem("authorizedEmployeeId", String(empId));
        setSettleOrderData({
          orderId: targetOrderId,
          master,
          mappedItems,
          rawData: fullOrder,
        });
        setIsMultiPayOpen(true);
      };

      let config: any = null;
      try {
        config = await getRuntimePosConfig();
      } catch {}

      // 1. If order master already has a valid employee
      if (master.employeeId && Number(master.employeeId) > 0) {
        if (!isDefaultEmployeeValidInCache(Number(master.employeeId))) {
          showToast("The order's waiter was not found in this branch. Please authorize settlement.", "warning");
          requestAuthorization({
            actionLabel: "Settlement",
            permissionId: 19, // Settle
            bypassDefaultEmployee: true,
            onAuthorized: (authEmpId) => openMultiPay(authEmpId),
          });
          return;
        }
        openMultiPay(Number(master.employeeId));
        return;
      }

      // 2. Default employee configuration
      const defaultEmployeeEnabled = config?.defaultEmployee === "Enable";
      const defaultEmployeeId = Number(config?.employeeId ?? 0);

      if (defaultEmployeeEnabled && defaultEmployeeId > 0) {
        if (!isDefaultEmployeeValidInCache(defaultEmployeeId)) {
          disableDefaultEmployeeConfig("Default employee not found in branch employees cache");
          showToast("Configured default employee was not found in this branch and has been disabled. Please authorize settlement.", "warning");
          requestAuthorization({
            actionLabel: "Settlement",
            permissionId: 19, // Settle
            bypassDefaultEmployee: true,
            onAuthorized: (authEmpId) => openMultiPay(authEmpId),
          });
          return;
        }
        openMultiPay(defaultEmployeeId);
        return;
      }

      if (defaultEmployeeEnabled && (!Number.isFinite(defaultEmployeeId) || defaultEmployeeId <= 0)) {
        disableDefaultEmployeeConfig("Invalid default employee ID in configuration");
        showToast("Default employee was not configured properly and has been disabled. Please authorize settlement.", "warning");
        requestAuthorization({
          actionLabel: "Settlement",
          permissionId: 19, // Settle
          bypassDefaultEmployee: true,
          onAuthorized: (authEmpId) => openMultiPay(authEmpId),
        });
        return;
      }

      // 3. Ask for employee code / authorization right when clicking Settle!
      requestAuthorization({
        actionLabel: "Settlement",
        permissionId: 19, // Settle
        bypassDefaultEmployee: true,
        onAuthorized: (authEmpId) => openMultiPay(authEmpId),
      });
    } catch (e: any) {
      console.error("[DineInTableOrdersModal] Failed to load full order for settlement:", e);
      showToast(e?.message || 'Failed to load order for settlement', 'error');
    } finally {
      setLoading(false);
    }
  };

  /* ── SUBMIT SETTLEMENT TO API & PRINT ── */
  const executeSettlement = async (
    employeeId: number,
    mappedPayments: { paymodeId: number; amount: number; paymodeName?: string }[],
    changeAmount: number
  ) => {
    if (!settleOrderData || !selectedMaster || !table) return;
    setIsSettlingSubmit(true);

    try {
      const targetOrderId = settleOrderData.orderId || selectedMaster.orderId;
      // Settle from the STORED (exclusive) order values — never from the display copy, which may be
      // converted to the Inclusive view. No re-derivation, no guessing: the invoice carries exactly
      // what the backend saved for this order.
      const storedRes = await orderApi.getOrderDetails(targetOrderId, { priceView: "Exclusive" });
      const rawOrder = storedRes?.data;
      if (!rawOrder || !Array.isArray(rawOrder.detailsData)) {
        throw new Error("Could not load the saved order for settlement. Please try again.");
      }
      const master = { ...(settleOrderData.rawData?.masterData || {}), ...(rawOrder.masterData || {}) };
      const details = sortOrderDetailsBySequence(rawOrder.detailsData || []);
      const modifiersData = rawOrder.modifiersData || [];

      const rawTransDate = status?.transDate || localStorage.getItem("transDate") || new Date().toISOString();
      const activeTransDate = rawTransDate.split("T")[0];

      const lineDiscountsSum = details.reduce((sum: number, d: any) => sum + Number(d.discAmount ?? d.DiscAmount ?? 0), 0);
      const resolvedDiscAmount = Math.max(Number(master.discAmount ?? master.DiscAmount ?? master.discount ?? 0), lineDiscountsSum);

      const mappedDetails = details.map((d: any) => {
        const qty = Number(d.qty ?? d.Qty ?? 1);
        const price = Number(d.price ?? d.Price ?? 0);
        const amount = Number(d.amount ?? d.Amount ?? price * qty);
        const discAmount = Number(d.discAmount ?? d.DiscAmount ?? 0);
        const serviceCharge = Number(d.serviceCharge ?? d.ServiceCharge ?? 0);
        const levy = Number(d.levy ?? d.Levy ?? 0);
        const vatAmount = Number(d.vatAmount ?? d.VatAmount ?? 0);
        const discPer = Number(d.discPer ?? d.DiscPer ?? 0);
        return {
          productId: d.productId || d.itemId || 0,
          unitId: d.unitId || 1,
          qty,
          price,
          basePrice: price,
          exclusivePrice: price,
          isPriceTaxExclusive: true,
          discPer,
          discAmount,
          serviceCharge,
          levy,
          vatId: d.vatId || 0,
          vatAmount,
          netAmount: roundCalc(Math.max(0, amount - discAmount + serviceCharge + levy + vatAmount)),
          mapId: d.mapId || 0,
          complimentaryStatus: Boolean(d.complimentaryStatus || d.ComplimentaryStatus || discPer === 100),
          baseQty: d.baseQty || qty || 1,
        };
      });

      // Stored modifier rows: extras carry their exclusive price, plain modifiers carry 0.
      const mappedModifiers = modifiersData.map((m: any) => {
        const price = Number(m.price ?? m.Price ?? 0);
        const qty = m.qty || 1;
        const isExtras = price > 0 || (m.status || "").toLowerCase() === "extras";
        return {
          mapId: m.mapId,
          modifierId: m.modifierId,
          qty,
          price,
          amount: isExtras ? roundCalc(price * qty, CALC_PRECISION) : 0,
          typeId: m.typeId || 0,
          modifierName: m.modifierName || "",
          arabicName: m.arabicName || "",
          status: m.status || (isExtras ? "extras" : "modifier"),
        };
      });

      // Totals are the sums of the stored detail rows (detail amount already includes extras).
      const calculatedVatExcl = roundCalc(
        mappedDetails.reduce((sum: number, d: any) => sum + (d.price * d.qty - d.discAmount + d.serviceCharge + d.levy), 0)
      );
      const calculatedVatAmt = roundCalc(mappedDetails.reduce((sum: number, d: any) => sum + d.vatAmount, 0));
      const isComplimentary = Boolean(
        master.complimentaryStatus ||
        master.ComplimentaryStatus ||
        Number(master.discPer ?? master.DiscPer ?? 0) === 100
      );

      const isBillLevelDiscount = Boolean(
        isComplimentary ||
        Number(master.discPer ?? master.DiscPer ?? 0) > 0 ||
        Number(master.billDiscountValue || 0) > 0 ||
        checkOrderHasBillDiscount({ master, details: mappedDetails })
      );

      const directSettleOrder: DirectSettleOrderBase = {
        orderId: targetOrderId,
        customerId: master.customerId || 1,
        employeeId,
        transDate: master.transDate || master.voucherDate || activeTransDate,
        discAmount: resolvedDiscAmount,
        discPer: Number(master.discPer ?? master.DiscPer ?? 0),
        billDiscount: master.billDiscount || master.billDiscountValue || resolvedDiscAmount,
        billDiscountValue: master.billDiscountValue || resolvedDiscAmount,
        billDiscountType: master.billDiscountType || (Number(master.discPer) > 0 ? "percentage" : "amount"),
        isBillDiscount: Boolean(master.isBillDiscount || isBillLevelDiscount),
        complimentaryStatus: isComplimentary,
        serviceCharge: Number(master.serviceCharge ?? (master as any).ServiceCharge ?? 0),
        levy: Number(master.levyAmt ?? master.levy ?? (master as any).Levy ?? 0),
        vatExclAmount: calculatedVatExcl,
        vatAmount: calculatedVatAmt,
        netAmount: master.netAmount || selectedMaster.netAmount,
        deliveryCharge: master.deliveryCharge || 0,
        updatedAt: new Date().toISOString(),
        prevUpdatedAt:
          sessionStorage.getItem(`order_prevUpdatedAt_${targetOrderId}`) ||
          master.prevUpdatedAt ||
          master.updatedAt ||
          undefined,
        orderTypeId: master.orderTypeId || 1,
        sectionId: Number(master.sectionId || sectionId || 0),
        tableId: Number(master.tableId || table.tableId || 0),
        tableNo: master.tableNo || table.tableName || "",
        guestNo: master.guestNo || 0,
        vehicleCustomerName: master.vehicleCustomerName || "",
        vehicleNo: master.vehicleNo || "",
        addressId: master.addressId || 0,
        missedCall: master.missedCall || false,
        contactNo: master.mobileNo || master.contactNo || "",
        note: master.note || "",
        change: String(changeAmount || "0.00"),
        isComing: master.isComing || false,
        comingTime: master.comingTime || new Date().toISOString(),
        providerId: master.providerId || 0,
        providerOrderNo: master.providerOrderNo || "",
        providerNo: master.providerNo || "",
        driverId: master.driverId || 0,
        details: mappedDetails,
        modifiers: mappedModifiers,
        voidProducts: [],
        voidModifiers: [],
        combinedOrderIds: [],
      };

      const salesPayload = buildSalesInvoicePayload({
        orderPayload: directSettleOrder,
        payments: mappedPayments,
        employeeId,
        dayId: status?.dayId || 1,
        shiftId: status?.shiftId || 1,
        transDate: activeTransDate,
        editingSaleId: 0,
        isOrderEdited: false,
        tenderOptions,
      });

      const createRes = await salesInvoiceApi.createSalesInvoice(salesPayload);
      let invoiceNoStr: string | undefined = undefined;
      let settledSaleId: number | undefined = typeof createRes === 'number' ? createRes : undefined;
      if (createRes && typeof createRes === 'object') {
        settledSaleId = createRes.id ?? createRes.saleId ?? undefined;
        const vNo = createRes.voucherNo ?? createRes.invoiceNo ?? createRes.voucherNumber ?? createRes.saleNo;
        if (vNo) invoiceNoStr = String(vNo);
      }

      await openDrawerIfCash(mappedPayments, tenderOptions, (reason) =>
        showToast(`Order settled, but the cash drawer did not open: ${reason}`, "warning")
      );

      // Try printing settled receipt
      try {
        const enableVat = isEnableVatGuestPrint();

        // Resolve employee name for settle print
        const settleRawEmpId = master.employeeId ?? master.empId ?? master.waiterId ?? employeeId;
        const settleWaiter = await resolveEmployeeNameForPrint(settleRawEmpId, master.employeeName);

        // Resolve customer name for settle print
        const settleCustomer =
          master.deliveryCustomerName ||
          master.vehicleCustomerName ||
          master.customerName ||
          master.customer ||
          "CASH CUSTOMER";

        const printPriceSetting = getPrintPrice();
        const isTaxInclusive = printPriceSetting === "Inclusive";

        const unified = buildPrintPricing(settleOrderData.rawData || settleOrderData.mappedItems, {
          dataView: getPriceView(),
          orderType: "DineIn",
          printPrice: printPriceSetting,
          allExtras: getCachedExtras(),
        });

        const printMappedItems = unified.lines.map((l) => ({
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
          itemDiscount: unified.summary.isBillDiscount ? 0 : l.lineDiscount,
          lineTotal: l.getAmount(isTaxInclusive, unified.summary.isBillDiscount),
          lineNetAmount: l.inclusiveAmount,
          basePrice: l.exclusiveRate,
          vatAmount: l.vatAmount,
        }));

        const isDineInBillDisc = unified.summary.isBillDiscount;
        const settleDiscount = isDineInBillDisc
          ? Number(
              isTaxInclusive
                ? (unified.summary.totalDiscountIncl ?? (typeof unified.summary.getTotalDiscount === "function" ? unified.summary.getTotalDiscount(true) : (master.discAmount ?? master.discount ?? 0)))
                : (unified.summary.totalDiscountExcl ?? (typeof unified.summary.getTotalDiscount === "function" ? unified.summary.getTotalDiscount(false) : (master.discAmount ?? master.discount ?? 0)))
            )
          : 0;
        const settleSubTotal = Number(
          isTaxInclusive
            ? (unified.summary.subTotalInclusive > 0
                ? unified.summary.subTotalInclusive
                : (typeof unified.summary.getSubTotal === "function" ? unified.summary.getSubTotal(true) : (master.subTotal ?? 0)))
            : (unified.summary.subTotalExclusive > 0
                ? unified.summary.subTotalExclusive
                : (typeof unified.summary.getSubTotal === "function" ? unified.summary.getSubTotal(false) : (master.vatExclAmount !== undefined ? Number(master.vatExclAmount) + settleDiscount : (master.subTotal ?? 0))))
        );
        const settleResolvedVat = Number(
          (unified?.summary.vatAmount && unified.summary.vatAmount > 0)
            ? unified.summary.vatAmount
            : (master.vatAmount ?? master.VatAmount ?? 0)
        );

        const printData: any = {
          orderNo: master.orderNo ?? String(master.orderId),
          ticketNo: toDisplayNo(master.ticketNo) ?? "",
          invoiceNo: invoiceNoStr,
          saleId: settledSaleId,
          waiter: settleWaiter,
          counter: "Main",
          section: master.sectionName || "DINE IN",
          table: table.tableName || "",
          orderType: "DINE IN",
          customerName: settleCustomer,
          date: new Date().toLocaleDateString('en-GB'),
          time: new Date().toLocaleTimeString('en-US', { hour12: true, hour: '2-digit', minute: '2-digit' }),
          subTotal: settleSubTotal,
          discount: settleDiscount,
          serviceCharge: Number(master.serviceCharge ?? unified.summary.serviceCharge ?? 0),
          levy: Number(master.levyAmt ?? master.levy ?? (master as any).Levy ?? unified.summary.levy ?? 0),
          charges: roundCalc(Number(master.serviceCharge ?? unified.summary.serviceCharge ?? 0) + Number(master.levyAmt ?? master.levy ?? (master as any).Levy ?? unified.summary.levy ?? 0)),
          netValue: (getPrintPrice() !== "Inclusive") ? roundCalc(Math.max(0, settleSubTotal - settleDiscount) + roundCalc(Number(master.serviceCharge ?? unified.summary.serviceCharge ?? 0) + Number(master.levyAmt ?? master.levy ?? (master as any).Levy ?? unified.summary.levy ?? 0))) : undefined,
          vatAmount: settleResolvedVat,
          netAmount: unified.summary.grandTotal,
          deliveryCharge: master.deliveryCharge || 0,
          changeAmount: changeAmount,
          payments: mappedPayments.map((p) => ({
            name:
              tenderOptions.find((t: any) => String(t.id) === String(p.paymodeId))?.label ||
              p.paymodeName ||
              "Other",
            amount: p.amount,
          })),
          isSettlement: true,
          enableVat,
          printPrice: getPrintPrice(),
          priceView: getPriceView(),
          isBillDiscount: unified.summary.isBillDiscount,
          billArabic:
            isBillArabicEnabled() ||
            printMappedItems.some((it: any) =>
              Boolean(it.product?.arabicName || it.variantArabic || (it as any).altArabic)
            ),
        };

        const htmlContent = await generateGuestPrintHtml(unified as any, printData);
        let billPrinter: string | undefined;
        try {
          const settingsRes = await printerSettingsApi.getGeneral();
          const gen = settingsRes?.data;
          billPrinter = gen?.androidBillPrinter || gen?.billPrinter || gen?.androidKOTPrinter || gen?.kotPrinter;
        } catch (err) {
          console.warn("[DineInTableOrdersModal] Could not fetch general printer settings:", err);
        }

        if (!billPrinter || billPrinter === "No Printer") {
          billPrinter =
            localStorage.getItem('cachedBillPrinter') ||
            localStorage.getItem('cachedBillPrinterIp') ||
            localStorage.getItem('cachedKotPrinter') ||
            localStorage.getItem('cachedKotPrinterIp') ||
            localStorage.getItem('printerIpAddress') ||
            undefined;
        }

        if (billPrinter) {
          await printHtmlReceipt(htmlContent, billPrinter);
        }
      } catch (printErr: any) {
        console.warn("[DineInTableOrdersModal] Receipt print warning:", printErr);
        showToast("Order settled, but receipt print failed", "warning");
      }

      const settledOrderId = targetOrderId;
      const settledNetAmount = selectedMaster.netAmount;

      showToast(`Order #${selectedMaster.orderNo} settled successfully!`, 'success');
      dispatch(clearCart());
      setIsMultiPayOpen(false);
      setSettleOrderData(null);
      dineInSettlementEmployeeIdRef.current = null;

      // Refresh table orders
      try {
        const res = await dineInApi.getTableOrders(table.tableId);
        // Exclude the settled order in case of any database read lag
        const freshOrders = (res?.data?.masterData || []).filter(o => o.orderId !== settledOrderId);
        if (freshOrders.length > 0) {
          setData({
            ...res.data,
            masterData: freshOrders,
          });
          setSelectedOrderId(freshOrders[0].orderId);
          onSettleSuccess?.(settledOrderId, settledNetAmount);
        } else {
          onSettleSuccess?.(settledOrderId, settledNetAmount);
          onClose();
        }
      } catch {
        const remainingOrders = (data?.masterData || []).filter(o => o.orderId !== settledOrderId);
        if (remainingOrders.length > 0) {
          setData(prev => prev ? { ...prev, masterData: remainingOrders } : null);
          setSelectedOrderId(remainingOrders[0].orderId);
          onSettleSuccess?.(settledOrderId, settledNetAmount);
        } else {
          onSettleSuccess?.(settledOrderId, settledNetAmount);
          onClose();
        }
      }
      return { success: true, isEmployeeNotFound: false };
    } catch (err: any) {
      console.error("[DineInTableOrdersModal] Settlement failed:", err);
      const isEmployeeError = isEmployeeNotFoundError(err);
      if (isEmployeeError) {
        disableDefaultEmployeeConfig("Dine In settlement rejected employeeId: not found or invalid.");
        dispatch(setWaiter({ waiterId: null, waiterName: null }));
        const errorMsg = "The configured default employee was not found in the system and has been disabled. Please select an employee to authorize settlement.";
        showToast(errorMsg, "warning");
        return { success: false, isEmployeeNotFound: true };
      }
      const msg = err.response?.data?.message || err.message || "Failed to settle order";
      showToast(msg, "error");
      return { success: false, isEmployeeNotFound: false };
    } finally {
      setIsSettlingSubmit(false);
    }
  };

  /* ── MultiPay Modal Submission Handler ── */
  const handleMultiPaySubmit = async (payments: MultiPaymentLine[], changeAmount: number) => {
    if (!settleOrderData) return;

    if (!status || status.isDayClosed || status.isShiftClosed) {
      showToast("Cashier day or shift is closed. Please open a shift first.", "error");
      return;
    }

    const mappedPayments = payments.map((p) => {
      const isCash = (p.label || "").toLowerCase().includes("cash");
      const finalAmount = isCash ? Math.max(0, p.amount - changeAmount) : p.amount;
      let pid = Number(p.paymodeId);
      if (!pid || isNaN(pid) || pid <= 0) {
        const cashTender = tenderOptions.find((t: any) => (t.label || "").toLowerCase().includes("cash"));
        pid = cashTender ? Number(cashTender.id) : 1;
      }
      return {
        paymodeId: pid,
        paymodeName: p.label,
        amount: roundCalc(finalAmount),
      };
    });

    const isCreditPayment = mappedPayments.some((p) => {
      const tender = tenderOptions.find((t: any) => String(t.id) === String(p.paymodeId));
      const label = (tender?.label || p.paymodeName || "").toLowerCase();
      return label.includes("credit") && !label.includes("multi");
    });

    const master = settleOrderData.master;
    const resolvedCustomerId = master.customerId || 1;
    if (isCreditPayment && (!resolvedCustomerId || Number(resolvedCustomerId) === 1)) {
      showToast("Credit payment is not allowed for Cash Customer. Please select a customer first.", "warning");
      return;
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
    const authorizedEmpId = dineInSettlementEmployeeIdRef.current || (localStorage.getItem("authorizedEmployeeId") ? Number(localStorage.getItem("authorizedEmployeeId")) : null);
    let effectiveEmployeeId = (authorizedEmpId && authorizedEmpId > 0)
      ? authorizedEmpId
      : (master.employeeId && Number(master.employeeId) > 0)
      ? Number(master.employeeId)
      : (defaultEmployeeEnabled && defaultEmployeeId > 0 ? defaultEmployeeId : null);

    if (effectiveEmployeeId && !master.employeeId && !authorizedEmpId && defaultEmployeeEnabled) {
      if (!isDefaultEmployeeValidInCache(defaultEmployeeId)) {
        disableDefaultEmployeeConfig("Default employee not found in branch employees cache");
        dispatch(setWaiter({ waiterId: null, waiterName: null }));
        showToast("Configured default employee was not found in this branch and has been disabled. Please authorize settlement.", "warning");
        effectiveEmployeeId = null;
      }
    }

    if (effectiveEmployeeId) {
      const res: any = await executeSettlement(effectiveEmployeeId, mappedPayments, changeAmount);
      if (res && res.isEmployeeNotFound) {
        requestAuthorization({
          actionLabel: "Settlement",
          permissionId: 19, // Settle
          bypassDefaultEmployee: true,
          onAuthorized: (authEmpId: number) => executeSettlement(authEmpId, mappedPayments, changeAmount),
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
      onAuthorized: (authEmpId: number) => executeSettlement(authEmpId, mappedPayments, changeAmount),
    });
  };

  /* ── Resolve employee name (multi-step: cache → auth → API list → API by ID → localStorage) ── */
  const resolveEmployeeNameForPrint = async (
    empId?: number | string | null,
    currentName?: string | null
  ): Promise<string> => {
    if (
      currentName &&
      typeof currentName === "string" &&
      !["waiter", "cashier", "null", "undefined", ""].includes(currentName.trim().toLowerCase())
    ) {
      return currentName.trim();
    }

    const idStr = empId !== undefined && empId !== null ? String(empId).trim() : "";
    if (idStr && idStr !== "0" && idStr !== "NaN") {
      // 1. Try local cache posEmpNameMap
      try {
        const mapRaw = localStorage.getItem("posEmpNameMap");
        if (mapRaw) {
          const map = JSON.parse(mapRaw);
          if (map[idStr] && !["waiter", "cashier"].includes(String(map[idStr]).trim().toLowerCase())) {
            return String(map[idStr]).trim();
          }
        }
      } catch {}

      // 2. Try authorized employee if ID matches
      if (idStr === localStorage.getItem("authorizedEmployeeId")) {
        const authName = localStorage.getItem("authorizedEmployeeName");
        if (authName && !["waiter", "cashier"].includes(authName.trim().toLowerCase())) {
          return authName.trim();
        }
      }

      // 3. Try fetching branch employee names
      try {
        const branchId =
          getTerminalBranchId() || 0;
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
          if (map[idStr] && !["waiter", "cashier"].includes(String(map[idStr]).trim().toLowerCase())) {
            return String(map[idStr]).trim();
          }
        }
      } catch (e) {
        console.warn("[DineInTableOrdersModal] getEmployeeNames fallback failed:", e);
      }

      // 4. Try fetching individual employee by ID
      try {
        const numId = parseInt(idStr, 10);
        if (!isNaN(numId) && numId > 0) {
          const empDetail = await getEmployeeById(numId);
          const name = (empDetail as any)?.empName || (empDetail as any)?.name || (empDetail as any)?.firstName;
          if (name && !["waiter", "cashier"].includes(String(name).trim().toLowerCase())) {
            return String(name).trim();
          }
        }
      } catch (e) {
        console.warn("[DineInTableOrdersModal] getEmployeeById fallback failed:", e);
      }
    }

    // 5. Try localStorage fallbacks
    const defName = localStorage.getItem("defaultEmployeeName");
    if (defName && !["waiter", "cashier"].includes(defName.trim().toLowerCase())) return defName.trim();
    const authName = localStorage.getItem("authorizedEmployeeName");
    if (authName && !["waiter", "cashier"].includes(authName.trim().toLowerCase())) return authName.trim();
    const empName = localStorage.getItem("employeeName");
    if (empName && !["waiter", "cashier"].includes(empName.trim().toLowerCase())) return empName.trim();

    return (currentName && currentName.trim()) || "Waiter";
  };

  /* ── GUEST PRINT ── */
  const handlePrint = async (orderIdArg?: number) => {
    const printMaster = (orderIdArg ? data?.masterData.find((m) => m.orderId === orderIdArg) : null) ?? selectedMaster;
    if (!printMaster || !data || loading) return;

    if (!hasPrinterHeadings()) {
      notifyPrinterHeadingWarning(showToast);
    }

    try {
      showToast(`Preparing receipt for Order #${printMaster.orderNo}...`, 'success');

      const { master, fullOrder } = await fetchAndMapFullOrder(printMaster.orderId);

      const enableVat = isEnableVatGuestPrint();

      // ── Resolve date/time ──
      const isValidDateStr = (s: any) => {
        if (!s || typeof s !== 'string') return false;
        if (s.startsWith('0001')) return false;
        return true;
      };
      const candidateDates = [
        master.voucherDate, master.orderDate, master.transDate, master.createdAt,
      ];
      const resolvedDateStr = candidateDates.find(isValidDateStr);
      let printDate: string | undefined;
      let printTime: string | undefined;
      if (resolvedDateStr) {
        try {
          const d = new Date(resolvedDateStr);
          if (!isNaN(d.getTime()) && d.getFullYear() >= 2000) {
            printDate = d.toLocaleDateString('en-GB');
            printTime = d.toLocaleTimeString('en-US', { hour12: true, hour: '2-digit', minute: '2-digit' });
          }
        } catch {}
      }
      if (!printDate) {
        const now = new Date();
        printDate = now.toLocaleDateString('en-GB');
        printTime = now.toLocaleTimeString('en-US', { hour12: true, hour: '2-digit', minute: '2-digit' });
      }

      // ── Resolve employee name ──
      const rawEmpId = master.employeeId ?? master.empId ?? master.waiterId;
      const resolvedWaiter = await resolveEmployeeNameForPrint(rawEmpId, master.employeeName);

      // ── Resolve customer name ──
      const resolvedCustomerName =
        master.deliveryCustomerName ||
        master.vehicleCustomerName ||
        master.customerName ||
        master.customer ||
        "CASH CUSTOMER";

      const printPriceSetting = getPrintPrice();
      const isTaxInclusive = printPriceSetting === "Inclusive";

      const unified = buildPrintPricing(fullOrder, {
        dataView: getPriceView(),
        orderType: "DineIn",
        printPrice: printPriceSetting,
        allExtras: getCachedExtras(),
        isVatActive: enableVat,
      });

      const printMappedItems = unified.lines.map((l) => ({
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
        itemDiscount: unified.summary.isBillDiscount ? 0 : l.lineDiscount,
        lineTotal: l.getAmount(isTaxInclusive, unified.summary.isBillDiscount),
        lineNetAmount: l.inclusiveAmount,
        basePrice: l.exclusiveRate,
        vatAmount: l.vatAmount,
      }));

      const resolvedDiscount = Number(
        isTaxInclusive
          ? (unified.summary.totalDiscountIncl ?? (typeof unified.summary.getTotalDiscount === "function" ? unified.summary.getTotalDiscount(true) : (master.discAmount ?? master.discount ?? 0)))
          : (unified.summary.totalDiscountExcl ?? (typeof unified.summary.getTotalDiscount === "function" ? unified.summary.getTotalDiscount(false) : (master.discAmount ?? master.discount ?? 0)))
      );
      const resolvedSubTotal = Number(
        isTaxInclusive
          ? (unified.summary.subTotalInclusive > 0
              ? unified.summary.subTotalInclusive
              : (typeof unified.summary.getSubTotal === "function" ? unified.summary.getSubTotal(true) : (master.subTotal ?? 0)))
          : (unified.summary.subTotalExclusive > 0
              ? unified.summary.subTotalExclusive
              : (typeof unified.summary.getSubTotal === "function" ? unified.summary.getSubTotal(false) : (master.vatExclAmount !== undefined ? Number(master.vatExclAmount) + resolvedDiscount : (master.subTotal ?? 0))))
      );
      const resolvedVatAmount = Number(
        (unified?.summary.vatAmount && unified.summary.vatAmount > 0)
          ? unified.summary.vatAmount
          : (master.vatAmount ?? master.VatAmount ?? 0)
      );

      const billArabic =
        isBillArabicEnabled() ||
        printMappedItems.some((it: any) =>
          Boolean(it.product?.arabicName || it.variantArabic || (it as any).altArabic)
        );

      const printData: any = {
        orderNo: master.orderNo ?? String(master.orderId),
        ticketNo: toDisplayNo(master.ticketNo) ?? "",
        waiter: resolvedWaiter,
        counter: "Main",
        section: master.sectionName || "DINE IN",
        table: table?.tableName || "",
        orderType: "DINE IN",
        customerName: resolvedCustomerName,
        date: printDate,
        time: printTime,
        subTotal: resolvedSubTotal,
        discount: resolvedDiscount,
        serviceCharge: Number(master.serviceCharge ?? unified.summary.serviceCharge ?? 0),
        levy: Number(master.levyAmt ?? master.levy ?? (master as any).Levy ?? unified.summary.levy ?? 0),
        charges: roundCalc(Number(master.serviceCharge ?? unified.summary.serviceCharge ?? 0) + Number(master.levyAmt ?? master.levy ?? (master as any).Levy ?? unified.summary.levy ?? 0)),
        netValue: (getPrintPrice() !== "Inclusive") ? roundCalc(Math.max(0, resolvedSubTotal - resolvedDiscount) + roundCalc(Number(master.serviceCharge ?? unified.summary.serviceCharge ?? 0) + Number(master.levyAmt ?? master.levy ?? (master as any).Levy ?? unified.summary.levy ?? 0))) : undefined,
        vatAmount: resolvedVatAmount,
        netAmount: unified.summary.grandTotal,
        deliveryCharge: master.deliveryCharge || 0,
        enableVat,
        printPrice: getPrintPrice(),
        priceView: getPriceView(),
        isBillDiscount: unified.summary.isBillDiscount,
        billArabic,
      };

      const htmlContent = await generateGuestPrintHtml(unified as any, printData);

      let billPrinter: string | undefined;
      try {
        const settingsRes = await printerSettingsApi.getGeneral();
        const gen = settingsRes?.data;
        billPrinter = gen?.androidBillPrinter || gen?.billPrinter || gen?.androidKOTPrinter || gen?.kotPrinter;
      } catch (err) {
        console.warn("[DineInTableOrdersModal] Could not fetch general printer settings:", err);
      }

      if (!billPrinter || billPrinter === "No Printer") {
        billPrinter =
          localStorage.getItem('cachedBillPrinter') ||
          localStorage.getItem('cachedBillPrinterIp') ||
          localStorage.getItem('cachedKotPrinter') ||
          localStorage.getItem('cachedKotPrinterIp') ||
          localStorage.getItem('printerIpAddress') ||
          undefined;
      }

      await printHtmlReceipt(htmlContent, billPrinter);
      showToast("Guest receipt sent to printer!", "success");
    } catch (e: any) {
      console.error("[DineInTableOrdersModal] Print error:", e);
      showToast(e?.message ? `Print failed: ${e.message}` : "Failed to print receipt", "error");
    }
  };

  return (
    <>
      {/*
        Using shared Modal (§components reuse rule).
        noPadding + 2xl size for the wide side-by-side order layout.
        Responsive: full screen on mobile, wider panel on lg+.
        §15: w-full max-w-[95vw] xl:max-w-[1500px] to fit 5 cards in a row
      */}
      {/* Same look as the Recall list (PosRecallModal); clicking a row opens the Recall preview. */}
      <Modal
        isOpen={isOpen && !showGuestCount && !isMultiPayOpen}
        onClose={onClose}
        size="2xl"
        noPadding
        noScroll
        showClose={false}
      closeOnEscape
        className="bg-[#f8f9fa] border-none shadow-2xl h-[85vh] max-h-[900px] flex flex-col"
      >
        {/* HEADER */}
        <div className="flex items-stretch bg-[#49293e] text-white shrink-0">
          <div className="flex-1 flex items-center gap-3 px-4 py-2.5 min-w-0">
            <span className="text-xs font-bold uppercase tracking-wider truncate">
              Table Orders · {table?.tableName}
            </span>
            {isTableReserved && (
              <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-purple-500/30 text-purple-100 border border-purple-300/40">
                Reserved Table
              </span>
            )}
          </div>
          <button
            onClick={handleNew}
            disabled={loading}
            className="px-5 py-2.5 flex items-center justify-center gap-2 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold uppercase tracking-wider transition-colors shrink-0 disabled:opacity-40"
          >
            <Plus size={16} strokeWidth={3} />
            {editingOrderId ? "Assign" : "New Order"}
          </button>
          <button
            onClick={onClose}
            tabIndex={-1}
            aria-label="Close table orders"
            className="px-6 py-2.5 flex items-center justify-center bg-red-700 hover:bg-red-800 text-white transition-colors shrink-0"
          >
            <X size={20} strokeWidth={3} />
          </button>
        </div>

        {/* ORDERS LIST */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-[#f0f2f5] relative min-h-[300px]">
          {loading && (
            <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] z-10 flex items-center justify-center">
              <Loader text="Retrieving Orders..." />
            </div>
          )}

          {!loading && (!data || data.masterData.length === 0) && (
            <div className="flex flex-col items-center justify-center h-full py-20 text-slate-400 gap-4">
              <p className="font-bold uppercase tracking-widest text-xs">
                {isTableReserved ? "Table is reserved · No active orders" : "No orders on this table"}
              </p>
              {isTableReserved && (
                <button
                  onClick={handleNew}
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-colors flex items-center gap-2"
                >
                  <Plus size={16} strokeWidth={3} />
                  Start Order
                </button>
              )}
            </div>
          )}

          {(data?.masterData ?? []).map((m) => {
            const isSelected = selectedOrderId === m.orderId;
            const isPrinted = Boolean(recallRowById.get(Number(m.orderId))?.isPrinted);
            return (
              <div
                key={m.orderId}
                role="button"
                tabIndex={0}
                onClick={() => openDetails(m.orderId)}
                onKeyDown={(e) => { if (e.key === "Enter") openDetails(m.orderId); }}
                className={`
                  flex items-stretch bg-white rounded-xl overflow-hidden shadow-sm border border-transparent cursor-pointer
                  hover:border-[#f48120]/30 hover:shadow-md transition-all group
                  ${isSelected ? "ring-2 ring-[#f48120] shadow-lg translate-x-1" : ""}
                `}
              >
                <div className={`
                  flex-1 min-w-0 p-4 flex flex-col justify-center gap-1.5 transition-colors
                  ${isSelected ? "bg-[#f48120] text-white" : "group-hover:bg-gray-50"}
                `}>
                  {isPrinted && (
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                      <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full ${isSelected ? "bg-white/20" : "bg-green-100"}`}>
                        <span className={`text-[10px] font-bold uppercase tracking-tighter ${isSelected ? "text-white" : "text-green-700"}`}>
                          Printed
                        </span>
                      </div>
                    </div>
                  )}
                  <div className="flex items-start gap-2 min-w-0">
                    <div className={`mt-1.5 shrink-0 h-1.5 w-1.5 rounded-full ${isSelected ? "bg-white" : "bg-[#f48120]"}`} />
                    <p className={`text-sm font-bold leading-snug italic break-words [overflow-wrap:anywhere] [word-break:break-word] min-w-0 ${isSelected ? "text-white" : "text-gray-800"}`}>
                      "{rowText(m)}"
                    </p>
                  </div>
                </div>

                {/* Print (guest receipt) — same position and colours as the Recall list */}
                <div className="w-[100px] shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedOrderId(m.orderId);
                      void handlePrint(m.orderId);
                    }}
                    className={`
                      w-full h-full flex flex-col items-center justify-center gap-1 transition-all text-white
                      ${isPrinted ? "bg-[#3e4d22] hover:bg-[#34411c]" : "bg-[#556b2f] hover:bg-[#4a5d29]"}
                    `}
                  >
                    <Printer size={18} strokeWidth={3} />
                    <div className="font-black text-[10px] uppercase tracking-widest">Print</div>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* FOOTER */}
        <div className="p-4 bg-white border-t border-gray-200 flex justify-between items-center shrink-0">
          <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">
            Total Records: {data?.masterData.length ?? 0}
          </div>
        </div>
      </Modal>

      {/* Recall preview — same ticket, KOT and Guest print as Recall. Edit / Settle use this screen's
          Dine-In flows (section/table edit, multi-pay settle) because the terminal is not on screen. */}
      <PosRecallDetailsModal
        isOpen={isOpen && isDetailsOpen && !isMultiPayOpen}
        onClose={() => setIsDetailsOpen(false)}
        orderId={selectedOrderId}
        orderDetailsStr={selectedOrderId ? recallRowById.get(selectedOrderId)?.details : undefined}
        onEditRequest={() => {
          setIsDetailsOpen(false);
          void handleEdit();
        }}
        onSettleRequest={() => {
          setIsDetailsOpen(false);
          void handleSettle();
        }}
      />

      {/* Guest count for NEW order on occupied table */}
      <GuestCountModal
        isOpen={showGuestCount}
        tableName={table?.tableName ?? ''}
        tableCapacity={table?.capacity ?? 0}
        onConfirm={handleNewGuestConfirm}
        onClose={() => setShowGuestCount(false)}
      />

      {/* ── Settle (MultiPay) Modal ── */}
      {isMultiPayOpen && (
        <PosMultiPayModal
          isOpen={isMultiPayOpen}
          totalDue={Number(settleOrderData?.master?.netAmount ?? selectedMaster?.netAmount ?? 0)}
          customerId={settleOrderData?.master?.customerId || (selectedMaster as any)?.customerId || 1}
          tenderOptions={tenderOptions}
          loading={isSettlingSubmit}
          onClose={() => {
            setIsMultiPayOpen(false);
            setSettleOrderData(null);
            dineInSettlementEmployeeIdRef.current = null;
            dispatch(clearCart());
          }}
          onSubmit={handleMultiPaySubmit}
        />
      )}

      {/* ── Employee Authorization Modal ── */}
      <EmployeePasswordModal
        key={authorizationModalKey}
        {...authorizationModalProps}
      />
    </>
  );
};
