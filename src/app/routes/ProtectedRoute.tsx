import { Navigate, Outlet } from "react-router-dom";
import { clearAuthStorage, isBackofficeMode } from "../../utils/authUtils";

const ProtectedRoute = () => {
  const isBackoffice = isBackofficeMode();
  const userId = isBackoffice ? sessionStorage.getItem("backoffice_userId") : localStorage.getItem("userId");
  const token = isBackoffice ? sessionStorage.getItem("backoffice_accessToken") : localStorage.getItem("accessToken");
  const refreshToken = isBackoffice ? sessionStorage.getItem("backoffice_refreshToken") : localStorage.getItem("refreshToken");
  const expiresAt = isBackoffice ? sessionStorage.getItem("backoffice_sessionExpiresAt") : localStorage.getItem("sessionExpiresAt");

  // Check 1: must have userId and at least one token (accessToken or refreshToken)
  if (!userId || (!token && !refreshToken)) {
    clearAuthStorage();
    return <Navigate to="/" replace />;
  }

  // Check 2: if no refresh token exists and session is expired, redirect
  // When a refreshToken is present, axiosInstance silently handles token refresh rotation on 401
  if (!refreshToken && expiresAt && new Date(expiresAt) <= new Date()) {
    clearAuthStorage();
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;