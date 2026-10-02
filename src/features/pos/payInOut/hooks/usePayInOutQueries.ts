import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { payInOutService } from "../services/payInOutService";
import { paymodeService } from "../../../general/paymode/services/paymodeService";
import { cashierLogService } from "../../cashier/services/cashierLogService";
import { parseDateParts, isFutureDate } from "../utils/payInOutDateUtils";

export const useCashierStatus = () => {
  return useQuery({
    queryKey: ['cashierStatus'],
    queryFn: async () => {
      const branchId = Number(localStorage.getItem("systemBranchId")) || 0;
      const counterId = Number(localStorage.getItem("systemCounterId")) || 0;
      const response = await cashierLogService.checkStatus(branchId, counterId);
      return response.cashierInStatus;
    },
    staleTime: 5 * 60 * 1000 // 5 minutes
  });
};

export const usePaymodesForCounter = () => {
  return useQuery({
    queryKey: ['paymodes', 'counter'],
    queryFn: async () => {
      const counterId = Number(localStorage.getItem("systemCounterId")) || 1;
      return await paymodeService.listByCounter(counterId);
    },
    staleTime: Infinity
  });
};

export const usePayInOutTransactions = (fromDate: string, toDate: string, description?: string) => {
  return useQuery({
    queryKey: ['payInOut', fromDate, toDate, description],
    queryFn: async () => {
      if (!fromDate || !toDate) return [];

      const parsedFrom = parseDateParts(fromDate);
      const parsedTo = parseDateParts(toDate);

      let fromD = parsedFrom ? new Date(parsedFrom.year, parsedFrom.month - 1, parsedFrom.day) : new Date(fromDate);
      let toD = parsedTo ? new Date(parsedTo.year, parsedTo.month - 1, parsedTo.day) : new Date(toDate);

      if (isNaN(fromD.getTime()) || isNaN(toD.getTime())) return [];

      const today = new Date();
      today.setHours(23, 59, 59, 999);

      // Clamp to today if future date
      if (fromD > today) fromD = new Date(today);
      if (toD > today) toD = new Date(today);

      // If from date is later than to date, clamp from to to
      if (fromD > toD) fromD = new Date(toD);

      fromD.setHours(0, 0, 0, 0);
      toD.setHours(23, 59, 59, 999);
      
      const response = await payInOutService.list({
        fromDate: fromD.toISOString(),
        toDate: toD.toISOString(),
        description
      });
      return response.data || [];
    },
    enabled: !!fromDate && !!toDate && fromDate <= toDate && !isFutureDate(fromDate) && !isFutureDate(toDate)
  });
};

export const usePayInOutDetails = (transId: number | null) => {
  return useQuery({
    queryKey: ['payInOut', transId],
    queryFn: async () => {
      if (!transId) return null;
      const response = await payInOutService.getById(transId);
      return response.data;
    },
    enabled: !!transId
  });
};

export const usePayInOutVoucherNumber = (enabled: boolean) => {
  return useQuery({
    queryKey: ['payInOutVoucherNumber'],
    queryFn: async () => {
      const response = await payInOutService.getVoucherNumber();
      return response.data.vchNo;
    },
    enabled
  });
};


export const usePayInOutMutations = () => {
  const queryClient = useQueryClient();

  const invalidateList = () => {
    queryClient.invalidateQueries({ queryKey: ['payInOut'] });
  };

  const createTransaction = useMutation({
    mutationFn: payInOutService.create,
    onSuccess: invalidateList
  });

  const updateTransaction = useMutation({
    mutationFn: ({ id, data }: { id: number, data: any }) => payInOutService.update(id, data),
    onSuccess: invalidateList
  });

  const cancelTransaction = useMutation({
    mutationFn: payInOutService.cancel,
    onSuccess: invalidateList
  });

  return { createTransaction, updateTransaction, cancelTransaction };
};
