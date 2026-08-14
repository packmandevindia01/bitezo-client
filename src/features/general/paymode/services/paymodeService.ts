import axiosInstance from "../../../../api/axiosInstance";
import type { ApiResponse } from "../../../inventory/product/types";
import type { 
  PaymodeRecord, 
  PaymodeForm, 
  PaymodeDetailResponse 
} from "../types";

const BASE = "/paymode";

async function unwrap<T>(promise: Promise<{ data: ApiResponse<T> }>): Promise<T> {
  const { data: envelope } = await promise;

  if (!envelope.isSuccess) {
    const msg = envelope.message ?? "An unexpected error occurred.";
    throw new Error(msg);
  }

  return envelope.data;
}

export const paymodeService = {
  list(): Promise<PaymodeRecord[]> {
    return unwrap(
      axiosInstance.get<ApiResponse<PaymodeRecord[]>>(`${BASE}/paymode-list`)
    );
  },

  async listByCounter(counterId: number): Promise<PaymodeRecord[]> {
    const tenantId = localStorage.getItem("tenantId") || "";
    try {
      return await unwrap(
        axiosInstance.get<ApiResponse<PaymodeRecord[]>>(`${BASE}/list-name/${counterId}?clientDb=${tenantId}`)
      );
    } catch (err) {
      console.warn("listByCounter failed, falling back to general list:", err);
      return this.list();
    }
  },

  getById(paymodeId: number): Promise<PaymodeDetailResponse> {
    return unwrap(
      axiosInstance.get<ApiResponse<PaymodeDetailResponse>>(`${BASE}/${paymodeId}/paymodeid-data`)
    );
  },

  getNextCode(): Promise<{ code: number }> {
    return unwrap(
      axiosInstance.get<ApiResponse<{ code: number }>>(`${BASE}/next-paymode-code`)
    );
  },

  create(payload: Partial<PaymodeForm>): Promise<{ id: number }> {
    return unwrap(
      axiosInstance.post<ApiResponse<{ id: number }>>(BASE, {
        code: typeof payload.code === "string" ? parseInt(payload.code, 10) : Number(payload.code ?? 0),
        paymodeName: payload.paymodeName?.trim() || "",
        isActive: payload.isActive !== false,
        createdAt: new Date().toISOString(),
        counterIds: payload.counterIds ?? [],
      })
    );
  },

  update(paymodeId: number, payload: Partial<PaymodeForm>): Promise<{ id: number }> {
    return unwrap(
      axiosInstance.put<ApiResponse<{ id: number }>>(`${BASE}/${paymodeId}`, {
        paymodeId,
        code: typeof payload.code === "string" ? parseInt(payload.code, 10) : Number(payload.code ?? 0),
        paymodeName: payload.paymodeName?.trim() || "",
        isActive: payload.isActive !== false,
        updatedAt: new Date().toISOString(),
        counterIds: payload.counterIds ?? [],
      })
    );
  },

  remove(paymodeId: number): Promise<unknown> {
    return unwrap(
      axiosInstance.delete<ApiResponse<unknown>>(`${BASE}/${paymodeId}`)
    );
  },
} as const;
