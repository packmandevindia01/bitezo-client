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
        createdAt: new Date().toISOString()
      })
    );
  },

  update(tableId: number, payload: TablePayload): Promise<any> {
    return unwrap(
      axiosInstance.put<ApiResponse<any>>(`${BASE}/${tableId}`, {
        ...payload,
        tableId,
        updatedAt: new Date().toISOString()
      })
    );
  },

  remove(tableId: number): Promise<any> {
    return unwrap(
      axiosInstance.delete<ApiResponse<any>>(`${BASE}/${tableId}`)
    );
  },
} as const;
