import axios from "axios";
import { getConfig } from "../config";

const axiosInstance = axios.create({
  headers: {
    "Content-Type": "application/json",
    "Accept": "*/*",
  },
});

axiosInstance.interceptors.request.use((config) => {
  // Set baseURL dynamically from runtime config
  config.baseURL = getConfig().apiBaseUrl;

  const isBackofficeMode = sessionStorage.getItem("tempSystemType") === "backoffice" || localStorage.getItem("systemType") === "backoffice";
  let token = isBackofficeMode 
    ? sessionStorage.getItem("backoffice_accessToken") 
    : localStorage.getItem("accessToken");

  if (!token) {
    token = localStorage.getItem("accessToken") || sessionStorage.getItem("backoffice_accessToken") || localStorage.getItem("backoffice_accessToken");
  }
  const explicitTenantId = config.headers ? (config.headers["clientDb"] || config.headers["clientdb"]) : undefined;
  const tenantId = typeof explicitTenantId === "string" ? explicitTenantId : (localStorage.getItem("tenantId") ?? "");

  // Identify onboarding/auth endpoints that should be "clean"
  const url = config.url || "";
  // Only exclude auth/admin and the ONBOARDING company endpoints (masterload + creation with clientDb slug)
  // The plain /company GET/PUT (dashboard) must still send Bearer + clientDb
  const isOnboardingCompany = url.startsWith("/company/") || url === "/company/masterload";
  const isAuthOrAdmin = url.startsWith("/auth") || 
                        url.startsWith("/admin") || 
                        isOnboardingCompany;

  // 1. Authorization: Only add if NOT an onboarding/auth endpoint
  if (token && !isAuthOrAdmin) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // 2. Tenant Context: Only add if NOT an onboarding/auth endpoint
  // Some endpoints (e.g. change-password, denomination) resolve tenant purely from the JWT token
  // and crash with 500 when clientDb is injected via header or query param.
  const normalizedUrl = url.toLowerCase();
  const isCashierAction = normalizedUrl.includes("/cashier-log/") && !normalizedUrl.includes("iscashier-in");
  const isTokenResolvedOnly = normalizedUrl.includes("/change-password") || 
                              isCashierAction ||
                              normalizedUrl.includes("/category/category-image") ||
                              normalizedUrl.includes("/product/product-image") ||
                              normalizedUrl.includes("/provider") ||
                              normalizedUrl.includes("/lock-product") ||
                              normalizedUrl.includes("/employee/list-name");


  // 3. Cleanup: Remove headers that can cause 500s or boundary errors on strict backends
  if (config.method?.toLowerCase() === "get" || config.data instanceof FormData) {
    if (config.headers.delete) {
      config.headers.delete("Content-Type");
      config.headers.delete("X-Requested-With");
    } else {
      delete config.headers["Content-Type"];
      delete config.headers["X-Requested-With"];
    }
  }


  if (tenantId && !isTokenResolvedOnly) {
    // Add as header only - backend now handles this consistently
    config.headers["clientDb"] = tenantId;
  } else if (isTokenResolvedOnly) {
    // Strictly ensure NO tenant info is sent for these endpoints
    if (config.headers.delete) {
      config.headers.delete("clientDb");
      config.headers.delete("clientdb");
    } else {
      delete config.headers["clientDb"];
      delete config.headers["clientdb"];
    }
  }


  // 4. Inject branchId for specific GET requests (Backoffice Reporting/Master Data)
  const activeBranchId = isBackofficeMode 
    ? sessionStorage.getItem("backoffice_activeBranchId") 
    : localStorage.getItem("activeBranchId");

  if (config.method?.toLowerCase() === "get" && activeBranchId) {
    if (normalizedUrl.includes("/settled-orders") || normalizedUrl.includes("load-master")) {
      config.params = { ...config.params, branchId: activeBranchId };
    }
  }

  console.log(`[axiosInstance] Final headers for ${config.method?.toUpperCase()} ${config.url}:`, config.headers);
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

    // Extract human-readable backend message (e.g. 400, 404, 409, 500 error envelopes)
    if (error.response?.data) {
      const data = error.response.data;
      let backendMessage: string | undefined;

      if (Array.isArray(data.errors) && data.errors.length > 0) {
        const first = data.errors[0];
        backendMessage = typeof first === "object" ? (first.message || first.field) : first;
      } else if (data.errors && typeof data.errors === "object") {
        // Standard ASP.NET validation dictionary: { "Field": ["Message 1", "Message 2"] }
        const entries = Object.entries(data.errors);
        if (entries.length > 0) {
          const [field, msgs] = entries[0] as [string, any];
          const firstMsg = Array.isArray(msgs) ? msgs[0] : String(msgs);
          backendMessage = firstMsg ? `${field ? field + ": " : ""}${firstMsg}` : undefined;
        }
      }

      if (!backendMessage) {
        backendMessage = data.message || data.title;
      }

      if (backendMessage && typeof backendMessage === "string") {
        error.message = backendMessage;
      }
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
