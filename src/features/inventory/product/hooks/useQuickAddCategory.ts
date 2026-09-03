import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { categoryApi } from "../../category";
import { useToast } from "../../../../app/providers/useToast";

const schema = z.object({
  code: z.string().min(1, "Code is required").max(50, "Max 50 characters").transform(v => v.toUpperCase().replace(/\s/g, "")),
  name: z.string().min(1, "Name is required").max(50, "Max 50 characters").trim(),
  arabicName: z.string().max(50, "Max 50 characters").optional(),
  isActive: z.boolean(),
});

export type QuickAddCategoryFormData = z.infer<typeof schema>;

export const useQuickAddCategory = (onCreated: (id: string, name: string) => void, onClose: () => void) => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const form = useForm<QuickAddCategoryFormData>({
    resolver: zodResolver(schema),
    defaultValues: { code: "", name: "", arabicName: "", isActive: true },
  });

  const mutation = useMutation({
    mutationFn: (data: QuickAddCategoryFormData) =>
      categoryApi.createCategory({
        code: data.code,
        name: data.name,
        arabic: data.arabicName ?? "",
        isActive: data.isActive,
        colorCode: "red",
        createdAt: new Date().toISOString(),
        posStatus: true,
        branchIds: [],
        menuIds: [],
      }),
    onSuccess: (res, variables) => {
      queryClient.invalidateQueries({ queryKey: ["productMasterData"] });
      showToast("Category created successfully", "success");
      const newId = (res?.data as any)?.id ?? (res?.data as any)?.catId ?? "";
      onCreated(String(newId), variables.name);
      form.reset();
      onClose();
    },
    onError: (err: any) => {
      showToast(err.message || "Failed to create category", "error");
    },
  });

  const handleSubmit = form.handleSubmit((data) => mutation.mutate(data));

  const handleClear = () => form.reset({ code: "", name: "", arabicName: "", isActive: true });

  return { form, handleSubmit, handleClear, isSaving: mutation.isPending };
};
