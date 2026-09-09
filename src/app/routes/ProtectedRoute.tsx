import { Navigate, Outlet } from "react-router-dom";
import { clearAuthStorage } from "../../utils/authUtils";

const ProtectedRoute = () => {
  const isBackoffice = sessionStorage.getItem("tempSystemType") === "backoffice" || localStorage.getItem("systemType") === "backoffice";
  const userId = isBackoffice ? sessionStorage.getItem("backoffice_userId") : localStorage.getItem("userId");
  const token = isBackoffice ? sessionStorage.getItem("backoffice_accessToken") : localStorage.getItem("accessToken");
  const expiresAt = isBackoffice ? sessionStorage.getItem("backoffice_sessionExpiresAt") : localStorage.getItem("sessionExpiresAt");

  // Check 1: must have both userId and token
  if (!userId || !token) {
    clearAuthStorage();
    return <Navigate to="/" replace />;
  }

  // Check 2: token must not be expired
  if (expiresAt && new Date(expiresAt) <= new Date()) {
    clearAuthStorage();
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;