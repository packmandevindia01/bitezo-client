import { useCallback, useState } from "react";
import { groupService } from "../services/groupService";
import { useToast } from "../../../../app/providers/useToast";
import type { GroupForm } from "../types";
import { useGroupList } from "./useGroupList";
import { useGroupModal } from "./useGroupModal";

export const useGroupManager = () => {
  const { showToast } = useToast();

  // Compose specialized hooks
  const { 
    groups, 
    setGroups, 
    listLoading, 
    listError, 
    search, 
    setSearch, 
    filteredGroups, 
    fetchGroups 
  } = useGroupList();

  const { 
    modal, 
    detailLoading, 
    closeModal, 
    openCreateModal, 
    openEditModal 
  } = useGroupModal();

  // Mutation feedback
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<{ grpId: number; name: string } | null>(null);

  const handleSave = useCallback(
    async (form: GroupForm) => {
      // Validate uniqueness to prevent 409 Conflict
      const isDuplicateCode = groups.some(g => g.code.toLowerCase() === form.code.trim().toLowerCase() && (modal.mode === "create" || (modal.mode === "edit" && g.grpId !== modal.grpId)));
      if (isDuplicateCode) {
        showToast("A group with this Code already exists.", "error");
        return;
      }

      const isDuplicateName = groups.some(g => g.name.toLowerCase() === form.name.trim().toLowerCase() && (modal.mode === "create" || (modal.mode === "edit" && g.grpId !== modal.grpId)));
      if (isDuplicateName) {
        showToast("A group with this Name already exists.", "error");
        return;
      }

      setSaving(true);
      setMutationError(null);

      try {
        if (modal.mode === "edit") {
          await groupService.update(modal.grpId, {
            grpId: modal.grpId,
            code: form.code,
            name: form.name,
            arabicName: form.arabicName,
            isActive: form.isActive,
            updatedAt: new Date().toISOString(),
            posStatus: form.posStatus,
            startTime: form.startTime,
            endTime: form.endTime,
          });
        } else {
          await groupService.create({
            code: form.code,
            name: form.name,
            arabicName: form.arabicName,
            isActive: form.isActive,
            createdAt: new Date().toISOString(),
            posStatus: form.posStatus,
            startTime: form.startTime,
            endTime: form.endTime,
          });
        }

        await fetchGroups();
        showToast(modal.mode === "edit" ? "Group updated successfully" : "Group created successfully", "success");
        closeModal();
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Save failed.";
        setMutationError(msg);
        showToast(msg, "error");
      } finally {
        setSaving(false);
      }
    },
    [modal, closeModal, fetchGroups, showToast]
  );

  const requestDelete = useCallback((record: { grpId: number; name: string }) => {
    setDeleteCandidate(record);
  }, []);

  const cancelDelete = useCallback(() => {
    setDeleteCandidate(null);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!deleteCandidate) return;
    
    setDeleting(deleteCandidate.grpId);
    setMutationError(null);

    try {
      await groupService.remove(deleteCandidate.grpId);
      setGroups((prev) => prev.filter((g) => g.grpId !== deleteCandidate.grpId));
      showToast("Group deleted successfully", "success");
      setDeleteCandidate(null);

      if (modal.mode === "edit" && modal.grpId === deleteCandidate.grpId) {
        closeModal();
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Delete failed.";
      setMutationError(message);
      showToast(message, "error");
      await fetchGroups();
    } finally {
      setDeleting(null);
    }
  }, [deleteCandidate, modal, closeModal, fetchGroups, setGroups, showToast]);

  return {
    // List
    groups,
    filteredGroups,
    listLoading,
    listError,
    fetchGroups,

    // Search
    search,
    setSearch,

    // Modal
    isOpen: modal.mode !== "closed",
    isEditMode: modal.mode === "edit",
    editingId: modal.mode === "edit" ? modal.grpId : null,
    editDetail: modal.mode === "edit" ? modal.detail : null,
    detailLoading,

    // Mutations
    saving,
    deleting,
    mutationError,
    clearMutationError: () => setMutationError(null),

    // Actions
    openCreateModal,
    openEditModal,
    closeModal,
    handleSave,

    // Delete flow
    deleteCandidate,
    requestDelete,
    confirmDelete,
    cancelDelete,
  } as const;
};