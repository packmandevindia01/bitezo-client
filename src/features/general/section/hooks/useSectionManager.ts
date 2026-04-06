import { useMemo, useState } from "react";
import { emptySectionForm, initialSections } from "../constants";
import type { SectionForm, SectionRecord } from "../types";

export const useSectionManager = () => {
  const [records, setRecords] = useState<SectionRecord[]>(initialSections);
  const [form, setForm] = useState<SectionForm>(emptySectionForm);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [open, setOpen] = useState(false);

  const setField = <K extends keyof SectionForm>(key: K, value: SectionForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const resetForm = () => {
    setForm(emptySectionForm);
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
    if (!form.name.trim() || !form.counter.trim()) {
      return;
    }

    const payload = {
      name: form.name.trim(),
      counter: form.counter.trim(),
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

  const handleEdit = (record: SectionRecord) => {
    setEditingId(record.id);
    setForm({
      name: record.name,
      counter: record.counter,
    });
    setOpen(true);
  };

  const handleDelete = (record: SectionRecord) => {
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
      [item.name, item.counter].some((value) => value.toLowerCase().includes(query)),
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
