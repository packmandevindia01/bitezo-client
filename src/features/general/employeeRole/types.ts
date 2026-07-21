export interface EmployeeRoleRecord {
  roleId: number;
  roleName: string;
}

export interface EmployeeRolePermission {
  permissionId: number;
  action: string;
  status: boolean;
}

export interface EmployeeRoleDetail {
  role: {
    roleId: number;
    roleName: string;
    createdAt: string;
    updatedAt: string;
  }[];
  permissions: EmployeeRolePermission[];
}

export interface EmployeeRoleForm {
  roleId?: number;
  roleName: string;
  permissionsIds: number[];
}
