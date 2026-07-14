import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { paymentVoucherSchema } from "../types";
import type { PaymentVoucherForm, PaymentVoucherPayload } from "../types";
import { paymentVoucherApi } from "../services/paymentVoucherApi";
import { branchApi } from "../../../inventory/branches/services/branchApi";
import type { BranchRecord } from "../../../inventory/branches/types";
import { useToast } from "../../../../app/providers/useToast";
import { useCurrency } from "../../../../hooks/useCurrency";
import { useBranchScope } from "../../../../hooks/useBranchScope";

export const usePaymentVoucher = (transId?: number, onSuccessCallback?: () => void) => {
  const { showToast } = useToast();
  const { decimalPart } = useCurrency();
  const queryClient = useQueryClient();
  const { isBranchLocked, initialBranchId } = useBranchScope();
  const defaultBranchId = initialBranchId ? Number(initialBranchId) : 0;
  const [searchBranchId, setSearchBranchId] = useState<number>(defaultBranchId);

  const form = useForm<PaymentVoucherForm>({
    resolver: zodResolver(paymentVoucherSchema),
    defaultValues: {
      seriesId: 0,
      prefix: "",
      voucherDate: new Date().toISOString().split("T")[0],
      voucherNo: "",
      accountId: 0,
      accountName: "",
      paymodeId: 0,
      branchId: defaultBranchId,
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
    queryKey: ["paymentMaster", currentFormBranchId],
    queryFn: () => paymentVoucherApi.getLoadMaster(currentFormBranchId),
    enabled: !!currentFormBranchId,
  });

  // Derived lists
  const seriesList = masterData?.series || [];
  const employeeList = masterData?.salesman || [];
  const paymodeList = (masterData?.paymodes || []).filter(p => p.paymodeName.toLowerCase() !== "credit");

  // 2. Account List
  const { data: accountList = [] } = useQuery({
    queryKey: ["paymentAccountList"],
    queryFn: () => paymentVoucherApi.getAccountList(""),
  });

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
    if (paymentData?.masterData) {
      const d = paymentData.masterData;
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
      });
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
        paymodes: data.paymodes || [{ paymodeId: Number(data.paymodeId), amount: Number(data.amount) }],
      };
      
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
          paymodes: data.paymodes || [{ paymodeId: Number(data.paymodeId), amount: Number(data.amount) }],
        };
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
      saveMutation.mutate(data);
    },
    (errors) => {
      const firstError = Object.values(errors)[0];
      if (firstError?.message) {
        showToast(firstError.message as string, "error");
      }
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
      branchId: defaultBranchId,
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
