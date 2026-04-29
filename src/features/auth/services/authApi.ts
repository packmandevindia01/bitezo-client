import axiosInstance from "../../../api/axiosInstance";
import type { LoginResponse } from "../types";

export const loginApi = async (username: string, password: string, clientDb = "app_db"): Promise<LoginResponse> => {
  const url = `/auth/login?clientDb=${encodeURIComponent(clientDb)}`;
  
  const { data } = await axiosInstance.post<LoginResponse>(
    url,
    { username, password }
  );

  return data;
};

export const posLoginApi = async (
  password: string, 
  branchId: number, 
  counterId: number, 
  clientDb = "app_db"
): Promise<LoginResponse> => {
  const url = `/auth/pos-login?clientDb=${encodeURIComponent(clientDb)}&branchId=${branchId}&counterId=${counterId}`;
  
  const { data } = await axiosInstance.post<LoginResponse>(
    url,
    { password }
  );

  return data;
};

