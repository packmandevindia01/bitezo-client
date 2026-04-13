import { useEffect, useMemo, useState } from "react";
import { useToast } from "../../../../app/providers/useToast";
import { createBranch, deleteBranch, fetchBranchNames, updateBranch } from "../services/branchApi";
import type { BranchPayload, BranchRecord } from "../types";

export const useBranchManager = () => {
  const { showToast } = useToast();
  const [branches, setBranches] = useState<BranchRecord[]>([]);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<BranchRecord | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<BranchRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let active = true;

    const loadBranches = async () => {
      setLoading(true);
      try {
        const records = await fetchBranchNames();
        if (!active) return;

        setBranches((prev) => {
          const detailedRecords = new Map(
            prev.filter((item) => item.detailsLoaded).map((item) => [item.id, item])
          );
          return records.map((record) => {
            const detailed = detailedRecords.get(record.id);
            return detailed ? { ...detailed, branchName: record.branchName } : record;
          });
        });
      } catch (error) {
        if (!active) return;
        const message = error instanceof Error ? error.message : "Failed to load branches";
        showToast(message, "error");
      } finally {
        if (active) setLoading(false);
      }
    };

    void loadBranches();
    return () => { active = false; };
  }, [showToast]);

  const handleSave = async (payload: BranchPayload) => {
    if (editingBranch) {
      const updatedRecord = await updateBranch(editingBranch.id, payload);
      setBranches((prev) =>
        prev.map((item) => (item.id === editingBranch.id ? updatedRecord : item))
      );
      showToast("Branch updated successfully", "success");
    } else {
      const createdRecord = await createBranch(payload);
      setBranches((prev) => [...prev, createdRecord]);
      showToast("Branch created successfully", "success");
    }
    setOpen(false);
    setEditingBranch(null);
  };

  const handleDelete = async () => {
    if (!deleteCandidate) return;
    try {
      setDeleting(true);
      await deleteBranch(deleteCandidate.id);
      setBranches((prev) => prev.filter((item) => item.id !== deleteCandidate.id));
      showToast("Branch deleted successfully", "success");
      setDeleteCandidate(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete branch";
      showToast(message, "error");
    } finally {
      setDeleting(false);
    }
  };

  const handleEdit = (record: BranchRecord) => {
    setEditingBranch(record);
    setOpen(true);
  };

  const openCreateModal = () => {
    setEditingBranch(null);
    setOpen(true);
  };

  const closeModal = () => {
    setOpen(false);
    setEditingBranch(null);
  };

  const filteredBranches = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return branches;
    return branches.filter((item) => item.branchName.toLowerCase().includes(query));
  }, [branches, search]);

  return {
    search,
    setSearch,
    open,
    editingBranch,
    deleteCandidate,
    setDeleteCandidate,
    deleting,
    handleSave,
    handleEdit,
    handleDelete,
    openCreateModal,
    closeModal,
    filteredBranches,
    loading,
  };
};