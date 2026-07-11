import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { menuSettingsApi } from "../services/menuSettingsApi";
import type { CreateMenuSettingsPayload, UpdateMenuSettingsPayload } from "../types";
import { useToast } from "../../../../app/providers/useToast";

export const useMenuSettings = () => {
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  // Search
  const [search, setSearch] = useState("");

  // Modal State
  const [modalMode, setModalMode] = useState<"closed" | "create" | "edit">("closed");
  const [editId, setEditId] = useState<number | null>(null);

  // Delete State
  const [deleteCandidate, setDeleteCandidate] = useState<{ id: number; name: string } | null>(null);

  // Queries
  const { data: menuSettings = [], isLoading: listLoading, error: listError } = useQuery({
    queryKey: ["menuSettingsList"],
    queryFn: () => menuSettingsApi.list(),
  });

  const { data: editDetail, isLoading: detailLoading } = useQuery({
    queryKey: ["menuSettingsDetail", editId],
    queryFn: () => menuSettingsApi.getById(editId!),
    enabled: modalMode === "edit" && editId !== null,
  });

  // Derived filtered data
  const filteredList = menuSettings.filter((item) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      item.name?.toLowerCase().includes(q) ||
      item.code?.toLowerCase().includes(q)
    );
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (payload: CreateMenuSettingsPayload) => menuSettingsApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["menuSettingsList"] });
      showToast("Menu Settings created successfully", "success");
      closeModal();
    },
    onError: (err: Error) => {
      showToast(err.message || "Failed to create Menu Settings", "error");
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: { id: number; payload: UpdateMenuSettingsPayload }) => 
      menuSettingsApi.update(data.id, data.payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["menuSettingsList"] });
      showToast("Menu Settings updated successfully", "success");
      closeModal();
    },
    onError: (err: Error) => {
      showToast(err.message || "Failed to update Menu Settings", "error");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => menuSettingsApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["menuSettingsList"] });
      showToast("Menu Settings deleted successfully", "success");
      setDeleteCandidate(null);
    },
    onError: (err: Error) => {
      showToast(err.message || "Failed to delete Menu Settings", "error");
    },
  });

  // Actions
  const openCreateModal = () => {
    setEditId(null);
    setModalMode("create");
  };

  const openEditModal = (id: number) => {
    setEditId(id);
    setModalMode("edit");
  };

  const closeModal = () => {
    setModalMode("closed");
    setEditId(null);
  };

  const handleSave = async (data: Omit<CreateMenuSettingsPayload, "createdAt">) => {
    if (modalMode === "edit" && editId) {
      await updateMutation.mutateAsync({
        id: editId,
        payload: {
          ...data,
          menuId: editId,
          updatedAt: new Date().toISOString(),
        } as UpdateMenuSettingsPayload,
      });
    } else {
      await createMutation.mutateAsync({
        ...data,
        createdAt: new Date().toISOString(),
      });
    }
  };

  const confirmDelete = () => {
    if (deleteCandidate) {
      deleteMutation.mutate(deleteCandidate.id);
    }
  };

  return {
    // List
    filteredList,
    listLoading,
    listError: listError ? listError.message : null,
    
    // Search
    search,
    setSearch,

    // Modal
    isOpen: modalMode !== "closed",
    isEditMode: modalMode === "edit",
    editDetail,
    detailLoading,

    // Saving State
    saving: createMutation.isPending || updateMutation.isPending,
    
    // Deleting State
    deleting: deleteMutation.isPending,
    deleteCandidate,
    
    // Actions
    openCreateModal,
    openEditModal,
    closeModal,
    handleSave,
    requestDelete: (item: { id: number; name: string }) => setDeleteCandidate(item),
    cancelDelete: () => setDeleteCandidate(null),
    confirmDelete,
  };
};
