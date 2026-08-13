import axiosInstance from "../../../api/axiosInstance";
import type { ApiResponse } from "../product/types";
import type { ExtrasTypeForm, ExtrasTypeRecord, ExtrasTypeDetailRecord } from "./schemas";

const BASE = "/extrastype";

async function unwrap<T>(promise: Promise<{ data: ApiResponse<T> }>): Promise<T> {
  try {
    const { data: envelope } = await promise;
    if (!envelope.isSuccess) {
      const firstError = envelope.errors?.[0] as any;
      const msg = (typeof firstError === 'object' ? (firstError.message || firstError.field) : firstError) 
                  ?? envelope.message 
                  ?? "An error occurred";
      throw new Error(msg);
    }
    return envelope.data;
  } catch (error: any) {
    if (error.response?.data) {
      const envelope = error.response.data as ApiResponse<any>;
      const firstError = envelope.errors?.[0] as any;
      const msg = (typeof firstError === 'object' ? (firstError.message || firstError.field) : firstError) 
                  ?? envelope.message 
                  ?? error.message;
      throw new Error(msg);
    }
    throw error;
  }
}

export const extrasTypeApi = {
  list: (typeName?: string): Promise<ExtrasTypeRecord[]> => {
    return unwrap(
      axiosInstance.get<ApiResponse<ExtrasTypeRecord[]>>(`${BASE}/modifiertype-list`, {
        params: { typeName },
      })
    );
  },

  getById: (typeId: number): Promise<ExtrasTypeDetailRecord> => {
    return unwrap(
      axiosInstance.get<ApiResponse<ExtrasTypeDetailRecord>>(`${BASE}/${typeId}/typeid-data`)
    );
  },

  create: (payload: ExtrasTypeForm & { createdAt: string }): Promise<{ typeId: number }> => {
    return unwrap(
      axiosInstance.post<ApiResponse<{ typeId: number }>>(BASE, payload)
    );
  },

  update: (typeId: number, payload: ExtrasTypeForm & { typeId: number, updatedAt: string }): Promise<void> => {
    return unwrap(
      axiosInstance.put<ApiResponse<void>>(`${BASE}/${typeId}`, payload)
    );
  },

  remove: (typeId: number): Promise<void> => {
    return unwrap(
      axiosInstance.delete<ApiResponse<void>>(`${BASE}/${typeId}`)
    );
  },
};
