import { useState } from "react";
import { AlertCircle, X } from "lucide-react";
import { ConfirmDialog, PageShell } from "../../../../components/common";
import CategoryModal from "../components/CategoryModal";
import CategoryTable from "../components/CategoryTable";
import { usePermissions } from "../../../../hooks/usePermissions";
import { useToast } from "../../../../app/providers/useToast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { categoryFormSchema, type CategoryForm } from "../schemas";
import {
  useCategories,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
  useCategoryBranches,
} from "../hooks/useCategoryQueries";
import { useQuery } from "@tanstack/react-query";
import { groupService } from "../../group/services/groupService";
import { categoryApi } from "../api";
import type { CategoryListItem } from "../types";

const CategoryPage = () => {
  const { hasPermission } = usePermissions();
  const { showToast } = useToast();

  const canAdd = hasPermission("Category Master", "Add");
  const canEdit = hasPermission("Category Master", "Edit");
  const canDelete = hasPermission("Category Master", "Delete");

  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<CategoryListItem | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Data Fetching
  const { data: categories = [], isLoading } = useCategories();
  const { data: branchOptions = [] } = useCategoryBranches();
  const { data: groups = [] } = useQuery({
    queryKey: ["groups"],
    queryFn: () => groupService.list(),
  });

  // Mutations
  const createMutation = useCreateCategory();
  const updateMutation = useUpdateCategory();
  const deleteMutation = useDeleteCategory();

  const saving = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;

  // Filter categories by search
  const filteredCategories = categories.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.code?.toLowerCase().includes(search.toLowerCase())
  );

  // Form Setup
  const form = useForm<CategoryForm>({
    resolver: zodResolver(categoryFormSchema) as any,
    defaultValues: {
      code: "",
      name: "",
      isActive: true,
      colorCode: "red",
      branchAllocations: [],
      groupIds: [],
    },
  });

  const resetForm = () => {
    form.reset({
      code: "",
      name: "",
      arabic: "",
      isActive: true,
      colorCode: "red",
      branchAllocations: [],
      groupIds: [],
      imageFile: undefined,
      image: undefined,
    });
  };

  const handleOpenCreate = async () => {
    resetForm();
    setEditingId(null);
    setOpen(true);
    
    try {
      const code = await categoryApi.getNextCategoryCode();
      form.setValue("code", code);
    } catch {
      // ignore, user can type manually
    }
  };

  const handleEdit = async (cat: CategoryListItem) => {
    try {
      setEditingId(cat.id);
      const detail = await categoryApi.getCategoryById(cat.id);
      form.reset({
        code: detail.category?.code || "",
        name: detail.category?.name || "",
        arabic: detail.category?.arabic || "",
        isActive: detail.category?.isActive ?? true,
        colorCode: detail.category?.colorCode || "red",
        branchAllocations: detail.branch?.map((b: any) => ({
          branchId: b.id,
          colorCode: b.colorCode || "red",
        })) || [],
        groupIds: detail.group?.map((g: any) => g.id) || [],
      });
      setOpen(true);
    } catch (err: any) {
      showToast(err.message || "Failed to fetch category details", "error");
    }
  };

  const handleSave = form.handleSubmit((data) => {
    setError(null);
    if (editingId) {
      updateMutation.mutate(
        { id: editingId, data },
        {
          onSuccess: () => {
            showToast("Category updated successfully", "success");
            setOpen(false);
          },
          onError: (err: any) => {
            setError(err.message || "Failed to update category");
            showToast(err.message || "Failed to update category", "error");
          },
        }
      );
    } else {
      createMutation.mutate(data, {
        onSuccess: () => {
          showToast("Category created successfully", "success");
          setOpen(false);
        },
        onError: (err: any) => {
          setError(err.message || "Failed to create category");
          showToast(err.message || "Failed to create category", "error");
        },
      });
    }
  });

  const confirmDelete = () => {
    if (!deleteCandidate) return;
    setError(null);
    deleteMutation.mutate(deleteCandidate.id, {
      onSuccess: () => {
        showToast("Category deleted successfully", "success");
        setDeleteCandidate(null);
        if (editingId === deleteCandidate.id) setOpen(false);
      },
      onError: (err: any) => {
        setError(err.message || "Failed to delete category");
        showToast(err.message || "Failed to delete category", "error");
        setDeleteCandidate(null);
      },
    });
  };

  return (
    <PageShell title="Category Master">
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

      <CategoryTable
        categories={filteredCategories}
        loading={isLoading}
        search={search}
        onSearchChange={setSearch}
        onAdd={canAdd ? handleOpenCreate : undefined}
        onEdit={canEdit ? handleEdit : undefined}
        onDelete={canDelete ? (cat) => setDeleteCandidate(cat) : undefined}
      />

      <CategoryModal
        isOpen={open}
        editingId={editingId}
        form={form}
        saving={saving}
        branchOptions={branchOptions}
        groups={groups}
        onClose={() => setOpen(false)}
        onClear={resetForm}
        onSave={handleSave}
        onDelete={canDelete && editingId ? () => setDeleteCandidate(categories.find(c => c.id === editingId) || null) : undefined}
      />

      {/* Delete confirmation dialog */}
      {deleteCandidate && (
        <ConfirmDialog
          isOpen
          title="Delete Category"
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

export default CategoryPage;