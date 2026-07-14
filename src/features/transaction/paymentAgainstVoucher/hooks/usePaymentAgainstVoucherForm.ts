import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { paymentAgainstVoucherApi } from "../services/paymentAgainstVoucherApi";
import { paymentAgainstVoucherSchema } from "../schema/paymentAgainstVoucherSchema";
import type { PaymentAgainstVoucherFormData } from "../schema/paymentAgainstVoucherSchema";
import { useAppSelector } from "../../../../app/hooks";
import { getDecimalPart } from "../../../../utils/currency";
import { useBranchScope } from "../../../../hooks/useBranchScope";

export const usePaymentAgainstVoucherForm = (transId?: number) => {
  const auth = useAppSelector((state: any) => state.auth);
  const { isBranchLocked, initialBranchId } = useBranchScope();
  const fallbackBranch = auth?.activeBranchId || auth?.branchId || Number(localStorage.getItem("branchId")) || 0;
  const branchId = isBranchLocked ? initialBranchId : fallbackBranch;
  // Use user's employeeId from state if available, else fallback to 1
  const employeeId = auth?.employeeId || 1;

  const form = useForm<PaymentAgainstVoucherFormData>({
    resolver: zodResolver(paymentAgainstVoucherSchema) as any,
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

  // Load Master Data based on local storage branchId
  const { data: masterData, isLoading: isLoadingMaster } = useQuery({
    queryKey: ["paymentAgainstMasterData", branchId],
    queryFn: () => paymentAgainstVoucherApi.loadMasterData(branchId),
  });

  // Load existing voucher if edit mode
  const { data: existingData, isLoading: isLoadingExisting } = useQuery({
    queryKey: ["paymentAgainstData", transId],
    queryFn: () => paymentAgainstVoucherApi.getPaymentAgainstVoucherById(transId!),
    enabled: !!transId,
  });

  const { data: accounts = [], isLoading: isLoadingAccounts } = useQuery({
    queryKey: ["paymentAgainstAccounts"],
    queryFn: () => paymentAgainstVoucherApi.getAccountList(),
  });

  const selectedAccountId = form.watch("accountId");
  
  const { data: pendingInvoices = [] } = useQuery({
    queryKey: ["paymentAgainstPendingInvoices", branchId, selectedAccountId, transId],
    queryFn: () => paymentAgainstVoucherApi.getPendingInvoices(branchId, selectedAccountId, transId),
  });

  // Fetch next voucher number when series changes (only for create mode)
  const selectedSeriesId = form.watch("seriesId");
  useEffect(() => {
    if (!transId && selectedSeriesId) {
      paymentAgainstVoucherApi.getVoucherNumber(selectedSeriesId).then((res) => {
        form.setValue("vchNo", res.voucherNo, { shouldValidate: true });
        
        // Find prefix from master data
        if (masterData) {
          const series = masterData.series.find(s => s.seriesId === selectedSeriesId);
          if (series) {
            form.setValue("prefix", series.prefix);
          }
        }
      }).catch(console.error);
    }
  }, [selectedSeriesId, transId, masterData, form]);

  // Set default series if available
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
      const { masterData: md, detailsData } = existingData;
      form.reset({
        transId: md.seriesId, // Assuming transId isn't perfectly mapped, we need to pass transId explicitly
        seriesId: md.seriesId,
        prefix: "",
        vchNo: md.voucherNo,
        branchId: md.branchId,
        accountId: md.accountId,
        paymodeId: md.paymodeId,
        employeeId: md.employeeId,
        voucherDate: md.voucherDate.split("T")[0],
        discount: md.discount,
        refNo: md.refNo || "",
        narration: md.narration || "",
        details: detailsData.map(d => ({
          invoiceId: d.invoiceId,
          voucherType: d.voucherType,
          invoiceNo: d.invoiceNo,
          invoiceDate: d.invoiceDate.split("T")[0],
          invoiceAmount: d.invoiceAmount,
          balance: d.invoiceAmount - d.receivedAmount, // Adjust as needed
          amount: Number(d.receivedAmount).toFixed(getDecimalPart())
        })),
        paymodes: []
      });
    }
  }, [existingData, form]);

  const saveMutation = useMutation({
    mutationFn: async (data: PaymentAgainstVoucherFormData) => {
      // Calculate total amount from details
      const totalAmount = data.details.reduce((sum, item) => sum + Number(item.amount || 0), 0);
      const { vchNo: _unusedVchNo, ...restData } = data;
      
      const payload: any = {
        ...restData,
        transId: transId || 0,
        details: data.details.map(d => ({ 
          invoiceId: d.invoiceId,
          voucherType: d.voucherType,
          amount: Number(d.amount) 
        })),
        paymodes: data.paymodes || [],
        amount: totalAmount,
        dayId: 0,
        shiftId: 0,
        createdAt: transId ? undefined : new Date().toISOString(),
        updatedAt: transId ? new Date().toISOString() : undefined
      };

      console.log("PAYMENT AGAINST PAYLOAD SENT TO BACKEND:", JSON.stringify(payload, null, 2));

      if (transId) {
        await paymentAgainstVoucherApi.updatePaymentAgainstVoucher(transId, payload);
        return { id: transId };
      }
      return paymentAgainstVoucherApi.createPaymentAgainstVoucher(payload);
    },
  });

  return {
    form,
    masterData,
    accounts,
    pendingInvoices,
    isLoading: isLoadingMaster || isLoadingExisting || isLoadingAccounts,
    isSaving: saveMutation.isPending,
    saveMutation,
    isBranchLocked,
  };
};
