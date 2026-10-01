import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { paymentVoucherSchema } from "../types";
import type { PaymentVoucherForm, PaymentVoucherPayload } from "../types";
import { paymentVoucherApi } from "../services/paymentVoucherApi";
import { branchApi } from "../../../inventory/branches/services/branchApi";
import type { BranchRecord } from "../../../inventory/branches/types";
import { useToast } from "../../../../app/providers/useToast";
import { useCurrency } from "../../../../hooks/useCurrency";
import { useBranchScope } from "../../../../hooks/useBranchScope";
import { paymodeService } from "../../../general/paymode/services/paymodeService";
import { PAYMODE_SYNC_CHANNEL, PAYMODE_STORAGE_KEY } from "../../../general/paymode/utils/paymodeSync";
import { subscribeToSupplierUpdates } from "../../../general/supplier/utils/supplierSync";
import { subscribeToEmployeeUpdates } from "../../../general/employee/utils/employeeSync";

export const usePaymentVoucher = (transId?: number, onSuccessCallback?: () => void) => {
  const { showToast } = useToast();
  const { decimalPart } = useCurrency();
  const queryClient = useQueryClient();
  const { isBranchLocked, initialBranchId } = useBranchScope();
  const defaultBranchId = initialBranchId ? Number(initialBranchId) : 0;
  const formDefaultBranchId = isBranchLocked ? defaultBranchId : 0;
  const [searchBranchId, setSearchBranchId] = useState<number>(defaultBranchId);

  const form = useForm<PaymentVoucherForm>({
    resolver: zodResolver(paymentVoucherSchema),
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues: {
      seriesId: 0,
      prefix: "",
      voucherDate: new Date().toISOString().split("T")[0],
      voucherNo: "",
      accountId: 0,
      accountName: "",
      paymodeId: 0,
      branchId: formDefaultBranchId,
      employeeId: 0,
      refNo: "",
      amount: Number(0).toFixed(decimalPart),
      narration: "",
    },
  });

  const { handleSubmit, reset, watch, setValue } = form;
  const currentFormBranchId = watch("branchId");

  // 1. Fetch All Branches for Dropdowns
  const { data: allBranches = [] } = useQuery<BranchRecord[]>({
    queryKey: ["allBranchesList"],
    queryFn: () => branchApi.fetchBranchNames(true),
    placeholderData: keepPreviousData,
  });

  const [isMultiPayOpen, setIsMultiPayOpen] = useState(false);

  const searchBranchList = allBranches.map((b: BranchRecord) => ({ branchId: b.id, branchName: b.branchName }));
  const formBranchList = allBranches
    .filter((b: BranchRecord) => b.branchName.toLowerCase() !== "all")
    .map((b: BranchRecord) => ({ branchId: b.id, branchName: b.branchName }));

  // Auto-select "All" if default is 0 and we found "All" in the API
  useEffect(() => {
    if (searchBranchId === 0 && allBranches.length > 0) {
      const allBranch = allBranches.find(b => b.branchName.toLowerCase() === "all");
      if (allBranch) {
        setSearchBranchId(allBranch.id);
      } else {
        setSearchBranchId(allBranches[0].id);
      }
    }
  }, [allBranches, searchBranchId]);

  // 2. Master Data (Series, Employees/Salesman, Paymodes) based on Selected Form Branch
  const { data: masterData, refetch: refetchMasterData } = useQuery({
    queryKey: ["paymentMaster", currentFormBranchId],
    queryFn: () => paymentVoucherApi.getLoadMaster(currentFormBranchId || 0),
    placeholderData: keepPreviousData,
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });

  // Paymodes Master List directly from Paymode Service for instant synchronization
  const { data: allPaymodes = [], refetch: refetchAllPaymodes } = useQuery({
    queryKey: ["paymodes"],
    queryFn: () => paymodeService.list(),
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });

  // Cross-tab and local real-time listener for paymode updates
  useEffect(() => {
    let lastHandledTimestamp = 0;
    const handleSync = () => {
      queryClient.invalidateQueries({ queryKey: ["paymentMaster"] });
      queryClient.invalidateQueries({ queryKey: ["paymodes"] });
      void refetchMasterData();
      void refetchAllPaymodes();
    };

    let channel: BroadcastChannel | null = null;
    try {
      if (typeof BroadcastChannel !== "undefined") {
        channel = new BroadcastChannel(PAYMODE_SYNC_CHANNEL);
        channel.onmessage = (event) => {
          if (event.data?.type === "PAYMODE_UPDATED") {
            lastHandledTimestamp = event.data?.timestamp || Date.now();
            handleSync();
          }
        };
      }
    } catch {
      // ignore
    }

    const handleStorage = (e: StorageEvent) => {
      if (e.key === PAYMODE_STORAGE_KEY && e.newValue) {
        const ts = parseInt(e.newValue.split(":")[0], 10);
        if (ts && ts !== lastHandledTimestamp) {
          lastHandledTimestamp = ts;
          handleSync();
        }
      }
    };
    window.addEventListener("storage", handleStorage);

    const handleCustom = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      lastHandledTimestamp = detail?.timestamp || Date.now();
      handleSync();
    };
    window.addEventListener("paymodes:updated", handleCustom);

    return () => {
      if (channel) channel.close();
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("paymodes:updated", handleCustom);
    };
  }, [queryClient, refetchMasterData, refetchAllPaymodes]);

  // Cross-tab and local real-time listener for employee updates
  useEffect(() => {
    return subscribeToEmployeeUpdates(() => {
      queryClient.invalidateQueries({ queryKey: ["paymentMaster"] });
      void refetchMasterData();
    });
  }, [queryClient, refetchMasterData]);

  // Derived lists
  const seriesList = masterData?.series || [];
  const employeeList = masterData?.salesman || [];

  // Merge loadMaster paymodes and allPaymodes so newly created paymodes are immediately visible
  const paymodeList = useMemo(() => {
    const list = (masterData?.paymodes || [])
      .filter((p) => p.paymodeName.toLowerCase() !== "credit")
      .map((p) => ({ paymodeId: Number(p.paymodeId), paymodeName: p.paymodeName }));

    const existingIds = new Set(list.map((p) => p.paymodeId));

    (allPaymodes || []).forEach((p) => {
      const isActive = p.isActive === "Active" || p.isActive === true;
      const id = Number(p.paymodeId);
      if (isActive && !existingIds.has(id) && p.paymodeName.toLowerCase() !== "credit") {
        list.push({
          paymodeId: id,
          paymodeName: p.paymodeName,
        });
      }
    });

    return list;
  }, [masterData?.paymodes, allPaymodes]);

  // 2. Account List
  const { data: accountList = [] } = useQuery({
    queryKey: ["paymentAccountList"],
    queryFn: () => paymentVoucherApi.getAccountList(""),
    placeholderData: keepPreviousData,
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });

  // Real-time synchronization: sync accounts when suppliers are created/updated
  useEffect(() => {
    return subscribeToSupplierUpdates(() => {
      void queryClient.invalidateQueries({ queryKey: ["paymentAccountList"] });
      void queryClient.refetchQueries({ queryKey: ["paymentAccountList"] });
    });
  }, [queryClient]);

  // 3. Payment Details List
  const currentYear = new Date().getFullYear();
  const [fromDate, setFromDate] = useState<string>(`${currentYear}-01-01`);
  const [toDate, setToDate] = useState<string>(new Date().toISOString().split("T")[0]);

  const { data: paymentVouchers = [], isLoading: isLoadingList } = useQuery({
    queryKey: ["paymentVouchers", searchBranchId, fromDate, toDate],
    queryFn: () => paymentVoucherApi.getPaymentDetails({
      BranchId: searchBranchId,
      SeriesId: 0, // 0 for all
      FromDate: fromDate,
      ToDate: toDate,
      Decimals: decimalPart,
    }),
    enabled: searchBranchId !== 0,
  });

  // 4. Fetch Payment Data for Edit
  const { data: paymentData, isLoading: isLoadingData } = useQuery({
    queryKey: ["paymentVoucher", transId],
    queryFn: () => paymentVoucherApi.getPaymentData(transId!),
    enabled: !!transId,
  });

  const isCancelled = paymentData?.masterData?.isCancelled || false;

  useEffect(() => {
    if (paymentData) {
      const d = paymentData.masterData || (paymentData as any);
      if (d) {
        const narrationValue = d.narration ?? (d as any).Narration ?? (d as any).remarks ?? (paymentData as any).narration ?? "";
        const refNoValue = d.refNo ?? (d as any).RefNo ?? "";
        reset({
          seriesId: d.seriesId || 0,
          prefix: "",
          voucherDate: d.voucherDate ? d.voucherDate.split("T")[0] : new Date().toISOString().split("T")[0],
          voucherNo: d.voucherNo || "",
          accountId: d.accountId || 0,
          accountName: d.accountName || "",
          paymodeId: d.paymodeId || 0,
          branchId: d.branchId || defaultBranchId,
          employeeId: d.employeeId || 0,
          refNo: refNoValue,
          amount: Number(d.amount).toFixed(decimalPart),
          narration: narrationValue,
          paymodes: paymentData.paymodesData?.map((p: any) => ({
            paymodeId: p.paymodeId,
            amount: p.amount
          })) || undefined,
        });
      }
    }
  }, [paymentData, reset, decimalPart, defaultBranchId]);

  const saveMutation = useMutation({
    mutationFn: async (data: PaymentVoucherForm) => {
      const payload: PaymentVoucherPayload = {
        seriesId: Number(data.seriesId),
        prefix: data.prefix || "",
        branchId: Number(data.branchId),
        accountId: Number(data.accountId),
        paymodeId: Number(data.paymodeId),
        counterId: 0,
        dayId: 0,
        shiftId: 0,
        employeeId: Number(data.employeeId),
        voucherDate: data.voucherDate,
        amount: Number(data.amount),
        refNo: data.refNo,
        narration: data.narration,
        createdAt: new Date().toISOString(),
      };
      
      if (Number(data.paymodeId) === 3 && data.paymodes) {
        payload.paymodes = data.paymodes;
      } else {
        payload.paymodes = [];
      }
      
      if (transId) {
        const updatePayload = {
          transId: transId,
          branchId: Number(data.branchId),
          accountId: Number(data.accountId),
          paymodeId: Number(data.paymodeId),
          employeeId: Number(data.employeeId),
          voucherDate: data.voucherDate,
          amount: Number(data.amount),
          refNo: data.refNo || "",
          narration: data.narration || "",
          updatedAt: new Date().toISOString(),
        };
        
        if (Number(data.paymodeId) === 3 && data.paymodes) {
          (updatePayload as any).paymodes = data.paymodes;
        } else {
          (updatePayload as any).paymodes = [];
        }
        await paymentVoucherApi.updatePayment(transId, updatePayload as any);
      } else {
        await paymentVoucherApi.createPayment(payload);
      }
    },
    onSuccess: () => {
      showToast(`Payment Voucher ${transId ? 'updated' : 'saved'} successfully!`, "success");
      queryClient.invalidateQueries({ queryKey: ["paymentVouchers"] });
      if (onSuccessCallback) {
        onSuccessCallback();
      } else if (!transId) {
        clearForm();
      }
    },
    onError: (err: any) => {
      showToast(err.message || "Failed to save payment voucher", "error");
    },
  });

  const onSubmit = handleSubmit(
    (data) => {
      const selectedPaymode = paymodeList.find(p => p.paymodeId === Number(data.paymodeId));
      const isMultiPay = selectedPaymode?.paymodeName?.toLowerCase().includes("multi") || Number(data.paymodeId) === 3;
      
      if (isMultiPay) {
        const totalMultiPay = data.paymodes?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
        const mainAmount = Number(data.amount) || 0;
        
        if (Math.abs(totalMultiPay - mainAmount) > 0.001) {
          showToast(`Total Multi Pay amount (${totalMultiPay.toFixed(decimalPart)}) must match the voucher amount (${mainAmount.toFixed(decimalPart)})`, "error");
          return;
        }
      }

      saveMutation.mutate(data);
    },
    (errors) => {
      // Inline field errors (red border + label) already show what's missing — no toast needed
      void errors;
    }
  );

  const cancelMutation = useMutation({
    mutationFn: async (id: number) => {
      await paymentVoucherApi.cancelPayment(id);
    },
    onSuccess: () => {
      showToast("Payment Voucher cancelled successfully", "success");
      queryClient.invalidateQueries({ queryKey: ["paymentVouchers"] });
    },
    onError: (error: any) => {
      showToast(error.message || "Failed to cancel payment", "error");
    }
  });

  const clearForm = () => {
    reset({
      seriesId: 0,
      prefix: "",
      voucherDate: new Date().toISOString().split("T")[0],
      voucherNo: "",
      accountId: 0,
      accountName: "",
      paymodeId: 0,
      branchId: formDefaultBranchId,
      employeeId: 0,
      refNo: "",
      amount: Number(0).toFixed(decimalPart),
      narration: "",
    });
  };

  // Watch for Series change to fetch voucher number
  const selectedSeriesId = watch("seriesId");
  const { data: fetchedVchNo } = useQuery({
    queryKey: ["paymentVoucherNumber", selectedSeriesId],
    queryFn: async () => {
      if (!selectedSeriesId) return null;
      return await paymentVoucherApi.getVoucherNumber(selectedSeriesId, "");
    },
    enabled: !!selectedSeriesId && !transId,
  });

  useEffect(() => {
    if (fetchedVchNo && !transId) {
      setValue("voucherNo", fetchedVchNo);
    }
  }, [fetchedVchNo, setValue, transId]);

  return {
    form,
    onSubmit,
    clearForm,
    isSaving: saveMutation.isPending,
    isLoadingList,
    isLoadingData,
    paymentVouchers,
    searchBranchList,
    formBranchList,
    employeeList,
    seriesList,
    accountList,
    paymodeList,
    searchBranchId,
    setSearchBranchId,
    fromDate,
    setFromDate,
    toDate,
    setToDate,
    cancelMutation,
    isCancelled,
    isMultiPayOpen,
    setIsMultiPayOpen,
    isBranchLocked,
  };
};
