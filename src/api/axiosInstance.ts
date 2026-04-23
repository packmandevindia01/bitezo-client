import axios from "axios";

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "/api",
  headers: {
    "Content-Type": "application/json",
    "Accept": "*/*",
  },
});

axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");
  const tenantId = localStorage.getItem("tenantId") ?? "app_db";

  // Identify onboarding/auth endpoints that should be "clean"
  const url = config.url || "";
  const isAuthOrAdmin = url.startsWith("/auth") || 
                        url.startsWith("/admin") || 
                        url.startsWith("/company");

  // 1. Authorization: Only add if NOT an onboarding/auth endpoint
  if (token && !isAuthOrAdmin) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // 2. Tenant Context: Only add if NOT an onboarding/auth endpoint
  // Some endpoints (e.g. change-password, denomination) resolve tenant purely from the JWT token
  // and crash with 500 when clientDb is injected via header or query param.
  const isTokenResolvedOnly = url.includes("/change-password") || url.includes("/denomination");

  if (tenantId && !isAuthOrAdmin && !isTokenResolvedOnly) {
    // Add as header
    config.headers["clientDb"] = tenantId;

    // Add as query parameter for all other requests
    config.params = {
      clientDb: tenantId,
      ...config.params,
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

      // Only redirect if not already on the login page
      const isLoginPath = window.location.pathname === "/" || window.location.pathname.includes("/login");
      const isLoginRequest = error.config?.url?.includes("/auth/login");

      if (!isLoginPath && !isLoginRequest) {
        window.location.href = "/";
      }
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
