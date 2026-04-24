import { Navigate, Outlet, useLocation } from "react-router-dom";

const SKIP_ROUTES = [
  "/system/register",
  "/company/onboarding",
  "/forgot-password",
  "/verify-otp",
  "/reset-password",
  "/",
];

interface Props {
  children?: React.ReactNode;
}

const hasOpenShift = () => {
  const raw = localStorage.getItem("activeShift");
  if (!raw) return false;

  try {
    const shift = JSON.parse(raw) as { status?: string } | null;
    return shift?.status === "open";
  } catch {
    return false;
  }
};

const SystemRegistrationGuard = ({ children }: Props) => {
  const location = useLocation();
  const content = children ? <>{children}</> : <Outlet />;

  if (SKIP_ROUTES.includes(location.pathname)) {
    return content;
  }

  const systemType = localStorage.getItem("systemType");
  if (!systemType) {
    return <Navigate to="/system/register" replace />;
  }

  if (systemType === "backoffice") {
    if (location.pathname.startsWith("/pos") || location.pathname.startsWith("/cashier")) {
      return <Navigate to="/dashboard" replace />;
    }
    return content;
  }

  if (systemType === "pos") {
    if (location.pathname.startsWith("/dashboard")) {
      return <Navigate to="/pos" replace />;
    }

    if (!hasOpenShift()) {
      return location.pathname === "/cashier/in"
        ? content
        : <Navigate to="/cashier/in" replace />;
    }

    return location.pathname === "/cashier/in"
      ? <Navigate to="/pos" replace />
      : content;
  }

  return content;
};

export default SystemRegistrationGuard;
