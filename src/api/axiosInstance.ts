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

  // Handle tenant ID globally for all non-auth and non-admin calls
  // (Assuming auth/admin manage their own tokens/database context)
  const isAuth = config.url?.startsWith("/auth");
  
  if (tenantId && !isAuth) {
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
