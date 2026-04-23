import { useEffect, useState } from "react";
import { useToast } from "../../../../app/providers/useToast";
import { modifierService } from "../services/modifierService";
import { useModifierList } from "./useModifierList";
import { useModifierFormState } from "./useModifierFormState";
import type { ModifierRecord } from "../types";

export const useModifierManager = () => {
  const { showToast } = useToast();
  
  // Compose specialized hooks
  const {
    records,
    modifierTypes,
    categories,
    loading,
    setLoading,
    search,
    setSearch,
    filteredModifiers,
    fetchModifiers,
    fetchTypesAndCats,
    branches,
  } = useModifierList();

  const {
    form,
    setForm,
    editingId,
    setEditingId,
    open,
    setOpen,
    branchAllocOpen,
    setBranchAllocOpen,
    categoryAllocOpen,
    setCategoryAllocOpen,
    setField,
    toggleBranch,
    toggleCategory,
    resetForm,
    closeModal,
    openCreateModal,
  } = useModifierFormState();

  // Async action flags
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      fetchTypesAndCats();
    }
  }, [open, fetchTypesAndCats]);

  const handleSave = async () => {
    const name = (form.name || "").trim();
    if (!name || !form.typeId) {
      showToast("Name and Type are required", "warning");
      return;
    }

    // Front-end Duplicate Check
    const isDuplicate = records.some(
      (r) => r.name.toLowerCase() === name.toLowerCase() && r.id !== editingId
    );
    if (isDuplicate) {
      showToast(`A modifier with the name "${name}" already exists.`, "error");
      return;
    }

    if (form.branchIds.length === 0) {
      showToast("Please allocate at least one branch", "warning");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: name,
        arabic: (form.arabic || "").trim(),
        color: form.color || "",
        typeId: parseInt(form.typeId),
        price: parseFloat(form.price) || 0,
        branchIds: form.branchIds,
        categoryIds: form.categoryIds, // Send the array as is (even if empty) instead of null
      };

      if (editingId) {
        await modifierService.update(editingId, {
          ...payload,
          id: editingId,
          updatedAt: new Date().toISOString(),
        });
        showToast("Modifier updated successfully", "success");
      } else {
        await modifierService.create({
          ...payload,
          createdAt: new Date().toISOString(),
        });
        showToast("Modifier created successfully", "success");
      }
      
      fetchModifiers();
      closeModal();
    } catch (err: any) {
      showToast(err.message || "Failed to save modifier", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async (record: ModifierRecord) => {
    setLoading(true);
    setOpen(true);
    setEditingId(record.id);
    try {
      const detail = await modifierService.getById(record.id);
      const mod = detail.modifier?.[0];
      const branchIds = (detail.branchIds || []).map((b: any) => b.id);
      const categoryIds = (detail.categoryIds || []).map((c: any) => c.id);

      if (mod) {
        setForm({
          name: mod.name || "",
          arabic: mod.arabic || "",
          color: mod.color && mod.color.trim() ? mod.color : "#cccccc",
          typeId: String(mod.typeId || ""),
          price: String(mod.price || "0"),
          branchIds: branchIds,
          categoryIds: categoryIds,
          category: "",
        });
      }
    } catch (err: any) {
      showToast("Failed to load details", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (record: ModifierRecord) => {
    try {
      await modifierService.remove(record.id);
      showToast("Modifier deleted successfully", "success");
      fetchModifiers();
    } catch (err: any) {
      showToast(err.message || "Failed to delete modifier", "error");
    }
  };

  return {
    form,
    loading,
    saving,
    open,
    search,
    editingId,
    filteredModifiers,
    branches,
    modifierTypes,
    categories,
    branchAllocOpen,
    categoryAllocOpen,
    setSearch,
    setField,
    toggleBranch,
    toggleCategory,
    setBranchAllocOpen,
    setCategoryAllocOpen,
    resetForm,
    closeModal,
    openCreateModal,
    handleSave,
    handleEdit,
    handleDelete,
  };
};
