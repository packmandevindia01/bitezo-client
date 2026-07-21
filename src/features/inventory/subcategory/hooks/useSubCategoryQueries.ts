import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { subCategoryApi } from "../api";
import type { SubCategoryForm } from "../schemas";

export const useSubCategories = (code?: string, name?: string, catId?: number) => {
  return useQuery({
    queryKey: ["subCategories", code, name, catId],
    queryFn: () => subCategoryApi.getSubCategories(code, name, catId),
  });
};

export const useSubCategoryDetail = (id: number | null) => {
  return useQuery({
    queryKey: ["subCategory", id],
    queryFn: () => subCategoryApi.getSubCategoryById(id!),
    enabled: !!id,
  });
};

export const useCreateSubCategory = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: SubCategoryForm) => subCategoryApi.createSubCategory({
      code: data.code || "",
      name: data.name,
      arabicName: data.arabicName || "",
      categoryId: Number(data.categoryId),
      isActive: data.isActive,
      fileName: data.imageFile?.name || "",
      filePath: "",
      createdAt: new Date().toISOString(),
      imageFile: data.imageFile
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subCategories"] });
    },
  });
};

export const useUpdateSubCategory = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: SubCategoryForm }) =>
      subCategoryApi.updateSubCategory(id, {
        subCatId: id,
        code: data.code || "",
        name: data.name,
        arabicName: data.arabicName || "",
        categoryId: Number(data.categoryId),
        isActive: data.isActive,
        fileName: data.imageFile?.name || "",
        filePath: "",
        updatedAt: new Date().toISOString(),
        imageFile: data.imageFile
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["subCategories"] });
      queryClient.invalidateQueries({ queryKey: ["subCategory", variables.id] });
    },
  });
};

export const useDeleteSubCategory = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => subCategoryApi.deleteSubCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subCategories"] });
    },
  });
};

