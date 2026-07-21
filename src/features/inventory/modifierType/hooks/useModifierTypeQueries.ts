import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { modifierTypeApi } from "../api";
import type { ModifierTypeForm } from "../schemas";
import { useToast } from "../../../../app/providers/useToast";

export const useModifierTypes = (search?: string) => {
  return useQuery({
    queryKey: ["modifierTypes", search],
    queryFn: () => modifierTypeApi.list(search),
  });
};

export const useModifierTypeDetail = (typeId?: number) => {
  return useQuery({
    queryKey: ["modifierType", typeId],
    queryFn: () => modifierTypeApi.getById(typeId!),
    enabled: !!typeId,
  });
};

export const useCreateModifierType = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: (data: ModifierTypeForm) => modifierTypeApi.create(data),
    onSuccess: () => {
      showToast("Modifier Type created successfully", "success");
      queryClient.invalidateQueries({ queryKey: ["modifierTypes"] });
    },
    onError: (error: Error) => {
      showToast(error.message || "Failed to create Modifier Type", "error");
    },
  });
};

export const useUpdateModifierType = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: ModifierTypeForm }) => modifierTypeApi.update(id, data),
    onSuccess: (_, { id }) => {
      showToast("Modifier Type updated successfully", "success");
      queryClient.invalidateQueries({ queryKey: ["modifierTypes"] });
      queryClient.invalidateQueries({ queryKey: ["modifierType", id] });
    },
    onError: (error: Error) => {
      showToast(error.message || "Failed to update Modifier Type", "error");
    },
  });
};

export const useDeleteModifierType = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: (id: number) => modifierTypeApi.remove(id),
    onSuccess: () => {
      showToast("Modifier Type deleted successfully", "success");
      queryClient.invalidateQueries({ queryKey: ["modifierTypes"] });
    },
    onError: (error: Error) => {
      showToast(error.message || "Failed to delete Modifier Type", "error");
    },
  });
};
