import { useCallback, useEffect, useMemo, useState } from "react";
import { getConfig } from "../../../../config";
import {
  createCategory,
  deleteCategory,
  getBranches,
  getCategories,
  updateCategory,
  getCategoryById,
} from "../services/categoryService";
import { useToast } from "../../../../app/providers/useToast";
import { groupService } from "../../group/services/groupService";
import type { GroupListItem } from "../../group/types";
import type { BranchOption, CategoryListItem, CategoryFormState } from "../types";

const emptyForm: CategoryFormState = {
  code: "",
  name: "",
  arabic: "",
  isActive: true,
  colorCode: "red",
  branchAllocations: [],
  groupIds: [],
  image: "",
};

// ── Hook ──────────────────────────────────────────────────────────────────────

export const useCategoryManager = () => {
  // ── data ────────────────────────────────────────────────────────────────────
  const [categories, setCategories] = useState<CategoryListItem[]>([]);
  const [branchOptions, setBranchOptions] = useState<BranchOption[]>([]);
  const [groups, setGroups] = useState<GroupListItem[]>([]);

  // ── ui state ────────────────────────────────────────────────────────────────
  const [form, setForm] = useState<CategoryFormState>(emptyForm);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [branchAllocOpen, setBranchAllocOpen] = useState(false);
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

  const fetchBranchesAndGroups = useCallback(async () => {
    try {
      const [branches, groupsList] = await Promise.all([
        getBranches(),
        groupService.list()
      ]);
      setBranchOptions(branches);
      setGroups(groupsList);
    } catch (err) {
      console.error("Failed to load branches or groups:", err);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
    fetchBranchesAndGroups();
  }, [fetchCategories, fetchBranchesAndGroups]);

  // ── helpers ──────────────────────────────────────────────────────────────────
  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
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

    if (!codeVal.trim() || !nameVal.trim()) {
      showToast("Please enter both Code and Name", "warning");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      if (editingId) {
        await updateCategory(editingId, {
          id: editingId,
          code: codeVal.trim(),
          name: nameVal.trim(),
          arabic: arabicVal.trim(),
          isActive: form.isActive,
          colorCode: form.colorCode,
          updatedAt: new Date().toISOString(),
          branchIds: form.branchAllocations,
          groupIds: form.groupIds,
          imageFile: form.imageFile,
        });
      } else {
        await createCategory({
          code: codeVal.trim(),
          name: nameVal.trim(),
          arabic: arabicVal.trim(),
          isActive: form.isActive,
          colorCode: form.colorCode,
          createdAt: new Date().toISOString(),
          branchIds: form.branchAllocations,
          groupIds: form.groupIds,
          imageFile: form.imageFile,
        });
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
      const catImage = cat?.fileurl || cat?.filePath || cat?.filepath || cat?.image || "";
      let imagePreviewUrl = "";

      if (catImage && catImage !== "string") {
        if (catImage.startsWith("http")) {
          imagePreviewUrl = catImage;
        } else {
          const apiUrl = getConfig().apiBaseUrl || "";
          const baseUrl = apiUrl.replace(/\/api\/?$/, "");
            
          const cleanPath = catImage.replace(/^\/?api\//i, "").replace(/^\//, "");
          imagePreviewUrl = `${baseUrl}/${cleanPath}`;
        }
        
        // Clean up double slashes
        imagePreviewUrl = imagePreviewUrl.replace(/([^:]\/)\/+/g, "$1");
      }

      setForm({
        code: catCode,
        name: catName,
        arabic: catArabic,
        isActive: catIsActive,
        colorCode: cat?.colorCode || "red",
        branchAllocations: (res?.branch || []).map((b: any) => ({
          branchId: Number(b.id || b.branchId),
          colorCode: b.colorCode || "red"
        })),
        groupIds: (res?.group || []).map((g: any) => Number(g.id || g.groupId)),
        image: imagePreviewUrl,
      });
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
    setForm((prev) => {
      const isAllocated = prev.branchAllocations.some((b) => b.branchId === branchId);
      if (isAllocated) {
        return {
          ...prev,
          branchAllocations: prev.branchAllocations.filter((b) => b.branchId !== branchId),
        };
      } else {
        return {
          ...prev,
          branchAllocations: [
            ...prev.branchAllocations,
            { branchId, colorCode: prev.colorCode || "red" }, // Default to main category color
          ],
        };
      }
    });
  };

  const toggleGroup = (groupId: number) => {
    setForm((prev) => ({
      ...prev,
      groupIds: prev.groupIds.includes(groupId)
        ? prev.groupIds.filter((id) => id !== groupId)
        : [...prev.groupIds, groupId],
    }));
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
    open,
    branchOptions,
    groups,
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
    toggleGroup,
    filteredCategories,
  };
};