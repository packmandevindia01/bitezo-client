import axiosInstance from "../../../../api/axiosInstance";
import type { Supplier, SupplierPayload } from "../types";
import type { ApiResponse } from "../../../inventory/product/types";

interface SupplierApiRecord {
  id?: number;
  supplierId?: number;
  code?: string;
  name?: string;
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
    name: data.name ?? "",
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

export const fetchSuppliers = async () => {
  const { data } = await axiosInstance.get<ApiResponse<SupplierApiRecord[]>>("/supplier/supplierlist");
  if (!data.isSuccess) {
    throw new Error(data.message || "Failed to load suppliers");
  }
  return normalizeSuppliers(data.data);
};

export const fetchSupplierById = async (id: number) => {
  const { data } = await axiosInstance.get<ApiResponse<SupplierApiRecord>>(`/supplier/${id}`);
  if (!data.isSuccess) {
    throw new Error(data.message || "Failed to load supplier details");
  }
  return mapApiSupplier(data.data || {});
};

export const createSupplier = async (payload: SupplierPayload) => {
  const { data } = await axiosInstance.post<ApiResponse<{ id?: number }>>("/supplier", {
    ...payload,
    createdAt: new Date().toISOString(),
  });
  if (!data.isSuccess) {
    throw new Error(data.message || "Failed to create supplier");
  }
  return data;
};

export const updateSupplier = async (id: number, payload: SupplierPayload) => {
  const { data } = await axiosInstance.put<ApiResponse<{ id?: number }>>(`/supplier/${id}`, {
    ...payload,
    updatedAt: new Date().toISOString(),
  });
  if (!data.isSuccess) {
    throw new Error(data.message || "Failed to update supplier");
  }
  return data;
};

export const deleteSupplier = async (id: number) => {
  const { data } = await axiosInstance.delete<ApiResponse<{ id?: number }>>(`/supplier/${id}`);
  if (!data.isSuccess) {
    throw new Error(data.message || "Failed to delete supplier");
  }
  return data;
};
