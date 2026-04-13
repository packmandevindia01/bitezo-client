import { Navigate, Outlet } from "react-router-dom";

const AUTH_KEYS = [
  "accessToken",
  "refreshToken",
  "userId",
  "userName",
  "tenantId",
  "isMaster",
  "sessionExpiresAt",
];

const clearAuth = () => AUTH_KEYS.forEach((key) => localStorage.removeItem(key));

const ProtectedRoute = () => {
  const userId = localStorage.getItem("userId");
  const token = localStorage.getItem("accessToken");
  const expiresAt = localStorage.getItem("sessionExpiresAt");

  // Check 1: must have both userId and token
  if (!userId || !token) {
    clearAuth();
    return <Navigate to="/" replace />;
  }

  // Check 2: token must not be expired
  if (expiresAt && new Date(expiresAt) <= new Date()) {
    clearAuth();
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;