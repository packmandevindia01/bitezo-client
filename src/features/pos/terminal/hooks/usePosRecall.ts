import { useState, useEffect, useCallback } from 'react';
import { orderApi } from '../../services/orderApi';
import type { RecallOrder, RecallParams } from '../../types';
import { useToast } from '../../../../app/providers/useToast';
import { useCashierLog } from '../../cashier';
import { getDecimalPart } from '../../../../utils/currency';

export const usePosRecall = () => {
  const [orders, setOrders] = useState<RecallOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();
  const { status } = useCashierLog();

  const fetchOrders = useCallback(async (params: RecallParams = {}) => {
    if (!status?.dayId) return;

    try {
      setLoading(true);

      // Clean up params: remove empty strings and nulls
      const cleanParams: RecallParams = {
        OrderTypeId: params.OrderTypeId ?? 0,
        DeliveryOutStatus: params.DeliveryOutStatus ?? false,
        DeliveryOutOnlyStatus: params.DeliveryOutOnlyStatus ?? false,
        DayId: status.dayId,
        Decimals: getDecimalPart(),
      };

      // Only add EmployeeId if it exists and is valid (removed to show all cashier/waiter orders)

      // Only add search/status if they have actual content
      if (params.SearchValue?.trim()) {
        cleanParams.SearchValue = params.SearchValue.trim();
        if (params.SearchStatus?.trim()) {
          cleanParams.SearchStatus = params.SearchStatus.trim();
        }
      }
      if (params.ProviderName?.trim()) cleanParams.ProviderName = params.ProviderName.trim();

      const response = await orderApi.getRecallOrders(cleanParams);
      console.log("RECALL PARAMS SENT:", cleanParams);
      console.log("RECALL RESPONSE:", response);
      
      if (response.isSuccess) {
        setOrders(response.data || []);
      } else {
        showToast(response.message || 'Failed to fetch recall data', 'error');
        setOrders([]);
      }
    } catch (error) {
      console.error('Recall fetch error:', error);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [status, showToast]);

  // Initial fetch when session is available
  useEffect(() => {
    if (status?.dayId) {
      void fetchOrders({ OrderTypeId: 0 });
    }
  }, [status?.dayId, fetchOrders]);

  return {
    orders,
    loading,
    fetchOrders,
  };
};

