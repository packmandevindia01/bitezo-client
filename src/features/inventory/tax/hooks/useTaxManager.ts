import { useCallback, useEffect, useMemo, useState } from "react";
import { taxService } from "../services/taxService";
import { useToast } from "../../../../app/providers/useToast";
import type { TaxDetail, TaxFormState, TaxListItem } from "../types";

// ─── Internal State ───────────────────────────────────────────────────────────

type ModalState =
  | { mode: "closed" }
  | { mode: "create" }
  | { mode: "edit"; vatId: number; detail: TaxDetail | null };

// ─── Hook ─────────────────────────────────────────────────────────────────────

export const useTaxManager = () => {
  // ── List state ──────────────────────────────────────────────────────────────
  const [taxes, setTaxes] = useState<TaxListItem[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);

  // ── Search ──────────────────────────────────────────────────────────────────
  const [search, setSearch] = useState("");

  // ── Modal / form state ──────────────────────────────────────────────────────
  const [modal, setModal] = useState<ModalState>({ mode: "closed" });
  const [detailLoading, setDetailLoading] = useState(false);

  // ── Mutation feedback ───────────────────────────────────────────────────────
  const [saving, setSaving] = useState(false);
  const { showToast } = useToast();
  const [deleting, setDeleting] = useState<number | null>(null); // vatId being deleted
  const [mutationError, setMutationError] = useState<string | null>(null);

  // ── Delete confirmation ──────────────────────────────────────────────────────
  const [deleteCandidate, setDeleteCandidate] = useState<TaxListItem | null>(null);

  // ─── Fetch list ─────────────────────────────────────────────────────────────

  const fetchTaxes = useCallback(async () => {
    setListLoading(true);
    setListError(null);
    try {
      const data = await taxService.list();
      setTaxes(data);
    } catch (err) {
      setListError(err instanceof Error ? err.message : "Failed to load taxes.");
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTaxes();
  }, [fetchTaxes]);

  // ─── Modal helpers ───────────────────────────────────────────────────────────

  const closeModal = useCallback(() => {
    setModal({ mode: "closed" });
    setMutationError(null);
  }, []);

  const openCreateModal = useCallback(() => {
    setMutationError(null);
    setModal({ mode: "create" });
  }, []);

  const openEditModal = useCallback(async (record: TaxListItem) => {
    setMutationError(null);
    setModal({ mode: "edit", vatId: record.id, detail: null });
    setDetailLoading(true);
    try {
      const detail = await taxService.getById(record.id);
      setModal({ mode: "edit", vatId: record.id, detail });
    } catch (err) {
      // Fallback
      setModal({
        mode: "edit",
        vatId: record.id,
        detail: {
          id: record.id,
          name: record.name,
          value: record.value,
          expireAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      });
    } finally {
      setDetailLoading(false);
    }
  }, []);

  // ─── Derived: current edit data ──────────────────────────────────────────────

  const editDetail = modal.mode === "edit" ? modal.detail : null;
  const editingId = modal.mode === "edit" ? modal.vatId : null;

  // ─── Save (create or update) ─────────────────────────────────────────────────

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
        await fetchTaxes(); // refresh list
      } catch (err: any) {
        const apiMsg = err.response?.data?.message || err.response?.data?.errors?.[0]?.message;
        const msg = apiMsg || (err instanceof Error ? err.message : "Save failed.");
        setMutationError(msg);
        showToast(msg, "error");
      } finally {
        setSaving(false);
      }
    },
    [modal, closeModal, fetchTaxes, showToast, taxes]
  );

  // ─── Delete Flow ─────────────────────────────────────────────────────────────

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
  
      // Optimistic UI update
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
  }, [deleteCandidate, modal, closeModal, fetchTaxes, showToast]);

  // ─── Filtered list ────────────────────────────────────────────────────────────

  const filteredTaxes = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return taxes;

    return taxes.filter((t) =>
      t.name.toLowerCase().includes(query)
    );
  }, [taxes, search]);

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
    editingId,
    editDetail,
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
