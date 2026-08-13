import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { usePermissions } from "../../hooks/usePermissions";

interface RoleGuardProps {
  moduleName: string | string[];
  action?: string;
  children: ReactNode;
}

const RoleGuard = ({ moduleName, action = "View", children }: RoleGuardProps) => {
  const { hasPermission } = usePermissions();

  const allowed = Array.isArray(moduleName)
    ? moduleName.some((mod) => hasPermission(mod, action))
    : hasPermission(moduleName, action);

  if (!allowed) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export default RoleGuard;
