import { useState } from "react";
import { emptyModifierForm } from "../constants";
import type { ModifierForm } from "../types";

export const useModifierFormState = () => {
  const [form, setForm] = useState<ModifierForm>(emptyModifierForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [branchAllocOpen, setBranchAllocOpen] = useState(false);
  const [categoryAllocOpen, setCategoryAllocOpen] = useState(false);

  const setField = <K extends keyof ModifierForm>(key: K, value: ModifierForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const toggleBranch = (branchId: number) => {
    setForm((prev) => {
      const exists = prev.branchIds.includes(branchId);
      if (exists) {
        return { ...prev, branchIds: prev.branchIds.filter((id) => id !== branchId) };
      }
      return { ...prev, branchIds: [...prev.branchIds, branchId] };
    });
  };

  const toggleCategory = (categoryId: number) => {
    setForm((prev) => {
      const exists = prev.categoryIds.includes(categoryId);
      if (exists) {
        return { ...prev, categoryIds: prev.categoryIds.filter((id) => id !== categoryId) };
      }
      return { ...prev, categoryIds: [...prev.categoryIds, categoryId] };
    });
  };

  const resetForm = () => {
    setForm(emptyModifierForm);
    setEditingId(null);
    setBranchAllocOpen(false);
    setCategoryAllocOpen(false);
  };

  const closeModal = () => {
    setOpen(false);
    resetForm();
  };

  const openCreateModal = () => {
    resetForm();
    setOpen(true);
  };

  return {
    form,
    setForm,
    editingId,
    setEditingId,
    open,
    setOpen,
    branchAllocOpen,
    setBranchAllocOpen,
    categoryAllocOpen,
    setCategoryAllocOpen,
    setField,
    toggleBranch,
    toggleCategory,
    resetForm,
    closeModal,
    openCreateModal,
  };
};
