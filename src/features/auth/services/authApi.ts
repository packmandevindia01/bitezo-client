import axiosInstance from "../../../api/axiosInstance";
import type { LoginResponse } from "../types";

export const loginApi = async (username: string, password: string, clientDb = "app_db"): Promise<LoginResponse> => {
  // Use a string template for the URL to ensure ?clientDb is perfectly appended to the path
  const url = `/auth/login?clientDb=${encodeURIComponent(clientDb)}`;
  
  const { data } = await axiosInstance.post<LoginResponse>(
    url,
    { username, password }
  );

  return data;
};
