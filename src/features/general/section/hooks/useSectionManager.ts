import { useEffect, useMemo, useState } from "react";
import { useToast } from "../../../../app/providers/useToast";
import { counterService } from "../../counter/services/counterService";
import type { CounterRecord } from "../../counter/types";
import { emptySectionForm } from "../constants";
import { sectionService } from "../services/sectionService";
import type { SectionForm, SectionRecord } from "../types";

export const useSectionManager = () => {
  const { showToast } = useToast();
  const [records, setRecords] = useState<SectionRecord[]>([]);
  const [form, setForm] = useState<SectionForm>(emptySectionForm);
  const [counters, setCounters] = useState<CounterRecord[]>([]);

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
      const [sectionList, counterList] = await Promise.all([
        sectionService.list(),
        counterService.list(),
      ]);

      setRecords(sectionList as SectionRecord[]);
      setCounters(counterList as CounterRecord[]);
    } catch (error) {
      showToast("Failed to load section data", "error");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

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

  const handleSave = async () => {
    const sName = form.name.trim();
    const counterId = Number(form.counterId);

    if (!sName) {
      showToast("Section name is required", "error");
      return;
    }
    if (!counterId) {
      showToast("Please select a counter", "error");
      return;
    }

    try {
      setSaving(true);
      const payload = {
        sectionName: sName,
        counterId: counterId,
      };

      if (editingId) {
        await sectionService.update(editingId, payload);
        showToast("Section updated successfully", "success");
      } else {
        await sectionService.create(payload);
        showToast("Section created successfully", "success");
      }

      await fetchData(); // Refresh list
      closeModal();
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Failed to save section";
      showToast(msg, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async (record: SectionRecord) => {
    try {
      setLoading(true);
      const detail = await sectionService.getById(record.sectionId);

      setEditingId(detail.sectionId);
      setForm({
        name: detail.sectionName,
        counterId: String(detail.counterId),
      });
      setOpen(true);
    } catch (error) {
      showToast("Failed to load section details", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (record: SectionRecord) => {
    try {
      setSaving(true);
      await sectionService.remove(record.sectionId);
      showToast("Section deleted successfully", "success");
      await fetchData();
    } catch (error) {
      showToast("Failed to delete section", "error");
    } finally {
      setSaving(false);
    }
  };

  const filteredRecords = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return records;

    return records.filter((item) =>
      [item.name, item.counter].some((value) =>
        String(value ?? "").toLowerCase().includes(query)
      )
    );
  }, [records, search]);

  return {
    form,
    counters,
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
