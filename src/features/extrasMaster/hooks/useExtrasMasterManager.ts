import { useMemo, useState } from "react";
import { emptyExtrasMasterForm, initialExtrasMaster } from "../constants";
import type { ExtrasMasterForm, ExtrasMasterRecord } from "../types";

const normalizeExtrasMasterForm = (form: ExtrasMasterForm): ExtrasMasterForm => ({
  category: form.category.trim(),
  name: form.name.trim(),
  arabic: form.arabic.trim(),
  price: form.price.trim() || "0.000",
  type: form.type.trim(),
  color: form.color,
  branch: form.branch.trim(),
  isMultiCategory: form.isMultiCategory,
});

export const useExtrasMasterManager = () => {
  const [records, setRecords] = useState<ExtrasMasterRecord[]>(initialExtrasMaster);
  const [form, setForm] = useState<ExtrasMasterForm>(emptyExtrasMasterForm);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [open, setOpen] = useState(false);

  const setField = <K extends keyof ExtrasMasterForm>(key: K, value: ExtrasMasterForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const resetForm = () => {
    setForm(emptyExtrasMasterForm);
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
    if (!form.category || !form.name.trim() || !form.type || !form.branch) {
      return;
    }

    const payload = normalizeExtrasMasterForm(form);

    if (editingId) {
      setRecords((prev) =>
        prev.map((item) => (item.id === editingId ? { ...item, ...payload } : item))
      );
    } else {
      setRecords((prev) => [...prev, { id: Date.now(), ...payload }]);
    }

    closeModal();
  };

  const handleEdit = (record: ExtrasMasterRecord) => {
    setEditingId(record.id);
    setForm({
      category: record.category,
      name: record.name,
      arabic: record.arabic,
      price: record.price,
      type: record.type,
      color: record.color,
      branch: record.branch,
      isMultiCategory: record.isMultiCategory,
    });
    setOpen(true);
  };

  const handleDelete = (record: ExtrasMasterRecord) => {
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
      [item.category, item.name, item.arabic, item.price, item.type, item.color, item.branch].some(
        (value) => value.toLowerCase().includes(query)
      )
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
