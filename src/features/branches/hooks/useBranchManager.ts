import { useMemo, useState } from "react";
import { initialBranches } from "../constants";
import type { BranchPayload, BranchRecord } from "../types";

export const useBranchManager = () => {
  const [branches, setBranches] = useState(initialBranches);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<BranchRecord | null>(null);

  const handleSave = (payload: BranchPayload) => {
    if (editingBranch) {
      setBranches((prev) =>
        prev.map((item) => (item.id === editingBranch.id ? { ...item, ...payload } : item))
      );
    } else {
      setBranches((prev) => [...prev, { id: Date.now(), ...payload }]);
    }

    setOpen(false);
    setEditingBranch(null);
  };

  const handleEdit = (record: BranchRecord) => {
    setEditingBranch(record);
    setOpen(true);
  };

  const handleDelete = (id: number) => {
    setBranches((prev) => prev.filter((item) => item.id !== id));
    if (editingBranch?.id === id) {
      setEditingBranch(null);
      setOpen(false);
    }
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
    handleDelete,
    openCreateModal,
    closeModal,
    filteredBranches,
  };
};
