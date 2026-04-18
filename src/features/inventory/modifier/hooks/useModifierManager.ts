import { useCallback, useEffect, useMemo, useState } from "react";
import { useToast } from "../../../../app/providers/useToast";
import { modifierService } from "../services/modifierService";
import { modifierTypeService } from "../../modifierType/services/modifierTypeService";
import { getCategories } from "../../category/services/categoryService";
import { emptyModifierForm } from "../constants";
import type { ModifierForm, ModifierRecord } from "../types";
import type { ModifierTypeRecord } from "../../modifierType/types";
import type { CategoryListItem } from "../../category/types";
import { useAppDispatch, useAppSelector } from "../../../../app/hooks";
import { fetchGlobalMasterData } from "../../shared/store/masterDataSlice";

export const useModifierManager = () => {
  const { showToast } = useToast();
  const dispatch = useAppDispatch();
  const [records, setRecords] = useState<ModifierRecord[]>([]);
  const [modifierTypes, setModifierTypes] = useState<ModifierTypeRecord[]>([]);
  const [categories, setCategories] = useState<CategoryListItem[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [form, setForm] = useState<ModifierForm>(emptyModifierForm);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [branchAllocOpen, setBranchAllocOpen] = useState(false);
  const [categoryAllocOpen, setCategoryAllocOpen] = useState(false);

  // Get branches from global master data
  const { branches } = useAppSelector((state) => state.masterData);

  const fetchModifiers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await modifierService.list();
      setRecords(data);
    } catch (err: any) {
      showToast(err.message || "Failed to load modifiers", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  const fetchTypesAndCats = useCallback(async () => {
    try {
      const [types, cats] = await Promise.all([
        modifierTypeService.list(),
        getCategories()
      ]);
      setModifierTypes(types);
      setCategories(cats);
    } catch (err) {
      console.error("Failed to load types or categories", err);
    }
  }, []);

  useEffect(() => {
    fetchModifiers();
    // Ensure global branches are loaded
    if (branches.length === 0) {
      dispatch(fetchGlobalMasterData());
    }
  }, [fetchModifiers, dispatch, branches.length]);

  useEffect(() => {
    if (open) {
      fetchTypesAndCats();
    }
  }, [open, fetchTypesAndCats]);

  const setField = <K extends keyof ModifierForm>(key: K, value: ModifierForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const toggleBranch = (branchId: number) => {
    setForm((prev) => {
      const exists = prev.branchIds.includes(branchId);
      if (exists) {
        return { ...prev, branchIds: prev.branchIds.filter((id) => id !== branchId) };
      }
      return { ...prev, branchIds: [...prev.branchIds, branchId] };
    });
  };

  const toggleCategory = (categoryId: number) => {
    setForm((prev) => {
      const exists = prev.categoryIds.includes(categoryId);
      if (exists) {
        return { ...prev, categoryIds: prev.categoryIds.filter((id) => id !== categoryId) };
      }
      return { ...prev, categoryIds: [...prev.categoryIds, categoryId] };
    });
  };

  const resetForm = () => {
    setForm(emptyModifierForm);
    setEditingId(null);
    setBranchAllocOpen(false);
    setCategoryAllocOpen(false);
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
        categoryIds: form.categoryIds.length > 0 ? form.categoryIds : null,
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

  const filteredModifiers = useMemo(() => {
    const query = (search || "").trim().toLowerCase();
    if (!query) return records;

    return records.filter((item) =>
      [(item.name || ""), (item.arabic || ""), (item.color || "")].some((value) => 
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
