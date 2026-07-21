import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "../../../../app/providers/useToast";
import { extrasTypeApi } from "../api";
import type { ExtrasTypeForm } from "../schemas";

export const EXTRAS_TYPE_KEYS = {
  all: ["extrasTypes"] as const,
  lists: () => [...EXTRAS_TYPE_KEYS.all, "list"] as const,
  list: (filter?: string) => [...EXTRAS_TYPE_KEYS.lists(), { filter }] as const,
  details: () => [...EXTRAS_TYPE_KEYS.all, "detail"] as const,
  detail: (id: number) => [...EXTRAS_TYPE_KEYS.details(), id] as const,
};

export function useExtrasTypes(typeName?: string) {
  return useQuery({
    queryKey: EXTRAS_TYPE_KEYS.list(typeName),
    queryFn: () => extrasTypeApi.list(typeName),
  });
}

export function useExtrasTypeDetail(typeId?: number) {
  return useQuery({
    queryKey: EXTRAS_TYPE_KEYS.detail(typeId!),
    queryFn: () => extrasTypeApi.getById(typeId!),
    enabled: !!typeId,
  });
}

export function useCreateExtrasType() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: (payload: ExtrasTypeForm) => 
      extrasTypeApi.create({
        ...payload,
        createdAt: new Date().toISOString(),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EXTRAS_TYPE_KEYS.lists() });
      showToast("Extras type created successfully", "success");
    },
    onError: (err: Error) => {
      showToast(err.message || "Failed to create extras type", "error");
    },
  });
}

export function useUpdateExtrasType() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: ({ typeId, data }: { typeId: number; data: ExtrasTypeForm }) =>
      extrasTypeApi.update(typeId, {
        ...data,
        typeId,
        updatedAt: new Date().toISOString(),
      }),
    onSuccess: (_, { typeId }) => {
      queryClient.invalidateQueries({ queryKey: EXTRAS_TYPE_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: EXTRAS_TYPE_KEYS.detail(typeId) });
      showToast("Extras type updated successfully", "success");
    },
    onError: (err: Error) => {
      showToast(err.message || "Failed to update extras type", "error");
    },
  });
}

export function useDeleteExtrasType() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: (typeId: number) => extrasTypeApi.remove(typeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EXTRAS_TYPE_KEYS.lists() });
      showToast("Extras type deleted successfully", "success");
    },
    onError: (err: Error) => {
      showToast(err.message || "Failed to delete extras type", "error");
    },
  });
}
