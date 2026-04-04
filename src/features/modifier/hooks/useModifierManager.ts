import { useMemo, useState } from "react";
import { emptyModifierForm, initialModifiers } from "../constants";
import type { ModifierForm, ModifierRecord } from "../types";

const normalizeModifierForm = (form: ModifierForm): ModifierForm => ({
  category: form.category.trim(),
  name: form.name.trim(),
  arabic: form.arabic.trim(),
  color: form.color.trim(),
  branch: form.branch.trim(),
  isMultiCategory: form.isMultiCategory,
});

export const useModifierManager = () => {
  const [modifiers, setModifiers] = useState<ModifierRecord[]>(initialModifiers);
  const [form, setForm] = useState<ModifierForm>(emptyModifierForm);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [open, setOpen] = useState(false);

  const setField = <K extends keyof ModifierForm>(key: K, value: ModifierForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const resetForm = () => {
    setForm(emptyModifierForm);
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

  const handleSave = () => {
    if (!form.category || !form.name || !form.branch) {
      return;
    }

    const payload = normalizeModifierForm(form);

    if (editingId) {
      setModifiers((prev) =>
        prev.map((item) => (item.id === editingId ? { ...item, ...payload } : item))
      );
    } else {
      setModifiers((prev) => [...prev, { id: Date.now(), ...payload }]);
    }

    closeModal();
  };

  const handleEdit = (record: ModifierRecord) => {
    setEditingId(record.id);
    setForm({
      category: record.category,
      name: record.name,
      arabic: record.arabic,
      color: record.color,
      branch: record.branch,
      isMultiCategory: record.isMultiCategory,
    });
    setOpen(true);
  };

  const handleDelete = (record: ModifierRecord) => {
    setModifiers((prev) => prev.filter((item) => item.id !== record.id));
    if (editingId === record.id) {
      resetForm();
    }
  };

  const filteredModifiers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return modifiers;

    return modifiers.filter((item) =>
      [item.category, item.name, item.arabic, item.color, item.branch].some((value) =>
        value.toLowerCase().includes(query)
      )
    );
  }, [modifiers, search]);

  return {
    form,
    open,
    search,
    editingId,
    filteredModifiers,
    setSearch,
    setField,
    resetForm,
    closeModal,
    openCreateModal,
    handleSave,
    handleEdit,
    handleDelete,
  };
};
