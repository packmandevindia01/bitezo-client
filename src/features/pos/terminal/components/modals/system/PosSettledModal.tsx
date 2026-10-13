import React, { useState, useEffect } from "react";
import Modal from "../../../../../../components/common/Modal";
import { Loader, Checkbox } from "../../../../../../components/common";
import { Search, X, XCircle, Pencil } from "lucide-react";
import { usePosSettled } from "../../../hooks/usePosSettled";
import { PosSettledSearchModal } from "./PosSettledSearchModal";
import { PosSettledDetailsModal } from "./PosSettledDetailsModal";
import { ConfirmDialog } from "../../../../../../components/common";
import { matchesOrderSearch } from "../../../utils/orderSearch";
import { useAppDispatch, useAppSelector } from "../../../../../../app/hooks";
import { usePosProducts } from "../../../hooks/usePosProducts";
import { useToast } from "../../../../../../app/providers/useToast";
import { settledOrdersApi } from "../../../../services/settledOrdersApi";
import { salesInvoiceApi } from "../../../../services/salesInvoiceApi";
import { loadSettledOrderIntoCart } from "../../../utils/loadSettledOrderIntoCart";
import { t } from "../../../../utils/posLocalization";

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
  const { orders, loading, fetchOrders, cancelOrder } = usePosSettled();
  const dispatch = useAppDispatch();
  const productCache = useAppSelector((state) => state.pos.productCache);
  const { products } = usePosProducts();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<number>(0);
  const [search, setSearch] = useState("");
  const [includeCancelled, setIncludeCancelled] = useState(false);
  const [includeDeliveryOut] = useState(false);
  const [deliveryOutOnly] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [searchStatus, setSearchStatus] = useState("ORDER NO");
  const [cancelConfirmId, setCancelConfirmId] = useState<number | null>(null);
  const [editingOrderId, setEditingOrderId] = useState<number | null>(null);

  const handleEditOrder = async (orderId: number) => {
    try {
      setEditingOrderId(orderId);
      const response = await settledOrdersApi.getSettledOrderDetails(orderId);
      if (!response || !response.isSuccess || !response.data) {
        showToast(response?.message || `Failed to fetch settled order #${orderId}`, "error");
        return;
      }

      let orderData = response.data;
      const master = orderData.masterData || orderData;
      const rawVoucher =
        master.saleId ||
        master.voucherNo ||
        master.invoiceNo ||
        master.voucherNumber ||
        master.saleNo ||
        orderData.saleId ||
        orderData.voucherNo;
      const saleId = rawVoucher ? parseInt(String(rawVoucher).replace(/\D/g, ""), 10) : NaN;

      if (!isNaN(saleId) && saleId > 0) {
        try {
          const saleRes = await salesInvoiceApi.getSalesInvoiceData(saleId, orderId);
          if (saleRes) {
            const saleMaster =
              saleRes.masterData || saleRes.master || saleRes.data?.masterData || saleRes.data?.master || saleRes;
            const saleDetails =
              saleRes.detailsData || saleRes.details || saleRes.data?.detailsData || saleRes.data?.details;
            const salePayments =
              saleRes.paymodesData ||
              saleRes.paymentData ||
              saleRes.paymodes ||
              saleRes.payments;
            orderData = {
              ...orderData,
              ...saleRes,
              masterData: {
                ...master,
                ...saleMaster,
                saleId,
              },
              detailsData:
                Array.isArray(saleDetails) && saleDetails.length > 0
                  ? saleDetails
                  : orderData.detailsData || orderData.details,
              paymentData:
                Array.isArray(salePayments) && salePayments.length > 0
                  ? salePayments
                  : orderData.paymentData,
            };
          }
        } catch (saleErr) {
          console.warn("[PosSettledModal] getSalesInvoiceData fallback:", saleErr);
        }
      }

      loadSettledOrderIntoCart({
        orderId,
        orderData,
        dispatch,
        products,
        productCache,
        showToast,
        onEditSuccess: () => {
          setIsDetailsOpen(false);
          if (onEditSuccess) {
            onEditSuccess();
          } else {
            onClose();
          }
        },
      });
    } catch (err: any) {
      console.error("[PosSettledModal] Edit error:", err);
      showToast(err?.message || `Failed to load order #${orderId}`, "error");
    } finally {
      setEditingOrderId(null);
    }
  };

  // Filter handlers
  useEffect(() => {
    if (isOpen) {
      const typeValue = ORDER_TYPES.find(t => t.id === activeTab)?.value || 0;
      void fetchOrders({
        OrderTypeId: typeValue,
        SearchValue: search,
        SearchStatus: searchStatus,
        DeliveryOutStatus: includeDeliveryOut,
        DeliveryOutOnlyStatus: deliveryOutOnly,
        IncludeCancelled: includeCancelled,
      });
    }
  }, [isOpen, activeTab, includeDeliveryOut, deliveryOutOnly, search, searchStatus, includeCancelled, fetchOrders]);

  const handleCancelOrder = (transId: number) => {
    setCancelConfirmId(transId);
  };

  const executeCancel = async (transId: number) => {
    setCancelConfirmId(null);
    const success = await cancelOrder(transId);
    if (success) {
      const typeValue = ORDER_TYPES.find(t => t.id === activeTab)?.value || 0;
      void fetchOrders({
        OrderTypeId: typeValue,
        SearchValue: search,
        SearchStatus: searchStatus,
        DeliveryOutStatus: includeDeliveryOut,
        DeliveryOutOnlyStatus: deliveryOutOnly,
        IncludeCancelled: includeCancelled,
      });
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
      DeliveryOutOnlyStatus: deliveryOutOnly,
      IncludeCancelled: includeCancelled,
    });
  };

  const displayedOrders = React.useMemo(() => {
    if (!search || !search.trim()) return orders;
    return orders.filter((order: any) => matchesOrderSearch(order, search, searchStatus));
  }, [orders, search, searchStatus]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="2xl"
      noPadding
      className="bg-[#f8f9fa] border-none shadow-2xl h-[78vh] min-h-[540px] max-h-[720px]"
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
                {t(type.label)}
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
          <div className="flex items-center px-2">
            <Checkbox
              label={t("Include Cancelled")}
              checked={includeCancelled}
              onChange={(e) => setIncludeCancelled(e.target.checked)}
            />
          </div>

          <div className="flex items-center gap-3 flex-1 justify-end">
            <button 
              onClick={() => setIsSearchModalOpen(true)}
              className="px-6 py-2 rounded-xl bg-[#f48120] flex items-center justify-center text-white shadow-md cursor-pointer hover:bg-[#e06d10] transition-all gap-2"
            >
              <Search size={18} strokeWidth={3} />
              <span className="text-xs font-bold uppercase tracking-widest hidden sm:inline">
                {search ? `${t(searchStatus)}: ${search}` : t("Search...")}
              </span>
            </button>
            {search && (
              <button
                onClick={() => handleApplySearch("", "ORDER NO")}
                className="px-4 py-2 rounded-xl border border-gray-300 text-gray-500 hover:bg-gray-100 hover:text-red-500 transition-colors text-xs font-bold uppercase tracking-widest"
              >
                {t("Clear")}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ORDERS LIST SECTION */}
      <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2 bg-[#f0f2f5] relative">
        {loading && (
          <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] z-10 flex items-center justify-center">
            <Loader text="Retrieving Orders..." />
          </div>
        )}

        {!loading && displayedOrders.length === 0 && (
          <div className="flex flex-col items-center justify-center min-h-[300px] h-full py-16 text-slate-400 gap-4">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center">
              <Search size={32} />
            </div>
            <p className="font-bold uppercase tracking-widest text-xs">{t("No orders found")}</p>
          </div>
        )}

        {displayedOrders.map((order: any, index: number) => {
          const isCancelled = Boolean(
            order.isCancelled === true ||
            order.isCancelled === "true" ||
            order.isCancelled === 1 ||
            String(order.action || "").toLowerCase() === "cancelled" ||
            String(order.status || "").toLowerCase() === "cancelled"
          );

          return (
            <div
              key={order.orderId || `recall-${index}`}
              onClick={() => {
                setSelectedOrderId(order.orderId);
                setIsDetailsOpen(true);
              }}
              className={`
                flex items-stretch rounded-xl overflow-hidden shadow-sm border cursor-pointer transition-all group
                ${isCancelled
                  ? selectedOrderId === order.orderId
                    ? "bg-red-600 text-white ring-2 ring-red-600 shadow-lg translate-x-1 border-red-600"
                    : "bg-red-50/80 border-red-200 hover:border-red-400 hover:bg-red-50 hover:shadow-md"
                  : selectedOrderId === order.orderId
                    ? "bg-white ring-2 ring-[#f48120] shadow-lg translate-x-1 border-transparent"
                    : "bg-white border-transparent hover:border-[#f48120]/30 hover:shadow-md"
                }
              `}
            >
              {/* Order Content */}
              <div className={`
                flex-1 p-4 flex flex-col justify-center gap-1.5 transition-colors
                ${selectedOrderId === order.orderId
                  ? isCancelled ? "bg-red-600 text-white" : "bg-[#f48120] text-white"
                  : isCancelled ? "group-hover:bg-red-50/90" : "group-hover:bg-gray-50"
                }
              `}>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                  <div className="flex items-center gap-1.5">
                    <span className={`text-base font-black ${
                      selectedOrderId === order.orderId
                        ? "text-white"
                        : isCancelled
                          ? "text-red-700"
                          : "text-[#49293e]"
                    }`}>
                      {order.orderId}
                    </span>
                  </div>
                  {isCancelled && (
                    <div className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full ${
                      selectedOrderId === order.orderId
                        ? "bg-white/20 text-white border border-white/30"
                        : "bg-red-100 text-red-700 border border-red-200"
                    }`}>
                      <span className="text-[10px] font-black uppercase tracking-wider">
                        {t("Cancelled")}
                      </span>
                    </div>
                  )}
                  {order.isPrinted && (
                    <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full ${
                      selectedOrderId === order.orderId ? "bg-white/20" : "bg-green-100"
                    }`}>
                      <span className={`text-[10px] font-bold uppercase tracking-tighter ${
                        selectedOrderId === order.orderId ? "text-white" : "text-green-700"
                      }`}>
                        {t("Printed")}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex items-start gap-2">
                  <div className={`mt-1.5 shrink-0 h-1.5 w-1.5 rounded-full ${
                    selectedOrderId === order.orderId
                      ? "bg-white"
                      : isCancelled
                        ? "bg-red-500"
                        : "bg-[#f48120]"
                  }`} />
                  <p className={`text-sm font-bold leading-snug italic ${
                    selectedOrderId === order.orderId
                      ? "text-white"
                      : isCancelled
                        ? "text-red-950/80 line-through decoration-red-400"
                        : "text-gray-800"
                  }`}>
                    "{order.details}"
                  </p>
                </div>
              </div>

              {/* Action Buttons Wrapper */}
              <div className="flex shrink-0">
                {/* Edit Button */}
                <div className="w-[80px] shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      void handleEditOrder(order.orderId);
                    }}
                    disabled={editingOrderId === order.orderId}
                    className="w-full h-full flex flex-col items-center justify-center gap-1 transition-all bg-[#49293e] hover:bg-[#5c3450] text-white disabled:opacity-50"
                    title={t("Edit Settled Order")}
                  >
                    <Pencil size={18} strokeWidth={2.5} />
                    <div className="font-black text-[10px] uppercase tracking-widest">
                      {editingOrderId === order.orderId ? "..." : t("Edit")}
                    </div>
                  </button>
                </div>

                {/* Cancel Button */}
                <div className="w-[80px] shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!isCancelled) {
                        handleCancelOrder(order.orderId);
                      }
                    }}
                    disabled={isCancelled}
                    className={`w-full h-full flex flex-col items-center justify-center gap-1 transition-all ${
                      isCancelled
                        ? "bg-stone-200 text-stone-400 cursor-not-allowed opacity-50"
                        : "bg-[#9c142c] hover:bg-[#850f24] text-white"
                    }`}
                    title={isCancelled ? "Order is already cancelled" : "Cancel Settled Order"}
                  >
                    <XCircle size={18} strokeWidth={3} />
                    <div className="font-black text-[10px] uppercase tracking-widest">
                      {t("Cancel")}
                    </div>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
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
        orderDetailsStr={orders.find(o => o.orderId === selectedOrderId)?.details}
        orderSummary={orders.find(o => o.orderId === selectedOrderId)}
        onEditSuccess={() => {
          setIsDetailsOpen(false);
          if (onEditSuccess) {
            onEditSuccess();
          } else {
            onClose();
          }
        }}
      />
      <ConfirmDialog
        isOpen={!!cancelConfirmId}
        title="Cancel Settled Order"
        message={`Are you sure you want to cancel Settled Order #${cancelConfirmId}? This action cannot be undone.`}
        confirmLabel="Yes, Cancel Order"
        onConfirm={() => {
          if (cancelConfirmId) executeCancel(cancelConfirmId);
        }}
        onCancel={() => setCancelConfirmId(null)}
      />
    </Modal>
  );
};

