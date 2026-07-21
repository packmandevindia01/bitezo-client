import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { modifierApi } from "../api";
import type { ModifierForm } from "../schemas";
import { useToast } from "../../../../app/providers/useToast";

export const useModifiers = (search?: string) => {
  return useQuery({
    queryKey: ["modifiers", search],
    queryFn: () => modifierApi.list(search),
  });
};

export const useModifierDetail = (id?: number) => {
  return useQuery({
    queryKey: ["modifier", id],
    queryFn: () => modifierApi.getById(id!),
    enabled: !!id,
  });
};

export const useCreateModifier = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: (data: ModifierForm) => modifierApi.create(data),
    onSuccess: () => {
      showToast("Modifier created successfully", "success");
      queryClient.invalidateQueries({ queryKey: ["modifiers"] });
    },
    onError: (error: Error) => {
      showToast(error.message || "Failed to create Modifier", "error");
    },
  });
};

export const useUpdateModifier = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: ModifierForm }) => modifierApi.update(id, data),
    onSuccess: (_, { id }) => {
      showToast("Modifier updated successfully", "success");
      queryClient.invalidateQueries({ queryKey: ["modifiers"] });
      queryClient.invalidateQueries({ queryKey: ["modifier", id] });
    },
    onError: (error: Error) => {
      showToast(error.message || "Failed to update Modifier", "error");
    },
  });
};

export const useDeleteModifier = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: (id: number) => modifierApi.remove(id),
    onSuccess: () => {
      showToast("Modifier deleted successfully", "success");
      queryClient.invalidateQueries({ queryKey: ["modifiers"] });
    },
    onError: (error: Error) => {
      showToast(error.message || "Failed to delete Modifier", "error");
    },
  });
};
