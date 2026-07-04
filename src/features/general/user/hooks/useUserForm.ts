import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createUser, updateUser } from "../services";
import { useToast } from "../../../../app/providers/useToast";
import { createUserSchema, updateUserSchema, type UserFormDataUnion } from "../schema/userSchema";
import type { User, UserPayload } from "../types";

interface UseUserFormProps {
  initialData?: User | null;
  onSuccess?: () => void;
}

export const useUserForm = ({ initialData, onSuccess }: UseUserFormProps) => {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const isEdit = !!initialData;

  const form = useForm<UserFormDataUnion>({
    resolver: zodResolver(isEdit ? updateUserSchema : createUserSchema) as any,
    defaultValues: {
      name: initialData?.name ?? "",
      password: "",
      confirmPassword: "",
      branchId: initialData?.branchId ? String(initialData.branchId) : "",
      roleId: initialData?.roleId ? String(initialData.roleId) : "",
      isActive: initialData?.isActive ?? true,
      isMaster: initialData?.isMaster ?? true,
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: UserFormDataUnion) => {
      const payload: UserPayload = {
        name: data.name.trim(),
        branchId: Number(data.branchId),
        roleId: Number(data.roleId),
        isActive: data.isActive,
        isMaster: !!data.isMaster,
      };

      if (!isEdit && (data as any).password) {
        payload.password = (data as any).password;
      }

      console.log("[useUserForm] Submitting user payload to API:", payload);

      if (isEdit && initialData) {
        return updateUser(initialData.id, payload);
      } else {
        return createUser(payload);
      }
    },
    onSuccess: () => {
      showToast(
        isEdit ? "User updated successfully" : "User created successfully",
        "success"
      );
      queryClient.invalidateQueries({ queryKey: ["usersList"] });
      if (onSuccess) onSuccess();
    },
    onError: (err: any) => {
      showToast(err.message || "Failed to save user", "error");
    },
  });

  const handleSubmit = form.handleSubmit((data) => saveMutation.mutateAsync(data as any));

  return {
    form,
    handleSubmit,
    saving: saveMutation.isPending,
  };
};
