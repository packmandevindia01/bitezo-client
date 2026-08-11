import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { groupService } from "../../group/services/groupService";
import { useToast } from "../../../../app/providers/useToast";

const schema = z.object({
  code: z.string().min(1, "Code is required").transform(v => v.toUpperCase().replace(/\s/g, "")),
  name: z.string().min(1, "Name is required").trim(),
  arabicName: z.string(),
  isActive: z.boolean(),
});

export type QuickAddGroupFormData = z.infer<typeof schema>;

export const useQuickAddGroup = (onCreated: (id: string, name: string) => void, onClose: () => void) => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const form = useForm<QuickAddGroupFormData>({
    resolver: zodResolver(schema),
    defaultValues: { code: "", name: "", arabicName: "", isActive: true },
  });

  const mutation = useMutation({
    mutationFn: (data: QuickAddGroupFormData) =>
      groupService.create({
        code: data.code,
        name: data.name,
        arabicName: data.arabicName ?? "",
        isActive: data.isActive,
        createdAt: new Date().toISOString(),
      }),
    onSuccess: (res, variables) => {
      queryClient.invalidateQueries({ queryKey: ["productMasterData"] });
      showToast("Group created successfully", "success");
      const newId = (res as any)?.id ?? (res as any)?.grpId ?? "";
      onCreated(String(newId), variables.name);
      form.reset();
      onClose();
    },
    onError: (err: any) => {
      showToast(err.message || "Failed to create group", "error");
    },
  });

  const handleSubmit = form.handleSubmit((data) => mutation.mutate(data));

  const handleClear = () => form.reset({ code: "", name: "", arabicName: "", isActive: true });

  return { form, handleSubmit, handleClear, isSaving: mutation.isPending };
};
