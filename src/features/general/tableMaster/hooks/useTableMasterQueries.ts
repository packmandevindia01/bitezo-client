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
    // The table stays where it was dropped while the save runs.
    onMutate: async ({ sectionId, changedTables }) => {
      const queryKey = ["tableMaster", sectionId];
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<TableRecord[]>(queryKey);
      const moved = new Map(changedTables.map((table) => [table.tableId, table.position]));
      queryClient.setQueryData<TableRecord[]>(queryKey, (tables) =>
        tables?.map((table) => (moved.has(table.tableId) ? { ...table, position: moved.get(table.tableId)! } : table)),
      );
      return { previous };
    },
    onError: (error: Error, { sectionId }, context) => {
      console.error("[Reorder] Persistence failed:", error);
      if (context?.previous) queryClient.setQueryData(["tableMaster", sectionId], context.previous);
      showToast(error.message ? `Layout not saved: ${error.message}` : "Layout not saved. Please try again.", "error");
    },
    // Always reload: if a save fails part way, the screen must show what the server actually holds.
    onSettled: (_, __, { sectionId }) => {
      queryClient.invalidateQueries({ queryKey: ["tableMaster", sectionId] });
    },
  });
};
