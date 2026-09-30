import { useState, useCallback } from 'react';
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

      // Include EmployeeId when filtering by specific employee/waiter
      if (params.EmployeeId !== undefined && params.EmployeeId !== null && Number(params.EmployeeId) > 0) {
        cleanParams.EmployeeId = Number(params.EmployeeId);
      }

      // Only add search/status if they have actual content
      if (params.SearchValue?.trim()) {
        cleanParams.SearchValue = params.SearchValue.trim();
        if (params.SearchStatus?.trim()) {
          cleanParams.SearchStatus = params.SearchStatus.trim();
        }
      }
      if (params.ProviderName?.trim()) cleanParams.ProviderName = params.ProviderName.trim();

      const response = await orderApi.getRecallOrders(cleanParams);
      
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

  return {
    orders,
    loading,
    fetchOrders,
  };
};

