import { useMemo, useState } from "react";
import { categoryBranchOptions, emptyCategoryForm, initialCategories } from "../constants";
import type { CategoryRecord } from "../types";

export const useCategoryManager = () => {
  const [categories, setCategories] = useState(initialCategories);
  const [form, setForm] = useState(emptyCategoryForm);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [branchAllocOpen, setBranchAllocOpen] = useState(false);
  const [selectedBranches, setSelectedBranches] = useState<string[]>([]);
  const [open, setOpen] = useState(false);

  const resetForm = () => {
    setForm(emptyCategoryForm);
    setEditingId(null);
    setSelectedBranches([]);
    setBranchAllocOpen(false);
  };

  const closeModal = () => {
    setOpen(false);
    resetForm();
  };

  const openCreateModal = () => {
    resetForm();
    setOpen(true);
  };

  const handleImageSelect = (file: File | null) => {
    if (!file) {
      setForm((prev) => ({ ...prev, image: "" }));
      return;
    }

    setForm((prev) => ({ ...prev, image: URL.createObjectURL(file) }));
  };

  const handleSave = () => {
    if (!form.code.trim() || !form.name.trim()) return;

    const payload = {
      code: form.code.trim(),
      name: form.name.trim(),
      image: form.image,
      branches: selectedBranches,
    };

    if (editingId) {
      setCategories((prev) =>
        prev.map((item) => (item.id === editingId ? { ...item, ...payload } : item))
      );
    } else {
      setCategories((prev) => [...prev, { id: Date.now(), ...payload }]);
    }

    closeModal();
  };

  const handleEdit = (record: CategoryRecord) => {
    setEditingId(record.id);
    setForm({
      code: record.code,
      name: record.name,
      image: record.image ?? "",
    });
    setSelectedBranches(record.branches);
    setOpen(true);
  };

  const deleteById = (id: number) => {
    setCategories((prev) => prev.filter((item) => item.id !== id));
    if (editingId === id) {
      closeModal();
    }
  };

  const toggleBranch = (branch: string) => {
    setSelectedBranches((prev) =>
      prev.includes(branch) ? prev.filter((item) => item !== branch) : [...prev, branch]
    );
  };

  const filteredCategories = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return categories;

    return categories.filter((item) =>
      [item.code, item.name, item.branches.join(" "), ...categoryBranchOptions].some((value) =>
        value.toLowerCase().includes(query)
      )
    );
  }, [categories, search]);

  return {
    form,
    setForm,
    search,
    setSearch,
    editingId,
    branchAllocOpen,
    setBranchAllocOpen,
    selectedBranches,
    open,
    resetForm,
    closeModal,
    openCreateModal,
    handleImageSelect,
    handleSave,
    handleEdit,
    deleteById,
    toggleBranch,
    filteredCategories,
  };
};
