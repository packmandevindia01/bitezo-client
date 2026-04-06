import { useMemo, useState } from "react";
import { emptyCounterForm, initialCounters } from "../constants";
import type { CounterForm, CounterRecord } from "../types";

export const useCounterManager = () => {
  const [records, setRecords] = useState<CounterRecord[]>(initialCounters);
  const [form, setForm] = useState<CounterForm>(emptyCounterForm);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [open, setOpen] = useState(false);

  const setField = <K extends keyof CounterForm>(key: K, value: CounterForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const resetForm = () => {
    setForm(emptyCounterForm);
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
    if (!form.name.trim() || !form.branch.trim()) {
      return;
    }

    const payload = {
      name: form.name.trim(),
      branch: form.branch.trim(),
    };

    if (editingId) {
      setRecords((prev) =>
        prev.map((item) => (item.id === editingId ? { ...item, ...payload } : item)),
      );
    } else {
      setRecords((prev) => [...prev, { id: Date.now(), ...payload }]);
    }

    closeModal();
  };

  const handleEdit = (record: CounterRecord) => {
    setEditingId(record.id);
    setForm({
      name: record.name,
      branch: record.branch,
    });
    setOpen(true);
  };

  const handleDelete = (record: CounterRecord) => {
    setRecords((prev) => prev.filter((item) => item.id !== record.id));
    if (editingId === record.id) {
      closeModal();
    }
  };

  const filteredRecords = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return records;
    }

    return records.filter((item) =>
      [item.name, item.branch].some((value) => value.toLowerCase().includes(query)),
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
