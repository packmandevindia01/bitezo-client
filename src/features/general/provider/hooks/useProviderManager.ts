import { useMemo, useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { providerSchema, type ProviderFormType, type ProviderListItem } from "../types";
import { fetchProviders, fetchProviderById, createProvider, updateProvider, deleteProvider } from "../services/providerService";
import { paymodeService } from "../../paymode/services/paymodeService";
import { useToast } from "../../../../app/providers/useToast";
import { useAppDispatch, useAppSelector } from "../../../../app/hooks";
import { fetchGlobalMasterData } from "../../../inventory/shared/store/masterDataSlice";

export const useProviderManager = () => {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const dispatch = useAppDispatch();

  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [allocationOpen, setAllocationOpen] = useState(false);
  const [imagePreview, setImagePreview] = useState<string>("");

  // Global Master Data (for branches)
  const { branches, loading: masterLoading } = useAppSelector((state) => state.masterData);
  
  useEffect(() => {
    if (branches.length === 0) {
      void dispatch(fetchGlobalMasterData());
    }
  }, [branches.length, dispatch]);

  // ── Queries ─────────────────────────────────────────────

  const { data: records = [], isLoading: recordsLoading } = useQuery({
    queryKey: ["providers"],
    queryFn: async () => {
      const data = await fetchProviders();
      return data.sort((a, b) => b.providerId - a.providerId);
    },
  });

  const { data: paymodes = [], isLoading: paymodesLoading } = useQuery({
    queryKey: ["paymodes"],
    queryFn: async () => {
      const data = await paymodeService.list();
      return data.map((pm) => ({ id: pm.paymodeId, name: pm.paymodeName }));
    },
  });

  // ── Form Setup ──────────────────────────────────────────

  const form = useForm<ProviderFormType>({
    resolver: zodResolver(providerSchema),
    defaultValues: {
      providerName: "",
      paymodeId: 0,
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
      showToast(error?.message || "Failed to delete provider", "error");
    },
  });

  // ── Actions ─────────────────────────────────────────────

  const resetForm = () => {
    form.reset({
      providerName: "",
      paymodeId: 0,
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
    setOpen(true);
  };

  const handleEdit = async (record: ProviderListItem) => {
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

  const handleSave = form.handleSubmit((data) => {
    saveMutation.mutate(data);
  });

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

  return {
    form,
    open,
    search,
    editingId,
    filteredRecords,
    loading: recordsLoading || masterLoading || paymodesLoading,
    saving: saveMutation.isPending,
    isDeleting: deleteMutation.isPending,
    branchOptions: branches,
    paymodeOptions: paymodes,
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
