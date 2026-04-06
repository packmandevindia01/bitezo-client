import { useMemo, useState } from "react";
import { createEmptyPaymodeForm, initialPaymodes } from "../constants";
import type { PaymodeForm, PaymodeRecord } from "../types";

export const usePaymodeManager = () => {
  const [records, setRecords] = useState<PaymodeRecord[]>(initialPaymodes);
  const [form, setForm] = useState<PaymodeForm>(createEmptyPaymodeForm(initialPaymodes.length + 1));
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [open, setOpen] = useState(false);

  const getNextId = (items = records) =>
    items.length === 0 ? 1 : Math.max(...items.map((item) => item.id)) + 1;

  const setField = <K extends keyof PaymodeForm>(key: K, value: PaymodeForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const resetForm = () => {
    setForm(createEmptyPaymodeForm(getNextId()));
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
    if (!form.paymode.trim() || !form.branch.trim() || !form.counter.trim()) {
      return;
    }

    const payload = {
      paymode: form.paymode.trim(),
      branch: form.branch.trim(),
      counter: form.counter.trim(),
    };

    if (editingId) {
      const nextRecords = records.map((item) =>
        item.id === editingId ? { ...item, ...payload } : item,
      );
      setRecords(nextRecords);
      setForm(createEmptyPaymodeForm(getNextId(nextRecords)));
    } else {
      const nextRecord = { id: getNextId(), ...payload };
      const nextRecords = [...records, nextRecord];
      setRecords(nextRecords);
      setForm(createEmptyPaymodeForm(getNextId(nextRecords)));
    }

    setEditingId(null);
    setOpen(false);
  };

  const handleEdit = (record: PaymodeRecord) => {
    setEditingId(record.id);
    setForm({
      id: String(record.id),
      paymode: record.paymode,
      branch: record.branch,
      counter: record.counter,
    });
    setOpen(true);
  };

  const handleDelete = (record: PaymodeRecord) => {
    const nextRecords = records.filter((item) => item.id !== record.id);
    setRecords(nextRecords);
    if (editingId === record.id) {
      setEditingId(null);
      setForm(createEmptyPaymodeForm(getNextId(nextRecords)));
    }
  };

  const filteredRecords = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return records;
    }

    return records.filter((item) =>
      [String(item.id), item.paymode, item.branch, item.counter].some((value) =>
        value.toLowerCase().includes(query),
      ),
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
