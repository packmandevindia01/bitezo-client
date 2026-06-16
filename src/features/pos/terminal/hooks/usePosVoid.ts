import { useState, useEffect, useCallback } from 'react';
import { orderApi } from '../../services/orderApi';
import type { RecallOrder, RecallParams } from '../../types';
import { useToast } from '../../../../app/providers/useToast';
import { useCashierLog } from '../../cashier';
import { getDecimalPart } from '../../../../utils/currency';

export const usePosVoid = () => {
  const [orders, setOrders] = useState<RecallOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [voidingOrderId, setVoidingOrderId] = useState<number | null>(null);
  const { showToast } = useToast();
  const { status } = useCashierLog();

  const fetchOrders = useCallback(async (params: RecallParams = {}) => {
    if (!status?.dayId) return;

    try {
      setLoading(true);

      const cleanParams: RecallParams = {
        OrderTypeId: params.OrderTypeId ?? 0,
        DeliveryOutStatus: params.DeliveryOutStatus ?? false,
        DeliveryOutOnlyStatus: params.DeliveryOutOnlyStatus ?? false,
        DayId: status.dayId,
        Decimals: getDecimalPart(),
      };

      // Omit EmployeeId to retrieve all voidable orders of the day

      if (params.SearchValue?.trim()) {
        cleanParams.SearchValue = params.SearchValue.trim();
        if (params.SearchStatus?.trim()) {
          cleanParams.SearchStatus = params.SearchStatus.trim();
        }
      }
      if (params.ProviderName?.trim()) cleanParams.ProviderName = params.ProviderName.trim();

      const response = await orderApi.getVoidOrders(cleanParams);
      
      if (response.isSuccess) {
        setOrders(response.data || []);
      } else {
        showToast(response.message || 'Failed to fetch void data', 'error');
        setOrders([]);
      }
    } catch (error) {
      console.error('Void fetch error:', error);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [status, showToast]);

  const executeVoidOrder = useCallback(async (orderId: number, reason: string) => {
    if (!status?.dayId || !status?.shiftId || !status?.userId) {
      showToast('Session details missing', 'error');
      return false;
    }

    try {
      setVoidingOrderId(orderId);
      const payload = {
        orderId,
        reason,
        employeeId: status.userId,
        voidDateTime: new Date().toISOString(),
        dayId: status.dayId,
        shiftId: status.shiftId,
      };

      const response = await orderApi.voidOrder(orderId, payload);
      
      if (response.isSuccess) {
        showToast(response.message || 'Order voided successfully', 'success');
        // Refresh the list after voiding
        await fetchOrders({ OrderTypeId: 0 });
        return true;
      } else {
        showToast(response.message || 'Failed to void order', 'error');
        return false;
      }
    } catch (error) {
      console.error('Void order error:', error);
      showToast('An error occurred while voiding', 'error');
      return false;
    } finally {
      setVoidingOrderId(null);
    }
  }, [status, showToast, fetchOrders]);

  // Initial fetch when session is available
  useEffect(() => {
    if (status?.dayId) {
      void fetchOrders({ OrderTypeId: 0 });
    }
  }, [status?.dayId, fetchOrders]);

  return {
    orders,
    loading,
    voidingOrderId,
    fetchOrders,
    executeVoidOrder,
  };
};
