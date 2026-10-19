import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { usePermissions } from "../../hooks/usePermissions";
import { useAppSelector } from "../hooks";

interface RoleGuardProps {
  moduleName: string | string[];
  action?: string;
  children: ReactNode;
}

const RoleGuard = ({ moduleName, action = "View", children }: RoleGuardProps) => {
  const { hasPermission } = usePermissions();
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const allowed = Array.isArray(moduleName)
    ? moduleName.some((mod) => hasPermission(mod, action))
    : hasPermission(moduleName, action);

  if (!allowed) {
    if (location.pathname === "/dashboard") {
      return (
        <div className="flex h-64 w-full items-center justify-center p-4 text-center">
          <p className="text-sm font-semibold text-gray-500">
            You do not have permission to view this section.
          </p>
        </div>
      );
    }
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export default RoleGuard;
