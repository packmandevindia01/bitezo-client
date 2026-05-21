import { Navigate, Outlet } from "react-router-dom";

const ProtectedRoute = () => {
  const isBackoffice = sessionStorage.getItem("tempSystemType") === "backoffice" || localStorage.getItem("systemType") === "backoffice";
  const userId = isBackoffice ? sessionStorage.getItem("backoffice_userId") : localStorage.getItem("userId");
  const token = isBackoffice ? sessionStorage.getItem("backoffice_accessToken") : localStorage.getItem("accessToken");
  const expiresAt = isBackoffice ? sessionStorage.getItem("backoffice_sessionExpiresAt") : localStorage.getItem("sessionExpiresAt");

  // Check 1: must have both userId and token
  // We don't call clearAuth here because it could be a race condition during login
  if (!userId || !token) {
    return <Navigate to="/" replace />;
  }

  // Check 2: token must not be expired
  if (expiresAt && new Date(expiresAt) <= new Date()) {
    // Only clear if we are 100% sure it's expired
    if (isBackoffice) {
      sessionStorage.removeItem("backoffice_accessToken");
      sessionStorage.removeItem("backoffice_sessionExpiresAt");
    } else {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("sessionExpiresAt");
    }
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;