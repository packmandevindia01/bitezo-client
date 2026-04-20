import { useCallback, useEffect, useMemo, useState } from "react";
import { groupService } from "../services/groupService";
import { useToast } from "../../../../app/providers/useToast";
import type { GroupDetail, GroupForm, GroupRecord } from "../types";

// ─── Internal State ───────────────────────────────────────────────────────────

type ModalState =
  | { mode: "closed" }
  | { mode: "create" }
  | { mode: "edit"; grpId: number; detail: GroupDetail | null };

// ─── Hook ─────────────────────────────────────────────────────────────────────

export const useGroupManager = () => {
  // ── List state ──────────────────────────────────────────────────────────────
  const [groups, setGroups] = useState<GroupRecord[]>([]);
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
  const [deleting, setDeleting] = useState<number | null>(null); // grpId being deleted
  const [mutationError, setMutationError] = useState<string | null>(null);

  // ── Delete confirmation ──────────────────────────────────────────────────────
  const [deleteCandidate, setDeleteCandidate] = useState<{ grpId: number; name: string } | null>(null);

  // ─── Fetch list ─────────────────────────────────────────────────────────────

  const fetchGroups = useCallback(async () => {
    setListLoading(true);
    setListError(null);
    try {
      const data = await groupService.list();
      setGroups(data);
    } catch (err) {
      setListError(err instanceof Error ? err.message : "Failed to load groups.");
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  // ─── Modal helpers ───────────────────────────────────────────────────────────

  const closeModal = useCallback(() => {
    setModal({ mode: "closed" });
    setMutationError(null);
  }, []);

  const openCreateModal = useCallback(() => {
    setMutationError(null);
    setModal({ mode: "create" });
  }, []);

  const openEditModal = useCallback(async (record: GroupRecord) => {
    setMutationError(null);
    setModal({ mode: "edit", grpId: record.grpId, detail: null });
    setDetailLoading(true);
    try {
      const detail = await groupService.getById(record.grpId);
      setModal({ mode: "edit", grpId: record.grpId, detail });
    } catch (err) {
      // If detail fetch fails, fall back to list data so the modal isn't blank
      setModal({
        mode: "edit",
        grpId: record.grpId,
        detail: {
          grpId: record.grpId,
          code: record.code,
          name: record.name,
          arabicName: "",
          isActive: record.isActive === "Active",
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
  const editingId = modal.mode === "edit" ? modal.grpId : null;

  // ─── Save (create or update) ─────────────────────────────────────────────────

  const handleSave = useCallback(
    async (form: GroupForm) => {
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
          });
        } else {
          await groupService.create({
            code: form.code,
            name: form.name,
            arabicName: form.arabicName,
            isActive: form.isActive,
            createdAt: new Date().toISOString(),
          });
        }

        await fetchGroups(); // refresh list
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
    [modal, closeModal, fetchGroups]
  );

  // ─── Delete Flow ─────────────────────────────────────────────────────────────
  
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

      // Optimistic UI update: remove from list immediately
      setGroups((prev) => prev.filter((g) => g.grpId !== deleteCandidate.grpId));
      showToast("Group deleted successfully", "success");
      setDeleteCandidate(null);

      // If we were editing the deleted record, close the modal
      if (modal.mode === "edit" && modal.grpId === deleteCandidate.grpId) {
        closeModal();
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Delete failed.";
      setMutationError(message);
      showToast(message, "error");

      // Refresh list to restore correct server state
      await fetchGroups();
    } finally {
      setDeleting(null);
    }
  }, [deleteCandidate, modal, closeModal, fetchGroups]);

  // ─── Client-side search filter ────────────────────────────────────────────────

  const filteredGroups = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return groups;

    return groups.filter((g) =>
      [g.code, g.name].some((v) => v.toLowerCase().includes(query))
    );
  }, [groups, search]);

  // ─── Public API ───────────────────────────────────────────────────────────────

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