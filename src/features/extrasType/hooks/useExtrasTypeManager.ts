import { useMemo, useState } from "react";
import { emptyExtrasTypeForm, initialExtrasTypes } from "../constants";
import type { ExtrasTypeForm, ExtrasTypeRecord } from "../types";

const normalizeExtrasTypeForm = (form: ExtrasTypeForm): ExtrasTypeForm => ({
  name: form.name.trim(),
  arabic: form.arabic.trim(),
});

export const useExtrasTypeManager = () => {
  const [records, setRecords] = useState<ExtrasTypeRecord[]>(initialExtrasTypes);
  const [form, setForm] = useState<ExtrasTypeForm>(emptyExtrasTypeForm);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [open, setOpen] = useState(false);

  const setField = <K extends keyof ExtrasTypeForm>(key: K, value: ExtrasTypeForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const resetForm = () => {
    setForm(emptyExtrasTypeForm);
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

    const payload = normalizeExtrasTypeForm(form);

    if (editingId) {
      setRecords((prev) =>
        prev.map((item) => (item.id === editingId ? { ...item, ...payload } : item))
      );
    } else {
      setRecords((prev) => [...prev, { id: Date.now(), ...payload }]);
    }

    closeModal();
  };

  const handleEdit = (record: ExtrasTypeRecord) => {
    setEditingId(record.id);
    setForm({
      name: record.name,
      arabic: record.arabic,
    });
    setOpen(true);
  };

  const handleDelete = (record: ExtrasTypeRecord) => {
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
