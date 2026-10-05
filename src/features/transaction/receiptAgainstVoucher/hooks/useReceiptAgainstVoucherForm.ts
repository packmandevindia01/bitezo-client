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
import { paymodeService } from "../../../general/paymode/services/paymodeService";
import { subscribeToPaymodeUpdates } from "../../../general/paymode/utils/paymodeSync";
import { fetchBranches, fetchBranchNames } from "../../../inventory/branches/services/branchApi";
import { subscribeToBranchUpdates } from "../../../inventory/branches/utils/branchSync";
import type { BranchRecord } from "../../../inventory/branches/types";

export const useReceiptAgainstVoucherForm = (transId?: number, onSuccess?: () => void) => {
  const queryClient = useQueryClient();
  const auth = useAppSelector((state: any) => state.auth);
  const reduxBranches = useAppSelector((state: any) => state.masterData?.branches);
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

  // Paymodes Master List directly from Paymode Service for instant synchronization
  const { data: allPaymodes = [], refetch: refetchAllPaymodes } = useQuery({
    queryKey: ["paymodes"],
    queryFn: () => paymodeService.list(),
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

  // Real-time synchronization: sync paymodes when created/updated/deleted
  useEffect(() => {
    return subscribeToPaymodeUpdates(() => {
      void queryClient.invalidateQueries({ queryKey: ["receiptAgainstMasterData"] });
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
    queryKey: ["receiptAgainstPendingInvoices", currentFormBranchId, selectedAccountId, transId],
    queryFn: () => receiptAgainstVoucherApi.getPendingInvoices(currentFormBranchId, selectedAccountId, transId),
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
      receiptAgainstVoucherApi.getVoucherNumber(selectedSeriesId).then((res) => {
        form.setValue("vchNo", res.voucherNo, { shouldValidate: true });
        if (masterData) {
          const series = masterData.series.find(s => s.seriesId === selectedSeriesId);
          if (series) {
            form.setValue("prefix", series.prefix);
            if (series.branchId && (!form.getValues("branchId") || form.getValues("branchId") === 0)) {
              form.setValue("branchId", series.branchId, { shouldValidate: true });
            }
          }
        }
      }).catch(console.error);
    }
  }, [selectedSeriesId, transId, masterData, form]);

  // Set default series
  useEffect(() => {
    if (masterData?.series?.length && !transId) {
      const currentSeries = form.getValues("seriesId");
      const seriesStillValid = masterData.series.some(s => s.seriesId === currentSeries);
      if (!currentSeries || currentSeries === 0 || !seriesStillValid) {
        const defaultSeries = masterData.series[0];
        form.setValue("seriesId", defaultSeries.seriesId, { shouldValidate: true });
        if (defaultSeries.branchId && (!form.getValues("branchId") || form.getValues("branchId") === 0)) {
          form.setValue("branchId", defaultSeries.branchId, { shouldValidate: true });
        }
      }
    }
  }, [masterData, form, transId]);

  // Populate form in edit mode
  useEffect(() => {
    if (existingData) {
      const { masterData: md, detailsData, paymodesData } = existingData;
      const rawDetails = detailsData || [];
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
        details: rawDetails.map((d: any) => {
          const invId = Number(d.invoiceId ?? d.InvoiceId ?? d.id ?? d.Id ?? 0);
          const vType = d.voucherType || d.VoucherType || d.vchType || d.VchType || "";
          const vNo = d.invoiceNo || d.InvoiceNo || d.vchNo || d.VchNo || d.voucherNo || d.VoucherNo || d.invNo || d.InvNo || "";
          const vDate = (d.invoiceDate || d.InvoiceDate || d.date || "").split("T")[0];
          const invAmnt = Number(d.invoiceAmount ?? d.InvoiceAmount ?? d.invAmnt ?? d.amount ?? 0);
          const recAmnt = Number(d.receivedAmount ?? d.ReceivedAmount ?? d.amount ?? 0);
          const bal = Number(d.balance ?? d.Balance ?? (invAmnt > recAmnt ? invAmnt - recAmnt : recAmnt));
          return {
            invoiceId: invId,
            voucherType: vType,
            invoiceNo: vNo,
            invoiceDate: vDate,
            invoiceAmount: invAmnt,
            receivedAmount: recAmnt,
            balance: bal,
            amount: recAmnt.toFixed(getDecimalPart()),
          };
        }),
        paymodes: (paymodesData || []).map(p => ({
          paymodeId: p.paymodeId,
          amount: p.amount
        })),
      });
    }
  }, [existingData, form, transId]);

  // Enrich existing details with pending invoices data (e.g. invoiceNo, invoiceAmount, balance) if missing
  useEffect(() => {
    if (pendingInvoices && pendingInvoices.length > 0) {
      const currentDetails = form.getValues("details") || [];
      if (currentDetails.length > 0) {
        let hasChanges = false;
        const enriched = currentDetails.map((d: any) => {
          const invId = Number(d.invoiceId);
          const match = pendingInvoices.find((p: any) => Number(p.invoiceId ?? p.InvoiceId ?? p.id ?? p.Id) === invId);
          if (match) {
            const matchedNo = match.invoiceNo || match.InvoiceNo || match.vchNo || match.VchNo || match.voucherNo || match.VoucherNo || match.invNo || match.InvNo || "";
            const matchedType = match.voucherType || match.VoucherType || match.vchType || match.VchType || "";
            const matchedDate = (match.invoiceDate || match.InvoiceDate || match.date || "").split("T")[0];
            const matchedAmnt = Number(match.invoiceAmount ?? match.InvoiceAmount ?? match.invAmnt ?? 0);
            const matchedBal = Number(match.balance ?? match.Balance ?? 0);

            if ((!d.invoiceNo && matchedNo) || (d.balance === 0 && matchedBal > 0)) {
              hasChanges = true;
              return {
                ...d,
                invoiceNo: d.invoiceNo || matchedNo,
                voucherType: d.voucherType || matchedType,
                invoiceDate: d.invoiceDate || matchedDate,
                invoiceAmount: d.invoiceAmount || matchedAmnt,
                balance: d.balance || matchedBal,
              };
            }
          }
          return d;
        });
        if (hasChanges) {
          form.setValue("details", enriched);
        }
      }
    }
  }, [pendingInvoices, form]);

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
    masterData: masterData ? { ...masterData, paymodes: paymodeList } : undefined,
    paymodeList,
    employeeList,
    accounts,
    branchList,
    formBranchList: branchList,
    pendingInvoices,
    isLoading: isLoadingMaster || isLoadingAccounts || (!!transId && isLoadingExisting),
    isSaving: saveMutation.isPending,
    saveMutation,
    deleteMutation,
    isBranchLocked,
  };
};
