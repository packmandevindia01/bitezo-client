import { useState, useEffect, useCallback } from 'react';
import { cashierLogService, type CashierInStatus } from '../services/cashierLogService';

export const useCashierLog = () => {
  const [status, setStatus] = useState<CashierInStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const checkStatus = useCallback(async () => {
    setIsLoading(true);
    try {
      // For now, using default IDs if not found. 
      // In a real app, these would come from global state or settings.
      const branchId = Number(localStorage.getItem('systemBranchId')) || 0;
      const counterId = Number(localStorage.getItem('systemCounterId')) || 0;
      
      const data = await cashierLogService.checkStatus(branchId, counterId);
      setStatus(data);
    } catch (error: any) {
      console.error("Cashier status check failed:", error);
      // Don't show toast on every check, might be annoying if it's just a background check
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  return {
    status,
    isLoading,
    refreshStatus: checkStatus,
  };
};
