import axiosInstance from "../../../../api/axiosInstance";
import type { ApiResponse } from "../../../inventory/product/types";
import type { LockedProduct, LockProductPayload } from "../types";

const BASE = "/lock-product";

export const lockProductService = {
  async list(productName?: string): Promise<LockedProduct[]> {
    const { data } = await axiosInstance.get<ApiResponse<LockedProduct[]>>(
      `${BASE}/lock-product-list`,
      { params: { productName, _t: Date.now() } }
    );
    return data.data || [];
  },

  /** GET /api/lock-product/product-list-name */
  async getProducts(productName?: string): Promise<any[]> {
    const { data } = await axiosInstance.get<ApiResponse<any[]>>(
      `${BASE}/product-list-name`,
      { params: { productName } }
    );
    return data.data || [];
  },

  /** POST /api/lock-product */
  async create(payload: LockProductPayload): Promise<number> {
    const { data } = await axiosInstance.post<ApiResponse<{ id: number }>>(
      BASE,
      payload
    );
    return data.data.id;
  },

  /** PUT /api/lock-product */
  async update(payload: LockProductPayload): Promise<number> {
    const { data } = await axiosInstance.put<ApiResponse<{ id: number }>>(
      BASE,
      payload
    );
    return data.data.id;
  },

  /** DELETE /api/lock-product/{productId} */
  async remove(productId: number): Promise<void> {
    await axiosInstance.delete<ApiResponse<unknown>>(`${BASE}/${productId}`);
  },
} as const;
