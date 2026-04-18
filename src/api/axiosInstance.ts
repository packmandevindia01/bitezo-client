import axios from "axios";

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://84.255.173.131:8068/api",
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
  if (clientDb) {
    config.headers["clientDb"] = clientDb;
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
