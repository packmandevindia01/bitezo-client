import axios from "axios";

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
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

  // Determine the correct base URL based on the endpoint
  const isAuthOrAdmin = config.url?.startsWith("/auth") || 
                        config.url?.startsWith("/admin") || 
                        config.url?.startsWith("/company");

  if (isAuthOrAdmin) {
    config.baseURL = import.meta.env.VITE_AUTH_BASE_URL || "http://84.255.173.131:66/api";
  } else {
    config.baseURL = import.meta.env.VITE_API_BASE_URL || "http://84.255.173.131:8068/api";
  }

  if (tenantId && !config.url?.startsWith("/auth")) {
    // 1. Add as header (for some endpoints)
    config.headers["clientDb"] = tenantId;

    // 2. Add as query parameter (for endpoints like /Branch/list-name)
    // We check if it's already there to avoid duplicates
    config.params = {
      clientDb: tenantId,
      ...config.params
    };
  }

  return config;
});

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clear tokens and notify the app if unauthorized
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");

      // Broadcast globally for UI reaction
      window.dispatchEvent(new CustomEvent("auth:unauthorized"));

      // Optionally redirect if not already on login page
      if (!window.location.pathname.includes("/login") && !window.location.pathname.includes("/verify")) {
        window.location.href = "/";
      }
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
