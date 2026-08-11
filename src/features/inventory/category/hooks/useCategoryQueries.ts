import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { categoryApi } from "../api";
import type { CategoryForm } from "../schemas";

export const useCategories = (catCode?: string, catName?: string) => {
  return useQuery({
    queryKey: ["categories", catCode, catName],
    queryFn: () => categoryApi.getCategories(catCode, catName),
  });
};

export const useCategoryDetail = (id: number | null) => {
  return useQuery({
    queryKey: ["category", id],
    queryFn: () => categoryApi.getCategoryById(id!),
    enabled: !!id,
  });
};

export const useCategoryBranches = () => {
  return useQuery({
    queryKey: ["categoryBranches"],
    queryFn: () => categoryApi.getBranches(),
  });
};

export const useCreateCategory = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CategoryForm) => categoryApi.createCategory({
      code: data.code || "",
      name: data.name,
      arabic: data.arabic || "",
      isActive: data.isActive,
      posStatus: data.posStatus,
      colorCode: data.colorCode,
      createdAt: new Date().toISOString(),
      branchIds: data.branchAllocations,
      menuIds: data.menuIds,
      imageFile: data.imageFile
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
  });
};

export const useUpdateCategory = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: CategoryForm }) =>
      categoryApi.updateCategory(id, {
        id,
        code: data.code || "",
        name: data.name,
        arabic: data.arabic || "",
        isActive: data.isActive,
        posStatus: data.posStatus,
        colorCode: data.colorCode,
        updatedAt: new Date().toISOString(),
        branchIds: data.branchAllocations,
        menuIds: data.menuIds,
        imageFile: data.imageFile
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      queryClient.invalidateQueries({ queryKey: ["category", variables.id] });
    },
  });
};

export const useDeleteCategory = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => categoryApi.deleteCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
  });
};
