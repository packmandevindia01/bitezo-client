import axios from "axios";
import { getConfig } from "../config";
import {
  clearAuthStorage,
  getStoredAccessToken,
  getStoredRefreshToken,
  isBackofficeMode,
  updateAuthTokens,
} from "../utils/authUtils";
import {
  backofficeRefreshTokenApi,
  posRefreshTokenApi,
} from "../features/auth/services/authApi";

const axiosInstance = axios.create({
  headers: {
    "Content-Type": "application/json",
    "Accept": "*/*",
  },
});

axiosInstance.interceptors.request.use((config) => {
  // Set baseURL dynamically from runtime config
  config.baseURL = getConfig().apiBaseUrl;

  const backoffice = isBackofficeMode();
  let token = backoffice 
    ? sessionStorage.getItem("backoffice_accessToken") 
    : localStorage.getItem("accessToken");

  if (!token) {
    token = localStorage.getItem("accessToken") || sessionStorage.getItem("backoffice_accessToken") || localStorage.getItem("backoffice_accessToken");
  }
  const explicitTenantId = config.headers ? (config.headers["clientDb"] || config.headers["clientdb"]) : undefined;
  const tenantId = typeof explicitTenantId === "string" ? explicitTenantId : (localStorage.getItem("tenantId") ?? "");

  // Identify onboarding/auth endpoints that should be "clean"
  const url = config.url || "";
  // Only exclude auth/admin and the ONBOARDING company endpoints (masterload + creation with clientDb slug or Temp-Token)
  // The plain /company GET/PUT (dashboard) must still send Bearer + clientDb
  const hasTempToken = Boolean(
    config.headers && (config.headers["Temp-Token"] || config.headers["temp-token"])
  );
  const isSubscriptionStatus = url.includes("subscription-status");
  const isOnboardingCompany = !isSubscriptionStatus && (url.startsWith("/company/") || url === "/company/masterload" || (url === "/company" && hasTempToken));
  const isRefreshTokenEndpoint = url.includes("refresh-token");
  const isAuthOrAdmin = (url.startsWith("/auth") && !isRefreshTokenEndpoint) || 
                        url.startsWith("/admin") || 
                        isOnboardingCompany;

  // 1. Authorization: Only add if NOT an onboarding/auth endpoint (refresh-token endpoints require Bearer)
  if (token && !isAuthOrAdmin) {
    if (config.headers?.set) {
      config.headers.set("Authorization", `Bearer ${token}`);
    } else {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }

  // 2. Tenant Context: Only add if NOT an onboarding/auth endpoint
  // Some endpoints (e.g. change-password, denomination) resolve tenant purely from the JWT token
  // and crash with 500 when clientDb is injected via header or query param.
  const normalizedUrl = url.toLowerCase();
  const isCashierAction = normalizedUrl.includes("/cashier-log/") && !normalizedUrl.includes("iscashier-in");
  const isTokenResolvedOnly = normalizedUrl.includes("/change-password") || 
                              isCashierAction ||
                              normalizedUrl.includes("/category") ||
                              normalizedUrl.includes("/subcategory") ||
                              normalizedUrl.includes("/product/product-image") ||
                              normalizedUrl.includes("/order/void") ||
                              normalizedUrl.includes("/provider") ||
                              normalizedUrl.includes("/lock-product") ||
                              normalizedUrl.includes("/employee/list-name") ||
                              normalizedUrl.includes("/waiters-list");


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
  const activeBranchId = backoffice 
    ? sessionStorage.getItem("backoffice_activeBranchId") 
    : (localStorage.getItem("activeBranchId") || localStorage.getItem("systemBranchId") || localStorage.getItem("branchId"));

  if (config.method?.toLowerCase() === "get" && activeBranchId) {
    if (normalizedUrl.includes("/settled-orders") || normalizedUrl.includes("load-master")) {
      config.params = { ...config.params, branchId: activeBranchId };
    }
  }

  return config;
});

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else if (token) {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response && error.response.status === 401 && originalRequest) {
      const url = originalRequest.url || "";
      const isLoginRequest = url.includes("/auth/login") || url.includes("/auth/pos-login");
      const isRefreshRequest = url.includes("refresh-token");

      // If it's a login attempt, a refresh endpoint attempt, or has already retried once, bail out
      if (isLoginRequest || isRefreshRequest || originalRequest._retry) {
        clearAuthStorage();
        window.dispatchEvent(new CustomEvent("auth:unauthorized"));

        const isLoginPath = window.location.pathname === "/" || window.location.pathname.includes("/login");
        if (!isLoginPath && !isLoginRequest) {
          window.location.href = "/";
        }
        return Promise.reject(error);
      }

      const currentAccessToken = getStoredAccessToken();
      const currentRefreshToken = getStoredRefreshToken();

      // If no token exists at all in storage, bail out to login
      if (!currentAccessToken && !currentRefreshToken) {
        clearAuthStorage();
        window.dispatchEvent(new CustomEvent("auth:unauthorized"));
        const isLoginPath = window.location.pathname === "/" || window.location.pathname.includes("/login");
        if (!isLoginPath) {
          window.location.href = "/";
        }
        return Promise.reject(error);
      }

      // If a refresh request is already running, wait in queue
      if (isRefreshing) {
        return new Promise<string>((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((newToken) => {
            originalRequest._retry = true;
            if (originalRequest.headers?.set) {
              originalRequest.headers.set("Authorization", `Bearer ${newToken}`);
            } else if (originalRequest.headers) {
              originalRequest.headers["Authorization"] = `Bearer ${newToken}`;
            } else {
              originalRequest.headers = { Authorization: `Bearer ${newToken}` };
            }
            return axiosInstance(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      // Begin refresh token rotation
      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const isBackoffice = isBackofficeMode();
        const refreshResponse = isBackoffice
          ? await backofficeRefreshTokenApi(currentAccessToken || "")
          : await posRefreshTokenApi(currentAccessToken || "");

        const newAccessToken = refreshResponse.accessToken;
        const newRefreshToken = refreshResponse.refreshToken;
        const sessionExpiresAt = refreshResponse.session?.expiresAt;

        if (!newAccessToken) {
          throw new Error("Refresh token rotation returned empty access token");
        }

        // Persist new rotated tokens and notify the app
        updateAuthTokens({
          accessToken: newAccessToken,
          refreshToken: newRefreshToken || currentRefreshToken || "",
          sessionExpiresAt,
        });

        // Resolve all requests in queue
        processQueue(null, newAccessToken);

        // Update original request headers and retry
        if (originalRequest.headers?.set) {
          originalRequest.headers.set("Authorization", `Bearer ${newAccessToken}`);
        } else if (originalRequest.headers) {
          originalRequest.headers["Authorization"] = `Bearer ${newAccessToken}`;
        } else {
          originalRequest.headers = { Authorization: `Bearer ${newAccessToken}` };
        }

        return axiosInstance(originalRequest);
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        clearAuthStorage();
        window.dispatchEvent(new CustomEvent("auth:unauthorized"));
        const isLoginPath = window.location.pathname === "/" || window.location.pathname.includes("/login");
        if (!isLoginPath) {
          window.location.href = "/";
        }
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
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
