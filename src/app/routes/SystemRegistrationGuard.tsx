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

  const systemType = sessionStorage.getItem("tempSystemType") || localStorage.getItem("systemType");
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
    const hasToken = !!localStorage.getItem("accessToken");

    // If we have a token (authenticated)
    if (hasToken) {
      // ONLY auto-redirect to terminal if the shift is already OPEN
      if (location.pathname === "/cashier/in" && hasOpenShift()) {
        return <Navigate to="/pos" replace />;
      }
      // Otherwise, allow the current page (Dashboard or Terminal)
      return content;
    }

    // If not authenticated, force PIN screen
    return location.pathname === "/cashier/in" ? content : <Navigate to="/cashier/in" replace />;
  }

  return content;
};

export default SystemRegistrationGuard;
