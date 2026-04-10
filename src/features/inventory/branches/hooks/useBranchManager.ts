import { useEffect, useMemo, useState } from "react";
import { useToast } from "../../../../app/providers/useToast";
import { createBranch, fetchBranchNames, updateBranch } from "../services/branchApi";
import type { BranchPayload, BranchRecord } from "../types";

export const useBranchManager = () => {
  const { showToast } = useToast();
  const [branches, setBranches] = useState<BranchRecord[]>([]);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<BranchRecord | null>(null);
  const [loading, setLoading] = useState(true);

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
            const detailedRecord = detailedRecords.get(record.id);
            return detailedRecord
              ? { ...detailedRecord, branchName: record.branchName }
              : record;
          });
        });
      } catch (error) {
        if (!active) return;

        const message = error instanceof Error ? error.message : "Failed to load branches";
        showToast(message, "error");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void loadBranches();

    return () => {
      active = false;
    };
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

  const handleEdit = (record: BranchRecord) => {
    if (!record.detailsLoaded) {
      showToast(
        "Branch details are not available from the current API. Add a branch details endpoint to edit saved records safely.",
        "error"
      );
      return;
    }

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
    handleSave,
    handleEdit,
    openCreateModal,
    closeModal,
    filteredBranches,
    loading,
  };
};
