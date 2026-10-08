import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { paymentVoucherSchema } from "../types";
import type { 
  PaymentVoucherForm, 
  PaymentVoucherCreatePayload,
  PaymentVoucherUpdatePayload 
} from "../types";
import { paymentVoucherApi, formatDateOnly } from "../services/paymentVoucherApi";
import { branchApi } from "../../../inventory/branches/services/branchApi";
import type { BranchRecord } from "../../../inventory/branches/types";
import { useToast } from "../../../../app/providers/useToast";
import { useCurrency } from "../../../../hooks/useCurrency";
import { useBranchScope } from "../../../../hooks/useBranchScope";
import { paymodeService } from "../../../general/paymode/services/paymodeService";
import { subscribeToPaymodeUpdates } from "../../../general/paymode/utils/paymodeSync";
import { subscribeToSupplierUpdates } from "../../../general/supplier/utils/supplierSync";
import { subscribeToEmployeeUpdates } from "../../../general/employee/utils/employeeSync";
import { subscribeToBranchUpdates } from "../../../inventory/branches/utils/branchSync";
import { getEmployeeNames, getEmployees } from "../../../general/employee/services/employeeService";

export { formatDateOnly };

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
      voucherDate: formatDateOnly(new Date()),
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
  const { data: allBranches = [], refetch: refetchAllBranches } = useQuery<BranchRecord[]>({
    queryKey: ["allBranchesList"],
    queryFn: () => branchApi.fetchBranchNames(true),
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });

  // 2. Master Data (Series, Employees/Salesman, Paymodes) based on Selected Form Branch
  const { data: masterData, refetch: refetchMasterData } = useQuery({
    queryKey: ["paymentMaster", currentFormBranchId],
    queryFn: () => paymentVoucherApi.getLoadMaster(currentFormBranchId || 0),
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });

  const [isMultiPayOpen, setIsMultiPayOpen] = useState(false);

  // Robust branch lists merging allBranches, masterData?.branches, and queryClient cache fallbacks
  const { formBranchList, searchBranchList } = useMemo(() => {
    const searchList: { branchId: number; branchName: string }[] = [];
    const formList: { branchId: number; branchName: string }[] = [];
    const existingSearchIds = new Set<number>();
    const existingFormIds = new Set<number>();

    const addBranch = (rawId: any, rawName: any) => {
      const id = Number(rawId);
      const name = String(rawName || "").trim();
      if (!id || !name) return;

      if (!existingSearchIds.has(id)) {
        existingSearchIds.add(id);
        searchList.push({ branchId: id, branchName: name });
      }

      if (name.toLowerCase() !== "all" && !existingFormIds.has(id)) {
        existingFormIds.add(id);
        formList.push({ branchId: id, branchName: name });
      }
    };

    // 1. Add from allBranches query
    (allBranches || []).forEach((b) => {
      addBranch(b.id, b.branchName);
    });

    // 2. Add from masterData?.branches
    (masterData?.branches || []).forEach((b) => {
      addBranch(b.branchId, b.branchName);
    });

    // 3. Add from queryClient cache for ["allBranchesList"]
    const cachedAllBranches = queryClient.getQueryData<any[]>(["allBranchesList"]);
    if (Array.isArray(cachedAllBranches)) {
      cachedAllBranches.forEach((b) => {
        addBranch(b.id ?? b.branchId, b.branchName);
      });
    }

    // 4. Add from queryClient cache for ["branches"]
    const cachedBranches = queryClient.getQueryData<any[]>(["branches"]);
    if (Array.isArray(cachedBranches)) {
      cachedBranches.forEach((b) => {
        addBranch(b.id ?? b.branchId, b.branchName);
      });
    }

    return { formBranchList: formList, searchBranchList: searchList };
  }, [allBranches, masterData?.branches, queryClient]);

  // Auto-select "All" if default is 0 and we found "All" in the API
  useEffect(() => {
    if (searchBranchId === 0 && searchBranchList.length > 0) {
      const allBranch = searchBranchList.find(b => b.branchName.toLowerCase() === "all");
      if (allBranch) {
        setSearchBranchId(allBranch.branchId);
      } else {
        setSearchBranchId(searchBranchList[0].branchId);
      }
    }
  }, [searchBranchList, searchBranchId]);

  // Paymodes Master List directly from Paymode Service for instant synchronization
  const { data: allPaymodes = [], refetch: refetchAllPaymodes } = useQuery({
    queryKey: ["paymodes"],
    queryFn: () => paymodeService.list(),
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

  // Cross-tab and local real-time listener for paymode updates
  useEffect(() => {
    return subscribeToPaymodeUpdates(() => {
      queryClient.invalidateQueries({ queryKey: ["paymentMaster"] });
      queryClient.invalidateQueries({ queryKey: ["paymodes"] });
      void refetchMasterData();
      void refetchAllPaymodes();
    });
  }, [queryClient, refetchMasterData, refetchAllPaymodes]);

  // Cross-tab and local real-time listener for branch updates
  useEffect(() => {
    return subscribeToBranchUpdates(() => {
      queryClient.invalidateQueries({ queryKey: ["allBranchesList"] });
      queryClient.invalidateQueries({ queryKey: ["paymentMaster"] });
      void refetchAllBranches();
      void refetchMasterData();
    });
  }, [queryClient, refetchAllBranches, refetchMasterData]);

  // Cross-tab and local real-time listener for employee updates
  useEffect(() => {
    return subscribeToEmployeeUpdates(() => {
      queryClient.invalidateQueries({ queryKey: ["paymentMaster"] });
      queryClient.invalidateQueries({ queryKey: ["employeeNames"] });
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      void refetchMasterData();
      void refetchEmployeeNames();
      void refetchEmployees();
    });
  }, [queryClient, refetchMasterData, refetchEmployeeNames, refetchEmployees]);

  // Derived lists
  const seriesList = masterData?.series || [];

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

  // Merge loadMaster paymodes, allPaymodes, and queryClient cache so newly created paymodes are immediately visible
  const paymodeList = useMemo(() => {
    const list: { paymodeId: number; paymodeName: string }[] = [];
    const existingIds = new Set<number>();

    const addPaymode = (rawId: any, rawName: any, rawActive: any) => {
      const id = Number(rawId);
      const name = String(rawName || "").trim();
      if (!id || !name || existingIds.has(id)) return;
      if (name.toLowerCase() === "credit") return;

      const isActive =
        rawActive === "Active" ||
        rawActive === true ||
        String(rawActive).toLowerCase() === "true" ||
        String(rawActive).toLowerCase() === "active" ||
        String(rawActive) === "1" ||
        rawActive === undefined;

      if (!isActive) return;

      existingIds.add(id);
      list.push({ paymodeId: id, paymodeName: name });
    };

    // 1. Add from masterData?.paymodes
    (masterData?.paymodes || []).forEach((p: any) => {
      addPaymode(p.paymodeId ?? p.id, p.paymodeName ?? p.name, true);
    });

    // 2. Add from allPaymodes (from ["paymodes"] query)
    (allPaymodes || []).forEach((p: any) => {
      addPaymode(p.paymodeId ?? p.id ?? p.code, p.paymodeName ?? p.name, p.isActive);
    });

    // 3. Add from queryClient cache for ["paymodes"] directly as instant synchronous fallback
    const cachedQueryData = queryClient.getQueryData<any[]>(["paymodes"]);
    if (Array.isArray(cachedQueryData)) {
      cachedQueryData.forEach((p: any) => {
        addPaymode(p.paymodeId ?? p.id ?? p.code, p.paymodeName ?? p.name, p.isActive);
      });
    }

    return list;
  }, [masterData?.paymodes, allPaymodes, queryClient]);

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
  const [toDate, setToDate] = useState<string>(formatDateOnly(new Date()));

  const { data: paymentVouchers = [], isLoading: isLoadingList } = useQuery({
    queryKey: ["paymentVouchers", searchBranchId, fromDate, toDate],
    queryFn: () => paymentVoucherApi.getPaymentDetails({
      BranchId: searchBranchId,
      SeriesId: 0, // 0 for all
      FromDate: formatDateOnly(fromDate),
      ToDate: formatDateOnly(toDate),
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
          voucherDate: formatDateOnly(d.voucherDate),
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
      const vDate = formatDateOnly(data.voucherDate);
      const selectedPaymodeId = Number(data.paymodeId) || 1;
      const voucherAmount = Number(Number(data.amount).toFixed(decimalPart));

      let paymodesPayload: { paymodeId: number; amount: number }[] = [];
      if (selectedPaymodeId === 3 && data.paymodes && data.paymodes.length > 0) {
        paymodesPayload = data.paymodes.map((p) => ({
          paymodeId: Number(p.paymodeId),
          amount: Number(Number(p.amount).toFixed(decimalPart)),
        }));
      } else {
        paymodesPayload = [{ paymodeId: selectedPaymodeId, amount: voucherAmount }];
      }

      if (transId) {
        const updatePayload: PaymentVoucherUpdatePayload = {
          transId: Number(transId),
          branchId: Number(data.branchId),
          accountId: Number(data.accountId),
          paymodeId: selectedPaymodeId,
          employeeId: Number(data.employeeId),
          voucherDate: vDate,
          amount: voucherAmount,
          refNo: data.refNo || "",
          narration: data.narration || "",
          updatedAt: new Date().toISOString(),
          paymodes: paymodesPayload,
        };
        await paymentVoucherApi.updatePayment(Number(transId), updatePayload);
      } else {
        const createPayload: PaymentVoucherCreatePayload = {
          seriesId: Number(data.seriesId),
          prefix: data.prefix || "",
          branchId: Number(data.branchId),
          accountId: Number(data.accountId),
          paymodeId: selectedPaymodeId,
          dayId: 0,
          shiftId: 0,
          employeeId: Number(data.employeeId),
          voucherDate: vDate,
          amount: voucherAmount,
          refNo: data.refNo || "",
          narration: data.narration || "",
          createdAt: new Date().toISOString(),
          paymodes: paymodesPayload,
        };
        await paymentVoucherApi.createPayment(createPayload);
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
      voucherDate: formatDateOnly(new Date()),
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

  // Auto-select first series if available and not set
  useEffect(() => {
    if (!transId && seriesList.length > 0 && (!watch("seriesId") || watch("seriesId") === 0)) {
      setValue("seriesId", seriesList[0].seriesId, { shouldValidate: true });
    }
  }, [seriesList, transId, setValue, watch]);

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
