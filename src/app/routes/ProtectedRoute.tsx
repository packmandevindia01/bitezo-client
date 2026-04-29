import { Navigate, Outlet } from "react-router-dom";

const ProtectedRoute = () => {
  const userId = localStorage.getItem("userId");
  const token = localStorage.getItem("accessToken");
  const expiresAt = localStorage.getItem("sessionExpiresAt");

  // Check 1: must have both userId and token
  // We don't call clearAuth here because it could be a race condition during login
  if (!userId || !token) {
    return <Navigate to="/" replace />;
  }

  // Check 2: token must not be expired
  if (expiresAt && new Date(expiresAt) <= new Date()) {
    // Only clear if we are 100% sure it's expired
    localStorage.removeItem("accessToken");
    localStorage.removeItem("sessionExpiresAt");
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;