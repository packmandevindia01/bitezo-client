import axiosInstance from "../../../../api/axiosInstance";
import type { ApiResponse } from "../../product/types";
import type { ExtrasTypeForm, ExtrasTypeRecord } from "../types";

const BASE = "/extrastype";

async function unwrap<T>(promise: Promise<{ data: ApiResponse<T> }>): Promise<T> {
  const { data: envelope } = await promise;
  if (!envelope.isSuccess) {
    const msg = envelope.errors?.[0]?.message ?? envelope.message ?? "An error occurred";
    throw new Error(msg);
  }
  return envelope.data;
}

export const extrasTypeService = {
  list(typeName?: string): Promise<ExtrasTypeRecord[]> {
    return unwrap(
      axiosInstance.get<ApiResponse<ExtrasTypeRecord[]>>(`${BASE}/modifiertype-list`, {
        params: { typeName },
      })
    );
  },

  getById(typeId: number): Promise<ExtrasTypeRecord> {
    return unwrap(
      axiosInstance.get<ApiResponse<ExtrasTypeRecord>>(`${BASE}/${typeId}/typeid-data`)
    );
  },

  create(payload: ExtrasTypeForm & { createdAt: string }): Promise<{ typeId: number }> {
    return unwrap(
      axiosInstance.post<ApiResponse<{ typeId: number }>>(BASE, payload)
    );
  },

  update(typeId: number, payload: ExtrasTypeForm & { updatedAt: string }): Promise<void> {
    return unwrap(
      axiosInstance.put<ApiResponse<void>>(`${BASE}/${typeId}`, {
        ...payload,
        typeId,
      })
    );
  },

  remove(typeId: number): Promise<void> {
    return unwrap(
      axiosInstance.delete<ApiResponse<void>>(`${BASE}/${typeId}`)
    );
  },
};
