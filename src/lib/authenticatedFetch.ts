/**
 * authenticatedFetch
 *
 * A drop-in wrapper around fetch() that:
 * 1. Checks if the session has expired before making a request
 * 2. Automatically attaches the Bearer token from localStorage
 * 3. On 401 response — clears localStorage and redirects to login
 *
 * Use this everywhere instead of raw fetch() for authenticated requests.
 * When your backend adds POST /api/auth/refresh, plug the refresh logic
 * into the 401 handler below.
 */

const AUTH_STORAGE_KEYS = [
  "accessToken",
  "refreshToken",
  "userId",
  "userName",
  "tenantId",
  "isMaster",
  "sessionExpiresAt",
];

const clearAuthAndRedirect = () => {
  AUTH_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
  window.location.replace("/");
};

const isSessionExpired = (): boolean => {
  const expiresAt = localStorage.getItem("sessionExpiresAt");
  if (!expiresAt) return false; // no expiry stored, let the request go through
  return new Date(expiresAt) <= new Date();
};

export const authenticatedFetch = async (
  url: string,
  options: RequestInit = {}
): Promise<Response> => {
  // Proactively check expiry before hitting the server
  if (isSessionExpired()) {
    clearAuthAndRedirect();
    throw new Error("Session expired. Please log in again.");
  }

  const token = localStorage.getItem("accessToken") ?? "";

  const headers = new Headers(options.headers);
  headers.set("Authorization", `Bearer ${token}`);
  if (!headers.has("Accept")) headers.set("Accept", "*/*");

  const response = await fetch(url, { ...options, headers });

  if (response.status === 401) {
    // TODO: When POST /api/auth/refresh is available, call it here,
    // save the new tokens, and retry the original request once before giving up.
    clearAuthAndRedirect();
    throw new Error("Session expired. Please log in again.");
  }

  return response;
};