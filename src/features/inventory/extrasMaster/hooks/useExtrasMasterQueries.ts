import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "../../../../app/providers/useToast";
import { extrasMasterApi } from "../api";
import type { ExtrasMasterForm, ExtrasMasterRecord, ExtrasDetailResponse } from "../schemas";

export const EXTRAS_MASTER_KEYS = {
  all: ["extrasMaster"] as const,
  lists: () => [...EXTRAS_MASTER_KEYS.all, "list"] as const,
  list: (search?: string) => [...EXTRAS_MASTER_KEYS.lists(), { search }] as const,
  details: () => [...EXTRAS_MASTER_KEYS.all, "detail"] as const,
  detail: (id: number) => [...EXTRAS_MASTER_KEYS.details(), id] as const,
};

export function useExtrasMaster(search?: string) {
  const { showToast } = useToast();
  return useQuery<ExtrasMasterRecord[], Error>({
    queryKey: EXTRAS_MASTER_KEYS.list(search),
    queryFn: async () => {
      try {
        return await extrasMasterApi.list(search);
      } catch (err: any) {
        showToast(err.message || "Failed to load extras master list", "error");
        throw err;
      }
    },
  });
}

export function useExtrasMasterDetail(id?: number) {
  const { showToast } = useToast();
  return useQuery<ExtrasDetailResponse, Error>({
    queryKey: EXTRAS_MASTER_KEYS.detail(id!),
    queryFn: async () => {
      try {
        return await extrasMasterApi.getById(id!);
      } catch (err: any) {
        showToast(err.message || "Failed to load extras master details", "error");
        throw err;
      }
    },
    enabled: !!id,
  });
}

export function useCreateExtrasMaster() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: (data: Omit<ExtrasMasterForm, "category">) =>
      extrasMasterApi.create({
        ...data,
        createdAt: new Date().toISOString(),
      }),
    onSuccess: () => {
      showToast("Extras created successfully", "success");
      queryClient.invalidateQueries({ queryKey: EXTRAS_MASTER_KEYS.lists() });
    },
    onError: (err: any) => {
      showToast(err.message || "Failed to create extras", "error");
    },
  });
}

export function useUpdateExtrasMaster() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Omit<ExtrasMasterForm, "category"> }) =>
      extrasMasterApi.update(id, {
        ...data,
        id,
        updatedAt: new Date().toISOString(),
      }),
    onSuccess: (_, variables) => {
      showToast("Extras updated successfully", "success");
      queryClient.invalidateQueries({ queryKey: EXTRAS_MASTER_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: EXTRAS_MASTER_KEYS.detail(variables.id) });
    },
    onError: (err: any) => {
      showToast(err.message || "Failed to update extras", "error");
    },
  });
}

export function useDeleteExtrasMaster() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: (id: number) => extrasMasterApi.remove(id),
    onSuccess: () => {
      showToast("Extras deleted successfully", "success");
      queryClient.invalidateQueries({ queryKey: EXTRAS_MASTER_KEYS.lists() });
    },
    onError: (err: any) => {
      showToast(err.message || "Failed to delete extras", "error");
    },
  });
}
