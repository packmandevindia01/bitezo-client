import { useCallback, useEffect, useMemo, useState } from "react";
import { useToast } from "../../../../app/providers/useToast";
import { extrasTypeService } from "../services/extrasTypeService";
import type { ExtrasTypeForm, ExtrasTypeRecord } from "../types";

const emptyForm: ExtrasTypeForm = {
  name: "",
  arabicName: "",
};

export const useExtrasTypeManager = () => {
  const { showToast } = useToast();
  const [records, setRecords] = useState<ExtrasTypeRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [form, setForm] = useState<ExtrasTypeForm>(emptyForm);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [open, setOpen] = useState(false);

  const fetchTypes = useCallback(async () => {
    setLoading(true);
    try {
      const data = await extrasTypeService.list();
      setRecords(data);
    } catch (err: any) {
      showToast(err.message || "Failed to load extras types", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchTypes();
  }, [fetchTypes]);

  const setField = <K extends keyof ExtrasTypeForm>(key: K, value: ExtrasTypeForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const resetForm = () => {
    setForm(emptyForm);
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
    const name = (form.name || "").trim();
    if (!name) {
      showToast("Name is required", "warning");
      return;
    }

    setSaving(true);
    try {
      if (editingId) {
        await extrasTypeService.update(editingId, {
          name: name,
          arabicName: (form.arabicName || "").trim(),
          updatedAt: new Date().toISOString(),
        });
        showToast("Extras type updated successfully", "success");
      } else {
        await extrasTypeService.create({
          name: name,
          arabicName: (form.arabicName || "").trim(),
          createdAt: new Date().toISOString(),
        });
        showToast("Extras type created successfully", "success");
      }
      fetchTypes();
      closeModal();
    } catch (err: any) {
      showToast(err.message || "Failed to save extras type", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async (record: ExtrasTypeRecord) => {
    setLoading(true);
    setOpen(true);
    setEditingId(record.typeId);
    try {
      // Fetch full detail to ensure we have arabicName and other fields not in the list
      const fullRecord = await extrasTypeService.getById(record.typeId);
      setForm({
        name: fullRecord.name || "",
        arabicName: fullRecord.arabicName || "",
      });
    } catch (err: any) {
      // Fallback to list data if detail fetch fails
      setForm({
        name: record.name,
        arabicName: record.arabicName || "",
      });
      showToast("Could not load full record details, using basic info.", "warning");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (record: ExtrasTypeRecord) => {
    try {
      await extrasTypeService.remove(record.typeId);
      showToast("Extras type deleted successfully", "success");
      fetchTypes();
    } catch (err: any) {
      showToast(err.message || "Failed to delete extras type", "error");
    }
  };

  const filteredRecords = useMemo(() => {
    const query = (search || "").trim().toLowerCase();
    if (!query) return records;

    return records.filter((item) =>
      [(item.name || ""), (item.arabicName || "")].some((value) => 
        (value || "").toLowerCase().includes(query)
      )
    );
  }, [records, search]);

  return {
    form,
    loading,
    saving,
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
    fetchTypes,
  };
};
