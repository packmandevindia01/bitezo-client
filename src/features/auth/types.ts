export interface UserRole {
  permissionId: number;
  module: string;
  action: string;
  status?: boolean;
  moduleType?: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  session?: {
    expiresAt?: string;
  };
  user?: {
    userId: number;
    userName: string;
    isMaster: boolean;
  };
  userRoles?: UserRole[];
  tenantId?: string;
  company?: {
    decimalPart: number;
    currencySymbol: string;
  };
}
