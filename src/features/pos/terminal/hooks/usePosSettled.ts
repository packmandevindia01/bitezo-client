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
    let activeDayId = status?.dayId;
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
      activeDayId = Number(localStorage.getItem("dayId")) || Number(localStorage.getItem("systemDayId")) || Number(localStorage.getItem("pos_dayId")) || 0;
    }

    try {
      setLoading(true);

      const activeBranchId = Number(localStorage.getItem("systemBranchId")) || Number(localStorage.getItem("branchId")) || undefined;

      const cleanParams: SettledOrdersParams = {
        OrderTypeId: params.OrderTypeId ?? 0,
        DeliveryOutStatus: params.DeliveryOutStatus ?? false,
        DeliveryOutOnlyStatus: params.DeliveryOutOnlyStatus ?? false,
        Decimals: getDecimalPart(),
      };

      if (activeDayId > 0) {
        cleanParams.DayId = activeDayId;
      }
      if (activeBranchId) {
        cleanParams.BranchId = activeBranchId;
      }

      if (params.SearchValue?.trim()) {
        cleanParams.SearchValue = params.SearchValue.trim();
        if (params.SearchStatus?.trim()) {
          cleanParams.SearchStatus = params.SearchStatus.trim();
        }
      }
      if (params.ProviderName?.trim()) cleanParams.ProviderName = params.ProviderName.trim();

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
    void fetchOrders({ OrderTypeId: 0, DeliveryOutStatus: false });
  }, [status?.dayId, fetchOrders]);

  return {
    orders,
    loading,
    fetchOrders,
  };
};
