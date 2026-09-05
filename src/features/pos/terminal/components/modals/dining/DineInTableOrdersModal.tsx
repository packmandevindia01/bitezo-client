import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch } from '../../../../../../app/hooks';
import { loadRecalledOrder, setSectionId, setTableId, setGuestNo, clearCart, setOrderTypeByName, setTableNo } from '../../../store/posSlice';
import { dineInApi } from '../../../../services/dineInApi';
import { orderApi } from '../../../../services/orderApi';
import { useToast } from '../../../../../../app/providers/useToast';
import { formatAmount } from '../../../../../../utils/currency';
import { Loader, Modal } from '../../../../../../components/common';
import { GuestCountModal } from "./GuestCountModal";
import { generateGuestPrintHtml } from '../../../../utils/guestPrintTemplate';
import { printHtmlReceipt } from '../../../../services/qzService';
import { printerSettingsApi } from '../../../../services/printerSettingsApi';
import { getVatStatus } from '../../../utils/billing';
import { Capacitor } from '@capacitor/core';
import type {
  DineInTable,
  TableOrdersResponse,
  TableOrderMaster,
  TableOrderDetail,
  TableOrderModifier,
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

/* ── Deduplicate modifiers (backend SQL JOIN may produce Cartesian duplicates) ── */
function dedupeModifiers(mods: TableOrderModifier[]): TableOrderModifier[] {
  const seen = new Set<string>();
  return mods.filter(m => {
    const key = `${m.orderId}-${m.mapId}-${m.modifierName}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
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
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<TableOrdersResponse | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [showGuestCount, setShowGuestCount] = useState(false);

  /* Fetch orders when modal opens */
  useEffect(() => {
    if (isOpen && table) {
      setSelectedOrderId(null);
      setData(null);
      void fetchOrders();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, table]);

  const fetchOrders = async () => {
    if (!table) return;
    setLoading(true);
    try {
      const res = await dineInApi.getTableOrders(table.tableId);
      if (res.isSuccess && res.data) {
        setData(res.data);
        if (res.data.masterData.length > 0) {
          setSelectedOrderId(res.data.masterData[0].orderId);
        }
      } else {
        showToast(res.message || 'Failed to load table orders', 'error');
      }
    } catch (e: any) {
      showToast(e.message || 'Error loading table orders', 'error');
    } finally {
      setLoading(false);
    }
  };

  const selectedMaster = data?.masterData.find(o => o.orderId === selectedOrderId) ?? null;
  const allModifiers = dedupeModifiers(data?.modifiersData ?? []);

  /* ── NEW — ask for guest count first (§1 autofocus / guest UX rule) ── */
  const handleNew = () => {
    if (!table) return;
    setShowGuestCount(true);
  };

  const handleNewGuestConfirm = (guestCount: number) => {
    if (!table) return;
    dispatch(clearCart());
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
    const res = await orderApi.getOrderDetails(orderId);
    if (!res?.isSuccess || !res.data) throw new Error("Failed to fetch full order details");
    
    const fullOrder = res.data;
    const master = fullOrder.masterData || fullOrder;
    const details = fullOrder.detailsData || fullOrder.details || [];
    const modifiersData = fullOrder.modifiersData || [];

    // Deduplicate modifiersData (SQL Cartesian fix)
    const seenMods = new Set<string>();
    const dedupedModifiers = modifiersData.filter((m: any) => {
      const key = `${m.mapId}-${m.modifierId}`;
      if (seenMods.has(key)) return false;
      seenMods.add(key);
      return true;
    });

    const priceView = (() => {
      try {
        const saved = localStorage.getItem('posConfigs');
        const full = saved ? JSON.parse(saved) : {};
        return full?.configs?.priceView === 'Inclusive' ? 'Inclusive' : 'Exclusive';
      } catch { return 'Exclusive'; }
    })();
    const isIncl = priceView === 'Inclusive';

    const mappedItems = details.map((detail: any, idx: number) => {
      const itemModifiers = dedupedModifiers.filter((m: any) => m.mapId === detail.mapId);
      
      const extras = itemModifiers.filter((m: any) => m.price > 0).map((m: any) => ({
        id: m.modifierId,
        name: m.modifierName,
        price: m.price,
        qty: m.qty,
        typeId: m.typeId
      }));

      const modifiers = itemModifiers.filter((m: any) => m.price === 0).map((m: any) => ({
        id: m.modifierId,
        name: m.modifierName,
        qty: m.qty,
        typeId: m.typeId
      }));

      return {
        uniqueId: `${detail.productId}-variant-${Date.now()}-${idx}`,
        productId: detail.productId,
        quantity: detail.qty || 1,
        price: detail.price || 0,
        isIncl: isIncl,
        discountValue: detail.discPer && detail.discPer > 0 ? detail.discPer : (detail.discAmount || 0),
        discountType: detail.discPer && detail.discPer > 0 ? 'percentage' : 'amount',
        extras,
        modifiers,
        isExisting: true,
        rawAmount: detail.amount ?? detail.netAmount ?? ((detail.price || 0) * (detail.qty || 1)),
        rawVatAmount: detail.vatAmount || 0,
        mapId: detail.mapId,
        originalQty: detail.qty || 1,
        product: {
          id: detail.productId,
          name: detail.productName || `Product #${detail.productId}`,
          price: detail.price || 0,
          categoryId: 1,
          unitId: detail.unitId || 1,
        }
      };
    });

    return { master, mappedItems };
  };

  /* ── EDIT — load selected order into cart ── */
  const handleEdit = async () => {
    if (!selectedMaster || !data || loading) return;
    try {
      const { master, mappedItems } = await fetchAndMapFullOrder(selectedMaster.orderId);

      dispatch(loadRecalledOrder({
        editingOrderId: selectedMaster.orderId,
        cartItems: mappedItems,
        orderTypeId: master.orderTypeId || 1,
        orderTypeName: 'DineIn',
        customerId: master.customerId || 1,
        addressId: master.addressId || 0,
        billDiscountValue: master.discPer && master.discPer > 0 ? master.discPer : (master.discAmount || 0),
        billDiscountType: master.discPer && master.discPer > 0 ? 'percentage' : 'amount',
        sectionId,
        tableId: table!.tableId,
        deliveryCharge: master.deliveryCharge || 0,
        waiterName: master.employeeName ?? "Waiter",
      }));
      showToast(`Order #${selectedMaster.orderNo} loaded for editing`, 'success');
      onEditSuccess?.();
      onClose();
      navigate('/pos', { state: { skipAutoDineIn: true } });
    } catch {
      showToast('Failed to load full order for editing', 'error');
    }
  };

  /* ── SETTLE — load selected order and trigger payment ── */
  const handleSettle = async () => {
    if (!selectedMaster || !data || loading) return;
    try {
      const { master, mappedItems } = await fetchAndMapFullOrder(selectedMaster.orderId);

      dispatch(loadRecalledOrder({
        editingOrderId: selectedMaster.orderId,
        cartItems: mappedItems,
        orderTypeId: master.orderTypeId || 1,
        orderTypeName: 'DineIn',
        customerId: master.customerId || 1,
        addressId: master.addressId || 0,
        billDiscountValue: master.discPer && master.discPer > 0 ? master.discPer : (master.discAmount || 0),
        billDiscountType: master.discPer && master.discPer > 0 ? 'percentage' : 'amount',
        sectionId,
        tableId: table!.tableId,
        deliveryCharge: master.deliveryCharge || 0,
        isSettling: true,
        waiterName: master.employeeName ?? "Waiter",
      }));
      showToast(`Settling Order #${selectedMaster.orderNo}`, 'success');
      onSettleSuccess?.(selectedMaster.orderId, selectedMaster.netAmount);
      onClose();
      navigate('/pos', { state: { skipAutoDineIn: true } });
    } catch {
      showToast('Failed to load full order for settlement', 'error');
    }
  };

  /* ── PRINT ── */
  const handlePrint = async () => {
    if (!selectedMaster || !data || loading) return;
    
    try {
      showToast(`Preparing receipt for Order #${selectedMaster.orderNo}...`, 'success');
      
      const { master, mappedItems } = await fetchAndMapFullOrder(selectedMaster.orderId);
      
      // Determine enableVat dynamically based on configs
      const enableVat = getVatStatus();

      // Prepare print data
      const printData = {
        orderNo: master.orderNo ?? String(master.orderId),
        ticketNo: master.ticketNo ?? "1",
        waiter: master.employeeName ?? "Waiter",
        counter: "Main",
        section: master.sectionName || "DINE IN",
        table: table?.tableName || "",
        orderType: "DINE IN",
        date: master.voucherDate ? new Date(master.voucherDate).toLocaleDateString('en-GB') : undefined,
        time: master.voucherDate ? new Date(master.voucherDate).toLocaleTimeString('en-US') : undefined,
        subTotal: master.netAmount - (master.vatAmount || 0) - (master.serviceCharge || 0) - (master.levyAmt || 0),
        serviceCharge: master.serviceCharge || 0,
        levy: master.levyAmt || 0,
        vatAmount: master.vatAmount || 0,
        netAmount: master.netAmount || 0,
        deliveryCharge: master.deliveryCharge || 0,
        enableVat
      };

      // Since the backend might not provide subTotal explicitly, recalculate from items
      let totalVatBase = 0;
      mappedItems.forEach((item: any) => {
        let lineBase = item.price * item.quantity;
        if (item.extras && item.extras.length > 0) {
          item.extras.forEach((ex: any) => lineBase += ex.price * ex.qty);
        }
        item.lineBase = lineBase;
        item.itemVatBase = (item.rawAmount || lineBase) - (item.rawVatAmount || 0);
        totalVatBase += item.itemVatBase;
      });

      const calculatedSubTotal = master.vatExclAmount || totalVatBase;
      const globalRatio = totalVatBase > 0 ? calculatedSubTotal / totalVatBase : 1;
      
      const printMappedItems = mappedItems.map((item: any) => {
        return {
          ...item,
          price: item.price,
          extras: item.extras,
          lineTotal: item.lineBase || ((item.price || 0) * (item.quantity || 1)),
          product: { ...item.product, price: item.price }
        };
      });

      printData.subTotal = calculatedSubTotal;
      printData.vatAmount = master.vatAmount || 0;

      if (Capacitor.isNativePlatform()) {
        const { generateBillMarkup } = await import('../../../../utils/escPosGenerator');
        const { printEscPosMarkup } = await import('../../../../services/qzService');
        const markup = generateBillMarkup({ cartDetails: printMappedItems as any, data: printData as any });
        await printEscPosMarkup(markup);
      } else {
        const htmlContent = await generateGuestPrintHtml(printMappedItems as any, printData);
        const settingsRes = await printerSettingsApi.getGeneral();
        const billPrinter = settingsRes.data?.billPrinter || "No Printer";
        await printHtmlReceipt(htmlContent, billPrinter);
      }
      showToast("Guest receipt sent to printer!", "success");
    } catch (e) {
      console.error(e);
      showToast("Failed to print receipt", "error");
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
      <Modal
        isOpen={isOpen && !showGuestCount}
        onClose={onClose}
        size="2xl"
        noPadding
        showClose={false}
        className="w-full max-w-[98vw] xl:max-w-[1500px] border border-white/5 rounded-3xl overflow-hidden"
      >
        {/* Header — explicit dark bg so it overrides Modal's bg-white */}
        <div className="bg-[#111] border-b border-white/10 px-5 py-3.5 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-sm font-black uppercase tracking-[0.2em] text-white">
              Table Orders
            </h2>
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/40 mt-0.5">
              {table?.tableName} · {data?.masterData.length ?? 0} order(s)
              {loading && ' · loading…'}
            </p>
          </div>
          <button
            onClick={onClose}
            tabIndex={-1}
            aria-label="Close table orders"
            className="p-2 hover:bg-white/10 rounded-xl transition-colors text-white/40 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/20"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/*
          Body — flex-1 min-h-0 so it fills Modal's flex-col space.
          bg-[#1a1a1a] explicitly set here (can't rely on Modal className inheritance).
          Height increased to minimum 500px or 70vh for a larger window.
        */}
        <div className="flex-1 min-h-0 flex flex-col lg:flex-row bg-[#1a1a1a] h-[55vh] min-h-[400px]">

          {/* §4 Loading state */}
          {loading ? (
            <div className="flex-1 flex items-center justify-center py-16 bg-[#1a1a1a]">
              <Loader text="Loading orders…" />
            </div>
          ) : !data || data.masterData.length === 0 ? (
            /* §17 Empty state */
            <div className="flex-1 flex flex-col items-center justify-center py-16 bg-[#1a1a1a] text-white/30 gap-3">
              <svg className="w-10 h-10 opacity-30" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z" />
              </svg>
              <p className="text-xs font-black uppercase tracking-widest">No orders on this table</p>
            </div>
          ) : (
            <>
              {/*
                Left: order panels — explicit dark bg to prevent white bleed.
                §15 responsive: horizontal scroll on lg+, vertical stack on mobile.
              */}
              <div className="flex-1 min-h-0 overflow-auto p-4 bg-[#1a1a1a]">
                {/* Mobile: vertical stack / Desktop: horizontal row */}
                <div className="flex flex-col sm:flex-row sm:flex-nowrap gap-4 sm:pb-1 h-full min-h-0">
                  {data.masterData.map(order => {
                    const orderDetails = data.detailsData.filter(d => d.orderId === order.orderId);
                    const orderMods = allModifiers.filter(m => m.orderId === order.orderId);
                    const isSelected = selectedOrderId === order.orderId;
                    return (
                      <OrderPanel
                        key={order.orderId}
                        order={order}
                        details={orderDetails}
                        modifiers={orderMods}
                        isSelected={isSelected}
                        onClick={() => setSelectedOrderId(order.orderId)}
                      />
                    );
                  })}
                </div>
              </div>

              {/*
                Right: action buttons.
                §15: horizontal on mobile (bottom bar), vertical on lg+.
                §15 touch targets: min 44px — using h-14 (56px) ✓
              */}
              <div className="lg:w-28 shrink-0 bg-[#111] border-t lg:border-t-0 lg:border-l border-white/10 p-3 flex flex-row lg:flex-col gap-2">
                <ActionBtn
                  label="NEW"
                  color="bg-emerald-700 hover:bg-emerald-600"
                  icon={<PlusIcon />}
                  onClick={handleNew}
                  disabled={loading}
                  tabIndex={1}
                />
                <ActionBtn
                  label="EDIT"
                  color="bg-[#49293e] hover:bg-[#5c3450]"
                  icon={<EditIcon />}
                  onClick={handleEdit}
                  disabled={!selectedMaster || loading}
                  tabIndex={2}
                />
                <ActionBtn
                  label="SETTLE"
                  color="bg-[#a35c24] hover:bg-[#b8692a]"
                  icon={<SettleIcon />}
                  onClick={handleSettle}
                  disabled={!selectedMaster || loading}
                  tabIndex={3}
                />
                <ActionBtn
                  label="PRINT"
                  color="bg-stone-700 hover:bg-stone-600"
                  icon={<PrintIcon />}
                  onClick={handlePrint}
                  disabled={!selectedMaster || loading}
                  tabIndex={4}
                />
                {/* Spacer (desktop only) */}
                <div className="hidden lg:flex flex-1" />
                <ActionBtn
                  label="CLOSE"
                  color="bg-stone-800 hover:bg-stone-700 border border-white/10"
                  icon={<CloseIcon />}
                  onClick={onClose}
                  tabIndex={-1}   // §2: close is tabIndex={-1}
                />
              </div>
            </>
          )}
        </div>
      </Modal>

      {/* Guest count for NEW order on occupied table */}
      <GuestCountModal
        isOpen={showGuestCount}
        tableName={table?.tableName ?? ''}
        tableCapacity={table?.capacity ?? 0}
        onConfirm={handleNewGuestConfirm}
        onClose={() => setShowGuestCount(false)}
      />
    </>
  );
};

/* ── OrderPanel ──────────────────────────────────────────────────────────── */

interface OrderPanelProps {
  order: TableOrderMaster;
  details: TableOrderDetail[];
  modifiers: TableOrderModifier[];
  isSelected: boolean;
  onClick: () => void;
}

const OrderPanel: React.FC<OrderPanelProps> = ({ order, details, modifiers, isSelected, onClick }) => (
  <button
    onClick={onClick}
    // §2 Tab: order panels are selectable via keyboard
    tabIndex={0}
    className={[
      'w-full sm:w-64 sm:shrink-0 flex flex-col rounded-2xl border-2 transition-all duration-200 overflow-hidden text-left h-full max-h-[40vh] sm:max-h-none',
      'focus:outline-none focus:ring-2 focus:ring-[#f48120]/50',
      isSelected
        ? 'border-[#f48120] bg-[#f48120]/10 shadow-lg shadow-[#f48120]/20'
        : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10',
    ].join(' ')}
  >
    {/* Panel header */}
    <div className={`px-4 py-2.5 border-b ${isSelected ? 'border-[#f48120]/30 bg-[#f48120]/15' : 'border-white/10 bg-white/5'}`}>
      <div className="flex items-center justify-between">
        {/* §15 ERP label */}
        <span className="text-[9px] font-bold uppercase tracking-widest text-white/40">Order</span>
        <span className={`text-[9px] font-black uppercase tracking-widest ${isSelected ? 'text-[#f48120]' : 'text-white/40'}`}>
          #{order.orderNo}
        </span>
      </div>
      <div className="text-sm font-black text-white mt-0.5">
        Ticket #{order.ticketNo}
      </div>
    </div>

    {/* Items */}
    <div className="px-5 py-4 flex-1 space-y-3 overflow-y-auto min-h-0 custom-scrollbar">
      {details.map((d, i) => {
        const itemMods = modifiers.filter(m => m.mapId === d.mapId);
        return (
          <div key={i} className="text-left">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <span className="text-[12px] font-bold text-white leading-tight block truncate">{d.productName}</span>
                {itemMods.map((m, mi) => (
                  <span key={mi} className="text-[10px] text-[#f48120] block pl-1 mt-0.5">
                    + {m.modifierName}
                  </span>
                ))}
              </div>
              {/* §3 numeric: right-aligned amount */}
              <div className="text-right shrink-0">
                <span className="text-[10px] font-bold text-white/50">×{d.qty}</span>
                {/* §12 formatAmount — no hardcoded decimals */}
                <span className="text-[12px] font-black text-white block mt-0.5">{formatAmount(d.amount)}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>

    {/* Footer total — §12 formatAmount */}
    <div className={`px-4 py-2.5 border-t flex items-center justify-between ${isSelected ? 'border-[#f48120]/30 bg-[#f48120]/10' : 'border-white/10 bg-white/5'}`}>
      {/* §15 ERP label */}
      <span className="text-[9px] font-bold uppercase tracking-widest text-white/40">Total</span>
      <span className={`text-sm font-black ${isSelected ? 'text-[#f48120]' : 'text-white'}`}>
        {formatAmount(order.netAmount)}
      </span>
    </div>
  </button>
);

/* ── ActionBtn ─────────────────────────────────────────────────────────── */

interface ActionBtnProps {
  label: string;
  color: string;
  icon: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  tabIndex?: number;
}

const ActionBtn: React.FC<ActionBtnProps> = ({ label, color, icon, onClick, disabled, tabIndex }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    tabIndex={tabIndex}
    // §15 touch target: min 44px — h-14 = 56px on desktop, flex-1 on mobile ✓
    className={[
      'flex-1 lg:flex-initial lg:w-full lg:h-14 min-h-[44px] rounded-2xl text-white font-black text-[9px] uppercase tracking-[0.15em]',
      'transition-all duration-150 flex flex-col items-center justify-center gap-1 shadow-md active:scale-95',
      'focus:outline-none focus:ring-2 focus:ring-white/30',
      color,
      disabled ? 'opacity-40 cursor-not-allowed' : '',
    ].join(' ')}
  >
    {icon}
    <span className="hidden sm:block">{label}</span>
  </button>
);

/* ── SVG icons ─────────────────────────────────────────────────────────── */
const PlusIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
  </svg>
);
const EditIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Z" />
  </svg>
);
const SettleIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" />
  </svg>
);
const PrintIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0 1 10.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0 .229 2.523a1.125 1.125 0 0 1-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0 0 21 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 0 0-1.913-.247M6.34 18H5.25A2.25 2.25 0 0 1 3 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 0 1 1.913-.247m10.5 0a48.536 48.536 0 0 0-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5Zm-7.5 0h.008v.008H10.5V10.5Zm-3 0h.008v.008H7.5V10.5Z" />
  </svg>
);
const CloseIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
  </svg>
);


