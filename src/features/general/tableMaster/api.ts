import axiosInstance from "../../../api/axiosInstance";
import type { ApiResponse } from "../../inventory/product/types";
import type { TableRecord, TableDetail, TableMasterForm } from "./schemas";

const BASE = "/dinein-tables";

async function unwrap<T>(promise: Promise<{ data: ApiResponse<T> }>): Promise<T> {
  const { data: envelope } = await promise;

  if (!envelope.isSuccess) {
    const msg = envelope.message ?? "An unexpected error occurred.";
    throw new Error(msg);
  }

  return envelope.data;
}

export const tableMasterApi = {
  list: (sectionId: number): Promise<TableRecord[]> => {
    return unwrap(
      axiosInstance.get<ApiResponse<TableRecord[]>>(`${BASE}/table-list`, {
        params: { sectionId }
      })
    );
  },

  getById: (tableId: number): Promise<TableDetail> => {
    return unwrap(
      axiosInstance.get<ApiResponse<TableDetail>>(`${BASE}/${tableId}/tableid-data`)
    );
  },

  create: (data: TableMasterForm): Promise<{ id: number }> => {
    return unwrap(
      axiosInstance.post<ApiResponse<{ id: number }>>(BASE, {
        ...data,
        position: data.position ?? 0,
        createdAt: new Date().toISOString()
      })
    );
  },

  update: (tableId: number, data: TableMasterForm): Promise<unknown> => {
    return unwrap(
      axiosInstance.put<ApiResponse<unknown>>(`${BASE}/${tableId}`, {
        tableId,
        tableName: data.tableName,
        chairs: data.chairs,
        isActive: data.isActive,
        sectionId: data.sectionId,
        updatedAt: new Date().toISOString(),
        position: data.position
      })
    );
  },

  remove: (tableId: number): Promise<unknown> => {
    return unwrap(
      axiosInstance.delete<ApiResponse<unknown>>(`${BASE}/${tableId}`)
    );
  }
};
