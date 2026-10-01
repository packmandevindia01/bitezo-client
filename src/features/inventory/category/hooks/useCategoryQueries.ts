import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { categoryApi } from "../api";
import type { CategoryForm } from "../schemas";
import { notifyPosMenuUpdated } from "../../../pos/utils/posMenuSync";

export const useCategories = (catCode?: string, catName?: string) => {
  return useQuery({
    queryKey: ["categories", catCode, catName],
    queryFn: () => categoryApi.getCategories(catCode, catName),
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
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
      queryClient.invalidateQueries({ queryKey: ["categoryOptions"] });
      queryClient.invalidateQueries({ queryKey: ["categories-list"] });
      queryClient.invalidateQueries({ queryKey: ["productMasterData"] });
      queryClient.invalidateQueries({ queryKey: ["pos"] });
      void queryClient.refetchQueries({ queryKey: ["categories"] });
      void queryClient.refetchQueries({ queryKey: ["pos"] });
      window.dispatchEvent(new CustomEvent("categories:updated"));
      notifyPosMenuUpdated("category");
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
        imageFile: data.imageFile,
        isImageChanged: data.isImageChanged,
        isImageChaged: data.isImageChanged,
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      queryClient.invalidateQueries({ queryKey: ["categoryOptions"] });
      queryClient.invalidateQueries({ queryKey: ["categories-list"] });
      queryClient.invalidateQueries({ queryKey: ["category", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["productMasterData"] });
      queryClient.invalidateQueries({ queryKey: ["pos"] });
      void queryClient.refetchQueries({ queryKey: ["categories"] });
      void queryClient.refetchQueries({ queryKey: ["pos"] });
      window.dispatchEvent(new CustomEvent("categories:updated"));
      notifyPosMenuUpdated("category");
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
      window.dispatchEvent(new CustomEvent("categories:updated"));
      notifyPosMenuUpdated("category");
    },
  });
};
