import { useMemo, useState } from "react";
import {
  emptySubCategoryForm,
  initialSubCategories,
  subCategoryOptions,
} from "../constants";
import type { SubCategoryRecord } from "../types";

export const useSubCategoryManager = () => {
  const [subCategories, setSubCategories] = useState(initialSubCategories);
  const [form, setForm] = useState(emptySubCategoryForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);

  const resetForm = () => {
    setForm(emptySubCategoryForm);
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
    if (!file) {
      setForm((prev) => ({ ...prev, image: "" }));
      return;
    }

    setForm((prev) => ({ ...prev, image: URL.createObjectURL(file) }));
  };

  const handleSave = () => {
    if (!form.code.trim() || !form.name.trim() || !form.categoryId) return;

    const selectedCategory = subCategoryOptions.find((item) => item.value === form.categoryId);
    if (!selectedCategory) return;

    const payload = {
      code: form.code.trim(),
      name: form.name.trim(),
      categoryId: form.categoryId,
      categoryName: selectedCategory.label,
      image: form.image,
    };

    if (editingId) {
      setSubCategories((prev) =>
        prev.map((item) => (item.id === editingId ? { ...item, ...payload } : item))
      );
    } else {
      setSubCategories((prev) => [...prev, { id: Date.now(), ...payload }]);
    }

    closeModal();
  };

  const handleEdit = (record: SubCategoryRecord) => {
    setEditingId(record.id);
    setForm({
      code: record.code,
      name: record.name,
      categoryId: record.categoryId,
      image: record.image ?? "",
    });
    setOpen(true);
  };

  const deleteById = (id: number) => {
    setSubCategories((prev) => prev.filter((item) => item.id !== id));
    if (editingId === id) {
      closeModal();
    }
  };

  const filteredSubCategories = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return subCategories;

    return subCategories.filter((item) =>
      [item.code, item.name, item.categoryName].some((value) =>
        value.toLowerCase().includes(query)
      )
    );
  }, [search, subCategories]);

  return {
    form,
    setForm,
    editingId,
    search,
    setSearch,
    open,
    resetForm,
    closeModal,
    openCreateModal,
    handleImageSelect,
    handleSave,
    handleEdit,
    deleteById,
    filteredSubCategories,
  };
};
