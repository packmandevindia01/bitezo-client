import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { usePermissions } from "../../hooks/usePermissions";

interface RoleGuardProps {
  moduleName: string;
  action?: string;
  children: ReactNode;
}

const RoleGuard = ({ moduleName, action = "View", children }: RoleGuardProps) => {
  const { hasPermission } = usePermissions();

  if (!hasPermission(moduleName, action)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export default RoleGuard;
