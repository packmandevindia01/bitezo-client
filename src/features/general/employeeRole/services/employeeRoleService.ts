import axiosInstance from "../../../../api/axiosInstance";
import type { ApiResponse } from "../../../inventory/product/types";
import type {
  EmployeeRoleRecord,
  EmployeeRolePermission,
  EmployeeRoleDetail,
  EmployeeRoleForm,
} from "../types";

const BASE = "/EmployeeRole";

async function unwrap<T>(promise: Promise<{ data: ApiResponse<T> }>): Promise<T> {
  const { data: envelope } = await promise;

  if (!envelope.status && !envelope.data && !envelope.message) {
      // In case it's not structured properly
      return envelope as any;
  }
  
  if (envelope.status && envelope.status !== 200) {
    throw new Error(envelope.message || "An unexpected error occurred.");
  }

  return envelope.data;
}

export const employeeRoleService = {
  getRoles: async () => {
    return unwrap(
      axiosInstance.get<ApiResponse<EmployeeRoleRecord[]>>(`${BASE}/employee-role-list`),
    );
  },

  getPermissions: async () => {
    return unwrap(
      axiosInstance.get<ApiResponse<EmployeeRolePermission[]>>(`${BASE}/permission-list`),
    );
  },

  getRoleDetails: async (roleId: number) => {
    return unwrap(
      axiosInstance.get<ApiResponse<EmployeeRoleDetail>>(`${BASE}/${roleId}/roleid-data`),
    );
  },

  createRole: async (payload: EmployeeRoleForm) => {
    return unwrap(
      axiosInstance.post<ApiResponse<{ id: number }>>(BASE, {
        roleName: payload.roleName.trim(),
        permissionsIds: payload.permissionsIds,
        createdAt: new Date().toISOString(),
      }),
    );
  },

  updateRole: async (roleId: number, payload: EmployeeRoleForm) => {
    return unwrap(
      axiosInstance.put<ApiResponse<{ id: number }>>(`${BASE}/${roleId}`, {
        roleId,
        roleName: payload.roleName.trim(),
        permissionsIds: payload.permissionsIds,
        updatedAt: new Date().toISOString(),
      }),
    );
  },

  deleteRole: async (roleId: number) => {
    return unwrap(
      axiosInstance.delete<ApiResponse<{ id: number }>>(`${BASE}/${roleId}`),
    );
  },
};
