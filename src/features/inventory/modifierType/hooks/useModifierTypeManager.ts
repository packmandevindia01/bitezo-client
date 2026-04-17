import { useCallback, useEffect, useMemo, useState } from "react";
import { useToast } from "../../../../app/providers/useToast";
import { modifierTypeService } from "../services/modifierTypeService";
import { emptyModifierTypeForm } from "../constants";
import type { ModifierTypeForm, ModifierTypeRecord } from "../types";

export const useModifierTypeManager = () => {
  const { showToast } = useToast();
  const [records, setRecords] = useState<ModifierTypeRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [form, setForm] = useState<ModifierTypeForm>(emptyModifierTypeForm);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [open, setOpen] = useState(false);

  const fetchTypes = useCallback(async () => {
    setLoading(true);
    try {
      const data = await modifierTypeService.list();
      setRecords(data);
    } catch (err: any) {
      showToast(err.message || "Failed to load modifier types", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchTypes();
  }, [fetchTypes]);

  const setField = <K extends keyof ModifierTypeForm>(key: K, value: ModifierTypeForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const resetForm = () => {
    setForm(emptyModifierTypeForm);
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
        await modifierTypeService.update(editingId, {
          typeId: editingId,
          name: name,
          arabicName: (form.arabicName || "").trim(),
          updatedAt: new Date().toISOString(),
        });
        showToast("Modifier type updated successfully", "success");
      } else {
        await modifierTypeService.create({
          name: name,
          arabicName: (form.arabicName || "").trim(),
          createdAt: new Date().toISOString(),
        });
        showToast("Modifier type created successfully", "success");
      }
      fetchTypes();
      closeModal();
    } catch (err: any) {
      showToast(err.message || "Failed to save modifier type", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async (record: ModifierTypeRecord) => {
    setLoading(true);
    setOpen(true);
    setEditingId(record.typeId);
    try {
      const fullRecord = await modifierTypeService.getById(record.typeId);
      setForm({
        name: fullRecord.name || "",
        arabicName: fullRecord.arabicName || "",
      });
    } catch (err: any) {
      setForm({
        name: record.name,
        arabicName: record.arabicName || "",
      });
      showToast("Could not load full record details, using basic info.", "warning");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (record: ModifierTypeRecord) => {
    try {
      await modifierTypeService.remove(record.typeId);
      showToast("Modifier type deleted successfully", "success");
      fetchTypes();
    } catch (err: any) {
      showToast(err.message || "Failed to delete modifier type", "error");
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
  };
};
