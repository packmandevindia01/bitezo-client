import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { tableMasterApi } from "../api";
import type { TableMasterForm, TableRecord } from "../schemas";
import { useToast } from "../../../../app/providers/useToast";

export const useTableMaster = (sectionId?: number) => {
  return useQuery({
    queryKey: ["tableMaster", sectionId],
    queryFn: () => tableMasterApi.list(sectionId!),
    enabled: !!sectionId,
  });
};

export const useTableMasterDetail = (tableId?: number) => {
  return useQuery({
    queryKey: ["tableMasterDetail", tableId],
    queryFn: () => tableMasterApi.getById(tableId!),
    enabled: !!tableId,
  });
};

export const useCreateTableMaster = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: (data: TableMasterForm) => tableMasterApi.create(data),
    onSuccess: (_, variables) => {
      showToast("Table created successfully", "success");
      queryClient.invalidateQueries({ queryKey: ["tableMaster", variables.sectionId] });
    },
    onError: (error: Error) => {
      showToast(error.message || "Failed to create table", "error");
    },
  });
};

export const useUpdateTableMaster = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: TableMasterForm }) => tableMasterApi.update(id, data),
    onSuccess: (_, { id, data }) => {
      showToast("Table updated successfully", "success");
      queryClient.invalidateQueries({ queryKey: ["tableMaster", data.sectionId] });
      queryClient.invalidateQueries({ queryKey: ["tableMasterDetail", id] });
    },
    onError: (error: Error) => {
      showToast(error.message || "Failed to update table", "error");
    },
  });
};

export const useDeleteTableMaster = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: (payload: { id: number; sectionId: number }) => tableMasterApi.remove(payload.id),
    onSuccess: (_, { sectionId }) => {
      showToast("Table deleted successfully", "success");
      queryClient.invalidateQueries({ queryKey: ["tableMaster", sectionId] });
    },
    onError: (error: Error) => {
      showToast(error.message || "Failed to delete table", "error");
    },
  });
};

export const useReorderTables = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async ({ sectionId, changedTables }: { sectionId: number, changedTables: TableRecord[] }) => {
      // sequentially update to avoid locking issues
      for (const table of changedTables) {
        await tableMasterApi.update(table.tableId, {
          sectionId,
          tableName: table.tableName,
          chairs: table.chairs,
          isActive: table.isActive,
          position: table.position
        });
      }
    },
    onSuccess: (_, { sectionId }) => {
      showToast("Order saved successfully", "success");
      queryClient.invalidateQueries({ queryKey: ["tableMaster", sectionId] });
    },
    onError: (error: Error) => {
      console.error("[Reorder] Persistence failed:", error);
      showToast("Failed to persist new order", "error");
    }
  });
};
