import { useEffect, useMemo, useState } from "react";
import { createEmptyPaymodeForm } from "../constants";
import type { CounterOption, PaymodeForm, PaymodeRecord } from "../types";
import { paymodeService } from "../services/paymodeService";
import { counterService } from "../../counter/services/counterService";
import { useToast } from "../../../../app/providers/useToast";

export const usePaymodeManager = () => {
  const { showToast } = useToast();
  const [records, setRecords] = useState<PaymodeRecord[]>([]);
  const [form, setForm] = useState<PaymodeForm>(createEmptyPaymodeForm());
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [counterOptions, setCounterOptions] = useState<CounterOption[]>([]);
  const [counterAllocOpen, setCounterAllocOpen] = useState(false);

  useEffect(() => {
    fetchRecords();
    fetchCounters();
  }, []);

  const fetchRecords = async () => {
    try {
      setLoading(true);
      const data = await paymodeService.list();
      setRecords(data);
    } catch (error: any) {
      showToast(error.message || "Failed to fetch paymodes", "error");
    } finally {
      setLoading(false);
    }
  };


  const fetchCounters = async () => {
    try {
      const data = await counterService.list();
      setCounterOptions(data.map((c: any) => ({
        counterId: c.counterId,
        counterName: c.counterName
      })));
    } catch (error: any) {
      console.error("Failed to fetch counters", error);
    }
  };

  const setField = (patch: Partial<PaymodeForm>) => {
    setForm((prev) => ({ ...prev, ...patch }));
  };

  const toggleCounterSelection = (counterId: number) => {
    setForm(prev => {
      const ids = prev.counterIds.includes(counterId)
        ? prev.counterIds.filter(id => id !== counterId)
        : [...prev.counterIds, counterId];
      return { ...prev, counterIds: ids };
    });
  };

  const resetForm = () => {
    setForm(createEmptyPaymodeForm());
    setEditingId(null);
    setCounterAllocOpen(false);
  };

  const closeModal = () => {
    setOpen(false);
    resetForm();
  };

  const openCreateModal = () => {
    resetForm();
    setOpen(true);
  };

  const handleSave = async () => {
    if (!form.paymodeName.trim()) {
      showToast("Paymode name is required", "error");
      return;
    }

    const payload = {
      ...form,
      code: Number(form.code) || 0
    };

    try {
      setSaving(true);
      if (editingId) {
        await paymodeService.update(editingId, payload);
        showToast("Paymode updated successfully", "success");
      } else {
        await paymodeService.create(payload);
        showToast("Paymode created successfully", "success");
      }
      fetchRecords();
      closeModal();
    } catch (error: any) {
      showToast(error.message || "Failed to save paymode", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async (record: PaymodeRecord) => {
    try {
      setLoading(true);
      const detail = await paymodeService.getById(record.paymodeId);
      const p = detail.paymode[0];
      setEditingId(p.paymodeId);
      setForm({
        paymodeId: p.paymodeId,
        code: String(p.code),
        paymodeName: p.paymodeName,
        isActive: p.isActive,
        counterIds: detail.counter.map(c => c.counterId)
      });

      setOpen(true);
    } catch (error: any) {
      showToast(error.message || "Failed to fetch paymode details", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (paymodeId: number) => {
    try {
      setLoading(true);
      await paymodeService.remove(paymodeId);
      showToast("Paymode deleted successfully", "success");
      fetchRecords();
      if (editingId === paymodeId) {
        closeModal();
      }
    } catch (error: any) {
      showToast(error.message || "Failed to delete paymode", "error");
    } finally {
      setLoading(false);
    }
  };


  const filteredRecords = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return records;

    return records.filter((item) =>
      [String(item.paymodeId), item.paymodeName, String(item.code)].some((value) =>
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
    loading,
    saving,
    counterOptions,
    counterAllocOpen,
    setCounterAllocOpen,
    setSearch,
    setField,
    toggleCounterSelection,
    resetForm,
    closeModal,
    openCreateModal,
    handleSave,
    handleEdit,
    handleDelete,
  };
};

