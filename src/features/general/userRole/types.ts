export interface UserRoleRecord {
  roleId: number;
  sNo: number;
  roleName: string;
}

export interface UserRoleNameOption {
  roleId: number;
  roleName: string;
}

export interface UserRolePermission {
  permissionId: number;
  module: string;
  action: string;
  status: boolean;
}

export interface UserRoleDetail {
  role: {
    roleId: number;
    roleName: string;
    createdAt?: string;
    updatedAt?: string;
  }[];
  permissions: UserRolePermission[];
}

export interface UserRoleForm {
  roleName: string;
  permissionIds: number[];
}
