import axiosInstance from "../../../api/axiosInstance";
import type { LoginResponse } from "../types";

export const loginApi = async (username: string, password: string): Promise<LoginResponse> => {
  const url = `/auth/login`;
  
  const { data } = await axiosInstance.post<LoginResponse>(
    url,
    { username, password }
  );

  return data;
};

export const posLoginApi = async (
  password: string, 
  branchId: number, 
  counterId: number
): Promise<LoginResponse> => {
  const url = `/auth/pos-login?branchId=${branchId}&counterId=${counterId}`;
  
  const { data } = await axiosInstance.post<LoginResponse>(
    url,
    { password }
  );

  return data;
};

