import { useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { unitService } from "../../unit/services/unitService";
import { useToast } from "../../../../app/providers/useToast";

const schema = z.object({
  name: z.string().min(1, "Unit name is required").trim(),
  category: z.string().min(1, "Category is required"),
  conversion: z.coerce.number().min(0.000001, "Conversion must be greater than 0"),
  parentId: z.coerce.number().default(0),
  currentValue: z.number().default(0),
});

export type QuickAddUnitFormData = z.infer<typeof schema>;

export const useQuickAddUnit = (
  onCreated: (id: string, name: string) => void,
  onClose: () => void,
  isOpen: boolean,
) => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const form = useForm<QuickAddUnitFormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", category: "Quantity", conversion: 1, parentId: 0, currentValue: 0 },
  });

  const watchCategory = useWatch({ control: form.control, name: "category" });
  const watchConversion = useWatch({ control: form.control, name: "conversion" });
  const watchParentId = useWatch({ control: form.control, name: "parentId" });

  // Fetch parent units based on selected category
  const { data: parentOptions = [], isLoading: loadingParents } = useQuery({
    queryKey: ["unitParentOptions", watchCategory, isOpen],
    queryFn: () => unitService.listFilteredNames(watchCategory, 0),
    enabled: !!watchCategory && isOpen,
  });

  // Auto-calculate currentValue whenever conversion or parentId changes
  useEffect(() => {
    const parent = parentOptions.find(p => p.unitId === Number(watchParentId));
    const parentVal = parent?.currentValue ?? 1;
    const computed = (Number(watchConversion) || 1) * parentVal;
    form.setValue("currentValue", computed, { shouldValidate: false });
  }, [watchConversion, watchParentId, parentOptions, form]);

  // Reset parentId when category changes
  useEffect(() => {
    form.setValue("parentId", 0, { shouldValidate: false });
  }, [watchCategory, form]);

  const mutation = useMutation({
    mutationFn: (data: QuickAddUnitFormData) =>
      unitService.create({
        name: data.name,
        category: data.category,
        conversion: data.conversion,
        currentValue: data.currentValue,
        parentId: data.parentId,
        createdAt: new Date().toISOString(),
      }),
    onSuccess: (res, variables) => {
      queryClient.invalidateQueries({ queryKey: ["productMasterData"] });
      showToast("Unit created successfully", "success");
      const newId = (res as any)?.id ?? (res as any)?.unitId ?? "";
      onCreated(String(newId), variables.name);
      form.reset({ name: "", category: "Quantity", conversion: 1, parentId: 0, currentValue: 0 });
      onClose();
    },
    onError: (err: any) => {
      showToast(err.message || "Failed to create unit", "error");
    },
  });

  const handleSubmit = form.handleSubmit((data) => mutation.mutate(data));

  const handleClear = () =>
    form.reset({ name: "", category: "Quantity", conversion: 1, parentId: 0, currentValue: 0 });

  return { form, handleSubmit, handleClear, isSaving: mutation.isPending, parentOptions, loadingParents };
};
