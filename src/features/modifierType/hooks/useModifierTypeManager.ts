import { useMemo, useState } from "react";
import { emptyModifierTypeForm, initialModifierTypes } from "../constants";
import type { ModifierTypeForm, ModifierTypeRecord } from "../types";

const normalizeModifierTypeForm = (form: ModifierTypeForm): ModifierTypeForm => ({
  name: form.name.trim(),
  arabic: form.arabic.trim(),
});

export const useModifierTypeManager = () => {
  const [records, setRecords] = useState<ModifierTypeRecord[]>(initialModifierTypes);
  const [form, setForm] = useState<ModifierTypeForm>(emptyModifierTypeForm);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [open, setOpen] = useState(false);

  const setField = <K extends keyof ModifierTypeForm>(key: K, value: ModifierTypeForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const resetForm = () => {
    setForm(emptyModifierTypeForm);
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
    if (!form.name.trim()) {
      return;
    }

    const payload = normalizeModifierTypeForm(form);

    if (editingId) {
      setRecords((prev) =>
        prev.map((item) => (item.id === editingId ? { ...item, ...payload } : item))
      );
    } else {
      setRecords((prev) => [...prev, { id: Date.now(), ...payload }]);
    }

    closeModal();
  };

  const handleEdit = (record: ModifierTypeRecord) => {
    setEditingId(record.id);
    setForm({
      name: record.name,
      arabic: record.arabic,
    });
    setOpen(true);
  };

  const handleDelete = (record: ModifierTypeRecord) => {
    setRecords((prev) => prev.filter((item) => item.id !== record.id));
    if (editingId === record.id) {
      resetForm();
    }
  };

  const filteredRecords = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return records;
    }

    return records.filter((item) =>
      [item.name, item.arabic].some((value) => value.toLowerCase().includes(query))
    );
  }, [records, search]);

  return {
    form,
    open,
    search,
    editingId,
    filteredRecords,
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
