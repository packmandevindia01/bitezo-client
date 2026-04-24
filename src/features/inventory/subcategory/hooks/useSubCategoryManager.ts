import { useState } from "react";
import {
  createSubCategory,
  deleteSubCategory,
  getSubCategoryById,
  updateSubCategory,
} from "../services/subCategoryService";
import { useToast } from "../../../../app/providers/useToast";
import type { SubCategoryListItem } from "../types";
import { useSubCategoryList } from "./useSubCategoryList";
import { useSubCategoryFormState } from "./useSubCategoryFormState";

export const useSubCategoryManager = () => {
  const { showToast } = useToast();
  
  // Compose specialized hooks
  const {
    categoryOptions,
    loading,
    error,
    setError,
    search,
    setSearch,
    filteredSubCategories,
    fetchInitData,
  } = useSubCategoryList();

  const {
    form,
    setForm,
    editingId,
    setEditingId,
    open,
    setOpen,
    resetForm,
    closeModal,
    openCreateModal,
    handleImageSelect,
  } = useSubCategoryFormState();

  // Async action flags
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<SubCategoryListItem | null>(null);

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
      showToast(editingId ? "Sub Category updated successfully" : "Sub Category created successfully", "success");
      closeModal();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to save Sub Category";
      setError(msg);
      showToast(msg, "error");
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async (record: SubCategoryListItem) => {
    try {
      setError(null);
      const res = await getSubCategoryById(record.id);
      
      const rawRes = res as any;
      const subCatArray = rawRes?.subcategory || rawRes?.subcategory_list || rawRes?.data || rawRes;
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
      showToast("Sub Category deleted successfully", "success");
      setDeleteCandidate(null);
      if (editingId === deleteCandidate.id) closeModal();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to delete sub category";
      setError(msg);
      showToast(msg, "error");
      console.error(err);
    } finally {
      setDeleting(null);
    }
  };

  const cancelDelete = () => setDeleteCandidate(null);

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
