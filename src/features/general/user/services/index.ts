import axiosInstance from "../../../../api/axiosInstance";
import type { ChangePasswordPayload, User, UserPayload } from "../types";
import type { ApiResponse } from "../../../inventory/product/types";

interface UserApiRecord {
  id?: number;
  userId?: number;
  name?: string;
  userName?: string;
  branchId?: number;
  branch?: string;
  isActive?: boolean;
  active?: boolean;
  status?: string;
  isMaster?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

const mapApiUser = (user: UserApiRecord): User => ({
  id: user.id ?? user.userId ?? 0,
  name: user.name ?? user.userName ?? "",
  branchId: user.branchId ?? 0,
  branchName: user.branch ?? "",
  isActive: user.isActive ?? user.active ?? false,
  isMaster: Boolean(user.isMaster),
  statusLabel: user.status,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

const normalizeUsers = (payload: unknown): User[] => {
  if (!Array.isArray(payload)) return [];

  return payload.map((item) => {
    const record = item as UserApiRecord;
    const isActive =
      typeof record.isActive === "boolean"
        ? record.isActive
        : typeof record.active === "boolean"
          ? record.active
          : String(record.isActive ?? record.status ?? "").toLowerCase() === "active";

    return {
      ...mapApiUser(record),
      isActive,
      statusLabel:
        typeof record.isActive === "string"
          ? record.isActive
          : record.status ?? (isActive ? "Active" : "Inactive"),
    };
  });
};

export const fetchUsers = async () => {
  const { data } = await axiosInstance.get<ApiResponse<UserApiRecord[]>>("/user/userlist");
  if (!data.isSuccess) {
    throw new Error(data.message || "Failed to load users");
  }
  return normalizeUsers(data.data);
};

export const fetchUserById = async (userId: number) => {
  const { data } = await axiosInstance.get<ApiResponse<UserApiRecord>>(`/user/${userId}/userid-data`);
  if (!data.isSuccess) {
    throw new Error(data.message || "Failed to load user details");
  }
  return mapApiUser(data.data || {});
};

export const createUser = async (payload: UserPayload) => {
  const { data } = await axiosInstance.post<ApiResponse<{ id?: number }>>("/user", {
    name: payload.name,
    password: payload.password,
    branchId: payload.branchId,
    isActive: payload.isActive,
    isMaster: payload.isMaster,
    createdAt: new Date().toISOString(),
  });
  if (!data.isSuccess) {
    throw new Error(data.message || "Failed to create user");
  }
  return data;
};

export const updateUser = async (userId: number, payload: UserPayload) => {
  const { data } = await axiosInstance.put<ApiResponse<{ id?: number }>>(`/user/${userId}`, {
    userId,
    name: payload.name,
    branchId: payload.branchId,
    isActive: payload.isActive,
    isMaster: payload.isMaster,
    updatedAt: new Date().toISOString(),
  });
  if (!data.isSuccess) {
    throw new Error(data.message || "Failed to update user");
  }
  return data;
};

export const deleteUser = async (userId: number) => {
  const { data } = await axiosInstance.delete<ApiResponse<{ id?: number }>>(`/user/${userId}`);
  if (!data.isSuccess) {
    throw new Error(data.message || "Failed to delete user");
  }
  return data;
};

export const changeUserPassword = async (userId: number, payload: ChangePasswordPayload) => {
  try {
    const { data } = await axiosInstance.patch<ApiResponse<unknown>>(`/user/${userId}/change-password`, payload);
    if (!data.isSuccess) {
      throw new Error(data.message || "Failed to change password");
    }
    return data;
  } catch (err: any) {
    // Log full server response to help diagnose the 500
    if (err.response) {
      console.error("[ChangePassword] Server error response:", {
        status: err.response.status,
        data: err.response.data,
        headers: err.response.headers,
      });
      // Extract readable message from server response body
      const serverMsg =
        err.response.data?.message ||
        err.response.data?.title ||
        err.response.data?.detail ||
        (typeof err.response.data === "string" ? err.response.data : null);

      if (serverMsg) {
        // Map known backend error codes to user-friendly messages
        const isDuplicate =
          serverMsg.toLowerCase().includes("duplicate") ||
          err.response.data?.errors?.some((e: any) => e.code === "CONFLICT");
        if (isDuplicate) {
          throw new Error("This password has already been used before. Please choose a different password.");
        }
        throw new Error(serverMsg);
      }
    }
    throw err;
  }
};
