import { useCallback, useEffect, useMemo, useState } from "react";
import { getCategories } from "../../category/services/categoryService";
import {
  createSubCategory,
  deleteSubCategory,
  getSubCategories,
  getSubCategoryById,
  updateSubCategory,
} from "../services/subCategoryService";
import type { SubCategoryListItem } from "../types/subCategoryApiTypes";

export interface SubCategoryFormState {
  code: string;
  name: string;
  arabicName: string;
  categoryId: number | "";
  isActive: boolean;
  image: string;
}

const emptyForm: SubCategoryFormState = {
  code: "",
  name: "",
  arabicName: "",
  categoryId: "",
  isActive: true,
  image: "",
};

export const useSubCategoryManager = () => {
  const [subCategories, setSubCategories] = useState<SubCategoryListItem[]>([]);
  const [categoryOptions, setCategoryOptions] = useState<{ label: string; value: number }[]>([]);

  const [form, setForm] = useState<SubCategoryFormState>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);

  // Async flags
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Delete
  const [deleteCandidate, setDeleteCandidate] = useState<SubCategoryListItem | null>(null);

  const fetchInitData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [cats, subCats] = await Promise.all([
        getCategories(),
        getSubCategories(),
      ]);
      setCategoryOptions(cats.map((c) => ({ label: c.name, value: c.id })));
      setSubCategories(subCats);
    } catch (err) {
      setError("Failed to load sub categories. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInitData();
  }, [fetchInitData]);

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

  const handleImageSelect = (file: File | null) => {
    setForm((prev) => ({
      ...prev,
      image: file ? URL.createObjectURL(file) : "",
    }));
  };

  const handleSave = async () => {
    const codeVal = form.code || "";
    const nameVal = form.name || "";
    const arabicVal = form.arabicName || "";

    if (!codeVal.trim() || !nameVal.trim() || form.categoryId === "") return;

    setSaving(true);
    setError(null);
    try {
      if (editingId) {
        await updateSubCategory(editingId, {
          subCatId: editingId,
          code: codeVal.trim(),
          name: nameVal.trim(),
          arabicName: arabicVal.trim(),
          categoryId: form.categoryId as number,
          isActive: form.isActive,
          fileName: "",
          filePath: "",
          updatedAt: new Date().toISOString(),
        });
      } else {
        await createSubCategory({
          code: codeVal.trim(),
          name: nameVal.trim(),
          arabicName: arabicVal.trim(),
          categoryId: form.categoryId as number,
          isActive: form.isActive,
          fileName: "",
          filePath: "",
          createdAt: new Date().toISOString(),
        });
      }
      await fetchInitData();
      closeModal();
    } catch (err) {
      setError("Failed to save Sub Category. Please try again.");
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async (record: SubCategoryListItem) => {
    try {
      setError(null);
      // We attempt to fetch the detail by ID for the complete record (including Arabic Name and Cat ID)
      const res = await getSubCategoryById(record.id);
      
      const subCatArray = res?.subcategory || res?.subcategory_list || res?.data || res;
      const subCat = Array.isArray(subCatArray) ? subCatArray[0] : subCatArray;

      const scId = subCat?.id || subCat?.subCatId || record.id;
      const scCode = subCat?.code || subCat?.subCatCode || record.code;
      const scName = subCat?.name || subCat?.subCatName || record.name;
      const scArabic = subCat?.arabicName || subCat?.arabicname || "";
      const scCatId = subCat?.categoryId || subCat?.categoryid || record.categoryId || "";
      
      const rawIsActive = subCat?.isactive ?? subCat?.isActive;
      const scIsActive = rawIsActive !== undefined 
          ? (rawIsActive === "Active" || rawIsActive === true) 
          : record.isActive;

      setEditingId(scId);
      setForm({
        code: scCode,
        name: scName,
        arabicName: scArabic,
        categoryId: scCatId,
        isActive: scIsActive,
        image: "",
      });
      setOpen(true);
    } catch (err) {
      console.error(err);
      setError("Failed to fetch subcategory details. Using partial list data.");
      
      // Fallback if GET /{id} fails or diverges
      setEditingId(record.id);
      setForm({
        code: record.code,
        name: record.name,
        arabicName: record.arabicName ?? "",
        categoryId: record.categoryId ?? "",
        isActive: record.isActive,
        image: "",
      });
      setOpen(true);
    }
  };

  const requestDelete = (record: SubCategoryListItem) => {
    setDeleteCandidate(record);
  };

  const confirmDelete = async () => {
    if (!deleteCandidate) return;
    setDeleting(deleteCandidate.id);
    setError(null);
    try {
      await deleteSubCategory(deleteCandidate.id);
      await fetchInitData();
      setDeleteCandidate(null);
      if (editingId === deleteCandidate.id) closeModal();
    } catch (err) {
      setError("Failed to delete. Please try again.");
      console.error(err);
    } finally {
      setDeleting(null);
    }
  };

  const cancelDelete = () => setDeleteCandidate(null);

  const filteredSubCategories = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return subCategories;

    return subCategories.filter((item) =>
      [item.code, item.name, item.categoryName].some((value) =>
        value?.toLowerCase().includes(query)
      )
    );
  }, [search, subCategories]);

  return {
    form,
    setForm,
    categoryOptions,
    editingId,
    search,
    setSearch,
    open,
    loading,
    saving,
    deleting,
    error,
    setError,
    deleteCandidate,
    resetForm,
    closeModal,
    openCreateModal,
    handleImageSelect,
    handleSave,
    handleEdit,
    requestDelete,
    confirmDelete,
    cancelDelete,
    filteredSubCategories,
  };
};
