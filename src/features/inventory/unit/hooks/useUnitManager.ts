import { useCallback, useEffect, useMemo, useState } from "react";
import { unitService } from "../services/unitService";
import { useToast } from "../../../../app/providers/useToast";
import type { UnitDetail, UnitFormState, UnitListItem } from "../types";

// ─── Internal State ───────────────────────────────────────────────────────────

type ModalState =
  | { mode: "closed" }
  | { mode: "create" }
  | { mode: "edit"; unitId: number; detail: UnitDetail | null };

// ─── Hook ─────────────────────────────────────────────────────────────────────

export const useUnitManager = () => {
  // ── List state ──────────────────────────────────────────────────────────────
  const [units, setUnits] = useState<UnitListItem[]>([]);
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
  const [deleting, setDeleting] = useState<number | null>(null); // unitId being deleted
  const [mutationError, setMutationError] = useState<string | null>(null);

  // ── Delete confirmation ──────────────────────────────────────────────────────
  const [deleteCandidate, setDeleteCandidate] = useState<UnitListItem | null>(null);

  // ─── Fetch list ─────────────────────────────────────────────────────────────

  const fetchUnits = useCallback(async () => {
    setListLoading(true);
    setListError(null);
    try {
      const data = await unitService.list();
      setUnits(data);
    } catch (err) {
      setListError(err instanceof Error ? err.message : "Failed to load units.");
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUnits();
  }, [fetchUnits]);

  // ─── Modal helpers ───────────────────────────────────────────────────────────

  const closeModal = useCallback(() => {
    setModal({ mode: "closed" });
    setMutationError(null);
  }, []);

  const openCreateModal = useCallback(() => {
    setMutationError(null);
    setModal({ mode: "create" });
  }, []);

  const openEditModal = useCallback(async (record: UnitListItem) => {
    if (record.unitId <= 4) {
      showToast("Core system units cannot be edited.", "warning");
      return;
    }
    setMutationError(null);
    setModal({ mode: "edit", unitId: record.unitId, detail: null });
    setDetailLoading(true);
    try {
      const detail = await unitService.getById(record.unitId);
      setModal({ mode: "edit", unitId: record.unitId, detail });
    } catch (err) {
      // Fallback
      setModal({
        mode: "edit",
        unitId: record.unitId,
        detail: {
          unitId: record.unitId,
          name: record.name,
          category: record.category,
          conversion: 1,
          currentValue: record.currentValue,
          parentId: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      });
    } finally {
      setDetailLoading(false);
    }
  }, [showToast]);

  // ─── Derived: current edit data ──────────────────────────────────────────────

  const editDetail = modal.mode === "edit" ? modal.detail : null;
  const editingId = modal.mode === "edit" ? modal.unitId : null;

  // ─── Save (create or update) ─────────────────────────────────────────────────

  const handleSave = useCallback(
    async (form: UnitFormState) => {
      setSaving(true);
      setMutationError(null);

      // ── Client-side uniqueness check ──────────────────────────────────────────
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
        await fetchUnits(); // refresh list
      } catch (err: any) {
        // More robust error extraction
        const apiMsg = err.response?.data?.message || err.response?.data?.errors?.[0]?.message;
        const msg = apiMsg || (err instanceof Error ? err.message : "Save failed.");
        setMutationError(msg);
        showToast(msg, "error");
      } finally {
        setSaving(false);
      }
    },
    [modal, closeModal, fetchUnits, showToast, units]
  );

  // ─── Delete Flow ─────────────────────────────────────────────────────────────

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
  
      // Optimistic UI update
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
  }, [deleteCandidate, modal, closeModal, fetchUnits]);

  // ─── Filtered list ────────────────────────────────────────────────────────────

  const filteredUnits = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return units;

    return units.filter((u) =>
      [u.name, u.category].some((v) => v.toLowerCase().includes(query))
    );
  }, [units, search]);

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
