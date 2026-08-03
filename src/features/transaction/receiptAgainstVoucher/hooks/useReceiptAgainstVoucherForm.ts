import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { receiptAgainstVoucherApi } from "../services/receiptAgainstVoucherApi";
import { receiptAgainstVoucherSchema } from "../schema/receiptAgainstVoucherSchema";
import type { ReceiptAgainstVoucherFormData } from "../schema/receiptAgainstVoucherSchema";
import { useAppSelector } from "../../../../app/hooks";
import { getDecimalPart } from "../../../../utils/currency";
import { useBranchScope } from "../../../../hooks/useBranchScope";

export const useReceiptAgainstVoucherForm = (transId?: number, onSuccess?: () => void) => {
  const auth = useAppSelector((state: any) => state.auth);
  const { isBranchLocked, initialBranchId } = useBranchScope();
  const fallbackBranch = auth?.activeBranchId || auth?.branchId || Number(localStorage.getItem("branchId")) || 0;
  const branchId = isBranchLocked ? initialBranchId : fallbackBranch;
  const employeeId = auth?.employeeId || 1;

  const form = useForm<ReceiptAgainstVoucherFormData>({
    resolver: zodResolver(receiptAgainstVoucherSchema) as any,
    defaultValues: {
      transId: undefined,
      seriesId: 0,
      prefix: "",
      vchNo: "",
      branchId,
      accountId: 0,
      paymodeId: 0,
      employeeId,
      voucherDate: new Date().toISOString().split("T")[0],
      discount: 0,
      refNo: "",
      narration: "",
      details: [],
      paymodes: [],
    },
  });

  const { data: masterData, isLoading: isLoadingMaster } = useQuery({
    queryKey: ["receiptAgainstMasterData", branchId],
    queryFn: () => receiptAgainstVoucherApi.loadMasterData(branchId),
    retry: false, // Don't retry if API doesn't exist yet
  });

  const { data: existingData, isLoading: isLoadingExisting } = useQuery({
    queryKey: ["receiptAgainstData", transId],
    queryFn: () => receiptAgainstVoucherApi.getReceiptAgainstVoucherById(transId!),
    enabled: !!transId,
    retry: false,
  });

  const { data: accounts = [], isLoading: isLoadingAccounts } = useQuery({
    queryKey: ["receiptAgainstAccounts"],
    queryFn: () => receiptAgainstVoucherApi.getAccountList(),
    retry: false,
  });

  const selectedAccountId = form.watch("accountId");
  
  const { data: pendingInvoices = [] } = useQuery({
    queryKey: ["receiptAgainstPendingInvoices", branchId, selectedAccountId, transId],
    queryFn: () => receiptAgainstVoucherApi.getPendingInvoices(branchId, selectedAccountId, transId),
    enabled: !!selectedAccountId,
    retry: false,
  });

  // Fetch next voucher number when series changes (only for create mode)
  const selectedSeriesId = form.watch("seriesId");
  useEffect(() => {
    if (!transId && selectedSeriesId) {
      receiptAgainstVoucherApi.getVoucherNumber(selectedSeriesId).then((res) => {
        form.setValue("vchNo", res.voucherNo, { shouldValidate: true });
        if (masterData) {
          const series = masterData.series.find(s => s.seriesId === selectedSeriesId);
          if (series) {
            form.setValue("prefix", series.prefix);
          }
        }
      }).catch(console.error);
    }
  }, [selectedSeriesId, transId, masterData, form]);

  // Set default series
  useEffect(() => {
    if (masterData?.series?.length && !transId) {
      const currentSeries = form.getValues("seriesId");
      if (!currentSeries || currentSeries === 0) {
        form.setValue("seriesId", masterData.series[0].seriesId, { shouldValidate: true });
      }
    }
  }, [masterData, form, transId]);

  // Populate form in edit mode
  useEffect(() => {
    if (existingData) {
      const { masterData: md, detailsData, paymodesData } = existingData;
      form.reset({
        transId: transId,
        seriesId: md.seriesId,
        prefix: "",
        vchNo: md.voucherNo,
        branchId: md.branchId,
        accountId: md.accountId,
        paymodeId: md.paymodeId,
        employeeId: md.employeeId,
        voucherDate: md.voucherDate?.split("T")[0] || "",
        discount: md.discount,
        refNo: md.refNo || "",
        narration: md.narration || "",
        details: (detailsData || []).map(d => ({
          invoiceId: d.invoiceId,
          voucherType: d.voucherType,
          invoiceNo: d.invoiceNo,
          invoiceDate: d.invoiceDate?.split("T")[0] || "",
          invoiceAmount: d.invoiceAmount,
          receivedAmount: d.receivedAmount,
          balance: 0,
          amount: Number(d.receivedAmount).toFixed(getDecimalPart()),
        })),
        paymodes: (paymodesData || []).map(p => ({
          paymodeId: p.paymodeId,
          amount: p.amount
        })),
      });
    }
  }, [existingData, form, transId]);

  const saveMutation = useMutation({
    mutationFn: async (data: ReceiptAgainstVoucherFormData): Promise<any> => {
      const totalAmount = data.details.reduce((sum, item) => sum + Number(item.amount || 0), 0);
      const now = new Date();

      const payload: any = {
        ...data,
        transId: transId || 0,
        amount: totalAmount,
        createdAt: transId ? undefined : new Date(data.voucherDate + "T" + now.toISOString().split("T")[1]).toISOString(),
        updatedAt: transId ? new Date(data.voucherDate + "T" + now.toISOString().split("T")[1]).toISOString() : undefined
      };
      
      if (Number(data.paymodeId) !== 3) {
        payload.paymodes = [];
      }
      
      if (transId) {
        delete payload.createdAt;
        console.log("RECEIPT AGAINST UPDATE PAYLOAD:", JSON.stringify(payload, null, 2));
        return receiptAgainstVoucherApi.updateReceiptAgainstVoucher(transId, payload);
      }
      delete payload.updatedAt;
      console.log("RECEIPT AGAINST CREATE PAYLOAD:", JSON.stringify(payload, null, 2));
      return receiptAgainstVoucherApi.createReceiptAgainstVoucher(payload);
    },
    onSuccess,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => receiptAgainstVoucherApi.deleteReceiptAgainstVoucher(id),
  });

  return {
    form,
    masterData,
    accounts,
    pendingInvoices,
    isLoading: isLoadingMaster || isLoadingAccounts || (!!transId && isLoadingExisting),
    isSaving: saveMutation.isPending,
    saveMutation,
    deleteMutation,
    isBranchLocked,
  };
};
