import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { receiptVoucherSchema } from "../types";
import type { ReceiptVoucherForm, ReceiptVoucherPayload } from "../types";
import { receiptVoucherApi } from "../services/receiptVoucherApi";
import { branchApi } from "../../../inventory/branches/services/branchApi";
import type { BranchRecord } from "../../../inventory/branches/types";
import { useToast } from "../../../../app/providers/useToast";
import { useCurrency } from "../../../../hooks/useCurrency";
import { useBranchScope } from "../../../../hooks/useBranchScope";

export const useReceiptVoucher = (transId?: number, onSuccessCallback?: () => void) => {
  const { showToast } = useToast();
  const { decimalPart } = useCurrency();
  const queryClient = useQueryClient();
  const { isBranchLocked, initialBranchId } = useBranchScope();
  const defaultBranchId = initialBranchId ? Number(initialBranchId) : 0;
  const formDefaultBranchId = isBranchLocked ? defaultBranchId : 0;
  const [searchBranchId, setSearchBranchId] = useState<number>(defaultBranchId);

  const form = useForm<ReceiptVoucherForm>({
    resolver: zodResolver(receiptVoucherSchema),
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

  const { handleSubmit, reset, watch, setValue, setError, clearErrors } = form;
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
  const { data: masterData } = useQuery({
    queryKey: ["receiptMaster", currentFormBranchId],
    queryFn: () => receiptVoucherApi.getLoadMaster(currentFormBranchId || 0),
    placeholderData: keepPreviousData,
  });

  // Derived lists
  const seriesList = masterData?.series || [];
  const employeeList = masterData?.salesman || [];
  const paymodeList = (masterData?.paymodes || []).filter(p => p.paymodeName.toLowerCase() !== "credit");

  // 2. Account List
  const { data: accountList = [] } = useQuery({
    queryKey: ["receiptAccountList"],
    queryFn: () => receiptVoucherApi.getAccountList(""),
    placeholderData: keepPreviousData,
  });

  // 3. Receipt Details List
  const currentYear = new Date().getFullYear();
  const [fromDate, setFromDate] = useState<string>(`${currentYear}-01-01`);
  const [toDate, setToDate] = useState<string>(new Date().toISOString().split("T")[0]);

  const { data: receiptVouchers = [], isLoading: isLoadingList } = useQuery({
    queryKey: ["receiptVouchers", searchBranchId, fromDate, toDate],
    queryFn: () => receiptVoucherApi.getReceiptDetails({
      BranchId: searchBranchId,
      SeriesId: 0, // 0 for all
      FromDate: fromDate,
      ToDate: toDate,
      Decimals: decimalPart,
    }),
    enabled: searchBranchId !== 0,
  });

  // 4. Fetch Receipt Data for Edit
  const { data: receiptData, isLoading: isLoadingData } = useQuery({
    queryKey: ["receiptVoucher", transId],
    queryFn: () => receiptVoucherApi.getReceiptData(transId!),
    enabled: !!transId,
  });

  const isCancelled = receiptData?.masterData?.isCancelled || false;

  useEffect(() => {
    if (receiptData?.masterData) {
      const d = receiptData.masterData;
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
        refNo: d.refNo || "",
        amount: Number(d.amount).toFixed(decimalPart),
        narration: d.narration || "",
        paymodes: receiptData.paymodesData?.map((p: any) => ({
          paymodeId: p.paymodeId,
          amount: p.amount
        })) || undefined,
      });
    }
  }, [receiptData, reset, decimalPart, defaultBranchId]);

  const saveMutation = useMutation({
    mutationFn: async (data: ReceiptVoucherForm) => {
      const payload: ReceiptVoucherPayload = {
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
        await receiptVoucherApi.updateReceipt(transId, updatePayload as any);
      } else {
        await receiptVoucherApi.createReceipt(payload);
      }
    },
    onSuccess: () => {
      showToast(`Receipt Voucher ${transId ? 'updated' : 'saved'} successfully!`, "success");
      queryClient.invalidateQueries({ queryKey: ["receiptVouchers"] });
      if (transId) {
        queryClient.invalidateQueries({ queryKey: ["receiptVoucher", transId] });
      }
      if (onSuccessCallback) {
        onSuccessCallback();
      } else if (!transId) {
        clearForm();
      }
    },
    onError: (err: any) => {
      showToast(err.message || "Failed to save receipt voucher", "error");
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
          const msg = `Total Multi Pay amount (${totalMultiPay.toFixed(decimalPart)}) must match the voucher amount (${mainAmount.toFixed(decimalPart)})`;
          setError("amount", { type: "manual", message: msg });
          showToast(msg, "error");
          return;
        } else {
          clearErrors("amount");
        }
      }

      saveMutation.mutate(data);
    }
  );

  const cancelMutation = useMutation({
    mutationFn: async (id: number) => {
      await receiptVoucherApi.cancelReceipt(id);
    },
    onSuccess: () => {
      showToast("Receipt Voucher cancelled successfully", "success");
      queryClient.invalidateQueries({ queryKey: ["receiptVouchers"] });
    },
    onError: (error: any) => {
      showToast(error.message || "Failed to cancel receipt", "error");
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
    queryKey: ["receiptVoucherNumber", selectedSeriesId],
    queryFn: async () => {
      if (!selectedSeriesId) return null;
      return await receiptVoucherApi.getVoucherNumber(selectedSeriesId, "");
    },
    enabled: !!selectedSeriesId,
  });

  useEffect(() => {
    if (fetchedVchNo) {
      setValue("voucherNo", fetchedVchNo);
    }
  }, [fetchedVchNo, setValue]);

  return {
    form,
    onSubmit,
    clearForm,
    isSaving: saveMutation.isPending,
    isLoadingList,
    receiptVouchers,
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
    isLoadingData,
    isMultiPayOpen,
    setIsMultiPayOpen,
    isBranchLocked,
  };
};
