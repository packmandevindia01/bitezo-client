import React, { useState, useEffect } from "react";
import { Modal, Button, ConfirmDialog } from "../../../../../../components/common";
import { orderApi } from "../../../../services/orderApi";
import { usePosProducts } from "../../../hooks/usePosProducts";
import { useAppSelector, useAppDispatch } from "../../../../../../app/hooks";
import { useToast } from "../../../../../../app/providers/useToast";
import { ChevronRight, ChevronLeft } from "lucide-react";
import { getDecimalPart } from "../../../../../../utils/currency";
import { loadRecalledOrder, setCombinedOrderIds } from "../../../store/posSlice";
import { sortOrderDetailsBySequence } from "../../../utils/orderSort";
import { useCashierLog } from "../../../../cashier";
import { mapOrderDetailsToCartItems } from "../../../mappers/orderDetailToCartMapper";

interface CombineOrder {
  orderId: number;
  details: string;
}

interface PosCombineModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PosCombineModal: React.FC<PosCombineModalProps> = ({ isOpen, onClose }) => {
  const dispatch = useAppDispatch();
  const { showToast } = useToast();

  const [availableOrders, setAvailableOrders] = useState<CombineOrder[]>([]);
  const [selectedOrders, setSelectedOrders] = useState<CombineOrder[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCombining, setIsCombining] = useState(false);

  const [selectedAvailableId, setSelectedAvailableId] = useState<number | null>(null);
  const [selectedSelectedId, setSelectedSelectedId] = useState<number | null>(null);
  const [showBillDiscountConfirm, setShowBillDiscountConfirm] = useState(false);

  const productCache = useAppSelector(state => state.pos.productCache);
  const { 
    selectedOrderTypeId, 
    editingOrderId, 
    selectedOrderTypeName,
    selectedCustomerId,
    selectedAddressId,
    billDiscountValue,
    selectedSectionId,
    selectedTableId
  } = useAppSelector(state => state.pos);

  const { products } = usePosProducts();

  const { status } = useCashierLog();
  const dayId = status?.dayId || 0;
  const decimals = getDecimalPart();

  useEffect(() => {
    if (isOpen && editingOrderId) {
      fetchAvailableOrders();
      setSelectedOrders([]);
      setSelectedAvailableId(null);
      setSelectedSelectedId(null);
      setShowBillDiscountConfirm(false);
    }
  }, [isOpen, editingOrderId]);

  const fetchAvailableOrders = async () => {
    setIsLoading(true);
    try {
      const params = {
        DayId: dayId,
        OrderTypeId: selectedOrderTypeId, 
        OrderId: editingOrderId as number,
        Decimals: decimals,
      };
      console.log("COMBINE PARAMS SENT:", params);
      const response = await orderApi.getCombineOrders(params);

      if (response.isSuccess) {
        let orders = response.data || [];
        // Manually ensure the current editing order is NEVER in the list
        orders = orders.filter((o: any) => o.orderId !== editingOrderId);
        setAvailableOrders(orders);
      } else {
        showToast(response.message || "Failed to fetch orders", "error");
      }
    } catch (err: any) {
      showToast(err.message || "Failed to fetch orders", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleMoveToSelected = () => {
    if (!selectedAvailableId) return;
    const orderToMove = availableOrders.find(o => o.orderId === selectedAvailableId);
    if (orderToMove) {
      setAvailableOrders(prev => prev.filter(o => o.orderId !== selectedAvailableId));
      setSelectedOrders(prev => [...prev, orderToMove]);
      setSelectedAvailableId(null);
    }
  };

  const handleMoveToAvailable = () => {
    if (!selectedSelectedId) return;
    const orderToMove = selectedOrders.find(o => o.orderId === selectedSelectedId);
    if (orderToMove) {
      setSelectedOrders(prev => prev.filter(o => o.orderId !== selectedSelectedId));
      setAvailableOrders(prev => [...prev, orderToMove]);
      setSelectedSelectedId(null);
    }
  };

  const handleDone = async () => {
    if (selectedOrders.length === 0) {
      onClose();
      return;
    }

    // Check if any order to be combined contains a bill discount
    let currentOrderHasBillDisc = Number(billDiscountValue || 0) > 0;
    if (!currentOrderHasBillDisc && editingOrderId) {
      try {
        const curRes = await orderApi.getOrderDetails(editingOrderId as number);
        const curMaster = curRes?.data?.masterData || curRes?.masterData || curRes?.data || curRes;
        const curDetails = curRes?.data?.detailsData || curRes?.detailsData || curRes?.data?.details || curRes?.details || [];
        const hasLineDiscounts = Array.isArray(curDetails) && curDetails.some((d: any) => Number(d.discAmount || d.discountValue || 0) > 0);
        if (
          Boolean(curMaster?.complimentaryStatus || curMaster?.ComplimentaryStatus) ||
          (curMaster?.discPer !== undefined && curMaster?.discPer !== null && Number(curMaster.discPer) > 0) ||
          (!hasLineDiscounts && Number(curMaster?.discAmount || 0) > 0) ||
          Number(curMaster?.billDiscountValue || 0) > 0
        ) {
          currentOrderHasBillDisc = true;
        }
      } catch (err) {
        console.warn("Could not check current order for bill discount:", err);
      }
    }
    let anyOrderHasBillDisc = currentOrderHasBillDisc;

    if (!anyOrderHasBillDisc) {
      // Check selected orders for bill discount flags or details string
      anyOrderHasBillDisc = selectedOrders.some((o: any) => {
        if (!o) return false;
        if (Number(o.billDiscountValue || o.billDiscount || 0) > 0) return true;
        if (Number(o.discPer || 0) > 0) return true;
        if (Number(o.discAmount || 0) > 0) return true;
        if (Boolean(o.complimentaryStatus || o.ComplimentaryStatus)) return true;
        if (typeof o.details === "string") {
          const discMatch = o.details.match(/disc(?:ount)?\s*[:=]\s*([0-9.]+)/i);
          if (discMatch && parseFloat(discMatch[1]) > 0) return true;
        }
        return false;
      });
    }

    if (!anyOrderHasBillDisc) {
      // Deep check selected orders via getOrderDetails
      try {
        const detailsResponses = await Promise.all(
          selectedOrders.map((o) => orderApi.getOrderDetails(o.orderId))
        );
        for (const res of detailsResponses) {
          const m = res?.data?.masterData || res?.masterData || res?.data || res;
          const details =
            res?.data?.detailsData ||
            res?.detailsData ||
            res?.data?.details ||
            res?.details ||
            [];
          const hasLineDiscounts =
            Array.isArray(details) &&
            details.some((d: any) => Number(d.discAmount || d.discountValue || 0) > 0);
          const isBillDisc =
            Boolean(m?.complimentaryStatus || m?.ComplimentaryStatus) ||
            (m?.discPer !== undefined && m?.discPer !== null && Number(m.discPer) > 0) ||
            (!hasLineDiscounts && Number(m?.discAmount || 0) > 0) ||
            Number(m?.billDiscountValue || 0) > 0;
          if (isBillDisc) {
            anyOrderHasBillDisc = true;
            break;
          }
        }
      } catch (e) {
        console.warn("Could not check selected orders for bill discount:", e);
      }
    }

    if (anyOrderHasBillDisc) {
      setShowBillDiscountConfirm(true);
      return;
    }

    await executeCombine();
  };

  const executeCombine = async () => {
    setIsCombining(true);
    try {
      const selectedIds = selectedOrders.map(o => o.orderId);
      // We pass the current order AND the selected ones to completely fetch the new combined cart state
      const orderIdsToCombine = [editingOrderId as number, ...selectedIds];
      const response = await orderApi.getCombinedOrderDetails(orderIdsToCombine);

      const combinedData = response?.data || response;

      if (combinedData && (combinedData.detailsData || combinedData.details)) {
        const detailsData = sortOrderDetailsBySequence(combinedData.detailsData || combinedData.details || []);
        const modifiersData = combinedData.modifiersData || combinedData.modifiers || [];

        const rawMappedCartItems = mapOrderDetailsToCartItems(detailsData, modifiersData, {
          products,
          productCache,
        });
        const mappedCartItems = rawMappedCartItems.map((item, idx) => ({
          ...item,
          mapId: idx + 1, // Sequentially recalculate mapId to prevent collisions across combined orders
        }));

        // Determine target order: the backend only permits updating the latest (highest) order in the combined group
        const targetOrderId = Math.max(...orderIdsToCombine);
        const absorbedOrderIds = orderIdsToCombine.filter(id => id !== targetOrderId);

        let targetPrevUpdatedAt: string | undefined = undefined;
        let targetMaster: any = null;
        try {
          const targetRes = await orderApi.getOrderDetails(targetOrderId);
          targetMaster = targetRes?.data?.masterData || targetRes?.masterData || targetRes?.data;
          const ts = targetMaster?.updatedAt || targetMaster?.updated_at || targetMaster?.createdAt;
          if (ts) {
            targetPrevUpdatedAt = String(ts);
            sessionStorage.setItem(`order_prevUpdatedAt_${targetOrderId}`, targetPrevUpdatedAt);
          }
        } catch (e) {
          console.warn("Could not fetch target order details for combine:", e);
        }

        if (!targetPrevUpdatedAt && editingOrderId) {
          targetPrevUpdatedAt = sessionStorage.getItem(`order_prevUpdatedAt_${editingOrderId}`) || undefined;
        }

        // Load the new combined cart entirely, setting the latest order as primary.
        // Bill discount is erased when performing combine; line item discounts are preserved on items.
        dispatch(loadRecalledOrder({
          editingOrderId: targetOrderId,
          cartItems: mappedCartItems,
          orderTypeId: targetMaster?.orderTypeId || selectedOrderTypeId,
          orderTypeName: targetMaster?.orderTypeName || selectedOrderTypeName,
          customerId: targetMaster?.customerId || selectedCustomerId,
          addressId: targetMaster?.addressId || selectedAddressId,
          billDiscountValue: 0,
          billDiscountType: 'percentage',
          sectionId: targetMaster?.sectionId || selectedSectionId,
          tableId: targetMaster?.tableId || selectedTableId,
          isCartModified: true,
          prevUpdatedAt: targetPrevUpdatedAt || undefined,
        }));

        // Set the absorbed order IDs in the store to be sent during submitOrder / settle
        dispatch(setCombinedOrderIds(absorbedOrderIds));

        showToast("Orders combined successfully!", "success");
        onClose();
      } else {
        console.error("COMBINED DATA RAW RESPONSE:", response);
        throw new Error("Invalid response format from combined-orders endpoint. See console.");
      }
    } catch (err: any) {
      showToast(err.message || "Failed to combine orders", "error");
    } finally {
      setIsCombining(false);
    }
  };

  const renderOrderList = (orders: CombineOrder[], selectedId: number | null, onSelect: (id: number) => void) => {
    if (isLoading && orders.length === 0) {
      return (
        <div className="flex-1 flex items-center justify-center text-slate-400 p-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#ff9500] mb-4"></div>
        </div>
      );
    }

    if (orders.length === 0) {
      return (
        <div className="flex-1 flex items-center justify-center text-slate-400 p-4 border-2 border-dashed border-slate-200 rounded-lg m-2 bg-slate-50">
          No orders available
        </div>
      );
    }

    return (
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {orders.map(o => (
          <div
            key={o.orderId}
            onClick={() => onSelect(o.orderId)}
            className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
              selectedId === o.orderId 
                ? 'border-[#ff9500] bg-orange-50 shadow-md' 
                : 'border-slate-200 hover:border-orange-200 bg-white'
            }`}
          >
            <pre className="whitespace-pre-wrap font-sans text-sm text-slate-700 leading-snug font-medium">
              {o.details}
            </pre>
          </div>
        ))}
      </div>
    );
  };

  return (
    <>
      <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Combine Order"
      size="2xl"
      noScroll
      footer={
        <>
          <Button variant="secondary" onClick={onClose} className="w-32">
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={handleDone} 
            loading={isCombining}
            disabled={selectedOrders.length === 0 || isCombining}
            className="w-40 shadow-md hover:shadow-lg"
          >
            {isCombining ? "Combining..." : "DONE"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col md:flex-row h-[60vh] min-h-[400px] min-h-0 bg-slate-50 gap-2 p-2 rounded-xl">
        
        {/* Left List: Available Orders */}
        <div className="flex-1 min-h-0 flex flex-col bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-slate-100 p-3 border-b border-slate-200 font-bold text-slate-700 flex justify-between items-center">
            <span>Available Orders</span>
            <span className="bg-slate-200 text-xs px-2 py-1 rounded-full text-slate-600">{availableOrders.length}</span>
          </div>
          {renderOrderList(availableOrders, selectedAvailableId, setSelectedAvailableId)}
        </div>

        {/* Center: Controls */}
        <div className="flex md:flex-col shrink-0 justify-center items-center gap-4 py-4 md:px-2">
          <button 
            onClick={handleMoveToSelected}
            disabled={!selectedAvailableId}
            className={`p-3 rounded-full shadow-md transition-all ${
              selectedAvailableId 
                ? 'bg-[#ff9500] text-white hover:bg-orange-600 hover:scale-105 active:scale-95' 
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            <ChevronRight className="w-6 h-6 hidden md:block" />
            <ChevronRight className="w-6 h-6 md:hidden rotate-90" />
          </button>
          
          <button 
            onClick={handleMoveToAvailable}
            disabled={!selectedSelectedId}
            className={`p-3 rounded-full shadow-md transition-all ${
              selectedSelectedId 
                ? 'bg-slate-700 text-white hover:bg-slate-800 hover:scale-105 active:scale-95' 
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            <ChevronLeft className="w-6 h-6 hidden md:block" />
            <ChevronLeft className="w-6 h-6 md:hidden rotate-90" />
          </button>
        </div>

        {/* Right List: Selected Orders */}
        <div className="flex-1 min-h-0 flex flex-col bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-orange-50 p-3 border-b border-orange-100 font-bold text-[#ff9500] flex justify-between items-center">
            <span>Selected to Combine</span>
            <span className="bg-orange-200 text-xs px-2 py-1 rounded-full text-orange-700">{selectedOrders.length}</span>
          </div>
          {renderOrderList(selectedOrders, selectedSelectedId, setSelectedSelectedId)}
        </div>

      </div>
    </Modal>

    <ConfirmDialog
      isOpen={showBillDiscountConfirm}
      title="Warning"
      message="Bill discount will be erased while performing this action. Do you want to continue?"
      confirmLabel="Continue"
      cancelLabel="Cancel"
      confirmVariant="danger"
      loading={isCombining}
      onConfirm={async () => {
        setShowBillDiscountConfirm(false);
        await executeCombine();
      }}
      onCancel={() => setShowBillDiscountConfirm(false)}
    />
  </>
  );
};
