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
    // Resolve active dayId with robust fallbacks
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
        1;
    }

    try {
      setLoading(true);

      const cleanParams: RecallParams = {
        DayId: activeDayId,
      };

      // Only pass OrderTypeId when filtering by a specific order type (> 0)
      if (params.OrderTypeId && Number(params.OrderTypeId) > 0) {
        cleanParams.OrderTypeId = Number(params.OrderTypeId);
      }

      // Include EmployeeId when filtering by specific employee/waiter, or fallback to current employee/user/1
      if (params.EmployeeId !== undefined && params.EmployeeId !== null && Number(params.EmployeeId) > 0) {
        cleanParams.EmployeeId = Number(params.EmployeeId);
      } else {
        const fallbackEmp =
          Number(localStorage.getItem("authorizedEmployeeId")) ||
          Number(localStorage.getItem("employeeId")) ||
          Number(localStorage.getItem("userId")) ||
          1;
        if (fallbackEmp > 0) {
          cleanParams.EmployeeId = fallbackEmp;
        }
      }

      // Delivery out filters: only send if explicitly set
      if (params.DeliveryOutOnlyStatus) {
        cleanParams.DeliveryOutOnlyStatus = true;
      } else if (params.DeliveryOutStatus === false) {
        cleanParams.DeliveryOutStatus = false;
      }

      const decimals = getDecimalPart();
      if (decimals !== undefined && decimals !== null) {
        cleanParams.Decimals = decimals;
      }

      // Only add search/status if they have actual content
      if (params.SearchValue?.trim()) {
        cleanParams.SearchValue = params.SearchValue.trim();
        cleanParams.SearchStatus = (params.SearchStatus?.trim() || "ORDER NO").toUpperCase();
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

