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
  tenantId?: string;
}
