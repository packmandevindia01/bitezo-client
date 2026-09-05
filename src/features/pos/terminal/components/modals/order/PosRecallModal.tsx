import React, { useState, useEffect } from "react";
import Modal from "../../../../../../components/common/Modal";
import Checkbox from "../../../../../../components/common/Checkbox";
import { Loader } from "../../../../../../components/common";
import { Printer, Search, X, Truck } from "lucide-react";
import { usePosRecall } from "../../../hooks/usePosRecall";
import { useToast } from "../../../../../../app/providers/useToast";
import { PosRecallSearchModal } from "./PosRecallSearchModal";
import { PosRecallDetailsModal } from "./PosRecallDetailsModal";
import { PosDriverSelectionModal } from "./PosDriverSelectionModal";
import { orderApi } from "../../../../services/orderApi";
import { generateGuestPrintHtml } from "../../../../utils/guestPrintTemplate";
import { printHtmlReceipt } from "../../../../services/qzService";
import { printerSettingsApi } from "../../../../services/printerSettingsApi";
import { getVatStatus } from "../../../utils/billing";
import { Capacitor } from "@capacitor/core";


interface PosRecallModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSettleSuccess?: (amount: number) => void;
}

const ORDER_TYPES = [
  { id: 0, label: "All", value: 0 },
  { id: 1, label: "Dine In", value: 1 },
  { id: 2, label: "Take Out", value: 2 },
  { id: 3, label: "Drive Thru", value: 3 },
  { id: 4, label: "Delivery", value: 4 },
  { id: 5, label: "Providers", value: 5 },
  { id: 6, label: "Coming", value: 6 },
];

export const PosRecallModal: React.FC<PosRecallModalProps> = ({ isOpen, onClose, onSettleSuccess }) => {
  const { orders, loading, fetchOrders } = usePosRecall();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<number>(0);
  const [search, setSearch] = useState("");
  const [includeDeliveryOut, setIncludeDeliveryOut] = useState(true);
  const [deliveryOutOnly, setDeliveryOutOnly] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [selectedDriverOrderId, setSelectedDriverOrderId] = useState<number | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [searchStatus, setSearchStatus] = useState("Order No");

  // Filter handlers
  useEffect(() => {
    if (isOpen) {
      const typeValue = ORDER_TYPES.find(t => t.id === activeTab)?.value || 0;
      void fetchOrders({
        OrderTypeId: typeValue,
        SearchValue: search,
        SearchStatus: searchStatus,
        DeliveryOutStatus: includeDeliveryOut,
        DeliveryOutOnlyStatus: deliveryOutOnly
      });
    }
  }, [isOpen, activeTab, includeDeliveryOut, deliveryOutOnly, search, searchStatus, fetchOrders]);

  const handlePrint = async (transId: number) => {
    try {
      showToast(`Fetching Order #${transId} for printing...`, "info");
      
      const orderRes = await orderApi.getOrderDetails(transId);
      if (!orderRes || !orderRes.isSuccess || !orderRes.data) {
        showToast(`Failed to load order #${transId} for printing`, "error");
        return;
      }
      const order = orderRes.data;
      
      const master = order.masterData || order;
      const details = order.detailsData || order.details || [];
      
      const orderTypeMap: Record<number, string> = {
        1: "DineIn", 2: "TakeOut", 3: "DriveThru",
        4: "Delivery", 5: "Providers", 6: "Coming"
      };
      const orderTypeName = master.orderType || orderTypeMap[master.orderTypeId] || master.orderTypeName || order?.orderTypeName || "DineIn";

      const voucherDateStr = master.voucherDate ?? master.orderDate ?? master.createdAt;
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

      // Deduplicate modifiersData mapped in order
      const rawModifiers = order?.modifiersData || [];
      const seen = new Set<string>();
      const orderModifiersData = rawModifiers.filter((m: any) => {
        const key = `${m.mapId}-${m.modifierId}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      let calculatedSubTotal = 0;
      let calculatedVatTotal = 0;
      const mappedItems = details.map((d: any) => {
        const itemMods = orderModifiersData.filter((m: any) => m.mapId === d.mapId);
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
        calculatedSubTotal += lineBase;
        calculatedVatTotal += (d.vatAmount || 0);
        
        return {
          productId: d.productId || d.itemId || 0,
          quantity: d.qty || 1,
          price: d.price || 0,
          product: { name: d.productName || d.ProductName || `Product #${d.productId || 0}`, price: d.price || 0 },
          extras,
          modifiers,
          messages,
          lineTotal: lineBase
        };
      });

      const enableVat = getVatStatus();

      const printData = {
        orderNo: master.orderNo ?? String(transId),
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
        vatAmount: master.vatAmount || calculatedVatTotal || 0,
        netAmount: master.netAmount || 0,
        deliveryCharge: master.deliveryCharge || 0,
        enableVat
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
      showToast("Guest receipt sent to printer!", "success");
    } catch (err) {
      console.error("Print Error:", err);
      showToast("Printing failed", "error");
    }
  };

  const handleApplySearch = (value: string, status: string) => {
    setSearch(value);
    setSearchStatus(status);
    const typeValue = ORDER_TYPES.find(t => t.id === activeTab)?.value || 0;
    void fetchOrders({
      OrderTypeId: typeValue,
      SearchValue: value,
      SearchStatus: status,
      DeliveryOutStatus: includeDeliveryOut,
      DeliveryOutOnlyStatus: deliveryOutOnly
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="2xl"
      noPadding
      noScroll
      className="bg-[#f8f9fa] border-none shadow-2xl h-[95vh] max-h-[900px] flex flex-col"
    >
      {/* HEADER SECTION */}
      <div className="flex flex-col shrink-0">
        {/* Navigation Tabs */}
        <div className="flex items-stretch bg-[#49293e] text-white">
          <div className="flex-1 flex overflow-x-auto no-scrollbar">
            {ORDER_TYPES.map((type) => (
              <button
                key={type.id}
                onClick={() => setActiveTab(type.id)}
                className={`
                  px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-all min-w-[80px] sm:min-w-[100px]
                  ${activeTab === type.id ? "bg-[#f48120] text-white shadow-inner" : "hover:bg-white/10 text-white/80"}
                  border-r border-white/10
                `}
              >
                {type.label}
              </button>
            ))}
          </div>
          <button
            onClick={onClose}
            className="px-6 py-2.5 flex items-center justify-center bg-red-700 hover:bg-red-800 text-white transition-colors shrink-0"
          >
            <X size={20} strokeWidth={3} />
          </button>
        </div>

        {/* Sub-Header with Filters & Search */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-3 bg-white border-b border-gray-200 shadow-sm">
          <div className="flex flex-row items-center gap-6 px-2">
            <label className="flex items-center gap-2 cursor-pointer group">
              <Checkbox 
                checked={includeDeliveryOut} 
                onChange={(e) => setIncludeDeliveryOut(e.target.checked)} 
              />
              <span className="text-[10px] font-bold text-gray-600 group-hover:text-gray-900 transition-colors uppercase tracking-tight">
                Including Delivery Out
              </span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer group">
              <Checkbox 
                checked={deliveryOutOnly} 
                onChange={(e) => setDeliveryOutOnly(e.target.checked)} 
              />
              <span className="text-[10px] font-bold text-gray-600 group-hover:text-gray-900 transition-colors uppercase tracking-tight">
                Delivery Out Only
              </span>
            </label>
          </div>

          <div className="flex items-center gap-3 flex-1 justify-end">
            <button 
              onClick={() => setIsSearchModalOpen(true)}
              className="px-6 py-2 rounded-xl bg-[#f48120] flex items-center justify-center text-white shadow-md cursor-pointer hover:bg-[#e06d10] transition-all gap-2"
            >
              <Search size={18} strokeWidth={3} />
              <span className="text-xs font-bold uppercase tracking-widest hidden sm:inline">
                {search ? `${searchStatus}: ${search}` : "Search..."}
              </span>
            </button>
            {search && (
              <button
                onClick={() => handleApplySearch("", "Order No")}
                className="px-4 py-2 rounded-xl border border-gray-300 text-gray-500 hover:bg-gray-100 hover:text-red-500 transition-colors text-xs font-bold uppercase tracking-widest"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ORDERS LIST SECTION */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-[#f0f2f5] relative">
        {loading && (
          <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] z-10 flex items-center justify-center">
            <Loader text="Retrieving Orders..." />
          </div>
        )}

        {!loading && orders.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full py-20 text-slate-400 gap-4">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center">
              <Search size={32} />
            </div>
            <p className="font-bold uppercase tracking-widest text-xs">No orders found</p>
          </div>
        )}

        {orders.map((order, index) => (
          <div
            key={order.orderId || `recall-${index}`}
            onClick={() => {
              setSelectedOrderId(order.orderId);
              setIsDetailsOpen(true);
            }}
            className={`
              flex items-stretch bg-white rounded-xl overflow-hidden shadow-sm border border-transparent cursor-pointer
              hover:border-[#f48120]/30 hover:shadow-md transition-all group
              ${selectedOrderId === order.orderId ? "ring-2 ring-[#f48120] shadow-lg translate-x-1" : ""}
            `}
          >
            {/* Order Content */}
            <div className={`
              flex-1 p-4 flex flex-col justify-center gap-1.5 transition-colors
              ${selectedOrderId === order.orderId ? "bg-[#f48120] text-white" : "group-hover:bg-gray-50"}
            `}>
              {order.isPrinted && (
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                  <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full ${selectedOrderId === order.orderId ? "bg-white/20" : "bg-green-100"}`}>
                    <span className={`text-[10px] font-bold uppercase tracking-tighter ${selectedOrderId === order.orderId ? "text-white" : "text-green-700"}`}>
                      Printed
                    </span>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-2">
                <div className={`mt-1.5 shrink-0 h-1.5 w-1.5 rounded-full ${selectedOrderId === order.orderId ? "bg-white" : "bg-[#f48120]"}`} />
                <p className={`text-sm font-bold leading-snug italic ${selectedOrderId === order.orderId ? "text-white" : "text-gray-800"}`}>
                  "{order.details}"
                </p>
              </div>
            </div>

            {/* Action Buttons Wrapper */}
            <div className="flex shrink-0">
              {order.details.toLowerCase().includes("(delivery)") && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedDriverOrderId(order.orderId);
                  }}
                  className={`
                    w-[90px] h-full flex flex-col items-center justify-center gap-1 transition-all bg-gray-200 hover:bg-gray-300 text-gray-700
                  `}
                >
                  <Truck size={18} strokeWidth={2.5} />
                  <div className="font-black text-[10px] uppercase tracking-widest">
                    Driver
                  </div>
                </button>
              )}
              {/* Print Button Wrapper */}
              <div className="w-[100px] shrink-0">
                <button
                  onClick={(e) => {
                  e.stopPropagation();
                  handlePrint(order.orderId);
                }}
                className={`
                  w-full h-full flex flex-col items-center justify-center gap-1 transition-all
                  ${order.isPrinted 
                    ? "bg-[#3e4d22] hover:bg-[#34411c] text-white" 
                    : "bg-[#556b2f] hover:bg-[#4a5d29] text-white"}
                `}
              >
                <Printer size={18} strokeWidth={3} />
                <div className="font-black text-[10px] uppercase tracking-widest">
                  Print
                </div>
              </button>
            </div>
            </div>
          </div>
        ))}
      </div>

      {/* FOOTER */}
      <div className="p-4 bg-white border-t border-gray-200 flex justify-between items-center shrink-0">
        <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">
          Total Records: {orders.length}
        </div>
      </div>

      {/* Embedded Search Modal */}
      <PosRecallSearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        onSearch={handleApplySearch}
        initialSearchStatus={searchStatus}
        initialSearchValue={search}
      />

      <PosRecallDetailsModal
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        orderId={selectedOrderId}
        orderDetailsStr={orders.find(o => o.orderId === selectedOrderId)?.details}
        onEditSuccess={onClose}
        onSettleSuccess={(amount) => {
          onSettleSuccess?.(amount);
          // DO NOT close the details modal here so it stays in the background during payment
        }}
      />
      
      <PosDriverSelectionModal
        isOpen={selectedDriverOrderId !== null}
        onClose={() => setSelectedDriverOrderId(null)}
        orderId={selectedDriverOrderId}
        onSuccess={() => {
          setSelectedDriverOrderId(null);
          void fetchOrders({
            OrderTypeId: ORDER_TYPES.find(t => t.id === activeTab)?.value || 0,
            SearchValue: search,
            SearchStatus: searchStatus,
            DeliveryOutStatus: includeDeliveryOut,
            DeliveryOutOnlyStatus: deliveryOutOnly
          });
        }}
      />
    </Modal>
  );
};
