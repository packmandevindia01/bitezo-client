export interface User {
  id: number;
  name: string;
  branchId: number;
  branchName?: string;
  isActive: boolean;
  isMaster: boolean;
  statusLabel?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface UserFormData {
  name: string;
  password: string;
  confirmPassword: string;
  branchId: string;
  isActive: boolean;
  isMaster: boolean;
}

export interface UserPayload {
  name: string;
  password?: string;
  branchId: number;
  isActive: boolean;
  isMaster: boolean;
}

export interface ChangePasswordPayload {
  oldPassword: string;
  newPassword: string;
}

