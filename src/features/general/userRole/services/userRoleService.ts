import axiosInstance from "../../../../api/axiosInstance";
import type { ApiResponse } from "../../../inventory/product/types";
import type {
  UserRoleDetail,
  UserRoleForm,
  UserRoleNameOption,
  UserRolePermission,
  UserRoleRecord,
} from "../types";

const BASE = "/user-role";

async function unwrap<T>(promise: Promise<{ data: ApiResponse<T> }>): Promise<T> {
  const { data: envelope } = await promise;

  if (!envelope.isSuccess) {
    throw new Error(envelope.message || "An unexpected error occurred.");
  }

  return envelope.data;
}

export const userRoleService = {
  list(): Promise<UserRoleRecord[]> {
    return unwrap(
      axiosInstance.get<ApiResponse<UserRoleRecord[]>>(`${BASE}/user-role-list`),
    );
  },

  listNames(): Promise<UserRoleNameOption[]> {
    return unwrap(
      axiosInstance.get<ApiResponse<UserRoleNameOption[]>>(`${BASE}/user-role-listname`),
    );
  },

  permissions(): Promise<UserRolePermission[]> {
    return unwrap(
      axiosInstance.get<ApiResponse<UserRolePermission[]>>(`${BASE}/permission-list`),
    );
  },

  getById(roleId: number): Promise<UserRoleDetail> {
    return unwrap(
      axiosInstance.get<ApiResponse<UserRoleDetail>>(`${BASE}/${roleId}/roleid-data`),
    );
  },

  create(payload: UserRoleForm): Promise<{ id: number }> {
    return unwrap(
      axiosInstance.post<ApiResponse<{ id: number }>>(BASE, {
        roleName: payload.roleName.trim(),
        createdAt: new Date().toISOString(),
        permissionsIds: payload.permissionIds,
      }),
    );
  },

  update(roleId: number, payload: UserRoleForm): Promise<{ id: number }> {
    return unwrap(
      axiosInstance.put<ApiResponse<{ id: number }>>(`${BASE}/${roleId}`, {
        roleId,
        roleName: payload.roleName.trim(),
        updatedAt: new Date().toISOString(),
        permissionsIds: payload.permissionIds,
      }),
    );
  },

  remove(roleId: number): Promise<{ id: number }> {
    return unwrap(
      axiosInstance.delete<ApiResponse<{ id: number }>>(`${BASE}/${roleId}`),
    );
  },
} as const;
