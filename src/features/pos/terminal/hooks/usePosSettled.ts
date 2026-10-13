import { useState, useEffect, useCallback, useRef } from 'react';
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
  const lastParamsRef = useRef<SettledOrdersParams>({ OrderTypeId: 0, DeliveryOutStatus: false, IncludeCancelled: false });

  const fetchOrders = useCallback(async (params: SettledOrdersParams = {}) => {
    let activeDayId = params.DayId || status?.dayId;
    if (!activeDayId) {
      try {
        const savedShift = localStorage.getItem("activeShift");
        if (savedShift) {
          const parsed = JSON.parse(savedShift);
          if (parsed?.dayId) activeDayId = Number(parsed.dayId);
        }
      } catch {
        // ignore
      }
    }
    if (!activeDayId) {
      activeDayId =
        Number(localStorage.getItem("dayId")) ||
        Number(localStorage.getItem("systemDayId")) ||
        Number(sessionStorage.getItem("systemDayId")) ||
        Number(localStorage.getItem("pos_dayId")) ||
        0;
    }

    try {
      setLoading(true);

      const activeBranchId = Number(localStorage.getItem("systemBranchId")) || Number(localStorage.getItem("branchId")) || undefined;

      const cleanParams: SettledOrdersParams = {
        OrderTypeId: params.OrderTypeId ?? 0,
        DeliveryOutStatus: params.DeliveryOutStatus ?? false,
        DeliveryOutOnlyStatus: params.DeliveryOutOnlyStatus ?? false,
        Decimals: getDecimalPart(),
        IncludeCancelled: Boolean(params.IncludeCancelled ?? false),
      };

      if (activeDayId > 0) {
        cleanParams.DayId = activeDayId;
      }
      if (activeBranchId) {
        cleanParams.BranchId = activeBranchId;
      }

      if (params.SearchValue?.trim()) {
        cleanParams.SearchValue = params.SearchValue.trim();
        cleanParams.SearchStatus = (params.SearchStatus?.trim() || "ORDER NO").toUpperCase();
      }
      if (params.ProviderName?.trim()) cleanParams.ProviderName = params.ProviderName.trim();

      lastParamsRef.current = cleanParams;

      const response = await settledOrdersApi.getSettledOrders(cleanParams);
      
      if (response && response.isSuccess) {
        setOrders(Array.isArray(response.data) ? response.data : []);
      } else {
        showToast(response?.message || 'Failed to fetch settled orders', 'error');
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
    void fetchOrders({ OrderTypeId: 0, DeliveryOutStatus: false, IncludeCancelled: false });
  }, [status?.dayId, fetchOrders]);

  const cancelOrder = useCallback(async (orderId: number) => {
    try {
      setLoading(true);
      const response = await settledOrdersApi.cancelSalesInvoice(orderId);
      if (response && response.isSuccess) {
        showToast(response.message || `Order #${orderId} cancelled successfully`, 'success');
        await fetchOrders(lastParamsRef.current);
        return true;
      } else {
        showToast(response?.message || 'Failed to cancel order', 'error');
        return false;
      }
    } catch (error: any) {
      console.error('Cancel settled order error:', error);
      const errMsg = error?.response?.data?.message || error?.message || 'Failed to cancel settled order';
      showToast(errMsg, 'error');
      return false;
    } finally {
      setLoading(false);
    }
  }, [fetchOrders, showToast]);

  return {
    orders,
    loading,
    fetchOrders,
    cancelOrder,
  };
};
