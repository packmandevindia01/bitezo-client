import { useCallback, useEffect, useMemo, useState } from "react";
import { useToast } from "../../../../app/providers/useToast";
import { extrasService } from "../services/extrasService";
import { extrasTypeService } from "../../extrasType/services/extrasTypeService";
import type { ExtrasMasterForm, ExtrasMasterRecord } from "../types";
import type { ExtrasTypeRecord } from "../../extrasType/types";
import type { CategoryListItem } from "../../category/types";
import { useAppDispatch, useAppSelector } from "../../../../app/hooks";
import { fetchGlobalMasterData } from "../../shared/store/masterDataSlice";

const emptyForm: ExtrasMasterForm = {
  name: "",
  arabic: "",
  price: "0",
  typeId: "",
  color: "#cccccc",
  branchIds: [],
  categoryIds: [],
  category: "",
};

// Mock categories for design preview
const MOCK_CATEGORIES: CategoryListItem[] = [
  { id: 201, name: "Add-ons", arabic: "إضافات", code: "A01", isActive: true, branches: [] },
  { id: 202, name: "Sides", arabic: "جانبية", code: "S01", isActive: true, branches: [] },
  { id: 203, name: "Proteins", arabic: "بروتينات", code: "P01", isActive: true, branches: [] },
  { id: 204, name: "Dairy", arabic: "ألبان", code: "DY01", isActive: true, branches: [] },
  { id: 205, name: "Vegetables", arabic: "خضار", code: "V01", isActive: true, branches: [] },
];

export const useExtrasMasterManager = () => {
  const { showToast } = useToast();
  const [records, setRecords] = useState<ExtrasMasterRecord[]>([]);
  const [extrasTypes, setExtrasTypes] = useState<ExtrasTypeRecord[]>([]);
  const [categories] = useState<CategoryListItem[]>(MOCK_CATEGORIES);
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [form, setForm] = useState<ExtrasMasterForm>(emptyForm);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [branchAllocOpen, setBranchAllocOpen] = useState(false);
  const [categoryAllocOpen, setCategoryAllocOpen] = useState(false);

  // Get branches from global master data
  const { branches } = useAppSelector((state) => state.masterData);
  const dispatch = useAppDispatch();

  const fetchExtras = useCallback(async () => {
    setLoading(true);
    try {
      const data = await extrasService.list();
      setRecords(data);
    } catch (err: any) {
      showToast(err.message || "Failed to load extras", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    // Ensure global master data (like branches) is loaded
    if (branches.length === 0) {
      dispatch(fetchGlobalMasterData());
    }
  }, [dispatch, branches.length]);

  const fetchTypesAndCats = useCallback(async () => {
    try {
      const types = await extrasTypeService.list();
      setExtrasTypes(types);
      // Removed dynamic category fetch - using mock data for design
    } catch (err) {
      console.error("Failed to load types", err);
    }
  }, []);

  useEffect(() => {
    if (open) {
      fetchTypesAndCats();
    }
  }, [open, fetchTypesAndCats]);

  useEffect(() => {
    fetchExtras();
  }, [fetchExtras]);

  const setField = <K extends keyof ExtrasMasterForm>(key: K, value: ExtrasMasterForm[K]) => {
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
    setForm(emptyForm);
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

    if (form.branchIds.length === 0) {
      showToast("Please allocate at least one branch", "warning");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: name,
        arabic: (form.arabic || "").trim(),
        price: parseFloat(form.price) || 0,
        typeId: parseInt(form.typeId),
        color: form.color,
        branchIds: form.branchIds,
      };

      if (editingId) {
        await extrasService.update(editingId, {
          ...payload,
          id: editingId,
        });
        showToast("Extra updated successfully", "success");
      } else {
        await extrasService.create({
          ...payload,
          createdAt: new Date().toISOString(),
        });
        showToast("Extra created successfully", "success");
      }
      
      fetchExtras();
      closeModal();
    } catch (err: any) {
      showToast(err.message || "Failed to save extra", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async (record: ExtrasMasterRecord) => {
    setLoading(true);
    setOpen(true);
    setEditingId(record.id);
    try {
      const detail = await extrasService.getById(record.id);
      const mod = detail.modifier?.[0];
      const branchIds = (detail.branch || []).map((b: any) => b.id);
      
      // Category selection is currently frontend-only logic until backend supports it
      const categoryIds = record.categoryIds || [];

      if (mod) {
        setForm({
          name: mod.name || "",
          arabic: mod.arabic || "",
          price: String(mod.price || "0"),
          typeId: String(mod.type_id || mod.typeId || ""),
          color: mod.color || "#cccccc",
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

  const handleDelete = async (record: ExtrasMasterRecord) => {
    try {
      await extrasService.remove(record.id);
      showToast("Extra deleted successfully", "success");
      fetchExtras();
    } catch (err: any) {
      showToast(err.message || "Failed to delete extra", "error");
    }
  };

  const filteredRecords = useMemo(() => {
    const query = (search || "").trim().toLowerCase();
    if (!query) return records;

    return records.filter((item) =>
      [(item.name || ""), (item.arabic || "")].some((value) => 
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
    branches,
    extrasTypes,
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
