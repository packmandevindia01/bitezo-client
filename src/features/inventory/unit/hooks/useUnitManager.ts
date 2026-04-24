import { useCallback, useState } from "react";
import { unitService } from "../services/unitService";
import { useToast } from "../../../../app/providers/useToast";
import type { UnitFormState, UnitListItem } from "../types";
import { useUnitList } from "./useUnitList";
import { useUnitModal } from "./useUnitModal";

export const useUnitManager = () => {
  const { showToast } = useToast();

  // Compose specialized hooks
  const { units, setUnits, listLoading, listError, search, setSearch, filteredUnits, fetchUnits } = useUnitList();
  const { modal, detailLoading, closeModal, openCreateModal, openEditModal } = useUnitModal();

  // Mutation feedback
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<UnitListItem | null>(null);

  const handleSave = useCallback(
    async (form: UnitFormState) => {
      setSaving(true);
      setMutationError(null);

      const isDuplicate = units.some(u => 
        u.name.toLowerCase() === form.name.trim().toLowerCase() && 
        u.unitId !== (modal.mode === "edit" ? modal.unitId : -1)
      );

      if (isDuplicate) {
        setMutationError(`A unit with name "${form.name}" already exists.`);
        showToast("Duplicate unit name detected.", "error");
        setSaving(false);
        return;
      }

      try {
        if (modal.mode === "edit") {
          await unitService.update(modal.unitId, {
            unitId: modal.unitId,
            name: form.name.trim(),
            category: form.category,
            conversion: form.conversion,
            currentValue: form.currentValue,
            parentId: form.parentId,
            updatedAt: new Date().toISOString(),
          });
        } else {
          await unitService.create({
            name: form.name.trim(),
            category: form.category,
            conversion: form.conversion,
            currentValue: form.currentValue,
            parentId: form.parentId,
            createdAt: new Date().toISOString(),
          });
        }
  
        showToast(modal.mode === "edit" ? "Unit updated successfully" : "Unit created successfully", "success");
        closeModal();
        await fetchUnits();
      } catch (err: unknown) {
        const axErr = err as { response?: { data?: { message?: string; errors?: { message?: string }[] } }; message?: string };
        const apiMsg = axErr.response?.data?.message || axErr.response?.data?.errors?.[0]?.message;
        const msg = apiMsg || (err instanceof Error ? err.message : "Save failed.");
        setMutationError(msg);
        showToast(msg, "error");
      } finally {
        setSaving(false);
      }
    },
    [modal, closeModal, fetchUnits, showToast, units]
  );

  const requestDelete = useCallback((record: UnitListItem) => {
    setDeleteCandidate(record);
  }, []);

  const cancelDelete = useCallback(() => {
    setDeleteCandidate(null);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!deleteCandidate) return;

    setDeleting(deleteCandidate.unitId);
    setMutationError(null);

    try {
      await unitService.remove(deleteCandidate.unitId);
      setUnits((prev) => prev.filter((u) => u.unitId !== deleteCandidate.unitId));
      showToast("Unit deleted successfully", "success");
      setDeleteCandidate(null);
  
      if (modal.mode === "edit" && modal.unitId === deleteCandidate.unitId) {
        closeModal();
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Delete failed.";
      setMutationError(message);
      showToast(message, "error");
      await fetchUnits();
    } finally {
      setDeleting(null);
    }
  }, [deleteCandidate, modal, closeModal, fetchUnits, setUnits, showToast]);

  return {
    // List
    units,
    filteredUnits,
    listLoading,
    listError,
    fetchUnits,

    // Search
    search,
    setSearch,

    // Modal
    isOpen: modal.mode !== "closed",
    isEditMode: modal.mode === "edit",
    editingId: modal.mode === "edit" ? modal.unitId : null,
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
