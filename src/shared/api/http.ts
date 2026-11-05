import axios from "axios";
import { getConfig } from "../../config";
import {
  clearAuthStorage,
  getStoredAccessToken,
  getStoredRefreshToken,
  isBackofficeMode,
  updateAuthTokens,
} from "../../utils/authUtils";

/**
 * Token refresh is provided by the auth feature at start-up (setTokenRefresher, see app/providers),
 * so this shared client does not import a feature (Phase 2b — was the one ESLint boundary exception).
 */
export interface RefreshedTokens {
  accessToken?: string;
  refreshToken?: string;
  session?: { expiresAt?: string };
}
export type TokenRefresher = (accessToken: string, refreshToken: string, backoffice: boolean) => Promise<RefreshedTokens>;
let tokenRefresher: TokenRefresher | null = null;
export const setTokenRefresher = (fn: TokenRefresher | null): void => {
  tokenRefresher = fn;
};

/**
 * Without a timeout a place-order / settle request could hang forever on a bad network, and the
 * POS double-submit locks (isSettlingRef / isSubmittingOrderRef) would ignore every retry.
 */
export const API_TIMEOUT_MS = 60_000;

const axiosInstance = axios.create({
  timeout: API_TIMEOUT_MS,
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

  // No cross-mode fallback: a back-office tab must never send the POS user's token (or the reverse).
  if (!token && backoffice) token = localStorage.getItem("backoffice_accessToken"); // legacy key
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

        const isLoginPath = window.location.pathname === "/" || window.location.pathname.includes("/login") || window.location.pathname === "/cashier/in";
        if (!isLoginPath && !isLoginRequest) {
          window.location.replace("/");
        }
        return Promise.reject(error);
      }

      const currentAccessToken = getStoredAccessToken();
      const currentRefreshToken = getStoredRefreshToken();

      // If no token exists at all in storage, bail out to login
      if (!currentAccessToken && !currentRefreshToken) {
        clearAuthStorage();
        window.dispatchEvent(new CustomEvent("auth:unauthorized"));
        const isLoginPath = window.location.pathname === "/" || window.location.pathname.includes("/login") || window.location.pathname === "/cashier/in";
        if (!isLoginPath) {
          window.location.replace("/");
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
        if (!tokenRefresher) throw new Error("No token refresher registered");
        const refreshResponse = await tokenRefresher(currentAccessToken || "", currentRefreshToken || "", isBackoffice);

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
        const isLoginPath = window.location.pathname === "/" || window.location.pathname.includes("/login") || window.location.pathname === "/cashier/in";
        if (!isLoginPath) {
          window.location.replace("/");
        }
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    // Network failure / timeout: no response from the server.
    if (!error.response && !axios.isCancel(error)) {
      const method = String(originalRequest?.method || "get").toLowerCase();
      const reqUrl = String(originalRequest?.url || "").toLowerCase();
      const isTimeout = error.code === "ECONNABORTED" || error.code === "ETIMEDOUT";
      const base = isTimeout
        ? "The server did not respond in time."
        : "Cannot reach the server. Check the network connection.";
      // A write may have been saved even though the reply was lost: warn before a blind retry
      // creates a duplicate order / invoice.
      const isMoneyWrite =
        method !== "get" && (reqUrl.includes("/menu/order") || reqUrl.includes("/sales-invoice"));
      error.message = isMoneyWrite
        ? `${base} The order may already be saved - check Recall / Settled orders before trying again.`
        : base;
      return Promise.reject(error);
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
