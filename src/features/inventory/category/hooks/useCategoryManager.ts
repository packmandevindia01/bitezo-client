import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createCategory,
  deleteCategory,
  getBranches,
  getCategories,
  updateCategory,
  getCategoryById,
} from "../services/categoryService";
import { useToast } from "../../../../app/providers/useToast";
import type { BranchOption, CategoryListItem } from "../types";

// ── Local form shape ──────────────────────────────────────────────────────────

export interface CategoryFormState {
  code: string;
  name: string;
  arabic: string;
  isActive: boolean;
  image: string;
  imageFile?: File;
}

const emptyForm: CategoryFormState = {
  code: "",
  name: "",
  arabic: "",
  isActive: true,
  image: "",
};

// ── Hook ──────────────────────────────────────────────────────────────────────

export const useCategoryManager = () => {
  // ── data ────────────────────────────────────────────────────────────────────
  const [categories, setCategories] = useState<CategoryListItem[]>([]);
  const [branchOptions, setBranchOptions] = useState<BranchOption[]>([]);

  // ── ui state ────────────────────────────────────────────────────────────────
  const [form, setForm] = useState<CategoryFormState>(emptyForm);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [branchAllocOpen, setBranchAllocOpen] = useState(false);
  const [selectedBranchIds, setSelectedBranchIds] = useState<number[]>([]);
  const [open, setOpen] = useState(false);
  const { showToast } = useToast();

  // ── async flags ─────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ── delete confirmation ──────────────────────────────────────────────────────
  const [deleteCandidate, setDeleteCandidate] = useState<CategoryListItem | null>(null);

  // ── fetch on mount ───────────────────────────────────────────────────────────
  const fetchCategories = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getCategories();
      setCategories(data);
    } catch (err) {
      setError("Failed to load categories. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchBranches = useCallback(async () => {
    try {
      const data = await getBranches();
      setBranchOptions(data);
    } catch (err) {
      console.error("Failed to load branches:", err);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
    fetchBranches();
  }, [fetchCategories, fetchBranches]);

  // ── helpers ──────────────────────────────────────────────────────────────────
  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setSelectedBranchIds([]);
    setBranchAllocOpen(false);
  };

  const closeModal = () => {
    setOpen(false);
    resetForm();
  };

  const openCreateModal = () => {
    resetForm();
    setOpen(true);
  };

  const handleImageSelect = (file: File | null) => {
    setForm((prev) => ({
      ...prev,
      image: file ? URL.createObjectURL(file) : "",
      imageFile: file || undefined,
    }));
  };

  // ── save (create or update) ──────────────────────────────────────────────────
  const handleSave = async () => {
    const codeVal = form.code || "";
    const nameVal = form.name || "";
    const arabicVal = form.arabic || "";

    if (!codeVal.trim() || !nameVal.trim()) return;

    setSaving(true);
    setError(null);
    try {
      if (editingId) {
        await updateCategory(editingId, {
          CatId: editingId,
          CatCode: codeVal.trim(),
          CatName: nameVal.trim(),
          CatArabic: arabicVal.trim(),
          IsActive: form.isActive,
          UpdatedAt: new Date().toISOString(),
          BranchIds: selectedBranchIds,
          imageFile: form.imageFile,
        } as any);
      } else {
        await createCategory({
          CatCode: codeVal.trim(),
          CatName: nameVal.trim(),
          CatArabic: arabicVal.trim(),
          IsActive: form.isActive,
          CreatedAt: new Date().toISOString(),
          BranchIds: selectedBranchIds,
          imageFile: form.imageFile,
        } as any);
      }
      await fetchCategories();
      showToast(editingId ? "Category updated successfully" : "Category created successfully", "success");
      closeModal();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to save category";
      setError(msg);
      showToast(msg, "error");
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  // ── edit ─────────────────────────────────────────────────────────────────────
  const handleEdit = async (record: CategoryListItem) => {
    try {
      const res = await getCategoryById(record.id);
      
      // The API returns `category` as a one-element array:
      const catArray = res?.category;
      const cat = Array.isArray(catArray) ? catArray[0] : catArray;
      
      const catId = cat?.id || cat?.catId || record.id;
      const catCode = cat?.code || cat?.catCode || record.code;
      const catName = cat?.name || cat?.catName || record.name;
      const catArabic = cat?.arabic || record.arabic || "";
      
      const rawIsActive = cat?.isactive ?? cat?.isActive; // Check both lowercase & camelCase
      const catIsActive = rawIsActive !== undefined 
          ? (rawIsActive === "Active" || rawIsActive === true) 
          : record.isActive;

      setEditingId(catId);
      const catImage = cat?.image || cat?.filePath || "";
      let imagePreviewUrl = "";
      if (catImage) {
        const apiUrl = import.meta.env.VITE_API_BASE_URL || "";
        const baseUrl = apiUrl 
          ? apiUrl.replace(/\/api\/?$/, "") 
          : "http://84.255.173.131:8068";
          
        const cleanPath = catImage.replace(/^\/?api\//i, "").replace(/^\//, "");
        
        imagePreviewUrl = catImage.startsWith("http") 
          ? catImage 
          : `${baseUrl}/${cleanPath}`;
        
        // Clean up double slashes
        imagePreviewUrl = imagePreviewUrl.replace(/([^:]\/)\/+/g, "$1");
        console.log("[Category Image Debug] Full URL:", imagePreviewUrl);
      }

      setForm({
        code: catCode,
        name: catName,
        arabic: catArabic,
        isActive: catIsActive,
        image: imagePreviewUrl,
      });
      // The API returns `branch` array of BranchOption or matching shape
      const allocatedBranches = res?.branch || [];
      setSelectedBranchIds(allocatedBranches.map((b: { id?: number; branchId?: number }) => Number(b.id || b.branchId)));
      setOpen(true);
    } catch (err) {
      setError("Failed to load category details. Please try again.");
      console.error(err);
    }
  };

  // ── delete flow ──────────────────────────────────────────────────────────────
  const requestDelete = (record: CategoryListItem) => {
    setDeleteCandidate(record);
  };

  const confirmDelete = async () => {
    if (!deleteCandidate) return;
    setDeleting(deleteCandidate.id);
    setError(null);
    try {
      await deleteCategory(deleteCandidate.id);
      await fetchCategories();
      showToast("Category deleted successfully", "success");
      setDeleteCandidate(null);
      if (editingId === deleteCandidate.id) closeModal();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to delete category";
      setError(msg);
      showToast(msg, "error");
      console.error(err);
    } finally {
      setDeleting(null);
    }
  };

  const cancelDelete = () => setDeleteCandidate(null);

  // ── branch toggle ────────────────────────────────────────────────────────────
  const toggleBranch = (branchId: number) => {
    setSelectedBranchIds((prev) =>
      prev.includes(branchId) ? prev.filter((id) => id !== branchId) : [...prev, branchId]
    );
  };

  // ── filtered list ────────────────────────────────────────────────────────────
  const filteredCategories = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return categories;
    return categories.filter(
      (item) =>
        item.code.toLowerCase().includes(q) ||
        item.name.toLowerCase().includes(q) ||
        item.branches?.some((b) => b.name.toLowerCase().includes(q))
    );
  }, [categories, search]);

  return {
    // state
    form,
    setForm,
    search,
    setSearch,
    editingId,
    branchAllocOpen,
    setBranchAllocOpen,
    selectedBranchIds,
    open,
    branchOptions,
    // async flags
    loading,
    saving,
    deleting,
    error,
    setError,
    // delete confirm
    deleteCandidate,
    requestDelete,
    confirmDelete,
    cancelDelete,
    // actions
    resetForm,
    closeModal,
    openCreateModal,
    handleImageSelect,
    handleSave,
    handleEdit,
    toggleBranch,
    filteredCategories,
  };
};