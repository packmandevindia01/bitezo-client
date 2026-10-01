import { useState, useEffect } from "react";
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
import { menuSettingsApi } from "../../../general/menuSettings/services/menuSettingsApi";
import { categoryApi } from "../api";
import type { CategoryListItem } from "../types";
import { resolveImageUrl } from "../../../../utils/imageUtils";

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
  const { data: categories = [], isLoading, refetch: refetchCategories } = useCategories();
  const { data: branchOptions = [] } = useCategoryBranches();
  const { data: menuTimes = [] } = useQuery({
    queryKey: ["menuTimeSettingsList"],
    queryFn: () => menuSettingsApi.list(),
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
      posStatus: true,
      colorCode: "red",
      branchAllocations: [],
      menuIds: [],
      isImageChanged: false,
    },
  });

  // Real-time synchronization for category list updates
  useEffect(() => {
    const handleCategoryUpdate = () => {
      void refetchCategories();
    };

    window.addEventListener("categories:updated", handleCategoryUpdate);
    window.addEventListener("pos_menu_updated", handleCategoryUpdate);

    return () => {
      window.removeEventListener("categories:updated", handleCategoryUpdate);
      window.removeEventListener("pos_menu_updated", handleCategoryUpdate);
    };
  }, [refetchCategories]);

  const resetForm = () => {
    const currentCode = form.getValues("code"); // preserve auto-generated code
    let defaultBranches: { branchId: number; colorCode: string }[] = [];
    if (branchOptions.length > 0) {
      const activeBranchId = Number(localStorage.getItem("activeBranchId") || localStorage.getItem("branchId")) || branchOptions[0].id;
      const targetBranch = branchOptions.find(b => Number(b.id) === Number(activeBranchId)) || branchOptions[0];
      if (targetBranch) {
        defaultBranches = [{ branchId: Number(targetBranch.id), colorCode: "red" }];
      }
    }
    // Allocate to all active menu times so category is immediately visible across all POS menu sessions
    const defaultMenus = menuTimes.length > 0 ? menuTimes.map(m => m.menuId) : [];

    form.reset({
      code: currentCode,
      name: "",
      arabic: "",
      isActive: true,
      posStatus: true,
      colorCode: "red",
      branchAllocations: defaultBranches,
      menuIds: defaultMenus,
      imageFile: undefined,
      image: undefined,
      isImageChanged: false,
    });
  };

  // If menuTimes or branchOptions finish loading after modal is already open, auto-populate allocations if empty
  useEffect(() => {
    if (open && !editingId) {
      const currentMenuIds = form.getValues("menuIds");
      if ((!currentMenuIds || currentMenuIds.length === 0) && menuTimes.length > 0) {
        form.setValue("menuIds", menuTimes.map(m => m.menuId), { shouldValidate: true });
      }
      const currentBranches = form.getValues("branchAllocations");
      if ((!currentBranches || currentBranches.length === 0) && branchOptions.length > 0) {
        const activeBranchId = Number(localStorage.getItem("activeBranchId") || localStorage.getItem("branchId")) || branchOptions[0].id;
        const targetBranch = branchOptions.find(b => Number(b.id) === Number(activeBranchId)) || branchOptions[0];
        if (targetBranch) {
          form.setValue("branchAllocations", [{ branchId: Number(targetBranch.id), colorCode: "red" }], { shouldValidate: true });
        }
      }
    }
  }, [open, editingId, menuTimes, branchOptions, form]);

  const handleOpenCreate = async () => {
    resetForm();
    setError(null);
    setEditingId(null);
    setOpen(true);
    void refetchCategories();
    
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
      
      const rawImage = detail.category?.fileUrl ||
                       detail.category?.filePath ||
                       detail.category?.image ||
                       (detail.category as any)?.imageUrl ||
                       (detail.category as any)?.imagePath ||
                       (detail.category as any)?.categoryImage ||
                       cat.imageUrl ||
                       cat.imagePath ||
                       "";
      const resolvedImage = resolveImageUrl(rawImage);

      // Extract branch allocations
      let existingBranches = ((detail.branch || (detail as any).branches || []) as any[]).map((b: any) => ({
        branchId: Number(b.id ?? b.branchId),
        colorCode: b.colorCode || "red",
      }));

      // If backend returned null/empty branches for an existing category (legacy data created before fix),
      // auto-default to active branch so the user is never asked/blocked on update!
      if (existingBranches.length === 0 && branchOptions.length > 0) {
        const activeBranchId = Number(localStorage.getItem("activeBranchId") || localStorage.getItem("branchId")) || branchOptions[0].id;
        const targetBranch = branchOptions.find(b => Number(b.id) === Number(activeBranchId)) || branchOptions[0];
        if (targetBranch) {
          existingBranches = [{
            branchId: Number(targetBranch.id),
            colorCode: detail.category?.colorCode || "red",
          }];
        }
      }

      // Extract menu allocations
      let existingMenus = ((detail.menu || (detail as any).menus || []) as any[]).map((m: any) => Number(m.id ?? m.menuId));
      if (existingMenus.length === 0 && menuTimes.length > 0) {
        existingMenus = menuTimes.map((m) => m.menuId);
      }

      form.reset({
        code: detail.category?.code || "",
        name: detail.category?.name || "",
        arabic: detail.category?.arabic || "",
        isActive: detail.category?.isActive ?? true,
        posStatus: detail.category?.posStatus ?? true,
        colorCode: detail.category?.colorCode || "red",
        branchAllocations: existingBranches,
        menuIds: existingMenus,
        imageFile: undefined,
        image: resolvedImage || undefined,
        isImageChanged: false,
      });

      // If backend provided an image URL, verify it loads; if 404 on server, clear preview to prevent broken image icon
      if (resolvedImage) {
        const testImg = new Image();
        testImg.onerror = () => {
          if (form.getValues("image") === resolvedImage) {
            form.setValue("image", undefined);
          }
        };
        testImg.src = resolvedImage;
      }

      setOpen(true);
    } catch (err: any) {
      showToast(err.message || "Failed to fetch category details", "error");
    }
  };

  const handleSave = form.handleSubmit(
    (data) => {
      setError(null);
      if (editingId) {
        updateMutation.mutate(
          { id: editingId, data },
          {
            onSuccess: () => {
              void refetchCategories();
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
            void refetchCategories();
            showToast("Category created successfully", "success");
            setOpen(false);
          },
          onError: (err: any) => {
            setError(err.message || "Failed to create category");
            showToast(err.message || "Failed to create category", "error");
          },
        });
      }
    },
    (invalidErrors) => {
      const firstError = Object.values(invalidErrors)[0];
      if (firstError?.message) {
        showToast(String(firstError.message), "error");
      }
    }
  );

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
        menuTimes={menuTimes}
        error={error}
        onClearError={() => setError(null)}
        onClose={() => {
          setError(null);
          setOpen(false);
        }}
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