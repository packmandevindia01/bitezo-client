import { Navigate, Outlet } from "react-router-dom";

const ProtectedRoute = () => {
  const userId = localStorage.getItem("userId");

  // ❌ Not logged in
  if (!userId) {
    return <Navigate to="/" replace />;
  }

  // ✅ Logged in
  return <Outlet />;
};

export default ProtectedRoute;