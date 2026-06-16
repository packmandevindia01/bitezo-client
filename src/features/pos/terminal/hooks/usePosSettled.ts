import { useState, useEffect, useCallback } from 'react';
import { settledOrdersApi } from '../../services/settledOrdersApi';
import type { SettledOrdersParams } from '../../services/settledOrdersApi';
import { useToast } from '../../../../app/providers/useToast';
import { useCashierLog } from '../../cashier';
import { getDecimalPart } from '../../../../utils/currency';

export const usePosSettled = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();
  const { status } = useCashierLog();

  const fetchOrders = useCallback(async (params: SettledOrdersParams = {}) => {
    if (!status?.dayId) return;

    try {
      setLoading(true);

      const cleanParams: SettledOrdersParams = {
        OrderTypeId: params.OrderTypeId ?? 0,
        DayId: status.dayId,
        Decimals: getDecimalPart(),
      };

      // Omit EmployeeId to retrieve all settled orders of the day

      if (params.SearchValue?.trim()) {
        cleanParams.SearchValue = params.SearchValue.trim();
        if (params.SearchStatus?.trim()) {
          cleanParams.SearchStatus = params.SearchStatus.trim();
        }
      }
      if (params.ProviderName?.trim()) cleanParams.ProviderName = params.ProviderName.trim();

      const response = await settledOrdersApi.getSettledOrders(cleanParams);
      
      if (response.isSuccess) {
        setOrders(response.data || []);
      } else {
        showToast(response.message || 'Failed to fetch settled orders', 'error');
        setOrders([]);
      }
    } catch (error) {
      console.error('Settled fetch error:', error);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [status, showToast]);

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
