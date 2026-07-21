import { useState, useMemo } from "react";
import { AlertCircle, X } from "lucide-react";
import { ConfirmDialog, PageShell } from "../../../../components/common";
import SubCategoryModal from "../components/SubCategoryModal";
import SubCategoryTable from "../components/SubCategoryTable";
import { usePermissions } from "../../../../hooks/usePermissions";
import { useToast } from "../../../../app/providers/useToast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { subCategoryFormSchema, type SubCategoryForm } from "../schemas";
import {
  useSubCategories,
  useCreateSubCategory,
  useUpdateSubCategory,
  useDeleteSubCategory,
} from "../hooks/useSubCategoryQueries";
import { useQuery } from "@tanstack/react-query";
import { categoryApi } from "../../category/api";
import { subCategoryApi } from "../api";
import type { SubCategoryListItem } from "../types";

const SubCategoryPage = () => {
  const { hasPermission } = usePermissions();
  const { showToast } = useToast();

  const canAdd = hasPermission("Sub Category Master", "Add");
  const canEdit = hasPermission("Sub Category Master", "Edit");
  const canDelete = hasPermission("Sub Category Master", "Delete");

  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<SubCategoryListItem | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Data Fetching
  const { data: subCategories = [], isLoading } = useSubCategories();
  const { data: categories = [] } = useQuery({
    queryKey: ["categoryOptions"],
    queryFn: () => categoryApi.getCategories(),
  });

  const categoryOptions = useMemo(() => {
    return categories.map((c) => ({ label: c.name, value: c.id }));
  }, [categories]);

  // Mutations
  const createMutation = useCreateSubCategory();
  const updateMutation = useUpdateSubCategory();
  const deleteMutation = useDeleteSubCategory();

  const saving = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;

  // Form Setup
  const form = useForm<SubCategoryForm>({
    resolver: zodResolver(subCategoryFormSchema),
    defaultValues: {
      code: "",
      name: "",
      arabicName: "",
      categoryId: "",
      isActive: true,
      imageFile: undefined,
      image: undefined,
    },
  });

  const filteredSubCategories = useMemo(() => {
    return subCategories.filter(
      (item) =>
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        item.code.toLowerCase().includes(search.toLowerCase()) ||
        item.categoryName?.toLowerCase().includes(search.toLowerCase())
    );
  }, [subCategories, search]);

  const resetForm = () => {
    form.reset({
      code: "",
      name: "",
      arabicName: "",
      categoryId: "",
      isActive: true,
      imageFile: undefined,
      image: undefined,
    });
  };

  const handleOpenCreate = () => {
    resetForm();
    setEditingId(null);
    setOpen(true);
  };

  const handleEdit = async (subCat: SubCategoryListItem) => {
    try {
      setEditingId(subCat.id);
      const detail = await subCategoryApi.getSubCategoryById(subCat.id);
      form.reset({
        code: detail.code || "",
        name: detail.name || "",
        arabicName: detail.arabicName || "",
        categoryId: detail.categoryId ?? "",
        isActive: detail.isActive ?? true,
      });
      setOpen(true);
    } catch (err: any) {
      showToast(err.message || "Failed to fetch sub category details", "error");
    }
  };

  const handleSave = form.handleSubmit((data) => {
    setError(null);
    const mutation = editingId ? updateMutation : createMutation;
    
    mutation.mutate(
      editingId ? { id: editingId, data } : (data as any),
      {
        onSuccess: () => {
          showToast(`Sub Category ${editingId ? "updated" : "created"} successfully`, "success");
          setOpen(false);
          resetForm();
        },
        onError: (err: any) => {
          setError(err.message || "Failed to save sub category");
        }
      }
    );
  });

  const confirmDelete = () => {
    if (!deleteCandidate) return;
    deleteMutation.mutate(deleteCandidate.id, {
      onSuccess: () => {
        showToast("Sub Category deleted successfully", "success");
        setDeleteCandidate(null);
        if (editingId === deleteCandidate.id) {
          setOpen(false);
          resetForm();
        }
      },
      onError: (err: any) => {
        showToast(err.message || "Failed to delete sub category", "error");
        setDeleteCandidate(null);
      }
    });
  };

  return (
    <PageShell title="Sub Category Master">
      {/* Error banner */}
      {error && (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <span className="flex-1">{error}</span>
          <button
            type="button"
            onClick={() => setError(null)}
            className="shrink-0 rounded p-0.5 hover:bg-amber-100"
          >
            <X size={14} />
          </button>
        </div>
      )}

      <SubCategoryTable
        subCategories={filteredSubCategories}
        loading={isLoading}
        search={search}
        onSearchChange={setSearch}
        onAdd={canAdd ? handleOpenCreate : undefined}
        onEdit={canEdit ? handleEdit : undefined}
        onDelete={canDelete ? (record) => setDeleteCandidate(record) : undefined}
      />

      <SubCategoryModal
        isOpen={open}
        editingId={editingId}
        form={form}
        categoryOptions={categoryOptions}
        saving={saving}
        onClose={() => setOpen(false)}
        onClear={resetForm}
        onSave={handleSave}
        onDelete={canDelete && editingId ? () => {
          const record = subCategories.find((s) => s.id === editingId);
          if (record) {
            setDeleteCandidate(record);
            setOpen(false);
          }
        } : undefined}
      />

      {/* Delete confirmation dialog */}
      {deleteCandidate && (
        <ConfirmDialog
          isOpen
          title="Delete Sub Category"
          message={`Are you sure you want to delete "${deleteCandidate.name}"? This action cannot be undone.`}
          confirmLabel="Delete"
          cancelLabel="Cancel"
          onConfirm={confirmDelete}
          onCancel={() => setDeleteCandidate(null)}
        />
      )}
    </PageShell>
  );
};

export default SubCategoryPage;

