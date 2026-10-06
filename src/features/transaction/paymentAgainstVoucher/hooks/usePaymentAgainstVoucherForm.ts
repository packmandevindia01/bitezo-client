import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { paymentAgainstVoucherApi } from "../services/paymentAgainstVoucherApi";
import { paymentAgainstVoucherSchema } from "../schema/paymentAgainstVoucherSchema";
import type { PaymentAgainstVoucherFormData } from "../schema/paymentAgainstVoucherSchema";
import { useAppSelector } from "../../../../app/hooks";
import { getDecimalPart } from "../../../../utils/currency";
import { useBranchScope } from "../../../../hooks/useBranchScope";
import { subscribeToSupplierUpdates } from "../../../general/supplier/utils/supplierSync";
import { subscribeToEmployeeUpdates } from "../../../general/employee/utils/employeeSync";
import { getEmployeeNames, getEmployees } from "../../../general/employee/services/employeeService";
import { paymodeService } from "../../../general/paymode/services/paymodeService";
import { subscribeToPaymodeUpdates } from "../../../general/paymode/utils/paymodeSync";
import { fetchBranches, fetchBranchNames } from "../../../inventory/branches/services/branchApi";
import { subscribeToBranchUpdates } from "../../../inventory/branches/utils/branchSync";

export const usePaymentAgainstVoucherForm = (transId?: number) => {
  const queryClient = useQueryClient();
  const auth = useAppSelector((state: any) => state.auth);
  const reduxBranches = useAppSelector((state: any) => state.masterData?.branches);
  const { isBranchLocked, initialBranchId } = useBranchScope();
  const fallbackBranch = auth?.activeBranchId || auth?.branchId || Number(localStorage.getItem("branchId")) || 0;
  const branchId = isBranchLocked ? initialBranchId : fallbackBranch;
  // Use employeeId from storage if available, otherwise fallback to 0 as expected by backend when unassigned
  const employeeId = Number(localStorage.getItem("employeeId")) || 0;

  const form = useForm<PaymentAgainstVoucherFormData>({
    resolver: zodResolver(paymentAgainstVoucherSchema) as any,
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

  // 1. Fetch All Branches for Dropdowns with robust multi-endpoint fallback
  const { data: allBranches = [], refetch: refetchAllBranches } = useQuery<any[]>({
    queryKey: ["allBranchesList"],
    queryFn: async () => {
      try {
        const data = await fetchBranchNames(false);
        if (Array.isArray(data) && data.length > 0) return data;
      } catch (e) {}
      try {
        const data = await fetchBranchNames(true);
        if (Array.isArray(data) && data.length > 0) return data;
      } catch (e) {}
      try {
        const data = await fetchBranches();
        if (Array.isArray(data) && data.length > 0) return data;
      } catch (e) {}
      return [];
    },
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });

  // Real-time synchronization: sync branches when created/updated
  useEffect(() => {
    return subscribeToBranchUpdates(() => {
      void queryClient.invalidateQueries({ queryKey: ["allBranchesList"] });
      void refetchAllBranches();
    });
  }, [queryClient, refetchAllBranches]);

  // Load Master Data based on current branch
  const { data: masterData, isLoading: isLoadingMaster, refetch: refetchMasterData } = useQuery({
    queryKey: ["paymentAgainstMasterData", currentFormBranchId],
    queryFn: () => paymentAgainstVoucherApi.loadMasterData(currentFormBranchId),
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

  // Paymodes Master List directly from Paymode Service for instant synchronization
  const { data: allPaymodes = [], refetch: refetchAllPaymodes } = useQuery({
    queryKey: ["paymodes"],
    queryFn: () => paymodeService.list(),
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
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
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });

  // Real-time synchronization: sync supplier accounts when suppliers are created/updated
  useEffect(() => {
    return subscribeToSupplierUpdates(() => {
      void queryClient.invalidateQueries({ queryKey: ["paymentAgainstAccounts"] });
      void queryClient.refetchQueries({ queryKey: ["paymentAgainstAccounts"] });
    });
  }, [queryClient]);

  // Real-time synchronization: sync master data (employees, etc.) when employees are created/updated
  useEffect(() => {
    return subscribeToEmployeeUpdates(() => {
      void queryClient.invalidateQueries({ queryKey: ["paymentAgainstMasterData"] });
      void queryClient.invalidateQueries({ queryKey: ["employeeNames"] });
      void queryClient.invalidateQueries({ queryKey: ["employees"] });
      void refetchMasterData();
      void refetchEmployeeNames();
      void refetchEmployees();
    });
  }, [queryClient, refetchMasterData, refetchEmployeeNames, refetchEmployees]);

  // Real-time synchronization: sync paymodes when created/updated/deleted
  useEffect(() => {
    return subscribeToPaymodeUpdates(() => {
      void queryClient.invalidateQueries({ queryKey: ["paymentAgainstMasterData"] });
      void queryClient.invalidateQueries({ queryKey: ["paymodes"] });
      void refetchMasterData();
      void refetchAllPaymodes();
    });
  }, [queryClient, refetchMasterData, refetchAllPaymodes]);

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

  // Robust branch list merging allBranches, masterData?.branches, Redux, and cache fallbacks
  const branchList = useMemo(() => {
    const list: { branchId: number; branchName: string }[] = [];
    const existingIds = new Set<number>();

    const addBranch = (rawId: any, rawName: any) => {
      const id = Number(rawId);
      const name = String(rawName || "").trim();
      if (!id || !name || existingIds.has(id)) return;

      existingIds.add(id);
      list.push({ branchId: id, branchName: name });
    };

    // 1. Add from allBranches query
    (allBranches || []).forEach((b: any) => {
      addBranch(b.branchId ?? b.id ?? b.BranchId ?? b.Id, b.branchName ?? b.name ?? b.BranchName ?? b.Name);
    });

    // 2. Add from masterData?.branches
    (masterData?.branches || []).forEach((b: any) => {
      addBranch(b.branchId ?? b.id ?? b.BranchId ?? b.Id, b.branchName ?? b.name ?? b.BranchName ?? b.Name);
    });

    // 3. Add from queryClient cache for various branch query keys
    ["allBranchesList", "branchList", "branchNames", "branches", "stockAdjustmentBranches", "internalStockTransferBranches"].forEach((key) => {
      const cached = queryClient.getQueryData<any[]>([key]);
      if (Array.isArray(cached)) {
        cached.forEach((b: any) => {
          addBranch(b.branchId ?? b.id ?? b.BranchId ?? b.Id ?? b.value, b.branchName ?? b.name ?? b.BranchName ?? b.Name ?? b.label);
        });
      }
    });

    // 4. Add from Redux masterData branches
    if (Array.isArray(reduxBranches)) {
      reduxBranches.forEach((b: any) => {
        addBranch(b.id ?? b.branchId, b.name ?? b.branchName);
      });
    }

    // 5. Fallback for the current form branch so raw numbers never appear in the UI
    const currentBranch = Number(currentFormBranchId || branchId || 0);
    if (currentBranch > 0 && !existingIds.has(currentBranch)) {
      const fallbackName = currentBranch === 1 ? "All" : `Branch ${currentBranch}`;
      addBranch(currentBranch, fallbackName);
    }

    return list;
  }, [allBranches, masterData?.branches, reduxBranches, currentFormBranchId, branchId, queryClient]);

  // Auto-select first branch if none selected
  useEffect(() => {
    if (!transId && (!form.getValues("branchId") || form.getValues("branchId") === 0) && branchList.length > 0) {
      form.setValue("branchId", branchList[0].branchId, { shouldValidate: true });
    }
  }, [branchList, form, transId]);

  const selectedAccountId = form.watch("accountId");
  
  const { data: pendingInvoices = [] } = useQuery({
    queryKey: ["paymentAgainstPendingInvoices", currentFormBranchId, selectedAccountId, transId],
    queryFn: () => paymentAgainstVoucherApi.getPendingInvoices(currentFormBranchId, selectedAccountId, transId),
    enabled: !!selectedAccountId && currentFormBranchId > 0,
    retry: false,
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
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

  // Set default series if available or series no longer in list after branch change
  useEffect(() => {
    if (masterData?.series?.length && !transId) {
      const currentSeries = form.getValues("seriesId");
      const seriesStillValid = masterData.series.some(s => s.seriesId === currentSeries);
      if (!currentSeries || currentSeries === 0 || !seriesStillValid) {
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
        voucherDate: md.voucherDate?.split("T")[0] || "",
        discount: md.discount,
        refNo: md.refNo || "",
        narration: md.narration || "",
        details: (detailsData || []).map((d: any) => ({
          invoiceId: d.invoiceId,
          voucherType: d.voucherType,
          invoiceNo: d.invoiceNo,
          invoiceDate: d.invoiceDate?.split("T")[0] || "",
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
        amount: totalAmount,
        dayId: 0,
        shiftId: 0,
        createdAt: transId ? undefined : new Date().toISOString(),
        updatedAt: transId ? new Date().toISOString() : undefined
      };

      if (Number(data.paymodeId) === 3 && data.paymodes) {
        payload.paymodes = data.paymodes;
      } else {
        payload.paymodes = [];
      }

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
    masterData: masterData ? { ...masterData, paymodes: paymodeList } : undefined,
    paymodeList,
    employeeList,
    accounts,
    branchList,
    formBranchList: branchList,
    pendingInvoices,
    isLoading: isLoadingMaster || isLoadingExisting || isLoadingAccounts,
    isSaving: saveMutation.isPending,
    saveMutation,
    isBranchLocked,
  };
};
