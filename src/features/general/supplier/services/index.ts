import axiosInstance from "../../../../api/axiosInstance";
import type { Supplier, SupplierPayload } from "../types";
import type { ApiResponse } from "../../../inventory/product/types";

interface SupplierApiRecord {
  id?: number;
  supplierId?: number;
  code?: string;
  name?: string;
  supplierName?: string;
  arabicName?: string;
  mobileNo?: string;
  telNo?: string;
  email?: string;
  address?: string;
  area?: string;
  identityNo?: string;
  trnNo?: string;
  branchId?: number;
  branchName?: string;
  openingBalance?: number;
  isActive?: boolean;
  active?: boolean;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
}

const mapApiSupplier = (data: SupplierApiRecord): Supplier => {
  const isActive =
    typeof data.isActive === "boolean"
      ? data.isActive
      : typeof data.active === "boolean"
      ? data.active
      : String(data.isActive ?? data.status ?? "").toLowerCase() === "active";

  return {
    id: data.id ?? data.supplierId ?? 0,
    code: data.code ?? "",
    name: data.supplierName ?? data.name ?? "",
    arabicName: data.arabicName ?? "",
    mobileNo: data.mobileNo ?? "",
    telNo: data.telNo ?? "",
    email: data.email ?? "",
    address: data.address ?? "",
    area: data.area ?? "",
    identityNo: data.identityNo ?? "",
    trnNo: data.trnNo ?? "",
    branchId: data.branchId ?? 0,
    branchName: data.branchName ?? "",
    openingBalance: data.openingBalance ?? 0,
    isActive,
    statusLabel: typeof data.isActive === "string" ? data.isActive : data.status ?? (isActive ? "Active" : "Inactive"),
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
};

const normalizeSuppliers = (payload: unknown): Supplier[] => {
  if (!Array.isArray(payload)) return [];
  return payload.map((item) => mapApiSupplier(item as SupplierApiRecord));
};

export const fetchSuppliers = async (supplierCode?: string, supplierName?: string) => {
  const { data } = await axiosInstance.get<ApiResponse<SupplierApiRecord[]>>("/supplier/list", {
    params: { supplierCode, supplierName }
  });
  if (!data.isSuccess) {
    throw new Error(data.message || "Failed to load suppliers");
  }
  return normalizeSuppliers(data.data);
};

export const fetchSupplierById = async (id: number) => {
  const { data } = await axiosInstance.get<ApiResponse<SupplierApiRecord>>(`/supplier/${id}/supplier-data`);
  if (!data.isSuccess) {
    throw new Error(data.message || "Failed to load supplier details");
  }
  const result = mapApiSupplier(data.data || {});
  result.id = id; // The backend omits the ID in this endpoint, so we inject it back
  return result;
};

export const createSupplier = async (payload: SupplierPayload) => {
  const { name, ...rest } = payload;
  try {
    const { data } = await axiosInstance.post<ApiResponse<{ id?: number }>>("/supplier", {
      ...rest,
      supplierName: name,
      createdAt: new Date().toISOString(),
    });
    if (!data.isSuccess) {
      throw new Error(data.message || "Failed to create supplier");
    }
    return data;
  } catch (error: any) {
    if (error.response?.data?.message) {
      throw new Error(error.response.data.message);
    }
    throw error;
  }
};

export const updateSupplier = async (id: number, payload: SupplierPayload) => {
  const { name, ...rest } = payload;
  try {
    const { data } = await axiosInstance.put<ApiResponse<{ id?: number }>>(`/supplier/${id}`, {
      ...rest,
      supplierId: id,
      supplierName: name,
      updatedAt: new Date().toISOString(),
    });
    if (!data.isSuccess) {
      throw new Error(data.message || "Failed to update supplier");
    }
    return data;
  } catch (error: any) {
    if (error.response?.data?.message) {
      throw new Error(error.response.data.message);
    }
    throw error;
  }
};

export const deleteSupplier = async (id: number) => {
  console.log("Attempting to delete supplier with ID:", id);
  const url = `/supplier/${id}`;
  console.log("Delete URL:", url);
  try {
    const { data } = await axiosInstance.delete<ApiResponse<{ id?: number }>>(url);
    if (!data.isSuccess) {
      throw new Error(data.message || "Failed to delete supplier");
    }
    return data;
  } catch (error: any) {
    if (error.response?.data?.message) {
      throw new Error(error.response.data.message);
    }
    throw error;
  }
};
