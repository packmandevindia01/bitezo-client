import axiosInstance from "../../../../api/axiosInstance";
import type { ApiResponse } from "../../../inventory/product/types";
import type { 
  SectionDetail, 
  SectionPayload 
} from "../types";

const BASE = "/section";

async function unwrap<T>(promise: Promise<{ data: ApiResponse<T> }>): Promise<T> {
  const { data: envelope } = await promise;

  if (!envelope.isSuccess) {
    const msg = envelope.message ?? "An unexpected error occurred.";
    throw new Error(msg);
  }

  return envelope.data;
}

export const sectionService = {
  list(): Promise<any[]> {
    return unwrap(
      axiosInstance.get<ApiResponse<any[]>>(`${BASE}/section-list`)
    );
  },

  getById(sectionId: number): Promise<SectionDetail> {
    return unwrap(
      axiosInstance.get<ApiResponse<SectionDetail>>(`${BASE}/${sectionId}/sectionid-data`)
    );
  },

  create(payload: SectionPayload): Promise<{ id: number }> {
    return unwrap(
      axiosInstance.post<ApiResponse<{ id: number }>>(BASE, {
        ...payload,
        createdAt: new Date().toISOString()
      })
    );
  },

  update(sectionId: number, payload: SectionPayload): Promise<any> {
    return unwrap(
      axiosInstance.put<ApiResponse<any>>(`${BASE}/${sectionId}`, {
        ...payload,
        sectionId,
        updatedAt: new Date().toISOString()
      })
    );
  },

  remove(sectionId: number): Promise<any> {
    return unwrap(
      axiosInstance.delete<ApiResponse<any>>(`${BASE}/${sectionId}`)
    );
  },
} as const;
