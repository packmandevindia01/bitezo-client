import axiosInstance from "../../../../api/axiosInstance";
import type { ApiResponse } from "../../../inventory/product/types";
import type { 
  TableRecord, 
  TableDetail, 
  TablePayload 
} from "../types";

const BASE = "/dinein-tables";

async function unwrap<T>(promise: Promise<{ data: ApiResponse<T> }>): Promise<T> {
  const { data: envelope } = await promise;

  if (!envelope.isSuccess) {
    const msg = envelope.message ?? "An unexpected error occurred.";
    throw new Error(msg);
  }

  return envelope.data;
}

export const tableService = {
  list(sectionId: number): Promise<TableRecord[]> {
    return unwrap(
      axiosInstance.get<ApiResponse<TableRecord[]>>(`${BASE}/table-list`, {
        params: { sectionId }
      })
    );
  },

  getById(tableId: number): Promise<TableDetail> {
    return unwrap(
      axiosInstance.get<ApiResponse<TableDetail>>(`${BASE}/${tableId}/tableid-data`)
    );
  },

  create(payload: TablePayload): Promise<{ id: number }> {
    return unwrap(
      axiosInstance.post<ApiResponse<{ id: number }>>(BASE, {
        ...payload,
        position: payload.position ?? 0,
        createdAt: new Date().toISOString()
      })
    );
  },

  update(tableId: number, payload: TablePayload): Promise<unknown> {
    const url = `${BASE}/${tableId}`;
    return unwrap(
      axiosInstance.put<ApiResponse<unknown>>(url, {
        tableId: tableId,
        tableName: payload.tableName,
        chairs: payload.chairs,
        isActive: payload.isActive,
        sectionId: payload.sectionId,
        updatedAt: new Date().toISOString(),
        position: payload.position
      })
    );

  },

  remove(tableId: number): Promise<unknown> {
    return unwrap(
      axiosInstance.delete<ApiResponse<unknown>>(`${BASE}/${tableId}`)
    );
  },
} as const;
