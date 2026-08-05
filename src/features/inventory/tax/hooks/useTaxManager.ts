import { useCallback, useState } from "react";
import { taxService } from "../services/taxService";
import { useToast } from "../../../../app/providers/useToast";
import type { TaxFormState, TaxListItem } from "../types";
import { useTaxList } from "./useTaxList";
import { useTaxModal } from "./useTaxModal";

export const useTaxManager = () => {
  const { showToast } = useToast();

  // Compose specialized hooks
  const { taxes, setTaxes, listLoading, listError, search, setSearch, filteredTaxes, fetchTaxes } = useTaxList();
  const { modal, detailLoading, closeModal, openCreateModal, openEditModal } = useTaxModal();

  // Mutation feedback
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<TaxListItem | null>(null);

  const handleSave = useCallback(
    async (form: TaxFormState) => {
      setSaving(true);
      setMutationError(null);

      // ── Client-side uniqueness check ──────────────────────────────────────────
      const isDuplicate = taxes.some(t => 
        t.name.toLowerCase() === form.name.trim().toLowerCase() && 
        t.id !== (modal.mode === "edit" ? modal.vatId : -1)
      );

      if (isDuplicate) {
        setMutationError(`A tax with name "${form.name}" already exists.`);
        showToast("Duplicate tax name detected.", "error");
        setSaving(false);
        return;
      }

      // ── Date validation check ───────────────────────────────────────────────
      const today = new Date().toISOString().split("T")[0];
      if (form.expireAt && form.expireAt < today) {
        setMutationError("End Date cannot be a past date.");
        showToast("End Date cannot be a past date.", "error");
        setSaving(false);
        return;
      }

      try {
        const valNumeric = parseFloat(form.value) || 0;

        if (modal.mode === "edit") {
          await taxService.update(modal.vatId, {
            id: modal.vatId,
            name: form.name.trim(),
            value: valNumeric,
            expireAt: form.expireAt,
            updatedAt: new Date().toISOString(),
          });
        } else {
          await taxService.create({
            name: form.name.trim(),
            value: valNumeric,
            expireAt: form.expireAt,
            createdAt: new Date().toISOString(),
          });
        }
  
        showToast(modal.mode === "edit" ? "Tax updated successfully" : "Tax created successfully", "success");
        closeModal();
        await fetchTaxes();
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
    [modal, closeModal, fetchTaxes, showToast, taxes]
  );

  const requestDelete = useCallback((record: TaxListItem) => {
    setDeleteCandidate(record);
  }, []);

  const cancelDelete = useCallback(() => {
    setDeleteCandidate(null);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!deleteCandidate) return;

    setDeleting(deleteCandidate.id);
    setMutationError(null);

    try {
      await taxService.remove(deleteCandidate.id);
      setTaxes((prev) => prev.filter((t) => t.id !== deleteCandidate.id));
      showToast("Tax deleted successfully", "success");
      setDeleteCandidate(null);
  
      if (modal.mode === "edit" && modal.vatId === deleteCandidate.id) {
        closeModal();
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Delete failed.";
      setMutationError(message);
      showToast(message, "error");
      await fetchTaxes();
    } finally {
      setDeleting(null);
    }
  }, [deleteCandidate, modal, closeModal, fetchTaxes, setTaxes, showToast]);

  return {
    // List
    taxes,
    filteredTaxes,
    listLoading,
    listError,
    fetchTaxes,

    // Search
    search,
    setSearch,

    // Modal
    isOpen: modal.mode !== "closed",
    isEditMode: modal.mode === "edit",
    editingId: modal.mode === "edit" ? modal.vatId : null,
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
