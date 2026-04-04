import { useMemo, useState } from "react";
import { emptyVoucherSeriesForm, initialVoucherSeries } from "../constants";
import type { VoucherSeriesForm, VoucherSeriesRecord } from "../types";

const normalizeVoucherSeriesForm = (form: VoucherSeriesForm): VoucherSeriesForm => ({
  voucherType: form.voucherType.trim(),
  name: form.name.trim(),
  prefix: form.prefix.trim().toUpperCase(),
  startNo: form.startNo.trim() || "1",
  branch: form.branch.trim(),
});

export const useVoucherSeriesManager = () => {
  const [records, setRecords] = useState<VoucherSeriesRecord[]>(initialVoucherSeries);
  const [form, setForm] = useState<VoucherSeriesForm>(emptyVoucherSeriesForm);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [open, setOpen] = useState(false);

  const setField = <K extends keyof VoucherSeriesForm>(key: K, value: VoucherSeriesForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const resetForm = () => {
    setForm(emptyVoucherSeriesForm);
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
    if (!form.voucherType || !form.name.trim() || !form.branch) {
      return;
    }

    const payload = normalizeVoucherSeriesForm(form);

    if (editingId) {
      setRecords((prev) =>
        prev.map((item) => (item.id === editingId ? { ...item, ...payload } : item))
      );
    } else {
      setRecords((prev) => [...prev, { id: Date.now(), ...payload }]);
    }

    closeModal();
  };

  const handleEdit = (record: VoucherSeriesRecord) => {
    setEditingId(record.id);
    setForm({
      voucherType: record.voucherType,
      name: record.name,
      prefix: record.prefix,
      startNo: record.startNo,
      branch: record.branch,
    });
    setOpen(true);
  };

  const handleDelete = (record: VoucherSeriesRecord) => {
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
      [item.voucherType, item.name, item.prefix, item.startNo, item.branch].some((value) =>
        value.toLowerCase().includes(query)
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
