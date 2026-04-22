import { useState } from "react";
import { emptyForm } from "../constants";
import type { SubCategoryFormState } from "../types";

export const useSubCategoryFormState = () => {
  const [form, setForm] = useState<SubCategoryFormState>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [open, setOpen] = useState(false);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
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
    setForm((prev) => ({
      ...prev,
      image: file ? URL.createObjectURL(file) : "",
    }));
  };

  return {
    form,
    setForm,
    editingId,
    setEditingId,
    open,
    setOpen,
    resetForm,
    closeModal,
    openCreateModal,
    handleImageSelect,
  };
};
