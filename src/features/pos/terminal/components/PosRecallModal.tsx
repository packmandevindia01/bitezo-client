import React, { useState, useEffect } from "react";
import Modal from "../../../../components/common/Modal";
import Button from "../../../../components/common/Button";
import Checkbox from "../../../../components/common/Checkbox";
import { Loader } from "../../../../components/common";
import { Printer, Search, RotateCcw, CheckCircle } from "lucide-react";
import { usePosRecall } from "../hooks/usePosRecall";
import { useToast } from "../../../../app/providers/useToast";

interface PosRecallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ORDER_TYPES = [
  { id: "All", label: "All", value: "All" },
  { id: "Dine In", label: "Dine In", value: "dine-in" },
  { id: "Take Out", label: "Take Out", value: "TakeOut" },
  { id: "Drive Thru", label: "Drive Thru", value: "DriveThru" },
  { id: "Delivery", label: "Delivery", value: "Delivery" },
  { id: "Providers", label: "Providers", value: "Providers" },
  { id: "Coming", label: "Coming", value: "Coming" },
];

export const PosRecallModal: React.FC<PosRecallModalProps> = ({ isOpen, onClose }) => {
  const { orders, loading, fetchOrders } = usePosRecall();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState("All");
  const [search, setSearch] = useState("");
  const [includeDeliveryOut, setIncludeDeliveryOut] = useState(true);
  const [deliveryOutOnly, setDeliveryOutOnly] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);

  // Filter handlers
  useEffect(() => {
    if (isOpen) {
      const typeValue = ORDER_TYPES.find(t => t.id === activeTab)?.value || "";
      void fetchOrders({
        OrderType: typeValue,
        SearchValue: search,
        DeliveryOutStatus: includeDeliveryOut,
        DeliveryOutOnlyStatus: deliveryOutOnly
      });
    }
  }, [isOpen, activeTab, includeDeliveryOut, deliveryOutOnly, fetchOrders]);

  const handlePrint = (transId: number) => {
    showToast(`Printing Order #${transId}...`, "success");
    // TODO: Integrate with actual printing service
  };

  const handleSearch = () => {
    const typeValue = ORDER_TYPES.find(t => t.id === activeTab)?.value || "";
    void fetchOrders({
      OrderType: typeValue,
      SearchValue: search,
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
                  px-6 py-4 text-sm font-bold uppercase tracking-wider transition-all min-w-[100px]
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
            className="px-8 py-4 bg-red-700 hover:bg-red-800 text-white font-bold uppercase transition-colors"
          >
            Close
          </button>
        </div>

        {/* Sub-Header with Filters & Search */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-3 bg-white border-b border-gray-200 shadow-sm">
          <div className="flex items-center gap-6 px-2">
            <label className="flex items-center gap-2 cursor-pointer group">
              <Checkbox 
                checked={includeDeliveryOut} 
                onChange={(e) => setIncludeDeliveryOut(e.target.checked)} 
              />
              <span className="text-xs font-semibold text-gray-600 group-hover:text-gray-900 transition-colors uppercase tracking-tight">
                Including Delivery Out
              </span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer group">
              <Checkbox 
                checked={deliveryOutOnly} 
                onChange={(e) => setDeliveryOutOnly(e.target.checked)} 
              />
              <span className="text-xs font-semibold text-gray-600 group-hover:text-gray-900 transition-colors uppercase tracking-tight">
                Delivery Out Only
              </span>
            </label>
          </div>

          <div className="flex items-center gap-3 flex-1 max-w-md">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search orders, tickets, customers..."
                className="w-full pl-10 pr-4 py-2 bg-gray-100 border-none rounded-lg focus:ring-2 focus:ring-[#f48120] text-sm font-medium transition-all"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <button 
              onClick={handleSearch}
              className="w-10 h-10 rounded-full bg-[#f48120] flex items-center justify-center text-white shadow-md cursor-pointer hover:scale-105 transition-transform active:scale-95"
            >
              <Search size={20} strokeWidth={3} />
            </button>
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
            key={order.transId || `recall-${index}`}
            onClick={() => setSelectedOrderId(order.transId)}
            className={`
              flex items-stretch bg-white rounded-xl overflow-hidden shadow-sm border border-transparent cursor-pointer
              hover:border-[#f48120]/30 hover:shadow-md transition-all group
              ${selectedOrderId === order.transId ? "ring-2 ring-[#f48120] shadow-lg translate-x-1" : ""}
            `}
          >
            {/* Order Content */}
            <div className={`
              flex-1 p-4 flex flex-col justify-center gap-1.5 transition-colors
              ${selectedOrderId === order.transId ? "bg-[#f48120] text-white" : "group-hover:bg-gray-50"}
            `}>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                <div className="flex items-center gap-1">
                  <span className={`text-[10px] font-bold uppercase ${selectedOrderId === order.transId ? "text-white/60" : "text-gray-400"}`}>
                    ID
                  </span>
                  <span className={`text-base font-black ${selectedOrderId === order.transId ? "text-white" : "text-[#49293e]"}`}>
                    {order.transId}
                  </span>
                </div>
                {order.isPrinted && (
                  <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full ${selectedOrderId === order.transId ? "bg-white/20" : "bg-green-100"}`}>
                    <span className={`text-[10px] font-bold uppercase tracking-tighter ${selectedOrderId === order.transId ? "text-white" : "text-green-700"}`}>
                      Printed
                    </span>
                  </div>
                )}
              </div>

              <div className="flex items-start gap-2">
                <div className={`mt-1.5 shrink-0 h-1.5 w-1.5 rounded-full ${selectedOrderId === order.transId ? "bg-white" : "bg-[#f48120]"}`} />
                <p className={`text-sm font-bold leading-snug italic ${selectedOrderId === order.transId ? "text-white" : "text-gray-800"}`}>
                  "{order.details}"
                </p>
              </div>
            </div>

            {/* Print Button Wrapper */}
            <div className="w-[100px] shrink-0">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handlePrint(order.transId);
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
        ))}
      </div>

      {/* FOOTER */}
      <div className="p-4 bg-white border-t border-gray-200 flex justify-between items-center shrink-0">
        <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">
          Total Records: {orders.length}
        </div>
        <div className="flex gap-3">
          <Button 
            variant="secondary" 
            onClick={onClose} 
            tabIndex={-1}
            isAction
            icon={<RotateCcw size={18} />}
          >
            Clear
          </Button>
          <Button 
            variant="primary" 
            onClick={onClose} 
            disabled={!selectedOrderId}
            isAction
            icon={<CheckCircle size={18} />}
          >
            Select
          </Button>
        </div>
      </div>
    </Modal>
  );
};

