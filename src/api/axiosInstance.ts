import axios from "axios";

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://84.255.173.131:8068/api",
  headers: {
    "Content-Type": "application/json",
    "Accept": "*/*",
  },
});

axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");
  const tenantId = localStorage.getItem("tenantId") ?? "app_db";

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Avoid sending clientDb header for auth endpoints to prevent conflicts with query parameters
  if (tenantId && !config.url?.startsWith("/auth")) {
    config.headers["clientDb"] = tenantId;
  }

  return config;
});

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Broadcast globally so UI routes can safely logout without circular store imports
      window.dispatchEvent(new CustomEvent("auth:unauthorized"));
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
