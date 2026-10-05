import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { categoryApi } from "../api";
import type { CategoryForm } from "../schemas";
import { notifyCategoriesUpdated } from "../utils/categorySync";

export const useCategories = (catCode?: string, catName?: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: ["categories", catCode, catName],
    queryFn: () => categoryApi.getCategories(catCode, catName),
    enabled,
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    retry: (failureCount, error: any) => {
      if (error?.response?.status === 403 || error?.statusCode === 403) return false;
      return failureCount < 2;
    },
  });
};

export const useCategoryDetail = (id: number | null) => {
  return useQuery({
    queryKey: ["category", id],
    queryFn: () => categoryApi.getCategoryById(id!),
    enabled: !!id,
    staleTime: 0,
    refetchOnMount: "always",
  });
};

export const useCategoryBranches = () => {
  return useQuery({
    queryKey: ["categoryBranches"],
    queryFn: () => categoryApi.getBranches(),
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });
};

export const useCreateCategory = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CategoryForm) => {
      const activeBranchId = Number(
        localStorage.getItem("activeBranchId") ||
        localStorage.getItem("branchId") ||
        localStorage.getItem("systemBranchId") ||
        1
      );
      const cachedMenus = queryClient.getQueryData<any[]>(["menuTimeSettingsList"]);
      const fallbackMenus = Array.isArray(cachedMenus) && cachedMenus.length > 0
        ? cachedMenus.map((m: any) => Number(m.menuId ?? m.id ?? 1)).filter((id: number) => id > 0)
        : [1];

      const resolvedBranches = Array.isArray(data.branchAllocations) && data.branchAllocations.length > 0
        ? data.branchAllocations
        : [{ branchId: activeBranchId, colorCode: data.colorCode || "red" }];

      const resolvedMenus = Array.isArray(data.menuIds) && data.menuIds.length > 0
        ? data.menuIds
        : (fallbackMenus.length > 0 ? fallbackMenus : [1]);

      return categoryApi.createCategory({
        code: data.code || "",
        name: data.name,
        arabic: data.arabic || "",
        isActive: data.isActive ?? true,
        posStatus: data.posStatus ?? true,
        colorCode: data.colorCode || "red",
        createdAt: new Date().toISOString(),
        branchIds: resolvedBranches,
        menuIds: resolvedMenus,
        imageFile: data.imageFile
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      queryClient.invalidateQueries({ queryKey: ["categoryOptions"] });
      queryClient.invalidateQueries({ queryKey: ["categories-list"] });
      queryClient.invalidateQueries({ queryKey: ["productMasterData"] });
      queryClient.invalidateQueries({ queryKey: ["pos"] });
      queryClient.invalidateQueries({ queryKey: ["menuTimeSettingsList"] });
      void queryClient.refetchQueries({ queryKey: ["categories"] });
      void queryClient.refetchQueries({ queryKey: ["pos"] });
      notifyCategoriesUpdated("created");
    },
  });
};

export const useUpdateCategory = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: CategoryForm }) => {
      const activeBranchId = Number(
        localStorage.getItem("activeBranchId") ||
        localStorage.getItem("branchId") ||
        localStorage.getItem("systemBranchId") ||
        1
      );
      const cachedMenus = queryClient.getQueryData<any[]>(["menuTimeSettingsList"]);
      const fallbackMenus = Array.isArray(cachedMenus) && cachedMenus.length > 0
        ? cachedMenus.map((m: any) => Number(m.menuId ?? m.id ?? 1)).filter((id: number) => id > 0)
        : [1];

      const resolvedBranches = Array.isArray(data.branchAllocations) && data.branchAllocations.length > 0
        ? data.branchAllocations
        : [{ branchId: activeBranchId, colorCode: data.colorCode || "red" }];

      const resolvedMenus = Array.isArray(data.menuIds) && data.menuIds.length > 0
        ? data.menuIds
        : (fallbackMenus.length > 0 ? fallbackMenus : [1]);

      return categoryApi.updateCategory(id, {
        id,
        code: data.code || "",
        name: data.name,
        arabic: data.arabic || "",
        isActive: data.isActive ?? true,
        posStatus: data.posStatus ?? true,
        colorCode: data.colorCode || "red",
        updatedAt: new Date().toISOString(),
        branchIds: resolvedBranches,
        menuIds: resolvedMenus,
        imageFile: data.imageFile,
        isImageChanged: data.isImageChanged,
        isImageChaged: data.isImageChanged,
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      queryClient.invalidateQueries({ queryKey: ["categoryOptions"] });
      queryClient.invalidateQueries({ queryKey: ["categories-list"] });
      queryClient.invalidateQueries({ queryKey: ["category", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["productMasterData"] });
      queryClient.invalidateQueries({ queryKey: ["pos"] });
      queryClient.invalidateQueries({ queryKey: ["menuTimeSettingsList"] });
      void queryClient.refetchQueries({ queryKey: ["categories"] });
      void queryClient.refetchQueries({ queryKey: ["pos"] });
      notifyCategoriesUpdated("updated");
    },
  });
};

export const useDeleteCategory = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => categoryApi.deleteCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      queryClient.invalidateQueries({ queryKey: ["categoryOptions"] });
      queryClient.invalidateQueries({ queryKey: ["categories-list"] });
      queryClient.invalidateQueries({ queryKey: ["productMasterData"] });
      queryClient.invalidateQueries({ queryKey: ["pos"] });
      void queryClient.refetchQueries({ queryKey: ["categories"] });
      void queryClient.refetchQueries({ queryKey: ["pos"] });
      notifyCategoriesUpdated("deleted");
    },
  });
};

