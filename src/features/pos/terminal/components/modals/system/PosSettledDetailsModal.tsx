import React, { useState, useEffect } from "react";
import Modal from "../../../../../../components/common/Modal";
import { Loader, Button } from "../../../../../../components/common";
import { Printer, X } from "lucide-react";
import { settledOrdersApi } from "../../../../services/settledOrdersApi";
import { useToast } from "../../../../../../app/providers/useToast";
import { formatAmount } from "../../../../../../utils/currency";
import { generateGuestPrintHtml } from "../../../../utils/guestPrintTemplate";
import { printHtmlReceipt } from "../../../../services/qzService";
import { printerSettingsApi } from "../../../../services/printerSettingsApi";
import { getVatStatus } from "../../../utils/billing";
import { isBillArabicEnabled } from "../../../../utils/alternativeHelpers";
import { Capacitor } from "@capacitor/core";

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
}) => {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState<any>(null);

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

      let totalVatBase = 0;
      const preMapped = details.map((d: any) => {
        const itemMods = modifiersData.filter((m: any) => m.mapId === d.mapId);
        const extras = itemMods.filter((m: any) => (m.price || 0) > 0).map((m: any) => ({
          id: m.modifierId, name: m.modifierName, price: m.price || 0, qty: m.qty || 1, typeId: m.typeId
        }));
        const modifiers = itemMods.filter((m: any) => (m.price || 0) <= 0).map((m: any) => ({
          id: m.modifierId, name: m.modifierName, qty: m.qty || 1, typeId: m.typeId
        }));
        
        const qty = d.qty ?? d.Qty ?? 1;
        const amount = d.amount ?? d.netAmount ?? d.NetAmount ?? d.Amount ?? 0;
        const price = d.price ?? d.Price ?? (qty > 0 ? amount / qty : 0);

        let lineBase = price * qty;
        extras.forEach((ex: any) => lineBase += ex.price * ex.qty);
        
        const itemLineNetAmount = amount || lineBase;
        const itemVatBase = itemLineNetAmount - (d.vatAmount || 0);
        totalVatBase += itemVatBase;
        
        return {
          ...d,
          qty,
          price,
          extras,
          modifiers,
          lineBase,
          itemVatBase
        };
      });

      const calculatedSubTotal = master.vatExclAmount || totalVatBase;

      const mappedItems = preMapped.map((d: any) => {
        return {
          productId: d.productId || d.itemId || 0,
          quantity: d.qty || 1,
          price: d.price || 0,
          variantArabic: d.variantArabic || d.altArabic || d.VariantArabic || d.AltArabic,
          product: { 
            name: d.productName || d.ProductName || `Product #${d.productId || 0}`, 
            price: d.price || 0,
            arabicName: d.arabicName || d.ArabicName
          },
          extras: d.extras,
          modifiers: d.modifiers,
          itemDiscount: d.discAmount || 0,
          lineTotal: d.netAmount || d.amount || d.lineBase || ((d.price || 0) * (d.qty || 1))
        };
      });

      // Determine enableVat dynamically based on configs
      const enableVat = getVatStatus();

      const invoiceNo = master.voucherNo || master.invoiceNo || master.voucherNumber || master.saleNo || (master.saleId ? String(master.saleId) : (orderId ? String(orderId) : undefined));

      const printData = {
        orderNo: master.orderNo ?? String(orderId),
        ticketNo: master.ticketNo ?? "1",
        invoiceNo,
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
        discount: master.discAmount || master.discount || 0,
        serviceCharge: master.serviceCharge || 0,
        levy: master.levyAmt || master.levy || 0,
        vatAmount: master.vatAmount || 0,
        netAmount: master.netAmount || 0,
        deliveryCharge: master.deliveryCharge || 0,
        enableVat,
        billArabic: isBillArabicEnabled()
      };

      if (Capacitor.isNativePlatform()) {
        const { printEscPosMarkup } = await import("../../../../services/qzService");
        const { generateBillMarkup } = await import("../../../../utils/escPosGenerator");
        const markup = generateBillMarkup({ cartDetails: mappedItems as any, data: printData as any });
        await printEscPosMarkup(markup);
      } else {
        const htmlContent = await generateGuestPrintHtml(mappedItems as any, printData);
        const settingsRes = await printerSettingsApi.getGeneral();
        const billPrinter = settingsRes.data?.billPrinter || "No Printer";
        await printHtmlReceipt(htmlContent, billPrinter);
      }
      showToast("Settled receipt sent to printer!", "success");
    } catch (e) {
      console.error(e);
      showToast("Failed to print receipt", "error");
    }
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
                {(master.voucherNo || master.invoiceNo || master.voucherNumber || master.saleNo) && (
                  <div><span className="text-stone-500">Invoice: </span><span className="font-bold">{master.voucherNo || master.invoiceNo || master.voucherNumber || master.saleNo}</span></div>
                )}
                <div><span className="text-stone-500">Order: </span><span className="font-bold">{orderNo}</span></div>
                <div className="text-right col-span-2 sm:col-span-1"><span className="text-stone-500">Type: </span><span className="font-bold">{orderTypeName}</span></div>
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
    </Modal>
  );
};
