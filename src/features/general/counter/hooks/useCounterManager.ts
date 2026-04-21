import { useEffect, useMemo, useState } from "react";
import { useToast } from "../../../../app/providers/useToast";
import { branchApi } from "../../../inventory/branches/services/branchApi";
import type { BranchRecord } from "../../../inventory/branches/types";
import { emptyCounterForm } from "../constants";
import { counterService } from "../services/counterService";
import type { CounterForm, CounterRecord } from "../types";

export const useCounterManager = () => {
  const { showToast } = useToast();
  const [records, setRecords] = useState<CounterRecord[]>([]);
  const [form, setForm] = useState<CounterForm>(emptyCounterForm);
  const [branches, setBranches] = useState<BranchRecord[]>([]);
  
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [counterList, branchList] = await Promise.all([
        counterService.list(),
        branchApi.fetchBranchNames(true),
      ]);
      
      setRecords(counterList as CounterRecord[]);
      // Filter out BranchId: 1 (typically "All") as per user request
      setBranches(branchList.filter(b => b.id !== 1));
    } catch (error) {
      showToast("Failed to load counter data", "error");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

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

  const handleSave = async () => {
    const name = form.name.trim();
    const branchId = Number(form.branchId);

    if (!name) {
      showToast("Counter name is required", "error");
      return;
    }
    if (!branchId) {
      showToast("Please select a branch", "error");
      return;
    }

    try {
      setSaving(true);
      const payload = {
        counterName: name,
        branchId: branchId,
      };

      if (editingId) {
        await counterService.update(editingId, payload);
        showToast("Counter updated successfully", "success");
      } else {
        await counterService.create(payload);
        showToast("Counter created successfully", "success");
      }

      await fetchData(); // Refresh list
      closeModal();
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Failed to save counter";
      showToast(msg, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async (record: CounterRecord) => {
    try {
      setLoading(true);
      const detail = await counterService.getById(record.counterId);
      
      setEditingId(detail.counterId);
      setForm({
        name: detail.counterName,
        branchId: String(detail.branchId),
      });
      setOpen(true);
    } catch (error) {
      showToast("Failed to load counter details", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (record: CounterRecord) => {
    try {
      setSaving(true);
      await counterService.remove(record.counterId);
      showToast("Counter deleted successfully", "success");
      await fetchData();
    } catch (error) {
      showToast("Failed to delete counter", "error");
    } finally {
      setSaving(false);
    }
  };

  const filteredRecords = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return records;

    return records.filter((item) =>
      [item.counterName, item.branch].some((value) => 
        String(value ?? "").toLowerCase().includes(query)
      )
    );
  }, [records, search]);

  return {
    form,
    branches,
    open,
    search,
    editingId,
    loading,
    saving,
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
