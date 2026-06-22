import React, { useState, useEffect } from "react";
import Modal from "../../../../../components/common/Modal";
import Button from "../../../../../components/common/Button";
import Checkbox from "../../../../../components/common/Checkbox";
import FormInput from "../../../../../components/common/FormInput";
import { Loader } from "../../../../../components/common";
import { TouchKeyboard } from "../../../../../components/common/TouchKeyboard";
import { Search, X } from "lucide-react";
import { usePosVoid } from "../../hooks/usePosVoid";
import { PosRecallSearchModal } from "./PosRecallSearchModal";

interface PosVoidModalProps {
  isOpen: boolean;
  onClose: () => void;
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

export const PosVoidModal: React.FC<PosVoidModalProps> = ({ isOpen, onClose }) => {
  const { orders, loading, fetchOrders, executeVoidOrder } = usePosVoid();
  const [activeTab, setActiveTab] = useState<number>(0);
  const [search, setSearch] = useState("");
  const [includeDeliveryOut, setIncludeDeliveryOut] = useState(true);
  const [deliveryOutOnly, setDeliveryOutOnly] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [searchStatus, setSearchStatus] = useState("Order No");
  const [reason, setReason] = useState("");

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
      setSelectedOrderId(null);
      setReason("");
    }
  }, [isOpen, activeTab, includeDeliveryOut, deliveryOutOnly, search, searchStatus, fetchOrders]);

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

  const handleVoidOrder = async () => {
    if (!selectedOrderId) return;
    if (!reason.trim()) {
      return; // Reason is required, validation handled by disabled state
    }
    const success = await executeVoidOrder(selectedOrderId, reason);
    if (success) {
      setSelectedOrderId(null);
      setReason("");
      // Don't close immediately so they can see success and remaining orders
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="2xl"
      noPadding
      className="bg-[#f8f9fa] border-none shadow-2xl flex flex-col h-[95vh] !max-h-[95vh]"
    >
      {/* HEADER SECTION - Red theme for Void */}
      <div className="flex flex-col shrink-0">
        {/* Navigation Tabs */}
        <div className="flex items-stretch bg-red-900 text-white">
          <div className="flex-1 flex overflow-x-auto no-scrollbar items-center px-4 font-black uppercase tracking-widest text-sm">
            VOID ORDERS
          </div>
          <button
            onClick={onClose}
            className="px-6 py-4 flex items-center justify-center bg-red-950 hover:bg-black text-white transition-colors shrink-0"
          >
            <X size={20} strokeWidth={3} />
          </button>
        </div>

        {/* Order Types Tabs */}
        <div className="flex items-stretch bg-[#49293e] text-white">
          <div className="flex-1 flex overflow-x-auto no-scrollbar">
            {ORDER_TYPES.map((type) => (
              <button
                key={type.id}
                onClick={() => setActiveTab(type.id)}
                className={`
                  px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-all min-w-[80px] sm:min-w-[100px]
                  ${activeTab === type.id ? "bg-red-600 text-white shadow-inner" : "hover:bg-white/10 text-white/80"}
                  border-r border-white/10
                `}
              >
                {type.label}
              </button>
            ))}
          </div>
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
              className="px-6 py-2 rounded-xl bg-[#49293e] flex items-center justify-center text-white shadow-md cursor-pointer hover:bg-[#341d2c] transition-all gap-2"
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
      <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-[#f0f2f5] relative min-h-[300px]">
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
            key={order.orderId || `void-${index}`}
            onClick={() => setSelectedOrderId(order.orderId)}
            className={`
              flex items-stretch bg-white rounded-xl overflow-hidden shadow-sm border border-transparent cursor-pointer
              hover:border-red-500/30 hover:shadow-md transition-all group
              ${selectedOrderId === order.orderId ? "ring-2 ring-red-500 shadow-lg translate-x-1" : ""}
            `}
          >
            {/* Order Content */}
            <div className={`
              flex-1 p-4 flex flex-col justify-center gap-1.5 transition-colors
              ${selectedOrderId === order.orderId ? "bg-red-50 text-red-900" : "group-hover:bg-gray-50"}
            `}>
              <div className="flex items-start gap-2">
                <div className={`mt-1.5 shrink-0 h-1.5 w-1.5 rounded-full ${selectedOrderId === order.orderId ? "bg-red-500" : "bg-gray-400"}`} />
                <p className={`text-sm font-bold leading-snug italic ${selectedOrderId === order.orderId ? "text-red-900" : "text-gray-800"}`}>
                  "{order.details}"
                </p>
              </div>
            </div>

            {/* Void Button */}
            <div className="w-[100px] shrink-0 border-l border-gray-100">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedOrderId(order.orderId);
                }}
                className="w-full h-full flex items-center justify-center bg-red-600 hover:bg-red-700 text-white transition-colors"
              >
                <span className="text-xs font-bold uppercase tracking-widest">Void</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* REASON MODAL (Pops up when an order is selected) */}
      <Modal
        isOpen={!!selectedOrderId}
        onClose={() => {
          setSelectedOrderId(null);
          setReason("");
        }}
        title="Reason for Voiding"
        size="xl"
      >
        <div className="flex flex-col gap-4">
          <FormInput
            placeholder="Enter reason..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            autoFocus
          />
          <TouchKeyboard
            embedded
            size="md"
            onClose={() => {
              setSelectedOrderId(null);
              setReason("");
            }}
            onEnter={() => {
              if (reason.trim()) {
                handleVoidOrder();
              }
            }}
          />
          <Button 
            variant="danger" 
            onClick={handleVoidOrder} 
            disabled={!reason.trim()}
            className="w-full h-14 mt-2 shadow-lg"
            isAction
          >
            Submit
          </Button>
        </div>
      </Modal>

      {/* Embedded Search Modal */}
      <PosRecallSearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        onSearch={handleApplySearch}
        initialSearchStatus={searchStatus}
        initialSearchValue={search}
      />
    </Modal>
  );
};
