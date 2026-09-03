import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { subCategoryApi } from "../../subcategory/api";
import { useToast } from "../../../../app/providers/useToast";

const schema = z.object({
  code: z.string().min(1, "Code is required").max(50, "Max 50 characters").transform(v => v.toUpperCase().replace(/\s/g, "")),
  name: z.string().min(1, "Name is required").max(50, "Max 50 characters").trim(),
  arabicName: z.string().max(50, "Max 50 characters").optional(),
  categoryId: z.string().min(1, "Category is required"),
  isActive: z.boolean(),
});

export type QuickAddSubCategoryFormData = z.infer<typeof schema>;

export const useQuickAddSubCategory = (
  onCreated: (id: string, name: string) => void,
  onClose: () => void,
  preselectedCategoryId?: string,
) => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const form = useForm<QuickAddSubCategoryFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      code: "",
      name: "",
      arabicName: "",
      categoryId: preselectedCategoryId ?? "",
      isActive: true,
    },
  });

  // Sync categoryId when preselectedCategoryId changes (e.g. modal re-opens)
  useEffect(() => {
    if (preselectedCategoryId) {
      form.setValue("categoryId", preselectedCategoryId, { shouldValidate: false });
    }
  }, [preselectedCategoryId, form]);

  const mutation = useMutation({
    mutationFn: (data: QuickAddSubCategoryFormData) =>
      subCategoryApi.createSubCategory({
        code: data.code,
        name: data.name,
        arabicName: data.arabicName ?? "",
        categoryId: Number(data.categoryId),
        isActive: data.isActive,
        fileName: "",
        filePath: "",
        createdAt: new Date().toISOString(),
      }),
    onSuccess: (res, variables) => {
      queryClient.invalidateQueries({ queryKey: ["subCategories", variables.categoryId] });
      queryClient.invalidateQueries({ queryKey: ["productMasterData"] });
      showToast("Sub Category created successfully", "success");
      const newId = (res?.data as any)?.id ?? (res?.data as any)?.subCatId ?? "";
      onCreated(String(newId), variables.name);
      form.reset({ code: "", name: "", arabicName: "", categoryId: preselectedCategoryId ?? "", isActive: true });
      onClose();
    },
    onError: (err: any) => {
      showToast(err.message || "Failed to create sub category", "error");
    },
  });

  const handleSubmit = form.handleSubmit((data) => mutation.mutate(data));

  const handleClear = () =>
    form.reset({ code: "", name: "", arabicName: "", categoryId: preselectedCategoryId ?? "", isActive: true });

  return { form, handleSubmit, handleClear, isSaving: mutation.isPending };
};



