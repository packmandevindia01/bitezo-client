import axiosInstance from "../../../../api/axiosInstance";
import type { ApiResponse } from "../../../inventory/product/types";
import type { 
  CounterDetail, 
  CounterPayload 
} from "../types";

// Note: The UI types might differ slightly from the raw API response
// so we use any for flexibility where needed if the envelope varies.

const BASE = "/counter";

async function unwrap<T>(promise: Promise<{ data: ApiResponse<T> }>): Promise<T> {
  const { data: envelope } = await promise;

  if (!envelope.isSuccess) {
    const msg = envelope.message ?? "An unexpected error occurred.";
    throw new Error(msg);
  }

  return envelope.data;
}

export const counterService = {
  list(): Promise<any[]> {
    return unwrap(
      axiosInstance.get<ApiResponse<any[]>>(`${BASE}/counter-list`)
    );
  },

  getById(counterId: number): Promise<CounterDetail> {
    return unwrap(
      axiosInstance.get<ApiResponse<CounterDetail>>(`${BASE}/${counterId}/counterid-data`)
    );
  },

  create(payload: CounterPayload): Promise<{ id: number }> {
    return unwrap(
      axiosInstance.post<ApiResponse<{ id: number }>>(BASE, {
        ...payload,
        createdAt: new Date().toISOString()
      })
    );
  },

  update(counterId: number, payload: CounterPayload): Promise<any> {
    return unwrap(
      axiosInstance.put<ApiResponse<any>>(`${BASE}/${counterId}`, {
        ...payload,
        counterId,
        updatedAt: new Date().toISOString()
      })
    );
  },

  remove(counterId: number): Promise<any> {
    return unwrap(
      axiosInstance.delete<ApiResponse<any>>(`${BASE}/${counterId}`)
    );
  },
} as const;
