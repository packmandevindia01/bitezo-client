import React, { useState, useEffect } from "react";
import { Modal, Button } from "../../../../components/common";
import { orderApi } from "../../services/orderApi";
import { useAppSelector, useAppDispatch } from "../../../../app/hooks";
import { useToast } from "../../../../app/providers/useToast";
import { ChevronRight, ChevronLeft } from "lucide-react";
import { getDecimalPart } from "../../../../utils/currency";
import { loadRecalledOrder, setCombinedOrderIds } from "../store/posSlice";
import { useCashierLog } from "../../cashier";

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

  const { 
    selectedOrderTypeId, 
    editingOrderId, 
    selectedOrderTypeName,
    selectedCustomerId,
    selectedAddressId,
    billDiscountValue,
    billDiscountType,
    selectedSectionId,
    selectedTableId,
    products
  } = useAppSelector(state => state.pos);

  const { status } = useCashierLog();
  const dayId = status?.dayId || 0;
  const decimals = getDecimalPart();

  useEffect(() => {
    if (isOpen && editingOrderId) {
      fetchAvailableOrders();
      setSelectedOrders([]);
      setSelectedAvailableId(null);
      setSelectedSelectedId(null);
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

    setIsCombining(true);
    try {
      const selectedIds = selectedOrders.map(o => o.orderId);
      // We pass the current order AND the selected ones to completely fetch the new combined cart state
      const orderIdsToCombine = [editingOrderId as number, ...selectedIds];
      const response = await orderApi.getCombinedOrderDetails(orderIdsToCombine);

      const combinedData = response?.data || response;

      if (combinedData && (combinedData.detailsData || combinedData.details)) {
        const detailsData = combinedData.detailsData || combinedData.details || [];
        const modifiersData = combinedData.modifiersData || combinedData.modifiers || [];

        const mappedCartItems = detailsData.map((detail: any, idx: number) => {
          // Match modifiers by mapId AND orderId (if the backend provides orderId on modifiers)
          const itemModifiers = modifiersData.filter((m: any) => {
            if (m.orderId && detail.orderId) {
              return m.mapId === detail.mapId && m.orderId === detail.orderId;
            }
            return m.mapId === detail.mapId; // Fallback if backend doesn't provide orderId
          });
          
          const extras = itemModifiers.filter((m: any) => (m.price || 0) > 0).map((m: any) => ({
            id: m.modifierId,
            name: m.modifierName,
            price: m.price || 0,
            qty: (m.qty || 1) / (detail.qty || 1),
            typeId: m.typeId
          }));

          const modifiers = itemModifiers.filter((m: any) => (m.price || 0) <= 0).map((m: any) => ({
            id: m.modifierId,
            name: m.modifierName,
            qty: m.qty || 1,
            typeId: m.typeId,
            typeName: m.typeName
          }));

          let pId = detail.productId ?? detail.ProductId ?? detail.itemId ?? detail.ItemId ?? detail.product?.id ?? detail.Product?.id;
          
          if (!pId && detail.productName) {
            const matched = products.find((p: any) => p.name === detail.productName || p.name === detail.ProductName);
            if (matched) pId = matched.id;
          }

          if (!pId) {
            console.error("RAW API DETAIL MISSING ID:", JSON.stringify(detail, null, 2));
          }

          const priceView = (() => {
            try {
              const saved = localStorage.getItem('posConfigs');
              const full = saved ? JSON.parse(saved) : {};
              return full?.configs?.priceView === 'Inclusive' ? 'Inclusive' : 'Exclusive';
            } catch { return 'Exclusive'; }
          })();
          const isIncl = priceView === 'Inclusive';

          return {
            uniqueId: `${pId}-variant-${Date.now()}-${idx}`,
            productId: pId,
            quantity: detail.qty || 1,
            price: detail.price || 0,
            isIncl: isIncl,
            discountValue: detail.discAmount || 0,
            discountType: detail.discPer ? 'percentage' : 'amount',
            extras,
            modifiers,
            isExisting: true,
            mapId: idx + 1, // Sequentially recalculate mapId to prevent collisions across combined orders
            originalQty: detail.qty || 1,
            product: {
              id: pId,
              name: detail.productName || detail.ProductName || `Product #${pId}`,
              price: detail.price || 0,
              categoryId: 1,
              unitId: detail.unitId || 1,
            }
          };
        });

        // Load the new combined cart entirely, keeping primary order properties
        dispatch(loadRecalledOrder({
          editingOrderId: editingOrderId,
          cartItems: mappedCartItems,
          orderTypeId: selectedOrderTypeId,
          orderTypeName: selectedOrderTypeName,
          customerId: selectedCustomerId,
          addressId: selectedAddressId,
          billDiscountValue: billDiscountValue,
          billDiscountType: billDiscountType,
          sectionId: selectedSectionId,
          tableId: selectedTableId
        }));

        // Set the extra combined IDs in the store to be sent during submitOrder
        dispatch(setCombinedOrderIds(selectedIds));

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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Combine Order"
      size="2xl"
    >
      <div className="flex flex-col md:flex-row h-[60vh] md:h-[70vh] bg-slate-50 gap-2 p-2">
        
        {/* Left List: Available Orders */}
        <div className="flex-1 flex flex-col bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-slate-100 p-3 border-b border-slate-200 font-bold text-slate-700 flex justify-between items-center">
            <span>Available Orders</span>
            <span className="bg-slate-200 text-xs px-2 py-1 rounded-full text-slate-600">{availableOrders.length}</span>
          </div>
          {renderOrderList(availableOrders, selectedAvailableId, setSelectedAvailableId)}
        </div>

        {/* Center: Controls */}
        <div className="flex md:flex-col justify-center items-center gap-4 py-4 md:px-2">
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
        <div className="flex-1 flex flex-col bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-orange-50 p-3 border-b border-orange-100 font-bold text-[#ff9500] flex justify-between items-center">
            <span>Selected to Combine</span>
            <span className="bg-orange-200 text-xs px-2 py-1 rounded-full text-orange-700">{selectedOrders.length}</span>
          </div>
          {renderOrderList(selectedOrders, selectedSelectedId, setSelectedSelectedId)}
        </div>

      </div>

      <div className="flex justify-end gap-3 mt-6 p-4 border-t border-slate-100 bg-slate-50 rounded-b-xl">
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
      </div>
    </Modal>
  );
};
