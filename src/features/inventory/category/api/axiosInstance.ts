import axios from "axios";

const axiosInstance = axios.create({
  baseURL: "http://84.255.173.131:8068/api",
  headers: {
    "Content-Type": "application/json",
  },
});

axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");
  const clientDb = localStorage.getItem("tenantId") ?? "app_db";

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  config.headers["clientDb"] = clientDb;

  return config;
});

export default axiosInstance;