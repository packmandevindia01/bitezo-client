import React, { useState, useEffect } from "react";
import Modal from "../../../../../components/common/Modal";
import { Loader } from "../../../../../components/common";
import { Search, X, XCircle } from "lucide-react";
import { usePosSettled } from "../../hooks/usePosSettled";
import { useToast } from "../../../../../app/providers/useToast";
import { PosSettledSearchModal } from "./PosSettledSearchModal";
import { PosSettledDetailsModal } from "./PosSettledDetailsModal";


interface PosSettledModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEditSuccess?: () => void;
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

export const PosSettledModal: React.FC<PosSettledModalProps> = ({ isOpen, onClose, onEditSuccess }) => {
  const { orders, loading, fetchOrders } = usePosSettled();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<number>(0);
  const [search, setSearch] = useState("");
  const [includeDeliveryOut] = useState(true);
  const [deliveryOutOnly] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
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

  const handleCancelOrder = (transId: number) => {
    showToast(`Cancelling Order #${transId}...`, "success");
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
      className="bg-[#f8f9fa] border-none shadow-2xl"
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
          <div className="flex flex-col justify-center px-2">
            {/* Delivery Out checkboxes removed per user request */}
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
      <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-[#f0f2f5] relative min-h-[400px]">
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
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                <div className="flex items-center gap-1">
                  <span className={`text-base font-black ${selectedOrderId === order.orderId ? "text-white" : "text-[#49293e]"}`}>
                    {order.orderId}
                  </span>
                </div>
                {order.isPrinted && (
                  <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full ${selectedOrderId === order.orderId ? "bg-white/20" : "bg-green-100"}`}>
                    <span className={`text-[10px] font-bold uppercase tracking-tighter ${selectedOrderId === order.orderId ? "text-white" : "text-green-700"}`}>
                      Printed
                    </span>
                  </div>
                )}
              </div>

              <div className="flex items-start gap-2">
                <div className={`mt-1.5 shrink-0 h-1.5 w-1.5 rounded-full ${selectedOrderId === order.orderId ? "bg-white" : "bg-[#f48120]"}`} />
                <p className={`text-sm font-bold leading-snug italic ${selectedOrderId === order.orderId ? "text-white" : "text-gray-800"}`}>
                  "{order.details}"
                </p>
              </div>
            </div>

            {/* Cancel Button Wrapper */}
            <div className="w-[100px] shrink-0">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleCancelOrder(order.orderId);
                }}
                className={`
                  w-full h-full flex flex-col items-center justify-center gap-1 transition-all
                  bg-[#9c142c] hover:bg-[#850f24] text-white
                `}
              >
                <XCircle size={18} strokeWidth={3} />
                <div className="font-black text-[10px] uppercase tracking-widest">
                  Cancel
                </div>
              </button>
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
      <PosSettledSearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        onSearch={handleApplySearch}
        initialSearchStatus={searchStatus}
        initialSearchValue={search}
      />

      <PosSettledDetailsModal
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        orderId={selectedOrderId}
        onEditSuccess={() => {
          onEditSuccess?.();
          onClose();
        }}
      />
    </Modal>
  );
};

