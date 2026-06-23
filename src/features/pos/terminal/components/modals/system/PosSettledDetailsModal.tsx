import React, { useState, useEffect } from "react";
import Modal from "../../../../../../components/common/Modal";
import { Loader, Button } from "../../../../../../components/common";
import { Printer, X, Edit } from "lucide-react";
import { settledOrdersApi } from "../../../../services/settledOrdersApi";
import { useToast } from "../../../../../../app/providers/useToast";
import { useAppDispatch } from "../../../../../../app/hooks";
import { loadRecalledOrder } from "../../../store/posSlice";
import { usePosProducts } from "../../../hooks/usePosProducts";
import { formatAmount } from "../../../../../../utils/currency";
import { generateGuestPrintHtml } from "../../../../utils/guestPrintTemplate";
import { printHtmlReceipt } from "../../../../services/qzService";
import { printerSettingsApi } from "../../../../services/printerSettingsApi";

const getPriceView = (): string => {
  try {
    const saved = localStorage.getItem('posConfigs');
    const full = saved ? JSON.parse(saved) : {};
    return full?.configs?.priceView === 'Inclusive' ? 'Inclusive' : 'Exclusive';
  } catch {
    return 'Exclusive';
  }
};

interface PosSettledDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: number | null;
  onEditSuccess?: () => void;
}

export const PosSettledDetailsModal: React.FC<PosSettledDetailsModalProps> = ({
  isOpen,
  onClose,
  orderId,
  onEditSuccess,
}) => {
  const { showToast } = useToast();
  const dispatch = useAppDispatch();
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState<any>(null);
  const { products } = usePosProducts();
  const [confirmAction, setConfirmAction] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel: string;
    cancelLabel: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: "",
    message: "",
    confirmLabel: "",
    cancelLabel: "",
    onConfirm: () => {},
  });

  useEffect(() => {
    if (isOpen && orderId) {
      void loadOrderDetails();
    } else {
      setOrder(null);
    }
  }, [isOpen, orderId]);

  const loadOrderDetails = async () => {
    if (!orderId) return;
    setLoading(true);
    try {
      const response = await settledOrdersApi.getSettledOrderDetails(orderId);
      if (response && response.isSuccess && response.data) {
        setOrder(response.data);
      }
    } catch (err) {
      console.warn("API error:", err);
    } finally {
      setLoading(false);
    }
  };

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

  const handleEditOrder = async () => {
    if (!order) return;
    
    try {
      const master = order.masterData || order;
      const details = order.detailsData || order.details || [];

      const priceView = getPriceView();
      const isIncl = priceView === 'Inclusive';

      const mappedCartItems = details.map((detail: any, idx: number) => {
        const itemModifiers = modifiersData.filter((m: any) => m.mapId === detail.mapId);
        
        const qty = detail.qty ?? detail.Qty ?? 1;
        const amount = detail.amount ?? detail.netAmount ?? detail.NetAmount ?? detail.Amount ?? 0;
        const price = detail.price ?? detail.Price ?? (qty > 0 ? amount / qty : 0);

        let pId = detail.productId ?? detail.ProductId ?? detail.itemId ?? detail.ItemId ?? detail.product?.id ?? detail.Product?.id;
        
        if (!pId && detail.productName) {
          const matched = products.find((p: any) => p.name === detail.productName || p.name === detail.ProductName);
          if (matched) pId = matched.id;
        }

        if (!pId) {
          console.error("RAW API DETAIL MISSING ID:", JSON.stringify(detail, null, 2));
        }

        return {
          uniqueId: `${pId}-variant-${Date.now()}-${idx}`,
          productId: pId,
          quantity: qty,
          price: price,
          isIncl: isIncl,
          discountValue: detail.discAmount || 0,
          discountType: detail.discPer ? 'percentage' : 'amount',
          extras: itemModifiers.filter((m: any) => m.price > 0),
          modifiers: itemModifiers.filter((m: any) => m.price === 0),
          isExisting: true,
          mapId: detail.mapId,
          originalQty: qty,
          product: {
            id: pId,
            name: detail.productName || detail.ProductName || `Product #${pId}`,
            price: price,
            categoryId: 1,
            unitId: detail.unitId || 1,
          }
        };
      });

      const orderTypeNameMap: Record<string, number> = {
        "DineIn": 1,
        "TakeOut": 2,
        "DriveThru": 3,
        "Delivery": 4,
        "Providers": 5,
        "Coming": 6
      };

      const orderTypeName = master.orderType || master.orderTypeName || "DineIn";
      const orderTypeId = master.orderTypeId || orderTypeNameMap[orderTypeName] || 1;

      const rawVoucher = master.voucherNo ? String(master.voucherNo).replace(/\D/g, '') : '';
      const parsedVoucher = rawVoucher ? parseInt(rawVoucher, 10) : NaN;
      const saleId = !isNaN(parsedVoucher) ? parsedVoucher : orderId;

      dispatch(loadRecalledOrder({
        editingOrderId: orderId,
        editingSaleId: saleId,
        cartItems: mappedCartItems,
        orderTypeId: orderTypeId,
        orderTypeName: orderTypeName,
        customerId: master.customerId || 1,
        addressId: master.addressId || 0,
        billDiscountValue: master.discAmount || 0,
        billDiscountType: master.discPer ? 'percentage' : 'amount',
        sectionId: master.sectionId || 0,
        tableId: master.tableId || 0,
        isSettling: false,
        isSettledEdit: true
      }));

      showToast(`Order #${orderId} loaded for editing`, "success");
      onClose();
      onEditSuccess?.();
    } catch (err: any) {
      console.error("Failed to edit:", err);
      showToast(err.message || "Failed to load order for editing", "error");
    }
  };

  const handlePrint = async () => {
    if (!orderId || !order) return;
    
    try {
      showToast(`Preparing Receipt for Order #${orderId}...`, "success");
      
      const master = order.masterData || order;
      const details = order.detailsData || order.details || [];
      
      const orderTypeMap: Record<number, string> = {
        1: "DineIn", 2: "TakeOut", 3: "DriveThru",
        4: "Delivery", 5: "Providers", 6: "Coming"
      };
      const orderTypeName = master.orderType || orderTypeMap[master.orderTypeId] || master.orderTypeName || order?.orderTypeName || "DineIn";

      const voucherDateStr = master.voucherDate ?? master.orderDate ?? master.createdAt ?? master.entryDate;
      let date: string | undefined;
      let time: string | undefined;
      
      if (voucherDateStr) {
        try {
          const d = new Date(voucherDateStr);
          if (!isNaN(d.getTime())) {
            date = d.toLocaleDateString('en-GB');
            time = d.toLocaleTimeString('en-US');
          }
        } catch { /* ignore */ }
      }

      let calculatedSubTotal = 0;
      const mappedItems = details.map((d: any) => {
        const itemMods = modifiersData.filter((m: any) => m.mapId === d.mapId);
        const extras = itemMods.filter((m: any) => (m.price || 0) > 0).map((m: any) => ({
          id: m.modifierId, name: m.modifierName, price: m.price || 0, qty: m.qty || 1
        }));
        const modifiers = itemMods.filter((m: any) => (m.price || 0) <= 0).map((m: any) => ({
          id: m.modifierId, name: m.modifierName, qty: m.qty || 1
        }));
        
        const qty = d.qty ?? d.Qty ?? 1;
        const amount = d.amount ?? d.netAmount ?? d.NetAmount ?? d.Amount ?? 0;
        const price = d.price ?? d.Price ?? (qty > 0 ? amount / qty : 0);

        let lineBase = price * qty;
        extras.forEach((ex: any) => lineBase += ex.price * ex.qty);
        calculatedSubTotal += lineBase;
        
        return {
          productId: d.productId || d.itemId || 0,
          quantity: qty,
          price: price,
          product: { name: d.productName || d.ProductName || `Product #${d.productId || 0}`, price: price },
          extras,
          modifiers,
          lineTotal: lineBase
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
        vatAmount: master.vatAmount || 0,
        netAmount: master.netAmount || 0,
        deliveryCharge: master.deliveryCharge || 0,
        enableVat
      };

      const htmlContent = generateGuestPrintHtml(mappedItems as any, printData);
      const settingsRes = await printerSettingsApi.getGeneral();
      const billPrinter = settingsRes.data?.billPrinter || "No Printer";
      
      await printHtmlReceipt(htmlContent, billPrinter);
      showToast("Settled receipt sent to printer!", "success");
    } catch (e) {
      console.error(e);
      showToast("Failed to print receipt", "error");
    }
  };

  const handleEditClick = () => {
    if (!orderId) return;
    setConfirmAction({
      isOpen: true,
      title: "Edit Settled Order",
      message: `This will load Sales Invoice #${orderId} into the POS for editing. Do you wish to continue?`,
      confirmLabel: "Yes, Edit Order",
      cancelLabel: "No",
      onConfirm: () => {
        setConfirmAction(prev => ({ ...prev, isOpen: false }));
        handleEditOrder();
      }
    });
  };

  if (!isOpen) return null;

  const master = order?.masterData || order || {};
  const details = order?.detailsData || order?.details || [];
  
  const orderNo = master.orderNo ?? order?.orderNo ?? orderId ?? "";
  const orderTypeMap: Record<number, string> = {
    1: "DineIn",
    2: "TakeOut",
    3: "DriveThru",
    4: "Delivery",
    5: "Providers",
    6: "Coming"
  };
  const orderTypeName = master.orderType || orderTypeMap[master.orderTypeId] || master.orderTypeName || order?.orderTypeName || "DineIn";
  const netAmount = master.netAmount ?? order?.netAmount ?? 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      noPadding
      className="bg-[#262626] border border-stone-800 shadow-2xl rounded-2xl overflow-hidden max-w-[500px]"
    >
      <div className="bg-[#1e1e1e] border-b border-stone-800 text-stone-100 py-3.5 px-6 flex justify-between items-center">
        <h2 className="text-sm font-black uppercase tracking-[0.2em] text-[#f48120]">ORDER DETAILS</h2>
        <button onClick={onClose} className="p-1 hover:bg-stone-800 rounded-full transition-colors text-stone-400">
          <X size={18} />
        </button>
      </div>

      {loading ? (
        <div className="py-24 flex items-center justify-center bg-stone-900/40">
          <Loader text="Retrieving Data..." />
        </div>
      ) : order ? (
        <div className="flex flex-col md:flex-row min-h-[420px] bg-stone-950/80">
          <div className="flex-1 p-5 bg-[#faf8f5] text-stone-900 font-mono text-xs overflow-y-auto">
             <div className="text-center font-bold border-b border-dashed border-stone-400 pb-3 mb-3">
                <div className="text-sm font-black uppercase">BITEZO POS</div>
              </div>
              <div className="grid grid-cols-2 gap-y-1 border-b border-dashed border-stone-400 pb-3 mb-3">
                <div><span className="text-stone-500">Order: </span><span className="font-bold">{orderNo}</span></div>
                <div className="text-right"><span className="text-stone-500">Type: </span><span className="font-bold">{orderTypeName}</span></div>
              </div>
              <div className="grid grid-cols-[24px_1fr_60px_60px] gap-2 border-b border-dashed border-stone-400 pb-2 mb-2 text-[10px] font-bold text-stone-500 uppercase">
                <div>Qty</div>
                <div>Item</div>
                <div className="text-right">Price</div>
                <div className="text-right">Total</div>
              </div>
              <div className="space-y-2.5">
                  {details.map((detail: any, i: number) => {
                    const qty = detail.qty ?? detail.Qty ?? 1;
                    const amount = detail.amount ?? detail.netAmount ?? detail.NetAmount ?? detail.Amount ?? 0;
                    const price = detail.price ?? detail.Price ?? (qty > 0 ? amount / qty : 0);
                    
                    return (
                      <div key={i} className="grid grid-cols-[24px_1fr_60px_60px] gap-2 text-[11px]">
                        <div className="font-bold text-stone-500">{qty}</div>
                        <div className="font-bold text-stone-800">{detail.productName || detail.ProductName}</div>
                        <div className="text-right text-stone-500">{formatAmount(price)}</div>
                        <div className="text-right font-bold text-stone-900">{formatAmount(amount)}</div>
                      </div>
                    );
                  })}
              </div>
              <div className="border-t border-dashed border-stone-400 pt-4 mt-6 flex justify-between font-bold text-xs uppercase">
                <span>Grand Total</span>
                <span className="text-base font-black text-[#f48120]">
                  {formatAmount(netAmount)}
                </span>
              </div>
          </div>

          <div className="w-full md:w-28 shrink-0 bg-stone-900 border-t md:border-t-0 md:border-l border-stone-800 p-3 flex flex-row md:flex-col gap-2 justify-stretch items-stretch">
            <Button
              variant="primary"
              onClick={handlePrint}
              disabled={loading || !order}
              className="flex-1 md:flex-initial h-12 md:h-14 rounded-xl bg-emerald-700 hover:bg-emerald-600 active:scale-95 text-stone-100 font-black text-[10px] uppercase tracking-widest transition-all flex flex-col justify-center items-center gap-1 shadow-md disabled:opacity-50"
            >
              <Printer size={18} strokeWidth={2.5} />
              PRINT
            </Button>

            <Button
              variant="primary"
              onClick={handleEditClick}
              disabled={loading || !order}
              className="flex-1 md:flex-initial h-12 md:h-14 rounded-xl bg-[#f48120] hover:bg-[#e06d10] active:scale-95 text-stone-100 font-black text-[10px] uppercase tracking-widest transition-all flex flex-col justify-center items-center gap-1 shadow-md disabled:opacity-50"
            >
              <Edit size={18} strokeWidth={2.5} />
              EDIT
            </Button>

            <button
              onClick={onClose}
              className="flex-1 md:flex-initial h-12 md:h-14 rounded-xl bg-stone-800 hover:bg-stone-700 active:scale-95 text-stone-300 hover:text-white font-black text-[10px] uppercase tracking-widest transition-all flex flex-col justify-center items-center gap-1 border border-stone-700/50 shadow-md"
            >
              <X size={18} strokeWidth={2.5} />
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

      {confirmAction.isOpen && (
        <Modal
          isOpen={true}
          onClose={() => setConfirmAction(prev => ({ ...prev, isOpen: false }))}
          title={confirmAction.title}
          size="sm"
          className="bg-white border-none shadow-xl"
        >
          <div className="flex flex-col gap-6 p-2 text-center">
            <p className="text-sm font-bold text-gray-700 leading-relaxed">
              {confirmAction.message}
            </p>
            <div className="grid grid-cols-2 gap-3 mt-2">
              <Button
                variant="secondary"
                onClick={() => setConfirmAction(prev => ({ ...prev, isOpen: false }))}
                className="py-3 uppercase tracking-widest font-black text-xs"
              >
                {confirmAction.cancelLabel}
              </Button>
              <Button
                variant="primary"
                onClick={confirmAction.onConfirm}
                className="bg-red-600 hover:bg-red-700 text-white py-3 uppercase tracking-widest font-black text-xs"
              >
                {confirmAction.confirmLabel}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </Modal>
  );
};
