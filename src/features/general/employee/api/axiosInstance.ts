import axios from "axios";

const axiosInstance = axios.create({
  baseURL: "http://84.255.173.131:8068/api",
});

axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Attach the tenant DB to every request as the backend expects
  const tenantId = localStorage.getItem("tenantId") ?? "app_db";
  config.params = { ...config.params, clientDb: tenantId };

  return config;
});

export default axiosInstance;