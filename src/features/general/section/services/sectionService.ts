import { unwrapMessage as unwrap } from "@shared/api/unwrap";
import axiosInstance from "../../../../api/axiosInstance";
import type { ApiResponse } from "../../../inventory/product/types";
import type { 
  SectionDetail, 
  SectionPayload,
  SectionRecord
} from "../types";

const BASE = "/section";


export const sectionService = {
  list(): Promise<SectionRecord[]> {
    return unwrap(
      axiosInstance.get<ApiResponse<SectionRecord[]>>(`${BASE}/section-list`)
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

  update(sectionId: number, payload: SectionPayload): Promise<unknown> {
    return unwrap(
      axiosInstance.put<ApiResponse<unknown>>(`${BASE}/${sectionId}`, {
        ...payload,
        sectionId,
        updatedAt: new Date().toISOString()
      })
    );
  },

  remove(sectionId: number): Promise<unknown> {
    return unwrap(
      axiosInstance.delete<ApiResponse<unknown>>(`${BASE}/${sectionId}`)
    );
  },
} as const;
