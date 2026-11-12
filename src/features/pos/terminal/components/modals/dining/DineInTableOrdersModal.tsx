import { buildSavedOrderLoad, dispatchSavedOrderLoad } from "../../../utils/savedOrderToCart";
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { PosRecallDetailsModal } from "../order/PosRecallDetailsModal";
import { usePosRecall } from "../../../hooks/usePosRecall";
import { X, Plus, Pencil, Wallet, Printer, ChefHat } from "lucide-react";
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../../../../../app/hooks';
import { setSectionId, setTableId, setGuestNo, clearCart, setOrderTypeByName, setTableNo, setWaiter } from '../../../store/posSlice';
import { dineInApi } from '../../../../services/dineInApi';
import { orderApi } from '../../../../services/orderApi';
import { useToast } from '../../../../../../app/providers/useToast';
import { Loader, Modal } from '../../../../../../components/common';
import { GuestCountModal } from "./GuestCountModal";
import { openDrawerIfCash } from '../../../../utils/cashDrawer';
import { useSettlePrintPrompt } from '../../../hooks/useSettlePrintPrompt';
import { SettlePrintPrompt } from '../payment/SettlePrintPrompt';
import { roundCalc } from '../../../utils/billing';
import { PosMultiPayModal, type MultiPaymentLine } from '../payment/PosMultiPayModal';
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
import { loadDineInOrderForCart } from "../../../utils/loadDineInOrder";
import { printDineInGuestReceipt } from "../../../utils/printDineInOrder";
import { buildDineInSettleOrder, printDineInSettleReceipt } from "../../../utils/dineInSettlement";
import { dineInTenderOptions, isDineInTableReserved } from "../../../utils/dineInTable";
import { TableOrderCard } from "./TableOrderCard";
import { fetchRecallOrderData } from "../../../utils/loadRecallOrder";
import { parseRecallListText } from "../../../utils/recallListText";
import { printRecallOrderKot } from "../../../utils/printRecallKot";
import { usePosProducts } from "../../../hooks/usePosProducts";
import { menuApi } from "../../../../services/menuApi";
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
  const settlePrint = useSettlePrintPrompt();

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

  const tenderOptions = useMemo(() => dineInTenderOptions(posMasterData), [posMasterData]);

  /* Fetch orders when modal opens + auto-refresh every 10 seconds */
  useEffect(() => {
    if (isOpen && table) {
      setSelectedOrderId(null);
      setData(null);
      loadedKeysRef.current = {};
      setFullOrders({});
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
  const openDetails = (orderId: number) => {
    setSelectedOrderId(orderId);
    setIsDetailsOpen(true);
  };

  /* ── Cards: every order of the table loaded in full, the same way the Recall preview loads it. Reloaded when its
        total changes (the 10 s refresh); undefined = loading, null = could not load. ── */
  const { products } = usePosProducts();
  const [fullOrders, setFullOrders] = useState<Record<number, unknown>>({});
  const loadedKeysRef = useRef<Record<number, string>>({});
  useEffect(() => {
    if (!isOpen || !data) return;
    data.masterData.forEach((m) => {
      const id = Number(m.orderId);
      const key = `${m.netAmount}`;
      if (loadedKeysRef.current[id] === key) return;
      loadedKeysRef.current[id] = key;
      const hint = parseRecallListText(recallRowById.get(id)?.details, id)?.orderTypeName || "DineIn";
      fetchRecallOrderData(id, { orderTypeHint: hint, productCache, products })
        .then((order) => setFullOrders((prev) => ({ ...prev, [id]: order ?? null })))
        .catch(() => {
          delete loadedKeysRef.current[id];
          setFullOrders((prev) => ({ ...prev, [id]: null }));
        });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, data]);

  // KOT print needs the modifier types and extras, as on the Recall preview.
  const [modifierTypes, setModifierTypes] = useState<Awaited<ReturnType<typeof menuApi.getModifierTypes>>>([]);
  const [allExtras, setAllExtras] = useState<Awaited<ReturnType<typeof menuApi.getAllExtras>>>([]);
  useEffect(() => {
    if (!isOpen) return;
    menuApi.getModifierTypes().then((d) => setModifierTypes(d || [])).catch(() => {});
    menuApi.getAllExtras().then((d) => setAllExtras(d || [])).catch(() => {});
  }, [isOpen]);

  const handleKot = () => {
    if (!selectedOrderId) return;
    const order = fullOrders[selectedOrderId];
    if (!order) { showToast("Order is still loading", "warning"); return; }
    const orderDetailsStr = recallRowById.get(selectedOrderId)?.details;
    void printRecallOrderKot({
      orderId: selectedOrderId, order, fallbackDetails: parseRecallListText(orderDetailsStr, selectedOrderId), orderDetailsStr,
      allExtras, modifierTypes, products, productCache, showToast,
    } as never);
  };

  /* ── Check if table or order is marked as Reserved ── */
  const isTableReserved = useMemo(() => isDineInTableReserved(table, data, selectedMaster), [table, data, selectedMaster]);

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
  const fetchAndMapFullOrder = (orderId: number) =>
    loadDineInOrderForCart(orderId, { productCache, products: (posMasterData as any)?.products });

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
      const { master, directSettleOrder, activeTransDate } = buildDineInSettleOrder({ settleOrderData, rawOrder, status, employeeId, targetOrderId, selectedMaster, changeAmount, sectionId, table });

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

      // POS config "Settle Print": print, skip or ask. The sale is saved, so the payment popup can close first.
      setIsMultiPayOpen(false);
      const printReceipt = await settlePrint.decide();

      // Try printing settled receipt
      try {
        await printDineInSettleReceipt({ master, employeeId, settleOrderData, table, invoiceNoStr, settledSaleId, changeAmount, mappedPayments, tenderOptions, printReceipt, showToast });
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

  // Waiter name for prints: resolveEmployeeNameForPrint (utils/employeeNames.ts).

  /* ── GUEST PRINT ── */
  const handlePrint = (orderIdArg?: number) => printDineInGuestReceipt({ orderIdArg, data, selectedMaster, loading, table, showToast, fetchAndMapFullOrder });

  return (
    <>
      {/*
        Using shared Modal (§components reuse rule).
        noPadding + 2xl size for the wide side-by-side order layout.
        Responsive: full screen on mobile, wider panel on lg+.
        §15: w-full max-w-[95vw] xl:max-w-[1500px] to fit 5 cards in a row
      */}
      {/* Side-by-side order cards (owner's request 2026-11-12), each the Recall preview's ticket; actions on the right. */}
      <Modal
        isOpen={isOpen && !showGuestCount && !isMultiPayOpen}
        onClose={onClose}
        size="2xl"
        noPadding
        noScroll
        showClose={false}
      closeOnEscape
        className="w-full !max-w-[98vw] xl:!max-w-[1600px] bg-[#1a1a1a] border border-white/5 shadow-2xl h-[90vh] flex flex-col rounded-3xl overflow-hidden"
      >
        {/* HEADER */}
        <div className="flex items-stretch bg-[#111] border-b border-white/10 text-white shrink-0">
          <div className="flex-1 flex items-center gap-3 px-5 py-3 min-w-0">
            <span className="text-sm font-black uppercase tracking-[0.2em] truncate">
              Table Orders · {table?.tableName}
            </span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-white/40 shrink-0">
              {data?.masterData.length ?? 0} order(s)
            </span>
            {isTableReserved && (
              <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-purple-500/30 text-purple-100 border border-purple-300/40">
                Reserved Table
              </span>
            )}
          </div>
        </div>

        <div className="flex-1 min-h-0 flex flex-col lg:flex-row">
          {/* ORDER CARDS */}
          <div className="flex-1 min-h-0 overflow-auto p-4 relative">
            {loading && (
              <div className="absolute inset-0 bg-black/40 z-10 flex items-center justify-center">
                <Loader text="Retrieving Orders..." />
              </div>
            )}

            {!loading && (!data || data.masterData.length === 0) && (
              <div className="flex flex-col items-center justify-center h-full py-20 text-white/40 gap-4">
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

            {(data?.masterData.length ?? 0) > 0 && (
              <div className="flex flex-col sm:flex-row sm:flex-nowrap gap-4 h-full min-h-0">
                {(data?.masterData ?? []).map((m) => {
                  const id = Number(m.orderId);
                  const detailsStr = recallRowById.get(id)?.details;
                  return (
                    <TableOrderCard
                      key={m.orderId}
                      orderId={id}
                      orderNo={m.orderNo ?? id}
                      ticketNo={m.ticketNo ?? ""}
                      order={fullOrders[id]}
                      orderDetailsStr={detailsStr}
                      fallbackDetails={parseRecallListText(detailsStr, id)}
                      isSelected={selectedOrderId === m.orderId}
                      isPrinted={Boolean(recallRowById.get(id)?.isPrinted)}
                      onSelect={() => setSelectedOrderId(m.orderId)}
                      onOpen={() => openDetails(m.orderId)}
                    />
                  );
                })}
              </div>
            )}
          </div>

          {/* ACTIONS: work on the selected card */}
          <div className="lg:w-28 shrink-0 bg-[#111] border-t lg:border-t-0 lg:border-l border-white/10 p-3 flex flex-row lg:flex-col gap-2">
            <TableActionButton label={editingOrderId ? "Assign" : "New"} tone="bg-emerald-700 hover:bg-emerald-600" icon={<Plus size={18} strokeWidth={3} />} onClick={handleNew} disabled={loading} />
            <TableActionButton label="Edit" tone="bg-[#49293e] hover:bg-[#5c3450]" icon={<Pencil size={18} strokeWidth={2.5} />} onClick={() => void handleEdit()} disabled={!selectedMaster || loading} />
            <TableActionButton label="Settle" tone="bg-[#a35c24] hover:bg-[#b8692a]" icon={<Wallet size={18} strokeWidth={2.5} />} onClick={() => void handleSettle()} disabled={!selectedMaster || loading} />
            <TableActionButton label="KOT" tone="bg-sky-800 hover:bg-sky-700" icon={<ChefHat size={18} strokeWidth={2.5} />} onClick={handleKot} disabled={!selectedMaster || loading} />
            <TableActionButton label="Guest" tone="bg-stone-700 hover:bg-stone-600" icon={<Printer size={18} strokeWidth={2.5} />} onClick={() => { if (selectedOrderId) void handlePrint(selectedOrderId); }} disabled={!selectedMaster || loading} />
            <div className="hidden lg:flex flex-1" />
            <TableActionButton label="Close" tone="bg-red-700 hover:bg-red-800" icon={<X size={18} strokeWidth={3} />} onClick={onClose} tabIndex={-1} />
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

      <SettlePrintPrompt {...settlePrint.promptProps} />

      {/* ── Employee Authorization Modal ── */}
      <EmployeePasswordModal
        key={authorizationModalKey}
        {...authorizationModalProps}
      />
    </>
  );
};

/** One button of the table screen's action column (touch target ≥ 44px). */
const TableActionButton: React.FC<{
  label: string;
  tone: string;
  icon: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  tabIndex?: number;
}> = ({ label, tone, icon, onClick, disabled, tabIndex }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    tabIndex={tabIndex}
    className={`flex-1 lg:flex-initial lg:w-full lg:h-16 min-h-[44px] rounded-2xl text-white font-black text-[10px] uppercase tracking-[0.15em] transition-all flex flex-col items-center justify-center gap-1 shadow-md active:scale-95 focus:outline-none focus:ring-2 focus:ring-white/30 disabled:opacity-40 disabled:cursor-not-allowed ${tone}`}
  >
    {icon}
    <span>{label}</span>
  </button>
);
