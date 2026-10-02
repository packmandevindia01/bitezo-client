import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { receiptAgainstVoucherApi } from "../services/receiptAgainstVoucherApi";
import { receiptAgainstVoucherSchema } from "../schema/receiptAgainstVoucherSchema";
import type { ReceiptAgainstVoucherFormData } from "../schema/receiptAgainstVoucherSchema";
import { useAppSelector } from "../../../../app/hooks";
import { getDecimalPart } from "../../../../utils/currency";
import { useBranchScope } from "../../../../hooks/useBranchScope";
import { subscribeToEmployeeUpdates } from "../../../general/employee/utils/employeeSync";
import { getEmployeeNames, getEmployees } from "../../../general/employee/services/employeeService";

export const useReceiptAgainstVoucherForm = (transId?: number, onSuccess?: () => void) => {
  const queryClient = useQueryClient();
  const auth = useAppSelector((state: any) => state.auth);
  const { isBranchLocked, initialBranchId } = useBranchScope();
  const fallbackBranch = auth?.activeBranchId || auth?.branchId || Number(localStorage.getItem("branchId")) || 0;
  const branchId = isBranchLocked ? initialBranchId : fallbackBranch;
  const employeeId = Number(localStorage.getItem("employeeId")) || 0;

  const form = useForm<ReceiptAgainstVoucherFormData>({
    resolver: zodResolver(receiptAgainstVoucherSchema) as any,
    mode: "onChange",
    reValidateMode: "onChange",
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

  const currentFormBranchId = Number(form.watch("branchId") || branchId || 0);

  const { data: masterData, isLoading: isLoadingMaster, refetch: refetchMasterData } = useQuery({
    queryKey: ["receiptAgainstMasterData", currentFormBranchId],
    queryFn: () => receiptAgainstVoucherApi.loadMasterData(currentFormBranchId),
    retry: false, // Don't retry if API doesn't exist yet
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });

  // Employee Names by Branch (and global) directly from Employee Service
  const { data: allEmployeeNames = [], refetch: refetchEmployeeNames } = useQuery({
    queryKey: ["employeeNames", currentFormBranchId],
    queryFn: () => getEmployeeNames(currentFormBranchId || undefined),
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });

  // Primary Employees List directly synchronized with Employee Master cache key ["employees"]
  const { data: employeesList = [], refetch: refetchEmployees } = useQuery({
    queryKey: ["employees"],
    queryFn: async () => {
      const data = await getEmployees();
      return (data || []).map((item: any) => ({
        id: item.empId ?? item.id,
        name: item.empName ?? item.name,
        code: item.empCode ?? item.code,
        branch: item.branch,
        branchId: item.branchId,
        driver: false,
        active:
          item.isActive === "Active" ||
          item.isActive === true ||
          item.active === true ||
          String(item.isActive).toLowerCase() === "true" ||
          String(item.isActive) === "1",
        isMaster: false,
        roleId: 0,
      }));
    },
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
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

  // Real-time synchronization: sync master data (employees, etc.) when employees are created/updated
  useEffect(() => {
    return subscribeToEmployeeUpdates(() => {
      void queryClient.invalidateQueries({ queryKey: ["receiptAgainstMasterData"] });
      void queryClient.invalidateQueries({ queryKey: ["employeeNames"] });
      void queryClient.invalidateQueries({ queryKey: ["employees"] });
      void refetchMasterData();
      void refetchEmployeeNames();
      void refetchEmployees();
    });
  }, [queryClient, refetchMasterData, refetchEmployeeNames, refetchEmployees]);

  // Merge loadMaster salesman, branch employee names, and global employees so newly created employees are immediately visible
  const employeeList = useMemo(() => {
    const list: { employeeId: number; employeeName: string }[] = [];
    const existingIds = new Set<number>();

    const addEmployee = (rawId: any, rawName: any, rawActive: any, rawBranchId: any) => {
      const id = Number(rawId);
      const name = String(rawName || "").trim();
      if (!id || !name || existingIds.has(id)) return;

      const isActive =
        rawActive === "Active" ||
        rawActive === true ||
        String(rawActive).toLowerCase() === "true" ||
        String(rawActive) === "1" ||
        rawActive === undefined;

      if (!isActive) return;

      const matchesBranch =
        !currentFormBranchId ||
        !rawBranchId ||
        Number(rawBranchId) === Number(currentFormBranchId);

      if (matchesBranch) {
        existingIds.add(id);
        list.push({ employeeId: id, employeeName: name });
      }
    };

    // 1. Add from masterData?.salesman
    (masterData?.salesman || []).forEach((e) => {
      addEmployee(e.employeeId, e.employeeName, true, currentFormBranchId);
    });

    // 2. Add from allEmployeeNames
    (allEmployeeNames || []).forEach((e: any) => {
      addEmployee(e.empId ?? e.employeeId ?? e.id, e.empName ?? e.employeeName ?? e.name, true, currentFormBranchId);
    });

    // 3. Add from employeesList (from ["employees"] query)
    (employeesList || []).forEach((e: any) => {
      addEmployee(e.id ?? e.empId ?? e.employeeId, e.name ?? e.empName ?? e.employeeName, e.active ?? e.isActive, e.branchId);
    });

    // 4. Add from queryClient cache for ["employees"] directly as instant synchronous fallback
    const cachedQueryData = queryClient.getQueryData<any[]>(["employees"]);
    if (Array.isArray(cachedQueryData)) {
      cachedQueryData.forEach((e: any) => {
        addEmployee(e.id ?? e.empId ?? e.employeeId, e.name ?? e.empName ?? e.employeeName, e.active ?? e.isActive, e.branchId);
      });
    }

    return list;
  }, [masterData?.salesman, allEmployeeNames, employeesList, currentFormBranchId, queryClient]);

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

      const basePayload = {
        seriesId: Number(data.seriesId || 0),
        prefix: data.prefix || "",
        branchId: Number(data.branchId || 0),
        accountId: Number(data.accountId || 0),
        paymodeId: Number(data.paymodeId || 0),
        dayId: 0,
        shiftId: 0,
        employeeId: Number(data.employeeId || 0),
        voucherDate: data.voucherDate,
        discount: Number(data.discount || 0),
        amount: totalAmount,
        refNo: data.refNo || "",
        narration: data.narration || "",
        details: data.details.map(d => ({
          invoiceId: Number(d.invoiceId || 0),
          voucherType: d.voucherType || "",
          amount: Number(d.amount || 0)
        })),
        paymodes: Number(data.paymodeId) === 3 ? (data.paymodes || []).map(p => ({
          paymodeId: Number(p.paymodeId || 0),
          amount: Number(p.amount || 0)
        })) : []
      };
      
      if (transId) {
        const updatePayload: any = {
          ...basePayload,
          transId,
          updatedAt: new Date(data.voucherDate + "T" + now.toISOString().split("T")[1]).toISOString()
        };
        console.log("RECEIPT AGAINST UPDATE PAYLOAD:", JSON.stringify(updatePayload, null, 2));
        return receiptAgainstVoucherApi.updateReceiptAgainstVoucher(transId, updatePayload as any);
      }
      
      const createPayload: any = {
        ...basePayload,
        createdAt: new Date(data.voucherDate + "T" + now.toISOString().split("T")[1]).toISOString()
      };
      console.log("RECEIPT AGAINST CREATE PAYLOAD:", JSON.stringify(createPayload, null, 2));
      return receiptAgainstVoucherApi.createReceiptAgainstVoucher(createPayload as any);
    },
    onSuccess,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => receiptAgainstVoucherApi.deleteReceiptAgainstVoucher(id),
  });

  return {
    form,
    masterData,
    employeeList,
    accounts,
    pendingInvoices,
    isLoading: isLoadingMaster || isLoadingAccounts || (!!transId && isLoadingExisting),
    isSaving: saveMutation.isPending,
    saveMutation,
    deleteMutation,
    isBranchLocked,
  };
};
