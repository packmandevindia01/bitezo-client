import { useMemo, useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { providerSchema, type ProviderFormType, type ProviderListItem } from "../types";
import { fetchProviders, fetchProviderById, createProvider, updateProvider, deleteProvider, fetchProviderAccounts, fetchProviderPaymodes } from "../services/providerService";
import { useToast } from "../../../../app/providers/useToast";
import { useAppDispatch, useAppSelector } from "../../../../app/hooks";
import { fetchGlobalMasterData } from "../../../inventory/shared/store/masterDataSlice";
import { fetchBranchNames, fetchBranches } from "../../../inventory/branches/services/branchApi";
import { subscribeToBranchUpdates } from "../../../inventory/branches/utils/branchSync";
import { subscribeToPaymodeUpdates } from "../../paymode/utils/paymodeSync";
import { paymodeService } from "../../paymode/services/paymodeService";
import axiosInstance from "../../../../api/axiosInstance";
import type { ApiResponse } from "../../../inventory/product/types";

export const useProviderManager = () => {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const dispatch = useAppDispatch();

  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [allocationOpen, setAllocationOpen] = useState(false);
  const [imagePreview, setImagePreview] = useState<string>("");

  // Global Master Data (for branches fallback)
  const { branches, loading: masterLoading } = useAppSelector((state) => state.masterData);
  
  useEffect(() => {
    void dispatch(fetchGlobalMasterData());
  }, [dispatch]);

  // ── Queries ─────────────────────────────────────────────

  const { data: records = [], isLoading: recordsLoading } = useQuery({
    queryKey: ["providers"],
    queryFn: async () => {
      const data = await fetchProviders();
      return data.sort((a, b) => b.providerId - a.providerId);
    },
  });

  const { data: branchList = [], refetch: refetchBranchNames } = useQuery({
    queryKey: ["branchNames"],
    queryFn: async () => {
      // 1. Try fetchBranchNames(true)
      try {
        const data = await fetchBranchNames(true);
        if (Array.isArray(data) && data.length > 0) {
          return data
            .map((b) => ({ id: Number(b.id ?? b.branchId ?? 0), name: String(b.branchName ?? b.name ?? "") }))
            .filter((b) => b.id > 0);
        }
      } catch (err) {
        console.warn("Failed to fetch branch names directly:", err);
      }

      // 2. Try direct /Branch/true/list-name
      try {
        const { data: res } = await axiosInstance.get<ApiResponse<any[]>>("/Branch/true/list-name");
        const list = Array.isArray(res?.data) ? res.data : [];
        if (list.length > 0) {
          return list
            .map((b: any) => ({
              id: Number(b.branchId ?? b.id ?? 0),
              name: String(b.branchName ?? b.name ?? ""),
            }))
            .filter((b) => b.id > 0);
        }
      } catch (err) {
        console.warn("Failed to fetch /Branch/true/list-name:", err);
      }

      // 3. Fallback to /Branch/list (which always returns all created branches)
      try {
        const fallback = await fetchBranches();
        if (Array.isArray(fallback) && fallback.length > 0) {
          return fallback
            .map((b) => ({ id: Number(b.id ?? 0), name: String(b.branchName ?? "") }))
            .filter((b) => b.id > 0);
        }
      } catch (err) {
        console.warn("Failed to fetch /Branch/list:", err);
      }

      return [];
    },
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });

  // Listen for real-time branch updates (same tab and cross-tab)
  useEffect(() => {
    const unsubscribe = subscribeToBranchUpdates(() => {
      queryClient.invalidateQueries({ queryKey: ["branchNames"] });
      queryClient.invalidateQueries({ queryKey: ["branches"] });
      queryClient.invalidateQueries({ queryKey: ["allBranchesList"] });
      queryClient.invalidateQueries({ queryKey: ["branchList"] });
      void refetchBranchNames();
      void dispatch(fetchGlobalMasterData());
    });
    return () => unsubscribe();
  }, [queryClient, dispatch, refetchBranchNames]);

  // Ensure fresh branch & paymode data whenever the modal opens
  useEffect(() => {
    if (open) {
      queryClient.invalidateQueries({ queryKey: ["branchNames"] });
      queryClient.invalidateQueries({ queryKey: ["branches"] });
      queryClient.invalidateQueries({ queryKey: ["providerPaymodes"] });
      void refetchBranchNames();
      void refetchPaymodes();
      void dispatch(fetchGlobalMasterData());
    }
  }, [open, refetchBranchNames, queryClient, dispatch]);

  const { data: paymodes = [], isLoading: paymodesLoading, refetch: refetchPaymodes } = useQuery({
    queryKey: ["providerPaymodes"],
    queryFn: async () => {
      try {
        const data = await fetchProviderPaymodes();
        if (Array.isArray(data) && data.length > 0) {
          return data;
        }
      } catch (err) {
        console.warn("fetchProviderPaymodes failed:", err);
      }
      try {
        const directList = await paymodeService.list();
        if (Array.isArray(directList) && directList.length > 0) {
          return directList.map((pm) => ({
            paymodeId: pm.paymodeId,
            paymodeName: pm.paymodeName,
          }));
        }
      } catch (err) {
        console.warn("paymodeService.list fallback failed:", err);
      }
      return [];
    },
    select: (data) =>
      (data || []).map((pm: any) => ({
        id: pm.paymodeId ?? pm.id,
        name: pm.paymodeName ?? pm.name,
        paymodeId: pm.paymodeId ?? pm.id,
        paymodeName: pm.paymodeName ?? pm.name,
      })),
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });

  // Listen for real-time paymode updates (same tab and cross-tab)
  useEffect(() => {
    const unsubscribe = subscribeToPaymodeUpdates(() => {
      queryClient.invalidateQueries({ queryKey: ["providerPaymodes"] });
      queryClient.invalidateQueries({ queryKey: ["paymodes"] });
      void refetchPaymodes();
    });
    return () => unsubscribe();
  }, [queryClient, refetchPaymodes]);

  const { data: accounts = [], isLoading: accountsLoading } = useQuery({
    queryKey: ["providerAccounts"],
    queryFn: async () => {
      const data = await fetchProviderAccounts();
      return (data || []).map((acc: any) => ({
        id: acc.customerId ?? acc.id,
        name: acc.customerName ? `${acc.code ? `${acc.code} - ` : ""}${acc.customerName}` : String(acc.name || acc.customerId || acc.id),
        code: acc.code,
        customerName: acc.customerName,
      }));
    },
  });

  // ── Form Setup ──────────────────────────────────────────

  const form = useForm<ProviderFormType>({
    resolver: zodResolver(providerSchema),
    defaultValues: {
      providerName: "",
      paymodeId: 0,
      postAccountId: 0,
      deliveryStatus: true,
      branchIds: [],
      imageFile: null,
      fileUrl: "",
    },
  });

  // ── Mutations ───────────────────────────────────────────

  const saveMutation = useMutation({
    mutationFn: async (data: ProviderFormType) => {
      const payload = {
        ...data,
      };
      if (editingId) {
        return await updateProvider(editingId, payload);
      } else {
        return await createProvider(payload);
      }
    },
    onSuccess: () => {
      showToast(`Provider ${editingId ? "updated" : "created"} successfully`, "success");
      queryClient.invalidateQueries({ queryKey: ["providers"] });
      closeModal();
    },
    onError: (error: any) => {
      showToast(error?.message || "Failed to save provider", "error");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (providerId: number) => deleteProvider(providerId),
    onSuccess: () => {
      showToast("Provider deleted successfully", "success");
      queryClient.invalidateQueries({ queryKey: ["providers"] });
      if (editingId) {
        closeModal();
      }
    },
    onError: (error: any) => {
      const errMsg = String(error?.response?.data?.message || error?.message || "");
      if (
        !errMsg ||
        errMsg.includes("REFERENCE") ||
        errMsg.includes("foreign key") ||
        errMsg.includes("constraint") ||
        errMsg.includes("conflict") ||
        errMsg.includes("500") ||
        errMsg.includes("409") ||
        errMsg.includes("Request failed")
      ) {
        showToast("Provider is in use and cannot be deleted.", "error");
      } else {
        showToast(errMsg, "error");
      }
    },
  });

  // ── Actions ─────────────────────────────────────────────

  const resetForm = () => {
    form.reset({
      providerName: "",
      paymodeId: 0,
      postAccountId: 0,
      deliveryStatus: true,
      branchIds: [],
      imageFile: null,
      fileUrl: "",
    });
    setEditingId(null);
    setAllocationOpen(false);
    setImagePreview("");
  };

  const closeModal = () => {
    setOpen(false);
    resetForm();
  };

  const openCreateModal = () => {
    resetForm();
    queryClient.invalidateQueries({ queryKey: ["branchNames"] });
    queryClient.invalidateQueries({ queryKey: ["branches"] });
    queryClient.invalidateQueries({ queryKey: ["allBranchesList"] });
    queryClient.invalidateQueries({ queryKey: ["providerPaymodes"] });
    void refetchBranchNames();
    void refetchPaymodes();
    void dispatch(fetchGlobalMasterData());
    setOpen(true);
  };

  const handleEdit = async (record: ProviderListItem) => {
    queryClient.invalidateQueries({ queryKey: ["branchNames"] });
    queryClient.invalidateQueries({ queryKey: ["branches"] });
    queryClient.invalidateQueries({ queryKey: ["allBranchesList"] });
    queryClient.invalidateQueries({ queryKey: ["providerPaymodes"] });
    void refetchBranchNames();
    void refetchPaymodes();
    void dispatch(fetchGlobalMasterData());
    try {
      const detail = await fetchProviderById(record.providerId);
      
      const branchIds = Array.isArray(detail.branch) 
        ? detail.branch.map((b: any) => b.branchId) 
        : [];

      setEditingId(detail.provider.providerId);
      
      form.reset({
        providerId: detail.provider.providerId,
        providerName: detail.provider.providerName,
        paymodeId: detail.provider.paymodeId,
        postAccountId: detail.provider.postAccountId || 0,
        deliveryStatus: detail.provider.deliveryStatus === "Enable",
        branchIds: branchIds,
        fileUrl: detail.provider.fileUrl || "",
        imageFile: null,
      });

      setImagePreview(detail.provider.fileUrl || "");
      setOpen(true);
    } catch (error: any) {
      showToast(error?.message || "Failed to fetch provider details", "error");
    }
  };

  const handleSave = form.handleSubmit(
    (data) => {
      saveMutation.mutate(data);
    },
    (errs) => {
      if (errs.branchIds) {
        document.getElementById("prov-branch-select")?.focus();
      }
    }
  );

  const handleDelete = (providerId: number) => {
    deleteMutation.mutate(providerId);
  };

  const toggleBranchSelection = (branchId: number) => {
    const current = form.getValues("branchIds");
    const updated = current.includes(branchId)
      ? current.filter((id) => id !== branchId)
      : [...current, branchId];
    
    form.setValue("branchIds", updated, { shouldDirty: true, shouldValidate: true });
  };

  const handleImageChange = (file: File | null) => {
    form.setValue("imageFile", file, { shouldDirty: true });
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      setImagePreview("");
      // Keep fileUrl if removing newly selected image?
      // Actually if user clicks remove, we clear both.
      form.setValue("fileUrl", "", { shouldDirty: true });
    }
  };

  const filteredRecords = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return records;

    return records.filter((item) =>
      item.providerName.toLowerCase().includes(query) ||
      (item.paymode && item.paymode.toLowerCase().includes(query))
    );
  }, [records, search]);

  const branchOptions = useMemo(() => {
    if (branchList.length > 0) return branchList;
    return branches.map((b: any) => ({
      id: b.id ?? b.branchId,
      name: b.name ?? b.branchName,
    }));
  }, [branchList, branches]);

  return {
    form,
    open,
    search,
    editingId,
    filteredRecords,
    loading: recordsLoading || masterLoading || paymodesLoading || accountsLoading,
    saving: saveMutation.isPending,
    isDeleting: deleteMutation.isPending,
    branchOptions,
    paymodeOptions: paymodes,
    accountOptions: accounts,
    allocationOpen,
    imagePreview,
    setAllocationOpen,
    setSearch,
    toggleBranchSelection,
    handleImageChange,
    resetForm,
    closeModal,
    openCreateModal,
    handleSave,
    handleEdit,
    handleDelete,
  };
};
